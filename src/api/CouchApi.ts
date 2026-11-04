// src/api/CouchApi.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ============================================
// TIPOS BACKEND
// ============================================
interface BackendCoach {
  id: number;
  persona_id: number;
  nombres: string;
  apellidos: string;
  ci: string;
  telefono: string;
  rol: string;
  sucursal_id: number | null;
  sucursal_nombre: string | null;
  estado: number;
  activo: boolean;
  fecha_registro: string | null;
  meta_inscritos: number;
  adelanto_monto: number;
  total_inscritos_mes: number;
  nuevas_mes: number;
  reinscripciones_mes: number;
  total_historico: number;
  nuevas_historico: number;
  reinscripciones_historico: number;
}

interface BackendInscritoCoach {
  detalle_id: number;
  venta_servicio_id: number;
  inscripcion_id: number;
  persona_id: number;
  persona_nombre: string;
  persona_ci: string;
  servicio_nombre: string;
  sucursal_nombre: string;
  fecha_venta: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  total_venta: string | number;
  tipo: "nueva" | "reinscripcion";
  numero_inscripcion_coach: number;
}

interface BackendRegistroMes {
  id: number;
  coach_id: number;
  mes: string;
  meta_inscritos: number;
  adelanto_monto: number;
  fecha_actualizacion: string;
}

// ============================================
// TIPOS FRONTEND
// ============================================
export type TipoInscrito = "nueva" | "reinscripcion";

export interface Inscrito {
  detalleId: number;
  ventaServicioId: number;
  inscripcionId: number;
  personaId: number;
  nombre: string;
  ci: string;
  servicioNombre: string;
  sucursalNombre: string;
  fechaVenta: string;
  fechaInicio: string;
  fechaVencimiento: string;
  totalVenta: number;
  tipo: TipoInscrito;
  numeroInscripcionCoach: number;
}

export interface RegistroMes {
  mes: string;
  metaInscritos: number;
  adelantoMonto: number;
  fechaActualizacion: string;
}

export interface Coach {
  id: number;
  personaId: number;
  nombres: string;
  apellidos: string;
  ci: string;
  telefono: string;
  sucursalId: number | null;
  sucursalNombre: string | null;
  activo: boolean;
  fechaRegistro: string;
  metaInscritos: number;
  adelantoMonto: number;
  totalInscritosMes: number;
  nuevasMes: number;
  reinscripcionesMes: number;
  totalHistorico: number;
  nuevasHistorico: number;
  reinscripcionesHistorico: number;
}

export interface CoachCreateRequest {
  nombres: string;
  apellidos: string;
  ci: string;
  telefono: string;
  sucursal_id: number;
  metaInscritos: number; // requerido al crear
}

// ✅ En edición NO se envía metaInscritos (se edita inline)
export interface CoachUpdateRequest {
  nombres: string;
  apellidos: string;
  ci: string;
  telefono: string;
  sucursal_id: number;
}

export interface RegistroMesRequest {
  mes: string;
  metaInscritos: number;
  adelantoMonto: number;
}

// ============================================
// AXIOS
// ============================================
const api = axios.create({
  baseURL: `${API_URL}/coaches`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRedirecting = false;
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("userData");
      localStorage.removeItem("token");
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login") &&
        !isRedirecting
      ) {
        isRedirecting = true;
        try {
          sessionStorage.setItem(
            "redirect_after_login",
            window.location.pathname + window.location.search
          );
        } catch {
          /* noop */
        }
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  }
);

function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object") {
      const m = (data as any).message || (data as any).error;
      if (m) return String(m);
    }
    if (typeof data === "string" && data.trim()) return data;
    if (error.response) return `Error ${error.response.status}`;
    if (error.code === "ECONNABORTED") return "Tiempo de espera agotado.";
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function mapCoach(c: BackendCoach): Coach {
  return {
    id: c.id,
    personaId: c.persona_id,
    nombres: c.nombres,
    apellidos: c.apellidos,
    ci: c.ci,
    telefono: c.telefono,
    sucursalId: c.sucursal_id,
    sucursalNombre: c.sucursal_nombre,
    activo: c.activo ?? c.estado === 1,
    fechaRegistro: c.fecha_registro || "",
    metaInscritos: c.meta_inscritos ?? 0,
    adelantoMonto: Number(c.adelanto_monto ?? 0),
    totalInscritosMes: c.total_inscritos_mes ?? 0,
    nuevasMes: c.nuevas_mes ?? 0,
    reinscripcionesMes: c.reinscripciones_mes ?? 0,
    totalHistorico: c.total_historico ?? 0,
    nuevasHistorico: c.nuevas_historico ?? 0,
    reinscripcionesHistorico: c.reinscripciones_historico ?? 0,
  };
}

