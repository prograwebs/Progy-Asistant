# Seguridad de Progy

## Secretos

Los secretos se cargan solo desde variables de entorno del servidor. Nunca deben aparecer en componentes React, respuestas públicas, capturas, commits o variables `NEXT_PUBLIC_*`.

Secretos típicos:

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `META_APP_SECRET`
- cualquier clave privada futura del procesador de pagos

Los IDs públicos de aplicaciones/configuraciones pueden ser públicos cuando el proveedor lo requiere, pero una clave secreta nunca debe recibir prefijo `NEXT_PUBLIC_`.

## Autorización multiempresa

Las rutas que ejecutan acciones deben trabajar con la sesión del usuario. La base de datos debe mantener RLS como última barrera para impedir que una persona consulte o modifique un negocio ajeno.

Las rutas nuevas de prueba validan explícitamente la pertenencia del negocio antes de abrir/cerrar sesiones. Las rutas de datos existentes utilizan el token Supabase de la sesión y deben conservar filtros por `business_id`.

## IA y acciones

La salida del modelo no se considera una fuente de verdad para operaciones comerciales.

- precios: se resuelven de nuevo desde el catálogo;
- totales: se calculan en servidor;
- productos ambiguos: no se registran;
- reservas: requieren fecha futura y capacidad habilitada;
- pedidos/reservas: requieren que la función correspondiente esté activada.

## Archivos

La importación de catálogo limita tamaño y formatos. Los datos extraídos son una vista previa y no se guardan hasta la confirmación del usuario.

## Consumo

Los límites de pruebas se aplican en servidor. Ocultar/deshabilitar un botón en el navegador no es el mecanismo de control.

## Logs

Los logs del servidor pueden contener códigos de error del proveedor, pero no deben imprimir access tokens, app secrets ni claves API.

## Checklist antes de producción

- rotar cualquier secreto que haya aparecido en una captura o historial;
- confirmar que `.env.local` sigue ignorado por Git;
- revisar políticas RLS de todas las tablas multiempresa;
- configurar dominio estable HTTPS;
- restringir callbacks OAuth al dominio real;
- habilitar rate limiting / protección de abuso en endpoints públicos antes de campañas amplias;
- validar flujos de eliminación/privacidad;
- revisar los permisos finales de Meta antes de habilitar WhatsApp para clientes.
