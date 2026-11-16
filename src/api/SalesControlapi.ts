// src/api/SalesControlapi.ts  (ENERFIT — fusionado con lógica de Mutant)
import axios from "axios";
import { getStoredUserData } from "./loginapi";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ============================================
// TIPOS BACKEND
// ============================================
export interface BackendSaleRecord {
  id: string;
  fecha: string;
  cliente?: string;
  empleado: string;
  sucursal: string;
  tipo: "producto" | "servicio";
  detalle: string;
  subtotal: string;
  descuento: string;
  total: string;
  formaPago: "efectivo" | "qr" | "mixto";
  efectivo?: number | string;
  qr?: number | string;
  descripcionDescuento?: string;
  justificacionDescuento?: string;
  detalle_pago?: string;
  items?: any[];
}

// ============================================
// TIPOS FRONTEND
// ============================================
export interface SaleItem {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface SaleRecord {
  id: string;
  fecha: string;
  cliente?: string;
  empleado: string;
  sucursal: string;
  tipo: "producto" | "servicio";
  detalle: string;
  items?: SaleItem[];
  subtotal: number;
  descuento: number;
  total: number;
  formaPago: "efectivo" | "qr" | "mixto";
  efectivo?: number;
  qr?: number;
  descripcionDescuento?: string;
  justificacionDescuento?: string;
}

export interface Sucursal {
  id: string;
  name: string;
}

export interface Empleado {
  id: string;
  nombre: string;
  sucursalId?: string | null;
}

export interface SalesPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  totalProductos?: number;
  totalServicios?: number;
}

export interface SalesResponse {
  sales: SaleRecord[];
  pagination: SalesPagination;
}

export interface FilterTotals {
  totalGeneral: number;
  efectivoGeneral: number;
  qrGeneral: number;
  totalProductos: number;
  efectivoProductos: number;
  qrProductos: number;
  totalServicios: number;
  efectivoServicios: number;
  qrServicios: number;
}

export interface ResumenDetallado {
  productos: {
    items: { nombre: string; cantidad: number }[];
    totalGeneral: number;
    totalEfectivo: number;
    totalQr: number;
  };
  servicios: {
    items: { nombre: string; cantidad: number }[];
    totalGeneral: number;
    totalEfectivo: number;
    totalQr: number;
  };
}

export interface AnularVentaResponse {
  success: boolean;
  message: string;
  ventaId: number;
  tipo: "producto" | "servicio";
}

export interface SalesFilters {
  dateFilterType?:
    | "all"
    | "specific"
    | "range"
    | "today"
    | "yesterday"
    | "thisWeek"
    | "lastWeek"
    | "thisMonth"
    | "lastMonth";
  specificDate?: string;
  startDate?: string;
  endDate?: string;
  sucursal?: string;
  empleadoId?: string;
  metodoPago?: "efectivo" | "qr" | "mixto" | "all";
  tipo?: "producto" | "servicio";
  page?: number;
  pageSize?: number;
}

// ============================================
// AXIOS INSTANCE
// ============================================
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Preferir sessionStorage (sesión activa); fallback a localStorage
api.interceptors.request.use((config) => {
  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Manejo global de 401
let isRedirectingToLogin = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const msg =
        error.response.data?.message ||
        error.response.data?.error ||
        "Sesión expirada";

      console.warn("🔒 Sesión expirada:", msg);

      sessionStorage.removeItem("token");
      sessionStorage.removeItem("userData");
      localStorage.removeItem("token");

      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login") &&
        !isRedirectingToLogin
      ) {
        isRedirectingToLogin = true;
        try {
          sessionStorage.setItem(
            "redirect_after_login",
            window.location.pathname + window.location.search
          );
        } catch {
          /* noop */
        }
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  }
);

// ============================================
// HELPERS DE FILTROS FORZADOS
// ============================================
function withForcedSucursal(filters: SalesFilters): SalesFilters {
  const userData = getStoredUserData();
  if (!userData) return filters;

  const rol = (userData.rol || "").toLowerCase().trim();
  if (rol === "admin" || rol === "superadmin") return filters;

  if (userData.idsucursal) {
    return { ...filters, sucursal: userData.idsucursal.toString() };
  }
  return filters;
}

function withForcedEmpleado(filters: SalesFilters): SalesFilters {
  const userData = getStoredUserData();
  if (!userData) return filters;

  const rol = (userData.rol || "").toLowerCase().trim();
  if (rol === "recepcionista") {
    const usuarioForzado =
      userData.idusuario != null
        ? userData.idusuario.toString()
        : userData.idpersona != null
        ? userData.idpersona.toString()
        : null;

    if (usuarioForzado) {
      return { ...filters, empleadoId: usuarioForzado };
    }
  }
  return filters;
}

