import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from "@/contexts/UserContext";
import { Building2, Loader2, Award, Wallet, CreditCard, TrendingUp, ChevronDown, ChevronUp, Zap, Users, Calendar, History, CalendarClock } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  getReportes,
  getSucursales,
  getDesgloseServicios,
  getInscripcionesAgrupadas,
  getServiciosDisponibles,
  getMovimientosFechasInscripcion,
  FiltrosReporte,
  ServicioReporte,
  IngresoServicioReporte,
  Sucursal,
  ResumenReporte,
  DesglosePagoServicio,
  InscripcionAgrupada,
  ItemDisponible,
  MovimientoFechaInscripcion,
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

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#0a0a0a" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={12} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
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

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1a1a1a] border border-primary/30 rounded-lg p-3 shadow-lg">
        <p className="font-medium text-primary">{data.nombre}</p>
        <p className="text-sm text-[#e2e2e2]">{data.ingresos} accesos</p>
      </div>
    );
  }
  return null;
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
      // Convertir a formato 12h con a.m./p.m. como en el ejemplo
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

function FiltroInscripciones({
  fechaInicio,
  fechaFin,
  onFechaInicioChange,
  onFechaFinChange,
  selectedServicio,
  onServicioChange,
  servicios,
  selectedSucursalInscripciones,
  onSucursalInscripcionesChange,
  sucursales,
}: any) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
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

      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-primary" />
        <Select value={selectedServicio} onValueChange={onServicioChange}>
          <SelectTrigger className="w-[180px] h-8 text-sm">
            <SelectValue placeholder="Todos los servicios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los servicios</SelectItem>
            {servicios.map((servicio: ItemDisponible) => (
              <SelectItem key={servicio.id} value={servicio.id}>
                {servicio.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <Select value={selectedSucursalInscripciones} onValueChange={onSucursalInscripcionesChange}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder="Todas las sucursales" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las sucursales</SelectItem>
            {sucursales.map((sucursal: Sucursal) => (
              <SelectItem key={sucursal.id} value={sucursal.id}>
                {sucursal.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ✅ NUEVO: Filtros para movimientos de fechas de inscripción
function FiltroMovimientosFechas({
  fechaInicio,
  fechaFin,
  onFechaInicioChange,
  onFechaFinChange,
  selectedServicio,
  onServicioChange,
  servicios,
  selectedSucursal,
  onSucursalChange,
  sucursales,
}: any) {
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

      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-primary" />
        <Select value={selectedServicio} onValueChange={onServicioChange}>
          <SelectTrigger className="w-[180px] h-8 text-sm">
            <SelectValue placeholder="Todos los servicios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los servicios</SelectItem>
            {servicios.map((servicio: ItemDisponible) => (
              <SelectItem key={servicio.id} value={servicio.id}>
                {servicio.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <Select value={selectedSucursal} onValueChange={onSucursalChange}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder="Todas las sucursales" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las sucursales</SelectItem>
            {sucursales.map((sucursal: Sucursal) => (
              <SelectItem key={sucursal.id} value={sucursal.id}>
                {sucursal.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function ReporteServicios() {
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>("today");
  const [specificDate, setSpecificDate] = useState<Date>(getBoliviaDate());
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedSucursal, setSelectedSucursal] = useState<string>("all");
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingSucursales, setLoadingSucursales] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [serviciosData, setServiciosData] = useState<ServicioReporte[]>([]);
  const [ingresosServiciosData, setIngresosServiciosData] = useState<IngresoServicioReporte[]>([]);
  const [desglosePagos, setDesglosePagos] = useState<DesglosePagoServicio[]>([]);
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

  // Inscripciones
  const [inscripciones, setInscripciones] = useState<InscripcionAgrupada[]>([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<ItemDisponible[]>([]);
  // ✅ FIX: usar strings de fecha Bolivia correctos
  const [fechaInicioInscripciones, setFechaInicioInscripciones] = useState<string>(() => {
    return addDaysToDateString(getBoliviaDateString(), -30);
  });
  const [fechaFinInscripciones, setFechaFinInscripciones] = useState<string>(() => {
    return getBoliviaDateString();
  });
  const [selectedServicioInscripciones, setSelectedServicioInscripciones] = useState<string>("all");
  const [selectedSucursalInscripciones, setSelectedSucursalInscripciones] = useState<string>("all");

  // ✅ NUEVO: Movimientos de fechas de inscripción
  const [movimientosFechas, setMovimientosFechas] = useState<MovimientoFechaInscripcion[]>([]);
  // ✅ FIX: usar strings de fecha Bolivia correctos
  const [fechaInicioMovFechas, setFechaInicioMovFechas] = useState<string>(() => {
    return addDaysToDateString(getBoliviaDateString(), -30);
  });
  const [fechaFinMovFechas, setFechaFinMovFechas] = useState<string>(() => {
    return getBoliviaDateString();
  });
  const [selectedServicioMovFechas, setSelectedServicioMovFechas] = useState<string>("all");
  const [selectedSucursalMovFechas, setSelectedSucursalMovFechas] = useState<string>("all");

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

  const cargarServiciosDisponibles = async () => {
    try {
      const data = await getServiciosDisponibles();
      setServiciosDisponibles(data);
    } catch (err) {
      console.error("Error al cargar servicios disponibles:", err);
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
        getDesgloseServicios(filtros),
      ]);

      setResumenData(reportes.resumen);
      setServiciosData(reportes.servicios);
      setIngresosServiciosData(reportes.ingresosServicios || []);
      setDesglosePagos(desglose);
    } catch (err) {
      console.error("Error al cargar reportes:", err);
      setError("No se pudieron cargar los reportes. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [dateFilterType, specificDate, startDate, endDate, selectedSucursal]);

  const cargarInscripciones = useCallback(async () => {
    try {
      const data = await getInscripcionesAgrupadas(
        fechaInicioInscripciones,
        fechaFinInscripciones,
        selectedServicioInscripciones,
        selectedSucursalInscripciones
      );
      setInscripciones(data);
    } catch (err) {
      console.error("Error al cargar inscripciones:", err);
      toast({
        title: "Error",
        description: "No se pudieron cargar las inscripciones",
        variant: "destructive",
      });
    }
  }, [fechaInicioInscripciones, fechaFinInscripciones, selectedServicioInscripciones, selectedSucursalInscripciones]);

  // ✅ NUEVO: Cargar movimientos de fechas de inscripción
  const cargarMovimientosFechas = useCallback(async () => {
    try {
      const data = await getMovimientosFechasInscripcion(
        fechaInicioMovFechas,
        fechaFinMovFechas,
        selectedServicioMovFechas,
        selectedSucursalMovFechas
      );
      setMovimientosFechas(data);
    } catch (err) {
      console.error("Error al cargar movimientos de fechas:", err);
      toast({
        title: "Error",
        description: "No se pudieron cargar los movimientos de fechas",
        variant: "destructive",
      });
    }
  }, [fechaInicioMovFechas, fechaFinMovFechas, selectedServicioMovFechas, selectedSucursalMovFechas]);

  useEffect(() => {
    cargarSucursales();
    cargarServiciosDisponibles();
  }, []);

  useEffect(() => {
    cargarReportes();
  }, [cargarReportes]);

  useEffect(() => {
    cargarInscripciones();
  }, [cargarInscripciones]);

  useEffect(() => {
    cargarMovimientosFechas();
  }, [cargarMovimientosFechas]);

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
        servicios: DesglosePagoServicio[];
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
          servicios: [],
        });
      }

      const group = grouped.get(item.sucursalId)!;
      group.totalEfectivoMonto += item.efectivoMonto;
      group.totalQrMonto += item.qrMonto;
      group.totalEfectivoVentas += item.efectivoVentas;
      group.totalQrVentas += item.qrVentas;
      group.totalGeneralMonto += item.totalMonto;
      group.totalGeneralVentas += item.totalVentas;
      group.servicios.push(item);
    });

    return grouped;
  }, [desglosePagos]);

  const inscripcionesAgrupadas = useMemo(() => {
    const grouped = new Map<string, Map<string, number>>();

    inscripciones.forEach((i) => {
      if (!grouped.has(i.servicioNombre)) {
        grouped.set(i.servicioNombre, new Map());
      }
      const sucursalMap = grouped.get(i.servicioNombre)!;
      sucursalMap.set(i.sucursalNombre, i.cantidad);
    });

    return grouped;
  }, [inscripciones]);

  // ============================================
  // RENDER
  // ============================================
  if (loadingSucursales || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando reporte de servicios...</span>
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
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Reporte de Servicios</h1>
          <p className="text-sm text-muted-foreground">
            Análisis de servicios más vendidos e ingresos por servicio
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
            <CardTitle className="text-sm font-medium">Servicios Vendidos</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{resumenData.serviciosVendidos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos por Servicios</CardTitle>
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
            <CardTitle className="text-sm font-medium">Total Accesos</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {ingresosServiciosData.reduce((sum, item) => sum + item.ingresos, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ingresos por Servicio y Sucursal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Building2 className="h-5 w-5" />
            Ingresos por Servicio y Sucursal
          </CardTitle>
          <CardDescription>
            Desglose detallado de ingresos y ventas por servicio, incluyendo método de pago (Efectivo/QR)
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
                            {data.servicios.length} servicios
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
                        {data.servicios.map((servicio, idx) => (
                          <div key={servicio.servicioId} className="bg-card rounded-lg p-3 border">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                />
                                <span className="font-medium text-sm">{servicio.servicioNombre}</span>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-primary">
                                  Bs. {servicio.totalMonto.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {servicio.totalVentas} ventas totales
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
                                  Bs. {servicio.efectivoMonto.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {servicio.efectivoVentas} ventas
                                </p>
                              </div>
                              <div className="bg-blue-500/10 rounded-lg p-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <CreditCard className="h-3 w-3 text-blue-500" />
                                  <span className="text-xs font-medium text-blue-600">QR</span>
                                </div>
                                <p className="text-sm font-bold text-blue-600">
                                  Bs. {servicio.qrMonto.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {servicio.qrVentas} ventas
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Servicios Más Vendidos</CardTitle>
            <CardDescription>Ranking de servicios por cantidad de ventas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviciosData}>
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
            <CardTitle className="text-primary">Accesos por Servicio</CardTitle>
            <CardDescription>Cantidad de accesos por cada servicio</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ingresosServiciosData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  dataKey="ingresos"
                >
                  {ingresosServiciosData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || COLORS[index % COLORS.length]}
                      stroke="#0a0a0a"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  formatter={(value, entry, index) => (
                    <span className="text-xs">{ingresosServiciosData[index as number]?.nombre}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detalle de Servicios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Detalle de Servicios</CardTitle>
          <CardDescription>Información completa de ventas e ingresos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {serviciosData.map((servicio, index) => (
              <div
                key={servicio.nombre}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-3 h-3 rounded flex-shrink-0"
                    style={{ backgroundColor: servicio.color || COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium text-sm truncate">{servicio.nombre}</span>
                  <Badge
                    variant="outline"
                    className="text-xs border-primary text-primary flex-shrink-0"
                  >
                    #{index + 1}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{servicio.ventas} ventas</p>
                  <p className="text-xs text-primary">Bs. {servicio.ingresos.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Inscripciones por Servicio y Sucursal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Users className="h-5 w-5" />
            Inscripciones por Servicio y Sucursal
          </CardTitle>
          <CardDescription>
            Cantidad de inscritos filtrado por rango de fechas, servicio y sucursal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FiltroInscripciones
            fechaInicio={fechaInicioInscripciones}
            fechaFin={fechaFinInscripciones}
            onFechaInicioChange={setFechaInicioInscripciones}
            onFechaFinChange={setFechaFinInscripciones}
            selectedServicio={selectedServicioInscripciones}
            onServicioChange={setSelectedServicioInscripciones}
            servicios={serviciosDisponibles}
            selectedSucursalInscripciones={selectedSucursalInscripciones}
            onSucursalInscripcionesChange={setSelectedSucursalInscripciones}
            sucursales={sucursales}
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Servicio</th>
                  <th className="text-left p-3 font-medium">Sucursal</th>
                  <th className="text-right p-3 font-medium">Cantidad de Inscritos</th>
                </tr>
              </thead>
              <tbody>
                {inscripcionesAgrupadas.size === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center p-8 text-muted-foreground">
                      No hay inscripciones en el rango seleccionado
                    </td>
                  </tr>
                ) : (
                  Array.from(inscripcionesAgrupadas.entries()).map(([servicioNombre, sucursalMap]) =>
                    Array.from(sucursalMap.entries()).map(([sucursalNombre, cantidad]) => (
                      <tr
                        key={`${servicioNombre}-${sucursalNombre}`}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 font-medium">{servicioNombre}</td>
                        <td className="p-3">{sucursalNombre}</td>
                        <td className="p-3 text-right">
                          <Badge variant="default" className="bg-primary">
                            {cantidad}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ✅ NUEVO: Movimientos de Fechas de Inscripción */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <CalendarClock className="h-5 w-5" />
            Movimientos de Fechas de Inscripción
          </CardTitle>
          <CardDescription>
            Registro de cambios de fecha de inicio/vencimiento realizados por administradores y recepcionistas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FiltroMovimientosFechas
            fechaInicio={fechaInicioMovFechas}
            fechaFin={fechaFinMovFechas}
            onFechaInicioChange={setFechaInicioMovFechas}
            onFechaFinChange={setFechaFinMovFechas}
            selectedServicio={selectedServicioMovFechas}
            onServicioChange={setSelectedServicioMovFechas}
            servicios={serviciosDisponibles}
            selectedSucursal={selectedSucursalMovFechas}
            onSucursalChange={setSelectedSucursalMovFechas}
            sucursales={sucursales}
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Fecha</th>
                  <th className="text-left p-3 font-medium">Usuario</th>
                  <th className="text-left p-3 font-medium">Persona</th>
                  <th className="text-left p-3 font-medium">Servicio</th>
                  <th className="text-left p-3 font-medium">Sucursal</th>
                  <th className="text-left p-3 font-medium">Inicio (antes → después)</th>
                  <th className="text-left p-3 font-medium">Vencimiento (antes → después)</th>
                </tr>
              </thead>
              <tbody>
                {movimientosFechas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-muted-foreground">
                      No hay movimientos de fechas en el rango seleccionado
                    </td>
                  </tr>
                ) : (
                  movimientosFechas.map((mov) => (
                    <tr key={mov.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        {/* ✅ FIX: formateo sin conversión de zona horaria */}
                        {formatDateTime(mov.fecha)}
                      </td>
                      <td className="p-3 font-medium">{mov.usuarioNombre}</td>
                      <td className="p-3">{mov.personaNombre}</td>
                      <td className="p-3">{mov.servicioNombre}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {mov.sucursalNombre}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground line-through">
                            {mov.fechaInicioAnterior || "—"}
                          </span>
                          <span className="text-primary">→</span>
                          <span className="font-medium text-green-600">
                            {mov.fechaInicioNueva || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground line-through">
                            {mov.fechaVencimientoAnterior || "—"}
                          </span>
                          <span className="text-primary">→</span>
                          <span className="font-medium text-green-600">
                            {mov.fechaVencimientoNueva || "—"}
                          </span>
                        </div>
                      </td>
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