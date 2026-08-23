# Estado de implementación — Platform V1

## Implementado en la rama

- [x] Runtime estándar Next.js/Node; eliminado scaffolding OpenAI Sites/Vinext/Cloudflare/D1/Drizzle
- [x] Panel modular por áreas funcionales
- [x] Onboarding y multiempresa
- [x] Configuración de negocio y horarios
- [x] Configuración del comportamiento de Progy
- [x] Catálogo manual
- [x] Importación PDF/DOCX/TXT/CSV con vista previa y precios ambiguos para revisión
- [x] Conocimiento, políticas y FAQ
- [x] Catálogo/selección de voces ElevenLabs
- [x] Prueba hablada con la voz guardada
- [x] Transcripción + razonamiento estructurado + respuesta
- [x] Recuperación de contexto relevante para reducir consumo
- [x] Protección de instrucciones contra prompt injection básica
- [x] Pedido validado contra catálogo y total calculado en servidor
- [x] Reserva/cita validada y registrada
- [x] Conversaciones, pedidos y reservas en el panel
- [x] Límites por plan y modo de validación local
- [x] Medición de tokens/voz/coste por negocio
- [x] Inicio con checklist de Preparación para publicar e indicador de incidencias
- [x] WhatsApp aislado detrás de `NEXT_PUBLIC_WHATSAPP_ENABLED=false`
- [x] WhatsApp Embedded Signup, Coexistence, validación de WABA, suscripción de
      webhooks, registro estándar explícito, sincronización de contactos/historial,
      ecos de la app, webhook firmado, historial visible y respuesta manual en Conversaciones
- [x] Health check seguro `/api/health`
- [x] Headers básicos de seguridad
- [x] CI: lint, typecheck, tests y `next build`
- [x] Runbook de despliegue y checklist de seguridad Supabase

## Pendiente de validación con entorno real antes del merge

El repositorio no contiene secretos ni acceso al proyecto Supabase real, por lo que estas comprobaciones deben ejecutarse sobre el entorno que se desplegará:

- [ ] login/registro y callback en `progy.prograwebs.com`;
- [ ] aislamiento RLS con dos usuarios reales;
- [ ] transcripción real desde micrófono;
- [ ] razonamiento real con OpenAI y catálogo del negocio;
- [ ] síntesis con la voz ElevenLabs seleccionada;
- [ ] PDF/DOCX real contra la importación;
- [ ] pedido y reserva persistidos en Supabase;
- [ ] Conversaciones/Consumo actualizados después de la prueba;
- [ ] `/api/health` HTTP 200 en el hosting final.
- [ ] Verificar en el Supabase real que las migraciones de `whatsapp_connections`,
      `whatsapp_messages` y `whatsapp_contacts` estén aplicadas y con RLS activo.
- [ ] Completar Meta App Review y prueba end-to-end con un negocio no tester.

## Externos no bloqueantes para el primer despliegue

- Meta App Review todavía debe finalizar antes de habilitar el onboarding comercial de WhatsApp. El canal permanece desactivado y no bloquea el núcleo de Progy.
- El procesador de pagos recurrentes aún no está elegido; la arquitectura de planes existe pero no se presenta un checkout ficticio.

## Regla antes de mezclar a main

1. CI verde.
2. `docs/SUPABASE_SECURITY_CHECKLIST.md` verificado.
3. smoke test de `docs/DEPLOYMENT.md` en el dominio final.
4. prueba funcional crítica de `docs/TESTING.md` completada.
5. revisar el Pull Request y solo entonces mezclar a `main`.
