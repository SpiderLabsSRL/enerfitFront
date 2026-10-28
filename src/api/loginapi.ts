// src/api/LoginApi.ts
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

export interface ApiErrorResponse {
  message: string;
  error?: string;
}

export const login = async (
  username: string,
  password: string,
): Promise<boolean> => {
  try {
    console.log("Iniciando login para usuario:", username);
    console.log("URL de API:", `${API_URL}/login/login`);

    const response = await axios.post<LoginResponse>(
      `${API_URL}/login/login`,
      {
        username,
        password,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 segundos timeout
      },
    );

    console.log("Respuesta del servidor:", response.data);

    // Si el servidor responde con success: false, lanzar error con el mensaje del backend
    if (response.data.success === false) {
      throw new Error(response.data.message);
    }

    if (!response.data.token || !response.data.user) {
      throw new Error("Respuesta del servidor inválida");
    }

    // Validar datos del usuario
    const user = response.data.user;

    // Asignar userType si no está presente
    if (!user.userType) {
      user.userType = user.rol === "cliente" ? "cliente" : "empleado";
    }

    // Verificar datos críticos
    if (!user.idusuario) {
      console.warn("Usuario sin idusuario");
    }

    if (user.userType === "empleado" && !user.idsucursal) {
      console.warn("Empleado sin sucursal asignada:", user);
    }

    // Guardar datos en sessionStorage
    sessionStorage.setItem("token", response.data.token);
    sessionStorage.setItem("userData", JSON.stringify(user));

    // Log para depuración
    console.log("Usuario guardado en sessionStorage:", {
      idusuario: user.idusuario,
      rol: user.rol,
      userType: user.userType,
      idsucursal: user.idsucursal,
      nombres: user.nombres,
      apellidos: user.apellidos,
    });

    return true;
  } catch (error: any) {
    console.error("Error en login:", error);

    if (error.response) {
      const errorMessage =
        error.response.data?.message || error.response.data?.error;

      if (errorMessage) {
        throw new Error(errorMessage);
      } else if (error.response.status === 401) {
        throw new Error("Credenciales incorrectas");
      } else if (error.response.status === 404) {
        throw new Error("Servicio no encontrado");
      } else {
        throw new Error(`Error del servidor: ${error.response.status}`);
      }
    } else if (error.code === "ECONNABORTED") {
      throw new Error("Tiempo de espera agotado. Verifique su conexión.");
    } else if (error.request) {
      throw new Error(
        "No se recibió respuesta del servidor. Verifique su conexión.",
      );
    } else {
      throw error;
    }
  }
};

export const verifyToken = async (
  token: string,
): Promise<{ isValid: boolean; user?: UserData }> => {
  try {
    const response = await axios.get<{ success: boolean; user: UserData }>(
      `${API_URL}/login/verify`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 5000,
      },
    );

    if (response.data.success === false) {
      return { isValid: false };
    }

    // Asegurar que userType esté presente
    const user = response.data.user;
    if (user && !user.userType) {
      user.userType = user.rol === "cliente" ? "cliente" : "empleado";
    }

    return { isValid: true, user };
  } catch (error) {
    console.error("Error al verificar token:", error);
    return { isValid: false };
  }
};

export const logout = (): void => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("userData");
  console.log("Sesión cerrada, sessionStorage limpiado");
};

export const getStoredUserData = (): UserData | null => {
  try {
    const userData = sessionStorage.getItem("userData");
    if (!userData) {
      console.log("No hay userData en sessionStorage");
      return null;
    }

    const parsedData = JSON.parse(userData);

    // Asegurar que userType esté presente en los datos almacenados
    if (!parsedData.userType) {
      parsedData.userType =
        parsedData.rol === "cliente" ? "cliente" : "empleado";
    }

    console.log("UserData recuperado de sessionStorage:", {
      idusuario: parsedData.idusuario,
      rol: parsedData.rol,
      userType: parsedData.userType,
      idsucursal: parsedData.idsucursal,
      nombres: parsedData.nombres,
      apellidos: parsedData.apellidos,
    });

    return parsedData;
  } catch (error) {
    console.error("Error al parsear userData:", error);
    return null;
  }
};

export const getStoredToken = (): string | null => {
  const token = sessionStorage.getItem("token");
  if (!token) {
    console.log("No hay token en sessionStorage");
  }
  return token;
};

// Función auxiliar para verificar si el usuario tiene sucursal
export const userHasSucursal = (user: UserData | null): boolean => {
  if (!user) return false;

  // Admin puede no tener sucursal pero puede ver todos
  if (user.rol === "admin") {
    return true; // Admin tiene acceso global
  }

  // Empleados deben tener sucursal
  if (user.userType === "empleado") {
    return !!user.idsucursal;
  }

  // Clientes pueden no tener sucursal en su userData
  return true;
};

// Función para obtener la sucursal del usuario o valor por defecto
export const getUserSucursalOrDefault = (user: UserData | null): string => {
  if (!user) return "all";

  if (user.rol === "admin") {
    return "all"; // Admin ve todas las sucursales
  }

  if (user.userType === "empleado" && user.idsucursal) {
    return user.idsucursal.toString(); // Empleado ve solo su sucursal
  }

  return "all"; // Por defecto
};
