-- Module 1: data-driven assistant tools registry.
-- The platform owns agent_tools; businesses only configure their enabled tools.

create table public.agent_tools (
  code text primary key,
  name text not null,
  description text not null,
  parameters_schema jsonb not null,
  category text,
  requires_feature_code text references public.feature_definitions(code) on delete set null,
  handler_key text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_tool_settings (
  business_id uuid not null references public.businesses(id) on delete cascade,
  tool_code text not null references public.agent_tools(code) on delete cascade,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, tool_code)
);

alter table public.agent_tools enable row level security;
alter table public.business_tool_settings enable row level security;

grant select on public.agent_tools to authenticated;
grant all on public.agent_tools to service_role;
grant select, insert, update, delete on public.business_tool_settings to authenticated;
grant all on public.business_tool_settings to service_role;

create policy agent_tools_read on public.agent_tools
  for select to authenticated using (true);

create policy business_tool_settings_read on public.business_tool_settings
  for select to authenticated
  using ((select public.can_view_business(business_tool_settings.business_id)));

create policy business_tool_settings_manage on public.business_tool_settings
  for all to authenticated
  using ((select public.can_manage_business(business_tool_settings.business_id)))
  with check ((select public.can_manage_business(business_tool_settings.business_id)));

create index business_tool_settings_tool_idx
  on public.business_tool_settings (tool_code, enabled);

create trigger set_agent_tools_updated_at
  before update on public.agent_tools
  for each row execute function public.set_updated_at();

create trigger set_business_tool_settings_updated_at
  before update on public.business_tool_settings
  for each row execute function public.set_updated_at();

insert into public.feature_definitions (code, name, description, sort_order)
values
  ('human_handoff', 'Transferir a una persona', 'Marcar una conversación para seguimiento manual.', 75),
  ('send_email_notifications', 'Enviar notificaciones por correo', 'Preparar notificaciones de pedidos, citas o consultas.', 80)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.agent_tools
  (code, name, description, parameters_schema, category, requires_feature_code, handler_key)
values
  (
    'create_order',
    'Registrar pedido',
    'Registra un pedido cuando el cliente ya confirmó qué productos quiere, la cantidad de cada uno, y la forma de entrega. No la uses si todavía faltan datos por confirmar; primero pregunta lo que falte.',
    '{"type":"object","properties":{"items":{"type":"array","description":"Productos o servicios solicitados, tal como los mencionó el cliente.","items":{"type":"object","properties":{"name":{"type":"string","description":"Nombre del producto tal como lo dijo el cliente (se resuelve contra el catálogo real después)."},"quantity":{"type":"integer","minimum":1,"maximum":50,"description":"Cantidad solicitada."}},"required":["name","quantity"],"additionalProperties":false},"minItems":1},"fulfillment":{"type":"string","enum":["delivery","pickup","onsite"],"description":"Cómo el cliente va a recibir el pedido."},"address":{"type":["string","null"],"description":"Dirección de entrega. Obligatoria si fulfillment es delivery."},"customerName":{"type":["string","null"],"description":"Nombre del cliente si lo proporcionó."},"notes":{"type":["string","null"],"description":"Instrucciones adicionales del cliente."}},"required":["items","fulfillment","address","customerName","notes"],"additionalProperties":false}'::jsonb,
    'commerce',
    'take_orders',
    'create_order'
  ),
  (
    'create_booking',
    'Registrar cita o reserva',
    'Registra una cita o reserva cuando el cliente confirmó fecha y hora exactas. No la uses si la fecha/hora aún no está confirmada o es ambigua (mañana sin hora, por ejemplo); pregunta primero.',
    '{"type":"object","properties":{"startsAt":{"type":"string","description":"Fecha y hora de inicio en formato ISO 8601. Debe ser una fecha futura."},"customerName":{"type":["string","null"],"description":"Nombre del cliente si lo proporcionó."},"partySize":{"type":["integer","null"],"minimum":1,"description":"Número de personas, solo aplica a reservas de restaurante o mesa."},"resourceName":{"type":["string","null"],"description":"Recurso solicitado si aplica."},"notes":{"type":["string","null"],"description":"Notas adicionales relevantes para la cita o reserva."}},"required":["startsAt","customerName","partySize","resourceName","notes"],"additionalProperties":false}'::jsonb,
    'scheduling',
    'schedule_appointments',
    'create_booking'
  ),
  (
    'transfer_to_human',
    'Transferir a una persona',
    'Marca la conversación para que una persona del negocio la revise y continúe manualmente. Úsala cuando el cliente pide hablar con una persona explícitamente, cuando hay una queja o reclamo, o cuando la consulta está fuera de lo que puedes resolver con la información y herramientas disponibles.',
    '{"type":"object","properties":{"reason":{"type":"string","enum":["customer_request","complaint","out_of_scope","sensitive_topic","other"],"description":"Motivo principal por el que se transfiere la conversación."},"summary":{"type":"string","description":"Resumen breve de qué necesita el cliente."},"urgency":{"type":"string","enum":["low","normal","high"],"description":"Qué tan urgente parece la atención humana."}},"required":["reason","summary","urgency"],"additionalProperties":false}'::jsonb,
    'handoff',
    'human_handoff',
    'transfer_to_human'
  ),
  (
    'send_email',
    'Enviar notificación por correo',
    'Envía una notificación por correo relacionada con un pedido, cita o consulta ya registrada. Úsala solo después de confirmar la acción principal (pedido o cita), no como sustituto de crear el registro.',
    '{"type":"object","properties":{"purpose":{"type":"string","enum":["order_confirmation","booking_confirmation","follow_up"],"description":"Qué tipo de notificación es."},"recipient":{"type":"string","enum":["business","customer"],"description":"A quién va dirigido el correo."},"referenceId":{"type":["string","null"],"description":"ID del pedido o cita relacionado, si existe."}},"required":["purpose","recipient","referenceId"],"additionalProperties":false}'::jsonb,
    'communication',
    'send_email_notifications',
    'send_email'
  )
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    parameters_schema = excluded.parameters_schema,
    category = excluded.category,
    requires_feature_code = excluded.requires_feature_code,
    handler_key = excluded.handler_key,
    is_active = true,
    updated_at = now();
