# Arquitectura de Progy

Este documento describe dónde vive cada responsabilidad de la plataforma y sirve como mapa para futuras modificaciones.

## Principios

1. **La interfaz no conoce proveedores.** El cliente ve "voz", "asistente", "WhatsApp", "consumo" o "catálogo"; OpenAI, ElevenLabs, Meta y Supabase son detalles internos.
2. **Toda acción sensible se valida en servidor.** Los totales de pedidos, límites de prueba, pertenencia del negocio y credenciales nunca dependen del navegador.
3. **Multiempresa desde el inicio.** Todas las operaciones funcionales reciben `businessId` y las consultas se ejecutan con la sesión Supabase del usuario para que las políticas RLS sigan siendo la última barrera de acceso.
4. **La IA propone; el servidor valida.** El modelo puede clasificar intención y estructurar una propuesta de pedido/reserva, pero los precios y elementos se vuelven a comprobar contra el catálogo antes de guardar.
5. **Coste controlado.** El prompt incluye solo conocimiento y catálogo relevantes, conserva un historial corto y registra uso por negocio.

## Estructura principal

```text
app/
  api/
    assistant/
      session/       # abre/cierra pruebas y aplica límites del plan
      turn/          # audio/texto -> razonamiento -> acción -> voz
    catalog/
      import/        # documento -> vista previa -> importación confirmada
    elevenlabs/      # listado y muestras de voces
    whatsapp/        # Embedded Signup y conexión Meta
    workspace/       # CRUD general del negocio y snapshot del panel
  panel/
    page.tsx          # puerta de entrada al panel autenticado

components/
  dashboard/
    ProgyDashboard.tsx
    BusinessOnboarding.tsx
    VoiceTestStudio.tsx
    CatalogImport.tsx
    sections/         # módulos independientes del panel
    types.ts
    utils.ts
    useWorkspace.ts

lib/
  ai/
    openai.ts         # transcripción, decisión estructurada, lectura de catálogos
  assistant/
    context.ts        # contexto compacto/relevante del negocio
    actions.ts        # validación y ejecución de pedidos/reservas
  billing/
    entitlements.ts   # límites por plan
  usage/
    ledger.ts         # medición interna por negocio
  voice/
    elevenlabs.ts     # síntesis con la voz elegida
  integrations.ts     # configuración/autenticación heredada (a seguir separando)
  supabase-data.ts    # cliente PostgREST con la sesión del usuario
```

## Flujo de prueba por voz

```text
Navegador
  -> POST /api/assistant/session (start)
  -> grabación corta con MediaRecorder
  -> POST /api/assistant/turn
       -> transcribeAudio()
       -> loadAgentContext()
       -> buildCompactAgentInstructions()
       -> generateAssistantDecision()
       -> executeAssistantDecision()
       -> synthesizeSpeech() con agent.voice_id
       -> usage_ledger
  <- texto + audio
  -> POST /api/assistant/session (end)
```

La prueba gratuita se controla en servidor. No depende de ocultar un botón en el navegador.

## Flujo de catálogo desde documento

```text
PDF/DOCX/TXT/CSV
  -> POST /api/catalog/import (multipart)
  -> extracción estructurada
  -> vista previa editable
  -> usuario selecciona/corrige
  -> POST /api/catalog/import (JSON)
  -> catalog_items
```

Si un precio no es claro, se devuelve `null` y el elemento requiere revisión. Nunca se publica un precio inferido silenciosamente.

## Pedidos y reservas

El modelo devuelve una intención estructurada, pero `lib/assistant/actions.ts` vuelve a buscar cada producto en el catálogo y calcula el total en servidor. Si el elemento o precio no se puede identificar con seguridad, no se crea el pedido.

Las reservas y citas también se validan en servidor y requieren una fecha futura. Además, la acción debe estar habilitada en `business_features`.

## Datos que debe aislar RLS

Como mínimo, las políticas de Supabase deben aislar por propietario/membresía:

- `businesses`
- `agent_configs`
- `business_hours`
- `business_features`
- `catalog_items`
- `knowledge_items`
- `conversations`
- `orders`
- `bookings`
- `business_plans`
- `usage_ledger`
- futuras `whatsapp_connections`

La aplicación no debe usar una service-role key en el navegador.

## Qué modificar para cada función

- Cambiar cómo responde Progy: `lib/assistant/context.ts` y `lib/ai/openai.ts`.
- Agregar una nueva acción: tipo estructurado en `lib/ai/openai.ts`, validación en `lib/assistant/actions.ts`, visualización en su sección del dashboard.
- Cambiar voz: `lib/voice/elevenlabs.ts` y `components/dashboard/sections/VoiceSection.tsx`.
- Cambiar límites: `lib/billing/entitlements.ts`.
- Cambiar importación: `app/api/catalog/import/route.ts` y `components/dashboard/CatalogImport.tsx`.
- Cambiar la navegación/panel: `components/dashboard/ProgyDashboard.tsx` y `components/dashboard/sections/`.
- Cambiar WhatsApp: `components/dashboard/metaSignup.ts` y `app/api/whatsapp/`.

## Regla para nuevas integraciones

Una integración nueva debe vivir detrás de un servicio en `lib/`. No debe llamarse directamente desde un componente React si necesita un secreto. El componente llama a una ruta de servidor; la ruta llama al servicio; el servicio usa la credencial privada.
