-- Seed the reference data required by the business onboarding flow.
-- This migration is intentionally idempotent because these tables are shared
-- configuration, not per-business data.

insert into public.business_categories (code, name, description, icon, sort_order, is_active)
values
  ('restaurant', 'Restaurante', 'Menú, pedidos, entrega y reservas', '◉', 10, true),
  ('clinic', 'Clínica', 'Especialidades, profesionales y citas', '+', 20, true),
  ('hotel', 'Hotel', 'Habitaciones, disponibilidad y reservas', '◇', 30, true),
  ('hardware_store', 'Ferretería', 'Productos, precios y cotizaciones', '⌂', 40, true),
  ('beauty_salon', 'Salón de belleza', 'Servicios, profesionales y citas', '✦', 50, true),
  ('retail_store', 'Tienda', 'Productos, pedidos y promociones', '□', 60, true),
  ('professional_services', 'Servicios profesionales', 'Consultas, prospectos y cotizaciones', '▤', 70, true),
  ('other', 'Otro', 'Configura el flujo según tu negocio', '…', 80, true)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.feature_definitions (code, name, description, sort_order)
values
  ('answer_questions', 'Responder consultas', 'Horarios, ubicación, precios e información del negocio.', 10),
  ('take_orders', 'Tomar pedidos', 'Recopilar productos, cantidades y modalidad de entrega.', 20),
  ('schedule_appointments', 'Agendar citas', 'Recopilar fecha, hora y servicio solicitado.', 30),
  ('create_reservations', 'Crear reservas', 'Recopilar fecha, hora, personas y detalles necesarios.', 40),
  ('create_quotes', 'Preparar cotizaciones', 'Identificar productos o servicios a cotizar.', 50),
  ('capture_leads', 'Registrar interesados', 'Recopilar datos de contacto y necesidad.', 60),
  ('transfer_human', 'Pedir ayuda a una persona', 'Escalar cuando Progy no tenga información suficiente.', 70)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;
