import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ============================================
// TIPOS BACKEND
// ============================================
export interface BackendService {
  id: number;
  nombre: string;
  precio: string;
  numero_ingresos: number | null;
  estado: number;
  multisucursal: boolean;
  tipo_duracion: "dias" | "meses";
  cantidad_duracion: number;
  cantidad_personas: number;
  tipo_servicio: string | null;
}

export interface BackendPerson {
  id: number;
  nombres: string;
  apellidos: string;
  ci: string;
  telefono: string;
  fecha_nacimiento: string;
}

export interface BackendActiveSubscription {
  id: number;
  servicio_id: number;
  sucursal_id: number;
  fecha_inicio: string;
  fecha_vencimiento: string;
  ingresos_disponibles: number;
  estado: number;
  estado_inscripcion: "activo" | "inactivo";
  multisucursal: boolean;
  tipo_servicio: string | null;
}

export interface BackendCashRegisterStatus {
  caja_id: number;
  nombre_caja?: string;
  estado: string;
  monto_inicial: number | null;
  monto_final: number;
  usuario_id: number | null;
}

export interface BackendCoupon {
  id: number;
  codigo: string;
  tipo: "porcentaje" | "monto_fijo";
  valor: number;
  descripcion: string;
  fechaInicio: string;
  fechaExpiracion: string;
  usosMaximos: number;
  usosActuales: number;
}

// ============================================
// TIPOS FRONTEND
// ============================================
export interface Service {
  idServicio: number;
  nombre: string;
  precio: number;
  visitas: number | null;
  estado: number;
  multisucursal: boolean;
  tipoDuracion: "dias" | "meses";
  cantidadDuracion: number;
  requierePersonas: number;
  tipo: string;
}

export interface Person {
  personaId: number | null;
  _key: string;
  isNew: boolean;
  nombres: string;
  apellidos: string;
  ci: string;
  telefono: string;
  fechaNacimiento?: string;
}

export interface ActiveSubscription {
  idInscripcion: number;
  servicioId: number;
  servicioNombre?: string;
  tipo: string;
  sucursalId: number;
  fechaInicio: string;
  fechaVencimiento: string;
  ingresosDisponibles: number;
  estado: number;
  /** 'activo' = vigente hoy. 'inactivo' = futura (aún no comienza) o reemplazada. */
  estadoInscripcion: "activo" | "inactivo";
  multisucursal: boolean;
  personaId?: number;
}

export interface CashRegisterStatus {
  idCaja: number;
  nombreCaja?: string;
  estado: string;
  montoInicial: number;
  montoFinal: number;
  usuarioId: number | null;
}

export interface RegistrationPerson {
  personaId: number | null;
  nombres: string;
  apellidos: string;
  ci: string;
  telefono: string;
  fechaNacimiento?: string;
}

export interface RegistrationService {
  servicioId: number;
  fechaInicio: string;
  fechaVencimiento: string;
  precio: number;
  personaIndexes: number[];
  /** ✅ NUEVO: true cuando el servicio NO requiere persona y no hay
   *  ninguna persona seleccionada. El backend registrará la inscripción
   *  con persona_id = NULL. */
  sinPersona?: boolean;
}

export interface RegistrationRequest {
  personas: RegistrationPerson[];
  servicios: RegistrationService[];
  descuento: number;
  descripcionDescuento: string;
  formaPago: "efectivo" | "qr" | "mixto";
  montoEfectivo: number;
  montoQr: number;
  total: number;
  sucursalId: number;
  cajaId: number;
  empleadoId: number;
  pagoPlazos?: boolean;
  montoEntregado?: number;
  montoPendiente?: number;
  cupon_codigo?: string;
}

export interface RegistrationResponse {
  success: boolean;
  ventaId: number;
  pagoPendienteIds?: number[];
  message: string;
}

