-- Feature definitions are referenced by the business_features foreign key and
-- must exist before onboarding creates a business-specific feature set.

INSERT INTO public.feature_definitions (code, name, description, sort_order)
VALUES
  ('answer_questions', 'Responder consultas', 'Horarios, ubicación, precios e información del negocio.', 1),
  ('take_orders', 'Tomar pedidos', 'Recopilar productos, cantidades y datos de entrega o retiro.', 2),
  ('schedule_appointments', 'Agendar citas', 'Recopilar fecha, hora y servicio solicitado.', 3),
  ('create_reservations', 'Crear reservas', 'Registrar reservas de mesas, habitaciones o servicios.', 4),
  ('create_quotes', 'Preparar cotizaciones', 'Organizar solicitudes de cotización para revisión del equipo.', 5),
  ('capture_leads', 'Capturar interesados', 'Registrar datos de personas interesadas en el negocio.', 6),
  ('transfer_human', 'Pedir ayuda a una persona', 'Escalar cuando Progy no tenga información suficiente.', 7)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;
