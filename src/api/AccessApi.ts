import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ============================================
// INTERFACES BACKEND
// ============================================
interface BackendAccessLog {
  id: number;
  fecha: string;
  persona_id: number;
  servicio_id?: number;
  detalle: string;
  estado: "exitoso" | "denegado";
  sucursal_id: number;
  usuario_registro_id: number;
  tipo_persona: "cliente" | "empleado";
  persona_nombres?: string;
  persona_apellidos?: string;
  persona_ci?: string; 
  servicio_nombre?: string;
}

interface BackendService {
  idinscripcion: number;
  idservicio: number;
  nombre_servicio: string;
  ingresos_disponibles: number | null;
  fecha_inicio: string;
  fecha_vencimiento: string;
  estado: number;
  estado_inscripcion: "activo" | "inactivo";
  sucursal_id: number;
  multisucursal: boolean;
  tipo_servicio?: string;
  servicio_ingresos_ilimitados?: boolean;
}

interface BackendEmployee {
  idempleado: number;
  rol: string;
  sucursal_id: number;
  estado: number;
  trabaja_hoy?: boolean;
  ultimo_registro_entrada?: string;
  ultimo_registro_salida?: string;
  estado_actual?: "in" | "out";
}

interface BackendPerson {
  idpersona: number;
  nombres: string;
  apellidos: string;
  ci: string;
  telefono?: string;
  fecha_nacimiento?: string;
}

interface BackendClient extends BackendPerson {
  tipo: "cliente";
  servicios: BackendService[];
}

interface BackendEmployeeMember extends BackendPerson {
  tipo: "empleado";
  empleado_info: BackendEmployee;
}

type BackendMember = BackendClient | BackendEmployeeMember;

// ============================================
// INTERFACES FRONTEND
// ============================================
export interface AccessLog {
  id: string;
  timestamp: string;
  memberName: string;
  memberType: "client" | "employee";
  detail: string;
  status: "success" | "denied";
  ci?: string;
}

export interface Service {
  id: string;
  name: string;
  visits: number | null;
  status: "active" | "expired";
  expirationDate: string;
  branchId: number;
  multisucursal: boolean;
  tipoServicio: string;
}

export interface Employee {
  id: string;
  name: string;
  ci: string;
  rol: string;
  trabajaHoy: boolean;
  lastCheckIn?: string;
  lastCheckOut?: string;
  status?: "in" | "out";
  branchId: number;
}

export interface ApiMember {
  id: string;
  name: string;
  ci: string;
  memberType: "client" | "employee";
  services: Service[];
  employeeInfo?: Employee;
}

export interface ClientAccessResponse {
  success: boolean;
  message: string;
  remainingVisits?: number;
  isMultisucursal?: boolean;
  updatedInscriptionsCount?: number;
  tieneDeuda?: boolean;
  deudaInfo?: {
    montoPendiente: number;
    montoTotal: number;
    servicioNombre: string;
  };
  log?: AccessLog;
}

export interface ClientSubscription {
  id: number;
  serviceName: string;
  startDate: string;
  endDate: string;
  visitsLeft: number | null;
  status: "active" | "expired" | "pending";
  price: number;
  isMultisucursal: boolean;
}
// ============================================
// REGISTER BY FINGERPRINT (flujo automático)
// ============================================
export interface FingerprintServiceOption {
  id: string;
  name: string;
  visits: number | null;
  status: "active" | "expired";
  expirationDate: string;
  tipoServicio: string;
  branchId: number;
  multisucursal: boolean;
}

export interface FingerprintAccessResponse {
  success: boolean;
  mode: "client_auto" | "employee" | "requires_selection" | "denied" | "not_found";
  message: string;
  denied?: boolean;
  isLate?: boolean;
  isEarly?: boolean;
  minutos?: number;
  tieneDeuda?: boolean;
  deudaInfo?: {
    montoPendiente: number;
    montoTotal: number;
    servicioNombre: string;
  } | null;
  remainingVisits?: number | null;
  log?: AccessLog | null;
  memberName?: string;
  ci?: string;
  memberId?: string;
  services?: FingerprintServiceOption[];
}

