// src/pages/admin/SalesControl.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useUser } from "@/contexts/UserContext";
import { getStoredUserData } from "@/api/loginapi";
import {
  TrendingUp,
  Package,
  Dumbbell,
  Eye,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  CalendarIcon,
  Receipt,
  FileText,
  BarChart3,
  UserCheck,
  Trash2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSales,
  getSucursales,
  getTotalSales,
  anularVenta,
  type SaleRecord,
  type Sucursal,
  type FilterTotals,
} from "@/api/SalesControlapi";
import { useToast } from "@/hooks/use-toast";

// ============================================
// TIPOS
// ============================================
interface SaleItem {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface ResumenDetallado {
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

type DateFilterType =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "specific"
  | "range"
  | "all";

// ============================================
// HELPER: ¿La venta es de hoy?
// fecha viene como "DD/MM/YYYY, HH24:MI:SS"
// ============================================
function isSaleFromToday(fechaStr: string): boolean {
  try {
    const parts = fechaStr.split(", ");
    if (parts.length < 1) return false;
    const [day, month, year] = parts[0].split("/").map(Number);
    const now = new Date();
    return (
      day === now.getDate() &&
      month === now.getMonth() + 1 &&
      year === now.getFullYear()
    );
  } catch {
    return false;
  }
}

// ============================================
// CALENDARIO SIMPLE
// ============================================
function SimpleCalendar({
  selected,
  onSelect,
}: {
  selected?: Date;
  onSelect: (date: Date) => void;
}) {
  const [currentDate, setCurrentDate] = useState(selected || new Date());
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const weekDays = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];

  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const handlePrevMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  const handleNextMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const isSelectedDate = (day: number) => {
    if (!selected) return false;
    return (
      selected.getDate() === day &&
      selected.getMonth() === currentDate.getMonth() &&
      selected.getFullYear() === currentDate.getFullYear()
    );
  };

