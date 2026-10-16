from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.config import settings
from app.ratelimit import limiter
from app.routers import salud, centros, profesores, asignaturas, aulas, grupos, periodos, auth, profesor_asignatura, horarios, restricciones, sustituciones


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Impide que el navegador infiera el tipo MIME del contenido
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Bloquea que la API se cargue dentro de un <iframe>
        response.headers["X-Frame-Options"] = "DENY"
        # Fuerza HTTPS durante 1 año en producción
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        # No enviar el origen completo en el Referer al navegar cross-origin
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Deshabilita el auditor XSS roto de IE/Chrome antiguo
        response.headers["X-XSS-Protection"] = "0"
        # API solo devuelve JSON: no hay scripts, imágenes ni recursos que cargar
        response.headers["Content-Security-Policy"] = "default-src 'none'"
        # Deniega acceso a cámara, micrófono y geolocalización
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


app = FastAPI(
    title="Paufer API",
    description="Gestión de horarios para centros educativos",
    version="0.1.0",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# SecurityHeaders va antes que CORS en la pila: procesa la respuesta después de CORS,
# así los headers de seguridad no sobreescriben los Access-Control-* que añade CORS.
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Centro-Slug", "Authorization"],
)

app.include_router(salud.router)
app.include_router(auth.router)
app.include_router(centros.router)
app.include_router(profesores.router)
app.include_router(asignaturas.router)
app.include_router(aulas.router)
app.include_router(grupos.router)
app.include_router(periodos.router)
app.include_router(profesor_asignatura.router)
app.include_router(horarios.router)
app.include_router(restricciones.router)
app.include_router(sustituciones.router)
