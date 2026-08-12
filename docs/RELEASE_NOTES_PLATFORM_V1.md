# Progy Platform V1 — cambios de la rama de trabajo

## Producto

- panel reconstruido en módulos independientes;
- onboarding de negocio más claro;
- catálogo, conocimiento, voz, WhatsApp, pruebas, conversaciones, pedidos/reservas y consumo separados;
- mensajes para dueños de negocio sin exponer nombres de proveedores, tokens o IDs técnicos;
- diseño adaptable a escritorio y móvil.

## Asistente

- transcripción de audio y razonamiento estructurado;
- contexto del negocio reducido a la información relevante para cada consulta;
- historial corto para reducir contexto repetido;
- validación de pedidos y reservas en servidor;
- respuesta hablada con la voz guardada del negocio.

## Catálogo

- importación desde PDF, DOCX, TXT y CSV;
- vista previa antes de guardar;
- precios ambiguos obligan a revisión;
- límites de importación según plan.

## Coste y planes

- límites centrales de capacidades por plan;
- una prueba hablada en plan trial controlada en servidor;
- duración máxima por prueba;
- medición de tokens/caracteres/importaciones en `usage_ledger` cuando la tabla está disponible;
- campos opcionales de entorno para estimaciones internas de coste.

## Calidad

- `lint`, `typecheck`, build y pruebas en GitHub Actions;
- scripts de build compatibles con el checkout Linux de Actions y con el flujo local existente;
- mapa de arquitectura y checklist funcional en `docs/`.

## Dependencias externas pendientes

- WhatsApp Embedded Signup queda implementado, pero la activación para clientes externos continúa dependiendo de la habilitación/revisión de Meta;
- el procesador de cobros recurrentes no está elegido: la arquitectura de planes está preparada, pero no se simula un cobro inexistente;
- la prueba end-to-end con OpenAI/ElevenLabs/Supabase requiere secretos reales y se realiza en un entorno de ejecución, no dentro del repositorio.