export interface PagoPendiente {
  id: number;
  personaId: number;
  ventaServicioId: number;
  montoTotal: number;
  montoPagado: number;
  montoPendiente: number;
  fechaInscripcion: string;
  fechaUltimaActualizacion: string;
  estado: string;
}

export interface Coupon {
  id: number;
  codigo: string;
  tipo: "porcentaje" | "monto_fijo";
  valor: number;
  descripcion: string;
  fechaInicio: string;
  fechaExpiracion: string;
  usosMaximos: number;
  usosActuales: number;
}

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
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================
// SERVICIOS
// ============================================
export const getServicesByBranch = async (
  sucursalId: number
): Promise<Service[]> => {
  try {
    const response = await api.get<BackendService[]>(
      `/inscription/services/sucursal/${sucursalId}`
    );
    return response.data.map((service) => ({
      idServicio: service.id,
      nombre: service.nombre,
      precio: parseFloat(service.precio),
      visitas: service.numero_ingresos,
      estado: service.estado,
      multisucursal: service.multisucursal,
      tipoDuracion: service.tipo_duracion,
      cantidadDuracion: service.cantidad_duracion,
      // ✅ Normalizamos: si viene null/undefined se trata como 1 por defecto
      //    (compatibilidad con servicios viejos), pero si viene 0 se respeta 0.
      requierePersonas:
        service.cantidad_personas === null ||
        service.cantidad_personas === undefined
          ? 1
          : service.cantidad_personas,
      tipo: service.tipo_servicio || "general",
    }));
  } catch (error) {
    console.error("Error fetching services:", error);
    throw new Error("No se pudieron cargar los servicios");
  }
};

// ============================================
// PERSONAS
// ============================================
export const searchPeople = async (searchTerm: string): Promise<Person[]> => {
  try {
    const response = await api.get<BackendPerson[]>(
      `/inscription/people/search?q=${encodeURIComponent(searchTerm)}`
    );
    return response.data.map((person) => ({
      personaId: person.id,
      _key: `db-${person.id}`,
      isNew: false,
      nombres: person.nombres,
      apellidos: person.apellidos,
      ci: person.ci,
      telefono: person.telefono,
      fechaNacimiento: person.fecha_nacimiento,
    }));
  } catch (error) {
    console.error("Error searching people:", error);
    throw new Error("No se pudieron buscar personas");
  }
};

// ============================================
// SUSCRIPCIONES (activas + futuras)
// ============================================
export const getActiveSubscriptions = async (
  personaId: number,
  sucursalId: number
): Promise<ActiveSubscription[]> => {
  try {
    const response = await api.get<BackendActiveSubscription[]>(
      `/inscription/subscriptions/active/${personaId}?sucursalId=${sucursalId}`
    );
    return response.data.map((sub) => ({
      idInscripcion: sub.id,
      servicioId: sub.servicio_id,
      sucursalId: sub.sucursal_id,
      fechaInicio: sub.fecha_inicio,
      fechaVencimiento: sub.fecha_vencimiento,
      ingresosDisponibles: sub.ingresos_disponibles,
      estado: sub.estado,
      estadoInscripcion: sub.estado_inscripcion,
      multisucursal: sub.multisucursal,
      tipo: sub.tipo_servicio || "general",
      personaId,
    }));
  } catch (error) {
    console.error("Error fetching active subscriptions:", error);
    throw new Error("No se pudieron cargar las suscripciones activas");
  }
};

// ============================================
// CAJA
// ============================================
export const getCashRegisterStatus = async (
  cajaId: number
): Promise<CashRegisterStatus> => {
  try {
    const response = await api.get<BackendCashRegisterStatus>(
      `/inscription/cash-register/status/${cajaId}`
    );
    return {
      idCaja: response.data.caja_id,
      nombreCaja: response.data.nombre_caja,
      estado: response.data.estado,
      montoInicial: response.data.monto_inicial || 0,
      montoFinal: response.data.monto_final,
      usuarioId: response.data.usuario_id,
    };
  } catch (error) {
    console.error("Error fetching cash register status:", error);
    throw new Error("No se pudo obtener el estado de la caja");
  }
};

