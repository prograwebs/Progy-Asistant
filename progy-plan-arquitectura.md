# Progy — Plan de Arquitectura y Roadmap Técnico

**De:** Segundo (Product Owner) + Claude (arquitectura)
**Para:** Dev
**Fecha:** 30 agosto 2026
**Objetivo de este documento:** darte el mapa completo de hacia dónde vamos, por qué, y el primer módulo listo para construir. Esto es un plan vivo — lo iremos actualizando módulo por módulo, no se construye todo de una vez.

---

## 1. Contexto y objetivo del producto

Progy es una plataforma SaaS que permite a un negocio pequeño (barbería, spa, clínica dental/estética, restaurante) auto-configurarse y tener un agente de IA atendiendo por WhatsApp (texto y audio), y a futuro por llamadas telefónicas. El diferenciador frente a la competencia (bots de texto genéricos) es la **voz** y un agente que realmente ejecuta acciones (toma pedidos, agenda citas, etc.), no solo responde preguntas.

Ya tenemos un MVP funcional al ~30%: login, multi-tenant, conexión de WhatsApp vía Embedded Signup, respuesta automatizada de mensajes y configuración básica del negocio. Ahora entramos en la fase de **consolidar arquitectura** para que cada módulo nuevo se pueda construir sin rehacer lo anterior.

## 2. Por qué este plan y no "seguir agregando features"

Hoy el agente funciona así: OpenAI devuelve una "decisión" con un `intent` fijo (`order`, `booking`, o nada), y el código tiene un switch que ejecuta una función según ese intent. Cada capacidad nueva del agente (mandar un email, transferir a un humano, agendar una llamada de vuelta) obliga a:
1. Tocar el tipo `AssistantDecision` en `lib/ai/openai.ts`
2. Agregar un caso al switch en `lib/assistant/actions.ts`
3. Editar a mano el texto del prompt en `lib/assistant/context.ts`

Esto no escala y además no es reutilizable entre nichos (barbería vs restaurante necesitan tools distintas, con terminología distinta). La solución es que las capacidades del agente sean **datos configurables** (una tabla de "tools"), no código hardcodeado. Así, agregar una capacidad nueva es insertar una fila, no reescribir tres archivos.

## 3. Principio de arquitectura general

Vamos a construir por **módulos pequeños y cerrados**, cada uno con su propia migración SQL, su propio código y su propio criterio de aceptación. No se pasa al siguiente módulo hasta que el anterior esté probado. Orden general (puede ajustarse):

| # | Módulo | Depende de aprobación Meta? |
|---|--------|------------------------------|
| 1 | **Tools Registry** (agente ejecuta acciones vía function calling real) | No |
| 2 | **Terminología y reglas por nicho** (personalización por tipo de negocio) | No |
| 3 | **Trials y control de cuotas en tiempo real** | No |
| 4 | **Langfuse — trazabilidad y prompts parametrizados** | No |
| 5 | Retest completo del flujo de Embedded Signup / Coexistence | Sí (parcial) |
| 6 | Billing / facturación in-app | No |
| 7 | Canal de llamadas (voz telefónica) | No, pero es el más grande |

Este documento cubre en detalle el **Módulo 1**. Los siguientes se entregarán como documentos separados a medida que cerremos cada uno, para no abrumarte con todo de golpe.

---

## 4. MÓDULO 1 — Tools Registry (agente con function calling real)

### 4.1 Qué es y por qué

Vamos a reemplazar el `intent` fijo por **function calling nativo de OpenAI**: el modelo recibe una lista de "tools" disponibles (con su nombre, descripción y schema de parámetros) y decide él mismo cuál invocar, con qué argumentos, o si no necesita ninguna. Esto es el patrón estándar de agentes de IA y es lo que nos permite:

- Agregar capacidades nuevas (mandar email, transferir a humano, agendar callback) sin tocar código de lógica de negocio, solo agregando datos.
- Habilitar/deshabilitar tools por negocio o por plan (ej. "transferir a humano" solo en plan pagado).
- Que cada nicho tenga su propio set de tools sin duplicar código (ya lo prepara el módulo 2).
- Trazabilidad limpia: cada tool call queda registrado igual que hoy en `agent_actions`.

### 4.2 Qué NO cambia

- `agent_actions`, `orders`, `bookings`, `catalog_items`, etc. — todo el modelo de datos existente se mantiene igual.
- La lógica interna de `createOrder` y `createBooking` en `lib/assistant/actions.ts` — se reutiliza casi tal cual, solo cambia cómo se invoca.
- `business_features` / `feature_definitions` — se mantienen como el flag de "esta capacidad de negocio existe". Los tools nuevos se apoyan en estos flags, no los reemplazan.

### 4.3 Modelo de datos nuevo

```sql
-- Catálogo global de tools que la plataforma sabe ejecutar.
-- No es por negocio: es el menú completo de capacidades que Progy soporta.
create table agent_tools (
  code text primary key,                 -- 'create_order', 'create_booking', 'send_email', 'transfer_to_human'
  name text not null,                    -- nombre legible ("Registrar pedido")
  description text not null,             -- se envía tal cual como "description" del tool a OpenAI
  parameters_schema jsonb not null,      -- JSON Schema válido (formato function calling de OpenAI)
  category text,                         -- 'commerce' | 'scheduling' | 'communication' | 'handoff'
  requires_feature_code text references feature_definitions(code),
  handler_key text not null,             -- identifica qué función TS lo ejecuta (ver 4.5)
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Configuración de un tool para un negocio específico.
-- Ej: send_email necesita saber a qué correo mandar; algunos negocios
-- pueden querer un tool activo por feature pero apagado manualmente.
create table business_tool_settings (
  business_id uuid not null references businesses(id) on delete cascade,
  tool_code text not null references agent_tools(code) on delete cascade,
  enabled boolean not null default true,
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, tool_code)
);
```

