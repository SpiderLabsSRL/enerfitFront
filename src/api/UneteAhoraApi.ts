import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Interfaces actualizadas
export interface InscripcionInfo {
  id: number;
  servicio_id: number;
  servicio_nombre: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  ingresos_disponibles: number | null;
  sucursal_id: number;
  sucursal_nombre: string;
  estado: number;
  activa?: boolean;
  dias_restantes?: number;
}

export interface UsuarioExistente {
  id: number;
  ci: string;
  nombre: string;
  apellido: string;
  celular: string;
  inscripciones?: InscripcionInfo[];
  tieneInscripcionActiva?: boolean;
  ultimasInscripciones?: InscripcionInfo[];
  ultimaInscripcion?: InscripcionInfo | null;
}

export interface BuscarUsuarioResponse {
  encontrado: boolean;
  usuario?: UsuarioExistente;
  mensaje?: string;
}

export interface RegistrarUsuarioRequest {
  ci: string;
  nombre: string;
  apellido: string;
  celular: string;
}

export interface RegistrarUsuarioResponse {
  success: boolean;
  mensaje: string;
  usuarioId?: number;
}

// Configuración de axios
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// API functions
export const buscarUsuarioPorCI = async (
  ci: string,
): Promise<BuscarUsuarioResponse> => {
  try {
    const response = await api.get(`/unete-ahora/buscar-usuario/${ci}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return {
        encontrado: false,
        mensaje: "Usuario no encontrado",
      };
    }
    console.error("Error buscando usuario:", error.message);
    throw new Error("Error al buscar usuario");
  }
};

export const registrarUsuario = async (
  data: RegistrarUsuarioRequest,
): Promise<RegistrarUsuarioResponse> => {
  try {
    const response = await api.post("/unete-ahora/registrar", data);
    return response.data;
  } catch (error: any) {
    console.error("Error registrando usuario:", error);

    if (error.response?.data) {
      const backendError = error.response.data;
      if (backendError.mensaje) {
        throw new Error(backendError.mensaje);
      }
      if (backendError.error) {
        throw new Error(backendError.error);
      }
    }

    throw new Error(
      "No se pudo completar el registro. Por favor, intenta nuevamente.",
    );
  }
};