function applyForcedFilters(filters: SalesFilters): SalesFilters {
  return withForcedEmpleado(withForcedSucursal(filters));
}

function buildQueryParams(filters: SalesFilters): Record<string, any> {
  const params: Record<string, any> = {};
  if (filters.dateFilterType) params.dateFilterType = filters.dateFilterType;
  if (filters.specificDate) params.specificDate = filters.specificDate;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.sucursal && filters.sucursal !== "all")
    params.sucursal = filters.sucursal;
  if (filters.empleadoId && filters.empleadoId !== "all")
    params.empleadoId = filters.empleadoId;
  if (filters.metodoPago && filters.metodoPago !== "all")
    params.metodoPago = filters.metodoPago;
  if (filters.tipo) params.tipo = filters.tipo;
  return params;
}

// ============================================
// PARSE DETALLE_PAGO
// ============================================
const parseDetallePago = (
  detallePago: string | undefined,
  total: number,
  formaPago: string
): { efectivo: number; qr: number } => {
  if (!detallePago) {
    if (formaPago === "efectivo") return { efectivo: total, qr: 0 };
    if (formaPago === "qr") return { efectivo: 0, qr: total };
    if (formaPago === "mixto") return { efectivo: total / 2, qr: total / 2 };
    return { efectivo: 0, qr: 0 };
  }

  let efectivo = 0;
  const eMatch = detallePago.match(
    /(?:efectivo|Efectivo)\s*[:=]?\s*(?:Bs\.?)?\s*([\d.,]+)/i
  );
  if (eMatch) efectivo = parseFloat(eMatch[1].replace(",", ".")) || 0;

  let qr = 0;
  const qMatch = detallePago.match(
    /(?:QR|qr|Q\.R\.)\s*[:=]?\s*(?:Bs\.?)?\s*([\d.,]+)/i
  );
  if (qMatch) qr = parseFloat(qMatch[1].replace(",", ".")) || 0;

  if (formaPago === "mixto" && efectivo === 0 && qr === 0 && total > 0) {
    efectivo = total / 2;
    qr = total / 2;
  }

  return { efectivo, qr };
};

// ============================================
// GET SALES
// ============================================
export const getSales = async (
  filters: SalesFilters = {},
  page: number = 1,
  pageSize: number = 20
): Promise<SalesResponse> => {
  try {
    const appliedFilters = applyForcedFilters(filters);
    const params = buildQueryParams(appliedFilters);
    params.page = page;
    params.pageSize = pageSize;

    const response = await api.get<{
      sales: BackendSaleRecord[];
      pagination: SalesPagination;
    }>("/sales", { params });

    const processedSales = response.data.sales.map(
      (sale: BackendSaleRecord): SaleRecord => {
        const total = parseFloat(sale.total) || 0;

        let efectivo =
          typeof sale.efectivo === "number"
            ? sale.efectivo
            : typeof sale.efectivo === "string"
            ? parseFloat(sale.efectivo) || 0
            : 0;

        let qr =
          typeof sale.qr === "number"
            ? sale.qr
            : typeof sale.qr === "string"
            ? parseFloat(sale.qr) || 0
            : 0;

        if (sale.formaPago === "mixto" && efectivo === 0 && qr === 0) {
          const parsed = parseDetallePago(
            sale.detalle_pago,
            total,
            sale.formaPago
          );
          efectivo = parsed.efectivo;
          qr = parsed.qr;
        }

        return {
          id: sale.id.toString(),
          fecha: sale.fecha,
          cliente: sale.cliente,
          empleado: sale.empleado,
          sucursal: sale.sucursal,
          tipo: sale.tipo,
          detalle: sale.detalle,
          items: sale.items,
          subtotal:
            typeof sale.subtotal === "string"
              ? parseFloat(sale.subtotal)
              : sale.subtotal,
          descuento:
            typeof sale.descuento === "string"
              ? parseFloat(sale.descuento)
              : sale.descuento,
          total,
          formaPago: sale.formaPago,
          efectivo,
          qr,
          descripcionDescuento: sale.descripcionDescuento,
          justificacionDescuento: sale.justificacionDescuento,
        };
      }
    );

    return { sales: processedSales, pagination: response.data.pagination };
  } catch (error: any) {
    console.error(
      "❌ Error fetching sales:",
      error.response?.data || error.message
    );

    if (error.response?.status === 401) {
      throw new Error("Tu sesión ha expirado. Inicia sesión nuevamente.");
    }
    if (error.response?.status === 400) {
      throw new Error(error.response.data.error || "Parámetros inválidos");
    }
    throw new Error(
      error.response?.data?.error || "No se pudieron cargar las ventas"
    );
  }
};

