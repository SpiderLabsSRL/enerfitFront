import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ============================================
// TIPOS
// ============================================
export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
}

export interface Cupon {
  id: string;
  codigo: string;
  tipo: "porcentaje" | "monto_fijo";
  valor: number;
  descripcion: string;
  fechaInicio: string;
  fechaExpiracion: string;
  usosMaximos: number;
  usosActuales: number;
  activo: boolean;
  aplicableA: ("servicios" | "productos")[];
  sucursalesIds: string[];
}

export interface CuponFormData {
  codigo: string;
  tipo: "porcentaje" | "monto_fijo";
  valor: string;
  descripcion: string;
  fechaInicio: string;
  fechaExpiracion: string;
  usosMaximos: string;
  aplicableA: ("servicios" | "productos")[];
  sucursalesIds: string[];
}

// ============================================
// AXIOS INSTANCE
// ============================================
const api = axios.create({
  baseURL: `${API_URL}/cupones`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================
// GET CUPONES
// ============================================
export const getCupones = async (): Promise<Cupon[]> => {
  try {
    const response = await api.get<Cupon[]>("/");
    return response.data;
  } catch (error) {
    console.error("Error fetching cupones:", error);
    throw new Error("No se pudieron cargar los cupones");
  }
};

// ============================================
// GET SUCURSALES
// ============================================
export const getSucursales = async (): Promise<Sucursal[]> => {
  try {
    const response = await api.get<Sucursal[]>("/sucursales");
    return response.data;
  } catch (error) {
    console.error("Error fetching sucursales:", error);
    throw new Error("No se pudieron cargar las sucursales");
  }
};

// ============================================
// CREATE CUPON
// ============================================
export const createCupon = async (
  cuponData: CuponFormData
): Promise<Cupon> => {
  try {
    const dataToSend = {
      codigo: cuponData.codigo.toUpperCase(),
      tipo: cuponData.tipo,
      valor: parseFloat(cuponData.valor),
      descripcion: cuponData.descripcion,
      fechaInicio: cuponData.fechaInicio,
      fechaExpiracion: cuponData.fechaExpiracion,
      usosMaximos: parseInt(cuponData.usosMaximos) || 0,
      aplicableA:
        cuponData.aplicableA.length > 0
          ? cuponData.aplicableA
          : ["servicios", "productos"],
      sucursalesIds: cuponData.sucursalesIds,
    };

    const response = await api.post<Cupon>("/", dataToSend);
    return response.data;
  } catch (error: any) {
    console.error("Error creating cupon:", error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.message || "No se pudo crear el cupón"
      );
    }
    throw new Error("No se pudo crear el cupón");
  }
};

// ============================================
// UPDATE CUPON
// ============================================
export const updateCupon = async (
  id: string,
  cuponData: CuponFormData
): Promise<Cupon> => {
  try {
    const dataToSend = {
      codigo: cuponData.codigo.toUpperCase(),
      tipo: cuponData.tipo,
      valor: parseFloat(cuponData.valor),
      descripcion: cuponData.descripcion,
      fechaInicio: cuponData.fechaInicio,
      fechaExpiracion: cuponData.fechaExpiracion,
      usosMaximos: parseInt(cuponData.usosMaximos) || 0,
      aplicableA:
        cuponData.aplicableA.length > 0
          ? cuponData.aplicableA
          : ["servicios", "productos"],
      sucursalesIds: cuponData.sucursalesIds,
    };

    const response = await api.put<Cupon>(`/${id}`, dataToSend);
    return response.data;
  } catch (error: any) {
    console.error("Error updating cupon:", error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.message || "No se pudo actualizar el cupón"
      );
    }
    throw new Error("No se pudo actualizar el cupón");
  }
};

// ============================================
// DELETE CUPON
// ============================================
export const deleteCupon = async (id: string): Promise<void> => {
  try {
    await api.delete(`/${id}`);
  } catch (error) {
    console.error("Error deleting cupon:", error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.message || "No se pudo eliminar el cupón"
      );
    }
    throw new Error("No se pudo eliminar el cupón");
  }
};

// ============================================
// TOGGLE STATUS
// ============================================
export const toggleCuponStatus = async (id: string): Promise<Cupon> => {
  try {
    const response = await api.patch<Cupon>(`/${id}/toggle-status`);
    return response.data;
  } catch (error) {
    console.error("Error toggling cupon status:", error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.message ||
          "No se pudo cambiar el estado del cupón"
      );
    }
    throw new Error("No se pudo cambiar el estado del cupón");
  }
};  