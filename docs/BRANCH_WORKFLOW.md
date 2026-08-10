# Flujo de ramas

- `main`: versión estable/aprobada. No se desarrolla directamente aquí.
- `agent/progy-platform-v1`: evolución actual de la plataforma.

El desarrollo se revisa mediante Pull Request antes de llegar a `main`.

## Actualizar tu copia local para revisar la rama

```bash
git fetch origin
git switch agent/progy-platform-v1
git pull
```

Para volver a la versión estable:

```bash
git switch main
git pull
```

No copies `.env.local` al repositorio. El mismo archivo local puede utilizarse al cambiar de rama porque está ignorado por Git.
