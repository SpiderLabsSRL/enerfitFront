import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface BackendTransaction {
  idtransaccion: number;
  tipo: 'ingreso' | 'egreso' | 'apertura' | 'cierre';
  descripcion: string;
  monto: string;
  fecha: string;
  caja_id: number;
  usuario_id: number;
  nombre_caja?: string;
  nombre_usuario?: string;
}

export interface Transaction {
  idTransaccion: number;
  tipo: 'ingreso' | 'egreso' | 'apertura' | 'cierre';
  descripcion: string;
  monto: number;
  fecha: string;
  idCaja: number;
  idUsuario: number;
  nombreCaja?: string;
  nombreUsuario?: string;
}

export interface TransactionRequest {
  tipo: 'ingreso' | 'egreso' | 'apertura' | 'cierre';
  descripcion: string;
  monto: number;
  idCaja: number;
  idUsuario: number;
}

export interface CashRegisterStatus {
  idEstadoCaja: number;
  idCaja: number;
  estado: 'abierta' | 'cerrada';
  montoInicial: number;
  montoFinal: number;
  idUsuario: number;
  nombreCaja?: string;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const getTransactionsByCashRegisterAndUser = async (idCaja: number, idUsuario: number): Promise<Transaction[]> => {
  try {
    const response = await api.get<BackendTransaction[]>(`/transactions/transactions/caja/${idCaja}`, {
      params: { idUsuario }
    });
    return response.data.map(mapBackendTransaction);
  } catch (error: any) {
    console.error("Error fetching transactions by cash register and user:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "No se pudieron cargar las transacciones de la caja");
  }
};

export const createTransaction = async (transaction: TransactionRequest): Promise<Transaction> => {
  try {
    const response = await api.post<BackendTransaction>("/transactions/transactions", {
      tipo: transaction.tipo,
      descripcion: transaction.descripcion,
      monto: transaction.monto.toString(),
      caja_id: transaction.idCaja,
      usuario_id: transaction.idUsuario
    });
    return mapBackendTransaction(response.data);
  } catch (error: any) {
    console.error("Error creating transaction:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "No se pudo crear la transacción");
  }
};

export const getCashRegisterStatus = async (idCaja: number): Promise<CashRegisterStatus | null> => {
  try {
    const response = await api.get(`/transactions/estado-caja/${idCaja}`);
    if (!response.data) return null;
    
    return {
      idEstadoCaja: response.data.idestado_caja,
      idCaja: response.data.caja_id,
      estado: response.data.estado,
      montoInicial: parseFloat(response.data.monto_inicial || '0'),
      montoFinal: parseFloat(response.data.monto_final || '0'),
      idUsuario: response.data.usuario_id,
      nombreCaja: response.data.nombre_caja
    };
  } catch (error: any) {
    console.error("Error fetching cash register status:", error.response?.data || error.message);
    // Si no hay estado de caja, no es un error crítico
    if (error.response?.status === 404) {
      return null;
    }
    throw new Error(error.response?.data?.error || "No se pudo obtener el estado de la caja");
  }
};

export const getAssignedCashRegister = async (idUsuario: number): Promise<number> => {
  try {
    const response = await api.get<{idCaja: number}>("/transactions/caja-asignada", {
      params: { idUsuario }
    });
    return response.data.idCaja;
  } catch (error: any) {
    console.error("Error fetching assigned cash register:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "No se pudo obtener la caja asignada");
  }
};

export const openCashRegister = async (idCaja: number, montoInicial: number, idUsuario: number, descripcion?: string): Promise<any> => {
  try {
    const response = await api.post("/transactions/apertura-caja", {
      caja_id: idCaja,
      monto_inicial: montoInicial,
      usuario_id: idUsuario,
      descripcion: descripcion || `Apertura de caja con Bs. ${montoInicial.toFixed(2)}`
    });
    return response.data;
  } catch (error: any) {
    console.error("Error opening cash register:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "No se pudo abrir la caja");
  }
};

export const closeCashRegister = async (idCaja: number, montoFinal: number, idUsuario: number, descripcion?: string): Promise<any> => {
  try {
    const response = await api.post("/transactions/cierre-caja", {
      caja_id: idCaja,
      monto_final: montoFinal,
      usuario_id: idUsuario,
      descripcion: descripcion || `Cierre de caja con Bs. ${montoFinal.toFixed(2)}`
    });
    return response.data;
  } catch (error: any) {
    console.error("Error closing cash register:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "No se pudo cerrar la caja");
  }
};

function mapBackendTransaction(transaction: BackendTransaction): Transaction {
  return {
    idTransaccion: transaction.idtransaccion,
    tipo: transaction.tipo,
    descripcion: transaction.descripcion,
    monto: parseFloat(transaction.monto),
    fecha: transaction.fecha,
    idCaja: transaction.caja_id,
    idUsuario: transaction.usuario_id,
    nombreCaja: transaction.nombre_caja,
    nombreUsuario: transaction.nombre_usuario
  };
}