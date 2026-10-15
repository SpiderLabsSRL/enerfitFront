// src/api/pendientesApi.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface PagoPendiente {
  id: number;
  personaId: number;
  ventaServicioId: number;
  nombres: string;
  apellidos: string;
  ci: string;
  servicioNombre: string;
  montoTotal: number;
  montoPagado: number;
  montoPendiente: number;
  fechaInscripcion: string;
  fechaUltimaActualizacion: string;
  estado: 'pendiente' | 'completado' | 'cancelado';
}

export interface PagoRequest {
  montoPagado: number;
  formaPago: 'efectivo' | 'qr' | 'mixto';
  montoEfectivo: number;
  montoQr: number;
  cajaId: number;
  empleadoId: number;
  sucursalId: number;
}

export interface PagoResponse {
  success: boolean;
  message: string;
  nuevoEstado?: string;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar el token a todas las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Obtener todos los pagos pendientes
export const getPagosPendientes = async (sucursalId: number): Promise<PagoPendiente[]> => {
  try {
    const response = await api.get<PagoPendiente[]>(`/pendientes/${sucursalId}`);
    
    // Asegurarse de que los montos sean números
    return response.data.map(pago => ({
      ...pago,
      montoTotal: typeof pago.montoTotal === 'string' ? parseFloat(pago.montoTotal) : pago.montoTotal,
      montoPagado: typeof pago.montoPagado === 'string' ? parseFloat(pago.montoPagado) : pago.montoPagado,
      montoPendiente: typeof pago.montoPendiente === 'string' ? parseFloat(pago.montoPendiente) : pago.montoPendiente
    }));
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    throw new Error("No se pudieron cargar los pagos pendientes");
  }
};

// Registrar un nuevo pago
export const registrarPago = async (pagoId: number, pagoData: PagoRequest): Promise<PagoResponse> => {
  try {
    const response = await api.post<PagoResponse>(`/pendientes/${pagoId}/pago`, pagoData);
    return response.data;
  } catch (error: any) {
    console.error("Error registering payment:", error);
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error("No se pudo registrar el pago");
  }
};

// Cancelar un pago pendiente
export const cancelarPagoPendiente = async (pagoId: number): Promise<{success: boolean; message: string}> => {
  try {
    const response = await api.put(`/pendientes/${pagoId}/cancelar`);
    return response.data;
  } catch (error: any) {
    console.error("Error canceling pending payment:", error);
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error("No se pudo cancelar el pago pendiente");
  }
};