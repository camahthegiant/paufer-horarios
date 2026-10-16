"""Rate limiting compartido (slowapi).

Módulo propio para que `main.py` y los routers puedan importar el mismo
`limiter` sin ciclo de imports (main importa los routers).
"""
from slowapi import Limiter
from starlette.requests import Request

from app.config import settings


def _client_key(request: Request) -> str:
    """Identifica al cliente para el rate limit.

    En producción la app corre tras Traefik/Coolify, así que `request.client`
    es la IP del proxy (todos colapsarían a una sola IP). Preferimos la primera
    IP de `X-Forwarded-For`. En desarrollo (sin proxy) esa cabecera no existe y
    caemos a la IP directa. No confiamos en XFF en dev porque el cliente puede
    falsificarla, pero ahí el rate limit no es una defensa crítica.
    """
    if not settings.is_development:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "anonymous"


limiter = Limiter(key_func=_client_key)
