# Modelo de datos

El modelo de datos define qué información guarda la aplicación y cómo se relaciona entre sí. Cada "entidad" se convierte en una tabla en la base de datos.

## Diagrama de relaciones

```
Centro (el colegio)
  │
  ├── Usuario         (quien accede a la app)
  ├── Profesor        (los docentes)
  │     └── RestriccionProfesor  (disponibilidad horaria)
  ├── Asignatura      (Matemáticas, Lengua...)
  ├── Aula            (aulas físicas del centro)
  ├── Grupo           (1ºA, 2ºB...)
  ├── Periodo         (franjas horarias: 1ª hora 8:00-9:00)
  └── CursoEscolar    (año académico 2026-2027)
        └── Horario   (el horario generado)
              ├── ProfesorAsignatura   (quién da qué a quién)
              ├── AsignacionHoraria    (cada slot del horario)
              └── Sustitucion          (ausencias y coberturas)
```

## Entidades explicadas

### `Centro`
El colegio o instituto. Todo lo demás pertenece a un centro.

Campos importantes:
- `nombre`: "IES Ribalta"
- `slug`: identificador único en URL, ej: `ies-ribalta`

### `Usuario`
Persona que accede a la aplicación. Roles:
- `SUPERADMIN`: acceso a todos los centros (nosotros como administradores del sistema)
- `ADMIN`: administra su centro
- `COORDINADOR`: gestiona y publica horarios
- `PROFESOR`: solo ve su propio horario

### `Profesor`
El docente. Diferente de `Usuario` porque un profesor puede existir en el sistema sin tener acceso a la app (ej: no todos los profes necesitan login, solo el coordinador).

Campos importantes:
- `horas_lectivas_semana`: máximo de horas que puede dar. Por defecto 18 (estándar España).
- `google_calendar_id`: su email de Google, para poder enviarle los eventos del horario.

### `RestriccionProfesor`
Disponibilidad horaria de un profesor. Tres tipos:
- `NO_DISPONIBLE`: obligatoria. El solver **nunca** pone clase ahí. Ej: "Lunes 1ª hora no puede, lleva a un hijo al médico".
- `PREFERENCIA_EVITAR`: el solver intenta no ponerlo ahí, pero puede si no hay otra opción.
- `PREFERENCIA`: el solver intenta ponerlo ahí si puede.

### `Asignatura`
Matemáticas, Lengua, Educación Física...

Campos importantes:
- `horas_semana`: cuántas horas a la semana se imparte esa asignatura. El solver usa esto para saber cuántos slots debe asignar.
- `color`: color en la interfaz (hex). Hace más fácil leer el horario visualmente.

### `Aula`
Espacios físicos del centro. Tipos: `ORDINARIA`, `LABORATORIO`, `INFORMATICA`, `GIMNASIO`, `MUSICA`, `BIBLIOTECA`, `OTRO`.

El solver respeta que una clase de Educación Física va al gimnasio y que el gimnasio no puede estar ocupado por dos grupos a la vez.

### `Grupo`
Una clase: 1ºA, 2ºB, etc. Con etapa (ESO, Bachillerato, FP...) y nivel numérico.

### `Periodo`
Una franja horaria. Cada centro define las suyas:
- Periodo 1: "1ª hora", 08:00-09:00
- Periodo 2: "2ª hora", 09:00-10:00
- Periodo 3: "Recreo", 10:00-10:30 (es_lectivo = false)
- ...

Los periodos no lectivos (recreo) también se modelan para poder asignar guardias de recreo.

### `CursoEscolar`
El año académico: "2026-2027", con fecha de inicio y fin.

### `ProfesorAsignatura`
La asignación: "Ana García imparte Matemáticas a 1ºA, 4 horas a la semana". Esta tabla le dice al solver exactamente qué tiene que cuadrar.

### `Horario`
El horario resultante. Estados:
- `BORRADOR`: generado o en edición, solo lo ve el coordinador.
- `PUBLICADO`: aprobado. Se envía a Google Calendar de los profesores.
- `ARCHIVADO`: de un curso anterior, solo consulta.

### `AsignacionHoraria`
Un slot concreto dentro del horario. Por ejemplo:
> **Lunes, 1ª hora** → Profesora: Ana García → Asignatura: Matemáticas → Grupo: 1ºA → Aula: 12

La base de datos tiene tres restricciones únicas que impiden físicamente:
- Que un **profesor** esté en dos sitios a la vez
- Que un **grupo** tenga dos clases a la vez
- Que un **aula** esté ocupada dos veces a la vez

### `Sustitucion`
Cuando un profesor falta, se registra aquí: quién falta, qué periodo, y quién le cubre (si alguien le cubre). Permite generar el "parte de sustituciones" del día.

## Decisiones de diseño importantes

**UUIDs como IDs**: Usamos identificadores únicos universales (UUID) en lugar de números enteros. Esto facilita el multi-tenancy y evita que los IDs de un centro colisionen con los de otro.

**`created_at` y `updated_at` en todo**: Cada tabla tiene timestamps automáticos. Útil para auditoría y para saber cuándo se modificó un horario.

**Profesor ≠ Usuario**: Un profesor puede estar en el sistema sin tener login. Solo necesita login quien gestiona horarios (coordinador/admin). Esto simplifica la adopción: el coordinador usa la app, los profesores solo reciben eventos en su Google Calendar.