// ============================================
// GET TOTAL SALES
// ============================================
export const getTotalSales = async (
  filters: SalesFilters = {}
): Promise<FilterTotals> => {
  try {
    const appliedFilters = applyForcedFilters(filters);
    const params = buildQueryParams(appliedFilters);
    const response = await api.get<FilterTotals>("/sales/totals", { params });
    return response.data;
  } catch (error: any) {
    console.error(
      "❌ Error fetching totals:",
      error.response?.data || error.message
    );
    return {
      totalGeneral: 0,
      efectivoGeneral: 0,
      qrGeneral: 0,
      totalProductos: 0,
      efectivoProductos: 0,
      qrProductos: 0,
      totalServicios: 0,
      efectivoServicios: 0,
      qrServicios: 0,
    };
  }
};

// ============================================
// GET RESUMEN DETALLADO  (nuevo, de Mutant)
// ============================================
export const getResumenDetallado = async (
  filters: SalesFilters = {}
): Promise<ResumenDetallado> => {
  try {
    const appliedFilters = applyForcedFilters(filters);
    const params = buildQueryParams(appliedFilters);
    const response = await api.get<ResumenDetallado>("/sales/resumen", {
      params,
    });
    return response.data;
  } catch (error: any) {
    console.error(
      "❌ Error fetching resumen:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.error || "No se pudo cargar el resumen"
    );
  }
};

// ============================================
// GET SALE DETAILS
// ============================================
export const getSaleDetails = async (
  saleId: string,
  saleType: "producto" | "servicio"
): Promise<any> => {
  try {
    const response = await api.get(`/sales/${saleId}`, {
      params: { type: saleType },
    });
    return response.data;
  } catch (error: any) {
    console.error(
      "❌ Error fetching sale details:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.error ||
        "No se pudieron cargar los detalles de la venta"
    );
  }
};

// ============================================
// GET SUCURSALES
// ============================================
export const getSucursales = async (): Promise<Sucursal[]> => {
  try {
    const response = await api.get<Sucursal[]>("/sales/sucursales/list");
    const filtered = response.data.filter((s) => s.id !== "all");
    return [{ id: "all", name: "Todas las sucursales" }, ...filtered];
  } catch (error: any) {
    console.error(
      "❌ Error fetching sucursales:",
      error.response?.data || error.message
    );
    if (error.response?.status === 401) {
      throw new Error("Tu sesión ha expirado. Inicia sesión nuevamente.");
    }
    throw new Error("No se pudieron cargar las sucursales");
  }
};

// ============================================
// GET EMPLEADOS (solo recepcionistas) — de Mutant
// ============================================
export const getEmpleados = async (
  sucursal?: string
): Promise<Empleado[]> => {
  try {
    const params: Record<string, any> = {};
    if (sucursal && sucursal !== "all") params.sucursal = sucursal;
    const response = await api.get<Empleado[]>("/sales/empleados/list", {
      params,
    });
    return response.data;
  } catch (error: any) {
    console.error(
      "❌ Error fetching empleados:",
      error.response?.data || error.message
    );
    throw new Error("No se pudieron cargar los empleados");
  }
};

// ============================================
// ANULAR VENTA
// ============================================
export const anularVenta = async (
  saleId: string,
  saleType: "producto" | "servicio"
): Promise<AnularVentaResponse> => {
  try {
    const response = await api.delete<AnularVentaResponse>(`/sales/${saleId}`, {
      params: { type: saleType },
    });
    return response.data;
  } catch (error: any) {
    console.error(
      "❌ Error anulando venta:",
      error.response?.data || error.message
    );
    if (error.response?.status === 403) {
      throw new Error(
        error.response.data.error ||
          "Solo un administrador puede anular ventas"
      );
    }
    if (error.response?.status === 400) {
      throw new Error(
        error.response.data.error || "No se puede anular esta venta"
      );
    }
    if (error.response?.status === 404) {
      throw new Error(error.response.data.error || "La venta no existe");
    }
    throw new Error(
      error.response?.data?.error || "No se pudo anular la venta"
    );
  }
};