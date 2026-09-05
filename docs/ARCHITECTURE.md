# Arquitectura de Progy

Progy es una aplicación SaaS multiempresa construida sobre Next.js App Router. Este documento define las responsabilidades del código y las reglas que deben mantenerse al ampliar el producto.

## Principios

1. **La interfaz no conoce proveedores.** El cliente ve asistente, voz, conocimiento, consumo o canales. OpenAI, ElevenLabs, Meta y Supabase son detalles internos.
2. **Toda acción sensible se valida en servidor.** Totales, límites, pertenencia del negocio y credenciales nunca dependen del navegador como fuente de verdad.
3. **Multiempresa desde el inicio.** Las operaciones reciben `businessId`, las consultas usan la sesión Supabase del usuario y RLS debe ser la última barrera de acceso.
4. **La IA propone; el sistema valida.** El modelo puede interpretar intención y proponer un pedido/reserva, pero productos, precios y permisos vuelven a comprobarse antes de persistir.
5. **Contexto mínimo necesario.** Se recupera información relevante del negocio y un historial corto para mantener calidad sin inflar tokens.
6. **Integraciones detrás de servicios.** Ningún componente React accede directamente a una credencial privada.
7. **Lanzamientos seguros.** Funciones externas no aprobadas se mantienen detrás de feature flags; nunca se simulan como disponibles.
8. **Regresión visible.** Cada cambio debe pasar lint, tipos, pruebas, build y una prueba funcional antes de publicarse.

## Runtime

```text
Browser
  ↓
Next.js 16 / React 19
  ├─ Server Components / páginas
  └─ Route Handlers / API
       ├─ Supabase
       ├─ OpenAI
       ├─ ElevenLabs
       └─ Meta (opcional)
```

El proyecto no depende de OpenAI Sites, Vinext, Vite, Wrangler, Cloudflare Workers, D1 ni Drizzle. El build de producción es `next build` y el runtime de producción es Node.js.

## Estructura principal

```text
app/
  api/
    assistant/
      session/          abre/cierra pruebas y aplica límites
      turn/             audio/texto -> IA -> acción -> voz
    catalog/
      import/           documento -> vista previa -> confirmación
    elevenlabs/         voces y muestras
    health/             comprobación segura del entorno
    whatsapp/           Embedded Signup + webhook firmado, detrás de feature flag
    workspace/          CRUD del negocio y snapshot del panel
  acceso/               autenticación
  panel/                panel privado
  privacidad/           información legal pública
  terminos/
  eliminar-datos/

components/
  dashboard/
    ProgyDashboard.tsx
    BusinessOnboarding.tsx
    VoiceTestStudio.tsx
    CatalogImport.tsx
    sections/
    types.ts
    utils.ts
    useWorkspace.ts

shared/                         # código seguro para cliente y servidor
  types/
    onboarding.ts               contratos de onboarding y plantillas
    workspace.ts                contratos del panel y workspace
  validation/
    input.ts                    guards y normalización de entradas
  utils/
    formatters.ts               funciones puras de presentación

lib/
  ai/
    openai.ts            transcripción y decisiones estructuradas
  assistant/
    context.ts           recuperación/contexto compacto
    actions.ts           validación y ejecución transaccional
  auth/
    supabase.ts          sesión y usuario
  data/
    supabase.ts          frontera de datos autenticada
    supabase-admin.ts    frontera privilegiada (solo servidor)
  billing/
    entitlements.ts      capacidades y límites por plan
  config/
    env.ts               variables y readiness del servidor
  http/
    errors.ts            errores seguros para cliente
  onboarding/
    service.ts            orquestación durable del onboarding
    templates.ts          catálogo de plantillas demo
  usage/
    ledger.ts            consumo y coste por negocio
  voice/
    catalog.ts           catálogo de voces ElevenLabs
    elevenlabs.ts        síntesis
  whatsapp/
    config.ts             feature flag y configuración del canal
    meta-client.ts        llamadas server-side a Meta
    inbound.ts            webhook -> asistente -> respuesta
```

Las integraciones y fronteras de datos se importan desde sus módulos específicos dentro de `lib/`.

### Reglas de dependencias

La dirección de dependencias es deliberada:

```text
app (rutas y handlers)
  ├─ components (UI)
  └─ lib (servicios, proveedores y datos)
       └─ shared (tipos, validación y utilidades puras)
```

- `shared/` no puede importar `next/headers`, proveedores, base de datos ni secretos.
- `components/` no importa `lib/data`, `lib/auth/supabase`, `lib/ai` ni `lib/assistant/actions`.
- Los handlers de `app/api` obtienen sesión, validan entrada y delegan en un servicio focalizado.
- El acceso Supabase entra por `lib/data/supabase` o `lib/data/supabase-admin`.
- Un tipo utilizado por servidor y cliente vive en `shared/types`, nunca dentro de `components/`.

