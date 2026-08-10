# Pruebas de Progy

Este checklist evita considerar una función terminada solo porque compila.

## Validación automática

GitHub Actions ejecuta en cada cambio de la rama:

```bash
npm ci
npm run lint
npm run typecheck
npm test
```

`npm test` construye el Worker de producción, valida el artefacto y ejecuta las pruebas de HTML renderizado.

## Matriz de prueba funcional

Estas pruebas necesitan un entorno con `.env.local` válido porque el repositorio no contiene secretos.

### 1. Acceso y multiempresa

- iniciar sesión con correo/Google;
- crear un negocio nuevo;
- comprobar que aparece solo para su propietario;
- si hay dos negocios, cambiar entre ambos y verificar que catálogo, conocimiento, voz, conversaciones y pedidos cambian juntos;
- cerrar sesión y confirmar que `/panel` vuelve a pedir autenticación en producción.

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

Probar al menos:

- PDF con nombres y precios claros;
- PDF con un producto sin precio;
- DOCX;
- TXT/CSV;
- archivo de formato no permitido;
- archivo mayor de 12 MB.

Resultado esperado:

- los precios claros aparecen en la vista previa;
- precios ambiguos quedan sin seleccionar y marcados para revisión;
- nada se guarda antes de confirmar;
- al confirmar, los elementos aparecen en el catálogo.

### 5. Voz

- cargar la lista de voces;
- escuchar muestras;
- guardar una voz;
- recargar y comprobar que sigue seleccionada;
- modificar ritmo/expresividad;
- iniciar prueba hablada;
- confirmar que la respuesta usa la voz guardada del negocio, no una voz genérica del modelo.

### 6. Razonamiento

Con un catálogo pequeño y conocimiento explícito:

- preguntar un precio existente → responde el precio real;
- preguntar un precio inexistente → no inventa;
- preguntar horario → usa `business_hours`;
- preguntar algo fuera del conocimiento → usa fallback/transferencia;
- mantener 2–3 turnos de contexto → recuerda la conversación corta sin enviar el historial entero.

### 7. Pedido

Con `take_orders` activado:

- pedir un producto real;
- cambiar cantidad;
- confirmar retiro → pedido en panel y total calculado por servidor;
- confirmar entrega sin dirección → Progy debe pedir dirección y no guardar aún;
- pedir un producto ambiguo/inexistente → no crear pedido;
- desactivar `take_orders` → Progy no debe registrar pedidos.

### 8. Reserva / cita

- confirmar fecha futura → registro en panel;
- intentar fecha pasada → no guardar;
- dejar fecha/hora incompleta → solicitar dato faltante;
- desactivar la capacidad correspondiente → no registrar.

### 9. Límite de prueba

En plan `trial`:

- iniciar y completar una prueba;
- recargar navegador;
- intentar abrir una segunda prueba;
- el servidor debe responder `voice_trial_limit_reached`.

La prueba no puede resetearse eliminando estado del navegador.

### 10. Conversaciones y consumo

Después de una prueba:

- aparece en Conversaciones;
- incluye duración y resumen;
- los turnos recientes están en metadata;
- `usage_ledger` recibe métricas disponibles;
- un fallo al escribir telemetría no debe romper la respuesta al cliente.

### 11. WhatsApp

Mientras Meta no habilite onboarding externo:

- el panel debe explicar el estado sin mostrar tokens/IDs;
- el botón puede abrir Embedded Signup cuando las variables públicas estén configuradas;
- un bloqueo de Meta no debe afectar el resto del panel.

Cuando Meta habilite el acceso, repetir el flujo completo con una cuenta controlada antes de habilitarlo a clientes.

## Criterio de salida

Una versión puede pasar de la rama de trabajo a `main` cuando:

1. CI está verde;
2. no hay secretos en Git;
3. las pruebas funcionales críticas de acceso, voz, catálogo y acciones se ejecutaron con un entorno real;
4. cualquier función pendiente de un tercero aparece como pendiente, no como falsamente conectada;
5. el Pull Request fue revisado antes de mezclar.
