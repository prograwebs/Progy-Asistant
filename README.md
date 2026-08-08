# Progy

Progy es la plataforma de asistentes de voz de PrograWebs. Incluye landing pública, autenticación con Supabase, panel multiempresa, configuración por industria, catálogo o servicios, horarios, conocimiento, selección de voz, pruebas con OpenAI Realtime y preparación de WhatsApp mediante ElevenLabs Agents y Meta.

## Tecnologías

- React 19 y Next.js 16 sobre Vinext/Vite
- Cloudflare Workers mediante ChatGPT Sites
- Supabase Auth y PostgREST
- OpenAI Realtime por WebRTC
- ElevenLabs para voces y canal de WhatsApp

## Variables necesarias

Copia `.env.example` a `.env.local` y completa:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
```

Las claves de OpenAI y ElevenLabs son privadas. Nunca las coloques en componentes del navegador ni las publiques en GitHub.

Variables opcionales:

```env
SUPABASE_ANON_KEY=
OPENAI_REALTIME_MODEL=gpt-realtime-2.1
OPENAI_REALTIME_VOICE=marin
ELEVENLABS_MODEL_ID=eleven_flash_v2_5
ELEVENLABS_VOICE_ID=
PROGY_APP_URL=http://localhost:4173
```

## Ejecutar localmente en Windows

Necesitas:

- Windows 10 u 11.
- Node.js 22 o superior. Node.js 24 también funciona.
- Una carpeta extraída del proyecto; no ejecutes Progy dentro del archivo ZIP.
- Las mismas cuatro variables que configuraste en Sites.

### Primera ejecución

1. Extrae el ZIP y abre la carpeta `Progy-codigo-fuente` en VS Code.
2. Abre **Terminal → New Terminal** y confirma que sea PowerShell.
3. Ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-windows.ps1
```

La primera vez se creará `.env.local`. Ábrelo y completa:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
PROGY_APP_URL=http://localhost:4173
```

No incluyas comillas alrededor de los valores y no compartas ese archivo. Vuelve a ejecutar el mismo comando. El asistente instalará las dependencias y abrirá Progy en `http://localhost:4173`.

Para que Google regrese a la versión local, agrega una vez en **Supabase → Authentication → URL Configuration → Redirect URLs**:

```text
http://localhost:4173/auth/callback
```

No reemplaces la URL de Progy publicada; agrega esta como una dirección adicional.

### Ejecución manual

Requiere Node.js 22 o superior.

En Linux:

```bash
npm ci
npm run dev -- --host 0.0.0.0 --port 4173
```

En Windows PowerShell, los scripts de validación del despliegue usan Bash. Para trabajar en la interfaz localmente puedes ejecutar:

```powershell
npm ci
npx vite --host 0.0.0.0 --port 4173
```

Abre `http://localhost:4173`.

Para detener Progy, vuelve a la terminal y presiona `Ctrl + C`.

## Estructura principal

- `app/page.tsx`: landing pública.
- `app/acceso`: registro e inicio de sesión.
- `app/panel`: panel y módulos de configuración.
- `app/api/workspace`: datos multiempresa en Supabase.
- `app/api/openai/realtime`: sesión de prueba con OpenAI.
- `app/api/elevenlabs`: voces y saludo real.
- `app/api/whatsapp`: estado, sincronización y asignación del agente.
- `lib/integrations.ts`: autenticación y conexiones del servidor.
- `lib/supabase-data.ts`: acceso a datos y contexto del negocio.

## Flujo de WhatsApp

1. El usuario guarda el número en formato internacional.
2. Autoriza la cuenta empresarial mediante el flujo seguro de Meta abierto desde ElevenLabs.
3. Progy crea o actualiza un agente con el negocio, horarios, catálogo, conocimiento y voz.
4. Progy asigna ese agente al número autorizado.
5. El usuario prueba mensajes y llamadas dentro de WhatsApp.

La autorización de Meta requiere intervención del administrador y no debe automatizarse con contraseñas o códigos dentro de Progy.

## Base de datos

Este código espera el esquema de Progy/Kely ya instalado en Supabase, incluyendo `businesses`, `agent_configs`, `business_hours`, `catalog_items`, `knowledge_items`, `business_features`, `conversations`, `orders`, `bookings`, `business_plans`, `usage_ledger` y sus políticas RLS.

## Seguridad

- Las claves privadas se leen únicamente en rutas del servidor.
- Cada consulta de negocio utiliza la sesión de Supabase y sus políticas RLS.
- El archivo comprimido del código no incluye `.env`, `node_modules`, compilaciones ni credenciales del despliegue.
"# Progy-Asistant" 
