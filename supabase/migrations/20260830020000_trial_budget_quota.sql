-- Module 3: one USD budget for provider usage during a business trial.
-- Existing voice/session allowances remain independent in trial_allowances.

alter table public.business_plans
  add column if not exists included_budget_usd numeric(10,2) not null default 0.25,
  add column if not exists used_budget_usd numeric(10,2) not null default 0,
  add column if not exists budget_period_starts_at timestamptz not null default now();

alter table public.business_plans
  alter column included_budget_usd set default 0.25,
  alter column used_budget_usd set default 0;

update public.business_plans
set budget_period_starts_at = coalesce(trial_starts_at, now())
where budget_period_starts_at is null;

-- Rows created by the legacy schema are trials by default. Preserve paid plans
-- at the current suggested included amount until Billing supplies plan pricing.
update public.business_plans
set included_budget_usd = 5.00
where status = 'active'::public.plan_status
  and included_budget_usd = 0.25;

alter table public.business_plans
  alter column budget_period_starts_at set default now();

alter table public.business_plans
  add constraint business_plans_included_budget_usd_check
    check (included_budget_usd >= 0),
  add constraint business_plans_used_budget_usd_check
    check (used_budget_usd >= 0);

-- Insert usage and update the plan in one database transaction. The plan row
-- lock serializes concurrent updates so the accumulated budget cannot be lost.
create or replace function public.record_usage_and_update_budget(
  p_business_id uuid,
  p_kind public.usage_kind,
  p_quantity integer,
  p_estimated_cost_usd numeric,
  p_conversation_id uuid default null,
  p_provider text default null,
  p_user_id uuid default auth.uid(),
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  plan_status public.plan_status;
  included_budget numeric;
  used_budget numeric;
begin
  if p_quantity < 0 or p_estimated_cost_usd < 0 then
    raise exception 'Usage values cannot be negative' using errcode = '22023';
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
     and not public.can_manage_business(p_business_id) then
    raise exception 'Business access denied' using errcode = '42501';
  end if;

  insert into public.usage_ledger
    (business_id, user_id, conversation_id, kind, quantity, provider, estimated_cost_usd, metadata)
  values
    (p_business_id, p_user_id, p_conversation_id, p_kind, p_quantity, p_provider,
     round(p_estimated_cost_usd, 6), coalesce(p_metadata, '{}'::jsonb));

  update public.business_plans
  set used_budget_usd = used_budget_usd + round(p_estimated_cost_usd, 6)
  where business_id = p_business_id
  returning status, included_budget_usd, used_budget_usd
  into plan_status, included_budget, used_budget;

  if not found then
    raise exception 'Business plan not found' using errcode = '23503';
  end if;

  if plan_status = 'trial'::public.plan_status and used_budget >= included_budget then
    update public.business_plans
    set status = 'suspended'::public.plan_status
    where business_id = p_business_id;
    plan_status := 'suspended'::public.plan_status;
  end if;

  return jsonb_build_object(
    'status', plan_status,
    'included_budget_usd', included_budget,
    'used_budget_usd', used_budget
  );
end;
$function$;

revoke all on function public.record_usage_and_update_budget(uuid, public.usage_kind, integer, numeric, uuid, text, uuid, jsonb) from public;
grant execute on function public.record_usage_and_update_budget(uuid, public.usage_kind, integer, numeric, uuid, text, uuid, jsonb) to authenticated, service_role;