  return (
    <div className="p-3 w-[280px] max-w-[90vw]">
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={handlePrevMonth}>
          {"<"}
        </Button>
        <span className="font-medium text-sm">
          {months[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
        <Button variant="outline" size="sm" onClick={handleNextMonth}>
          {">"}
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div key={index} className="text-center">
            {day !== null ? (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0 font-normal",
                  isSelectedDate(day) &&
                    "bg-primary text-black hover:bg-primary/90"
                )}
                onClick={() =>
                  onSelect(
                    new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth(),
                      day
                    )
                  )
                }
              >
                {day}
              </Button>
            ) : (
              <div className="h-8 w-8" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// SUMMARY CARD
// ============================================
function SummaryCard({
  title,
  total,
  efectivo,
  qr,
  icon: Icon,
  iconColor = "text-primary",
}: {
  title: string;
  total: number;
  efectivo: number;
  qr: number;
  icon: any;
  iconColor?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-lg md:text-2xl font-bold">
          Bs. {total.toFixed(2)}
        </div>
        <div className="mt-2 pt-2 border-t">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Efectivo:</span>
            <span className="font-medium text-green-600">
              Bs. {efectivo.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-muted-foreground">QR:</span>
            <span className="font-medium text-blue-600">
              Bs. {qr.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// RESUMEN DETALLADO MODAL
// ============================================
function ResumenDetalladoModal({
  open,
  onOpenChange,
  data,
  filterDescription,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ResumenDetallado | null;
  filterDescription: string;
}) {
  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[85vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg flex items-center gap-2">
            <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
            Resumen Detallado de Ventas
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            {filterDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-orange-500/10 px-4 py-2 flex items-center gap-2 flex-wrap">
              <Package className="h-4 w-4 text-orange-500" />
              <h3 className="font-semibold text-sm">Productos Vendidos</h3>
              <Badge variant="secondary" className="ml-auto text-xs">
                Total: Bs. {data.productos.totalGeneral.toFixed(2)}
              </Badge>
            </div>
            <div className="p-4">
              {data.productos.items.length > 0 ? (
                <div className="space-y-2">
                  {data.productos.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-sm border-b pb-2 gap-2"
                    >
                      <span className="font-medium break-words">
                        {item.nombre}
                      </span>
                      <span className="text-muted-foreground flex-shrink-0">
                        x{item.cantidad}
                      </span>
                    </div>
                  ))}
                  <div className="pt-3 mt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Efectivo:</span>
                      <span className="text-green-600 font-medium">
                        Bs. {data.productos.totalEfectivo.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">QR:</span>
                      <span className="text-blue-600 font-medium">
                        Bs. {data.productos.totalQr.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No hay ventas de productos en este período
                </p>
              )}
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-purple-500/10 px-4 py-2 flex items-center gap-2 flex-wrap">
              <Dumbbell className="h-4 w-4 text-purple-500" />
              <h3 className="font-semibold text-sm">Servicios Vendidos</h3>
              <Badge variant="secondary" className="ml-auto text-xs">
                Total: Bs. {data.servicios.totalGeneral.toFixed(2)}
              </Badge>
            </div>
            <div className="p-4">
              {data.servicios.items.length > 0 ? (
                <div className="space-y-2">
                  {data.servicios.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-sm border-b pb-2 gap-2"
                    >
                      <span className="font-medium break-words">
                        {item.nombre}
                      </span>
                      <span className="text-muted-foreground flex-shrink-0">
                        x{item.cantidad}
                      </span>
                    </div>
                  ))}
                  <div className="pt-3 mt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Efectivo:</span>
                      <span className="text-green-600 font-medium">
                        Bs. {data.servicios.totalEfectivo.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">QR:</span>
                      <span className="text-blue-600 font-medium">
                        Bs. {data.servicios.totalQr.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No hay ventas de servicios en este período
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export function SalesControl() {
  const { user } = useUser();
  const { toast } = useToast();

  const [salesData, setSalesData] = useState<{
    sales: SaleRecord[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>({
    sales: [],
    pagination: { page: 1, pageSize: 15, total: 0, totalPages: 0 },
  });

  const [allSales, setAllSales] = useState<SaleRecord[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFilterType, setDateFilterType] = useState<DateFilterType>("today");
  const [specificDate, setSpecificDate] = useState<Date>();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const [selectedSucursal, setSelectedSucursal] = useState<string>(() => {
    const storedUser = getStoredUserData();
    if (storedUser && storedUser.rol !== "admin" && storedUser.idsucursal) {
      return storedUser.idsucursal.toString();
    }
    return "all";
  });

  const [selectedUsuario, setSelectedUsuario] = useState<string>("all");
  const [selectedMetodoPago, setSelectedMetodoPago] = useState<string>("all");

  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [specificDateOpen, setSpecificDateOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // ✅ Estado para anular
  const [saleToAnular, setSaleToAnular] = useState<SaleRecord | null>(null);
  const [isAnularModalOpen, setIsAnularModalOpen] = useState(false);
  const [isAnulando, setIsAnulando] = useState(false);

  const [totales, setTotales] = useState<FilterTotals>({
    totalGeneral: 0,
    efectivoGeneral: 0,
    qrGeneral: 0,
    totalProductos: 0,
    efectivoProductos: 0,
    qrProductos: 0,
    totalServicios: 0,
    efectivoServicios: 0,
    qrServicios: 0,
  });

  const [resumenDetallado, setResumenDetallado] =
    useState<ResumenDetallado | null>(null);
  const [isResumenModalOpen, setIsResumenModalOpen] = useState(false);

  const esRecepcionista = user?.rol === "recepcionista";
  const esAdmin = user?.rol === "admin" || user?.rol === "superadmin";

  // ============================================
  // HELPERS
  // ============================================
  const formatDateForBackend = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // ============================================
  // CARGAR SUCURSALES
  // ============================================
  useEffect(() => {
    const loadSucursales = async () => {
      try {
        const sucursalesData = await getSucursales();
        setSucursales(sucursalesData);
      } catch (error) {
        console.error("Error cargando sucursales:", error);
      }
    };
    loadSucursales();
  }, []);

  useEffect(() => {
    const storedUser = getStoredUserData();
    if (
      storedUser &&
      storedUser.rol !== "admin" &&
      storedUser.rol !== "superadmin" &&
      storedUser.idsucursal
    ) {
      setSelectedSucursal(storedUser.idsucursal.toString());
    }
  }, []);

  // ============================================
  // CARGAR VENTAS + TOTALES
  // ============================================
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = { dateFilterType };

      if (dateFilterType === "specific" && specificDate) {
        filters.specificDate = formatDateForBackend(specificDate);
      }
      if (dateFilterType === "range" && startDate && endDate) {
        filters.startDate = formatDateForBackend(startDate);
        filters.endDate = formatDateForBackend(endDate);
      }
      if (selectedSucursal !== "all") {
        filters.sucursal = selectedSucursal;
      }
      if (!esRecepcionista && selectedUsuario !== "all") {
        filters.empleadoId = selectedUsuario;
      }

      const [salesResponse, totalsResponse] = await Promise.all([
        getSales(filters, 1, 1000),
        getTotalSales(filters),
      ]);

      setAllSales(salesResponse.sales);
      setTotales(totalsResponse);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error cargando ventas:", error);
    } finally {
      setLoading(false);
    }
  }, [
    dateFilterType,
    specificDate,
    startDate,
    endDate,
    selectedSucursal,
    selectedUsuario,
    esRecepcionista,
  ]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ============================================
  // FILTRO LOCAL: método de pago
  // ============================================
  const salesFiltradasPorMetodo = useMemo(() => {
    if (selectedMetodoPago === "all") return allSales;
    return allSales.filter((s) => s.formaPago === selectedMetodoPago);
  }, [allSales, selectedMetodoPago]);

  // ============================================
  // PAGINACIÓN CLIENT-SIDE
  // ============================================
  useEffect(() => {
    const start = (currentPage - 1) * pageSize;
    const paginated = salesFiltradasPorMetodo.slice(start, start + pageSize);
    setSalesData({
      sales: paginated,
      pagination: {
        page: currentPage,
        pageSize,
        total: salesFiltradasPorMetodo.length,
        totalPages: Math.ceil(salesFiltradasPorMetodo.length / pageSize),
      },
    });
  }, [salesFiltradasPorMetodo, currentPage, pageSize]);

  // ============================================
  // ACCIONES
  // ============================================
  const recargarTodo = () => {
    setCurrentPage(1);
    cargarDatos();
  };

  const limpiarFiltros = () => {
    setDateFilterType("today");
    setSpecificDate(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    const storedUser = getStoredUserData();
    if (
      storedUser &&
      storedUser.rol !== "admin" &&
      storedUser.rol !== "superadmin" &&
      storedUser.idsucursal
    ) {
      setSelectedSucursal(storedUser.idsucursal.toString());
    } else {
      setSelectedSucursal("all");
    }
    setSelectedUsuario("all");
    setSelectedMetodoPago("all");
    setCurrentPage(1);
  };

  const handleViewDetails = (sale: SaleRecord) => {
    setSelectedSale(sale);
    setIsDetailModalOpen(true);
  };

  // ============================================
  // ✅ ABRIR MODAL DE ANULAR
  // ============================================
  const handleOpenAnular = (sale: SaleRecord) => {
    if (!esAdmin) {
      toast({
        title: "No autorizado",
        description: "Solo un administrador puede anular ventas.",
        variant: "destructive",
      });
      return;
    }

    if (!isSaleFromToday(sale.fecha)) {
      toast({
        title: "No se puede anular",
        description: "Solo se pueden anular ventas realizadas el día de hoy.",
        variant: "destructive",
      });
      return;
    }

    setSaleToAnular(sale);
    setIsAnularModalOpen(true);
  };

  // ============================================
  // ✅ CONFIRMAR ANULACIÓN
  // ============================================
  const handleConfirmAnular = async () => {
    if (!saleToAnular) return;

    setIsAnulando(true);
    try {
      const result = await anularVenta(saleToAnular.id, saleToAnular.tipo);

      toast({
        title: "✅ Venta anulada",
        description: result.message,
      });

      setIsAnularModalOpen(false);
      setSaleToAnular(null);
      setIsDetailModalOpen(false);
      setSelectedSale(null);

      // Recargar datos para reflejar cambios
      await cargarDatos();
    } catch (error: any) {
      toast({
        title: "❌ Error al anular",
        description: error.message || "No se pudo anular la venta",
        variant: "destructive",
      });
    } finally {
      setIsAnulando(false);
    }
  };

  // ============================================
  // USUARIOS ÚNICOS
  // ============================================
  const usuariosUnicos = useMemo(() => {
    const map = new Map<string, string>();
    allSales.forEach((sale) => {
      if (sale.empleado && !map.has(sale.empleado)) {
        map.set(sale.empleado, sale.empleado);
      }
    });
    return Array.from(map, ([id, nombre]) => ({ id, nombre }));
  }, [allSales]);

  // ============================================
  // RESUMEN DETALLADO
  // ============================================
  const generarResumenDetallado = useCallback(() => {
    const filtradas = salesFiltradasPorMetodo;

    const productosMap = new Map<string, number>();
    const serviciosMap = new Map<string, number>();

    let totalProductosEfectivo = 0;
    let totalProductosQr = 0;
    let totalServiciosEfectivo = 0;
    let totalServiciosQr = 0;

    filtradas.forEach((sale) => {
      const esProducto = sale.tipo === "producto";
      const montoEfectivo = sale.efectivo || 0;
      const montoQr = sale.qr || 0;
      const totalVenta = sale.total > 0 ? sale.total : 1;

      if (sale.items && sale.items.length > 0) {
        const sumItemsSubtotal = sale.items.reduce(
          (sum, item) => sum + (item.subtotal || 0),
          0
        );
        const denominador = sumItemsSubtotal > 0 ? sumItemsSubtotal : totalVenta;

        sale.items.forEach((item) => {
          const proporcion = (item.subtotal || 0) / denominador;

          if (esProducto) {
            const existing = productosMap.get(item.nombre);
            productosMap.set(item.nombre, (existing || 0) + item.cantidad);
            totalProductosEfectivo += montoEfectivo * proporcion;
            totalProductosQr += montoQr * proporcion;
          } else {
            const existing = serviciosMap.get(item.nombre);
            serviciosMap.set(item.nombre, (existing || 0) + item.cantidad);
            totalServiciosEfectivo += montoEfectivo * proporcion;
            totalServiciosQr += montoQr * proporcion;
          }
        });
      } else {
        if (esProducto) {
          totalProductosEfectivo += montoEfectivo;
          totalProductosQr += montoQr;
        } else {
          totalServiciosEfectivo += montoEfectivo;
          totalServiciosQr += montoQr;
        }
      }
    });

    const productosItems = Array.from(productosMap.entries()).map(
      ([nombre, cantidad]) => ({ nombre, cantidad })
    );
    const serviciosItems = Array.from(serviciosMap.entries()).map(
      ([nombre, cantidad]) => ({ nombre, cantidad })
    );

    setResumenDetallado({
      productos: {
        items: productosItems,
        totalGeneral: filtradas
          .filter((s) => s.tipo === "producto")
          .reduce((sum, s) => sum + s.total, 0),
        totalEfectivo: totalProductosEfectivo,
        totalQr: totalProductosQr,
      },
      servicios: {
        items: serviciosItems,
        totalGeneral: filtradas
          .filter((s) => s.tipo === "servicio")
          .reduce((sum, s) => sum + s.total, 0),
        totalEfectivo: totalServiciosEfectivo,
        totalQr: totalServiciosQr,
      },
    });
  }, [salesFiltradasPorMetodo]);

  const abrirResumenModal = () => {
    generarResumenDetallado();
    setIsResumenModalOpen(true);
  };

  // ============================================
  // DESCRIPCIONES DE FILTROS
  // ============================================
  const getFilterDescriptionForModal = useCallback(() => {
    const partes: string[] = [];

    switch (dateFilterType) {
      case "today":
        partes.push("Hoy");
        break;
      case "yesterday":
        partes.push("Ayer");
        break;
      case "thisWeek":
        partes.push("Esta semana");
        break;
      case "lastWeek":
        partes.push("Semana pasada");
        break;
      case "thisMonth":
        partes.push("Este mes");
        break;
      case "lastMonth":
        partes.push("Mes pasado");
        break;
      case "specific":
        partes.push(
          specificDate ? format(specificDate, "dd/MM/yyyy") : "Fecha específica"
        );
        break;
      case "range":
        partes.push(
          startDate && endDate
            ? `${format(startDate, "dd/MM/yyyy")} - ${format(
                endDate,
                "dd/MM/yyyy"
              )}`
            : "Rango"
        );
        break;
      case "all":
        partes.push("Todos los períodos");
        break;
    }

    if (selectedSucursal !== "all" && user?.rol === "admin") {
      partes.push(selectedSucursal);
    }
    if (selectedUsuario !== "all" && !esRecepcionista) {
      partes.push(`Usuario: ${selectedUsuario}`);
    }
    if (selectedMetodoPago !== "all") {
      const metodoMap = { efectivo: "Efectivo", qr: "QR", mixto: "Mixto" };
      partes.push(
        `Pago: ${metodoMap[selectedMetodoPago as keyof typeof metodoMap]}`
      );
    }
    if (esRecepcionista) {
      partes.push("Solo mis ventas");
    }

    return partes.join(" • ");
  }, [
    dateFilterType,
    specificDate,
    startDate,
    endDate,
    selectedSucursal,
    selectedUsuario,
    selectedMetodoPago,
    user,
    esRecepcionista,
  ]);

  const getFilterDescription = () => {
    switch (dateFilterType) {
      case "today":
        return "Hoy";
      case "yesterday":
        return "Ayer";
      case "thisWeek":
        return "Esta semana";
      case "lastWeek":
        return "Semana pasada";
      case "thisMonth":
        return "Este mes";
      case "lastMonth":
        return "Mes pasado";
      case "specific":
        return specificDate
          ? format(specificDate, "dd/MM/yyyy")
          : "Fecha específica";
      case "range":
        return startDate && endDate
          ? `${format(startDate, "dd/MM")} - ${format(endDate, "dd/MM/yyyy")}`
          : "Rango";
      case "all":
        return "Todos";
      default:
        return "Seleccionar";
    }
  };

  // ============================================
  // VENTAS FILTRADAS PARA TABS
  // ============================================
  const productSales = salesData.sales.filter(
    (s: SaleRecord) => s.tipo === "producto"
  );
  const serviceSales = salesData.sales.filter(
    (s: SaleRecord) => s.tipo === "servicio"
  );

  // ============================================
  // FORMATO
  // ============================================
  const formatPaymentMethod = (sale: SaleRecord) => {
    switch (sale.formaPago) {
      case "efectivo":
        return <Badge className="bg-green-100 text-green-800">Efectivo</Badge>;
      case "qr":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            QR
          </Badge>
        );
      case "mixto":
        return (
          <Badge className="bg-purple-100 text-purple-800">Mixto</Badge>
        );
      default:
        return null;
    }
  };

  const formatPaymentDetails = (sale: SaleRecord) => {
    if (sale.formaPago === "mixto") {
      return (
        <div className="text-xs space-y-0.5">
          <div className="text-green-600">
            Efectivo: Bs. {(sale.efectivo || 0).toFixed(2)}
          </div>
          <div className="text-blue-600">
            QR: Bs. {(sale.qr || 0).toFixed(2)}
          </div>
        </div>
      );
    }
    return (
      <div className="text-xs font-medium">Bs. {sale.total.toFixed(2)}</div>
    );
  };

  const formatDetail = (items: SaleItem[] | any) => {
    let arr: SaleItem[] = [];
    if (Array.isArray(items)) {
      arr = items;
    } else if (typeof items === "string") {
      try {
        const parsed = JSON.parse(items);
        if (Array.isArray(parsed)) arr = parsed;
      } catch {
        arr = [];
      }
    }

    if (arr.length === 0) {
      return <span className="text-muted-foreground text-xs">—</span>;
    }

    return arr.map((item, index) => (
      <div key={index} className="text-xs py-0.5">
        • {item.nombre} x{item.cantidad}
      </div>
    ));
  };

  const formatCliente = (cliente: string | undefined) => {
    if (!cliente || cliente.trim() === "") {
      return <span className="text-muted-foreground text-xs">—</span>;
    }

    const clientes = cliente
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (clientes.length === 1) {
      return <span className="text-xs md:text-sm">{clientes[0]}</span>;
    }

    return (
      <div className="flex flex-col gap-0.5">
        {clientes.map((c, idx) => (
          <div key={idx} className="text-xs md:text-sm flex items-start gap-1">
            <span className="text-muted-foreground">-</span>
            <span>{c}</span>
          </div>
        ))}
      </div>
    );
  };

  // ============================================
  // BOTÓN DE ANULAR (solo admin + venta de hoy)
  // ============================================
  const renderAnularButton = (sale: SaleRecord) => {
    if (!esAdmin) return null;
    const esHoy = isSaleFromToday(sale.fecha);
    if (!esHoy) {
      return (
        <Button
          variant="ghost"
          size="icon"
          disabled
          title="Solo se pueden anular ventas de hoy"
          className="h-7 w-7 md:h-8 md:w-8 opacity-40"
        >
          <Lock className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
      );
    }
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleOpenAnular(sale)}
        title="Anular venta"
        className="h-7 w-7 md:h-8 md:w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
      </Button>
    );
  };

  // ============================================
  // LOADING
  // ============================================
  if (loading && allSales.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-3 p-3 md:space-y-4 md:p-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-primary flex items-center gap-2">
            <Receipt className="h-5 w-5 md:h-6 md:w-6" />
            Control de Ventas
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Resumen y detalle de todas las transacciones
          </p>
          {esRecepcionista && (
            <Badge
              variant="secondary"
              className="mt-2 text-[10px] md:text-xs gap-1"
            >
              <UserCheck className="h-3 w-3" />
              Mostrando solo mis ventas
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 w-full sm:flex sm:justify-end sm:w-auto">
          <Button
            variant="default"
            size="sm"
            onClick={abrirResumenModal}
            className="h-9 bg-primary hover:bg-primary/90 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3"
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
            <span className="truncate">Resumen</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-9 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3"
          >
            <Filter className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
            <span className="truncate">Filtros</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={recargarTodo}
            className="h-9 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5 mr-1 flex-shrink-0",
                loading && "animate-spin"
              )}
            />
            <span className="truncate">Recargar</span>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] md:text-xs text-muted-foreground">
                  Período
                </Label>
                <Select
                  value={dateFilterType}
                  onValueChange={(v) => {
                    setDateFilterType(v as DateFilterType);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs md:text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="yesterday">Ayer</SelectItem>
                    <SelectItem value="thisWeek">Esta semana</SelectItem>
                    <SelectItem value="lastWeek">Semana pasada</SelectItem>
                    <SelectItem value="thisMonth">Este mes</SelectItem>
                    <SelectItem value="lastMonth">Mes pasado</SelectItem>
                    <SelectItem value="specific">Fecha específica</SelectItem>
                    <SelectItem value="range">Rango</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateFilterType === "specific" && (
                <div className="space-y-1">
                  <Label className="text-[10px] md:text-xs text-muted-foreground">
                    Fecha
                  </Label>
                  <Popover
                    open={specificDateOpen}
                    onOpenChange={setSpecificDateOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start h-9 text-xs md:text-sm"
                      >
                        <CalendarIcon className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">
                          {specificDate
                            ? format(specificDate, "dd/MM/yyyy")
                            : "Seleccionar"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <SimpleCalendar
                        selected={specificDate}
                        onSelect={(d) => {
                          setSpecificDate(d);
                          setSpecificDateOpen(false);
                          setCurrentPage(1);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {dateFilterType === "range" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-[10px] md:text-xs text-muted-foreground">
                      Desde
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start h-9 text-xs md:text-sm"
                        >
                          <CalendarIcon className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">
                            {startDate
                              ? format(startDate, "dd/MM/yyyy")
                              : "Seleccionar"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <SimpleCalendar
                          selected={startDate}
                          onSelect={(d) => {
                            setStartDate(d);
                            setCurrentPage(1);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] md:text-xs text-muted-foreground">
                      Hasta
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start h-9 text-xs md:text-sm"
                        >
                          <CalendarIcon className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">
                            {endDate
                              ? format(endDate, "dd/MM/yyyy")
                              : "Seleccionar"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <SimpleCalendar
                          selected={endDate}
                          onSelect={(d) => {
                            setEndDate(d);
                            setCurrentPage(1);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              {(user?.rol === "admin" || user?.rol === "superadmin") && (
                <div className="space-y-1">
                  <Label className="text-[10px] md:text-xs text-muted-foreground">
                    Sucursal
                  </Label>
                  <Select
                    value={selectedSucursal}
                    onValueChange={(v) => {
                      setSelectedSucursal(v);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs md:text-sm w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sucursales.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(user?.rol === "admin" || user?.rol === "superadmin") && (
                <div className="space-y-1">
                  <Label className="text-[10px] md:text-xs text-muted-foreground">
                    Usuario
                  </Label>
                  <Select
                    value={selectedUsuario}
                    onValueChange={(v) => {
                      setSelectedUsuario(v);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs md:text-sm w-full">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {usuariosUnicos.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-[10px] md:text-xs text-muted-foreground">
                  Método
                </Label>
                <Select
                  value={selectedMetodoPago}
                  onValueChange={(v) => {
                    setSelectedMetodoPago(v);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs md:text-sm w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="qr">QR</SelectItem>
                    <SelectItem value="mixto">Mixto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(dateFilterType !== "all" ||
              selectedSucursal !== "all" ||
              (!esRecepcionista && selectedUsuario !== "all") ||
              selectedMetodoPago !== "all" ||
              esRecepcionista) && (
              <div className="mt-3 pt-2 text-[10px] md:text-xs text-muted-foreground border-t flex flex-wrap items-center gap-1">
                <span>Filtros aplicados:</span>
                <span>{getFilterDescription()}</span>
                {selectedSucursal !== "all" &&
                  (user?.rol === "admin" || user?.rol === "superadmin") && (
                    <span>• {selectedSucursal}</span>
                  )}
                {selectedUsuario !== "all" && !esRecepcionista && (
                  <span>• {selectedUsuario}</span>
                )}
                {selectedMetodoPago !== "all" && (
                  <span>
                    •{" "}
                    {selectedMetodoPago === "efectivo"
                      ? "Efectivo"
                      : selectedMetodoPago === "qr"
                      ? "QR"
                      : "Mixto"}
                  </span>
                )}
                {esRecepcionista && <span>• Solo mis ventas</span>}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limpiarFiltros}
                  className="h-6 px-2 text-[10px] md:text-xs"
                >
                  Limpiar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resumen - 3 tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          title="Total General"
          total={totales.totalGeneral}
          efectivo={totales.efectivoGeneral}
          qr={totales.qrGeneral}
          icon={TrendingUp}
        />
        <SummaryCard
          title="Productos"
          total={totales.totalProductos}
          efectivo={totales.efectivoProductos}
          qr={totales.qrProductos}
          icon={Package}
          iconColor="text-orange-500"
        />
        <SummaryCard
          title="Servicios"
          total={totales.totalServicios}
          efectivo={totales.efectivoServicios}
          qr={totales.qrServicios}
          icon={Dumbbell}
          iconColor="text-purple-500"
        />
      </div>

      {/* Detalle de Ventas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm md:text-base flex items-center gap-2 flex-wrap">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span>Detalle de Ventas</span>
            <Badge variant="secondary" className="text-[10px] md:text-xs">
              {salesData.pagination.total} registros
            </Badge>
          </CardTitle>
          <CardDescription className="text-[10px] md:text-xs">
            Página {currentPage} de {salesData.pagination.totalPages || 1}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 md:px-6">
          <Tabs defaultValue="productos" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-3 md:mb-4 max-w-md">
              <TabsTrigger
                value="productos"
                className="gap-1 text-xs md:text-sm"
              >
                <Package className="h-3 w-3 flex-shrink-0" />
                <span>Productos ({productSales.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="servicios"
                className="gap-1 text-xs md:text-sm"
              >
                <Dumbbell className="h-3 w-3 flex-shrink-0" />
                <span>Servicios ({serviceSales.length})</span>
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <TabsContent value="productos" className="mt-0">
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="min-w-[80px] text-xs">
                            Fecha
                          </TableHead>
                          <TableHead className="min-w-[90px] text-xs">
                            Sucursal
                          </TableHead>
                          <TableHead className="min-w-[90px] text-xs">
                            Empleado
                          </TableHead>
                          <TableHead className="min-w-[180px] text-xs">
                            Productos
                          </TableHead>
                          <TableHead className="min-w-[70px] text-xs">
                            Subtotal
                          </TableHead>
                          <TableHead className="min-w-[70px] text-xs">
                            Dto.
                          </TableHead>
                          <TableHead className="min-w-[70px] text-xs">
                            Total
                          </TableHead>
                          <TableHead className="min-w-[80px] text-xs">
                            Pago
                          </TableHead>
                          <TableHead className="min-w-[90px] text-xs">
                            Detalle
                          </TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productSales.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={10}
                              className="text-center py-8 text-muted-foreground"
                            >
                              No hay ventas de productos
                            </TableCell>
                          </TableRow>
                        ) : (
                          productSales.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell className="font-mono text-[10px] md:text-xs">
                                {sale.fecha}
                              </TableCell>
                              <TableCell className="text-xs md:text-sm">
                                {sale.sucursal}
                              </TableCell>
                              <TableCell className="text-xs md:text-sm">
                                {sale.empleado}
                              </TableCell>
                              <TableCell className="max-w-[180px]">
                                {formatDetail(sale.items || [])}
                              </TableCell>
                              <TableCell className="text-xs md:text-sm">
                                Bs. {sale.subtotal.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-destructive text-xs md:text-sm">
                                {sale.descuento > 0
                                  ? `-Bs. ${sale.descuento.toFixed(2)}`
                                  : "-"}
                              </TableCell>
                              <TableCell className="font-bold text-xs md:text-sm">
                                Bs. {sale.total.toFixed(2)}
                              </TableCell>
                              <TableCell>{formatPaymentMethod(sale)}</TableCell>
                              <TableCell>
                                {formatPaymentDetails(sale)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewDetails(sale)}
                                    className="h-7 w-7 md:h-8 md:w-8"
                                  >
                                    <Eye className="h-3 w-3 md:h-4 md:w-4" />
                                  </Button>
                                  {renderAnularButton(sale)}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="servicios" className="mt-0">
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="min-w-[80px] text-xs">
                            Fecha
                          </TableHead>
                          <TableHead className="min-w-[90px] text-xs">
                            Sucursal
                          </TableHead>
                          <TableHead className="min-w-[90px] text-xs">
                            Cliente
                          </TableHead>
                          <TableHead className="min-w-[90px] text-xs">
                            Empleado
                          </TableHead>
                          <TableHead className="min-w-[180px] text-xs">
                            Servicios
                          </TableHead>
                          <TableHead className="min-w-[70px] text-xs">
                            Subtotal
                          </TableHead>
                          <TableHead className="min-w-[70px] text-xs">
                            Dto.
                          </TableHead>
                          <TableHead className="min-w-[70px] text-xs">
                            Total
                          </TableHead>
                          <TableHead className="min-w-[80px] text-xs">
                            Pago
                          </TableHead>
                          <TableHead className="min-w-[90px] text-xs">
                            Detalle
                          </TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {serviceSales.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={11}
                              className="text-center py-8 text-muted-foreground"
                            >
                              No hay ventas de servicios
                            </TableCell>
                          </TableRow>
                        ) : (
                          serviceSales.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell className="font-mono text-[10px] md:text-xs">
                                {sale.fecha}
                              </TableCell>
                              <TableCell className="text-xs md:text-sm">
                                {sale.sucursal}
                              </TableCell>
                              <TableCell className="align-top">
                                {formatCliente(sale.cliente)}
                              </TableCell>
                              <TableCell className="text-xs md:text-sm">
                                {sale.empleado}
                              </TableCell>
                              <TableCell className="max-w-[180px]">
                                {formatDetail(sale.items || [])}
                              </TableCell>
                              <TableCell className="text-xs md:text-sm">
                                Bs. {sale.subtotal.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-destructive text-xs md:text-sm">
                                {sale.descuento > 0
                                  ? `-Bs. ${sale.descuento.toFixed(2)}`
                                  : "-"}
                              </TableCell>
                              <TableCell className="font-bold text-xs md:text-sm">
                                Bs. {sale.total.toFixed(2)}
                              </TableCell>
                              <TableCell>{formatPaymentMethod(sale)}</TableCell>
                              <TableCell>
                                {formatPaymentDetails(sale)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewDetails(sale)}
                                    className="h-7 w-7 md:h-8 md:w-8"
                                  >
                                    <Eye className="h-3 w-3 md:h-4 md:w-4" />
                                  </Button>
                                  {renderAnularButton(sale)}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </>
            )}

            {/* Paginación */}
            {salesData.pagination.totalPages > 1 && (
              <div className="flex flex-wrap justify-center items-center gap-1 md:gap-2 mt-4 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-7 w-7 md:h-8 md:w-8 p-0"
                >
                  <ChevronsLeft className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-7 w-7 md:h-8 md:w-8 p-0"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-xs md:text-sm mx-1 md:mx-2">
                  Pág. {currentPage} de {salesData.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === salesData.pagination.totalPages}
                  className="h-7 w-7 md:h-8 md:w-8 p-0"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(salesData.pagination.totalPages)
                  }
                  disabled={currentPage === salesData.pagination.totalPages}
                  className="h-7 w-7 md:h-8 md:w-8 p-0"
                >
                  <ChevronsRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de detalles */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[85vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg flex items-center gap-2">
              <Receipt className="h-4 w-4 md:h-5 md:w-5" />
              Detalles de la Venta
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Información completa de la transacción
            </DialogDescription>
          </DialogHeader>

          {selectedSale ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg text-xs md:text-sm">
                <div className="space-y-1">
                  <p>
                    <span className="text-muted-foreground">Fecha:</span>{" "}
                    {selectedSale.fecha}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Sucursal:</span>{" "}
                    {selectedSale.sucursal}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Empleado:</span>{" "}
                    {selectedSale.empleado}
                  </p>
                  {selectedSale.cliente && (
                    <div>
                      <span className="text-muted-foreground">
                        Cliente(s):
                      </span>
                      <div className="mt-1">
                        {formatCliente(selectedSale.cliente)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p>
                    <span className="text-muted-foreground">Subtotal:</span> Bs.{" "}
                    {selectedSale.subtotal.toFixed(2)}
                  </p>
                  <p>
                    <span className="text-muted-foreground text-destructive">
                      Descuento:
                    </span>{" "}
                    -Bs. {selectedSale.descuento.toFixed(2)}
                  </p>
                  <p className="font-bold">
                    <span className="text-muted-foreground">Total:</span> Bs.{" "}
                    {selectedSale.total.toFixed(2)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Forma pago:</span>{" "}
                    {formatPaymentMethod(selectedSale)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Items:</h4>
                <div className="border rounded-lg p-3 space-y-2">
                  {selectedSale.items?.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-xs md:text-sm border-b last:border-0 pb-1 gap-2"
                    >
                      <span className="break-words">
                        {item.nombre} x{item.cantidad}
                      </span>
                      <span className="font-medium flex-shrink-0">
                        Bs. {item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedSale.descuento > 0 && (
                <div className="bg-amber-50 p-3 rounded-lg">
                  <p className="text-xs md:text-sm">
                    <span className="font-medium">Motivo descuento:</span>{" "}
                    {selectedSale.justificacionDescuento || "No especificado"}
                  </p>
                </div>
              )}

              {/* Botón anular dentro del modal (solo admin + hoy) */}
              {esAdmin && isSaleFromToday(selectedSale.fecha) && (
                <div className="pt-2 border-t">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleOpenAnular(selectedSale)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Anular esta venta
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground text-sm">
              No se pudieron cargar los detalles.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* ✅ Modal de confirmación de anulación */}
      <Dialog open={isAnularModalOpen} onOpenChange={setIsAnularModalOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Anular Venta
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {saleToAnular && (
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-muted/30 rounded-lg space-y-1 text-xs md:text-sm">
                <p>
                  <span className="text-muted-foreground">Venta #:</span>{" "}
                  {saleToAnular.id}
                </p>
                <p>
                  <span className="text-muted-foreground">Tipo:</span>{" "}
                  {saleToAnular.tipo === "producto"
                    ? "Productos"
                    : "Servicios"}
                </p>
                <p>
                  <span className="text-muted-foreground">Fecha:</span>{" "}
                  {saleToAnular.fecha}
                </p>
                <p>
                  <span className="text-muted-foreground">Total:</span> Bs.{" "}
                  {saleToAnular.total.toFixed(2)}
                </p>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-xs md:text-sm text-amber-900 dark:text-amber-200">
                <p className="font-medium mb-1">Se realizarán los siguientes cambios:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {saleToAnular.tipo === "producto" ? (
                    <>
                      <li>Se eliminará la venta y su detalle</li>
                      <li>Se devolverá el stock de los productos</li>
                    </>
                  ) : (
                    <>
                      <li>Se eliminará la venta y su detalle</li>
                      <li>Se eliminarán las inscripciones asociadas</li>
                      <li>La persona NO se elimina</li>
                    </>
                  )}
                  {(saleToAnular.efectivo || 0) > 0 && (
                    <li>
                      Se revertirá Bs. {(saleToAnular.efectivo || 0).toFixed(2)}{" "}
                      de la caja
                    </li>
                  )}
                  <li>Se revertirá el uso del cupón (si se usó)</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsAnularModalOpen(false);
                setSaleToAnular(null);
              }}
              disabled={isAnulando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmAnular}
              disabled={isAnulando}
            >
              {isAnulando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Anulando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Confirmar Anulación
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Resumen Detallado */}
      <ResumenDetalladoModal
        open={isResumenModalOpen}
        onOpenChange={setIsResumenModalOpen}
        data={resumenDetallado}
        filterDescription={getFilterDescriptionForModal()}
      />
    </div>
  );
}