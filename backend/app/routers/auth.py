from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuario import Usuario, RolUsuario
from app.models.centro import Centro
from app.auth import hash_password, verify_password, create_access_token, get_current_user, require_superadmin
from app.config import settings
from app.ratelimit import limiter
from app.schemas.auth import LoginRequest, RegisterRequest, BootstrapRequest, TokenResponse, UsuarioOut

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _usuario_out(user: Usuario) -> dict:
    """Serializa un Usuario al shape de UsuarioOut (ids como str, slug del centro).

    Necesario porque UsuarioOut tipa id/centro_id como `str` y el ORM entrega
    UUID: devolver el objeto ORM directamente provoca ResponseValidationError.
    """
    return {
        "id": str(user.id),
        "email": user.email,
        "nombre": user.nombre,
        "apellidos": user.apellidos,
        "rol": user.rol,
        "centro_id": str(user.centro_id) if user.centro_id else None,
        "centro_slug": user.centro.slug if user.centro else None,
    }


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, datos: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(
        Usuario.email == datos.email,
        Usuario.activo == True,
    ).first()
    if not user or not user.hashed_password or not verify_password(datos.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.post("/bootstrap", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
def bootstrap(request: Request, datos: BootstrapRequest, db: Session = Depends(get_db)):
    """Crea el primer SUPERADMIN. Solo funciona si no existe ninguno y el secret coincide."""
    if not settings.bootstrap_secret or datos.bootstrap_secret != settings.bootstrap_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Secret incorrecto")

    if db.query(Usuario).filter(Usuario.rol == RolUsuario.SUPERADMIN).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un SUPERADMIN")

    if db.query(Usuario).filter(Usuario.email == datos.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un usuario con ese email")

    user = Usuario(
        email=datos.email,
        hashed_password=hash_password(datos.password),
        nombre=datos.nombre,
        apellidos=datos.apellidos,
        rol=RolUsuario.SUPERADMIN,
        centro_id=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _usuario_out(user)


@router.post("/register", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def register(
    datos: RegisterRequest,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_superadmin),
):
    """Registra un nuevo usuario COORDINADOR en un centro. Solo SUPERADMIN."""
    centro = db.query(Centro).filter(
        Centro.slug == datos.centro_slug,
        Centro.activo == True,
    ).first()
    if not centro:
        raise HTTPException(status_code=404, detail=f"Centro '{datos.centro_slug}' no encontrado")

    if db.query(Usuario).filter(Usuario.email == datos.email).first():
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email")

    user = Usuario(
        email=datos.email,
        hashed_password=hash_password(datos.password),
        nombre=datos.nombre,
        apellidos=datos.apellidos,
        rol=RolUsuario.COORDINADOR,
        centro_id=centro.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _usuario_out(user)


@router.get("/me", response_model=UsuarioOut)
def me(current_user: Usuario = Depends(get_current_user)):
    return _usuario_out(current_user)
