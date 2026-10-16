"""Test del fix crítico: los endpoints de datos exigen JWT + pertenencia al centro.

Antes, cualquiera con un `X-Centro-Slug` válido leía/escribía datos de cualquier
centro sin token. `get_centro` ahora depende de `get_current_user` y comprueba
que el usuario pertenece al centro (o es SUPERADMIN).
"""
from app.models.usuario import RolUsuario

ENDPOINT = "/api/v1/profesores/"


def test_sin_token_401(client, make_centro):
    make_centro("centro-a")
    r = client.get(ENDPOINT, headers={"X-Centro-Slug": "centro-a"})
    assert r.status_code == 401


def test_centro_propio_200(client, make_centro, make_usuario, auth_header):
    centro = make_centro("centro-a")
    coord = make_usuario("coord@a.dev", "secret123", RolUsuario.COORDINADOR, centro.id)
    r = client.get(ENDPOINT, headers={"X-Centro-Slug": "centro-a", **auth_header(coord)})
    assert r.status_code == 200


def test_centro_ajeno_403(client, make_centro, make_usuario, auth_header):
    centro_a = make_centro("centro-a")
    make_centro("centro-b")
    coord_a = make_usuario("coord@a.dev", "secret123", RolUsuario.COORDINADOR, centro_a.id)
    # Coordinador de A intenta acceder a los datos de B
    r = client.get(ENDPOINT, headers={"X-Centro-Slug": "centro-b", **auth_header(coord_a)})
    assert r.status_code == 403


def test_superadmin_cualquier_centro_200(client, make_centro, make_usuario, auth_header):
    make_centro("centro-b")
    admin = make_usuario("admin@example.com", "secret123", RolUsuario.SUPERADMIN)
    r = client.get(ENDPOINT, headers={"X-Centro-Slug": "centro-b", **auth_header(admin)})
    assert r.status_code == 200


def test_centro_inexistente_404(client, make_usuario, auth_header):
    admin = make_usuario("admin@example.com", "secret123", RolUsuario.SUPERADMIN)
    r = client.get(ENDPOINT, headers={"X-Centro-Slug": "no-existe", **auth_header(admin)})
    assert r.status_code == 404
