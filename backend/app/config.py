from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """앱 전역 설정. 환경변수 또는 .env 파일에서 로드."""

    # Azure OpenAI
    azure_openai_api_key: str = ""
    azure_openai_endpoint: str = ""
    azure_openai_deployment: str = "gpt-4"
    azure_openai_api_version: str = "2024-02-15-preview"
    azure_openai_embedding_deployment: str = "text-embedding-ada-002"

    # Database
    database_url: str = "sqlite+aiosqlite:///./sap_ops_bot.db"

    # ChromaDB
    chroma_persist_dir: str = "./chroma_data"

    # App
    app_env: str = "development"
    app_debug: bool = True
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    api_v1_prefix: str = "/api/v1"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173"]

    # JWT 인증
    jwt_secret_key: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    auth_enabled: bool = False  # 개발 환경에서는 비활성화 가능

    # 초기 관리자 계정 (최초 시작 시 자동 생성)
    admin_username: str = "admin"
    admin_password: str = "admin"

    # Copilot Studio
    copilot_connector_secret: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