**Nota de diseño:** `agent_tools` es una tabla de catálogo de plataforma (la mantenemos nosotros como parte del producto, no el negocio final). `business_tool_settings` es lo único que varía por tenant. Esto es análogo a cómo ya está `feature_definitions` vs `business_features` — mismo patrón, así que debería sentirse familiar.

### 4.4 Los primeros 4 tools a registrar (seed inicial)

Para arrancar, migramos las dos capacidades que ya existen y sumamos dos nuevas simples para validar que el patrón funciona:

1. `create_order` → requiere feature `take_orders` (ya existe)
2. `create_booking` → requiere feature `schedule_appointments` o `create_reservations` (ya existe)
3. `transfer_to_human` → requiere feature nueva `human_handoff` (marca la conversación para seguimiento manual, sin acción externa)
4. `send_email` → requiere feature nueva `send_email_notifications` (envía un correo de confirmación al negocio o cliente — puede quedar como stub/logging en esta primera versión si no hay proveedor de email aún configurado)

No agregues más tools que estos 4 en esta primera pasada — el objetivo es validar el mecanismo, no cubrir todo el catálogo de capacidades futuras.

### 4.5 Cambios de código

**Nuevo: `lib/agent/tools/registry.ts`**
- `getEnabledToolsForBusiness(context: AgentContext): OpenAITool[]` — trae de `agent_tools` los activos, filtra por si el negocio tiene el `requires_feature_code` habilitado en `business_features`, y filtra por `business_tool_settings.enabled` (default true si no hay fila). Devuelve el array ya en el formato que espera el parámetro `tools` de la API de OpenAI.
- `executeTool(handlerKey: string, context: AgentContext, args: unknown, request: DataRequest): Promise<AssistantActionResult>` — dispatcher simple (objeto `handlerKey -> función`) que mapea a los handlers reales.

**Modificar: `lib/assistant/actions.ts`**
- `createOrder` y `createBooking` se mantienen casi igual, pero ahora reciben los argumentos ya validados por el JSON Schema del tool (menos validación manual de forma de datos, se mantiene la validación de negocio: catálogo existe, precio confirmado, etc.)
- Agregar dos handlers nuevos: `transferToHuman` y `sendEmailNotification` (este último puede empezar como no-op que solo registra en `agent_actions`, mientras no haya proveedor de email — no bloquea el resto del módulo).

**Modificar: `lib/ai/openai.ts`**
- Reemplazar el schema fijo de `AssistantDecision` por una llamada con `tools: getEnabledToolsForBusiness(context)`.
- El modelo puede devolver 0, 1 o varios `tool_calls` en su respuesta. Implementar un loop simple con **máximo 3 iteraciones** por turno (para casos donde el modelo encadena, ej. crear pedido y luego mandar email de confirmación). Si se llega al máximo sin resolución, responder con el fallback del negocio.
- Mantener registro de uso (tokens) igual que hoy — no cambia `recordOpenAIUsage`.

**Modificar: `lib/whatsapp/inbound.ts`**
- Donde hoy se llama `executeAssistantDecision(context, generated.decision, adminRequest)`, pasa a iterar sobre `generated.tool_calls` llamando `executeTool` por cada uno. El resto del flujo (guardar conversación, responder por WhatsApp, marcar mensaje procesado) no cambia.

**Modificar: `lib/assistant/context.ts`**
- El prompt ya no necesita listar "capacidades habilitadas" como texto plano (`context.features.map(...)`) — eso ahora lo comunica OpenAI automáticamente a través de la lista de tools disponibles. Simplificar esa línea del prompt.

### 4.6 Qué probar antes de dar por cerrado el módulo

- Un negocio con `take_orders` habilitado y `schedule_appointments` deshabilitado: el agente debe poder tomar pedidos pero NO debe intentar agendar citas (ni debe aparecer esa opción en la lista de tools que recibe OpenAI).
- Un negocio con `human_handoff` habilitado: probar que un mensaje ambiguo o una queja dispare `transfer_to_human` y quede registrado en `agent_actions`.
- Verificar en `agent_actions` que cada tool call ejecutado (exitoso o fallido) deja registro con `action_name` = el `code` del tool.
- Probar que agregar una fila nueva en `agent_tools` (sin tocar código) hace que el tool aparezca disponible para los negocios que tengan el feature correspondiente — esta es la prueba de que el patrón realmente desacopla capacidades de código.

### 4.7 Qué explícitamente no entra en este módulo

- No se construye todavía el módulo de terminología por nicho (Módulo 2) — los tools usan nombres genéricos ("pedido", "cita") por ahora.
- No se construye enforcement de cuotas/trial en este módulo — eso es el Módulo 3.
- No se conecta un proveedor de email real todavía — `send_email` puede quedar en modo stub/log.
- No se toca nada del flujo de Embedded Signup / conexión de WhatsApp.

---

## 5. Qué sigue después de este módulo

Una vez que el Módulo 1 esté funcionando y probado, el siguiente documento cubrirá el **Módulo 2 (terminología y reglas por nicho)**, que se apoya directamente en `agent_tools` y `business_categories` para que, por ejemplo, un restaurante vea "pedido" y una clínica vea "cita" sin que sea texto hardcodeado en el prompt. Iremos módulo por módulo así, cada uno con este mismo formato: contexto, modelo de datos, cambios de código, criterios de prueba.

Cualquier duda sobre el "por qué" de una decisión de este documento, pregúntale a Segundo antes de improvisar una alternativa — el objetivo es que la arquitectura quede consistente entre módulos, no que cada pieza se resuelva de la forma más rápida en el momento.