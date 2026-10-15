// src/api/sidebarPasswordApi.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

const api = axios.create({
  baseURL: `${API_URL}/password`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Obtener userId del localStorage según tu estructura de datos
const getCurrentUserId = (): number | null => {
  try {
    // Obtener userData del localStorage según tu estructura
    const userDataStr = localStorage.getItem("userData");

    if (!userDataStr) {
      console.warn("No se encontró userData en localStorage");
      return null;
    }

    const userData = JSON.parse(userDataStr);
    console.log("UserData encontrado:", userData); // Para debug

    // Según tu interfaz UserData, el campo es idusuario
    if (userData && userData.idusuario) {
      return userData.idusuario;
    }

    // También verificar otros campos posibles por si acaso
    if (userData && userData.id) {
      return userData.id;
    }

    console.warn("No se encontró idusuario en userData:", userData);
    return null;
  } catch (error) {
    console.error("Error obteniendo userId del localStorage:", error);
    return null;
  }
};

export const changePassword = async (
  data: ChangePasswordRequest,
): Promise<ChangePasswordResponse> => {
  try {
    // Obtener el userId actual
    const userId = getCurrentUserId();

    if (!userId) {
      throw new Error(
        "No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.",
      );
    }

    console.log("User ID obtenido para cambio de contraseña:", userId); // Para debug

    // Enviar el userId junto con las contraseñas
    const requestData = {
      ...data,
      userId: userId,
    };

    console.log("Enviando datos al servidor:", requestData); // Para debug

    const response = await api.post<ChangePasswordResponse>(
      "/change",
      requestData,
    );
    return response.data;
  } catch (error: any) {
    console.error("Error changing password:", error);
    if (axios.isAxiosError(error) && error.response) {
      const errorMessage =
        error.response.data.message || "No se pudo cambiar la contraseña";
      throw new Error(errorMessage);
    }
    throw new Error("Error de conexión al servidor");
  }
};
