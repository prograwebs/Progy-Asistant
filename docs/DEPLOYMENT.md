# Despliegue de Progy

Destino previsto: `https://progy.prograwebs.com`.

## 1. Requisitos del servidor

- Node.js 22.13 o superior.
- pnpm.
- HTTPS activo en el dominio.
- variables de entorno configuradas fuera del repositorio.
- acceso saliente HTTPS a Supabase, OpenAI, ElevenLabs y, cuando se habilite, Meta.

Progy usa el runtime estándar de Next.js y genera una salida `standalone` para facilitar despliegues Node/Docker compatibles.

## 2. Variables mínimas para publicar el núcleo

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
OPENAI_API_KEY
ELEVENLABS_API_KEY
PROGY_APP_URL=https://progy.prograwebs.com
NEXT_PUBLIC_PROGY_MAX_PAYLOAD_MB=4
```

Modelos recomendados actualmente están documentados en `.env.example` y pueden cambiarse por entorno sin modificar código.

`NEXT_PUBLIC_PROGY_MAX_PAYLOAD_MB` controla desde un único valor el tamaño máximo de audio, catálogos y respuestas binarias. El valor público no es un secreto y queda incorporado durante el build: después de cambiarlo hay que crear un nuevo deployment. En despliegue free debe permanecer por debajo del límite vigente de request/response de las Functions; `4` deja margen para multipart frente al máximo actual de 4,5 MB.

Para el primer despliegue mantén:

```text
NEXT_PUBLIC_WHATSAPP_ENABLED=false
```

Los valores de Meta pueden quedar configurados en el servidor, pero el canal no se presenta como conectable hasta habilitar explícitamente la bandera después de la revisión correspondiente.

## 3. Seguridad de secretos

Nunca subas `.env.local`, tokens ni secretos al repositorio.

Variables que deben ser exclusivamente server-side:

```text
OPENAI_API_KEY
ELEVENLABS_API_KEY
META_APP_SECRET
BILLING_CRON_SECRET
```

No deben existir variantes `NEXT_PUBLIC_` de esas credenciales privadas.

## 4. Compilación de release

En una copia limpia del repositorio:

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run test
```

`pnpm run test` ejecuta los smoke tests de release y `next build`. No despliegues una revisión si cualquiera de estos pasos falla.

## 5. Inicio en producción

Después de `pnpm run build`:
```bash
pnpm start
```

El proceso escucha por defecto en el puerto `4173`. El proxy/hosting debe servir `https://progy.prograwebs.com` hacia ese proceso.

Si el proveedor despliega la salida standalone directamente, conserva también los assets de `.next/static` y `public` según su mecanismo de despliegue.

## 6. Configuración externa necesaria

### Supabase

Actualiza las URLs permitidas de autenticación para el dominio estable y confirma que el callback de Progy sea accesible por HTTPS.

#### Aplicar las migraciones

Las tablas nuevas de WhatsApp no se crean automáticamente al desplegar Next.js.
Para un proyecto Supabase nuevo, abre **SQL Editor** y ejecuta, en este orden,
el contenido completo de:

1. `supabase/migrations/20260820_whatsapp_messages.sql`
2. `supabase/migrations/20260821_whatsapp_connection.sql`
3. `supabase/migrations/20260823120000_whatsapp_coexistence.sql`
4. `supabase/migrations/20260902010000_billing_invoices.sql`

Si ya aplicaste estas migraciones, solo verifica que las tablas existan y tengan RLS activo:

```sql
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('whatsapp_messages', 'whatsapp_connections', 'whatsapp_contacts');
```

El resultado esperado es una fila por tabla con `rls_enabled = true`. No
continúes con WhatsApp si alguna migración devuelve error. Las migraciones usan
`if not exists` y son repetibles, pero debes corregir cualquier error de
dependencias o permisos antes de probar el signup.

Antes de clientes reales completa `docs/SUPABASE_SECURITY_CHECKLIST.md`.

La migración de billing agrega `plans` e `invoices` y los campos opcionales
`businesses.tax_id` y `businesses.billing_email`; no elimina ni renombra
columnas existentes. En Cloudflare, configura `BILLING_CRON_SECRET` como
secret del Worker y conserva el runtime Node como despliegue oficial.

### Meta

Usa el mismo dominio estable en la plataforma web, dominios permitidos, políticas legales y URLs OAuth correspondientes. No habilites `NEXT_PUBLIC_WHATSAPP_ENABLED=true` hasta que el flujo externo esté autorizado y probado end-to-end.

Si WhatsApp está habilitado, agrega también `SUPABASE_SECRET_KEY` (o la clave
legacy `SUPABASE_SERVICE_ROLE_KEY`) y `META_WHATSAPP_VERIFY_TOKEN` en el entorno
server-side. El health check marcará `messaging: false` si falta cualquiera de
estos valores; ninguna de esas claves debe usar el prefijo `NEXT_PUBLIC_`.

## 7. Health check

Después del despliegue abre:

```text
https://progy.prograwebs.com/api/health
```

Un release del núcleo debe responder HTTP 200 con:

```json
{
  "status": "ok",
  "checks": {
    "core": true,
    "voice": true,
    "messaging": false
  }
}
```

`messaging: false` es esperado mientras WhatsApp permanezca deshabilitado. El endpoint nunca devuelve claves ni credenciales.

## 8. Smoke test posterior al despliegue

Comprueba manualmente:

1. `/` abre la landing y no muestra errores de consola críticos.
2. `/acceso` permite registro/login y Google si está habilitado en Supabase.
3. `/panel` requiere sesión y carga únicamente el negocio del usuario.
4. negocio/horarios se guardan y sobreviven a recarga.
5. catálogo y conocimiento se guardan correctamente.
6. la lista de voces carga y una muestra se reproduce.
7. una prueba de voz completa transcribe, responde y reproduce la voz elegida.
8. la prueba aparece en Conversaciones y Consumo.
9. un escenario de pedido o reserva crea el registro correcto y el total proviene del catálogo.
10. `/privacidad`, `/terminos` y `/eliminar-datos` son públicos.
11. WhatsApp aparece como `En revisión` mientras la bandera esté apagada.
12. `/api/health` responde `status: ok`.

## 9. Rollback

No edites producción directamente. Cada publicación debe corresponder a un commit/merge de `main`.

Si una actualización falla:

1. vuelve al commit/tag anterior aprobado;
2. recompila y despliega esa revisión;
3. revisa logs sin imprimir secretos;
4. corrige en una rama separada y repite el pipeline.

## 10. Criterio de publicación

El código puede considerarse listo para desplegar cuando CI está verde, el checklist de seguridad de Supabase está verificado y el smoke test con credenciales reales pasa en el dominio final. Servicios externos todavía en revisión deben quedar desactivados mediante feature flag, no simulados como disponibles.
