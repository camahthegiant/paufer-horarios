# Desarrollo local

## Requisitos

- Docker Desktop instalado y corriendo
- Git

No necesitas instalar Python, Node.js ni PostgreSQL — Docker lo gestiona todo.

## Puesta en marcha

```bash
git clone https://github.com/camahthegiant/paufer-horarios.git
cd paufer-horarios
cp .env.example .env
docker compose -f docker-compose.dev.yml up
```

Servicios disponibles:
- **Frontend**: http://localhost:3000
- **Backend API + Swagger**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432

Para parar: `Ctrl+C` → `docker compose -f docker-compose.dev.yml down`

> **Atención**: `down -v` destruye el volumen `postgres_data` y borra todos los datos. Tendrás que hacer bootstrap y seed de nuevo.

## Bootstrap inicial (primera vez)

La BD arranca vacía. Crear el SUPERADMIN:

```bash
curl -X POST http://localhost:8000/api/v1/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "bootstrap_secret": "<BOOTSTRAP_SECRET del .env>",
    "email": "admin@example.com",
    "password": "<password>",
    "nombre": "Admin",
    "apellidos": "Admin"
  }'
```

Luego crear un centro y un coordinador via `/api/v1/centros/` y `/api/v1/auth/register`, o cargar datos de demostración (un centro inventado con grupos y periodos) desde `backend/`:

```bash
DATABASE_URL=postgresql://paufer:localdev123@localhost:5432/paufer python scripts/seed_demo.py
```

## Variables de entorno (`.env`)

Copia `.env.example` a `.env`:

| Variable | Qué es | Ejemplo |
|---|---|---|
| `POSTGRES_USER` | Usuario BD | `paufer` |
| `POSTGRES_PASSWORD` | Contraseña BD | `localdev123` |
| `POSTGRES_DB` | Nombre BD | `paufer` |
| `DATABASE_URL` | URL completa | `postgresql://paufer:localdev123@db:5432/paufer` |
| `SECRET_KEY` | Firma JWT | `openssl rand -hex 32` |
| `BOOTSTRAP_SECRET` | Crea SUPERADMIN | cualquier string secreto |
| `NEXT_PUBLIC_API_URL` | URL del backend desde el browser | `http://localhost:8000` |
| `NEXTAUTH_SECRET` | Sesiones Next.js | `openssl rand -hex 32` |
| `NEXTAUTH_URL` | URL base del frontend | `http://localhost:3000` |

Google Calendar vars opcionales — dejar vacías en desarrollo.

## Migraciones (Alembic)

Al modificar un modelo SQLAlchemy:

```bash
# Dentro del contenedor backend:
docker exec -it <backend_container> bash
alembic revision --autogenerate -m "descripción del cambio"
alembic upgrade head
```

En desarrollo Docker aplica las migraciones automáticamente al arrancar.

## Estructura del proyecto

```
paufer/
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   │   ├── (app)/[centro]/   # Rutas protegidas por centro
│   │   │   └── login/
│   │   ├── components/    # UI components
│   │   ├── lib/api.ts     # Cliente HTTP tipado
│   │   └── i18n/          # Configuración next-intl
│   └── messages/          # Traducciones ES + CA
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI app + CORS
│   │   ├── config.py      # Settings (env vars)
│   │   ├── auth.py        # JWT + bcrypt + dependencies
│   │   ├── deps.py        # get_centro dependency
│   │   ├── models/        # SQLAlchemy ORM
│   │   ├── schemas/       # Pydantic v2
│   │   └── routers/       # Endpoints REST
│   └── alembic/           # Migraciones
├── docs/
├── docker-compose.dev.yml
├── docker-compose.prod.yml
└── .env.example
```

## Convención de commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     nueva funcionalidad
fix:      corrección de bug
chore:    mantenimiento (deps, config)
docs:     solo documentación
refactor: sin cambio de funcionalidad
```
