create table if not exists public.whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  meta_business_id text,
  waba_id text not null,
  waba_name text,
  phone_number_id text not null,
  phone_number text,
  verified_name text,
  is_on_biz_app boolean not null default false,
  platform_type text,
  access_token text not null,
  token_expires_at timestamptz,
  status text not null default 'connected',
  connected_by uuid references auth.users(id) on delete set null,
  webhook_subscribed_at timestamptz,
  phone_registered_at timestamptz,
  registration_status text not null default 'pending',
  last_meta_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_connections
  add column if not exists webhook_subscribed_at timestamptz,
  add column if not exists phone_registered_at timestamptz,
  add column if not exists registration_status text not null default 'pending',
  add column if not exists last_meta_error text;

create index if not exists whatsapp_connections_phone_number_idx
  on public.whatsapp_connections (phone_number_id);

alter table public.whatsapp_connections enable row level security;

drop policy if exists whatsapp_connections_select_authorized on public.whatsapp_connections;
create policy whatsapp_connections_select_authorized
  on public.whatsapp_connections
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = whatsapp_connections.business_id
        and b.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.business_members bm
      where bm.business_id = whatsapp_connections.business_id
        and bm.user_id = auth.uid()
        and bm.is_active = true
        and bm.role in ('owner', 'manager')
    )
  );

drop policy if exists whatsapp_connections_no_client_write on public.whatsapp_connections;
create policy whatsapp_connections_no_client_write
  on public.whatsapp_connections
  for all
  to authenticated
  using (false)
  with check (false);
