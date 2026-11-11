import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ============================================================
// MENSAJES POR DEFECTO — SAVAGE FITNESS CLUB
// ============================================================
export const MENSAJE_BIENVENIDA = `¡Gracias por ser parte de SAVAGE FITNESS CLUB! 🏋️‍♂️ Estamos emocionados de tenerte en nuestra familia fitness. Te invitamos a visitar nuestra página: https://enerfit.spiderlabsystems.com/home`;

export const buildMensajeVencimiento = (
  nombre: string,
  fechaVencimiento: string,
  diasRestantes: number
): string =>
  `¡Hola ${nombre}! 👋 Te saludamos de SAVAGE FITNESS CLUB 🏋️‍♂️ Tu membresía vence el ${fechaVencimiento} (${
    diasRestantes === 1 ? "1 día restante" : `${diasRestantes} días restantes`
  }). ¡No pierdas tu racha! Renueva hoy y sigue alcanzando tus metas. Visítanos: https://enerfit.spiderlabsystems.com/home`;

// ============================================================
// TIPOS
// ============================================================
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

// ============================================================
// HELPER: normaliza un teléfono para WhatsApp (wa.me)
// - Quita espacios, guiones, paréntesis y el signo +
// - Deja SOLO dígitos (código de país + número)
// - NO inventa prefijos: si el usuario escribió "+5 454849",
//   se envía "5454849". Si escribió "+591 71234567",
//   se envía "59171234567".
// ============================================================
export const normalizePhoneForWhatsApp = (phone: string): string => {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
};

// ============================================================
// GET: NUEVOS MIEMBROS (bienvenida)
// ============================================================
export const getNewMembers = async (sucursalId: number): Promise<NewMember[]> => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/reminders/new-members/${sucursalId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const rows: NewMember[] = response.data;

    // 🔑 Sobrescribe el mensaje por defecto con el de SAVAGE FITNESS CLUB
    return rows.map((member) => ({
      ...member,
      mensaje: MENSAJE_BIENVENIDA,
    }));
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

// ============================================================
// GET: MIEMBROS POR VENCER (recordatorio)
// ============================================================
export const getExpiringMembers = async (sucursalId: number): Promise<ExpiringMember[]> => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/reminders/expiring-members/${sucursalId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const rows: ExpiringMember[] = response.data;

    // 🔑 Sobrescribe el mensaje con el recordatorio personalizado de SAVAGE FITNESS CLUB
    return rows.map((member) => ({
      ...member,
      mensaje: buildMensajeVencimiento(
        member.nombre,
        member.fechaVencimiento,
        member.diasRestantes
      ),
    }));
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

// ============================================================
// GET: CUMPLEAÑEROS
// ============================================================
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

// ============================================================
// ENVIAR WHATSAPP
// Acepta el teléfono tal cual venga (con +, espacios, guiones).
// Internamente lo normaliza a solo dígitos para wa.me.
// ============================================================
export const sendWhatsAppMessage = async (
  phone: string,
  message: string
): Promise<void> => {
  try {
    const cleanPhone = normalizePhoneForWhatsApp(phone);

    if (!cleanPhone || cleanPhone.length < 6) {
      throw new Error(
        "El número de teléfono no es válido. Debe incluir el código de país (ej: 59171234567)."
      );
    }

    const encodedMessage = encodeURIComponent(message);
    // ✅ web.whatsapp.com acepta el número sin "+", solo dígitos
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
  } catch (error: any) {
    throw new Error(
      error.message || "Error al preparar el mensaje de WhatsApp"
    );
  }
};