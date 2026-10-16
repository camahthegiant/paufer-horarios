const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(
  path: string,
  centroSlug: string,
  options?: RequestInit
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("paufer_token") : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Centro-Slug": centroSlug,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? "Error en la API");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("paufer_token") : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? "Error en la API");
  }
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      authRequest<TokenResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    me: () => authRequest<UsuarioOut>("/api/v1/auth/me"),
  },
  centros: {
    listar: () => authRequest<{ id: string; nombre: string; slug: string; activo: boolean }[]>("/api/v1/centros/"),
  },
  profesores: {
    listar: (centro: string) =>
      request<Profesor[]>("/api/v1/profesores/", centro),
    crear: (centro: string, datos: ProfesorCreate) =>
      request<Profesor>("/api/v1/profesores/", centro, {
        method: "POST",
        body: JSON.stringify(datos),
      }),
    actualizar: (centro: string, id: string, datos: Partial<ProfesorCreate>) =>
      request<Profesor>(`/api/v1/profesores/${id}`, centro, {
        method: "PATCH",
        body: JSON.stringify(datos),
      }),
    eliminar: (centro: string, id: string) =>
      request<void>(`/api/v1/profesores/${id}`, centro, { method: "DELETE" }),
  },
  asignaturas: {
    listar: (centro: string) =>
      request<Asignatura[]>("/api/v1/asignaturas/", centro),
    crear: (centro: string, datos: AsignaturaCreate) =>
      request<Asignatura>("/api/v1/asignaturas/", centro, {
        method: "POST",
        body: JSON.stringify(datos),
      }),
    actualizar: (centro: string, id: string, datos: Partial<AsignaturaCreate>) =>
      request<Asignatura>(`/api/v1/asignaturas/${id}`, centro, {
        method: "PATCH",
        body: JSON.stringify(datos),
      }),
    eliminar: (centro: string, id: string) =>
      request<void>(`/api/v1/asignaturas/${id}`, centro, { method: "DELETE" }),
  },
  aulas: {
    listar: (centro: string) =>
      request<Aula[]>("/api/v1/aulas/", centro),
    crear: (centro: string, datos: AulaCreate) =>
      request<Aula>("/api/v1/aulas/", centro, {
        method: "POST",
        body: JSON.stringify(datos),
      }),
    actualizar: (centro: string, id: string, datos: Partial<AulaCreate>) =>
      request<Aula>(`/api/v1/aulas/${id}`, centro, {
        method: "PATCH",
        body: JSON.stringify(datos),
      }),
    eliminar: (centro: string, id: string) =>
      request<void>(`/api/v1/aulas/${id}`, centro, { method: "DELETE" }),
  },
  grupos: {
    listar: (centro: string) =>
      request<Grupo[]>("/api/v1/grupos/", centro),
    crear: (centro: string, datos: GrupoCreate) =>
      request<Grupo>("/api/v1/grupos/", centro, {
        method: "POST",
        body: JSON.stringify(datos),
      }),
    actualizar: (centro: string, id: string, datos: Partial<GrupoCreate>) =>
      request<Grupo>(`/api/v1/grupos/${id}`, centro, {
        method: "PATCH",
        body: JSON.stringify(datos),
      }),
    eliminar: (centro: string, id: string) =>
      request<void>(`/api/v1/grupos/${id}`, centro, { method: "DELETE" }),
  },
  periodos: {
    listar: (centro: string) =>
      request<Periodo[]>("/api/v1/periodos/", centro),
    crear: (centro: string, datos: PeriodoCreate) =>
      request<Periodo>("/api/v1/periodos/", centro, {
        method: "POST",
        body: JSON.stringify(datos),
      }),
    eliminar: (centro: string, id: string) =>
      request<void>(`/api/v1/periodos/${id}`, centro, { method: "DELETE" }),
  },
  profesorAsignatura: {
    listar: (centro: string) =>
      request<ProfesorAsignatura[]>("/api/v1/profesor-asignatura/", centro),
    crear: (centro: string, datos: ProfesorAsignaturaCreate) =>
      request<ProfesorAsignatura>("/api/v1/profesor-asignatura/", centro, {
        method: "POST",
        body: JSON.stringify(datos),
      }),
    actualizar: (centro: string, id: string, datos: { horas_semana?: number; subgrupo?: string | null }) =>
      request<ProfesorAsignatura>(`/api/v1/profesor-asignatura/${id}`, centro, {
        method: "PATCH",
        body: JSON.stringify(datos),
      }),
    eliminar: (centro: string, id: string) =>
      request<void>(`/api/v1/profesor-asignatura/${id}`, centro, { method: "DELETE" }),
  },
  restricciones: {
    listar: (centro: string, profesorId: string) =>
      request<Restriccion[]>(`/api/v1/profesores/${profesorId}/restricciones`, centro),
    crear: (centro: string, profesorId: string, datos: RestriccionCreate) =>
      request<Restriccion>(`/api/v1/profesores/${profesorId}/restricciones`, centro, {
        method: "POST",
        body: JSON.stringify(datos),
      }),
    eliminar: (centro: string, profesorId: string, restriccionId: string) =>
      request<void>(`/api/v1/profesores/${profesorId}/restricciones/${restriccionId}`, centro, {
        method: "DELETE",
      }),
  },
  cursos: {
    listar: (centro: string) =>
      request<CursoEscolar[]>("/api/v1/cursos-escolares/", centro),
    crear: (centro: string, datos: CursoEscolarCreate) =>
      request<CursoEscolar>("/api/v1/cursos-escolares/", centro, {
        method: "POST",
        body: JSON.stringify(datos),
      }),
  },
  sustituciones: {
    listar: (centro: string, fecha?: string) => {
      const qs = fecha ? `?fecha=${fecha}` : "";
      return request<Sustitucion[]>(`/api/v1/sustituciones/${qs}`, centro);
    },
    registrarAusencia: (centro: string, datos: AusenciaCreate) =>
      request<Sustitucion[]>("/api/v1/sustituciones/ausencia", centro, {
        method: "POST",
        body: JSON.stringify(datos),
      }),
    asignarSustituto: (centro: string, id: string, datos: SustitucionUpdate) =>
      request<Sustitucion>(`/api/v1/sustituciones/${id}`, centro, {
        method: "PATCH",
        body: JSON.stringify(datos),
      }),
    eliminar: (centro: string, id: string) =>
      request<void>(`/api/v1/sustituciones/${id}`, centro, { method: "DELETE" }),
  },
  horarios: {
    listar: (centro: string) =>
      request<Horario[]>("/api/v1/horarios/", centro),
    crear: (centro: string, datos: HorarioCreate) =>
      request<Horario>("/api/v1/horarios/", centro, {
        method: "POST",
        body: JSON.stringify(datos),
      }),
    generar: (centro: string, horarioId: string) =>
      request<ResultadoGeneracion>(`/api/v1/horarios/${horarioId}/generar`, centro, { method: "POST" }),
    eliminar: (centro: string, horarioId: string) =>
      request<void>(`/api/v1/horarios/${horarioId}`, centro, { method: "DELETE" }),
    listarSlots: (centro: string, horarioId: string, filtro?: { grupoId?: string; profesorId?: string }) => {
      const params = new URLSearchParams();
      if (filtro?.grupoId) params.set("grupo_id", filtro.grupoId);
      if (filtro?.profesorId) params.set("profesor_id", filtro.profesorId);
      const qs = params.toString();
      return request<Slot[]>(`/api/v1/horarios/${horarioId}/slots${qs ? `?${qs}` : ""}`, centro);
    },
    crearSlot: (centro: string, horarioId: string, datos: SlotCreate) =>
      request<Slot>(`/api/v1/horarios/${horarioId}/slots`, centro, {
        method: "POST",
        body: JSON.stringify(datos),
      }),
    eliminarSlot: (centro: string, horarioId: string, slotId: string) =>
      request<void>(`/api/v1/horarios/${horarioId}/slots/${slotId}`, centro, { method: "DELETE" }),
    cambiarEstado: (centro: string, horarioId: string, estado: "BORRADOR" | "PUBLICADO" | "ARCHIVADO") =>
      request<Horario>(`/api/v1/horarios/${horarioId}/estado?estado=${estado}`, centro, { method: "PATCH" }),
  },
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type UsuarioOut = {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  rol: string;
  centro_id: string | null;
  centro_slug: string | null;
};

