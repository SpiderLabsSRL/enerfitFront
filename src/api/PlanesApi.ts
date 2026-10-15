// src/api/PlanesApi.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ============================================
// TIPOS BACKEND
// ============================================
interface BackendPlanSucursal {
  id: number;
  nombre: string;
  disponible: boolean;
  multisucursal?: boolean;
}

interface BackendPlan {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio: string | number;
  numeroIngresos?: number | null;
  estado: string | number;
  tipoDuracion?: string;
  cantidadDuracion?: number;
  multisucursal: boolean;
  sucursales?: BackendPlanSucursal[];
  hasTimeRange?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  hasSpecificDays?: boolean;
  specificDays?: string[];
}

// ============================================
// TIPOS FRONTEND
// ============================================
export interface PlanSucursal {
  id: number;
  nombre: string;
  disponible: boolean;
}

export interface Plan {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  numeroIngresos: number | null;
  estado: string | number;
  tipoDuracion: string;
  cantidadDuracion: number;
  multisucursal: boolean;
  sucursales: PlanSucursal[];
  hasTimeRange: boolean;
  startTime: string | null;
  endTime: string | null;
  hasSpecificDays: boolean;
  specificDays: string[];
}

export interface PlanRequest {
  nombre: string;
  descripcion?: string;
  precio: number;
  numeroIngresos: number | null;
  tipoDuracion: string;
  cantidadDuracion: number;
  multisucursal: boolean;
  sucursalesIds: number[];
}

// ============================================
// TIENDA
// ============================================
export interface TiendaProducto {
  id: number;
  nombre: string;
  descripcion: string;
  codigo: string | null;
  precio: number;
  imagen: string | null;
  landing: boolean;
  stock: number;
  categoria: string;
  destacado: boolean;
}

// ============================================
// AXIOS INSTANCE
// ============================================
const api = axios.create({
  baseURL: `${API_URL}/planes`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ============================================
// HELPER
// ============================================
const mapBackendPlan = (plan: BackendPlan): Plan => ({
  id: plan.id,
  nombre: plan.nombre,
  descripcion: plan.descripcion || null,
  precio:
    typeof plan.precio === "string" ? parseFloat(plan.precio) : plan.precio,
  numeroIngresos: plan.numeroIngresos ?? null,
  estado: plan.estado,
  tipoDuracion: plan.tipoDuracion || "dias",
  cantidadDuracion: plan.cantidadDuracion ?? 1,
  multisucursal: plan.multisucursal,
  sucursales: (plan.sucursales || []).map((s) => ({
    id: s.id,
    nombre: s.nombre,
    disponible: s.disponible,
  })),
  hasTimeRange: plan.hasTimeRange || false,
  startTime: plan.startTime || null,
  endTime: plan.endTime || null,
  hasSpecificDays: plan.hasSpecificDays || false,
  specificDays: plan.specificDays || [],
});

// ============================================
// GET TODOS LOS PLANES
// ============================================
export const getPlanes = async (): Promise<Plan[]> => {
  try {
    const response = await api.get<BackendPlan[]>("/");
    return response.data.map(mapBackendPlan);
  } catch (error: any) {
    console.error("Error fetching planes:", error);
    throw new Error(
      error.response?.data?.error || "No se pudieron cargar los planes"
    );
  }
};

// ============================================
// GET PLANES ACTIVOS
// ============================================
export const getPlanesActivos = async (): Promise<Plan[]> => {
  try {
    const response = await api.get<BackendPlan[]>("/activos");
    return response.data.map(mapBackendPlan);
  } catch (error: any) {
    console.error("Error fetching active planes:", error);
    throw new Error(
      error.response?.data?.error || "No se pudieron cargar los planes activos"
    );
  }
};

// ============================================
// CREAR PLAN
// ============================================
export const createPlan = async (plan: PlanRequest): Promise<Plan> => {
  try {
    const response = await api.post<BackendPlan>("/", plan);
    const sucursalesResponse = await api.get<BackendPlanSucursal[]>(
      `/${response.data.id}/sucursales`
    );
    return mapBackendPlan({
      ...response.data,
      sucursales: sucursalesResponse.data,
    });
  } catch (error: any) {
    console.error("Error creating plan:", error);
    throw new Error(error.response?.data?.error || "No se pudo crear el plan");
  }
};

// ============================================
// ACTUALIZAR PLAN
// ============================================
export const updatePlan = async (
  id: number,
  plan: PlanRequest
): Promise<Plan> => {
  try {
    const response = await api.put<BackendPlan>(`/${id}`, plan);
    await api.put(`/${id}/sucursales`, {
      sucursalesIds: plan.sucursalesIds,
    });
    const sucursalesResponse = await api.get<BackendPlanSucursal[]>(
      `/${id}/sucursales`
    );
    return mapBackendPlan({
      ...response.data,
      sucursales: sucursalesResponse.data,
    });
  } catch (error: any) {
    console.error("Error updating plan:", error);
    throw new Error(
      error.response?.data?.error || "No se pudo actualizar el plan"
    );
  }
};

// ============================================
// ELIMINAR PLAN
// ============================================
export const deletePlan = async (id: number): Promise<void> => {
  try {
    await api.delete(`/${id}`);
  } catch (error: any) {
    console.error("Error deleting plan:", error);
    throw new Error(
      error.response?.data?.error || "No se pudo eliminar el plan"
    );
  }
};

// ============================================
// TOGGLE ESTADO
// ============================================
export const togglePlanStatus = async (id: number): Promise<Plan> => {
  try {
    const response = await api.patch<BackendPlan>(`/${id}/toggle-status`);
    const sucursalesResponse = await api.get<BackendPlanSucursal[]>(
      `/${id}/sucursales`
    );
    return mapBackendPlan({
      ...response.data,
      sucursales: sucursalesResponse.data,
    });
  } catch (error: any) {
    console.error("Error toggling plan status:", error);
    throw new Error(
      error.response?.data?.error || "No se pudo cambiar el estado del plan"
    );
  }
};

// ============================================
// TIPOS DURACIÓN
// ============================================
export const getTiposDuracion = async (): Promise<string[]> => {
  try {
    const response = await api.get<string[]>("/tipos-duracion");
    return response.data;
  } catch (error: any) {
    console.error("Error fetching duration types:", error);
    throw new Error(
      error.response?.data?.error ||
        "No se pudieron cargar los tipos de duración"
    );
  }
};

// ============================================
// TIENDA
// ============================================
export const getProductosLanding = async (): Promise<TiendaProducto[]> => {
  try {
    const response = await api.get<TiendaProducto[]>("/tienda/productos");
    return response.data;
  } catch (error: any) {
    console.error("Error fetching productos landing:", error);
    throw new Error(
      error.response?.data?.error ||
        "No se pudieron cargar los productos de la tienda"
    );
  }
};

export const getProductoById = async (
  id: number
): Promise<TiendaProducto | null> => {
  try {
    const response = await api.get<TiendaProducto>(`/tienda/productos/${id}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    console.error("Error fetching producto:", error);
    throw new Error(
      error.response?.data?.error || "No se pudo cargar el producto"
    );
  }
};