// ============================================
// CUPONES
// ============================================
export const validateCoupon = async (
  codigo: string,
  sucursalId: number
): Promise<Coupon> => {
  try {
    const response = await api.get<BackendCoupon>(
      `/inscription/coupons/validate?codigo=${encodeURIComponent(
        codigo
      )}&sucursalId=${sucursalId}`
    );
    return {
      id: response.data.id,
      codigo: response.data.codigo,
      tipo: response.data.tipo,
      valor: response.data.valor,
      descripcion: response.data.descripcion,
      fechaInicio: response.data.fechaInicio,
      fechaExpiracion: response.data.fechaExpiracion,
      usosMaximos: response.data.usosMaximos,
      usosActuales: response.data.usosActuales,
    };
  } catch (error: any) {
    console.error("Error validating coupon:", error);
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error("No se pudo validar el cupón");
  }
};

export const getAvailableCoupons = async (
  sucursalId: number
): Promise<Coupon[]> => {
  try {
    const response = await api.get<BackendCoupon[]>(
      `/inscription/coupons/available/${sucursalId}`
    );
    return response.data.map((c) => ({
      id: c.id,
      codigo: c.codigo,
      tipo: c.tipo,
      valor: c.valor,
      descripcion: c.descripcion,
      fechaInicio: c.fechaInicio,
      fechaExpiracion: c.fechaExpiracion,
      usosMaximos: c.usosMaximos,
      usosActuales: c.usosActuales,
    }));
  } catch (error) {
    console.error("Error fetching available coupons:", error);
    throw new Error("No se pudieron cargar los cupones");
  }
};

// ============================================
// INSCRIPCIONES
// ============================================
export const registerMember = async (
  data: RegistrationRequest
): Promise<RegistrationResponse> => {
  try {
    const response = await api.post<RegistrationResponse>(
      "/inscription/subscriptions/register",
      data
    );
    return response.data;
  } catch (error: any) {
    console.error("Error registering member:", error);
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error("No se pudo registrar la inscripción");
  }
};

// ============================================
// PAGOS PENDIENTES
// ============================================
export const getPagosPendientes = async (
  personaId: number
): Promise<PagoPendiente[]> => {
  try {
    const response = await api.get(`/inscription/pagos-pendientes/${personaId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    return [];
  }
};

export const updatePagoPendiente = async (
  pagoId: number,
  montoPagado: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.put(
      `/inscription/pagos-pendientes/${pagoId}`,
      { montoPagado }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error updating pending payment:", error);
    throw new Error(
      error.response?.data?.message || "No se pudo actualizar el pago"
    );
  }
};

// ============================================
// VERIFICAR SI UNA PERSONA TIENE HUELLA
// ============================================
export const hasFingerprint = async (
  personaId: number
): Promise<{ hasFingerprint: boolean; exists: boolean }> => {
  try {
    const response = await api.get(
      `/inscription/people/${personaId}/has-fingerprint`
    );
    return response.data;
  } catch (error) {
    console.error("Error checking fingerprint:", error);
    return { hasFingerprint: false, exists: false };
  }
};

// ============================================
// CREAR PERSONA RÁPIDAMENTE (sin inscripción)
// ============================================
export const createPersonQuick = async (data: {
  nombres: string;
  apellidos: string;
  ci: string;
  telefono?: string;
  fechaNacimiento?: string | null;
}): Promise<{
  alreadyExists: boolean;
  persona: {
    id: number;
    nombres: string;
    apellidos: string;
    ci: string;
    telefono: string | null;
    fecha_nacimiento: string | null;
  };
}> => {
  try {
    const response = await api.post("/inscription/people", data);
    return response.data;
  } catch (error: any) {
    console.error("Error creating person:", error);
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error("No se pudo crear la persona");
  }
};

export default api;