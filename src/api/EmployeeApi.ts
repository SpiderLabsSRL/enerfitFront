import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ============================================
// TIPOS BACKEND
// ============================================
interface BackendBranch {
  id: number;
  nombre: string;
  estado: number;
}

interface BackendBox {
  id: number;
  nombre: string;
  sucursal_id: number;
  estado: number;
}

interface BackendHorario {
  dia_semana: number;
  hora_ingreso: string;
  hora_salida: string;
  sucursal_id?: number | null;
  sucursal_nombre?: string | null;
}

interface BackendEmployee {
  id: number;
  persona_id: number;
  nombres: string;
  apellidos: string;
  ci: string;
  telefono: string;
  rol: string;
  sucursal_id: number | null;
  sucursal_nombre: string | null;
  caja_id: number | null;
  caja_nombre: string | null;
  estado: number;
  tiene_huella: boolean;
  username?: string;
  horarios: BackendHorario[];
}

// ============================================
// TIPOS FRONTEND
// ============================================
export interface Branch {
  id: number;
  nombre: string;
  estado: number;
}

export interface Box {
  id: number;
  nombre: string;
  sucursal_id: number;
  estado: number;
}

export interface Horario {
  dia_semana: number;
  hora_ingreso: string;
  hora_salida: string;
  sucursal_id?: number | null;
  sucursal_nombre?: string | null;
}

export interface HorarioConSucursal {
  dia_semana: number;
  hora_ingreso: string;
  hora_salida: string;
  sucursal_id: number;
}

export interface HorarioItem {
  id: string;
  dia_semana: number;
  dia_nombre: string;
  hora_ingreso: string;
  hora_salida: string;
  sucursal_id?: number | null;
}

export interface HorarioDia {
  dia_semana: number;
  dia_nombre: string;
  horarios: HorarioItem[];
}

export interface HorarioVisualizacion {
  sucursal_nombre: string;
  horarios: {
    dia_nombre: string;
    horarios: {
      hora_ingreso: string;
      hora_salida: string;
    }[];
  }[];
}

export interface Employee {
  id: number;
  persona_id: number;
  nombres: string;
  apellidos: string;
  ci: string;
  telefono: string;
  cargo: string;
  sucursal: string;
  sucursal_id: number | null;
  caja_id: number | null;
  caja_nombre: string;
  activo: boolean;
  fechaRegistro: string;
  tieneHuella: boolean;
  username?: string;
  horarios: Horario[];
}

export interface EmployeeRequest {
  nombres: string;
  apellidos: string;
  ci: string;
  telefono: string;
  cargo: string;
  sucursal_id: number | null;
  caja_id: number | null;
  horarios: HorarioConSucursal[];
  username?: string;
  password?: string;
}

// ============================================
// CONSTANTES
// ============================================
export const CARGOS = [
  "admin",
  "recepcionista",
  "entrenador",
  "limpieza",
  "lactobar",
  "zumba",
] as const;

export const ROLES_CON_ACCESO = ["admin", "recepcionista"];
export const ROLES_SIN_HORARIO = ["admin"];
export const ROLES_SIN_CAJA = [
  "admin",
  "entrenador",
  "limpieza",
  "lactobar",
  "zumba",
];

export const DIAS_SEMANA: { id: number; nombre: string }[] = [
  { id: 1, nombre: "Lunes" },
  { id: 2, nombre: "Martes" },
  { id: 3, nombre: "Miércoles" },
  { id: 4, nombre: "Jueves" },
  { id: 5, nombre: "Viernes" },
  { id: 6, nombre: "Sábado" },
  { id: 7, nombre: "Domingo" },
];

export const DIAS_MAP: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