export const registerByFingerprint = async (
  ci: string,
  branchId: number,
  userId: number
): Promise<FingerprintAccessResponse> => {
  try {
    const response = await api.post<FingerprintAccessResponse>(
      `/access/register/fingerprint`,
      { ci, branchId, userId }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error registering by fingerprint:", error);
    throw new Error(
      error.response?.data?.message ||
        "No se pudo registrar el acceso por huella"
    );
  }
};

// ============================================
// AXIOS INSTANCE
// ============================================
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================
// HELPERS
// ============================================

/**
 * ✅ FIX: normaliza una fecha de calendario ("YYYY-MM-DD") o un timestamp
 * SIN que JavaScript la reinterprete como UTC.
 *
 * - Si viene "2025-10-05"         → la devuelve tal cual "2025-10-05"
 * - Si viene "2025-10-05T20:55"   → "2025-10-05 20:55"
 * - Si viene "2025-10-05T20:55Z"  → "2025-10-05 20:55"
 */
const normalizeDate = (dateString?: string): string => {
  if (!dateString) return "";

  // Fecha pura YYYY-MM-DD → devolver tal cual (sin tocar zona horaria)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  // Timestamp → reemplazar T por espacio, quitar Z y milisegundos
  return dateString.replace("T", " ").replace("Z", "").split(".")[0];
};

/**
 * ✅ FIX: convierte un "YYYY-MM-DD" a un objeto Date LOCAL (no UTC),
 * útil para formatear con date-fns y que no se desfase un día.
 */
export const parseLocalYMD = (ymd?: string): Date | null => {
  if (!ymd) return null;
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    const d = new Date(ymd);
    return isNaN(d.getTime()) ? null : d;
  }
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
};

/**
 * ✅ FIX: formatea un "YYYY-MM-DD" a "dd/MM/yyyy" sin desfase de zona.
 */
export const formatLocalYMD = (ymd?: string, sep = "/"): string => {
  if (!ymd) return "";
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return ymd;
  const [, y, m, d] = match;
  return `${d}${sep}${m}${sep}${y}`;
};

const mapBackendAccessLog = (log: BackendAccessLog): AccessLog => ({
  id: log.id.toString(),
  timestamp: normalizeDate(log.fecha),
  memberName:
    `${log.persona_nombres || ""} ${log.persona_apellidos || ""}`.trim() ||
    "Nombre no disponible",
  memberType: log.tipo_persona === "cliente" ? "client" : "employee",
  detail: log.detalle,
  status: log.estado === "exitoso" ? "success" : "denied",
  ci: log.persona_ci,
});

const mapBackendService = (service: BackendService): Service => {
  const isActive = service.estado_inscripcion === "activo";

  return {
    id: service.idinscripcion.toString(),
    name: service.nombre_servicio,
    visits: service.ingresos_disponibles,
    status: isActive ? "active" : "expired",
    // ✅ FIX: mantener como YYYY-MM-DD puro (sin reinterpretar UTC)
    expirationDate: normalizeDate(service.fecha_vencimiento),
    branchId: service.sucursal_id,
    multisucursal: service.multisucursal,
    tipoServicio: service.tipo_servicio || "general",
  };
};

const mapBackendEmployee = (
  employee: BackendEmployee,
  persona: BackendPerson
): Employee => ({
  id: employee.idempleado.toString(),
  name: `${persona.nombres} ${persona.apellidos}`,
  ci: persona.ci,
  rol: employee.rol,
  trabajaHoy: employee.trabaja_hoy ?? true,
  lastCheckIn: normalizeDate(employee.ultimo_registro_entrada),
  lastCheckOut: normalizeDate(employee.ultimo_registro_salida),
  status: employee.estado_actual,
  branchId: employee.sucursal_id,
});

const mapBackendMember = (member: BackendMember): ApiMember => {
  const baseMember = {
    id: member.idpersona.toString(),
    name: `${member.nombres} ${member.apellidos}`,
    ci: member.ci,
    memberType: (member.tipo === "cliente" ? "client" : "employee") as
      | "client"
      | "employee",
  };

  if (member.tipo === "cliente") {
    return {
      ...baseMember,
      services: member.servicios.map(mapBackendService),
      employeeInfo: undefined,
    };
  } else {
    return {
      ...baseMember,
      services: [],
      employeeInfo: mapBackendEmployee(member.empleado_info, member),
    };
  }
};

