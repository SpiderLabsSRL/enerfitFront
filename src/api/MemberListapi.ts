// src/api/MemberListapi.ts
import axios from "axios";
import { getStoredUserData } from "./loginapi";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface Service {
  name: string;
  startDate: string;
  expirationDate: string;
  status: "active" | "inactive";
  ingresos_disponibles: number | null;
}

export interface Member {
  id: string;
  name: string;
  ci: string;
  phone: string;
  birthDate: string;
  sucursal: string;
  sucursales?: string[];
  services: Service[];
  status: "active" | "inactive";
  registrationDate: string;
}

export interface MembersResponse {
  members: Member[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  success: boolean;
}

// ✅ Ya NO incluye birthDate
export interface EditMemberRequest {
  nombres: string;
  apellidos: string;
  ci: string;
  phone: string;
}

export interface Branch {
  id: string;
  name: string;
}

const filterActiveServices = (services: Service[]): Service[] => {
  if (!services || !Array.isArray(services)) return [];

  return services.filter((service) => {
    if (!service) return false;

    return true;
  });
};

const getToken = (): string => {
  const token = sessionStorage.getItem("token");

  if (!token) {
    throw new Error(
      "No se encontró token de autenticación. Por favor, inicie sesión nuevamente.",
    );
  }

  return token;
};

export const isServiceActive = (service: Service | undefined): boolean => {
  if (!service) return false;

  if (service.status === "inactive") return false;

  if (
    service.ingresos_disponibles !== null &&
    service.ingresos_disponibles <= 0
  ) {
    return false;
  }

  if (service.expirationDate) {
    try {
      const today = new Date();
      const expirationDate = new Date(service.expirationDate);
      if (expirationDate < today) return false;
    } catch (error) {
      return false;
    }
  }

  return true;
};

export const getMembers = async (
  page: number = 1,
  limit: number = 10,
  searchTerm: string = "",
  serviceFilter: string = "all",
  statusFilter: string = "all",
  sucursalFilter: string = "all",
): Promise<MembersResponse> => {
  try {
    const token = getToken();
    const userData = getStoredUserData();

    let finalSucursalFilter = sucursalFilter;

    if (userData && userData.rol !== "admin") {
      if (userData.idsucursal) {
        finalSucursalFilter = userData.idsucursal.toString();
      } else {
        finalSucursalFilter = "all";
      }
    }

    if (!finalSucursalFilter || finalSucursalFilter === "") {
      finalSucursalFilter = "all";
    }

    console.log("Obteniendo miembros con parámetros:", {
      page,
      limit,
      searchTerm,
      serviceFilter,
      statusFilter,
      finalSucursalFilter,
    });

    const response = await axios.get<MembersResponse>(`${API_URL}/members`, {
      params: {
        page,
        limit,
        searchTerm,
        serviceFilter,
        statusFilter,
        sucursalFilter: finalSucursalFilter,
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      timeout: 15000,
    });

    const filteredMembers: Member[] =
      response.data.members?.map((member) => {
        const activeServices = filterActiveServices(member.services || []);

        return {
          ...member,
          services: activeServices,
          status: member.status,
        };
      }) || [];

    console.log("Miembros obtenidos:", {
      total: response.data.totalCount,
      filtrados: filteredMembers.length,
    });

    return {
      ...response.data,
      members: filteredMembers,
    };
  } catch (error: any) {
    console.error("Error en getMembers:", error);

    if (error.response?.status === 401) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("userData");
      throw new Error("Sesión expirada. Por favor, inicie sesión nuevamente.");
    }

    if (error.response) {
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        "Error al obtener miembros";
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error(
        "No se recibió respuesta del servidor. Verifique su conexión a internet.",
      );
    } else if (error.code === "ECONNABORTED") {
      throw new Error("Tiempo de espera agotado. Intente nuevamente.");
    } else {
      throw new Error("Error de conexión con el servidor");
    }
  }
};

export const getAllMembers = async (
  searchTerm: string = "",
  serviceFilter: string = "all",
  statusFilter: string = "all",
  sucursalFilter: string = "all",
): Promise<Member[]> => {
  try {
    const token = getToken();
    const userData = getStoredUserData();

    let finalSucursalFilter = sucursalFilter;

    if (userData && userData.rol !== "admin") {
      if (userData.userType === "empleado" && userData.idsucursal) {
        finalSucursalFilter = userData.idsucursal.toString();
      } else if (!userData.idsucursal) {
        finalSucursalFilter = "all";
      }
    }

    const response = await axios.get<Member[]>(`${API_URL}/members/all`, {
      params: {
        searchTerm,
        serviceFilter,
        statusFilter,
        sucursalFilter: finalSucursalFilter,
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      timeout: 15000,
    });

    const filteredMembers: Member[] =
      response.data?.map((member) => {
        const activeServices = filterActiveServices(member.services || []);
        const isActive = activeServices.length > 0;

        return {
          ...member,
          services: activeServices,
          status: isActive ? "active" : "inactive",
        };
      }) || [];

    return filteredMembers;
  } catch (error: any) {
    console.error("Error en getAllMembers:", error);

    if (error.response?.status === 401) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("userData");
      throw new Error("Sesión expirada. Por favor, inicie sesión nuevamente.");
    }

    if (error.response) {
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        "Error al obtener miembros";
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error("No se recibió respuesta del servidor");
    } else {
      throw new Error("Error de conexión con el servidor");
    }
  }
};

export const editMember = async (
  memberId: string,
  memberData: EditMemberRequest,
): Promise<{ message: string }> => {
  try {
    const token = getToken();

    const response = await axios.put<{ message: string }>(
      `${API_URL}/members/${memberId}`,
      memberData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000,
      },
    );

    return response.data;
  } catch (error: any) {
    console.error("Error en editMember:", error);

    if (error.response?.status === 401) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("userData");
      throw new Error("Sesión expirada. Por favor, inicie sesión nuevamente.");
    }