function mapInscrito(i: BackendInscritoCoach): Inscrito {
  return {
    detalleId: i.detalle_id,
    ventaServicioId: i.venta_servicio_id,
    inscripcionId: i.inscripcion_id,
    personaId: i.persona_id,
    nombre: i.persona_nombre,
    ci: i.persona_ci,
    servicioNombre: i.servicio_nombre,
    sucursalNombre: i.sucursal_nombre,
    fechaVenta: i.fecha_venta,
    fechaInicio: i.fecha_inicio,
    fechaVencimiento: i.fecha_vencimiento,
    totalVenta: Number(i.total_venta ?? 0),
    tipo: i.tipo,
    numeroInscripcionCoach: i.numero_inscripcion_coach,
  };
}

function mapRegistro(r: BackendRegistroMes): RegistroMes {
  return {
    mes: r.mes,
    metaInscritos: r.meta_inscritos ?? 0,
    adelantoMonto: Number(r.adelanto_monto ?? 0),
    fechaActualizacion: r.fecha_actualizacion,
  };
}

// ============================================
// API CALLS
// ============================================
export const getCoaches = async (mes?: string): Promise<Coach[]> => {
  try {
    const { data } = await api.get<BackendCoach[]>("/", {
      params: mes ? { mes } : undefined,
    });
    return data.map(mapCoach);
  } catch (e) {
    throw new Error(extractErrorMessage(e, "No se pudieron cargar los coaches"));
  }
};

export const getCoachById = async (id: number, mes?: string): Promise<Coach> => {
  try {
    const { data } = await api.get<BackendCoach>(`/${id}`, {
      params: mes ? { mes } : undefined,
    });
    return mapCoach(data);
  } catch (e) {
    throw new Error(extractErrorMessage(e, "No se pudo cargar el coach"));
  }
};

export const createCoach = async (data: CoachCreateRequest): Promise<Coach> => {
  try {
    const { data: res } = await api.post<BackendCoach>("/", data);
    return mapCoach(res);
  } catch (e) {
    const msg = extractErrorMessage(e, "No se pudo crear el coach");
    if (msg.includes("ci_unique")) throw new Error("ci_unique");
    throw new Error(msg);
  }
};

export const updateCoach = async (
  id: number,
  data: CoachUpdateRequest
): Promise<Coach> => {
  try {
    const { data: res } = await api.put<BackendCoach>(`/${id}`, data);
    return mapCoach(res);
  } catch (e) {
    const msg = extractErrorMessage(e, "No se pudo actualizar el coach");
    if (msg.includes("ci_unique")) throw new Error("ci_unique");
    throw new Error(msg);
  }
};

export const deleteCoach = async (id: number): Promise<void> => {
  try {
    await api.delete(`/${id}`);
  } catch (e) {
    throw new Error(extractErrorMessage(e, "No se pudo eliminar el coach"));
  }
};

export const toggleCoachStatus = async (id: number): Promise<Coach> => {
  try {
    const { data } = await api.patch<BackendCoach>(`/${id}/toggle-status`);
    return mapCoach(data);
  } catch (e) {
    throw new Error(
      extractErrorMessage(e, "No se pudo cambiar el estado del coach")
    );
  }
};

export const getRegistrosMes = async (coachId: number): Promise<RegistroMes[]> => {
  try {
    const { data } = await api.get<BackendRegistroMes[]>(`/${coachId}/registros`);
    return data.map(mapRegistro);
  } catch (e) {
    throw new Error(extractErrorMessage(e, "No se pudieron cargar los registros"));
  }
};

export const upsertRegistroMes = async (
  coachId: number,
  data: RegistroMesRequest
): Promise<RegistroMes> => {
  try {
    const { data: res } = await api.put<BackendRegistroMes>(
      `/${coachId}/registros`,
      data
    );
    return mapRegistro(res);
  } catch (e) {
    throw new Error(
      extractErrorMessage(e, "No se pudo guardar el registro del mes")
    );
  }
};

export const getInscritosCoach = async (
  coachId: number,
  mes?: string
): Promise<Inscrito[]> => {
  try {
    const { data } = await api.get<BackendInscritoCoach[]>(
      `/${coachId}/inscritos`,
      { params: mes ? { mes } : undefined }
    );
    return data.map(mapInscrito);
  } catch (e) {
    throw new Error(extractErrorMessage(e, "No se pudieron cargar los inscritos"));
  }
};

// ============================================
// HELPERS
// ============================================
export function mesActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function addMeses(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map((n) => parseInt(n, 10));
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMes(mes: string): string {
  const [year, month] = mes.split("-");
  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const m = parseInt(month, 10) - 1;
  return `${meses[m] ?? month} ${year}`;
}

export function ultimosMeses(n: number): string[] {
  const actual = mesActual();
  const arr: string[] = [];
  for (let i = 0; i < n; i++) arr.push(addMeses(actual, -i));
  return arr;
}

export function inscritosDelMes(coach: Coach) {
  return {
    nuevas: coach.nuevasMes,
    reinscripciones: coach.reinscripcionesMes,
    total: coach.totalInscritosMes,
  };
}