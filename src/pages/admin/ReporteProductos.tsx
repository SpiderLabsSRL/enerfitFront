import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from "@/contexts/UserContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Package,
  Building2,
  Loader2,
  Wallet,
  CreditCard,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Zap,
  History,
} from "lucide-react";
import {
  getReportes,
  getSucursales,
  getDesgloseProductos,
  getMovimientosStock,
  FiltrosReporte,
  ProductoReporte,
  Sucursal,
  ResumenReporte,
  DesglosePagoProducto,
  MovimientoStock,
} from "@/api/ReportsApi";
import { DateFilterType } from "@/components/DateFilters";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["#FBBF24", "#F59E0B", "#D4AF37", "#F6E05E", "#FFD700", "#EAB308", "#FCD34D", "#FFE4A0", "#FFE69E"];

// ✅ FIX: Devuelve un Date con la hora de Bolivia (UTC-4 fijo, sin horario de verano)
// NO usar toISOString() después porque eso vuelve a convertir a UTC.
const getBoliviaDate = (): Date => {
  const now = new Date();
  return new Date(now.getTime() - 4 * 60 * 60 * 1000);
};

// ✅ FIX: Devuelve un string "YYYY-MM-DD" con la fecha correcta de Bolivia.
// Se usa directamente en los <input type="date"> para evitar desfases de un día.
const getBoliviaDateString = (): string => {
  const now = new Date();
  const boliviaTime = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const year = boliviaTime.getUTCFullYear();
  const month = String(boliviaTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(boliviaTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// ✅ FIX: Suma (o resta) días a un string "YYYY-MM-DD" sin tocar zonas horarias
const addDaysToDateString = (dateStr: string, days: number): string => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// ✅ FIX: Formatea la fecha SIN conversión de zona horaria
const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";

  try {
    const match = dateString.match(
      /(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/
    );

    if (match) {
      const [, year, month, day, hour, minute] = match;
      const h = parseInt(hour);
      const sufijo = h >= 12 ? "p. m." : "a. m.";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${day}/${month}/${year}, ${String(h12).padStart(2, "0")}:${minute} ${sufijo}`;
    }

    return dateString;
  } catch {
    return dateString;
  }
};

// ✅ FIX: Formatea solo la fecha (YYYY-MM-DD → DD/MM/YYYY) sin conversión
const formatDateOnly = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";

  try {
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
    return dateString;
  } catch {
    return dateString;
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a1a] border border-primary/30 rounded-lg p-3 shadow-lg">
        <p className="font-medium text-primary mb-1">{label}</p>
        <p className="text-sm text-[#e2e2e2]">{payload[0].value} ventas</p>
      </div>
    );
  }
  return null;
};

const CustomIngresosTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a1a] border border-primary/30 rounded-lg p-3 shadow-lg">
        <p className="font-medium text-primary mb-1">{label}</p>
        <p className="text-sm text-[#e2e2e2]">Bs. {payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

function FiltrosCompactos({
  dateFilterType,
  onFilterTypeChange,
  selectedSucursal,
  onSucursalChange,
  sucursales,
  user,
}: any) {
  const filterOptions = [
    { value: "today", label: "Hoy" },
    { value: "yesterday", label: "Ayer" },
    { value: "thisWeek", label: "Semana" },
    { value: "thisMonth", label: "Mes" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {user?.rol === "admin" && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <Select value={selectedSucursal} onValueChange={onSucursalChange}>
            <SelectTrigger className="w-[160px] h-8 text-sm">
              <SelectValue placeholder="Sucursal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {sucursales.map((sucursal: Sucursal) => (
                <SelectItem key={sucursal.id} value={sucursal.id}>
                  {sucursal.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        {filterOptions.map((option) => (
          <Button
            key={option.value}
            variant={dateFilterType === option.value ? "default" : "ghost"}
            size="sm"
            className="h-8 px-3 text-sm"
            onClick={() => onFilterTypeChange(option.value as DateFilterType)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function FiltroMovimientosStock({ fechaInicio, fechaFin, onFechaInicioChange, onFechaFinChange }: any) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Rango de fechas:</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={fechaInicio}
          onChange={(e) => onFechaInicioChange(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md bg-background"
        />
        <span className="text-sm">a</span>
        <input
          type="date"
          value={fechaFin}
          onChange={(e) => onFechaFinChange(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md bg-background"
        />
      </div>
    </div>
  );
}

export function ReporteProductos() {
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>("today");
  const [specificDate, setSpecificDate] = useState<Date>(getBoliviaDate());
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedSucursal, setSelectedSucursal] = useState<string>("all");
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingSucursales, setLoadingSucursales] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [productosData, setProductosData] = useState<ProductoReporte[]>([]);
  const [desglosePagos, setDesglosePagos] = useState<DesglosePagoProducto[]>([]);
  const [resumenData, setResumenData] = useState<ResumenReporte>({
    serviciosVendidos: 0,
    productosVendidos: 0,
    ingresosTotales: 0,
    minutosAtraso: 0,
    tendenciaServicios: "+0%",
    tendenciaProductos: "+0%",
    tendenciaIngresos: "+0%",
    tendenciaAtrasos: "+0%",
  });

  const [sucursalesExpandidas, setSucursalesExpandidas] = useState<Set<string>>(new Set());

  // Movimientos de stock
  const [movimientosStock, setMovimientosStock] = useState<MovimientoStock[]>([]);
  // ✅ FIX: usar strings de fecha Bolivia correctos
  const [fechaInicioMovimientos, setFechaInicioMovimientos] = useState<string>(() => {
    return addDaysToDateString(getBoliviaDateString(), -30);
  });
  const [fechaFinMovimientos, setFechaFinMovimientos] = useState<string>(() => {
    return getBoliviaDateString();
  });

  const { user } = useUser();
  const { toast } = useToast();

  // ============================================
  // CARGA DE DATOS
  // ============================================
  const cargarSucursales = async () => {
    try {
      setLoadingSucursales(true);
      const sucursalesData = await getSucursales();
      setSucursales(sucursalesData.filter((s) => s.id !== "all"));
    } catch (err) {
      console.error("Error al cargar sucursales:", err);
      toast({
        title: "Error",
        description: "No se pudieron cargar las sucursales",
        variant: "destructive",
      });
    } finally {
      setLoadingSucursales(false);
    }
  };

  const cargarReportes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filtros: FiltrosReporte = {
        dateFilterType,
        specificDate,
        startDate,
        endDate,
        sucursalId: selectedSucursal !== "all" ? selectedSucursal : undefined,
      };

      const [reportes, desglose] = await Promise.all([
        getReportes(filtros),
        getDesgloseProductos(filtros),
      ]);

      setResumenData(reportes.resumen);
      setProductosData(reportes.productos);
      setDesglosePagos(desglose);
    } catch (err) {
      console.error("Error al cargar reportes:", err);
      setError("No se pudieron cargar los reportes. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [dateFilterType, specificDate, startDate, endDate, selectedSucursal]);

  const cargarMovimientos = useCallback(async () => {
    try {
      const data = await getMovimientosStock(
        fechaInicioMovimientos,
        fechaFinMovimientos,
        selectedSucursal
      );
      setMovimientosStock(data);
    } catch (err) {
      console.error("Error al cargar movimientos:", err);
      toast({
        title: "Error",
        description: "No se pudieron cargar los movimientos",
        variant: "destructive",
      });
    }
  }, [fechaInicioMovimientos, fechaFinMovimientos, selectedSucursal]);

  useEffect(() => {
    cargarSucursales();
  }, []);

  useEffect(() => {
    cargarReportes();
  }, [cargarReportes]);

  useEffect(() => {
    cargarMovimientos();
  }, [cargarMovimientos]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleFilterTypeChange = useCallback((value: DateFilterType) => {
    setDateFilterType(value);
    if (value === "today") setSpecificDate(getBoliviaDate());
    else if (value === "yesterday") {
      const yesterday = new Date(getBoliviaDate());
      yesterday.setDate(yesterday.getDate() - 1);
      setSpecificDate(yesterday);
    }
  }, []);

  const toggleSucursalExpandida = useCallback((sucursalId: string) => {
    setSucursalesExpandidas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sucursalId)) newSet.delete(sucursalId);
      else newSet.add(sucursalId);
      return newSet;
    });
  }, []);

  // ============================================
  // MEMOS
  // ============================================
  const desglosePorSucursal = useMemo(() => {
    const grouped = new Map<
      string,
      {
        sucursalNombre: string;
        totalEfectivoMonto: number;
        totalQrMonto: number;
        totalEfectivoVentas: number;
        totalQrVentas: number;
        totalGeneralMonto: number;
        totalGeneralVentas: number;
        productos: DesglosePagoProducto[];
      }
    >();

    desglosePagos.forEach((item) => {
      if (!grouped.has(item.sucursalId)) {
        grouped.set(item.sucursalId, {
          sucursalNombre: item.sucursalNombre,
          totalEfectivoMonto: 0,
          totalQrMonto: 0,
          totalEfectivoVentas: 0,
          totalQrVentas: 0,
          totalGeneralMonto: 0,
          totalGeneralVentas: 0,
          productos: [],
        });
      }

      const group = grouped.get(item.sucursalId)!;
      group.totalEfectivoMonto += item.efectivoMonto;
      group.totalQrMonto += item.qrMonto;
      group.totalEfectivoVentas += item.efectivoVentas;
      group.totalQrVentas += item.qrVentas;
      group.totalGeneralMonto += item.totalMonto;
      group.totalGeneralVentas += item.totalVentas;
      group.productos.push(item);
    });

    return grouped;
  }, [desglosePagos]);

  // ============================================
  // RENDER
  // ============================================
  if (loadingSucursales || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando reporte de productos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-destructive mb-4">{error}</div>
        <Button onClick={cargarReportes}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Reporte de Productos</h1>
          <p className="text-sm text-muted-foreground">
            Análisis de productos más vendidos e ingresos generados
          </p>
        </div>

        <FiltrosCompactos
          dateFilterType={dateFilterType}
          onFilterTypeChange={handleFilterTypeChange}
          selectedSucursal={selectedSucursal}
          onSucursalChange={setSelectedSucursal}
          sucursales={sucursales}
          user={user}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Vendidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{resumenData.productosVendidos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos por Productos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              Bs. {resumenData.ingresosTotales.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{productosData.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Ingresos por Producto y Sucursal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Building2 className="h-5 w-5" />
            Ingresos por Producto y Sucursal
          </CardTitle>
          <CardDescription>
            Desglose detallado de ingresos y ventas por producto, incluyendo método de pago (Efectivo/QR)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from(desglosePorSucursal.entries()).map(([sucursalId, data]) => {
              const isExpanded = sucursalesExpandidas.has(sucursalId);

              return (
                <div key={sucursalId} className="border rounded-lg overflow-hidden">
                  <div
                    className="p-4 bg-gradient-to-r from-primary/5 to-transparent cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSucursalExpandida(sucursalId)}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold">{data.sucursalNombre}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {data.productos.length} productos
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center md:text-left">
                          <p className="text-xs text-muted-foreground">Total General</p>
                          <p className="text-xl font-bold text-primary">
                            Bs. {data.totalGeneralMonto.toLocaleString()}
                          </p>
                          <p className="text-sm">{data.totalGeneralVentas} ventas</p>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                            <Wallet className="h-3 w-3 text-green-500" /> Efectivo
                          </p>
                          <p className="text-lg font-bold text-green-500">
                            Bs. {data.totalEfectivoMonto.toLocaleString()}
                          </p>
                          <p className="text-sm">{data.totalEfectivoVentas} ventas</p>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                            <CreditCard className="h-3 w-3 text-blue-500" /> QR
                          </p>
                          <p className="text-lg font-bold text-blue-500">
                            Bs. {data.totalQrMonto.toLocaleString()}
                          </p>
                          <p className="text-sm">{data.totalQrVentas} ventas</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t bg-muted/20 p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {data.productos.map((producto, idx) => (
                          <div key={producto.productoId} className="bg-card rounded-lg p-3 border">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                />
                                <span className="font-medium text-sm">{producto.productoNombre}</span>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-primary">
                                  Bs. {producto.totalMonto.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {producto.totalVentas} ventas totales
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                              <div className="bg-green-500/10 rounded-lg p-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <Wallet className="h-3 w-3 text-green-500" />
                                  <span className="text-xs font-medium text-green-600">Efectivo</span>
                                </div>
                                <p className="text-sm font-bold text-green-600">
                                  Bs. {producto.efectivoMonto.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {producto.efectivoVentas} ventas
                                </p>
                              </div>
                              <div className="bg-blue-500/10 rounded-lg p-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <CreditCard className="h-3 w-3 text-blue-500" />
                                  <span className="text-xs font-medium text-blue-600">QR</span>
                                </div>
                                <p className="text-sm font-bold text-blue-600">
                                  Bs. {producto.qrMonto.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {producto.qrVentas} ventas
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Productos Más Vendidos</CardTitle>
            <CardDescription>Top productos por cantidad vendida</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={productosData.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" fontSize={12} angle={-45} textAnchor="end" height={80} />
                <YAxis fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="ventas" fill="#FBBF24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Ingresos por Producto</CardTitle>
            <CardDescription>Ingresos generados por cada producto</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={productosData.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" fontSize={12} angle={-45} textAnchor="end" height={80} />
                <YAxis fontSize={12} />
                <Tooltip content={<CustomIngresosTooltip />} />
                <Legend />
                <Bar dataKey="ingresos" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Productos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Ranking de Productos</CardTitle>
          <CardDescription>Lista completa ordenada por ventas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {productosData.map((producto, index) => (
              <div key={producto.nombre} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={index < 3 ? "default" : "outline"}
                    className={index < 3 ? "bg-primary text-primary-foreground" : ""}
                  >
                    #{index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium">{producto.nombre}</p>
                    <p className="text-sm text-muted-foreground">Stock: {producto.stock} unidades</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{producto.ventas} vendidos</p>
                  <p className="text-sm text-primary">Bs. {producto.ingresos.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Movimientos de Stock */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Package className="h-5 w-5" />
            Movimientos de Stock
          </CardTitle>
          <CardDescription>Registro de adiciones de stock realizadas por recepcionistas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FiltroMovimientosStock
            fechaInicio={fechaInicioMovimientos}
            fechaFin={fechaFinMovimientos}
            onFechaInicioChange={setFechaInicioMovimientos}
            onFechaFinChange={setFechaFinMovimientos}
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Fecha</th>
                  <th className="text-left p-3 font-medium">Recepcionista</th>
                  <th className="text-left p-3 font-medium">Producto</th>
                  <th className="text-left p-3 font-medium">Sucursal</th>
                  <th className="text-right p-3 font-medium">Cantidad añadida</th>
                  <th className="text-right p-3 font-medium">Stock antes</th>
                  <th className="text-right p-3 font-medium">Stock después</th>
                </tr>
              </thead>
              <tbody>
                {movimientosStock.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-muted-foreground">
                      No hay movimientos de stock en el rango de fechas seleccionado
                    </td>
                  </tr>
                ) : (
                  movimientosStock.map((movimiento) => (
                    <tr key={movimiento.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        {/* ✅ FIX: formateo sin conversión de zona horaria */}
                        {formatDateTime(movimiento.fecha)}
                      </td>
                      <td className="p-3 font-medium">{movimiento.recepcionista}</td>
                      <td className="p-3">{movimiento.productoNombre}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {movimiento.sucursalNombre}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-medium text-green-600">
                        +{movimiento.cantidadAnadida}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {movimiento.stockAntes}
                      </td>
                      <td className="p-3 text-right font-medium">{movimiento.stockDespues}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}