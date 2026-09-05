-- Module 5: internal billing, invoices and usage overage.
-- This is an internal collection record; it is not an SRI/electronic invoice.

alter table public.businesses
  add column if not exists tax_id text,
  add column if not exists billing_email text;

create table public.plans (
  code                  text primary key,
  name                  text not null,
  base_price_usd        numeric(10,2) not null,
  included_budget_usd   numeric(10,2) not null,
  overage_multiplier    numeric(4,2) not null default 1.50,
  billing_period_days   integer not null default 30,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint plans_base_price_check check (base_price_usd >= 0),
  constraint plans_included_budget_check check (included_budget_usd >= 0),
  constraint plans_overage_multiplier_check check (overage_multiplier >= 0),
  constraint plans_billing_period_days_check check (billing_period_days > 0)
);

create table public.invoices (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid not null references public.businesses(id) on delete cascade,
  plan_code             text not null references public.plans(code),
  period_starts_at      timestamptz not null,
  period_ends_at        timestamptz not null,
  base_amount_usd       numeric(10,2) not null,
  usage_cost_usd        numeric(10,2) not null default 0,
  included_budget_usd   numeric(10,2) not null,
  overage_amount_usd    numeric(10,2) not null default 0,
  total_amount_usd      numeric(10,2) not null,
  status                text not null default 'pending',
  payment_method        text,
  payment_reference     text,
  paid_at               timestamptz,
  marked_paid_by        uuid references public.profiles(id) on delete set null,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint invoices_period_check check (period_ends_at > period_starts_at),
  constraint invoices_amounts_check check (
    base_amount_usd >= 0 and usage_cost_usd >= 0 and included_budget_usd >= 0 and
    overage_amount_usd >= 0 and total_amount_usd >= 0
  ),
  constraint invoices_status_check check (status in ('pending', 'paid', 'void')),
  constraint invoices_period_unique unique (business_id, period_starts_at, period_ends_at)
);

create index plans_active_idx on public.plans (is_active, code);
create index invoices_status_created_idx on public.invoices (status, created_at);
create index invoices_business_period_idx on public.invoices (business_id, period_starts_at desc);

alter table public.plans enable row level security;
alter table public.invoices enable row level security;

revoke all on public.plans from authenticated;
grant select on public.plans to authenticated;
grant all on public.plans to service_role;

revoke all on public.invoices from authenticated;
grant select, update on public.invoices to authenticated;
grant all on public.invoices to service_role;

create policy plans_read_active_or_admin on public.plans
  for select
  to authenticated
  using (is_active = true or (select public.is_admin()));

create policy invoices_admin_read on public.invoices
  for select
  to authenticated
  using ((select public.is_admin()));

create policy invoices_admin_update on public.invoices
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create trigger set_plans_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

create trigger set_invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

insert into public.plans
  (code, name, base_price_usd, included_budget_usd, overage_multiplier, billing_period_days)
values
  ('starter', 'Plan Starter', 19.99, 5.00, 1.50, 30),
  ('business', 'Plan Business', 19.99, 5.00, 1.50, 30),
  ('pro', 'Plan Pro', 19.99, 5.00, 1.50, 30)
on conflict (code) do update set
  base_price_usd = excluded.base_price_usd,
  included_budget_usd = excluded.included_budget_usd,
  overage_multiplier = excluded.overage_multiplier,
  billing_period_days = excluded.billing_period_days,
  is_active = true,
  updated_at = now();

-- Existing active subscriptions keep their legacy code and get a billing
-- window without changing their functional entitlements.
update public.business_plans business_plan
set current_period_starts_at = coalesce(
      business_plan.current_period_starts_at,
      business_plan.budget_period_starts_at,
      now()
    ),
    current_period_ends_at = coalesce(
      business_plan.current_period_ends_at,
      coalesce(
        business_plan.current_period_starts_at,
        business_plan.budget_period_starts_at,
        now()
      )
        + make_interval(days => coalesce(selected_plan.billing_period_days, 30))
    )
from public.plans selected_plan
where business_plan.plan_code = selected_plan.code
  and business_plan.status = 'active'::public.plan_status
  and (business_plan.current_period_starts_at is null or business_plan.current_period_ends_at is null);

