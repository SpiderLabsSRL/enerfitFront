// src/api/loginapi.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface Horario {
  dia_semana: number;
  hora_ingreso: string;
  hora_salida: string;
}

export interface UserData {
  idpersona: number;
  idempleado?: number;
  idusuario: number;
  idcaja?: number;
  idsucursal?: number;
  rol: string;
  hora_ingreso?: string;
  hora_salida?: string;
  nombres: string;
  apellidos: string;
  username: string;
  userType: "empleado" | "cliente";
  sucursalNombre?: string;
  horarios?: Horario[];
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: UserData;
  expiresIn: string;
}

export const login = async (
  username: string,
  password: string,
): Promise<boolean> => {
  localStorage.removeItem("token");
  localStorage.removeItem("userData");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("userData");

  try {
    const response = await axios.post<LoginResponse>(
      `${API_URL}/login/login`,
      { username, password },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 },
    );

    if (response.data.success === false) {
      throw new Error(response.data.message);
    }

    if (!response.data.token || !response.data.user) {
      throw new Error("Respuesta del servidor inválida");
    }

    const user = response.data.user;
    if (!user.userType) {
      user.userType = user.rol === "cliente" ? "cliente" : "empleado";
    }

    sessionStorage.setItem("token", response.data.token);
    sessionStorage.setItem("userData", JSON.stringify(user));

    return true;
  } catch (error: any) {
    if (error.response) {
      const errorMessage = error.response.data?.message || error.response.data?.error;
      if (errorMessage) throw new Error(errorMessage);
      if (error.response.status === 401) throw new Error("Credenciales incorrectas");
    } else if (error.code === "ECONNABORTED") {
      throw new Error("Tiempo de espera agotado.");
    } else if (error.request) {
      throw new Error("No se recibió respuesta del servidor.");
    }
    throw error;
  }
};

// ============================================
// 🆕 LOGIN POR HUELLA (Corregido)
// ============================================
export const loginWithFingerprint = async (ci: string): Promise<boolean> => {
  // 🔥 LIMPIEZA CRUCIAL ANTES DE PEDIR EL NUEVO TOKEN
  localStorage.removeItem("token");
  localStorage.removeItem("userData");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("userData");

  try {
    const response = await axios.post<LoginResponse>(
      `${API_URL}/login/fingerprint`,
      { ci },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 },
    );

    if (response.data.success === false) {
      throw new Error(response.data.message);
    }

    if (!response.data.token || !response.data.user) {
      throw new Error("Respuesta del servidor inválida");
    }

    const user = response.data.user;
    if (!user.userType) {
      user.userType = user.rol === "cliente" ? "cliente" : "empleado";
    }

    sessionStorage.setItem("token", response.data.token);
    sessionStorage.setItem("userData", JSON.stringify(user));

    return true;
  } catch (error: any) {
    if (error.response) {
      const errorMessage = error.response.data?.message || error.response.data?.error;
      if (errorMessage) throw new Error(errorMessage);
    }
    throw error;
  }
};

export const verifyToken = async (token: string) => {
  try {
    const response = await axios.get(`${API_URL}/login/verify`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000,
    });
    return { isValid: response.data.success, user: response.data.user };
  } catch (error) {
    return { isValid: false };
  }
};

export const logout = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("userData");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("userData");
};

export const getStoredUserData = (): UserData | null => {
  try {
    const userData = sessionStorage.getItem("userData");
    if (!userData) return null;
    const parsedData = JSON.parse(userData);
    if (!parsedData.userType) {
      parsedData.userType = parsedData.rol === "cliente" ? "cliente" : "empleado";
    }
    return parsedData;
  } catch (error) {
    return null;
  }
};

export const getStoredToken = (): string | null => {
  return sessionStorage.getItem("token");
};

export const userHasSucursal = (user: UserData | null): boolean => {
  if (!user) return false;
  if (user.rol === "admin") return true;
  if (user.userType === "empleado") return !!user.idsucursal;
  return true;
};

export const getUserSucursalOrDefault = (user: UserData | null): string => {
  if (!user) return "all";
  if (user.rol === "admin") return "all";
  if (user.userType === "empleado" && user.idsucursal) {
    return user.idsucursal.toString();
  }
  return "all";
};