import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ============================================
// TIPOS
// ============================================
export interface ZumbaInstructor {
  id: string;
  nombre: string;
  rol: string;
}

export interface ZumbaReport {
  id: string;
  fecha: string;
  instructorId: string;
  instructorNombre: string;
  numeroPersonas: number;
  registradoPor: string;
  registradoEn: string;
}

export interface ZumbaStats {
  totalClasses: number;
  totalParticipants: number;
  averageParticipants: number;
  topInstructor: string;
  topInstructorCount: number;
}

export interface SaveReportPayload {
  fecha: string;
  instructorId: number;
  numeroPersonas: number;
  registradoPorId: number | null;
}

// ✅ NUEVO: tipo de filtros con nombres de parámetros correctos
export interface ZumbaFilters {
  dateFrom?: string;
  dateTo?: string;
  instructorId?: string;
}

// ============================================
// AXIOS INSTANCE
// ============================================
const api = axios.create({
  baseURL: `${API_URL}/zumba`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ============================================
// GET INSTRUCTORS
// ============================================
export const getInstructors = async (
  branchId?: number
): Promise<ZumbaInstructor[]> => {
  try {
    const params = new URLSearchParams();
    if (branchId) params.append("branchId", branchId.toString());

    const url = `/instructors${
      params.toString() ? "?" + params.toString() : ""
    }`;

    console.log("🔄 Fetching instructors from:", url);

    const response = await api.get<ZumbaInstructor[]>(url);

    console.log("✅ Instructors received:", response.data);

    return response.data;
  } catch (error: any) {
    console.error("❌ Error fetching instructors:", error);
    throw new Error(
      error.response?.data?.message || "No se pudieron cargar los instructores"
    );
  }
};

// ============================================
// GET REPORTS
// ============================================
export const getReports = async (
  filters?: ZumbaFilters
): Promise<ZumbaReport[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.append("dateTo", filters.dateTo);
    if (filters?.instructorId && filters.instructorId !== "all") {
      params.append("instructorId", filters.instructorId);
    }

    const response = await api.get<ZumbaReport[]>(
      `/reports${params.toString() ? "?" + params.toString() : ""}`
    );
    return response.data;
  } catch (error: any) {
    console.error("Error fetching reports:", error);
    throw new Error(
      error.response?.data?.message || "No se pudieron cargar los reportes"
    );
  }
};

// ============================================
// GET REPORT BY DATE
// ============================================
export const getReportByDate = async (
  fecha: string
): Promise<ZumbaReport | null> => {
  try {
    const response = await api.get<ZumbaReport | null>(
      `/reports/by-date/${fecha}`
    );
    return response.data;
  } catch (error: any) {
    console.error("Error fetching report by date:", error);
    if (error.response?.status === 404) return null;
    throw new Error(
      error.response?.data?.message || "No se pudo cargar el reporte"
    );
  }
};

// ============================================
// SAVE REPORT (upsert)
// ============================================
export const saveReport = async (
  payload: SaveReportPayload
): Promise<ZumbaReport> => {
  try {
    const response = await api.post<ZumbaReport>("/reports", payload);
    return response.data;
  } catch (error: any) {
    console.error("Error saving report:", error);
    throw new Error(
      error.response?.data?.message || "No se pudo guardar el reporte"
    );
  }
};

// ============================================
// DELETE REPORT
// ============================================
export const deleteReport = async (id: string): Promise<void> => {
  try {
    await api.delete(`/reports/${id}`);
  } catch (error: any) {
    console.error("Error deleting report:", error);
    throw new Error(
      error.response?.data?.message || "No se pudo eliminar el reporte"
    );
  }
};

// ============================================
// GET STATS
// ============================================
export const getStats = async (
  filters?: { dateFrom?: string; dateTo?: string }
): Promise<ZumbaStats> => {
  try {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.append("dateTo", filters.dateTo);

    const response = await api.get<ZumbaStats>(
      `/stats${params.toString() ? "?" + params.toString() : ""}`
    );
    return response.data;
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    return {
      totalClasses: 0,
      totalParticipants: 0,
      averageParticipants: 0,
      topInstructor: "",
      topInstructorCount: 0,
    };
  }
};