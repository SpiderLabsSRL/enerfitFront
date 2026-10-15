import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarIcon,
  Save,
  Music,
  Users,
  Calendar as CalendarIcon2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Filter,
  Loader2,
  TrendingUp,
  Award,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isAfter,
  isBefore,
  isEqual,
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getInstructors,
  getReports,
  getReportByDate,
  saveReport,
  deleteReport,
  getStats,
  type ZumbaInstructor,
  type ZumbaReport,
  type ZumbaStats,
} from "@/api/ZumbaApi";

type FilterType = "day" | "week" | "month" | "year" | "range" | "specific";

// ============================================
// TIPO INTERNO DE RANGO DE FECHAS
// ============================================
interface DateRange {
  dateFrom: string;
  dateTo: string;
}

export function Zumba() {
  const { user } = useUser();
  const { toast } = useToast();

  // ============================================
  // ESTADOS
  // ============================================
  const [instructors, setInstructors] = useState<ZumbaInstructor[]>([]);
  const [reports, setReports] = useState<ZumbaReport[]>([]);
  const [stats, setStats] = useState<ZumbaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedInstructor, setSelectedInstructor] = useState<string>("");
  const [numeroPersonas, setNumeroPersonas] = useState<string>("");
  const [existingReport, setExistingReport] = useState<ZumbaReport | null>(
    null
  );

  // Filtros
  const [filterType, setFilterType] = useState<FilterType>("month");
  const [filterDate, setFilterDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [specificDate, setSpecificDate] = useState<Date>(new Date());
  const [showFilters, setShowFilters] = useState(true);
  const [isRangeSelecting, setIsRangeSelecting] = useState<"start" | "end">(
    "start"
  );
  const [selectedCount, setSelectedCount] = useState(0);

  // ============================================
  // HELPERS DE RANGO DE FECHAS
  // ============================================
  const getDateRange = (): DateRange | null => {
    const fmt = (d: Date) => format(d, "yyyy-MM-dd");

    switch (filterType) {
      case "day":
        return { dateFrom: fmt(filterDate), dateTo: fmt(filterDate) };
      case "week":
        return {
          dateFrom: fmt(startOfWeek(filterDate, { weekStartsOn: 1 })),
          dateTo: fmt(endOfWeek(filterDate, { weekStartsOn: 1 })),
        };
      case "month":
        return {
          dateFrom: fmt(startOfMonth(filterDate)),
          dateTo: fmt(endOfMonth(filterDate)),
        };
      case "year":
        return {
          dateFrom: fmt(startOfYear(filterDate)),
          dateTo: fmt(endOfYear(filterDate)),
        };
      case "range":
        return { dateFrom: fmt(startDate), dateTo: fmt(endDate) };
      case "specific":
        return { dateFrom: fmt(specificDate), dateTo: fmt(specificDate) };
      default:
        return null;
    }
  };

  // ============================================
  // CARGA INICIAL
  // ============================================
  useEffect(() => {
    loadInstructors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

const loadInstructors = async () => {
  try {
    setLoading(true);

    // 👇 Obtener sucursal del usuario logueado
    const userAny = user as unknown as { idsucursal?: number | string };
    const branchId = userAny?.idsucursal
      ? parseInt(userAny.idsucursal.toString())
      : undefined;

    console.log("🔄 Cargando instructores para sucursal:", branchId);

    const data = await getInstructors(branchId);
    setInstructors(data);
  } catch (error: unknown) {
    toast({
      title: "Error",
      description:
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los instructores",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

  // ============================================
  // CARGA DE REPORTES CON FILTRO
  // ============================================
  useEffect(() => {
    loadReportsAndStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user,filterType, filterDate, startDate, endDate, specificDate]);

  const loadReportsAndStats = async () => {
    try {
      const range = getDateRange();
      const [reportsData, statsData] = await Promise.all([
        getReports(range || undefined),
        getStats(range || undefined),
      ]);

      setReports(reportsData);
      setStats(statsData);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los reportes",
        variant: "destructive",
      });
    }
  };

  // ============================================
  // CARGA DE REPORTE POR FECHA
  // ============================================
  useEffect(() => {
    if (selectedDate) {
      loadReportForDate(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const loadReportForDate = async (date: Date) => {
    try {
      const fechaStr = format(date, "yyyy-MM-dd");
      const report = await getReportByDate(fechaStr);

      if (report) {
        setExistingReport(report);
        setSelectedInstructor(report.instructorId);
        setNumeroPersonas(report.numeroPersonas.toString());
      } else {
        setExistingReport(null);
        setSelectedInstructor("");
        setNumeroPersonas("");
      }
    } catch (error) {
      console.error("Error al cargar reporte:", error);
      setExistingReport(null);
      setSelectedInstructor("");
      setNumeroPersonas("");
    }
  };

  // ============================================
  // SUBMIT
  // ============================================
  const handleSubmit = async () => {
    if (!selectedInstructor) {
      toast({
        title: "Error",
        description: "Por favor selecciona un instructor",
        variant: "destructive",
      });
      return;
    }

    if (!numeroPersonas || parseInt(numeroPersonas) < 0) {
      toast({
        title: "Error",
        description: "Por favor ingresa un número válido de personas",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const fechaStr = format(selectedDate, "yyyy-MM-dd");

      // ✅ Cast del user para acceder a idempleado
      const userAny = user as unknown as { idempleado?: number | string };
      const registradoPorId = userAny?.idempleado
        ? parseInt(userAny.idempleado.toString())
        : null;

      await saveReport({
        fecha: fechaStr,
        instructorId: parseInt(selectedInstructor),
        numeroPersonas: parseInt(numeroPersonas),
        registradoPorId,
      });

      toast({
        title: existingReport ? "Reporte actualizado" : "Reporte guardado",
        description: `Reporte del ${format(selectedDate, "PPP", {
          locale: es,
        })} guardado correctamente`,
      });

      await Promise.all([
        loadReportForDate(selectedDate),
        loadReportsAndStats(),
      ]);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo guardar el reporte",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // DELETE
  // ============================================
  const handleDelete = async () => {
    if (!existingReport) return;

    setIsSubmitting(true);

    try {
      await deleteReport(existingReport.id);

      toast({
        title: "Reporte eliminado",
        description: "El reporte se eliminó correctamente",
      });

      setExistingReport(null);
      setSelectedInstructor("");
      setNumeroPersonas("");

      await loadReportsAndStats();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el reporte",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // HELPERS DE FECHA
  // ============================================
  const isToday =
    format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  const isDateInPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d < today;
  };

  const canEdit = isToday;

  const getDayName = (date: Date) => format(date, "EEEE", { locale: es });

  const getFilterText = () => {
    switch (filterType) {
      case "day":
        return `Día: ${format(filterDate, "PPP", { locale: es })}`;
      case "week": {
        const ws = startOfWeek(filterDate, { weekStartsOn: 1 });
        const we = endOfWeek(filterDate, { weekStartsOn: 1 });
        return `Semana: ${format(ws, "dd/MM")} - ${format(we, "dd/MM/yyyy")}`;
      }
      case "month":
        return `Mes: ${format(filterDate, "MMMM yyyy", { locale: es })}`;
      case "year":
        return `Año: ${format(filterDate, "yyyy")}`;
      case "range":
        return `Rango: ${format(startDate, "dd/MM/yyyy")} - ${format(
          endDate,
          "dd/MM/yyyy"
        )}`;
      case "specific":
        return `Fecha específica: ${format(specificDate, "PPP", {
          locale: es,
        })}`;
      default:
        return "";
    }
  };

  // ============================================
  // RANGO EN CALENDARIO
  // ============================================
  const isRangeStart = (date: Date) => {
    if (selectedCount !== 2) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    return isEqual(d, s);
  };

  const isRangeEnd = (date: Date) => {
    if (selectedCount !== 2) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const e = new Date(endDate);
    e.setHours(0, 0, 0, 0);
    return isEqual(d, e);
  };

  const isDateInRange = (date: Date) => {
    if (selectedCount !== 2) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(endDate);
    e.setHours(0, 0, 0, 0);
    return isAfter(d, s) && isBefore(d, e);
  };

  const handleRangeSelect = (date: Date | undefined) => {
    if (!date) return;

    if (selectedCount === 0 || isRangeSelecting === "start") {
      setStartDate(date);
      setEndDate(date);
      setIsRangeSelecting("end");
      setSelectedCount(1);
    } else if (selectedCount === 1) {
      if (date < startDate) {
        setStartDate(date);
        setEndDate(startDate);
      } else {
        setEndDate(date);
      }
      setIsRangeSelecting("start");
      setSelectedCount(2);
    } else {
      setStartDate(date);
      setEndDate(date);
      setIsRangeSelecting("end");
      setSelectedCount(1);
    }
  };

  const getRangeStatusText = () => {
    if (selectedCount === 0) return "Haz clic en una fecha para iniciar";
    if (selectedCount === 1) return "Selecciona la fecha final";
    return "Rango completado - clic para reiniciar";
  };

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Music className="h-12 w-12 mx-auto mb-4 animate-bounce text-primary" />
          <p className="text-muted-foreground">Cargando instructores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-primary">
            <Music className="h-8 w-8" />
            Control de Zumba
          </h1>
          <p className="text-muted-foreground mt-1">
            Registro diario de asistencia a clases de Zumba
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
        </Button>
      </div>

      {/* ============================================ */}
      {/* FILTROS */}
      {/* ============================================ */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-5 w-5" />
              Filtros de Fecha
            </CardTitle>
            <CardDescription>
              Selecciona el tipo de filtro para visualizar los reportes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de filtro</Label>
                <Select
                  value={filterType}
                  onValueChange={(value: FilterType) => setFilterType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Día</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mes</SelectItem>
                    <SelectItem value="year">Año</SelectItem>
                    <SelectItem value="specific">Fecha específica</SelectItem>
                    <SelectItem value="range">Rango de fechas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Seleccionar fecha</Label>

                {(filterType === "day" ||
                  filterType === "week" ||
                  filterType === "month" ||
                  filterType === "year") && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterType === "year"
                          ? format(filterDate, "yyyy")
                          : filterType === "month"
                          ? format(filterDate, "MMMM yyyy", { locale: es })
                          : format(filterDate, "PPP", { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filterDate}
                        onSelect={(date) => date && setFilterDate(date)}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {filterType === "specific" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(specificDate, "PPP", { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={specificDate}
                        onSelect={(date) => date && setSpecificDate(date)}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {filterType === "range" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span className="truncate">
                          {selectedCount === 0 || selectedCount === 2
                            ? "Seleccionar rango"
                            : isRangeSelecting === "start"
                            ? "Seleccionar inicio"
                            : "Seleccionar fin"}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground whitespace-nowrap">
                          ({format(startDate, "dd/MM/yy")} -{" "}
                          {format(endDate, "dd/MM/yy")})
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[340px] p-0">
                      <div className="p-3 border-b">
                        <div className="text-sm font-medium text-center">
                          {getRangeStatusText()}
                        </div>
                        <div className="flex justify-center gap-4 mt-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">
                              Inicio:
                            </span>
                            <span className="ml-1 font-medium">
                              {format(startDate, "dd/MM/yyyy")}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Fin:</span>
                            <span className="ml-1 font-medium">
                              {format(endDate, "dd/MM/yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <Calendar
                          mode="single"
                          selected={
                            selectedCount === 0 || selectedCount === 2
                              ? undefined
                              : isRangeSelecting === "start"
                              ? startDate
                              : endDate
                          }
                          onSelect={handleRangeSelect}
                          locale={es}
                          modifiers={{
                            range: (date: Date) => isDateInRange(date),
                            rangeStart: (date: Date) => isRangeStart(date),
                            rangeEnd: (date: Date) => isRangeEnd(date),
                          }}
                          modifiersClassNames={{
                            range: "bg-primary/20 rounded-none",
                            rangeStart:
                              "bg-yellow-400 text-black font-bold rounded-l-md hover:bg-yellow-500",
                            rangeEnd:
                              "bg-yellow-400 text-black font-bold rounded-r-md hover:bg-yellow-500",
                          }}
                          className="rounded-md"
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 p-2 bg-muted rounded-lg">
              <Badge variant="default">Filtro actual:</Badge>
              <span className="text-sm font-medium">{getFilterText()}</span>
              <span className="text-sm text-muted-foreground ml-2">
                ({reports.length} reportes)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================ */}
      {/* ESTADÍSTICAS */}
      {/* ============================================ */}
      {stats && stats.totalClasses > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Total Clases
              </CardTitle>
              <Music className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {stats.totalClasses}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Participantes
              </CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.totalParticipants}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Promedio / Clase
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.averageParticipants}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Top Instructor
              </CardTitle>
              <Award className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-sm md:text-base font-bold text-purple-600 truncate">
                {stats.topInstructor || "—"}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.topInstructorCount} clases
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================ */}
      {/* FORMULARIO + RESUMEN */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FORMULARIO */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon2 className="h-5 w-5 text-primary" />
              Registro Diario
            </CardTitle>
            <CardDescription>
              Selecciona la fecha, instructor y número de participantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Fecha */}
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate
                      ? format(selectedDate, "PPP", { locale: es })
                      : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Alertas */}
            {isDateInPast(selectedDate) && !existingReport && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Esta fecha es anterior. Solo puedes registrar/editar el día
                  actual.
                </AlertDescription>
              </Alert>
            )}

            {existingReport && !canEdit && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Este reporte es de una fecha anterior y no puede modificarse.
                </AlertDescription>
              </Alert>
            )}

            {/* Instructor */}
            <div className="space-y-2">
              <Label>Instructor de Zumba</Label>
              <Select
                value={selectedInstructor}
                onValueChange={setSelectedInstructor}
                disabled={!canEdit || isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar instructor" />
                </SelectTrigger>
                <SelectContent>
                  {instructors.length === 0 ? (
                    <SelectItem value="no-data" disabled>
                      No hay instructores disponibles
                    </SelectItem>
                  ) : (
                    instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id}>
                        {instructor.nombre}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Personas */}
            <div className="space-y-2">
              <Label>Número de Personas</Label>
              <Input
                type="number"
                min="0"
                placeholder="Cantidad de participantes"
                value={numeroPersonas}
                onChange={(e) => setNumeroPersonas(e.target.value)}
                disabled={!canEdit || isSubmitting}
                className="text-lg"
              />
            </div>

            {/* Botones */}
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting || !selectedInstructor || !numeroPersonas
                  }
                  className="flex-1 bg-primary text-black hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {existingReport
                        ? "Actualizar Reporte"
                        : "Guardar Reporte"}
                    </>
                  )}
                </Button>
              )}

              {existingReport && canEdit && (
                <Button
                  onClick={handleDelete}
                  variant="destructive"
                  disabled={isSubmitting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {existingReport && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">
                    Última actualización:{" "}
                    {format(
                      new Date(existingReport.registradoEn),
                      "PPP 'a las' HH:mm",
                      { locale: es }
                    )}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Registrado por: {existingReport.registradoPor}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RESUMEN DEL DÍA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Resumen del Día
            </CardTitle>
            <CardDescription>
              Información de la clase del{" "}
              {format(selectedDate, "PPP", { locale: es })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingReport ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg text-center">
                    <div className="text-2xl font-bold text-primary">
                      {existingReport.numeroPersonas}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Participantes
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <div className="font-semibold text-sm truncate">
                      {existingReport.instructorNombre}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Instructor
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Día de la semana:
                    </span>
                    <span className="font-medium capitalize">
                      {getDayName(selectedDate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estado:</span>
                    <Badge variant={canEdit ? "default" : "secondary"}>
                      {canEdit ? "Editable" : "Completado"}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Music className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                <p className="text-muted-foreground">
                  No hay registro para esta fecha
                </p>
                {canEdit && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Completa el formulario para registrar la clase
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============================================ */}
      {/* HISTORIAL */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon2 className="h-5 w-5 text-primary" />
            Historial de Clases
            {reports.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {reports.length} reportes
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {reports.length > 0
              ? `Mostrando reportes para el período seleccionado`
              : "No hay reportes para el período seleccionado"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="h-12 w-12 mx-auto opacity-50 mb-3" />
              <p>No hay reportes para el período seleccionado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Día</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead className="text-right">
                      Participantes
                    </TableHead>
                    <TableHead>Registrado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow
                      key={report.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedDate(new Date(report.fecha))}
                    >
                      <TableCell className="font-medium">
                        {format(new Date(report.fecha), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="capitalize">
                        {format(new Date(report.fecha), "EEEE", {
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell>{report.instructorNombre}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {report.numeroPersonas}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(
                          new Date(report.registradoEn),
                          "dd/MM/yyyy HH:mm"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Zumba;