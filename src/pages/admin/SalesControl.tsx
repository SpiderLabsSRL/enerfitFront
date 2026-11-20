// src/pages/admin/SalesControl.tsx
import { useState, useEffect, useCallback, useRef } from "react";
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
import { Input } from "@/components/ui/input";
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
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSales,
  getSucursales,
  getEmpleados,
  getTotalSales,
  getResumenDetallado,
  anularVenta,
  type SaleRecord,
  type Sucursal,
  type Empleado,
  type FilterTotals,
  type ResumenDetallado,
} from "@/api/SalesControlapi";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 20;

interface SaleItem {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
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

type TipoTab = "producto" | "servicio";

function isSaleWithinLastWeek(fechaStr: string): boolean {
  try {
    const parts = fechaStr.split(", ");
    if (parts.length < 1) return false;
    const [day, month, year] = parts[0].split("/").map(Number);
    const saleDate = Date.UTC(year, month - 1, day);
    const todayParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/La_Paz",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const todayYear = Number(todayParts.find((p) => p.type === "year")?.value);
    const todayMonth = Number(todayParts.find((p) => p.type === "month")?.value);
    const todayDay = Number(todayParts.find((p) => p.type === "day")?.value);
    const today = Date.UTC(todayYear, todayMonth - 1, todayDay);
    const daysAgo = (today - saleDate) / 86400000;
    return daysAgo >= 0 && daysAgo <= 7;
  } catch {
    return false;
  }
}

function parseItems(items: SaleItem[] | any): SaleItem[] {
  if (Array.isArray(items)) return items;
  if (typeof items === "string") {
    try {
      const parsed = JSON.parse(items);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

function SimpleCalendar({
  selected,
  onSelect,
}: {
  selected?: Date;
  onSelect: (date: Date) => void;
}) {
  const [currentDate, setCurrentDate] = useState(selected || new Date());
  const months = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
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

function PaymentMethodBadge({ sale }: { sale: SaleRecord }) {
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
      return <Badge className="bg-purple-100 text-purple-800">Mixto</Badge>;
    default:
      return null;
  }
}

function PaymentDetails({ sale }: { sale: SaleRecord }) {
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
  return <div className="text-xs font-medium">Bs. {sale.total.toFixed(2)}</div>;
}

function FormatCliente({ cliente }: { cliente: string | undefined }) {
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
}

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
    pagination: { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 },
  });

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpleados, setLoadingEmpleados] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

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
  const [selectedTipo, setSelectedTipo] = useState<TipoTab>("producto");

  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [specificDateOpen, setSpecificDateOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const [goToPageInput, setGoToPageInput] = useState<string>("");

  const [refreshKey, setRefreshKey] = useState(0);

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
  const [loadingResumen, setLoadingResumen] = useState(false);

  const esRecepcionista = user?.rol === "recepcionista";
  const esAdmin = user?.rol === "admin" || user?.rol === "superadmin";

  const filtersRef = useRef<any>({});
  filtersRef.current = {
    dateFilterType,
    specificDate,
    startDate,
    endDate,
    selectedSucursal,
    selectedUsuario,
    selectedMetodoPago,
    selectedTipo,
    esRecepcionista,
  };

  const formatDateForBackend = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const buildFiltersForBackend = useCallback((): any => {
    const f = filtersRef.current as any;
    const filters: any = { dateFilterType: f.dateFilterType };

    if (f.dateFilterType === "specific" && f.specificDate) {
      filters.specificDate = formatDateForBackend(f.specificDate);
    }
    if (f.dateFilterType === "range" && f.startDate && f.endDate) {
      filters.startDate = formatDateForBackend(f.startDate);
      filters.endDate = formatDateForBackend(f.endDate);
    }
    if (f.selectedSucursal !== "all") filters.sucursal = f.selectedSucursal;
    if (!f.esRecepcionista && f.selectedUsuario !== "all")
      filters.empleadoId = f.selectedUsuario;
    if (f.selectedMetodoPago !== "all")
      filters.metodoPago = f.selectedMetodoPago;

    return filters;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSucursales();
        setSucursales(data);
      } catch (e) {
        console.error("Error cargando sucursales:", e);
      }
    };
    load();
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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingEmpleados(true);
      try {
        const data = await getEmpleados(selectedSucursal);
        if (!cancelled) setEmpleados(data);
      } catch (e) {
        console.error("Error cargando empleados:", e);
        if (!cancelled) setEmpleados([]);
      } finally {
        if (!cancelled) setLoadingEmpleados(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedSucursal]);

  const cargarDatos = useCallback(
    async (page: number, tipo: TipoTab) => {
      setLoading(true);
      try {
        const baseFilters = buildFiltersForBackend();
        const [salesResponse, totalsResponse] = await Promise.all([
          getSales({ ...baseFilters, tipo }, page, PAGE_SIZE),
          getTotalSales(baseFilters),
        ]);
        setSalesData(salesResponse);
        setTotales(totalsResponse);
        setInitialLoadDone(true);
      } catch (error: any) {
        console.error("Error cargando ventas:", error);
        toast({
          title: "Error",
          description: error?.message || "No se pudieron cargar las ventas",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [buildFiltersForBackend, toast]
  );

  useEffect(() => {
    cargarDatos(currentPage, selectedTipo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, refreshKey, selectedTipo]);

  const handleDateFilterChange = (v: DateFilterType) => {
    setDateFilterType(v);
    setCurrentPage(1);
    setRefreshKey((k) => k + 1);
  };

  const handleSpecificDate = (d: Date) => {
    setSpecificDate(d);
    setSpecificDateOpen(false);
    setCurrentPage(1);
    setRefreshKey((k) => k + 1);
  };

  const handleStartDate = (d: Date) => {
    setStartDate(d);
    setCurrentPage(1);
    setRefreshKey((k) => k + 1);
  };

  const handleEndDate = (d: Date) => {
    setEndDate(d);
    setCurrentPage(1);
    setRefreshKey((k) => k + 1);
  };

  const handleSucursalChange = (v: string) => {
    setSelectedSucursal(v);
    setSelectedUsuario("all");
    setCurrentPage(1);
    setRefreshKey((k) => k + 1);
  };

  const handleUsuarioChange = (v: string) => {
    setSelectedUsuario(v);
    if (v !== "all") {
      const emp = empleados.find((e) => e.id === v);
      if (emp?.sucursalId) setSelectedSucursal(emp.sucursalId);
    }
    setCurrentPage(1);
    setRefreshKey((k) => k + 1);
  };

  const handleMetodoPagoChange = (v: string) => {
    setSelectedMetodoPago(v);
    setCurrentPage(1);
    setRefreshKey((k) => k + 1);
  };

  const handleTipoChange = (v: string) => {
    setSelectedTipo(v as TipoTab);
    setCurrentPage(1);
  };

  const recargarTodo = () => {
    setCurrentPage(1);
    setRefreshKey((k) => k + 1);
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
    setRefreshKey((k) => k + 1);
  };

  const handleGoToPage = () => {
    const n = parseInt(goToPageInput, 10);
    if (
      Number.isInteger(n) &&
      n >= 1 &&
      n <= (salesData.pagination.totalPages || 1)
    ) {
      setCurrentPage(n);
      setGoToPageInput("");
    } else {
      toast({
        title: "Página inválida",
        description: `Ingresá un número entre 1 y ${
          salesData.pagination.totalPages || 1
        }`,
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (sale: SaleRecord) => {
    setSelectedSale(sale);
    setIsDetailModalOpen(true);
  };

  const handleOpenAnular = (sale: SaleRecord) => {
    if (!esAdmin) {
      toast({
        title: "No autorizado",
        description: "Solo un administrador puede anular ventas.",
        variant: "destructive",
      });
      return;
    }
    if (!isSaleWithinLastWeek(sale.fecha)) {
      toast({
        title: "No se puede anular",
        description: "Solo se pueden anular ventas realizadas hoy o hasta 7 días atrás.",
        variant: "destructive",
      });
      return;
    }
    setSaleToAnular(sale);
    setIsAnularModalOpen(true);
  };

  const handleConfirmAnular = async () => {
    if (!saleToAnular) return;
    setIsAnulando(true);
    try {
      const result = await anularVenta(saleToAnular.id, saleToAnular.tipo);
      toast({ title: "✅ Venta anulada", description: result.message });
      setIsAnularModalOpen(false);
      setSaleToAnular(null);
      setIsDetailModalOpen(false);
      setSelectedSale(null);
      setRefreshKey((k) => k + 1);
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

  const abrirResumenModal = async () => {
    setLoadingResumen(true);
    try {
      const filters = buildFiltersForBackend();
      const data = await getResumenDetallado(filters);
      setResumenDetallado(data);
      setIsResumenModalOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar el resumen",
        variant: "destructive",
      });
    } finally {
      setLoadingResumen(false);
    }
  };

  const getUsuarioNombre = () => {
    if (selectedUsuario === "all") return "Todos";
    return (
      empleados.find((e) => e.id === selectedUsuario)?.nombre ||
      selectedUsuario
    );
  };

  const getSucursalNombre = (id: string) =>
    sucursales.find((s) => s.id === id)?.name || id;

  const getFilterDescriptionForModal = useCallback(() => {
    const partes: string[] = [];
    switch (dateFilterType) {
      case "today": partes.push("Hoy"); break;
      case "yesterday": partes.push("Ayer"); break;
      case "thisWeek": partes.push("Esta semana"); break;
      case "lastWeek": partes.push("Semana pasada"); break;
      case "thisMonth": partes.push("Este mes"); break;
      case "lastMonth": partes.push("Mes pasado"); break;
      case "specific":
        partes.push(
          specificDate ? format(specificDate, "dd/MM/yyyy") : "Fecha específica"
        );
        break;
      case "range":
        partes.push(
          startDate && endDate
            ? `${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}`
            : "Rango"
        );
        break;
      case "all": partes.push("Todos los períodos"); break;
    }
    if (selectedSucursal !== "all" && esAdmin) {
      partes.push(getSucursalNombre(selectedSucursal));
    }
    if (selectedUsuario !== "all" && !esRecepcionista) {
      partes.push(`Usuario: ${getUsuarioNombre()}`);
    }
    if (selectedMetodoPago !== "all") {
      const m = { efectivo: "Efectivo", qr: "QR", mixto: "Mixto" } as const;
      partes.push(`Pago: ${m[selectedMetodoPago as keyof typeof m]}`);
    }
    if (esRecepcionista) partes.push("Solo mis ventas");
    return partes.join(" • ");
  }, [
    dateFilterType, specificDate, startDate, endDate,
    selectedSucursal, selectedUsuario, selectedMetodoPago,
    esAdmin, esRecepcionista, sucursales, empleados,
  ]);

  const getFilterDescription = () => {
    switch (dateFilterType) {
      case "today": return "Hoy";
      case "yesterday": return "Ayer";
      case "thisWeek": return "Esta semana";
      case "lastWeek": return "Semana pasada";
      case "thisMonth": return "Este mes";
      case "lastMonth": return "Mes pasado";
      case "specific":
        return specificDate
          ? format(specificDate, "dd/MM/yyyy")
          : "Fecha específica";
      case "range":
        return startDate && endDate
          ? `${format(startDate, "dd/MM")} - ${format(endDate, "dd/MM/yyyy")}`
          : "Rango";
      case "all": return "Todos";
      default: return "Seleccionar";
    }
  };

  const formatDetail = (items: SaleItem[] | any) => {
    const arr = parseItems(items);
    if (arr.length === 0)
      return <span className="text-muted-foreground text-xs">—</span>;
    return arr.map((item, index) => (
      <div key={index} className="text-xs py-0.5">
        • {item.nombre} x{item.cantidad}
      </div>
    ));
  };

  const renderAnularButton = (sale: SaleRecord) => {
    if (!esAdmin) return null;
    if (!isSaleWithinLastWeek(sale.fecha)) {
      return (
        <Button
          variant="ghost"
          size="icon"
          disabled
          title="Solo se pueden anular ventas de hasta 7 días atrás"
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

  const renderEmptyRows = (count: number, colSpan: number) => {
    if (count <= 0) return null;
    return Array.from({ length: count }).map((_, i) => (
      <TableRow key={`empty-${i}`} aria-hidden="true">
        {Array.from({ length: colSpan }).map((_, j) => (
          <TableCell key={j} className="h-[52px] border-b border-border/40" />
        ))}
      </TableRow>
    ));
  };

  if (!initialLoadDone && loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pagination = salesData.pagination;
  const totalPages = pagination.totalPages || 1;
  const pageSales = salesData.sales;

  return (
    <div className="space-y-3 p-3 md:space-y-4 md:p-6 overflow-x-hidden">
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
            <Badge variant="secondary" className="mt-2 text-[10px] md:text-xs gap-1">
              <UserCheck className="h-3 w-3" />
              Mostrando solo mis ventas
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 w-full sm:flex sm:justify-end sm:w-auto">
          <Button
            variant="default" size="sm" onClick={abrirResumenModal}
            disabled={loadingResumen}
            className="h-9 bg-primary hover:bg-primary/90 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3"
          >
            {loadingResumen ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <BarChart3 className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
            )}
            <span className="truncate">Resumen</span>
          </Button>
          <Button
            variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}
            className="h-9 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3"
          >
            <Filter className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
            <span className="truncate">Filtros</span>
          </Button>
          <Button
            variant="default" size="sm" onClick={recargarTodo} disabled={loading}
            className="h-9 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3"
          >
            <Search className={cn("h-3.5 w-3.5 mr-1 flex-shrink-0", loading && "animate-spin")} />
            <span className="truncate">Buscar</span>
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] md:text-xs text-muted-foreground">Período</Label>
                <Select
                  value={dateFilterType}
                  onValueChange={(v) => handleDateFilterChange(v as DateFilterType)}
                >
                  <SelectTrigger className="h-9 text-xs md:text-sm w-full"><SelectValue /></SelectTrigger>
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
                  <Label className="text-[10px] md:text-xs text-muted-foreground">Fecha</Label>
                  <Popover open={specificDateOpen} onOpenChange={setSpecificDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start h-9 text-xs md:text-sm">
                        <CalendarIcon className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">
                          {specificDate ? format(specificDate, "dd/MM/yyyy") : "Seleccionar"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <SimpleCalendar selected={specificDate} onSelect={handleSpecificDate} />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {dateFilterType === "range" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-[10px] md:text-xs text-muted-foreground">Desde</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start h-9 text-xs md:text-sm">
                          <CalendarIcon className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">
                            {startDate ? format(startDate, "dd/MM/yyyy") : "Seleccionar"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <SimpleCalendar selected={startDate} onSelect={handleStartDate} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] md:text-xs text-muted-foreground">Hasta</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start h-9 text-xs md:text-sm">
                          <CalendarIcon className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">
                            {endDate ? format(endDate, "dd/MM/yyyy") : "Seleccionar"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <SimpleCalendar selected={endDate} onSelect={handleEndDate} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              {esAdmin && (
                <div className="space-y-1">
                  <Label className="text-[10px] md:text-xs text-muted-foreground">Sucursal</Label>
                  <Select value={selectedSucursal} onValueChange={handleSucursalChange}>
                    <SelectTrigger className="h-9 text-xs md:text-sm w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sucursales.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {esAdmin && (
                <div className="space-y-1">
                  <Label className="text-[10px] md:text-xs text-muted-foreground">Usuario</Label>
                  <Select
                    value={selectedUsuario}
                    onValueChange={handleUsuarioChange}
                    disabled={loadingEmpleados}
                  >
                    <SelectTrigger className="h-9 text-xs md:text-sm w-full">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {empleados.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-[10px] md:text-xs text-muted-foreground">Método</Label>
                <Select value={selectedMetodoPago} onValueChange={handleMetodoPagoChange}>
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

            <div className="mt-3 pt-2 text-[10px] md:text-xs text-muted-foreground border-t flex flex-wrap items-center gap-1">
              <span>Filtros seleccionados:</span>
              <span>{getFilterDescription()}</span>
              {selectedSucursal !== "all" && esAdmin && (
                <span>• {getSucursalNombre(selectedSucursal)}</span>
              )}
              {selectedUsuario !== "all" && !esRecepcionista && (
                <span>• {getUsuarioNombre()}</span>
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
                variant="ghost" size="sm" onClick={limpiarFiltros}
                className="h-6 px-2 text-[10px] md:text-xs"
              >
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm md:text-base flex items-center gap-2 flex-wrap">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span>Detalle de Ventas</span>
            <Badge variant="secondary" className="text-[10px] md:text-xs">
              {pagination.total} registros
            </Badge>
          </CardTitle>
          <CardDescription className="text-[10px] md:text-xs">
            Página {pagination.page} de {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 md:px-6">
          <Tabs value={selectedTipo} onValueChange={handleTipoChange} className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-3 md:mb-4 max-w-md">
              <TabsTrigger value="producto" className="gap-1 text-xs md:text-sm">
                <Package className="h-3 w-3 flex-shrink-0" />
                <span>Productos</span>
              </TabsTrigger>
              <TabsTrigger value="servicio" className="gap-1 text-xs md:text-sm">
                <Dumbbell className="h-3 w-3 flex-shrink-0" />
                <span>Servicios</span>
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <TabsContent value="producto" className="mt-0">
                  <div className="md:hidden space-y-3">
                    {pageSales.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm border rounded-md">
                        No hay ventas de productos en esta página
                      </div>
                    ) : (
                      pageSales.map((sale) => (
                        <div key={`pm-${sale.id}`} className="border rounded-lg p-3 space-y-2 bg-card">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-mono text-[10px] text-muted-foreground">{sale.fecha}</p>
                              <p className="text-sm font-semibold truncate">{sale.sucursal}</p>
                              <p className="text-xs text-muted-foreground truncate">{sale.empleado}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button variant="ghost" size="icon" onClick={() => handleViewDetails(sale)} className="h-7 w-7">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {renderAnularButton(sale)}
                            </div>
                          </div>
                          <div className="border-t pt-2">
                            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Productos</p>
                            {formatDetail(sale.items || [])}
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-xs border-t pt-2">
                            <div><p className="text-[10px] text-muted-foreground">Subtotal</p><p className="font-medium">Bs. {sale.subtotal.toFixed(2)}</p></div>
                            <div><p className="text-[10px] text-muted-foreground">Descuento</p><p className="font-medium text-destructive">{sale.descuento > 0 ? `-Bs. ${sale.descuento.toFixed(2)}` : "-"}</p></div>
                            <div><p className="text-[10px] text-muted-foreground">Total</p><p className="font-bold">Bs. {sale.total.toFixed(2)}</p></div>
                          </div>
                          <div className="flex items-center justify-between gap-2 border-t pt-2">
                            <div><PaymentMethodBadge sale={sale} /></div>
                            <div><PaymentDetails sale={sale} /></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="hidden md:block rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="min-w-[80px] text-xs">Fecha</TableHead>
                          <TableHead className="min-w-[90px] text-xs">Sucursal</TableHead>
                          <TableHead className="min-w-[90px] text-xs">Empleado</TableHead>
                          <TableHead className="min-w-[180px] text-xs">Productos</TableHead>
                          <TableHead className="min-w-[70px] text-xs">Subtotal</TableHead>
                          <TableHead className="min-w-[70px] text-xs">Dto.</TableHead>
                          <TableHead className="min-w-[70px] text-xs">Total</TableHead>
                          <TableHead className="min-w-[80px] text-xs">Pago</TableHead>
                          <TableHead className="min-w-[90px] text-xs">Detalle</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageSales.length === 0 ? (
                          <>
                            <TableRow>
                              <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                No hay ventas de productos en esta página
                              </TableCell>
                            </TableRow>
                            {renderEmptyRows(PAGE_SIZE - 1, 10)}
                          </>
                        ) : (
                          <>
                            {pageSales.map((sale) => (
                              <TableRow key={`p-${sale.id}`}>
                                <TableCell className="font-mono text-[10px] md:text-xs">{sale.fecha}</TableCell>
                                <TableCell className="text-xs md:text-sm">{sale.sucursal}</TableCell>
                                <TableCell className="text-xs md:text-sm">{sale.empleado}</TableCell>
                                <TableCell className="max-w-[180px]">{formatDetail(sale.items || [])}</TableCell>
                                <TableCell className="text-xs md:text-sm">Bs. {sale.subtotal.toFixed(2)}</TableCell>
                                <TableCell className="text-destructive text-xs md:text-sm">{sale.descuento > 0 ? `-Bs. ${sale.descuento.toFixed(2)}` : "-"}</TableCell>
                                <TableCell className="font-bold text-xs md:text-sm">Bs. {sale.total.toFixed(2)}</TableCell>
                                <TableCell><PaymentMethodBadge sale={sale} /></TableCell>
                                <TableCell><PaymentDetails sale={sale} /></TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleViewDetails(sale)} className="h-7 w-7 md:h-8 md:w-8">
                                      <Eye className="h-3 w-3 md:h-4 md:w-4" />
                                    </Button>
                                    {renderAnularButton(sale)}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {renderEmptyRows(PAGE_SIZE - pageSales.length, 10)}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="servicio" className="mt-0">
                  <div className="md:hidden space-y-3">
                    {pageSales.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm border rounded-md">
                        No hay ventas de servicios en esta página
                      </div>
                    ) : (
                      pageSales.map((sale) => (
                        <div key={`sm-${sale.id}`} className="border rounded-lg p-3 space-y-2 bg-card">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-mono text-[10px] text-muted-foreground">{sale.fecha}</p>
                              <p className="text-sm font-semibold truncate">{sale.sucursal}</p>
                              <p className="text-xs text-muted-foreground truncate">{sale.empleado}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button variant="ghost" size="icon" onClick={() => handleViewDetails(sale)} className="h-7 w-7">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {renderAnularButton(sale)}
                            </div>
                          </div>
                          <div className="border-t pt-2">
                            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Cliente</p>
                            <FormatCliente cliente={sale.cliente} />
                          </div>
                          <div className="border-t pt-2">
                            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Servicios</p>
                            {formatDetail(sale.items || [])}
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-xs border-t pt-2">
                            <div><p className="text-[10px] text-muted-foreground">Subtotal</p><p className="font-medium">Bs. {sale.subtotal.toFixed(2)}</p></div>
                            <div><p className="text-[10px] text-muted-foreground">Descuento</p><p className="font-medium text-destructive">{sale.descuento > 0 ? `-Bs. ${sale.descuento.toFixed(2)}` : "-"}</p></div>
                            <div><p className="text-[10px] text-muted-foreground">Total</p><p className="font-bold">Bs. {sale.total.toFixed(2)}</p></div>
                          </div>
                          <div className="flex items-center justify-between gap-2 border-t pt-2">
                            <div><PaymentMethodBadge sale={sale} /></div>
                            <div><PaymentDetails sale={sale} /></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="hidden md:block rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="min-w-[80px] text-xs">Fecha</TableHead>
                          <TableHead className="min-w-[90px] text-xs">Sucursal</TableHead>
                          <TableHead className="min-w-[90px] text-xs">Cliente</TableHead>
                          <TableHead className="min-w-[90px] text-xs">Empleado</TableHead>
                          <TableHead className="min-w-[180px] text-xs">Servicios</TableHead>
                          <TableHead className="min-w-[70px] text-xs">Subtotal</TableHead>
                          <TableHead className="min-w-[70px] text-xs">Dto.</TableHead>
                          <TableHead className="min-w-[70px] text-xs">Total</TableHead>
                          <TableHead className="min-w-[80px] text-xs">Pago</TableHead>
                          <TableHead className="min-w-[90px] text-xs">Detalle</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageSales.length === 0 ? (
                          <>
                            <TableRow>
                              <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                No hay ventas de servicios en esta página
                              </TableCell>
                            </TableRow>
                            {renderEmptyRows(PAGE_SIZE - 1, 11)}
                          </>
                        ) : (
                          <>
                            {pageSales.map((sale) => (
                              <TableRow key={`s-${sale.id}`}>
                                <TableCell className="font-mono text-[10px] md:text-xs">{sale.fecha}</TableCell>
                                <TableCell className="text-xs md:text-sm">{sale.sucursal}</TableCell>
                                <TableCell className="align-top"><FormatCliente cliente={sale.cliente} /></TableCell>
                                <TableCell className="text-xs md:text-sm">{sale.empleado}</TableCell>
                                <TableCell className="max-w-[180px]">{formatDetail(sale.items || [])}</TableCell>
                                <TableCell className="text-xs md:text-sm">Bs. {sale.subtotal.toFixed(2)}</TableCell>
                                <TableCell className="text-destructive text-xs md:text-sm">{sale.descuento > 0 ? `-Bs. ${sale.descuento.toFixed(2)}` : "-"}</TableCell>
                                <TableCell className="font-bold text-xs md:text-sm">Bs. {sale.total.toFixed(2)}</TableCell>
                                <TableCell><PaymentMethodBadge sale={sale} /></TableCell>
                                <TableCell><PaymentDetails sale={sale} /></TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleViewDetails(sale)} className="h-7 w-7 md:h-8 md:w-8">
                                      <Eye className="h-3 w-3 md:h-4 md:w-4" />
                                    </Button>
                                    {renderAnularButton(sale)}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {renderEmptyRows(PAGE_SIZE - pageSales.length, 11)}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </>
            )}

            {totalPages > 1 && (
              <div className="flex flex-wrap justify-center items-center gap-2 mt-4 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1 || loading} className="h-8 w-8 p-0">
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1 || loading} className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs md:text-sm mx-1">Pág. {currentPage} de {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages || loading} className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || loading} className="h-8 w-8 p-0">
                  <ChevronsRight className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 ml-2 pl-2 border-l">
                  <span className="text-xs md:text-sm text-muted-foreground">Ir a:</span>
                  <Input
                    type="number" min={1} max={totalPages}
                    value={goToPageInput}
                    onChange={(e) => setGoToPageInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleGoToPage(); }}
                    placeholder={`1-${totalPages}`}
                    className="h-8 w-16 text-xs md:text-sm"
                  />
                  <Button size="sm" onClick={handleGoToPage} disabled={loading} className="h-8 px-2 text-xs">Ir</Button>
                </div>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>

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
                  <p><span className="text-muted-foreground">Fecha:</span> {selectedSale.fecha}</p>
                  <p><span className="text-muted-foreground">Sucursal:</span> {selectedSale.sucursal}</p>
                  <p><span className="text-muted-foreground">Empleado:</span> {selectedSale.empleado}</p>
                  {selectedSale.cliente && (
                    <div>
                      <span className="text-muted-foreground">Cliente(s):</span>
                      <div className="mt-1"><FormatCliente cliente={selectedSale.cliente} /></div>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p><span className="text-muted-foreground">Subtotal:</span> Bs. {selectedSale.subtotal.toFixed(2)}</p>
                  <p><span className="text-muted-foreground text-destructive">Descuento:</span> -Bs. {selectedSale.descuento.toFixed(2)}</p>
                  <p className="font-bold"><span className="text-muted-foreground">Total:</span> Bs. {selectedSale.total.toFixed(2)}</p>
                  <p><span className="text-muted-foreground">Forma pago:</span> <PaymentMethodBadge sale={selectedSale} /></p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Items:</h4>
                <div className="border rounded-lg p-3 space-y-2">
                  {selectedSale.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs md:text-sm border-b last:border-0 pb-1 gap-2">
                      <span className="break-words">{item.nombre} x{item.cantidad}</span>
                      <span className="font-medium flex-shrink-0">Bs. {item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedSale.descuento > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs md:text-sm text-amber-900 dark:text-amber-100">
                    <span className="font-medium">Motivo descuento:</span>{" "}
                    {selectedSale.justificacionDescuento || "No especificado"}
                  </p>
                </div>
              )}

              {esAdmin && isSaleWithinLastWeek(selectedSale.fecha) && (
                <div className="pt-2 border-t">
                  <Button variant="destructive" className="w-full" onClick={() => handleOpenAnular(selectedSale)}>
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
                <p><span className="text-muted-foreground">Venta #:</span> {saleToAnular.id}</p>
                <p><span className="text-muted-foreground">Tipo:</span> {saleToAnular.tipo === "producto" ? "Productos" : "Servicios"}</p>
                <p><span className="text-muted-foreground">Fecha:</span> {saleToAnular.fecha}</p>
                <p><span className="text-muted-foreground">Total:</span> Bs. {saleToAnular.total.toFixed(2)}</p>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-xs md:text-sm text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
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
                    <li>Se revertirá Bs. {(saleToAnular.efectivo || 0).toFixed(2)} de la caja</li>
                  )}
                  <li>Se revertirá el uso del cupón (si se usó)</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => { setIsAnularModalOpen(false); setSaleToAnular(null); }}
              disabled={isAnulando}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmAnular} disabled={isAnulando}>
              {isAnulando ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Anulando...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" />Confirmar Anulación</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ResumenDetalladoModal
        open={isResumenModalOpen}
        onOpenChange={setIsResumenModalOpen}
        data={resumenDetallado}
        filterDescription={getFilterDescriptionForModal()}
      />
    </div>
  );
}