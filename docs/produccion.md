# Producción

Cómo está desplegado Paufer. Esta copia pública no incluye datos de centros ni usuarios reales, ni las credenciales ni la IP del servidor.

## Infraestructura

| Qué | Dónde |
|---|---|
| App | https://app.paufer.es |
| API | https://api.paufer.es |
| VPS | Hetzner CX22 (2 vCPU, 4 GB RAM) |
| PaaS | Coolify, con Traefik v3 y Let's Encrypt |

## Pipeline (en el repositorio de trabajo)

```
push a main ─► backend + frontend (tests) ─► images (build + push a GHCR) ─► deploy ─► Coolify: pull + up
```

1. Push a `main`: Actions corre `backend` (pytest con PostgreSQL efímero) y `frontend` (tsc + build). Es lo que conserva esta copia en `.github/workflows/ci.yml`.
2. Si pasan, el job `images` construye `backend` y `frontend` (matriz, en paralelo) y los publica en GitHub Container Registry con dos tags: `sha-<commit corto>` (inmutable) y `latest`.
3. Si ambas imágenes se publican, `deploy` llama al webhook de Coolify con un token de permiso solo `deploy` (secrets del environment `production`).
4. Coolify **descarga** las imágenes (`pull_policy: always`) y recrea los contenedores; no construye nada en el servidor.
5. El backend corre `alembic upgrade head` antes de `uvicorn`.

Coolify tiene el *Auto Deploy* desactivado: solo despliega el pipeline y solo si pasan los tests. Si un job falla, `deploy` no se ejecuta y producción sigue como estaba.

**Rollback:** las imágenes antiguas siguen en GHCR con su tag `sha-…`; fijando `IMAGE_TAG=sha-<commit>` en Coolify y redesplegando se vuelve a esa versión. Cambia las imágenes, no la base de datos: una migración ya aplicada no se deshace.

## Desplegar esta copia por tu cuenta

`docker-compose.prod.yml` construye las imágenes desde el código (`build:`), sin registro. Define las variables de entorno (ver `.env.production.example`), cambia los dominios de las etiquetas de Traefik y levanta con `docker compose -f docker-compose.prod.yml up -d --build`.

## Variables de entorno en producción

```
POSTGRES_USER=paufer
POSTGRES_PASSWORD=<secret>
POSTGRES_DB=paufer
DATABASE_URL=postgresql://paufer:<secret>@db:5432/paufer
SECRET_KEY=<secret>
BOOTSTRAP_SECRET=<secret>
ENVIRONMENT=production
NEXTAUTH_SECRET=<secret>
NEXTAUTH_URL=https://app.example.com
```

## Operaciones comunes

```bash
# Logs del backend
docker logs <contenedor_backend> --tail 50 -f

# Acceder a la BD
docker exec -it <contenedor_db> psql -U paufer -d paufer
```

## ITACA 3 (pendiente)

ITACA 3 es el sistema oficial de la Conselleria d'Educació (Comunitat Valenciana). La integración permitiría importar profesores/grupos/aulas/asignaturas desde su XML y exportar el horario generado. Está pendiente de contar con un XML de muestra real.
