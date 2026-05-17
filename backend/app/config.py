from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str
    google_client_id: str
    google_client_secret: str
    session_secret_key: str

    frontend_url: str = "http://localhost:5173"
    upload_dir: str = "uploads"
    max_upload_bytes: int = 5 * 1024 * 1024


settings = Settings()