create or replace function public.create_subscription_invoice(
  p_business_id uuid,
  p_plan_code text,
  p_now timestamptz default now()
)
returns public.invoices
language plpgsql
security definer
set search_path to ''
as $function$
declare
  business_plan public.business_plans;
  selected_plan public.plans;
  existing_invoice public.invoices;
  created_invoice public.invoices;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and not public.can_manage_business(p_business_id) then
    raise exception 'Business access denied' using errcode = '42501';
  end if;

  select * into business_plan
  from public.business_plans
  where business_id = p_business_id
  for update;

  if not found then
    raise exception 'Business plan not found' using errcode = '23503';
  end if;

  if business_plan.status not in ('trial'::public.plan_status, 'suspended'::public.plan_status, 'past_due'::public.plan_status) then
    raise exception 'Subscription invoice is only available before activation' using errcode = '55000';
  end if;

  select * into selected_plan
  from public.plans
  where code = p_plan_code and is_active = true;
  if not found then
    raise exception 'Billing plan not found' using errcode = '22023';
  end if;

  select * into existing_invoice
  from public.invoices
  where business_id = p_business_id
    and plan_code = p_plan_code
    and status = 'pending'
  order by created_at desc
  limit 1;
  if found then return existing_invoice; end if;

  insert into public.invoices (
    business_id, plan_code, period_starts_at, period_ends_at,
    base_amount_usd, usage_cost_usd, included_budget_usd,
    overage_amount_usd, total_amount_usd, status
  ) values (
    p_business_id,
    selected_plan.code,
    p_now,
    p_now + make_interval(days => selected_plan.billing_period_days),
    selected_plan.base_price_usd,
    0,
    selected_plan.included_budget_usd,
    0,
    selected_plan.base_price_usd,
    'pending'
  ) returning * into created_invoice;

  return created_invoice;
end;
$function$;

create or replace function public.close_billing_period_and_create_invoice(
  p_business_id uuid,
  p_now timestamptz default now()
)
returns public.invoices
language plpgsql
security definer
set search_path to ''
as $function$
declare
  business_plan public.business_plans;
  selected_plan public.plans;
  created_invoice public.invoices;
  usage_cost numeric(12,6);
  overage numeric(12,6);
  total numeric(12,6);
  period_start timestamptz;
  period_end timestamptz;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and not public.can_manage_business(p_business_id) then
    raise exception 'Business access denied' using errcode = '42501';
  end if;

  select * into business_plan
  from public.business_plans
  where business_id = p_business_id
  for update;

  if not found or business_plan.status <> 'active'::public.plan_status
     or business_plan.current_period_starts_at is null
     or business_plan.current_period_ends_at is null
     or business_plan.current_period_ends_at > p_now then
    return null;
  end if;

  select * into selected_plan
  from public.plans
  where code = business_plan.plan_code and is_active = true;
  if not found then
    raise exception 'Billing plan not found' using errcode = '22023';
  end if;

  period_start := business_plan.current_period_starts_at;
  period_end := business_plan.current_period_ends_at;
  select coalesce(sum(estimated_cost_usd), 0)
  into usage_cost
  from public.usage_ledger
  where business_id = p_business_id
    and created_at >= period_start
    and created_at < period_end;

  overage := greatest(0, usage_cost - selected_plan.included_budget_usd) * selected_plan.overage_multiplier;
  total := selected_plan.base_price_usd + overage;

  insert into public.invoices (
    business_id, plan_code, period_starts_at, period_ends_at,
    base_amount_usd, usage_cost_usd, included_budget_usd,
    overage_amount_usd, total_amount_usd, status
  ) values (
    p_business_id, selected_plan.code, period_start, period_end,
    round(selected_plan.base_price_usd, 2), round(usage_cost, 2),
    round(selected_plan.included_budget_usd, 2), round(overage, 2),
    round(total, 2), 'pending'
  )
  on conflict (business_id, period_starts_at, period_ends_at) do nothing
  returning * into created_invoice;

  if not found then
    select * into created_invoice
    from public.invoices
    where business_id = p_business_id
      and period_starts_at = period_start
      and period_ends_at = period_end;
    return created_invoice;
  end if;

  update public.business_plans
  set used_budget_usd = 0,
      budget_period_starts_at = period_end,
      current_period_starts_at = period_end,
      current_period_ends_at = period_end + make_interval(days => selected_plan.billing_period_days)
  where business_id = p_business_id;

  return created_invoice;
