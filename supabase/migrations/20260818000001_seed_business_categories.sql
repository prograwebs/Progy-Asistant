-- Keep the server-side category catalogue aligned with the onboarding templates
-- and the existing dashboard categories. This migration is safe to rerun.

INSERT INTO public.business_categories (code, name, description, icon, sort_order, is_active)
VALUES
  ('clinic', 'Clínica', 'Especialidades, profesionales y citas', 'clinic', 1, true),
  ('beauty_salon', 'Salón de belleza', 'Servicios, profesionales y citas', 'beautySalon', 2, true),
  ('hardware_store', 'Ferretería', 'Productos, precios y cotizaciones', 'hardwareStore', 3, true),
  ('hotel', 'Hotel', 'Habitaciones, disponibilidad y reservas', 'hotel', 4, true),
  ('restaurant', 'Restaurante', 'Menú, pedidos y reservas', 'restaurant', 5, true),
  ('other', 'Otro', 'Configura el flujo según tu negocio', 'other', 6, true),
  ('retail_store', 'Tienda', 'Productos, pedidos y promociones', 'retailStore', 7, true),
  ('professional_services', 'Servicios profesionales', 'Consultas, prospectos y cotizaciones', 'professionalServices', 8, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;
