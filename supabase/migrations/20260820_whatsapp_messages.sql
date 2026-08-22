create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  provider_message_id text not null unique,
  phone_number_id text not null,
  from_phone text not null,
  to_phone text,
  direction text not null check (direction in ('inbound', 'outbound')),
  message_type text not null default 'text',
  text_body text,
  status text not null default 'processing',
  response_message_id text,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_business_created_idx
  on public.whatsapp_messages (business_id, created_at desc);

create index if not exists whatsapp_messages_conversation_created_idx
  on public.whatsapp_messages (conversation_id, created_at asc);

alter table public.whatsapp_messages enable row level security;

drop policy if exists whatsapp_messages_select_authorized on public.whatsapp_messages;
create policy whatsapp_messages_select_authorized
  on public.whatsapp_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = whatsapp_messages.business_id
        and b.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.business_members bm
      where bm.business_id = whatsapp_messages.business_id
        and bm.user_id = auth.uid()
        and bm.is_active = true
        and bm.role in ('owner', 'manager')
    )
  );

drop policy if exists whatsapp_messages_no_client_write on public.whatsapp_messages;
create policy whatsapp_messages_no_client_write
  on public.whatsapp_messages
  for all
  to authenticated
  using (false)
  with check (false);
