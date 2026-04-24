from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "chat_db"
    port: int = 8000
    encryption_key: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
