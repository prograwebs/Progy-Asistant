-- Module 2: terminology, prompt rules and default capabilities by niche.
-- This migration does not alter business_categories; it only references the
-- categories that already exist in the platform catalogue.

create table public.niche_profiles (
  category_code text primary key references public.business_categories(code),
  terminology jsonb not null default '{}'::jsonb,
  default_feature_codes text[] not null default '{}',
  default_tool_codes text[] not null default '{}',
  prompt_addendum text,
  updated_at timestamptz not null default now()
);

alter table public.niche_profiles enable row level security;

grant select on public.niche_profiles to authenticated;
grant all on public.niche_profiles to service_role;

create policy niche_profiles_read on public.niche_profiles
  for select to authenticated using (true);

create trigger set_niche_profiles_updated_at
  before update on public.niche_profiles
  for each row execute function public.set_updated_at();

-- human_handoff is included alongside the documented niche features because
-- transfer_to_human requires it in the Module 1 tools registry.
insert into public.niche_profiles
  (category_code, terminology, default_feature_codes, default_tool_codes, prompt_addendum)
values
  ('beauty_salon', '{
    "booking_singular": "cita",
    "booking_plural": "citas",
    "order_singular": "pedido",
    "order_plural": "pedidos",
    "resource_label": "estilista"
  }'::jsonb,
  array['schedule_appointments', 'human_handoff'],
  array['create_booking', 'transfer_to_human'],
  'Confirma el servicio exacto (corte, color, tratamiento) y la duración antes de registrar la cita. Si el cliente pide un estilista específico, indícalo en las notas pero no confirmes su disponibilidad si no está expresamente indicada.'),

  ('clinic', '{
    "booking_singular": "cita",
    "booking_plural": "citas",
    "order_singular": "pedido",
    "order_plural": "pedidos",
    "resource_label": "especialista"
  }'::jsonb,
  array['schedule_appointments', 'human_handoff'],
  array['create_booking', 'transfer_to_human'],
  'Nunca des diagnósticos, recomendaciones médicas ni interpretes síntomas. Tu única función es agendar la cita y responder información administrativa (horarios, ubicación, precios). Ante cualquier consulta clínica, transfiere a una persona del negocio.'),

  ('restaurant', '{
    "booking_singular": "reserva",
    "booking_plural": "reservas",
    "order_singular": "pedido",
    "order_plural": "pedidos",
    "resource_label": "mesa"
  }'::jsonb,
  array['take_orders', 'create_reservations', 'human_handoff'],
  array['create_order', 'create_booking', 'transfer_to_human'],
  'Para reservas, confirma fecha, hora y número de personas. Para pedidos, confirma cada producto y la forma de entrega (domicilio, para llevar o en el local) antes de registrar.')
on conflict (category_code) do update set
  terminology = excluded.terminology,
  default_feature_codes = excluded.default_feature_codes,
  default_tool_codes = excluded.default_tool_codes,
  prompt_addendum = excluded.prompt_addendum,
  updated_at = now();