// ============================================
// AXIOS INSTANCE
// ============================================
const api = axios.create({
  baseURL: `${API_URL}/employees`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================
// HELPER: Extrae un mensaje legible de cualquier error de Axios
// ============================================
function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const data = error.response.data;
      let msg: string | null = null;

      if (data && typeof data === "object") {
        msg = data.message || data.error || null;
      } else if (typeof data === "string" && data.trim().length > 0) {
        msg = data;
      }

      if (!msg || !String(msg).trim()) {
        msg = `Error ${error.response.status}`;
      }

      return String(msg);
    }

    if (error.code === "ECONNABORTED") {
      return "Tiempo de espera agotado. Verifica tu conexión.";
    }

    if (!error.response) {
      return "No se recibió respuesta del servidor. Verifica tu conexión.";
    }

    return error.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

// ============================================
// HELPER: Mapea el empleado del backend al frontend
// ============================================
function mapBackendEmployee(employee: BackendEmployee): Employee {
  return {
    id: employee.id,
    persona_id: employee.persona_id,
    nombres: employee.nombres,
    apellidos: employee.apellidos,
    ci: employee.ci,
    telefono: employee.telefono,
    cargo: employee.rol,
    sucursal: employee.sucursal_nombre || "N/A",
    sucursal_id: employee.sucursal_id,
    caja_id: employee.caja_id,
    caja_nombre: employee.caja_nombre || "",
    activo: employee.estado === 1,
    fechaRegistro: "",
    tieneHuella: employee.tiene_huella,
    username: employee.username,
    horarios: (employee.horarios || []).map((h) => ({
      dia_semana: h.dia_semana,
      hora_ingreso: h.hora_ingreso,
      hora_salida: h.hora_salida,
      sucursal_id: h.sucursal_id ?? null,
      sucursal_nombre: h.sucursal_nombre ?? null,
    })),
  };
}

// ============================================
// API CALLS
// ============================================
export const getBranches = async (): Promise<Branch[]> => {
  try {
    const response = await api.get<BackendBranch[]>("/branches");
    return response.data.map((branch) => ({
      id: branch.id,
      nombre: branch.nombre,
      estado: branch.estado,
    }));
  } catch (error) {
    console.error("Error fetching branches:", error);
    throw new Error(extractErrorMessage(error, "No se pudieron cargar las sucursales"));
  }
};

export const getBoxes = async (): Promise<Box[]> => {
  try {
    const response = await api.get<BackendBox[]>("/boxes");
    return response.data.map((box) => ({
      id: box.id,
      nombre: box.nombre,
      sucursal_id: box.sucursal_id,
      estado: box.estado,
    }));
  } catch (error) {
    console.error("Error fetching boxes:", error);
    throw new Error(extractErrorMessage(error, "No se pudieron cargar las cajas"));
  }
};

export const getEmployees = async (): Promise<Employee[]> => {
  try {
    const response = await api.get<BackendEmployee[]>("/");
    return response.data.map((employee) => mapBackendEmployee(employee));
  } catch (error) {
    console.error("Error fetching employees:", error);
    throw new Error(extractErrorMessage(error, "No se pudieron cargar los empleados"));
  }
};

export const createEmployee = async (
  employee: EmployeeRequest
): Promise<Employee> => {
  try {
    const response = await api.post<BackendEmployee>("/", employee);
    return mapBackendEmployee(response.data);
  } catch (error) {
    console.error("Error creating employee:", error);
    const msg = extractErrorMessage(error, "No se pudo crear el empleado");

    if (msg.includes("ci_unique")) throw new Error("ci_unique");
    if (msg.includes("username_unique")) throw new Error("username_unique");

    throw new Error(msg);
  }
};

export const updateEmployee = async (
  id: number,
  employee: EmployeeRequest
): Promise<Employee> => {
  try {
    const response = await api.put<BackendEmployee>(`/${id}`, employee);
    return mapBackendEmployee(response.data);
  } catch (error) {
    console.error("Error updating employee:", error);
    const msg = extractErrorMessage(error, "No se pudo actualizar el empleado");

    if (msg.includes("ci_unique")) throw new Error("ci_unique");
    if (msg.includes("username_unique")) throw new Error("username_unique");

    throw new Error(msg);
  }
};

export const deleteEmployee = async (id: number): Promise<void> => {
  try {
    await api.delete(`/${id}`);
  } catch (error) {
    console.error("Error deleting employee:", error);
    throw new Error(extractErrorMessage(error, "No se pudo eliminar el empleado"));
  }
};

export const toggleEmployeeStatus = async (id: number): Promise<Employee> => {
  try {
    const response = await api.patch<BackendEmployee>(`/${id}/toggle-status`);
    return mapBackendEmployee(response.data);
  } catch (error) {
    console.error("Error toggling employee status:", error);
    throw new Error(
      extractErrorMessage(error, "No se pudo cambiar el estado del empleado")
    );
  }
};

export const registerFingerprint = async (id: number): Promise<void> => {
  try {
    await api.post(`/${id}/register-fingerprint`);
  } catch (error) {
    console.error("Error registering fingerprint:", error);
    throw new Error(
      extractErrorMessage(error, "No se pudo registrar la huella dactilar")
    );
  }
};