"""
Dependencias de FastAPI inyectadas en los endpoints.

El centro se identifica por el header X-Centro-Slug, pero el acceso exige
un usuario autenticado que pertenezca a ese centro (o sea SUPERADMIN).
get_centro es la puerta común de todos los routers de datos: al depender
de get_current_user, ningún endpoint que la use es accesible sin token.
"""

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.centro import Centro
from app.models.usuario import Usuario, RolUsuario
from app.auth import get_current_user


def get_centro(
    x_centro_slug: str = Header(..., description="Slug del centro educativo"),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Centro:
    centro = db.query(Centro).filter(Centro.slug == x_centro_slug, Centro.activo == True).first()
    if not centro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro '{x_centro_slug}' no encontrado o inactivo",
        )
    # El usuario debe pertenecer a este centro (SUPERADMIN accede a todos).
    if current_user.rol != RolUsuario.SUPERADMIN and current_user.centro_id != centro.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este centro",
        )
    # Activa el contexto RLS para esta conexión.
    # Todas las queries posteriores en esta petición solo verán filas de este centro.
    db.execute(text("SET app.centro_id = :cid"), {"cid": str(centro.id)})
    return centro