// Tipos que reflejan los schemas del backend
export type Profesor = {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  horas_lectivas_semana: number;
  activo: boolean;
  google_calendar_id: string | null;
  centro_id: string;
  idiomas: string[];
};

export type ProfesorCreate = {
  nombre: string;
  apellidos: string;
  email: string;
  horas_lectivas_semana?: number;
  idiomas?: string[];
};

export type Asignatura = {
  id: string;
  nombre: string;
  codigo: string | null;
  horas_semana: number;
  color: string;
  troncal: boolean;
  centro_id: string;
};

export type AsignaturaCreate = {
  nombre: string;
  horas_semana: number;
  codigo?: string;
  color?: string;
  troncal?: boolean;
};

export type Aula = {
  id: string;
  nombre: string;
  codigo: string | null;
  capacidad: number | null;
  tipo: string;
  activa: boolean;
  centro_id: string;
};

export type AulaCreate = {
  nombre: string;
  tipo?: string;
  capacidad?: number;
  codigo?: string;
};

export type Grupo = {
  id: string;
  nombre: string;
  nivel: number | null;
  etapa: string;
  centro_id: string;
};

export type GrupoCreate = {
  nombre: string;
  etapa: string;
  nivel?: number;
};

export type Periodo = {
  id: string;
  orden: number;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  es_lectivo: boolean;
  centro_id: string;
};

