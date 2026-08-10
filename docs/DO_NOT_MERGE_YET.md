# Revisión requerida antes de mezclar

Esta rama mantiene `main` intacto y debe permanecer en revisión hasta completar las pruebas funcionales con las credenciales reales del entorno.

Aunque el CI compruebe compilación, lint, tipos y build, las pruebas de proveedores externos requieren `.env.local`/secretos que deliberadamente no existen en GitHub.

Usa `TESTING.md` antes de aprobar el Pull Request.
