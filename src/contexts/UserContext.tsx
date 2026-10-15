// src/contexts/UserContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  login as apiLogin,
  verifyToken,
  logout as apiLogout,
  getStoredUserData,
  getStoredToken,
  UserData,
} from "@/api/loginapi";
import { checkSuscripcion } from "@/api/suscripcionApi";

export interface User {
  id?: number;
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
  name: string;
  sucursal?: string;
  sucursalNombre?: string;
}

interface UserContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Función para mapear UserData a User - CORREGIDA
const mapUserDataToUser = (userData: UserData): User => ({
  id: userData.idusuario, // Añadimos id para compatibilidad
  idusuario: userData.idusuario,
  idpersona: userData.idpersona,
  idempleado: userData.idempleado,
  idsucursal: userData.idsucursal,
  idcaja: userData.idcaja,
  rol: userData.rol,
  hora_ingreso: userData.hora_ingreso,
  hora_salida: userData.hora_salida,
  nombres: userData.nombres,
  apellidos: userData.apellidos,
  username: userData.username,
  userType:
    userData.userType || (userData.rol === "cliente" ? "cliente" : "empleado"),
  name: `${userData.nombres} ${userData.apellidos}`,
  sucursal: userData.idsucursal?.toString() || "",
  sucursalNombre:
    userData.rol !== "admin" && userData.sucursalNombre
      ? userData.sucursalNombre
      : undefined,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar token al cargar la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      const token = getStoredToken();
      const storedUserData = getStoredUserData();

      if (token && storedUserData) {
        try {
          const { isValid, user: verifiedUser } = await verifyToken(token);
          if (isValid && verifiedUser) {
            setUser(mapUserDataToUser(verifiedUser));
          } else {
            // Token inválido, limpiar almacenamiento
            apiLogout();
          }
        } catch (error) {
          console.error("Error verifying token:", error);
          apiLogout();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (
    username: string,
    password: string,
  ): Promise<boolean> => {
    try {
      // 1. Primero verificar el estado de la suscripción
      const suscripcionStatus = await checkSuscripcion();

      // 2. Si la suscripción NO está pagada, lanzar error
      if (!suscripcionStatus.pagado) {
        throw new Error("SUSCRIPCION_NO_PAGADA");
      }

      // 3. Si la suscripción está pagada, proceder con el login
      const success = await apiLogin(username, password);

      if (success) {
        const storedUserData = getStoredUserData();
        if (storedUserData) {
          const userData = mapUserDataToUser(storedUserData);
          setUser(userData);
          return true;
        }
      }
      return false;
    } catch (error: any) {
      console.error("Login error:", error);

      // Si es error de suscripción, pasamos el mensaje específico
      if (error.message === "SUSCRIPCION_NO_PAGADA") {
        throw new Error("Acceso restringido: Suscripción no pagada");
      }

      // Para otros errores, usamos el mensaje del backend
      throw new Error(error.message || "Error al iniciar sesión");
    }
  };

  const logout = () => {
    apiLogout();
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
