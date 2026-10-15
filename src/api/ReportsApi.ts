import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ============================================
// TIPOS EXISTENTES
// ============================================
export interface IngresoServicioReporte {
  nombre: string;
  ingresos: number;
  cantidad?: number;
  color?: string;
}

export interface ServicioReporte {
  nombre: string;
  ventas: number;
  ingresos: number;
  color?: string;
}

export interface ProductoReporte {
  nombre: string;
  ventas: number;
  ingresos: number;
  stock: number;
}

export interface AtrasoReporte {
  trabajador: string;
  minutosAcumulados: number;
  diasAtraso: number;
}

export interface TendenciaReporte {
  mes: string;
  servicios: number;
  productos: number;
}

export interface ResumenReporte {
  serviciosVendidos: number;
  productosVendidos: number;
  ingresosTotales: number;
  minutosAtraso: number;
  tendenciaServicios: string;
  tendenciaProductos: string;
  tendenciaIngresos: string;
  tendenciaAtrasos: string;
}

export interface Sucursal {
  id: string;
  name: string;
}

export interface ReportesResponse {
  resumen: ResumenReporte;
  servicios: ServicioReporte[];
  productos: ProductoReporte[];
  atrasos: AtrasoReporte[];
  tendencias: TendenciaReporte[];
  ingresosServicios: IngresoServicioReporte[];
}

export interface FiltrosReporte {
  dateFilterType: string;
  specificDate?: Date;
  startDate?: Date;
  endDate?: Date;
  sucursalId?: string;
}

// ============================================
// TIPOS NUEVOS
// ============================================
export interface ObjetivoMensual {
  id?: number;
  sucursalId: string;
  sucursalNombre: string;
  mes: string;
  objetivo: number;
}

export interface VentaRealMensual {
  sucursalId: string;
  mes: string;
  total: number;
  servicios: number;
  productos: number;
}

export interface ResumenSucursal {
  sucursalId: string;
  sucursalNombre: string;
  total: number;
  servicios: number;
  productos: number;
}

export interface DesglosePagos {
  serviciosEfectivo: number;
  serviciosQr: number;
  productosEfectivo: number;
  productosQr: number;
  totalEfectivo: number;
  totalQr: number;
}

export interface DesglosePagoProducto {
  sucursalId: string;
  sucursalNombre: string;
  productoId: string;
  productoNombre: string;
  efectivoMonto: number;
  qrMonto: number;
  efectivoVentas: number;
  qrVentas: number;
  totalMonto: number;
  totalVentas: number;
}

export interface DesglosePagoServicio {
  sucursalId: string;
  sucursalNombre: string;
  servicioId: string;
  servicioNombre: string;
  efectivoMonto: number;
  qrMonto: number;
  efectivoVentas: number;
  qrVentas: number;
  totalMonto: number;
  totalVentas: number;
}

export interface MovimientoStock {
  id: string;
  fecha: string;
  recepcionista: string;
  productoId: string;
  productoNombre: string;
  cantidadAnadida: number;
  stockAntes: number;
  stockDespues: number;
  sucursalId: string;
  sucursalNombre: string;
}

export interface InscripcionAgrupada {
  servicioNombre: string;
  sucursalNombre: string;
  cantidad: number;
}

export interface ItemDisponible {
  id: string;
  nombre: string;
}