### Convenciones de imports

```ts
import type { SelectedWorkspace } from "@shared/types/workspace";
import { validIdentifier } from "@shared/validation/input";
import { supabaseDataRequest } from "@/lib/data/supabase";
import { supabaseAdminRequest } from "@/lib/data/supabase-admin";
```

No se debe crear una carpeta `src/client` o `src/server` para duplicar las fronteras de Next.js. La frontera de cliente se expresa con `'use client'`; la frontera de servidor se mantiene en `app/api` y en los servicios de `lib/` que acceden a cookies, proveedores o secretos.

## Flujo de prueba por voz

```text
Navegador
  -> POST /api/assistant/session (start)
  -> MediaRecorder: turno corto
  -> POST /api/assistant/turn
       -> transcribeAudio()
       -> loadAgentContext()
       -> buildCompactAgentInstructions()
       -> generateAssistantDecision()
       -> executeAssistantDecision()
       -> synthesizeSpeech() con agent.voice_id
       -> usage_ledger
  <- texto + audio + acción
  -> POST /api/assistant/session (end)
```

Las pruebas están limitadas en servidor. Durante desarrollo puede habilitarse un modo de validación controlado mediante variable de entorno; producción no depende de ocultar botones para aplicar límites.

## Contexto y conocimiento

El asistente separa:

- **instrucciones**: saludo, tono, reglas y capacidades;
- **datos del negocio**: horario, catálogo, políticas y FAQs;
- **historial corto**: últimos turnos relevantes.

No se debe volver a enviar el catálogo completo o conversaciones completas si puede recuperarse únicamente lo pertinente. Esta regla protege coste y calidad.

## Importación de documentos

```text
PDF/DOCX/TXT/CSV
  -> /api/catalog/import
  -> extracción estructurada
  -> elementos con precio incierto quedan pendientes
  -> vista previa editable
  -> confirmación del usuario
  -> catalog_items
```

Nunca publicar precios inferidos silenciosamente.

## Pedidos y reservas

`lib/assistant/actions.ts` vuelve a consultar los datos del sistema antes de escribir una acción propuesta por la IA. Un pedido solo puede usar productos y precios confirmados. Una reserva/cita requiere fecha válida y capacidad habilitada en `business_features`.

## Consumo

`usage_ledger` registra consumo medible por negocio. La UI puede mostrar:

- tokens de entrada/salida;
- audio procesado cuando el proveedor lo reporta;
- caracteres sintetizados;
- coste estimado si las tarifas internas están configuradas.

No se inventan consumos históricos que nunca fueron medidos.

## WhatsApp

Mientras Meta termina su revisión externa:

```text
NEXT_PUBLIC_WHATSAPP_ENABLED=false
```

La UI muestra el canal como `En revisión` y no permite iniciar una incorporación
mientras la bandera está apagada. El código de Embedded Signup, suscripción,
registro explícito y webhook se mantiene preparado para la validación externa;
WhatsApp no es requisito para desplegar el núcleo de Progy.

No se debe volver a acoplar WhatsApp a ElevenLabs. Meta es el proveedor del canal; ElevenLabs es el proveedor de voz.

## Seguridad multiempresa

Como mínimo RLS debe aislar:

```text
businesses
agent_configs
business_hours
business_features
catalog_categories
catalog_items
knowledge_items
business_plans
conversations
orders
bookings
usage_ledger
```

La aplicación no usa una service-role key en el navegador. Consulta `SUPABASE_SECURITY_CHECKLIST.md` antes de clientes reales.

## Release

`/api/health` ofrece un health check que no expone secretos. El núcleo se considera listo cuando Supabase/OpenAI/ElevenLabs están configurados; WhatsApp puede permanecer deshabilitado.

El dashboard incluye un checklist de preparación que exige configuración completa y al menos una prueba de voz terminada antes de mostrar el negocio como listo para publicar.

## Dónde modificar cada función

- comportamiento de IA: `lib/assistant/context.ts` y `lib/ai/openai.ts`;
- acciones: `lib/assistant/actions.ts`;
- autenticación: `lib/auth/supabase.ts`;
- configuración/env: `lib/config/env.ts`;
- voces: `lib/voice/`;
- límites: `lib/billing/entitlements.ts`;
- importación: `app/api/catalog/import/` y `components/dashboard/CatalogImport.tsx`;
- panel: `components/dashboard/sections/`;
- WhatsApp: `components/dashboard/metaSignup.ts` y `app/api/whatsapp/`.

## Regla para futuras integraciones

Componente React → Route Handler → servicio `lib/` → proveedor externo.

Si una integración necesita secreto, validación, firma, idempotencia o transformación de datos, esa lógica pertenece al servidor. No debe implementarse dentro del componente visual.
