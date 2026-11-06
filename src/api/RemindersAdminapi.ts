import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface NewMember {
  id: string;
  nombre: string;
  telefono: string;
  servicio: string;
  fechaRegistro: string;
  mensaje: string;
}

export interface ExpiringMember {
  id: string;
  nombre: string;
  telefono: string;
  servicio: string;
  fechaVencimiento: string;
  diasRestantes: number;
  mensaje: string;
}

export interface BirthdayMember {
  id: string;
  nombre: string;
  telefono: string;
  servicio: string;
  fechaNacimiento: string;
  edad: number;
  mensaje: string;
}

export interface PersonForMessage {
  id: string;
  personaId: number;
  nombre: string;
  telefono: string;
  servicios: string[];
}

export interface ApiErrorResponse {
  message: string;
  error?: string;
}

export const getNewMembers = async (sucursalId: number): Promise<NewMember[]> => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/reminders/new-members/${sucursalId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        "Error al obtener nuevos miembros";
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error("No se recibió respuesta del servidor");
    } else {
      throw new Error("Error al configurar la solicitud");
    }
  }
};

export const getExpiringMembers = async (sucursalId: number): Promise<ExpiringMember[]> => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/reminders/expiring-members/${sucursalId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        "Error al obtener miembros con membresías próximas a vencer";
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error("No se recibió respuesta del servidor");
    } else {
      throw new Error("Error al configurar la solicitud");
    }
  }
};

export const getBirthdayMembers = async (sucursalId: number): Promise<BirthdayMember[]> => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/reminders/birthday-members/${sucursalId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        "Error al obtener miembros que cumplen años hoy";
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error("No se recibió respuesta del servidor");
    } else {
      throw new Error("Error al configurar la solicitud");
    }
  }
};

/**
 * Obtiene todas las personas inscritas en la sucursal.
 * Si serviceFilter viene (y no es "all"), filtra por nombre de servicio.
 */
export const getAllPersons = async (
  sucursalId: number,
  serviceFilter?: string | null
): Promise<PersonForMessage[]> => {
  try {
    const token = localStorage.getItem("token");
    const params: Record<string, string> = {};
    if (serviceFilter && serviceFilter !== "all" && serviceFilter.trim() !== "") {
      params.service = serviceFilter;
    }
    const response = await axios.get(
      `${API_URL}/reminders/all-persons/${sucursalId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params,
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        "Error al obtener personas inscritas";
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error("No se recibió respuesta del servidor");
    } else {
      throw new Error("Error al configurar la solicitud");
    }
  }
};

/**
 * Obtiene los nombres de servicios disponibles para el dropdown de filtros.
 */
export const getServiceNames = async (sucursalId: number): Promise<string[]> => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(
      `${API_URL}/reminders/services/${sucursalId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        "Error al obtener servicios para filtro";
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error("No se recibió respuesta del servidor");
    } else {
      throw new Error("Error al configurar la solicitud");
    }
  }
};

export const sendWhatsAppMessage = async (
  phone: string,
  message: string
): Promise<void> => {
  try {
    // Abrir WhatsApp Web con el número y mensaje predefinido
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
    
    // Abrir en una nueva ventana
    window.open(whatsappUrl, '_blank');
  } catch (error: any) {
    throw new Error("Error al preparar el mensaje de WhatsApp");
  }
};