end;
$function$;

create or replace function public.mark_invoice_paid(
  p_invoice_id uuid,
  p_admin_user_id uuid,
  p_payment_method text default 'bank_transfer',
  p_payment_reference text default null,
  p_now timestamptz default now()
)
returns public.invoices
language plpgsql
security definer
set search_path to ''
as $function$
declare
  invoice_row public.invoices;
  selected_plan public.plans;
  business_plan public.business_plans;
  paid_invoice public.invoices;
  next_end timestamptz;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if coalesce(auth.role(), '') <> 'service_role'
     and p_admin_user_id is distinct from auth.uid() then
    raise exception 'Payment administrator mismatch' using errcode = '42501';
  end if;

  select * into invoice_row
  from public.invoices
  where id = p_invoice_id
  for update;
  if not found then
    raise exception 'Invoice not found' using errcode = 'P0002';
  end if;
  if invoice_row.status = 'paid' then return invoice_row; end if;
  if invoice_row.status <> 'pending' then
    raise exception 'Only pending invoices can be paid' using errcode = '55000';
  end if;

  select * into selected_plan
  from public.plans
  where code = invoice_row.plan_code and is_active = true;
  if not found then
    raise exception 'Billing plan not found' using errcode = '22023';
  end if;

  update public.invoices
  set status = 'paid',
      payment_method = nullif(trim(p_payment_method), ''),
      payment_reference = nullif(trim(p_payment_reference), ''),
      paid_at = p_now,
      marked_paid_by = p_admin_user_id
  where id = p_invoice_id
  returning * into paid_invoice;

  select * into business_plan
  from public.business_plans
  where business_id = invoice_row.business_id
  for update;
  if not found then
    raise exception 'Business plan not found' using errcode = '23503';
  end if;

  if business_plan.current_period_starts_at is null or business_plan.current_period_ends_at is null
     or business_plan.status in ('trial'::public.plan_status, 'suspended'::public.plan_status) then
    next_end := p_now + make_interval(days => selected_plan.billing_period_days);
    update public.business_plans
    set status = 'active'::public.plan_status,
        plan_code = selected_plan.code,
        included_budget_usd = selected_plan.included_budget_usd,
        used_budget_usd = 0,
        budget_period_starts_at = p_now,
        current_period_starts_at = p_now,
        current_period_ends_at = next_end
    where business_id = invoice_row.business_id;
  else
    update public.business_plans
    set status = 'active'::public.plan_status,
        plan_code = selected_plan.code,
        included_budget_usd = selected_plan.included_budget_usd
    where business_id = invoice_row.business_id;
  end if;

  return paid_invoice;
end;
$function$;

create or replace function public.enforce_billing_grace_period(
  p_grace_days integer default 5,
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  changed_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if p_grace_days < 0 then
    raise exception 'Grace days cannot be negative' using errcode = '22023';
  end if;

  update public.business_plans business_plan
  set status = 'past_due'::public.plan_status
  where business_plan.status = 'active'::public.plan_status
    and exists (
      select 1
      from public.invoices invoice
      where invoice.business_id = business_plan.business_id
        and invoice.status = 'pending'
        and invoice.created_at <= p_now - make_interval(days => p_grace_days)
    );
  get diagnostics changed_count = row_count;
  return changed_count;
end;
$function$;

revoke all on function public.create_subscription_invoice(uuid, text, timestamptz) from public;
grant execute on function public.create_subscription_invoice(uuid, text, timestamptz) to authenticated, service_role;
revoke all on function public.close_billing_period_and_create_invoice(uuid, timestamptz) from public;
grant execute on function public.close_billing_period_and_create_invoice(uuid, timestamptz) to authenticated, service_role;
revoke all on function public.mark_invoice_paid(uuid, uuid, text, text, timestamptz) from public;
grant execute on function public.mark_invoice_paid(uuid, uuid, text, text, timestamptz) to authenticated, service_role;
revoke all on function public.enforce_billing_grace_period(integer, timestamptz) from public;
grant execute on function public.enforce_billing_grace_period(integer, timestamptz) to service_role;
