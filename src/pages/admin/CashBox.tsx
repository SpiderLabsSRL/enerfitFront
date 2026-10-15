import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths
} from "date-fns";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building2, 
  Loader2, 
  Coffee, 
  Wallet, 
  User,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Filter,
  CalendarIcon,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { toast } from "sonner";
import { 
  getTransactionsByCashBox, 
  Transaction, 
  getCashBoxesByBranch, 
  CashBox as CashBoxType,
  getCashBoxStatus,
  TransactionsResponse,
  getTotalTransactions,
  FilterTotals
} from "@/api/CashApi";
import { cn } from "@/lib/utils";

// Componente de calendario simple
function SimpleCalendar({ selected, onSelect }: { selected?: Date; onSelect: (date: Date) => void }) {
  const [currentDate, setCurrentDate] = useState(selected || new Date());
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const weekDays = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
  
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  
  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  
  const isSelectedDate = (day: number) => {
    if (!selected) return false;
    return selected.getDate() === day && selected.getMonth() === currentDate.getMonth() && selected.getFullYear() === currentDate.getFullYear();
  };
  
  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={handlePrevMonth}>{"<"}</Button>
        <span className="font-medium">{months[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
        <Button variant="outline" size="sm" onClick={handleNextMonth}>{">"}</Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {weekDays.map(day => <div key={day} className="text-xs font-medium text-muted-foreground">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div key={index} className="text-center">
            {day !== null ? (
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0 font-normal", isSelectedDate(day) && "bg-primary text-primary-foreground hover:bg-primary/90")}
                onClick={() => onSelect(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
              >
                {day}
              </Button>
            ) : <div className="h-8 w-8" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente de tarjeta de resumen
function SummaryCard({ title, amount, icon: Icon, iconColor = "text-primary", description }: { 
  title: string; amount: number; icon: any; iconColor?: string; description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(amount)}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

type DateFilterType = "today" | "yesterday" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "specific" | "range" | "all";
type TransactionType = "all" | "ingreso" | "egreso" | "apertura" | "cierre";
type SortOrder = "asc" | "desc";

export function CashBox() {
  const [searchParams] = useSearchParams();
  const { cashBoxId } = useParams<{ cashBoxId: string }>();
  const sucursalId = searchParams.get("sucursal") || "";
  const sucursalNombre = searchParams.get("sucursalNombre") || "principal";
  const cajaNombre = searchParams.get("caja") || "";
  
  const [transactionsData, setTransactionsData] = useState<TransactionsResponse>({
    transactions: [],
    pagination: {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    },
  });
  const [cashBoxInfo, setCashBoxInfo] = useState<CashBoxType | null>(null);
  const [cashBoxStatus, setCashBoxStatus] = useState<{montoFinal: number} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estado de filtros
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('today');
  const [specificDate, setSpecificDate] = useState<Date>();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedType, setSelectedType] = useState<TransactionType>("all");
  const [selectedEmpleado, setSelectedEmpleado] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showFilters, setShowFilters] = useState(true);
  const [specificDateOpen, setSpecificDateOpen] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [goToPageInput, setGoToPageInput] = useState<string>("");
  
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  
  const [filterTotals, setFilterTotals] = useState<FilterTotals>({
    totalIngresos: 0,
    totalEgresos: 0,
    totalCaja: 0,
  });

  // Obtener empleados únicos de las transacciones actuales
  const empleadosUnicos = useMemo(() => {
    const empleadosMap = new Map<string, string>();
    transactionsData.transactions.forEach(t => {
      if (t.empleadoNombre && !empleadosMap.has(t.empleadoNombre)) {
        empleadosMap.set(t.empleadoNombre, t.empleadoNombre);
      }
    });
    return Array.from(empleadosMap, ([id, nombre]) => ({ id, nombre }));
  }, [transactionsData.transactions]);

  // Filtrar y ordenar transacciones localmente (solo por tipo y empleado, no por fecha porque ya viene de la API)
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactionsData.transactions];
    
    // Filtrar por tipo
    if (selectedType !== "all") {
      filtered = filtered.filter(t => t.type === selectedType);
    }
    
    // Filtrar por empleado
    if (selectedEmpleado !== "all") {
      filtered = filtered.filter(t => t.empleadoNombre === selectedEmpleado);
    }
    
    // Ordenar por fecha (ascendente o descendente)
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
    
    return filtered;
  }, [transactionsData.transactions, selectedType, selectedEmpleado, sortOrder]);

  // Función para obtener parámetros de fecha
  const getDateParams = useCallback((filterType: DateFilterType) => {
    const today = new Date();
    
    switch (filterType) {
      case 'today':
        return {
          dateFilterType: 'specific',
          specificDate: format(today, 'yyyy-MM-dd')
        };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          dateFilterType: 'specific',
          specificDate: format(yesterday, 'yyyy-MM-dd')
        };
      case 'thisWeek':
        return {
          dateFilterType: 'range',
          startDate: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd')
        };
      case 'lastWeek':
        const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        return {
          dateFilterType: 'range',
          startDate: format(lastWeekStart, 'yyyy-MM-dd'),
          endDate: format(lastWeekEnd, 'yyyy-MM-dd')
        };
      case 'thisMonth':
        return {
          dateFilterType: 'range',
          startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd')
        };
      case 'lastMonth':
        const lastMonthStart = startOfMonth(subMonths(today, 1));
        const lastMonthEnd = endOfMonth(subMonths(today, 1));
        return {
          dateFilterType: 'range',
          startDate: format(lastMonthStart, 'yyyy-MM-dd'),
          endDate: format(lastMonthEnd, 'yyyy-MM-dd')
        };
      case 'specific':
        if (specificDate) {
          return {
            dateFilterType: 'specific',
            specificDate: format(specificDate, 'yyyy-MM-dd')
          };
        }
        break;
      case 'range':
        if (startDate && endDate) {
          return {
            dateFilterType: 'range',
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd')
          };
        }
        break;
      case 'all':
      default:
        return {
          dateFilterType: 'all'
        };
    }
    
    return {
      dateFilterType: 'all'
    };
  }, [specificDate, startDate, endDate]);

  // Cargar totales
  const cargarTotalesFiltro = useCallback(async () => {
    try {
      if (!cashBoxId || !sucursalId) return;

      const dateParams = getDateParams(dateFilterType);
      const params: any = {
        cashBoxId: parseInt(cashBoxId),
        ...dateParams
      };

      const totals = await getTotalTransactions(params);
      setFilterTotals(totals);
    } catch (err: any) {
      console.error("Error cargando totales:", err);
      setFilterTotals({ totalIngresos: 0, totalEgresos: 0, totalCaja: 0 });
    }
  }, [cashBoxId, sucursalId, dateFilterType, getDateParams]);

  // Cargar transacciones
  const cargarTransacciones = async (page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      setCurrentPage(page);
      setGoToPageInput("");

      const dateParams = getDateParams(dateFilterType);
      
      if ((dateParams.dateFilterType === 'specific' && !dateParams.specificDate) ||
          (dateParams.dateFilterType === 'range' && (!dateParams.startDate || !dateParams.endDate))) {
        dateParams.dateFilterType = 'all';
      }

      const params: any = {
        page,
        pageSize,
        ...dateParams
      };

      const response = await getTransactionsByCashBox(parseInt(cashBoxId || "0"), params, page, pageSize);
      setTransactionsData(response);
    } catch (err: any) {
      console.error("Error loading transactions:", err);
      setError(err.message || "No se pudieron cargar las transacciones.");
      toast.error("Error al cargar las transacciones");
    } finally {
      setIsLoading(false);
    }
  };

  const cargarInformacionCaja = async () => {
    try {
      if (sucursalId && cashBoxId) {
        const cashBoxes = await getCashBoxesByBranch(parseInt(sucursalId));
        const currentCashBox = cashBoxes.find(c => c.idCaja.toString() === cashBoxId);
        setCashBoxInfo(currentCashBox || null);
        
        const status = await getCashBoxStatus(parseInt(cashBoxId));
        setCashBoxStatus(status);
      }
    } catch (error) {
      console.error("Error loading cash box info:", error);
      toast.error("No se pudo cargar la información de la caja");
    }
  };

  const cargarTodo = async () => {
    await cargarInformacionCaja();
    await cargarTotalesFiltro();
    await cargarTransacciones(1);
  };

  // Cargar datos iniciales
  useEffect(() => {
    if (sucursalId && cashBoxId) {
      cargarTodo();
    }
  }, [sucursalId, cashBoxId]);

  // Cuando cambian los filtros de fecha, recargar datos desde el servidor
  useEffect(() => {
    if (sucursalId && cashBoxId) {
      setCurrentPage(1);
      cargarTotalesFiltro();
      cargarTransacciones(1);
    }
  }, [dateFilterType, specificDate, startDate, endDate]);

  const limpiarFiltros = () => {
    setDateFilterType("today");
    setSpecificDate(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedType("all");
    setSelectedEmpleado("all");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const handleGoToPage = () => {
    const pageNumber = parseInt(goToPageInput);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= (transactionsData.pagination.totalPages || 1)) {
      cargarTransacciones(pageNumber);
    }
    setGoToPageInput("");
  };

  const isLactobar = cashBoxInfo?.nombre.toLowerCase().includes('lactobar') || 
                     cajaNombre.toLowerCase().includes('lactobar');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB'
    }).format(amount);
  };

  const translateTransactionType = (type: string) => {
    const types: { [key: string]: string } = {
      'ingreso': 'Ingreso',
      'egreso': 'Egreso',
      'apertura': 'Apertura',
      'cierre': 'Cierre'
    };
    return types[type] || type;
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'ingreso': return 'bg-green-100 text-green-800 border-green-200';
      case 'egreso': return 'bg-red-100 text-red-800 border-red-200';
      case 'apertura': return 'bg-green-100 text-green-800 border-green-200';
      case 'cierre': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFilterDescription = () => {
    switch (dateFilterType) {
      case 'today': return "Hoy";
      case 'yesterday': return "Ayer";
      case 'thisWeek': return "Esta semana";
      case 'lastWeek': return "Semana pasada";
      case 'thisMonth': return "Este mes";
      case 'lastMonth': return "Mes pasado";
      case 'specific': return specificDate ? format(specificDate, 'dd/MM/yyyy') : "Fecha específica";
      case 'range': return startDate && endDate ? `${format(startDate, 'dd/MM')} - ${format(endDate, 'dd/MM/yyyy')}` : "Rango";
      case 'all': return "Todos";
      default: return "Seleccionar";
    }
  };

  const PaginationControls = () => {
    const { page, total, totalPages } = transactionsData.pagination;
    
    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4 mt-4">
        <div className="text-sm text-muted-foreground order-2 sm:order-1">
          Mostrando {filteredTransactions.length} de {total} transacciones
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-2 order-1 sm:order-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => cargarTransacciones(1)}
            disabled={page === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => cargarTransacciones(page - 1)}
            disabled={page === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm">Pág.</span>
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={goToPageInput}
              onChange={(e) => setGoToPageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGoToPage()}
              className="w-16 h-8 text-center text-sm"
              placeholder={page.toString()}
            />
            <span className="text-sm">de {totalPages}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoToPage}
              disabled={!goToPageInput}
              className="h-8 text-xs"
            >
              Ir
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => cargarTransacciones(page + 1)}
            disabled={page === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => cargarTransacciones(totalPages)}
            disabled={page === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading && !transactionsData.transactions.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground capitalize">{sucursalNombre}</span>
          </div>
          <div className="flex items-center gap-2">
            {isLactobar ? (
              <Coffee className="h-6 w-6 text-primary" />
            ) : (
              <Wallet className="h-6 w-6 text-primary" />
            )}
            <h1 className="text-xl md:text-2xl font-bold text-primary">Caja {cashBoxInfo?.nombre || cajaNombre}</h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            {isLactobar 
              ? "Gestión de ventas de productos y suplementos" 
              : "Gestión de dinero físico en efectivo"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="h-8 md:h-9">
            <Filter className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="text-xs md:text-sm">Filtros</span>
          </Button>
          <Button variant="outline" size="sm" onClick={cargarTodo} className="h-8 md:h-9">
            <RefreshCw className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="text-xs md:text-sm">Recargar</span>
          </Button>
        </div>
      </div>

      {/* Panel de Filtros */}
      {showFilters && (
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
              {/* Filtro de Período */}
              <div className="space-y-1">
                <Label className="text-[10px] md:text-xs text-muted-foreground">Período</Label>
                <Select value={dateFilterType} onValueChange={(v) => setDateFilterType(v as DateFilterType)}>
                  <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm">
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

              {/* Filtro de Fecha Específica */}
              {dateFilterType === "specific" && (
                <div className="space-y-1">
                  <Label className="text-[10px] md:text-xs text-muted-foreground">Fecha</Label>
                  <Popover open={specificDateOpen} onOpenChange={setSpecificDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start h-8 md:h-9 text-xs md:text-sm">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {specificDate ? format(specificDate, "dd/MM/yyyy") : "Seleccionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <SimpleCalendar selected={specificDate} onSelect={(d) => { setSpecificDate(d); setSpecificDateOpen(false); }} />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Filtro de Rango */}
              {dateFilterType === "range" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-[10px] md:text-xs text-muted-foreground">Desde</Label>
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start h-8 md:h-9 text-xs md:text-sm">
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {startDate ? format(startDate, "dd/MM/yyyy") : "Seleccionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <SimpleCalendar selected={startDate} onSelect={(d) => { setStartDate(d); setStartDateOpen(false); }} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] md:text-xs text-muted-foreground">Hasta</Label>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start h-8 md:h-9 text-xs md:text-sm">
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {endDate ? format(endDate, "dd/MM/yyyy") : "Seleccionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <SimpleCalendar selected={endDate} onSelect={(d) => { setEndDate(d); setEndDateOpen(false); }} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              {/* Filtro por Tipo */}
              <div className="space-y-1">
                <Label className="text-[10px] md:text-xs text-muted-foreground">Tipo</Label>
                <Select value={selectedType} onValueChange={(v) => setSelectedType(v as TransactionType)}>
                  <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ingreso">Ingresos</SelectItem>
                    <SelectItem value="egreso">Egresos</SelectItem>
                    <SelectItem value="apertura">Aperturas</SelectItem>
                    <SelectItem value="cierre">Cierres</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Empleado */}
              {empleadosUnicos.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-[10px] md:text-xs text-muted-foreground">Empleado</Label>
                  <Select value={selectedEmpleado} onValueChange={setSelectedEmpleado}>
                    <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {empleadosUnicos.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Indicador de filtros activos */}
            {(dateFilterType !== "all" || selectedType !== "all" || selectedEmpleado !== "all") && (
              <div className="mt-3 pt-2 text-[10px] md:text-xs text-muted-foreground border-t flex flex-wrap items-center gap-1">
                <span>Filtros activos:</span>
                <span>{getFilterDescription()}</span>
                {selectedType !== "all" && <span>• Tipo: {selectedType === "ingreso" ? "Ingresos" : selectedType === "egreso" ? "Egresos" : selectedType === "apertura" ? "Aperturas" : "Cierres"}</span>}
                {selectedEmpleado !== "all" && <span>• Empleado: {selectedEmpleado}</span>}
                <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="h-5 px-2 text-[10px] md:text-xs">Limpiar</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <SummaryCard 
          title="Total en Caja" 
          amount={cashBoxStatus?.montoFinal || 0} 
          icon={DollarSign}
          description="Efectivo disponible"
        />
        <SummaryCard 
          title={isLactobar ? "Ingresos por ventas" : "Ingresos"} 
          amount={filterTotals.totalIngresos} 
          icon={TrendingUp}
          iconColor="text-green-600"
          description={`Total ${getFilterDescription().toLowerCase()}`}
        />
        <SummaryCard 
          title={isLactobar ? "Egresos por gastos" : "Egresos"} 
          amount={filterTotals.totalEgresos} 
          icon={TrendingDown}
          iconColor="text-red-600"
          description={`Total ${getFilterDescription().toLowerCase()}`}
        />
      </div>

      {/* Tabla de Transacciones */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                Detalle de Transacciones
                <Badge variant="secondary" className="text-[10px] md:text-xs">
                  {filteredTransactions.length} registros
                </Badge>
              </CardTitle>
              <CardDescription className="text-[10px] md:text-xs">
                Página {transactionsData.pagination.page} de {transactionsData.pagination.totalPages || 1}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">{error}</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay transacciones para los filtros seleccionados
            </div>
          ) : (
            <>
              <div className="overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="min-w-[100px] text-xs">
                        <div className="flex items-center gap-1">
                          Fecha
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleSortOrder}
                            className="h-6 w-6 p-0 -mr-2"
                          >
                            {sortOrder === "desc" ? (
                              <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowUp className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableHead>
                      <TableHead className="min-w-[90px] text-xs">Tipo</TableHead>
                      <TableHead className="min-w-[180px] text-xs">Descripción</TableHead>
                      <TableHead className="min-w-[120px] text-xs">Empleado</TableHead>
                      <TableHead className="min-w-[100px] text-right text-xs">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.idTransaccion}>
                        <TableCell className="font-mono text-xs">
                          {transaction.date}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", getTransactionTypeColor(transaction.type))}>
                            {translateTransactionType(transaction.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] break-words">
                          {transaction.description}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {transaction.empleadoNombre || `ID: ${transaction.usuarioId}`}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "text-xs font-medium",
                            transaction.type === 'ingreso' || transaction.type === 'apertura' 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          )}>
                            {transaction.type === 'ingreso' || transaction.type === 'apertura' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls />
            </>
          )}
        </CardContent>
      </Card>

      {/* Estilos para scrollbar */}
      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--muted-foreground)) hsl(var(--card));
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: hsl(var(--card));
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }

        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}