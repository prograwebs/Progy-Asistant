# Estado de implementación — Platform V1

## Implementado en la rama

- [x] Panel modular por áreas funcionales
- [x] Onboarding de negocio
- [x] Configuración de datos y horarios
- [x] Configuración del comportamiento de Progy
- [x] Catálogo manual
- [x] Importación de catálogo desde documentos con revisión
- [x] Conocimiento/políticas/FAQ
- [x] Listado y selección de voces
- [x] Prueba hablada con la voz guardada
- [x] Transcripción + razonamiento + respuesta estructurada
- [x] Contexto relevante y corto para reducir consumo
- [x] Pedido validado contra catálogo y calculado en servidor
- [x] Reserva/cita validada y registrada
- [x] Conversaciones en el panel
- [x] Pedidos y reservas en el panel
- [x] Límites de prueba por plan
- [x] Medición interna de consumo
- [x] Interfaz de consumo/planes
- [x] WhatsApp Embedded Signup conservado con UI no técnica
- [x] CI: lint, typecheck, build y pruebas
- [x] Documentación de arquitectura, seguridad y QA

## Pendiente de validación con entorno real

Estas funciones requieren secretos/cuentas externas que no se guardan en GitHub:

- [ ] prueba real OpenAI con un negocio de ejemplo;
- [ ] prueba real de transcripción desde micrófono;
- [ ] prueba real de síntesis con la voz ElevenLabs seleccionada;
- [ ] prueba real de PDF/DOCX contra OpenAI Files input;
- [ ] comprobación de RLS con dos usuarios reales en Supabase;
- [ ] prueba de creación de pedido/reserva contra la base de producción/staging.

## Bloqueos externos conocidos

- [ ] Meta debe habilitar/revisar el onboarding de clientes externos para completar WhatsApp comercial;
- [ ] seleccionar y habilitar un proveedor real de cobros recurrentes antes de construir checkout/webhooks de pago.

## Regla antes de mezclar a main

No mezclar esta rama solo porque el CI esté verde. Primero ejecutar `docs/TESTING.md` en un entorno de staging/local con secretos reales y revisar el Pull Request.