    if (error.response) {
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        "Error al editar miembro";
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error("No se recibió respuesta del servidor");
    } else {
      throw new Error("Error de conexión con el servidor");
    }
  }
};

export const getAvailableServices = async (): Promise<string[]> => {
  try {
    const token = getToken();

    const response = await axios.get<string[]>(
      `${API_URL}/members/services/available`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000,
      },
    );

    return response.data;
  } catch (error: any) {
    console.error("Error en getAvailableServices:", error);

    if (error.response?.status === 401) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("userData");
      throw new Error("Sesión expirada. Por favor, inicie sesión nuevamente.");
    }

    if (error.response) {
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        "Error al obtener servicios disponibles";
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error("No se recibió respuesta del servidor");
    } else {
      throw new Error("Error de conexión con el servidor");
    }
  }
};

export const getAvailableBranches = async (): Promise<Branch[]> => {
  try {
    const token = getToken();
    const userData = getStoredUserData();

    const response = await axios.get<Branch[]>(
      `${API_URL}/members/branches/available`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000,
      },
    );

    if (userData && userData.rol !== "admin" && userData.idsucursal) {
      return response.data.filter(
        (branch) => branch.id === userData.idsucursal?.toString(),
      );
    }

    return response.data;
  } catch (error: any) {
    console.error("Error en getAvailableBranches:", error);

    if (error.response?.status === 401) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("userData");
      throw new Error("Sesión expirada. Por favor, inicie sesión nuevamente.");
    }

    if (error.response) {
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        "Error al obtener sucursales disponibles";
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error("No se recibió respuesta del servidor");
    } else {
      throw new Error("Error de conexión con el servidor");
    }
  }
};

export const deleteMember = async (
  memberId: string,
): Promise<{ message: string }> => {
  try {
    const token = getToken();

    const response = await axios.delete<{ message: string }>(
      `${API_URL}/members/${memberId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000,
      },
    );

    return response.data;
  } catch (error: any) {
    console.error("Error en deleteMember:", error);

    if (error.response?.status === 401) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("userData");
      throw new Error("Sesión expirada. Por favor, inicie sesión nuevamente.");
    }

    if (error.response) {
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        "Error al eliminar miembro";
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error("No se recibió respuesta del servidor");
    } else {
      throw new Error("Error de conexión con el servidor");
    }
  }
};

export const updateServiceDates = async (
  memberId: string,
  serviceName: string,
  startDate: string,
  expirationDate: string,
): Promise<{ message: string }> => {
  try {
    const token = getToken();

    const response = await axios.put<{ message: string }>(
      `${API_URL}/members/${memberId}/service-dates`,
      { serviceName, startDate, expirationDate },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000,
      },
    );

    return response.data;
  } catch (error: any) {
    console.error("Error en updateServiceDates:", error);

    if (error.response?.status === 401) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("userData");
      throw new Error("Sesión expirada. Por favor, inicie sesión nuevamente.");
    }

    if (error.response) {
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        "Error al actualizar fechas";
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error("No se recibió respuesta del servidor");
    } else {
      throw new Error("Error de conexión con el servidor");
    }
  }
};