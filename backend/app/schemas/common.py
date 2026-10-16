"""Schemas reutilizados en toda la API."""

from pydantic import BaseModel
from typing import Generic, TypeVar

T = TypeVar("T")


class Paginacion(BaseModel, Generic[T]):
    """Respuesta paginada estándar."""
    total: int
    pagina: int
    por_pagina: int
    items: list[T]
