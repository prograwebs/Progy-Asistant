alter table public.whatsapp_connections
  add column if not exists onboarding_flow text not null default 'standard',
  add column if not exists history_sync_status text not null default 'not_requested',
  add column if not exists contacts_sync_status text not null default 'not_requested';

alter table public.whatsapp_connections
  drop constraint if exists whatsapp_connections_onboarding_flow_check;

alter table public.whatsapp_connections
  add constraint whatsapp_connections_onboarding_flow_check
  check (onboarding_flow in ('standard', 'business_app'));

create table if not exists public.whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  phone_number text not null,
  full_name text,
  first_name text,
  status text not null default 'active',
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, phone_number)
);

create index if not exists whatsapp_contacts_business_idx
  on public.whatsapp_contacts (business_id, updated_at desc);

alter table public.whatsapp_contacts enable row level security;

drop policy if exists whatsapp_contacts_select_authorized on public.whatsapp_contacts;
create policy whatsapp_contacts_select_authorized
  on public.whatsapp_contacts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = whatsapp_contacts.business_id
        and b.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.business_members bm
      where bm.business_id = whatsapp_contacts.business_id
        and bm.user_id = auth.uid()
        and bm.is_active = true
        and bm.role in ('owner', 'manager')
    )
  );

drop policy if exists whatsapp_contacts_no_client_write on public.whatsapp_contacts;
create policy whatsapp_contacts_no_client_write
  on public.whatsapp_contacts
  for all
  to authenticated
  using (false)
  with check (false);
