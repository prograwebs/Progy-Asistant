# Revisión local de Platform V1

Esta guía sirve para probar la rama sin alterar `main`.

```bash
git fetch origin
git switch agent/progy-platform-v1
git pull
```

Mantén tu `.env.local` local. Después inicia Progy con el mismo script de Windows del proyecto.

Orden de revisión recomendado:

1. iniciar sesión;
2. revisar Inicio y Mi negocio;
3. agregar catálogo/conocimiento;
4. elegir una voz;
5. probar Catálogo → Importar documento;
6. probar Pruebas → voz;
7. comprobar Conversaciones;
8. realizar un pedido/reserva de prueba y revisar su apartado;
9. revisar Consumo y plan;
10. dejar WhatsApp sin forzar si Meta todavía bloquea onboarding externo.

Para volver a la versión estable:

```bash
git switch main
git pull
```
