# Progy

Progy es la plataforma SaaS de PrograWebs para configurar y operar asistentes de atención con IA para negocios. Está diseñada para que una persona no técnica pueda cargar la información de su empresa, elegir una voz, validar al asistente, revisar conversaciones y recibir pedidos o reservas desde un solo panel.

> Desarrollo actual: `agent/progy-platform-v1`. `main` conserva la versión estable anterior hasta completar la validación final y aprobar el Pull Request.

## Producto

La plataforma incluye:

- autenticación y sesión con Supabase;
- arquitectura multiempresa por `businessId`;
- perfil, horarios y configuración del negocio;
- comportamiento, saludo, tono y capacidades del asistente;
- catálogo manual de productos y servicios;
- importación asistida desde PDF, DOCX, TXT y CSV con revisión antes de guardar;
- conocimiento, políticas y preguntas frecuentes;
- selección y muestra de voces ElevenLabs;
- pruebas de voz controladas desde el navegador;
- razonamiento con OpenAI usando contexto del negocio;
- validación server-side de pedidos y reservas antes de persistirlos;
- historial de conversaciones;
- medición de tokens, voz y coste estimado por negocio;
- límites y capacidades por plan;
- WhatsApp preparado detrás de una bandera de lanzamiento mientras termina la revisión externa de Meta.

## Stack

Progy se ejecuta oficialmente como una aplicación estándar de **Next.js 16 + React 19** sobre Node.js 22. La configuración OpenNext/Wrangler permite un despliegue provisional en Cloudflare Workers sin reemplazar la salida Node.

Servicios principales:

```text
Next.js             aplicación web y API del servidor
Supabase            autenticación y datos multiempresa
OpenAI              transcripción, razonamiento y extracción estructurada
ElevenLabs          voces y síntesis de audio
Meta                canal WhatsApp opcional cuando sea habilitado
```

Los proveedores son detalles internos. La interfaz de cliente habla de asistente, voz, conocimiento, consumo y canales.

## Desarrollo local

Requisitos:

- Node.js 22.13 o superior;
- npm;
- `.env.local` con las credenciales del entorno.

Desde la raíz:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-windows.ps1
```

También puede iniciarse directamente:

```bash
pnpm install --frozen-lockfile
pnpm run dev
```

La aplicación queda en `http://localhost:4173`.

## Variables de entorno

Copia `.env.example` a `.env.local`. Los secretos reales viven únicamente en el equipo o proveedor de hosting y nunca deben subirse a Git.

Grupos principales:

```text
Supabase
  SUPABASE_URL
  SUPABASE_PUBLISHABLE_KEY

IA
  OPENAI_API_KEY
  OPENAI_ASSISTANT_MODEL
  OPENAI_CATALOG_MODEL
  OPENAI_TRANSCRIBE_MODEL

Voz
  ELEVENLABS_API_KEY
  ELEVENLABS_MODEL_ID

WhatsApp (opcional)
  NEXT_PUBLIC_WHATSAPP_ENABLED
  NEXT_PUBLIC_META_APP_ID
  NEXT_PUBLIC_META_CONFIG_ID
  META_APP_ID
  META_APP_SECRET
  META_GRAPH_VERSION

Aplicación
  PROGY_APP_URL
```

`META_APP_SECRET`, `OPENAI_API_KEY` y `ELEVENLABS_API_KEY` nunca deben utilizar el prefijo `NEXT_PUBLIC_`.

## Calidad y validación

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
```

`pnpm run test` ejecuta las pruebas de configuración/release y un build de producción con Next.js. GitHub Actions ejecuta la misma validación en cada cambio de la rama y en el Pull Request.

Para un despliegue real, valida además el flujo funcional con credenciales reales siguiendo [`docs/TESTING.md`](docs/TESTING.md).

## Arquitectura

```text
app/
  api/                     rutas server-side
  acceso/                  autenticación
  panel/                   panel privado

components/dashboard/      módulos de interfaz del panel

lib/
  ai/                      OpenAI: transcripción y decisiones
  assistant/               contexto, validación y acciones
  auth/                    sesión Supabase
  billing/                 capacidades y límites por plan
  config/                  configuración del servidor
  http/                    errores seguros
  usage/                   medición de consumo
  voice/                   catálogo y síntesis de voz
  supabase-data.ts         acceso PostgREST con sesión del usuario
```

Consulta [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para el mapa completo.

## Principios de seguridad

- una acción sugerida por la IA vuelve a validarse en servidor antes de escribir datos;
- precios, disponibilidad y pertenencia del negocio no se aceptan desde el navegador como fuente de verdad;
- las consultas a Supabase usan la sesión del usuario, por lo que RLS debe ser la barrera final de aislamiento;
- nunca se expone una service-role key ni secretos de proveedores al navegador;
- los canales que dependen de aprobaciones externas se mantienen desactivados mediante feature flags hasta estar listos.

Antes de incorporar clientes reales, completa [`docs/SUPABASE_SECURITY_CHECKLIST.md`](docs/SUPABASE_SECURITY_CHECKLIST.md).

## Despliegue

El destino de producción es `https://progy.prograwebs.com`.

Consulta [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) para variables, comandos, health check y checklist de publicación.

## Política de cambios

- `main`: versión aprobada y desplegable;
- `agent/progy-platform-v1`: evolución actual hasta completar validación;
- nuevas integraciones deben vivir detrás de servicios server-side en `lib/`;
- no volver a concentrar lógica de negocio, proveedores e interfaz en un componente monolítico;
- cualquier cambio de comportamiento del asistente debe volver a pasar la prueba de publicación del panel antes de salir a clientes.
