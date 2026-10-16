"""Tests de autenticación: login, bootstrap y registro protegido."""
from app.models.usuario import RolUsuario


def test_login_ok(client, make_usuario):
    make_usuario("admin@example.com", "secret123", RolUsuario.SUPERADMIN)
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "secret123"},
    )
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_login_bad_password(client, make_usuario):
    make_usuario("admin@example.com", "secret123", RolUsuario.SUPERADMIN)
    r = client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "malo"})
    assert r.status_code == 401


def test_login_unknown_email(client):
    r = client.post("/api/v1/auth/login", json={"email": "nadie@example.com", "password": "x"})
    assert r.status_code == 401


def test_bootstrap_crea_superadmin(client):
    r = client.post("/api/v1/auth/bootstrap", json={
        "email": "root@example.com", "password": "secret123",
        "nombre": "Root", "apellidos": "Admin",
        "bootstrap_secret": "test-bootstrap-secret",
    })
    assert r.status_code == 201


def test_bootstrap_secret_incorrecto(client):
    r = client.post("/api/v1/auth/bootstrap", json={
        "email": "root@example.com", "password": "secret123",
        "nombre": "Root", "apellidos": "Admin",
        "bootstrap_secret": "secret-equivocado",
    })
    assert r.status_code == 403


def test_bootstrap_rechaza_segundo_superadmin(client, make_usuario):
    make_usuario("ya@example.com", "secret123", RolUsuario.SUPERADMIN)
    r = client.post("/api/v1/auth/bootstrap", json={
        "email": "root@example.com", "password": "secret123",
        "nombre": "Root", "apellidos": "Admin",
        "bootstrap_secret": "test-bootstrap-secret",
    })
    assert r.status_code == 409


def test_register_sin_token_401(client, make_centro):
    make_centro("centro-a")
    r = client.post("/api/v1/auth/register", json={
        "email": "coord@example.com", "password": "secret123",
        "nombre": "Coord", "apellidos": "Uno", "centro_slug": "centro-a",
    })
    assert r.status_code == 401


def test_register_coordinador_prohibido_403(client, make_centro, make_usuario, auth_header):
    centro = make_centro("centro-a")
    coord = make_usuario("coord@example.com", "secret123", RolUsuario.COORDINADOR, centro.id)
    r = client.post("/api/v1/auth/register", json={
        "email": "nuevo@example.com", "password": "secret123",
        "nombre": "Nuevo", "apellidos": "Dos", "centro_slug": "centro-a",
    }, headers=auth_header(coord))
    assert r.status_code == 403


def test_register_superadmin_ok(client, make_centro, make_usuario, auth_header):
    make_centro("centro-a")
    admin = make_usuario("admin@example.com", "secret123", RolUsuario.SUPERADMIN)
    r = client.post("/api/v1/auth/register", json={
        "email": "nuevo@example.com", "password": "secret123",
        "nombre": "Nuevo", "apellidos": "Dos", "centro_slug": "centro-a",
    }, headers=auth_header(admin))
    assert r.status_code == 201
