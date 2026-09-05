# Seguridad de Progy

## Secretos

Los secretos se cargan solo desde variables de entorno del servidor. Nunca deben aparecer en componentes React, respuestas públicas, capturas, commits o variables `NEXT_PUBLIC_*`.

Secretos típicos:

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `META_APP_SECRET`
- cualquier clave privada futura del procesador de pagos

Los IDs públicos pueden ser `NEXT_PUBLIC_*` únicamente cuando el proveedor exige que el navegador los conozca.

## Autorización multiempresa

Las rutas sensibles trabajan con la sesión del usuario. Supabase RLS debe impedir que una cuenta consulte o modifique un negocio ajeno incluso si intenta cambiar manualmente un `businessId`.

El repositorio utiliza el access token Supabase del usuario para PostgREST. No se debe introducir una service-role key en código cliente para “resolver” problemas de permisos.

La verificación completa está en `SUPABASE_SECURITY_CHECKLIST.md`.

## IA y acciones

La salida del modelo nunca es fuente de verdad para una operación comercial.

- precios se consultan nuevamente desde catálogo;
- totales se calculan en servidor;
- elementos ambiguos no se registran;
- reservas necesitan datos válidos y capacidad habilitada;
- una acción solo puede ejecutarse cuando el negocio tiene esa capacidad activa.

### Prompt injection

Texto del cliente, historial, conocimiento y archivos se tratan como **datos no confiables**, no como instrucciones del sistema.

Las instrucciones del modelo exigen ignorar intentos de:

- cambiar reglas internas;
- revelar prompts, tokens, credenciales o configuración de proveedores;
- inventar descuentos/precios/disponibilidad;
- obtener datos de otros negocios;
- convertir instrucciones incrustadas en documentos en acciones.

La defensa principal de operaciones sigue siendo la validación server-side; una instrucción al modelo nunca sustituye controles de autorización o datos.

## Archivos

La importación limita tamaño y formatos aceptados. Lo extraído es una vista previa y no se guarda hasta confirmación del usuario. El contenido del archivo no puede redefinir instrucciones del asistente.

Si más adelante se almacenan archivos en Supabase Storage, aplicar bucket privado, RLS/policies de objeto y URLs firmadas.

## Consumo y abuso

Los límites de prueba se aplican en servidor. Ocultar o deshabilitar un botón no es un mecanismo de seguridad.

Las rutas de autenticación aplican límites server-side persistentes mediante la RPC `consume_auth_rate_limit` de Supabase. Los fingerprints HMAC se calculan con la clave server-side y no se almacenan IPs, emails ni tokens en texto plano.

| Ruta | Límite principal | Límite secundario |
|---|---:|---:|
| `/api/auth/login` | 30 por IP / 15 min | 5 por email / 15 min |
| `/api/auth/signup` | 10 por IP / 1 h | 3 por email / 1 h |
| `/api/auth/refresh` | 60 por IP / 1 min | 30 por refresh token / 1 min |
| `/api/auth/oauth-session` | 10 por IP / 10 min | 5 por access token / 10 min |

Producción requiere `SUPABASE_SECRET_KEY` o `SUPABASE_SERVICE_ROLE_KEY` para consultar el limiter. Si el limiter no está disponible, las rutas bloquean la operación con `503`; fuera de producción se permite continuar con una advertencia controlada para facilitar el desarrollo local.

El proxy/hosting debe sobrescribir `CF-Connecting-IP` o `X-Forwarded-For`. La aplicación no debe desplegarse confiando en esos headers si el origen puede recibirlos directamente desde clientes externos.

Las rutas `login`, `signup`, `logout`, `refresh` y `oauth-session` validan explícitamente `Origin` y `Referer` antes de leer cookies, consultar Supabase o modificar la sesión. Solo se acepta el origen exacto devuelto por `PROGY_APP_URL`; si faltan ambos headers, son `null`, están malformados o no coinciden, la ruta responde `403` y no ejecuta la operación. Esta comprobación server-side complementa, pero no sustituye, las cookies `SameSite=Lax`.

Antes de campañas o adquisición amplia de usuarios, el reverse proxy/hosting debe aplicar una segunda capa de rate limiting a rutas públicas y autenticación. Las rutas autenticadas siguen necesitando límites de producto por negocio.

## Headers

Next.js aplica globalmente:

- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `X-Frame-Options: SAMEORIGIN`;
- `Permissions-Policy` restringiendo cámara/geolocalización y permitiendo micrófono solo al propio sitio;
- HSTS para producción HTTPS.

## Logs

Se pueden registrar nombres de operación, códigos HTTP y mensajes técnicos limitados. No imprimir:

- access/refresh tokens;
- claves API;
- app secret;
- cuerpos completos que puedan contener datos sensibles cuando no sean necesarios.

## Feature flags

Un canal externo pendiente de aprobación debe permanecer apagado. WhatsApp usa `NEXT_PUBLIC_WHATSAPP_ENABLED=false` hasta que la revisión y la prueba end-to-end estén completas.

Esto evita exponer un flujo incompleto al usuario y permite desplegar el núcleo de Progy independientemente.

## Checklist antes de clientes reales

- rotar cualquier secreto que haya aparecido en una captura/historial;
- confirmar `.env.local` ignorado por Git;
- completar `SUPABASE_SECURITY_CHECKLIST.md` con dos usuarios distintos;
- dominio HTTPS estable;
- callbacks OAuth restringidos al dominio real;
- probar archivos y entradas maliciosas/ambiguas;
- verificar rutas legales y eliminación de datos;
- configurar rate limiting del hosting;
- ejecutar `pnpm run test` y smoke test de `DEPLOYMENT.md`;
- mantener WhatsApp deshabilitado hasta completar su revisión externa.
