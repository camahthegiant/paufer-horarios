# Paufer — Backend

API REST construida con FastAPI (Python).

## Tecnologías

| Herramienta | Para qué sirve |
|---|---|
| **FastAPI** | Framework web. Define los endpoints de la API. |
| **SQLAlchemy 2.0** | ORM: convierte clases Python en tablas de PostgreSQL. |
| **Alembic** | Migraciones: actualiza la estructura de la BD sin perder datos. |
| **Pydantic** | Valida los datos que entran y salen de la API. |
| **OR-Tools** | Solver de Google para generar horarios (optimización con restricciones). |
| **google-api-python-client** | Integración con Google Calendar API. |

## Estructura

```
app/
├── main.py       Punto de entrada. Registra routers y middlewares.
├── config.py     Lee variables de entorno (.env).
├── database.py   Crea la conexión con PostgreSQL.
├── models/       Define las tablas de la BD (una clase = una tabla).
├── schemas/      Define qué datos acepta/devuelve la API (validación).
├── routers/      Los endpoints: /api/v1/profesores, /api/v1/horarios...
├── services/     Lógica de negocio (ej: publicar horario en Google Calendar).
└── solver/       Algoritmo de generación automática de horarios.
```

## Ejecutar en local (con Docker)

```bash
# Desde la raíz del repo:
docker compose -f docker-compose.dev.yml up backend
```

La API queda disponible en `http://localhost:8000`.  
Documentación interactiva: `http://localhost:8000/docs`

## Ejecutar en local (sin Docker, para desarrollo activo)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # En Windows: .venv\Scripts\activate
pip install -e ".[dev]"

# Necesitas PostgreSQL corriendo. Puedes levantar solo la BD con Docker:
docker compose -f ../docker-compose.dev.yml up db -d

cp ../.env.example .env  # y rellena DATABASE_URL
uvicorn app.main:app --reload
```

## Migraciones

```bash
# Generar migración tras modificar un modelo:
alembic revision --autogenerate -m "descripcion"

# Aplicar migraciones pendientes:
alembic upgrade head

# Ver historial:
alembic history
```

## Endpoints disponibles

| Método | URL | Descripción |
|---|---|---|
| GET | `/health` | Comprueba que el servidor está vivo |

(Más endpoints se añadirán en próximas iteraciones)
