import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Interfaces completas
export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  maxEntries: number | null;
  sucursales: string[];
  multisucursal: boolean;
  sucursalesMultisucursal: string[];
  isActive: boolean;
  tipoDuracion: 'dias' | 'meses';
  cantidadDuracion: number;
  serviceType?: string;
  hasTimeRange?: boolean;
  startTime?: string;
  endTime?: string;
  hasSpecificDays?: boolean;
  specificDays?: string[];
  requiredPeopleEnabled?: boolean;
  requiredPeople?: number;
}

export interface Sucursal {
  id: number;
  name: string;
}

export interface ServiceType {
  id: string;
  name: string;
}

export interface ServiceFormData {
  name: string;
  description: string;
  price: number;
  maxEntries: number | null;
  sucursales: string[];
  multisucursal: boolean;
  sucursalesMultisucursal: string[];
  unlimited: boolean;
  tipoDuracion: 'dias' | 'meses';
  cantidadDuracion: number | string;
  serviceType: string;
  hasTimeRange: boolean;
  startTime: string;
  endTime: string;
  hasSpecificDays: boolean;
  specificDays: string[];
  requiredPeopleEnabled: boolean;
  requiredPeople: number | string;
}

export interface ApiErrorResponse {
  message: string;
  error?: string;
}

// ============================================
// HELPER: construir payload para el API
// ============================================
const buildServicePayload = (serviceData: ServiceFormData) => {
  const cantidadDuracion =
    typeof serviceData.cantidadDuracion === 'string'
      ? Number(serviceData.cantidadDuracion)
      : serviceData.cantidadDuracion;

  // ✅ CAMBIO: switch apagado → 1 (default). Switch encendido → respeta el valor (incluido 0).
  let requiredPeople: number;
  if (!serviceData.requiredPeopleEnabled) {
    requiredPeople = 1;
  } else {
    if (
      serviceData.requiredPeople === "" ||
      serviceData.requiredPeople === null ||
      serviceData.requiredPeople === undefined
    ) {
      requiredPeople = 0;
    } else {
      const parsed = Number(serviceData.requiredPeople);
      requiredPeople = isNaN(parsed) ? 0 : parsed;
    }
  }

  return {
    name: serviceData.name,
    description: serviceData.description || undefined,
    price: serviceData.price,
    maxEntries: serviceData.unlimited ? null : Number(serviceData.maxEntries),
    sucursales: serviceData.sucursales,
    multisucursal: serviceData.multisucursal,
    sucursalesMultisucursal: serviceData.sucursalesMultisucursal,
    tipoDuracion: serviceData.tipoDuracion,
    cantidadDuracion,
    serviceType: serviceData.serviceType,
    hasTimeRange: serviceData.hasTimeRange,
    startTime: serviceData.hasTimeRange ? serviceData.startTime : undefined,
    endTime: serviceData.hasTimeRange ? serviceData.endTime : undefined,
    hasSpecificDays: serviceData.hasSpecificDays,
    specificDays: serviceData.hasSpecificDays ? serviceData.specificDays : undefined,
    requiredPeopleEnabled: serviceData.requiredPeopleEnabled,
    requiredPeople,
  };
};

// Obtener todos los servicios
export const getServices = async (): Promise<Service[]> => {
  const token = localStorage.getItem("token");
  const response = await axios.get<Service[]>(`${API_URL}/services`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

// Obtener sucursales
export const getSucursales = async (): Promise<Sucursal[]> => {
  const token = localStorage.getItem("token");
  const response = await axios.get<Sucursal[]>(
    `${API_URL}/services/sucursales`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

// Obtener tipos de servicios
export const getServiceTypes = async (): Promise<ServiceType[]> => {
  const token = localStorage.getItem("token");
  const response = await axios.get<ServiceType[]>(
    `${API_URL}/services/types`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

// Crear un nuevo tipo de servicio
export const createServiceType = async (name: string): Promise<ServiceType> => {
  const token = localStorage.getItem("token");
  const response = await axios.post<ServiceType>(
    `${API_URL}/services/types`,
    { name },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

// Crear un nuevo servicio
export const createService = async (
  serviceData: ServiceFormData
): Promise<Service> => {
  const token = localStorage.getItem("token");
  const dataToSend = buildServicePayload(serviceData);

  const response = await axios.post<Service>(
    `${API_URL}/services`,
    dataToSend,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

// Actualizar un servicio
export const updateService = async (
  id: string,
  serviceData: ServiceFormData
): Promise<Service> => {
  const token = localStorage.getItem("token");
  const dataToSend = buildServicePayload(serviceData);

  const response = await axios.put<Service>(
    `${API_URL}/services/${id}`,
    dataToSend,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

// Eliminar un servicio
export const deleteService = async (id: string): Promise<void> => {
  const token = localStorage.getItem("token");
  await axios.delete(`${API_URL}/services/${id}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
};

// Cambiar estado de servicio (activar/desactivar)
export const toggleServiceStatus = async (id: string): Promise<Service> => {
  const token = localStorage.getItem("token");
  const response = await axios.patch<Service>(
    `${API_URL}/services/${id}/toggle-status`,
    {},
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};