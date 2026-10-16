from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # URL superuser — usada por Alembic para DDL (CREATE TABLE, ALTER TABLE…)
    database_url: str
    # URL rol no-superuser — usada por la app en runtime para que RLS tenga efecto.
    # Si no está definida, la app usa database_url (RLS queda inactivo, solo dev).
    app_database_url: str = ""

    # Orígenes CORS permitidos, separados por coma.
    # Ej: "http://localhost:3000,https://app.paufer.es"
    cors_origins: str = "http://localhost:3000"

    secret_key: str
    environment: str = "development"

    google_service_account_email: str = ""
    google_service_account_key_json: str = ""
    bootstrap_secret: str = ""

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    @property
    def effective_database_url(self) -> str:
        if not self.is_development and not self.app_database_url:
            raise RuntimeError(
                "APP_DATABASE_URL es obligatoria fuera de desarrollo: sin ella la "
                "app correría como superuser y RLS quedaría desactivado."
            )
        return self.app_database_url or self.database_url

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
