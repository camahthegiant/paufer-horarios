# Paufer

> **Copia pública del proyecto.** Es una foto del código de una aplicación en producción; el repositorio de trabajo es privado y avanza por su cuenta, así que esta copia puede quedarse atrás. Se omite el historial de commits, los datos de los centros y los usuarios reales; el pipeline de despliegue (imágenes + Coolify) vive en el repo privado y aquí queda solo la validación. Dominios y credenciales son de ejemplo o públicos.

Proyecto personal, construido con Claude Code como asistente.

Gestión de horarios para centros educativos K-12. SaaS multi-tenant con módulo de sustituciones y soporte para integración con ITACA 3 (Conselleria d'Educació, Comunitat Valenciana).

## Producción

- **App:** https://app.paufer.es
- **API:** https://api.paufer.es
- **Infraestructura:** VPS Hetzner CX22 + Coolify + Traefik + Let's Encrypt

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 + TypeScript + Tailwind CSS + next-intl (ES/CA) |
| Backend | FastAPI (Python 3.12) + SQLAlchemy + Alembic |
| Base de datos | PostgreSQL 16 |
| Auth | JWT (Bearer token) — login propio, sin OAuth |
| Deploy | Docker Compose + Coolify, orquestado por GitHub Actions |

## Desarrollo local

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up
```

- Frontend: http://localhost:3000
- Backend API + Swagger: http://localhost:8000/docs
- PostgreSQL: localhost:5432

## Deploy a producción

GitHub Actions ejecuta los tests en cada push y PR (`.github/workflows/ci.yml`). En el repo de trabajo, un push a `main` que pasa el CI construye las imágenes Docker, las publica en GitHub Container Registry y dispara el despliegue en Coolify; si algún paso falla, no se despliega. En esta copia, `docker-compose.prod.yml` construye las imágenes en local.

Ver [docs/produccion.md](docs/produccion.md).

## Módulos implementados

- **Auth**: login JWT, bootstrap SUPERADMIN, registro de coordinadores
- **Profesores**: CRUD completo con restricciones horarias
- **Asignaturas / Aulas / Grupos / Periodos**: CRUD por centro
- **Asignaciones**: qué profesor imparte qué asignatura a qué grupo
- **Horarios**: crear, asignar slots manualmente, publicar/despublicar
- **Sustituciones**: registrar ausencia → auto-rellena clases del día → asignar sustituto
- **i18n**: castellano + valenciano completo

## Pendiente

- ITACA 3 XML import/export (bloqueado: necesitamos XML de muestra)
- Solver automático OR-Tools (CP-SAT) para generación de horarios

## Estructura

```
paufer/
├── frontend/              # Next.js 15
├── backend/               # FastAPI
│   ├── app/
│   │   ├── main.py        # Punto de entrada + CORS
│   │   ├── models/        # SQLAlchemy ORM
│   │   ├── schemas/       # Pydantic (validación)
│   │   ├── routers/       # Endpoints REST
│   │   └── auth.py        # JWT + bcrypt
│   └── alembic/           # Migraciones
├── docs/                  # Documentación
├── docker-compose.dev.yml
├── docker-compose.prod.yml
└── .env.example
```

## Licencia

MIT, ver [LICENSE](LICENSE).
