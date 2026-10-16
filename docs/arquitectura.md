# Arquitectura de Paufer

## Visión general

```
┌──────────────────────────────────────────────────────┐
│                    NAVEGADOR                         │
│          Next.js (app.paufer.es)  :3000              │
│   Lo que ve y usa el coordinador                     │
└────────────────────┬─────────────────────────────────┘
                     │ HTTPS (JSON)
                     ▼
┌──────────────────────────────────────────────────────┐
│          Traefik (proxy inverso)                     │
│   SSL termination + routing por subdominio           │
└──────────┬───────────────────────┬───────────────────┘
           │                       │
           ▼                       ▼
┌────────────────────┐   ┌─────────────────────────────┐
│  FastAPI Backend   │   │  Next.js Frontend           │
│  api.paufer.es     │   │  app.paufer.es              │
│  :8000             │   │  :3000                      │
└────────┬───────────┘   └─────────────────────────────┘
         │ SQL
         ▼
┌─────────────────────┐
│  PostgreSQL  :5432  │
└─────────────────────┘
```

## Infraestructura de producción

- **VPS**: Hetzner CX22 (2 vCPU, 4 GB RAM, 40 GB SSD) — 4.49€/mes
- **OS**: Ubuntu 24.04
- **PaaS**: Coolify 4.x (self-hosted, ejecuta el despliegue; el CI lo orquesta GitHub Actions)
- **Proxy**: Traefik v3 (SSL automático via Let's Encrypt)
- **DNS**: registros A para `app` y `api` apuntando al VPS
- **Dominios**: app.paufer.es (frontend), api.paufer.es (backend)

En el repositorio de trabajo, push a `main` → GitHub Actions (tests backend + tipos/build frontend) → build de las imágenes Docker y publicación en GHCR → job `deploy` llama al webhook de Coolify → Coolify descarga las imágenes y hace `docker compose up` → Traefik redirige tráfico. Esta copia pública conserva solo la parte de validación. Detalle en [produccion.md](produccion.md).

## Las tres partes

### Frontend (Next.js 15)
- Interfaz web del coordinador.
- **next-intl v4**: i18n ES + CA, locale por cookie.
- **Auth**: JWT en `localStorage` (`paufer_token`). Todas las llamadas llevan `Authorization: Bearer <token>`.
- En producción se compila como `standalone` (imagen Docker mínima).
- Corre en puerto `3000`.

### Backend (FastAPI)
- Toda la lógica de negocio.
- **Multi-tenancy**: cada request lleva header `X-Centro-Slug` que identifica el centro.
- **Auth**: JWT firmado con `SECRET_KEY`. Roles: `SUPERADMIN` > `ADMIN` > `COORDINADOR` > `PROFESOR`.
- Docs interactivas en `/docs` (solo en desarrollo).
- Al arrancar en producción: `alembic upgrade head` → actualiza BD → `uvicorn`.
- Corre en puerto `8000`.

### Base de datos (PostgreSQL 16)
- Volumen persistente `postgres_data` (gestionado por Docker).
- Solo el backend habla con la BD.

## Multi-tenancy

Cada entidad (profesor, aula, grupo, etc.) tiene `centro_id` (FK a `centros`). El `get_centro` dependency de FastAPI extrae el centro del header `X-Centro-Slug` y lo inyecta en todos los endpoints — ningún endpoint puede acceder a datos de otro centro.

**Roles de usuario:**
- `SUPERADMIN`: gestiona centros, registra coordinadores. No pertenece a ningún centro.
- `COORDINADOR`: gestiona horarios de su centro. (El rol de quien lleva los horarios de un centro.)
- `PROFESOR`: solo ve su horario (pendiente de implementar).

## Flujo de sustituciones

```
Coordinador registra ausencia (profesor + fecha)
        │
        ▼
Backend busca horario PUBLICADO del día
        │
        ├─ Si existe → crea una Sustitucion por cada AsignacionHoraria del profesor ausente
        └─ Si no → crea una Sustitucion por cada periodo lectivo del día
        │
        ▼
Coordinador asigna sustituto por slot (o marca SIN_CUBRIR)
```

## Flujo de horarios

```
Coordinador crea ProfesorAsignatura (quién da qué a quién, cuántas horas)
        │
        ▼
Crea Horario (vinculado a CursoEscolar)
        │
        ▼
Asigna slots manualmente (día, periodo, profesor, asignatura, grupo, aula)
        │
        ▼
Publica el horario (estado PUBLICADO)
        │
        ▼
Las sustituciones del día usan este horario publicado
```

El solver automático (OR-Tools CP-SAT) está pendiente de implementación — actualmente la asignación es manual.
