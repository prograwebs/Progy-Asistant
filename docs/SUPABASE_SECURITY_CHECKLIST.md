# Checklist de seguridad Supabase

Este checklist es obligatorio antes de incorporar clientes reales. El repositorio usa el access token del usuario para consultar PostgREST; por diseño, Row Level Security (RLS) debe ser la última barrera de aislamiento multiempresa.

## Tablas a revisar

Confirma RLS habilitado en todas las tablas que contienen datos del negocio o del usuario, como mínimo:

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
whatsapp_connections
whatsapp_messages
```

Incluye cualquier tabla nueva con `business_id`, datos personales, credenciales o resultados transaccionales.

## Reglas de acceso esperadas

### businesses

- SELECT/UPDATE/DELETE únicamente para el propietario o miembro autorizado.
- INSERT debe asociar el propietario a `auth.uid()` en servidor/RPC; no confiar en un `owner_id` arbitrario enviado por el navegador.

### Tablas hijas por business_id

Una fila solo debe ser visible/modificable si el usuario autenticado tiene acceso al `business_id` relacionado.

La política debe comprobar la relación contra `businesses` o una tabla de membresías autorizadas. No es suficiente aceptar que el cliente envíe un `business_id`.

### business_categories

Puede ser lectura pública/autenticada si contiene únicamente catálogo de categorías globales y no datos de clientes.

## Credenciales

- No usar `SUPABASE_SERVICE_ROLE_KEY` en el navegador.
- Si una futura tarea server-side necesita service role, guardarla únicamente como secreto del servidor y limitar ese código a operaciones explícitas.
- No registrar access tokens, refresh tokens ni claves de proveedor en logs.
- Mantener `.env*` fuera de Git excepto `.env.example`.

## Prueba de aislamiento obligatoria

Crea dos usuarios de prueba, A y B, con negocios distintos.

Con el usuario A verifica que puede:

- leer/modificar su negocio;
- leer/modificar catálogo y conocimiento propios;
- ver sus conversaciones, pedidos, reservas y consumo.

Con el usuario A intenta acceder manualmente a los IDs del usuario B mediante las mismas rutas/API. Todas las operaciones deben devolver vacío/403 y nunca datos del otro negocio.

Repite en sentido B → A.

Prueba al menos:

```text
GET/PATCH businesses
GET/PATCH agent_configs
GET/POST/PATCH catalog_items
GET/POST/PATCH knowledge_items
GET/PATCH conversations
GET orders
GET bookings
GET usage_ledger
```

## RPCs y funciones

Revisa `create_business_for_current_user` y cualquier RPC para asegurar que:

- usa `auth.uid()` como identidad real;
- no permite crear un negocio para otro usuario a partir de un parámetro cliente;
- valida permisos antes de escribir tablas relacionadas;
- tiene un `search_path` seguro si usa `SECURITY DEFINER`;
- concede `EXECUTE` solo a los roles necesarios.

## Almacenamiento de documentos

Si los documentos subidos se guardan en Supabase Storage:

- bucket privado por defecto;
- políticas de objeto ligadas al negocio/usuario;
- URLs firmadas con expiración cuando sea necesario;
- validar tamaño y tipo en servidor;
- nunca confiar solo en extensión de archivo.

## Datos personales y retención

- recopilar solo datos necesarios para atender la solicitud;
- permitir eliminación de datos conforme a la política pública;
- definir retención para grabaciones/transcripciones cuando se habiliten canales reales;
- documentar proveedores que procesan datos y mantenerlos coherentes con la declaración de Meta.

## Evidencia antes del release

Guarda internamente evidencia de la revisión:

- fecha;
- usuario que ejecutó la prueba;
- tablas verificadas;
- resultado A → B y B → A;
- RPCs revisadas;
- incidencias encontradas y corregidas.

No marques el producto como preparado para clientes si este checklist no se ha comprobado contra el proyecto Supabase real.
