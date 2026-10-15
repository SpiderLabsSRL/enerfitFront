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

export interface SalesResponse {
  sales: SaleRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
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

interface SalesFilters {
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
  page?: number;
  pageSize?: number;
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
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================
// HELPER: Aplica sucursal forzada si no es admin
// ============================================
function withForcedSucursal(filters: SalesFilters): SalesFilters {
  const userData = getStoredUserData();
  if (!userData) return filters;

  const rol = (userData.rol || "").toLowerCase().trim();
  if (rol === "admin" || rol === "superadmin") {
    return filters;
  }
  if (userData.idsucursal) {
    return { ...filters, sucursal: userData.idsucursal.toString() };
  }
  return filters;
}

// ============================================
// ✅ HELPER: Fuerza el filtro empleadoId cuando el rol es recepcionista.
//    Enviamos el idusuario del JWT (columna `id` de usuarios), que es
//    lo que el backend espera para aplicar `empleado_id = ...`.
//    El backend de todos modos lo re-forzará siempre.
// ============================================
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

// ============================================
// Aplica ambos forzados
// ============================================
function applyForcedFilters(filters: SalesFilters): SalesFilters {
  return withForcedEmpleado(withForcedSucursal(filters));
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
  const efectivoPatterns = [
    /(?:efectivo|Efectivo)\s*[:=]?\s*(?:Bs\.?)?\s*([\d.,]+)/i,
  ];

  for (const pattern of efectivoPatterns) {
    const match = detallePago.match(pattern);
    if (match) {
      efectivo = parseFloat(match[1].replace(",", "."));
      break;
    }
  }

  let qr = 0;
  const qrPatterns = [/(?:QR|qr|Q\.R\.)\s*[:=]?\s*(?:Bs\.?)?\s*([\d.,]+)/i];

  for (const pattern of qrPatterns) {
    const match = detallePago.match(pattern);
    if (match) {
      qr = parseFloat(match[1].replace(",", "."));
      break;
    }
  }

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

    const params: any = {};

    if (appliedFilters.dateFilterType)
      params.dateFilterType = appliedFilters.dateFilterType;
    if (appliedFilters.specificDate)
      params.specificDate = appliedFilters.specificDate;
    if (appliedFilters.startDate) params.startDate = appliedFilters.startDate;
    if (appliedFilters.endDate) params.endDate = appliedFilters.endDate;
    if (appliedFilters.sucursal) params.sucursal = appliedFilters.sucursal;
    if (appliedFilters.empleadoId)
      params.empleadoId = appliedFilters.empleadoId;

    params.page = page;
    params.pageSize = pageSize;

    const response = await api.get<{
      sales: BackendSaleRecord[];
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
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

    return {
      sales: processedSales,
      pagination: response.data.pagination,
    };
  } catch (error: any) {
    console.error(
      "❌ Error fetching sales:",
      error.response?.data || error.message
    );

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

    const params: any = {};

    if (appliedFilters.dateFilterType)
      params.dateFilterType = appliedFilters.dateFilterType;
    if (appliedFilters.specificDate)
      params.specificDate = appliedFilters.specificDate;
    if (appliedFilters.startDate) params.startDate = appliedFilters.startDate;
    if (appliedFilters.endDate) params.endDate = appliedFilters.endDate;
    if (appliedFilters.sucursal) params.sucursal = appliedFilters.sucursal;
    if (appliedFilters.empleadoId)
      params.empleadoId = appliedFilters.empleadoId;

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

    const sucursalesFiltradas = response.data.filter(
      (sucursal) => sucursal.id !== "all"
    );

    return [{ id: "all", name: "Todas las sucursales" }, ...sucursalesFiltradas];
  } catch (error: any) {
    console.error(
      "❌ Error fetching sucursales:",
      error.response?.data || error.message
    );

    throw new Error("No se pudieron cargar las sucursales");
  }
};