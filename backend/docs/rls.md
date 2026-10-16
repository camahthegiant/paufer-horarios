# Row Level Security (RLS) en Paufer

## El problema que resuelve

Paufer es multi-tenant: un solo backend sirve a varios colegios. Sin RLS, si un endpoint
olvida filtrar por `centro_id`, podría devolver datos de otro colegio. Con RLS, PostgreSQL
filtra automáticamente a nivel de base de datos, aunque el código de la aplicación falle.

## Arquitectura

```
Petición HTTP  →  X-Centro-Slug: centro-ejemplo
                         ↓
               get_centro() resuelve centro.id
                         ↓
       SET app.centro_id = '<uuid>'  (en la conexión PostgreSQL)
                         ↓
   Cualquier query sobre tablas con RLS → PostgreSQL aplica política automáticamente
                         ↓
   Al cerrar la sesión: SET app.centro_id = ''  (limpia la conexión para el pool)
```

## Cómo funciona la política

Cada tabla protegida tiene una política PostgreSQL:

```sql
-- Tablas con centro_id directo (ej: profesores)
CREATE POLICY tenant_isolation ON profesores
    FOR ALL
    USING (centro_id = NULLIF(current_setting('app.centro_id', true), '')::uuid)
    WITH CHECK (centro_id = NULLIF(current_setting('app.centro_id', true), '')::uuid);

-- Tablas sin centro_id directo (ej: profesor_asignatura → grupos → centro_id)
CREATE POLICY tenant_isolation ON profesor_asignatura
    FOR ALL
    USING (grupo_id IN (
        SELECT id FROM grupos
        WHERE centro_id = NULLIF(current_setting('app.centro_id', true), '')::uuid
    ));
```

`NULLIF(..., '')` convierte el string vacío (estado de limpieza del pool) en NULL.
`current_setting('app.centro_id', true)` devuelve NULL si la variable no está seteada.
`NULL::uuid` = NULL → `centro_id = NULL` es NULL (falsy) → ninguna fila devuelta.

Comportamiento por estado de `app.centro_id`:

| Estado | Resultado de la política |
|--------|--------------------------|
| No seteada (conexión nueva) | NULL → todas las filas ocultas |
| `''` (limpieza de pool) | NULL (via NULLIF) → todas las filas ocultas |
| UUID válido | Solo filas de ese centro |

## Tablas protegidas

| Tabla | Tipo de política |
|-------|-----------------|
| `profesores` | `centro_id` directo |
| `asignaturas` | `centro_id` directo |
| `aulas` | `centro_id` directo |
| `grupos` | `centro_id` directo |
| `periodos` | `centro_id` directo |
| `cursos_escolares` | `centro_id` directo |
| `profesor_asignatura` | vía `grupos.centro_id` |
| `restricciones_profesor` | vía `profesores.centro_id` |
| `horarios` | vía `cursos_escolares.centro_id` |
| `asignaciones_horarias` | vía `horarios → cursos_escolares.centro_id` |

## Tablas sin RLS (intencionado)

| Tabla | Por qué |
|-------|---------|
| `centros` | Se consulta ANTES de conocer el `centro_id` (en `get_centro()`) |
| `usuarios` | Se consulta en el flujo de auth, antes de establecer contexto de tenant |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `alembic/versions/d1e2f3a4b5c6_enable_rls.py` | Migración: activa RLS y crea políticas |
| `app/database.py` | `get_db()` limpia `app.centro_id` al cerrar la sesión |
| `app/deps.py` | `get_centro()` setea `app.centro_id` tras resolver el centro |

## Dos URLs de base de datos

PostgreSQL superusers siempre bypasean RLS. El usuario `paufer` (creado por Docker como
superuser) se usa para Alembic (DDL). La app usa `paufer_app` (no superuser), que sí
respeta las políticas RLS.

| Variable | Usuario | Para qué |
|----------|---------|----------|
| `DATABASE_URL` | `paufer` (superuser) | Alembic — `alembic upgrade head` |
| `APP_DATABASE_URL` | `paufer_app` (no superuser) | App runtime — FastAPI + SQLAlchemy |

`config.py` expone `settings.effective_database_url` que devuelve `APP_DATABASE_URL`
si está definido, o `DATABASE_URL` como fallback (dev sin RLS).

## Creación del rol paufer_app

El script `docker/init-db.sh` se monta en `/docker-entrypoint-initdb.d/` y PostgreSQL lo
ejecuta automáticamente al inicializar el volumen (solo en un contenedor nuevo o tras
`docker compose down -v`).

El script:
1. Crea el rol `paufer_app` con la contraseña de `POSTGRES_APP_PASSWORD`
2. Concede CONNECT + USAGE
3. Activa `ALTER DEFAULT PRIVILEGES` para que las tablas que cree Alembic en el futuro
   sean accesibles automáticamente por `paufer_app`

En producción (Coolify/Hetzner), si la BD ya existe y el script no corrió, ejecutar
manualmente en psql:

```sql
CREATE ROLE paufer_app WITH LOGIN PASSWORD 'contraseña-segura';
GRANT CONNECT ON DATABASE paufer TO paufer_app;
GRANT USAGE ON SCHEMA public TO paufer_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO paufer_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO paufer_app;
ALTER DEFAULT PRIVILEGES FOR ROLE paufer IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO paufer_app;
ALTER DEFAULT PRIVILEGES FOR ROLE paufer IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO paufer_app;
```

## Testear que RLS funciona

```bash
# Sin contexto → 0 filas (RLS activo)
psql -U paufer_app -d paufer -c "SELECT count(*) FROM profesores;"

# Con contexto → filas del centro
psql -U paufer_app -d paufer \
  -c "SET app.centro_id = '<uuid-del-centro>'; SELECT count(*) FROM profesores;"

# Como superuser → bypasea RLS (Alembic usa este usuario)
psql -U paufer -d paufer -c "SELECT count(*) FROM profesores;"
```
