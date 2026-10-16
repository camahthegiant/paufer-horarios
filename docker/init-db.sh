#!/bin/bash
# Crea el rol paufer_app (no superuser) que la app usa en runtime.
# Alembic sigue usando POSTGRES_USER (superuser) para DDL.
# Los default privileges aseguran que paufer_app tenga acceso a todas
# las tablas que Alembic cree en el futuro.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE ROLE paufer_app WITH LOGIN PASSWORD '${POSTGRES_APP_PASSWORD}';
    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO paufer_app;
    GRANT USAGE ON SCHEMA public TO paufer_app;

    -- Para tablas que ya existan al ejecutar el script
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO paufer_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO paufer_app;

    -- Para tablas que Alembic cree en el futuro (el owner es POSTGRES_USER)
    ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO paufer_app;
    ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA public
        GRANT USAGE, SELECT ON SEQUENCES TO paufer_app;
EOSQL
