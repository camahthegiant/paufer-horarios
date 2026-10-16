from pydantic import BaseModel, EmailStr
from app.models.usuario import RolUsuario


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    nombre: str
    apellidos: str
    centro_slug: str


class BootstrapRequest(BaseModel):
    bootstrap_secret: str
    email: EmailStr
    password: str
    nombre: str
    apellidos: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    email: str
    nombre: str
    apellidos: str
    rol: RolUsuario
    centro_id: str | None = None
    centro_slug: str | None = None
