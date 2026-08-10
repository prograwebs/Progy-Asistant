# Progy

Progy es la plataforma de PrograWebs para configurar asistentes de atención con IA para negocios. El objetivo del producto es que una persona no técnica pueda cargar la información de su negocio, elegir una voz, probar al asistente, revisar conversaciones y recibir pedidos o reservas desde un solo panel.

> Rama de evolución actual: `agent/progy-platform-v1`. `main` conserva la versión aprobada anterior hasta que la nueva rama pase validación y revisión.

## Qué incluye la plataforma

- registro e inicio de sesión con Supabase;
- varios tipos de negocio y configuración multiempresa;
- datos del negocio y horario;
- configuración de comportamiento del asistente;
- catálogo manual de productos/servicios;
- importación asistida desde PDF, DOCX, TXT o CSV con revisión antes de guardar;
- conocimiento, políticas y preguntas frecuentes;
- listado, muestra y selección de voces;
- prueba hablada controlada desde el navegador;
- razonamiento con información relevante del negocio;
- registro automático de pedidos y reservas validados en servidor;
- conversaciones e historial;
- medición de consumo por negocio;
- límites por plan y prueba gratuita;
- WhatsApp Embedded Signup preparado mientras Meta habilita el onboarding de clientes externos.

## Desarrollo local en Windows

Requisitos:

- Node.js 22.13 o superior;
- npm;
- las variables necesarias en `.env.local`.

Desde la raíz del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-windows.ps1
```

Progy queda disponible por defecto en:

```text
http://localhost:4173
```

El script también permite iniciar el túnel de desarrollo cuando se necesita probar callbacks externos.

## Variables de entorno

Copia `.env.example` a `.env.local` y completa únicamente en tu equipo/hosting los secretos reales. `.env.local` está ignorado por Git y no debe subirse al repositorio.

Grupos principales:

```text
Supabase
  SUPABASE_URL
  SUPABASE_PUBLISHABLE_KEY

Inteligencia
  OPENAI_API_KEY
  OPENAI_ASSISTANT_MODEL
  OPENAI_CATALOG_MODEL
  OPENAI_TRANSCRIBE_MODEL

Voz
  ELEVENLABS_API_KEY
  ELEVENLABS_MODEL_ID

WhatsApp / Meta
  NEXT_PUBLIC_META_APP_ID
  NEXT_PUBLIC_META_CONFIG_ID
  META_APP_ID
  META_APP_SECRET
  META_GRAPH_VERSION

Aplicación
  PROGY_APP_URL
```

Nunca conviertas una clave privada en una variable `NEXT_PUBLIC_*`.

## Validación

La rama incluye GitHub Actions y scripts para comprobar el proyecto:

```bash
npm ci
npm run lint
npm run typecheck
npm test
```

`npm test` realiza el build verificado y las pruebas sobre el HTML generado.

## Cómo está organizado

```text
app/api/                  endpoints del servidor
components/dashboard/     interfaz modular del panel
lib/ai/                   inteligencia/transcripción/documentos
lib/assistant/            contexto y acciones del asistente
lib/billing/              límites y capacidades de planes
lib/usage/                medición de consumo
lib/voice/                síntesis y voces
lib/supabase-data.ts      acceso PostgREST con sesión
```

Para entender dónde modificar cada función, consulta [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Prueba de voz y control de costes

La prueba hablada ya no depende de la voz nativa del modelo. El flujo es:

1. el navegador graba un turno corto;
2. el servidor transcribe;
3. Progy recupera solo la información relevante del negocio;
4. la IA prepara una respuesta estructurada;
5. cualquier pedido/reserva se valida contra datos reales antes de guardarse;
6. la respuesta se sintetiza con la voz seleccionada para ese negocio;
7. el uso queda asociado al negocio.

La prueba gratuita se limita en servidor. Reiniciar la página no crea pruebas gratuitas ilimitadas.

## Importación de catálogo

El usuario puede subir un documento existente. Progy devuelve una vista previa editable y no crea productos automáticamente hasta recibir confirmación. Los precios ambiguos quedan marcados para revisión en lugar de ser inventados.

## WhatsApp

El panel conserva una experiencia simple de “Conectar WhatsApp”. La conexión técnica con Meta permanece en el servidor y el cliente no ve tokens, WABA IDs, Phone Number IDs ni proveedores internos.

La incorporación de cuentas externas depende además de la habilitación/revisión correspondiente de Meta. El resto de Progy puede desarrollarse y utilizarse sin bloquearse por ese proceso.

## Política de cambios

- `main`: versión estable/aprobada.
- `agent/progy-platform-v1`: desarrollo de la plataforma modular.
- nuevas funcionalidades deben evitar volver a concentrar toda la interfaz o integraciones en un solo archivo;
- secretos privados solo en entorno del servidor;
- una acción propuesta por la IA siempre debe volver a validarse con datos del sistema antes de escribir en la base de datos.