// ============================================
// MOVIMIENTOS DE FECHAS DE INSCRIPCIÓN
// ============================================
export interface MovimientoFechaInscripcion {
  id: string;
  fecha: string;
  usuarioId: string;
  usuarioNombre: string;
  personaId: string;
  personaNombre: string;
  servicioId: string;
  servicioNombre: string;
  sucursalId: string;
  sucursalNombre: string;
  fechaInicioAnterior: string | null;
  fechaInicioNueva: string | null;
  fechaVencimientoAnterior: string | null;
  fechaVencimientoNueva: string | null;
  descripcion: string;
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

// ============================================
// HELPERS
// ============================================
const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

const buildFiltrosParams = (filtros: FiltrosReporte): Record<string, any> => {
  const params: any = {
    tipoFiltro: filtros.dateFilterType,
    timezone: "America/La_Paz",
  };

  if (filtros.sucursalId && filtros.sucursalId !== "all") {
    params.sucursalId = filtros.sucursalId;
  }

  if (filtros.specificDate) {
    params.fechaEspecifica = formatDateForAPI(filtros.specificDate);
  }

  if (filtros.startDate) {
    params.fechaInicio = formatDateForAPI(filtros.startDate);
  }

  if (filtros.endDate) {
    params.fechaFin = formatDateForAPI(filtros.endDate);
  }

  return params;
};

// ============================================
// REPORTES GENERALES
// ============================================
export const getReportes = async (
  filtros: FiltrosReporte
): Promise<ReportesResponse> => {
  try {
    const params = buildFiltrosParams(filtros);
    const response = await api.get<ReportesResponse>("/reports", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching reports:", error);
    throw new Error("No se pudieron cargar los reportes");
  }
};

export const getIngresosServicios = async (
  filtros: FiltrosReporte
): Promise<IngresoServicioReporte[]> => {
  try {
    const params = buildFiltrosParams(filtros);
    const response = await api.get<IngresoServicioReporte[]>(
      "/reports/ingresos-servicios",
      { params }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching ingresos servicios:", error);
    throw new Error("No se pudieron cargar los ingresos por servicio");
  }
};

export const getSucursales = async (): Promise<Sucursal[]> => {
  try {
    const response = await api.get<Sucursal[]>("/reports/sucursales");
    return response.data;
  } catch (error) {
    console.error("Error fetching sucursales:", error);
    throw new Error("No se pudieron cargar las sucursales");
  }
};

// ============================================
// OBJETIVOS MENSUALES
// ============================================
export const getObjetivosMensuales = async (
  sucursalId?: string,
  mes?: string
): Promise<ObjetivoMensual[]> => {
  try {
    const params: any = {};
    if (sucursalId && sucursalId !== "all") params.sucursalId = sucursalId;
    if (mes) params.mes = mes;

    const response = await api.get<ObjetivoMensual[]>("/reports/objetivos", {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching objetivos:", error);
    throw new Error("No se pudieron cargar los objetivos");
  }
};

export const guardarObjetivoMensual = async (
  sucursalId: string,
  mes: string,
  objetivo: number
): Promise<ObjetivoMensual> => {
  try {
    const response = await api.post<ObjetivoMensual>("/reports/objetivos", {
      sucursalId,
      mes,
      objetivo,
    });
    return response.data;
  } catch (error) {
    console.error("Error guardando objetivo:", error);
    throw new Error("No se pudo guardar el objetivo");
  }
};

export const eliminarObjetivoMensual = async (
  sucursalId: string,
  mes: string
): Promise<void> => {
  try {
    await api.delete(`/reports/objetivos/${sucursalId}/${mes}`);
  } catch (error) {
    console.error("Error eliminando objetivo:", error);
    throw new Error("No se pudo eliminar el objetivo");
  }
};

// ============================================
// VENTAS REALES / RESUMEN / DESGLOSE
// ============================================
export const getVentasRealesPorMes = async (
  sucursalId?: string
): Promise<VentaRealMensual[]> => {
  try {
    const params: any = {};
    if (sucursalId && sucursalId !== "all") params.sucursalId = sucursalId;

    const response = await api.get<VentaRealMensual[]>(
      "/reports/ventas-reales",
      { params }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching ventas reales:", error);
    throw new Error("No se pudieron cargar las ventas");
  }
};

export const getResumenPorSucursal = async (
  filtros: FiltrosReporte
): Promise<ResumenSucursal[]> => {
  try {
    const params = buildFiltrosParams(filtros);
    const response = await api.get<ResumenSucursal[]>(
      "/reports/resumen-por-sucursal",
      { params }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching resumen por sucursal:", error);
    throw new Error("No se pudo cargar el resumen");
  }
};

export const getDesglosePagos = async (
  filtros: FiltrosReporte
): Promise<Record<string, DesglosePagos>> => {
  try {
    const params = buildFiltrosParams(filtros);
    const response = await api.get<Record<string, DesglosePagos>>(
      "/reports/desglose-pagos",
      { params }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching desglose de pagos:", error);
    throw new Error("No se pudo cargar el desglose de pagos");
  }
};

// ============================================
// DESGLOSE DE PRODUCTOS Y SERVICIOS
// ============================================
export const getDesgloseProductos = async (
  filtros: FiltrosReporte
): Promise<DesglosePagoProducto[]> => {
  try {
    const params = buildFiltrosParams(filtros);
    const response = await api.get<DesglosePagoProducto[]>(
      "/reports/desglose-productos",
      { params }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching desglose productos:", error);
    throw new Error("No se pudo cargar el desglose de productos");
  }
};

export const getDesgloseServicios = async (
  filtros: FiltrosReporte
): Promise<DesglosePagoServicio[]> => {
  try {
    const params = buildFiltrosParams(filtros);
    const response = await api.get<DesglosePagoServicio[]>(
      "/reports/desglose-servicios",
      { params }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching desglose servicios:", error);
    throw new Error("No se pudo cargar el desglose de servicios");
  }
};

// ============================================
// MOVIMIENTOS DE STOCK
// ============================================
export const getMovimientosStock = async (
  fechaInicio: string,
  fechaFin: string,
  sucursalId?: string
): Promise<MovimientoStock[]> => {
  try {
    const params: any = { fechaInicio, fechaFin };
    if (sucursalId && sucursalId !== "all") params.sucursalId = sucursalId;

    const response = await api.get<MovimientoStock[]>(
      "/reports/movimientos-stock",
      { params }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching movimientos stock:", error);
    throw new Error("No se pudieron cargar los movimientos de stock");
  }
};

// ============================================
// INSCRIPCIONES AGRUPADAS
// ============================================
export const getInscripcionesAgrupadas = async (
  fechaInicio: string,
  fechaFin: string,
  servicioId?: string,
  sucursalId?: string
): Promise<InscripcionAgrupada[]> => {
  try {
    const params: any = { fechaInicio, fechaFin };
    if (servicioId && servicioId !== "all") params.servicioId = servicioId;
    if (sucursalId && sucursalId !== "all") params.sucursalId = sucursalId;

    const response = await api.get<InscripcionAgrupada[]>(
      "/reports/inscripciones-agrupadas",
      { params }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching inscripciones:", error);
    throw new Error("No se pudieron cargar las inscripciones");
  }
};

// ============================================
// LISTAS PARA FILTROS
// ============================================
export const getProductosDisponibles = async (): Promise<ItemDisponible[]> => {
  try {
    const response = await api.get<ItemDisponible[]>(
      "/reports/productos-disponibles"
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching productos disponibles:", error);
    throw new Error("No se pudieron cargar los productos");
  }
};

export const getServiciosDisponibles = async (): Promise<ItemDisponible[]> => {
  try {
    const response = await api.get<ItemDisponible[]>(
      "/reports/servicios-disponibles"
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching servicios disponibles:", error);
    throw new Error("No se pudieron cargar los servicios");
  }
};

// ============================================
// TIPOS: REPORTE DE EMPLEADOS
// ============================================
export interface EmpleadoReporte {
  id: string;
  personaId: string;
  nombre: string;
  rol: string;
  sucursales: string[];
  sucursalNombres: string[];
  sueldoBase: number;
  comision: number;
  tipo: "normal" | "zumba";
  tieneHuella: boolean;
  activo: boolean;
}

export interface AtrasoDetalle {
  fecha: string;
  minutos: number;
  tipo: "Entrada" | "Salida" | "Sin Marcar";
  detalle?: string;
}

export interface AtrasoEmpleado {
  empleadoId: string;
  empleadoNombre: string;
  sucursalNombre: string;
  totalMinutos: number;
  totalDias: number;
  detalles: AtrasoDetalle[];
}

export interface PagoMensualInfo {
  empleadoId: string;
  empleadoNombre: string;
  tipo: "normal" | "zumba";
  sueldoBase: number;
  comision: number;
  sueldoNeto: number;
  totalPersonas?: number;
  diasRegistrados?: number;
  valorComision?: number;
}

export interface ReporteZumba {
  id: string;
  fecha: string;
  instructorId: string;
  instructorNombre: string;
  numeroPersonas: number;
}

// ============================================
// FUNCIONES: REPORTE DE EMPLEADOS
// ============================================
export const getEmpleadosReporte = async (
  sucursalId?: string
): Promise<EmpleadoReporte[]> => {
  try {
    const params: any = {};
    if (sucursalId && sucursalId !== "all") params.sucursalId = sucursalId;

    const response = await api.get<EmpleadoReporte[]>("/reports/empleados", {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching empleados:", error);
    throw new Error("No se pudieron cargar los empleados");
  }
};

export const getAtrasosEmpleados = async (
  mes: string,
  sucursalId?: string
): Promise<AtrasoEmpleado[]> => {
  try {
    const params: any = { mes };
    if (sucursalId && sucursalId !== "all") params.sucursalId = sucursalId;

    const response = await api.get<AtrasoEmpleado[]>(
      "/reports/atrasos-empleados",
      { params }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching atrasos:", error);
    throw new Error("No se pudieron cargar los atrasos");
  }
};

export const getPagosInformativos = async (
  mes: string,
  sucursalId?: string
): Promise<PagoMensualInfo[]> => {
  try {
    const params: any = { mes };
    if (sucursalId && sucursalId !== "all") params.sucursalId = sucursalId;

    const response = await api.get<PagoMensualInfo[]>(
      "/reports/pagos-informativos",
      { params }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching pagos informativos:", error);
    throw new Error("No se pudieron cargar los pagos");
  }
};

export const actualizarSueldoEmpleado = async (
  empleadoId: string,
  sueldoBase?: number,
  comision?: number
): Promise<void> => {
  try {
    await api.patch(`/reports/empleados/${empleadoId}/sueldo`, {
      sueldoBase,
      comision,
    });
  } catch (error) {
    console.error("Error actualizando sueldo:", error);
    throw new Error("No se pudo actualizar el sueldo");
  }
};

export const getReportesZumba = async (
  mes: string,
  instructorId?: string
): Promise<ReporteZumba[]> => {
  try {
    const params: any = { mes };
    if (instructorId) params.instructorId = instructorId;

    const response = await api.get<ReporteZumba[]>("/reports/zumba", {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching reportes zumba:", error);
    throw new Error("No se pudieron cargar los reportes de zumba");
  }
};

export const getMovimientosFechasInscripcion = async (
  fechaInicio: string,
  fechaFin: string,
  servicioId?: string,
  sucursalId?: string
): Promise<MovimientoFechaInscripcion[]> => {
  try {
    const params: any = { fechaInicio, fechaFin };
    if (servicioId && servicioId !== "all") params.servicioId = servicioId;
    if (sucursalId && sucursalId !== "all") params.sucursalId = sucursalId;

    const response = await api.get<MovimientoFechaInscripcion[]>(
      "/reports/movimientos-fechas-inscripcion",
      { params }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching movimientos fechas inscripción:", error);
    throw new Error("No se pudieron cargar los movimientos de fechas de inscripción");
  }
};