# WhatsApp en Progy

## Alcance actual

La integración permite conectar una WABA mediante Embedded Signup, validar la
WABA autorizada, suscribir la app a sus webhooks, guardar la conexión server-side,
registrar explícitamente el número en Cloud API, listar/seleccionar plantillas y
enviar un mensaje de prueba usando una plantilla aprobada. El procesamiento de
mensajes entrantes, webhook, conversaciones y respuestas automáticas también está
implementado, pero continúa protegido por la bandera y requiere una prueba
end-to-end antes de producción.

## Flujo

```text
WhatsAppSection
  └─ metaSignup.ts
       └─ Facebook Embedded Signup
            └─ POST /api/whatsapp/connect
                 ├─ valida sesión y permisos del negocio
                 ├─ intercambia code por access token
                 ├─ verifica que la WABA pertenece al Business ID autorizado
                 ├─ consulta WABA y teléfono en Graph
                 ├─ suscribe la app a la WABA
                 └─ guarda token y metadatos en whatsapp_connections

WhatsAppSection
  └─ POST /api/whatsapp/register
       ├─ vuelve a suscribir la app a la WABA
       ├─ registra el teléfono con el PIN de seis dígitos
       └─ guarda el estado de activación sin guardar el PIN

WhatsAppSection
  ├─ GET /api/whatsapp/connect
  ├─ GET/POST /api/whatsapp/templates
  └─ POST /api/whatsapp/send-text
       └─ servidor obtiene token y phone_number_id desde Supabase
            └─ Graph API de Meta

Meta webhook
  ├─ GET /api/whatsapp/webhook (verify_token + challenge)
  └─ POST /api/whatsapp/webhook (HMAC SHA-256)
       ├─ resuelve el negocio por phone_number_id
       ├─ reclama provider_message_id una sola vez
       ├─ crea/recupera conversación WhatsApp
       ├─ ejecuta contexto → IA → acción validada
       ├─ envía respuesta server-side
       └─ guarda mensaje entrante/saliente y estado
```

## Reglas importantes

- `businessId` es el UUID interno de Progy. `businessId` dentro del resultado
  de Meta es el Business ID de Meta; no deben intercambiarse.
- El navegador nunca recibe `access_token`, App Secret ni claves de Supabase.
- La feature flag se valida en cliente y servidor:
  `NEXT_PUBLIC_WHATSAPP_ENABLED=true` solo debe usarse después de App Review y
  una prueba end-to-end.
- El envío de prueba utiliza una plantilla, no texto libre.
- La suscripción a la WABA se realiza al completar la conexión y también al
  registrar el teléfono; ambas operaciones son idempotentes.
- El registro del teléfono es explícito porque requiere el PIN de dos pasos del
  negocio. El PIN nunca se persiste ni se devuelve al navegador.
- El cliente puede seleccionar una plantilla, pero el servidor vuelve a
  comprobar nombre, idioma y estado `APPROVED` antes de enviarla.
- El envío no registra automáticamente un número. El registro, si fuera
  necesario para una configuración concreta de Meta, debe ser una acción
  explícita de administración.
- La versión de Graph se toma de `META_GRAPH_VERSION` en servidor y de
  `NEXT_PUBLIC_META_GRAPH_VERSION` en el SDK del navegador. Ambos valores deben
  mantenerse iguales; usan `v25.0` como valor predeterminado.

## Datos server-side

`lib/whatsapp/store.ts` persiste y recupera la conexión; `webhook-store.ts`
persiste mensajes y conversaciones desde el proceso server-side. Ambos deben
usar las tablas del proyecto Supabase real y mantener
el token fuera del cliente. Hay que aplicar las migraciones
`20260821_whatsapp_connections.sql` y
`20260820_whatsapp_messages.sql` en el proyecto Supabase real y confirmar que
la tabla, su índice único por `business_id` y sus políticas de seguridad existen
en ese proyecto.

Los mensajes del webhook requieren aplicar
`supabase/migrations/20260820_whatsapp_messages.sql` en el proyecto Supabase
real antes de activar el POST del webhook. El proceso también necesita
`SUPABASE_SECRET_KEY` (o la clave legacy `SUPABASE_SERVICE_ROLE_KEY`) únicamente
en variables server-side; nunca debe llegar al navegador.

## Siguiente fase

Antes de producción hay que aplicar la migración en Supabase y probar con Meta
real el challenge, la firma, mensajes duplicados, respuestas, estados,
expiración de tokens y aislamiento entre dos negocios. Después se puede añadir
soporte para multimedia, plantillas de respuesta fuera de la ventana de
servicio y controles operativos de reintento/reprocesamiento.
