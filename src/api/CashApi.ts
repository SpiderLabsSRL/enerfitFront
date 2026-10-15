import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendCashBox {
  id: number;
  nombre: string;
  sucursal_id: number;
  estado: number;
}

export interface CashBox {
  idCaja: number;
  nombre: string;
  sucursalId: number;
  estado: number;
}

interface BackendBranch {
  id: number;
  nombre: string;
  estado: number;
}

export interface Branch {
  idSucursal: number;
  nombre: string;
  estado: number;
}

interface BackendTransaction {
  id: number;
  caja_id: number;
  tipo: 'ingreso' | 'egreso' | 'apertura' | 'cierre';
  descripcion: string;
  monto: string;
  fecha: string;
  usuario_id: number;
  empleado_nombre: string;
}

export interface Transaction {
  idTransaccion: number;
  cajaId: number;
  type: 'ingreso' | 'egreso' | 'apertura' | 'cierre';
  description: string;
  amount: number;
  date: string;
  usuarioId: number;
  empleadoNombre: string;
}

interface BackendCashBoxStatus {
  monto_final: string;
}

export interface CashBoxStatus {
  montoFinal: number;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// NUEVA INTERFACE para totales
export interface FilterTotals {
  totalIngresos: number;
  totalEgresos: number;
  totalCaja: number;
}

interface TransactionsFilters {
  dateFilterType?: "all" | "specific" | "range" | "today" | "yesterday" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth";
  specificDate?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getBranches = async (): Promise<Branch[]> => {
  try {
    const response = await api.get<BackendBranch[]>("/cash/branches");
    return response.data.map((branch) => ({
      idSucursal: branch.id,
      nombre: branch.nombre,
      estado: branch.estado,
    }));
  } catch (error) {
    console.error("Error fetching branches:", error);
    throw new Error("No se pudieron cargar las sucursales");
  }
};

export const getCashBoxesByBranch = async (branchId: number): Promise<CashBox[]> => {
  try {
    const response = await api.get<BackendCashBox[]>(`/cash/branches/${branchId}/cashboxes`);
    return response.data.map((cashbox) => ({
      idCaja: cashbox.id,
      nombre: cashbox.nombre,
      sucursalId: cashbox.sucursal_id,
      estado: cashbox.estado,
    }));
  } catch (error) {
    console.error("Error fetching cash boxes:", error);
    throw new Error("No se pudieron cargar las cajas");
  }
};

export const getCashBoxStatus = async (cashBoxId: number): Promise<CashBoxStatus> => {
  try {
    const response = await api.get<BackendCashBoxStatus>(`/cash/cashboxes/${cashBoxId}/status`);
    return {
      montoFinal: parseFloat(response.data.monto_final)
    };
  } catch (error) {
    console.error("Error fetching cash box status:", error);
    throw new Error("No se pudo cargar el estado de la caja");
  }
};

export const getTransactionsByCashBox = async (
  cashBoxId: number,
  filters: TransactionsFilters = {},
  page: number = 1,
  pageSize: number = 20
): Promise<TransactionsResponse> => {
  try {
    console.log("🔄 Obteniendo transacciones con filtros:", filters, { page, pageSize });

    const params: any = {
      page,
      pageSize,
    };

    if (filters.dateFilterType) params.dateFilterType = filters.dateFilterType;
    if (filters.specificDate) params.specificDate = filters.specificDate;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    const response = await api.get<{
      transactions: BackendTransaction[];
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
    }>(`/cash/cashboxes/${cashBoxId}/transactions`, { params });

    console.log(`✅ Transacciones obtenidas: ${response.data.transactions.length} registros`);
    console.log(`📄 Paginación: Página ${response.data.pagination.page} de ${response.data.pagination.totalPages}`);

    // Procesar las transacciones - MODIFICADO: NO formatear la fecha
    const processedTransactions = response.data.transactions.map((transaction: BackendTransaction) => ({
      idTransaccion: transaction.id,
      cajaId: transaction.caja_id,
      type: transaction.tipo,
      description: transaction.descripcion,
      amount: parseFloat(transaction.monto),
      date: transaction.fecha, // DEJAR LA FECHA COMO VIENE DE LA BD
      usuarioId: transaction.usuario_id,
      empleadoNombre: transaction.empleado_nombre || `Usuario ${transaction.usuario_id}`
    }));

    return {
      transactions: processedTransactions,
      pagination: response.data.pagination,
    };
  } catch (error: any) {
    console.error("❌ Error fetching transactions:", error);
    
    if (error.response?.status === 400) {
      throw new Error(error.response.data.error || "Parámetros inválidos");
    }
    
    throw new Error(
      error.response?.data?.error || "No se pudieron cargar las transacciones",
    );
  }
};

// NUEVA FUNCIÓN: Obtener totales del filtro (sin paginación)
// Verificar que esta función en CashApi.ts esté bien
export const getTotalTransactions = async (
  params: any = {}
): Promise<FilterTotals> => {
  try {
    console.log("📊 Obteniendo totales de transacciones con filtros:", params);

    // Asegurar que cashBoxId sea string para URLSearchParams
    const searchParams = new URLSearchParams();
    
    if (params.cashBoxId) searchParams.append('cashBoxId', params.cashBoxId.toString());
    if (params.dateFilterType) searchParams.append('dateFilterType', params.dateFilterType);
    if (params.specificDate) searchParams.append('specificDate', params.specificDate);
    if (params.startDate) searchParams.append('startDate', params.startDate);
    if (params.endDate) searchParams.append('endDate', params.endDate);

    const response = await api.get<FilterTotals>(`/cash/totals?${searchParams.toString()}`);

    console.log("✅ Totales de transacciones obtenidos:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "❌ Error fetching transaction totals:",
      error.response?.data || error.message,
    );
    
    // Retornar valores por defecto si hay error
    return {
      totalIngresos: 0,
      totalEgresos: 0,
      totalCaja: 0,
    };
  }
};

export const getLactobarTransactions = async (branchId: number): Promise<Transaction[]> => {
  try {
    const response = await api.get<BackendTransaction[]>(`/cash/branches/${branchId}/lactobar/transactions`);
    
    return response.data.map((transaction: BackendTransaction) => ({
      idTransaccion: transaction.id,
      cajaId: transaction.caja_id,
      type: transaction.tipo,
      description: transaction.descripcion,
      amount: parseFloat(transaction.monto),
      date: transaction.fecha,
      usuarioId: transaction.usuario_id,
      empleadoNombre: transaction.empleado_nombre || `Usuario ${transaction.usuario_id}`
    }));
  } catch (error) {
    console.error("Error fetching lactobar transactions:", error);
    throw new Error("No se pudieron cargar las transacciones del lactobar");
  }
};