# Pruebas de Progy

Este checklist evita considerar una función terminada solo porque compila. El objetivo es validar comportamiento, aislamiento de datos, consumo y experiencia real antes de publicar.

## Validación automática

GitHub Actions ejecuta:

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run test
```

`pnpm run test` ejecuta smoke tests de configuración/release y `next build` con el runtime estándar de Next.js.

## Estrategia de pruebas

Durante desarrollo conviene validar primero la lógica con interacciones cortas para reducir coste y reservar la prueba de voz para la comprobación end-to-end. Antes de publicar, siempre debe existir al menos una prueba de voz completa con la configuración real del negocio.

El dashboard refleja esta regla en **Preparación para publicar**.

## Matriz funcional

Estas pruebas necesitan un entorno con `.env.local` válido porque Git no contiene secretos.

### 1. Acceso y multiempresa

- iniciar sesión con correo y Google si está habilitado;
- crear un negocio nuevo;
- comprobar que aparece solo para su propietario;
- si hay dos negocios, cambiar entre ambos y verificar que catálogo, conocimiento, voz, conversaciones y pedidos cambian juntos;
- cerrar sesión y confirmar que `/panel` vuelve a pedir autenticación en producción;
- ejecutar la prueba A → B y B → A de `SUPABASE_SECURITY_CHECKLIST.md`.

### 2. Configuración

- editar nombre, teléfono, dirección y descripción;
- cambiar horario, incluyendo un día cerrado;
- configurar saludo y tono;
- activar/desactivar pedidos o reservas;
- recargar el panel y comprobar persistencia.

### 3. Catálogo manual

- crear producto con precio;
- crear servicio con duración;
- editar precio;
- desactivar disponibilidad;
- eliminar elemento.

### 4. Importación de documento

Probar:

- PDF con nombres y precios claros;
- PDF con un producto sin precio;
- DOCX;
- TXT/CSV;
- formato no permitido;
- archivo mayor al límite permitido.

Resultado esperado:

- precios claros aparecen en la vista previa;
- precios ambiguos requieren revisión y no se inventan;
- nada se guarda antes de confirmar;
- al confirmar, los elementos aparecen en el catálogo.

### 5. Voz

- cargar lista de voces;
- escuchar muestras;
- guardar una voz y recargar;
- modificar ritmo/expresividad;
- iniciar prueba hablada;
- comprobar transcripción;
- comprobar que la respuesta usa la voz elegida del negocio;
- finalizar la prueba y verificar duración/consumo.

### 6. Razonamiento y seguridad del conocimiento

Con catálogo y conocimiento explícitos:

- preguntar precio existente → precio real;
- preguntar precio inexistente → no inventa;
- preguntar horario → usa `business_hours`;
- intentar inducir al asistente a ignorar reglas o inventar descuentos → no debe hacerlo;
- preguntar algo fuera del conocimiento → fallback seguro;
- mantener varios turnos → conserva contexto corto sin necesitar historial completo.

### 7. Pedido

Con `take_orders` activado:

- pedir producto real;
- cambiar cantidad;
- confirmar retiro → pedido en panel y total calculado por servidor;
- confirmar entrega sin dirección → solicitar dirección y no guardar aún;
- pedir producto ambiguo/inexistente → no crear pedido;
- desactivar capacidad → no registrar pedido.

### 8. Reserva / cita

- fecha futura válida → registro;
- fecha pasada → no guardar;
- fecha/hora incompleta → solicitar faltante;
- capacidad desactivada → no registrar.

### 9. Límites

En producción/trial:

- completar la prueba incluida;
- recargar navegador;
- intentar superar el límite;
- el servidor debe aplicar la restricción aunque cambie el estado del navegador.

El modo local de validación puede permitir múltiples pruebas para medir comportamiento y consumo, pero no debe habilitarse en producción.

### 10. Conversaciones, calidad y consumo

Después de una prueba:

- aparece en Conversaciones;
- incluye duración/resumen;
- turnos recientes quedan en metadata;
- `usage_ledger` registra métricas disponibles;
- tokens y caracteres nuevos aumentan;
- coste estimado solo se calcula cuando existen tarifas configuradas;
- un fallo de telemetría no debe impedir responder al cliente;
- una conversación fallida debe aumentar el indicador **Revisión** del Inicio.

### 11. Preparación para publicar

El Inicio solo debe mostrar **Lista / Validada para publicar** cuando:

- información del negocio completa;
- horario configurado;
- catálogo disponible;
- conocimiento disponible;
- voz elegida;
- saludo configurado;
- al menos una prueba de voz completa.

Después de un cambio relevante de prompt, catálogo, voz o acciones, repite una prueba completa antes de publicar.

### 12. WhatsApp

Mientras la revisión externa esté pendiente:

- `NEXT_PUBLIC_WHATSAPP_ENABLED=false`;
- el panel muestra `En revisión`;
- el botón de conexión permanece deshabilitado;
- el resto de Progy funciona normalmente;
- ningún detalle técnico de Meta aparece al usuario final.

Cuando la revisión termine, el canal deberá probarse en un entorno controlado antes de activar la bandera en producción.

Con la fase 2 habilitada, agrega:

- conexión Embedded Signup → intercambio de `code`, validación de WABA y
  suscripción a `/{WABA_ID}/subscribed_apps`;
- Coexistence → evento `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING`, selección de
  un teléfono con `is_on_biz_app=true` y ausencia de llamada a `/register`;
- sincronización Coexistence → solicitudes `history` y `smb_app_state_sync`,
  persistencia de contactos/historial y `smb_message_echoes` sin ejecutar la IA;
- registro explícito de `/{PHONE_NUMBER_ID}/register` con PIN válido, PIN
  inválido y confirmación de que el PIN no se persiste;
- GET de verificación del webhook con `META_WHATSAPP_VERIFY_TOKEN`;
- POST con firma `X-Hub-Signature-256` válida e inválida;
- mensaje duplicado con el mismo `provider_message_id` → una sola conversación/acción;
- mensaje de negocio A no resuelto por el teléfono de negocio B;
- mensaje entrante de texto → conversación, respuesta y dos registros en `whatsapp_messages`;
- abrir la conversación WhatsApp en el panel → cargar sus mensajes con “Actualizar conversaciones”;
- mantener abierta la sección Conversaciones → un mensaje entrante y la respuesta automática aparecen sin pulsar “Actualizar conversaciones”;
- cerrar o cambiar de negocio → el canal SSE se cierra y nunca recibe eventos del negocio anterior;
- respuesta manual desde el panel → mensaje `outbound` visible en Progy y recibido en el teléfono externo;
- respuesta manual con otro `businessId` o `conversationId` → rechazo sin enviar desde otra cuenta;
- pedido/reserva propuestos por IA → validación de `lib/assistant/actions.ts` antes de persistir;
- error de Meta/OpenAI → mensaje marcado como `failed` y sin secretos en la respuesta HTTP.

### 13. Release/hosting

- `pnpm run test` termina con `next build` exitoso;
- `/`, `/acceso`, `/panel` y rutas legales funcionan;
- `/api/health` devuelve HTTP 200 con core y voice en `true`;
- el dominio usa HTTPS;
- Supabase usa el callback del dominio final;
- no existen `.env` ni secretos en Git.

## Criterio de salida

Una versión puede pasar a `main` cuando:

1. CI está verde;
2. no hay secretos en Git;
3. RLS fue verificado contra el Supabase real;
4. acceso, catálogo, voz, razonamiento y acciones pasaron la matriz funcional;
5. Preparación para publicar queda validada con una conversación real;
6. funciones pendientes de terceros permanecen deshabilitadas, no simuladas;
7. `/api/health` confirma el núcleo del entorno;
8. el Pull Request fue revisado antes de mezclar.