export type PeriodoCreate = {
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  orden: number;
  es_lectivo?: boolean;
};

export type ProfesorAsignatura = {
  id: string;
  profesor_id: string;
  asignatura_id: string;
  grupo_id: string;
  horas_semana: number;
  subgrupo: string | null;
  profesor_nombre: string | null;
  profesor_apellidos: string | null;
  asignatura_nombre: string | null;
  asignatura_color: string | null;
  grupo_nombre: string | null;
};

export type ProfesorAsignaturaCreate = {
  profesor_id: string;
  asignatura_id: string;
  grupo_id: string;
  horas_semana: number;
  subgrupo?: string;
};

export type CursoEscolar = {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  centro_id: string;
};

export type CursoEscolarCreate = {
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
};

export type Horario = {
  id: string;
  nombre: string;
  estado: "BORRADOR" | "PUBLICADO" | "ARCHIVADO";
  curso_escolar_id: string;
  created_at: string;
  updated_at: string;
};

export type HorarioCreate = {
  nombre: string;
  curso_escolar_id: string;
};

export type Slot = {
  id: string;
  horario_id: string;
  profesor_id: string;
  asignatura_id: string | null;
  grupo_id: string | null;
  aula_id: string | null;
  periodo_id: string;
  dia_semana: string;
  tipo: string;
  profesor_nombre: string | null;
  profesor_apellidos: string | null;
  asignatura_nombre: string | null;
  asignatura_color: string | null;
  grupo_nombre: string | null;
};

export type SlotCreate = {
  profesor_id: string;
  asignatura_id?: string;
  grupo_id?: string;
  aula_id?: string;
  periodo_id: string;
  dia_semana: string;
  tipo?: string;
};

export type Sustitucion = {
  id: string;
  fecha: string;
  dia_semana: string;
  estado: "PENDIENTE" | "CUBIERTA" | "SIN_CUBRIR";
  motivo: string | null;
  profesor_ausente_id: string;
  profesor_ausente_nombre: string | null;
  profesor_ausente_apellidos: string | null;
  profesor_sustituto_id: string | null;
  profesor_sustituto_nombre: string | null;
  profesor_sustituto_apellidos: string | null;
  periodo_id: string;
  periodo_nombre: string | null;
  periodo_hora_inicio: string | null;
  periodo_hora_fin: string | null;
  periodo_orden: number | null;
  asignatura_id: string | null;
  asignatura_nombre: string | null;
  grupo_id: string | null;
  grupo_nombre: string | null;
  aula_id: string | null;
  aula_nombre: string | null;
  created_at: string;
};

export type AusenciaCreate = {
  profesor_ausente_id: string;
  fecha: string;
  horario_id?: string;
  motivo?: string;
};

export type SustitucionUpdate = {
  profesor_sustituto_id?: string | null;
  estado?: "PENDIENTE" | "CUBIERTA" | "SIN_CUBRIR";
  motivo?: string;
};

export type TipoRestriccion = "NO_DISPONIBLE" | "PREFERENCIA_EVITAR" | "PREFERENCIA";

export type Restriccion = {
  id: string;
  profesor_id: string;
  dia_semana: string;
  periodo_id: string | null;
  tipo: TipoRestriccion;
  motivo: string | null;
};

export type RestriccionCreate = {
  dia_semana: string;
  periodo_id?: string;
  tipo: TipoRestriccion;
  motivo?: string;
};

export type ResultadoGeneracion = {
  slots_creados: number;
  slots_previos_eliminados: number;
  estado_solver: "OPTIMO" | "FACTIBLE";
  tiempo_segundos: number;
};