// ============================================
// API CALLS
// ============================================
export const getAccessLogs = async (filters?: {
  searchTerm?: string;
  typeFilter?: "all" | "client" | "employee";
  limit?: number;
  branchId?: number;
}): Promise<AccessLog[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.searchTerm) params.append("search", filters.searchTerm);
    if (filters?.typeFilter && filters.typeFilter !== "all")
      params.append(
        "type",
        filters.typeFilter === "client" ? "cliente" : "empleado"
      );
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.branchId)
      params.append("branchId", filters.branchId.toString());

    // ✅ FIX: obtener "hoy" en Bolivia (no en UTC) para no desfasar
    const hoyLocal = new Date();
    const y = hoyLocal.getFullYear();
    const m = String(hoyLocal.getMonth() + 1).padStart(2, "0");
    const d = String(hoyLocal.getDate()).padStart(2, "0");
    params.append("startDate", `${y}-${m}-${d}`);

    const response = await api.get<BackendAccessLog[]>(
      `/access/logs?${params.toString()}`
    );
    return response.data.map(mapBackendAccessLog);
  } catch (error) {
    console.error("Error fetching access logs:", error);
    throw new Error("No se pudieron cargar los registros de acceso");
  }
};

export const searchMembers = async (
  searchTerm: string,
  typeFilter: "all" | "client" | "employee" = "all",
  branchId?: number
): Promise<ApiMember[]> => {
  try {
    const params = new URLSearchParams();
    params.append("search", searchTerm);

    if (typeFilter !== "all") {
      params.append("type", typeFilter === "client" ? "cliente" : "empleado");
    }

    if (branchId) {
      params.append("branchId", branchId.toString());
    }

    const response = await api.get<BackendMember[]>(
      `/access/members?${params.toString()}`
    );
    return response.data.map(mapBackendMember);
  } catch (error) {
    console.error("Error searching members:", error);
    throw new Error("No se pudieron buscar los miembros");
  }
};

export const getClientSubscriptions = async (
  personId: number,
  branchId?: number
): Promise<ClientSubscription[]> => {
  try {
    const params = new URLSearchParams();
    if (branchId) params.append("branchId", branchId.toString());

    const url = `/access/members/${personId}/subscriptions${
      params.toString() ? "?" + params.toString() : ""
    }`;

    const response = await api.get<ClientSubscription[]>(url);
    return response.data;
  } catch (error: any) {
    console.error("❌ Error fetching client subscriptions:", error);

    const backendMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message;

    throw new Error(
      backendMessage || "No se pudieron cargar las suscripciones del cliente"
    );
  }
};

export const registerClientAccess = async (
  personId: number,
  serviceId: number,
  branchId: number,
  userId: number
): Promise<ClientAccessResponse> => {
  try {
    const response = await api.post<ClientAccessResponse>(
      `/access/register/client`,
      {
        personId,
        serviceId,
        branchId,
        userId,
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error registering client access:", error);
    throw new Error(
      error.response?.data?.message ||
        "No se pudo registrar el acceso del cliente"
    );
  }
};

export const registerEmployeeCheckIn = async (
  employeeId: number,
  branchId: number,
  userId: number
): Promise<{
  success: boolean;
  message: string;
  isLate: boolean;
  minutes: number;
  rol?: string;
  denied?: boolean;
  log?: AccessLog;
}> => {
  try {
    const response = await api.post(`/access/register/employee/checkin`, {
      employeeId,
      branchId,
      userId,
    });
    return response.data;
  } catch (error: any) {
    console.error("Error registering employee check-in:", error);
    throw new Error(
      error.response?.data?.message ||
        "No se pudo registrar la entrada del empleado"
    );
  }
};

export const registerEmployeeCheckOut = async (
  employeeId: number,
  branchId: number,
  userId: number
): Promise<{
  success: boolean;
  message: string;
  isEarly: boolean;
  minutes: number;
  rol?: string;
  denied?: boolean;
  log?: AccessLog;
}> => {
  try {
    const response = await api.post(`/access/register/employee/checkout`, {
      employeeId,
      branchId,
      userId,
    });
    return response.data;
  } catch (error: any) {
    console.error("Error registering employee check-out:", error);
    throw new Error(
      error.response?.data?.message ||
        "No se pudo registrar la salida del empleado"
    );
  }
};