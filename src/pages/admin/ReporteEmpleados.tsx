import { useState, useEffect, useCallback } from "react";
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
  Users,
  Clock,
  Building2,
  Loader2,
  DollarSign,
  Calendar,
  Eye,
  Music,
} from "lucide-react";
import {
  getEmpleadosReporte,
  getAtrasosEmpleados,
  getPagosInformativos,
  actualizarSueldoEmpleado,
  getReportesZumba,
  Sucursal,
  getSucursales,
  type EmpleadoReporte,
  type AtrasoEmpleado,
  type PagoMensualInfo,
  type ReporteZumba,
} from "@/api/ReportsApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const getBoliviaDate = (): Date => {
  const now = new Date();
  const boliviaOffset = -4 * 60;
  const localOffset = now.getTimezoneOffset();
  return new Date(now.getTime() + (localOffset - boliviaOffset) * 60 * 1000);
};

const formatearMes = (mes: string): string => {
  const [year, month] = mes.split("-");
  const fecha = new Date(parseInt(year), parseInt(month) - 1);
  return fecha.toLocaleString("es-ES", { month: "long", year: "numeric" });
};

const generarMesesDisponibles = (cantidad: number = 12): string[] => {
  const meses: string[] = [];
  const ahora = getBoliviaDate();
  for (let i = 0; i < cantidad; i++) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    meses.push(
      `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return meses;
};

function FiltrosCompactos({
  selectedSucursal,
  onSucursalChange,
  sucursales,
  user,
}: any) {
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
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a1a] border border-primary/30 rounded-lg p-3 shadow-lg">
        <p className="font-medium text-primary mb-1">{label}</p>
        <p className="text-sm text-[#e2e2e2]">
          {payload[0].value}{" "}
          {payload[0].name === "minutosAcumulados" ? "minutos" : "días"}
        </p>
      </div>
    );
  }
  return null;
};

export function ReporteEmpleados() {
  const [selectedSucursal, setSelectedSucursal] = useState<string>("all");
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingSucursales, setLoadingSucursales] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [empleados, setEmpleados] = useState<EmpleadoReporte[]>([]);
  const [atrasosCompletos, setAtrasosCompletos] = useState<AtrasoEmpleado[]>([]);
  const [pagosInfo, setPagosInfo] = useState<PagoMensualInfo[]>([]);

  const [mesActual] = useState<string>(() => {
    const now = getBoliviaDate();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [mesZumba, setMesZumba] = useState<string>(() => {
    const now = getBoliviaDate();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [mesDetalleZumba, setMesDetalleZumba] = useState<string>(() => {
    const now = getBoliviaDate();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [detalleAtraso, setDetalleAtraso] = useState<AtrasoEmpleado | null>(null);
  const [editandoSueldo, setEditandoSueldo] = useState<string | null>(null);
  const [nuevoSueldo, setNuevoSueldo] = useState<string>("");
  const [editandoComision, setEditandoComision] = useState<string | null>(null);
  const [nuevaComision, setNuevaComision] = useState<string>("");
  const [detalleClasesZumba, setDetalleClasesZumba] = useState<{
    empleadoId: string;
    empleadoNombre: string;
    clases: ReporteZumba[];
  } | null>(null);

  const { user } = useUser();
  const { toast } = useToast();

  const mesesDisponibles = generarMesesDisponibles(12);

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

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const sucursalParam =
        selectedSucursal !== "all" ? selectedSucursal : undefined;

      const [empleadosData, atrasosData, pagosData] = await Promise.all([
        getEmpleadosReporte(sucursalParam),
        getAtrasosEmpleados(mesActual, sucursalParam),
        getPagosInformativos(mesActual, sucursalParam),
      ]);

      setEmpleados(empleadosData);
      setAtrasosCompletos(atrasosData);
      setPagosInfo(pagosData);
    } catch (err) {
      console.error("Error al cargar datos:", err);
      setError("No se pudieron cargar los datos. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [mesActual, selectedSucursal]);

  const cargarPagosZumba = useCallback(async () => {
    try {
      const sucursalParam =
        selectedSucursal !== "all" ? selectedSucursal : undefined;
      const pagosData = await getPagosInformativos(mesZumba, sucursalParam);
      setPagosInfo((prev) => {
        const otros = prev.filter((p) => p.tipo !== "zumba");
        const zumbas = pagosData.filter((p) => p.tipo === "zumba");
        return [...otros, ...zumbas];
      });
    } catch (err) {
      console.error("Error al cargar pagos zumba:", err);
    }
  }, [mesZumba, selectedSucursal]);

  useEffect(() => {
    cargarSucursales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    if (mesZumba !== mesActual) {
      cargarPagosZumba();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesZumba]);

  useEffect(() => {
    if (detalleClasesZumba) {
      const cargar = async () => {
        try {
          const clases = await getReportesZumba(
            mesDetalleZumba,
            detalleClasesZumba.empleadoId
          );
          setDetalleClasesZumba((prev) =>
            prev ? { ...prev, clases } : null
          );
        } catch (err) {
          console.error("Error recargando clases zumba:", err);
        }
      };
      cargar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesDetalleZumba]);

  const abrirEditorSueldo = (empleado: EmpleadoReporte) => {
    setEditandoSueldo(empleado.id);
    setNuevoSueldo(empleado.sueldoBase > 0 ? empleado.sueldoBase.toString() : "");
  };

  const abrirEditorComision = (empleadoId: string, valorActual: number) => {
    setEditandoComision(empleadoId);
    setNuevaComision(valorActual > 0 ? valorActual.toString() : "");
  };

  const actualizarSueldo = async (empleadoId: string) => {
    const nuevoSueldoNum = parseFloat(nuevoSueldo);
    if (isNaN(nuevoSueldoNum) || nuevoSueldoNum <= 0) {
      toast({
        title: "Error",
        description: "Ingrese un sueldo válido mayor a 0",
        variant: "destructive",
      });
      return;
    }

    try {
      await actualizarSueldoEmpleado(empleadoId, nuevoSueldoNum);

      setEmpleados((prev) =>
        prev.map((e) =>
          e.id === empleadoId ? { ...e, sueldoBase: nuevoSueldoNum } : e
        )
      );

      setPagosInfo((prev) =>
        prev.map((p) =>
          p.empleadoId === empleadoId
            ? {
                ...p,
                sueldoBase: nuevoSueldoNum,
                sueldoNeto: nuevoSueldoNum,
              }
            : p
        )
      );

      toast({ title: "Éxito", description: "Sueldo actualizado" });
      setEditandoSueldo(null);
      setNuevoSueldo("");
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el sueldo",
        variant: "destructive",
      });
    }
  };

  const actualizarComision = async (empleadoId: string) => {
    const nuevaComisionNum = parseFloat(nuevaComision);
    if (isNaN(nuevaComisionNum) || nuevaComisionNum <= 0) {
      toast({
        title: "Error",
        description: "Ingrese un valor válido mayor a 0",
        variant: "destructive",
      });
      return;
    }

    try {
      await actualizarSueldoEmpleado(empleadoId, undefined, nuevaComisionNum);

      setEmpleados((prev) =>
        prev.map((e) =>
          e.id === empleadoId ? { ...e, comision: nuevaComisionNum } : e
        )
      );

      setPagosInfo((prev) =>
        prev.map((p) => {
          if (p.empleadoId !== empleadoId) return p;

          const diasRegistrados = p.diasRegistrados || 0;
          const totalPersonas = p.totalPersonas || 0;
          const promedio =
            diasRegistrados > 0 ? totalPersonas / diasRegistrados : 0;
          const nuevaComisionCalculada = promedio * nuevaComisionNum;

          return {
            ...p,
            valorComision: nuevaComisionNum,
            comision: nuevaComisionCalculada,
            sueldoNeto: nuevaComisionCalculada,
          };
        })
      );

      toast({ title: "Éxito", description: "Valor actualizado" });
      setEditandoComision(null);
      setNuevaComision("");
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el valor",
        variant: "destructive",
      });
    }
  };

  const verDetalleClases = async (
    empleadoId: string,
    empleadoNombre: string
  ) => {
    try {
      const mesInicial = mesZumba;
      setMesDetalleZumba(mesInicial);
      const clases = await getReportesZumba(mesInicial, empleadoId);
      setDetalleClasesZumba({
        empleadoId,
        empleadoNombre,
        clases,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las clases",
        variant: "destructive",
      });
    }
  };

  const empleadosNormales = empleados.filter((e) => e.tipo !== "zumba");
  const empleadosZumba = empleados.filter((e) => e.tipo === "zumba");

  const totalMinutosAtraso = atrasosCompletos.reduce(
    (sum, a) => sum + a.totalMinutos,
    0
  );
  const totalSueldos = pagosInfo
    .filter((p) => p.tipo === "normal")
    .reduce((sum, p) => sum + p.sueldoNeto, 0);
  const totalComisiones = pagosInfo
    .filter((p) => p.tipo === "zumba")
    .reduce((sum, p) => sum + p.sueldoNeto, 0);
  const totalAPagar = totalSueldos + totalComisiones;

  const atrasosGraficos = atrasosCompletos.map((a) => ({
    trabajador: a.empleadoNombre,
    minutosAcumulados: a.totalMinutos,
    diasAtraso: a.totalDias,
  }));

  if (loadingSucursales || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando reporte de empleados...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-destructive mb-4">{error}</div>
        <Button onClick={cargarDatos}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">
            Reporte de Empleados
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestión de asistencia, atrasos y pagos mensuales
          </p>
        </div>

        <FiltrosCompactos
          selectedSucursal={selectedSucursal}
          onSucursalChange={setSelectedSucursal}
          sucursales={sucursales}
          user={user}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {empleados.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Minutos Atraso</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {totalMinutosAtraso} min
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sueldos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              Bs. {totalSueldos.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comisiones Zumba</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              Bs. {totalComisiones.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Pagar</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              Bs. {totalAPagar.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">
              Minutos de Atraso Acumulados
            </CardTitle>
            <CardDescription>Atrasos por trabajador en el período</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={atrasosGraficos}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis
                  dataKey="trabajador"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fill: "#a0a0a0" }}
                />
                <YAxis fontSize={12} tick={{ fill: "#a0a0a0" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: "#e2e2e2" }} />
                <Bar
                  dataKey="minutosAcumulados"
                  name="Minutos de atraso"
                  fill="#EF4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Días con Atraso</CardTitle>
            <CardDescription>
              Cantidad de días con atraso por trabajador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={atrasosGraficos}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis
                  dataKey="trabajador"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fill: "#a0a0a0" }}
                />
                <YAxis fontSize={12} tick={{ fill: "#a0a0a0" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: "#e2e2e2" }} />
                <Bar
                  dataKey="diasAtraso"
                  name="Días con atraso"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Users className="h-5 w-5" />
            Empleados
          </CardTitle>
          <CardDescription>
            Información de sueldos por empleado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {empleadosNormales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay empleados registrados
              </div>
            ) : (
              empleadosNormales.map((empleado) => {
                const sucursalNombres = empleado.sucursalNombres.join(", ");
                const editando = editandoSueldo === empleado.id;

                return (
                  <div
                    key={empleado.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{empleado.nombre}</span>
                        <Badge variant="secondary" className="text-xs">
                          {sucursalNombres}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-primary">
                          Bs. {empleado.sueldoBase.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Sueldo Base
                        </p>
                      </div>
                      {editando ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={nuevoSueldo}
                            onChange={(e) => setNuevoSueldo(e.target.value)}
                            placeholder="Sueldo Base"
                            className="w-32 h-8 text-sm"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => actualizarSueldo(empleado.id)}
                          >
                            Guardar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditandoSueldo(null);
                              setNuevoSueldo("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirEditorSueldo(empleado)}
                        >
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-green-500/30">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-green-500">
                <Music className="h-5 w-5" />
                Instructores de Zumba
              </CardTitle>
              <CardDescription>
                Comisiones calculadas por promedio de personas y valor configurado
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={mesZumba} onValueChange={setMesZumba}>
                <SelectTrigger className="w-[180px] h-8 text-sm">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {mesesDisponibles.map((mes) => (
                    <SelectItem key={mes} value={mes} className="capitalize">
                      {formatearMes(mes)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {empleadosZumba.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay instructores de zumba registrados
              </div>
            ) : (
              empleadosZumba.map((empleado) => {
                const sucursalNombres = empleado.sucursalNombres.join(", ");
                const pagoInfo = pagosInfo.find(
                  (p) => p.empleadoId === empleado.id
                );

                return (
                  <div
                    key={empleado.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border border-green-500/20 rounded-lg gap-3 bg-green-500/5"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{empleado.nombre}</span>
                        <Badge variant="secondary" className="text-xs">
                          {sucursalNombres}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-500/10 text-green-500"
                        >
                          <Music className="h-3 w-3 mr-1" />
                          Zumba
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {pagoInfo?.diasRegistrados || 0} días registrados |{" "}
                        {pagoInfo?.totalPersonas || 0} personas totales
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-green-500 text-lg">
                          Bs. {pagoInfo?.sueldoNeto.toLocaleString() || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pagoInfo?.diasRegistrados
                            ? (
                                (pagoInfo?.totalPersonas || 0) /
                                pagoInfo.diasRegistrados
                              ).toFixed(1)
                            : 0}{" "}
                          pers/día × Bs. {pagoInfo?.valorComision || 50}
                        </p>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-500/30 hover:bg-green-500/10"
                            onClick={() =>
                              verDetalleClases(empleado.id, empleado.nombre)
                            }
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver detalle
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-primary">
                              Clases Zumba - {detalleClasesZumba?.empleadoNombre}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <Select
                                value={mesDetalleZumba}
                                onValueChange={setMesDetalleZumba}
                              >
                                <SelectTrigger className="flex-1 h-9 text-sm">
                                  <SelectValue placeholder="Mes" />
                                </SelectTrigger>
                                <SelectContent>
                                  {mesesDisponibles.map((mes) => (
                                    <SelectItem
                                      key={mes}
                                      value={mes}
                                      className="capitalize"
                                    >
                                      {formatearMes(mes)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="border-t pt-2">
                              <p className="font-medium mb-2">
                                Clases de {formatearMes(mesDetalleZumba)}:
                              </p>
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {detalleClasesZumba?.clases.map((clase, idx) => (
                                  <div
                                    key={idx}
                                    className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded"
                                  >
                                    <span>
                                      {new Date(clase.fecha).toLocaleDateString(
                                        "es-ES"
                                      )}
                                    </span>
                                    <Badge variant="secondary">
                                      {clase.numeroPersonas} personas
                                    </Badge>
                                  </div>
                                ))}
                                {(!detalleClasesZumba?.clases ||
                                  detalleClasesZumba.clases.length === 0) && (
                                  <p className="text-center text-muted-foreground py-4">
                                    No hay clases registradas este mes
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="border-t pt-2">
                              <div className="flex justify-between">
                                <span className="font-medium">
                                  Días registrados:
                                </span>
                                <span className="font-bold">
                                  {pagoInfo?.diasRegistrados || 0}
                                </span>
                              </div>
                              <div className="flex justify-between mt-1">
                                <span className="font-medium">
                                  Total personas:
                                </span>
                                <span className="font-bold">
                                  {pagoInfo?.totalPersonas || 0}
                                </span>
                              </div>
                              <div className="flex justify-between mt-1">
                                <span className="font-medium">Promedio:</span>
                                <span className="font-bold">
                                  {pagoInfo?.diasRegistrados
                                    ? (
                                        (pagoInfo?.totalPersonas || 0) /
                                        pagoInfo.diasRegistrados
                                      ).toFixed(1)
                                    : 0}{" "}
                                  personas/día
                                </span>
                              </div>
                              <div className="flex justify-between mt-1">
                                <span className="font-medium">
                                  Valor por persona:
                                </span>
                                <span className="text-green-500">
                                  Bs. {pagoInfo?.valorComision || 50}
                                </span>
                              </div>
                              <div className="flex justify-between mt-2 pt-2 border-t">
                                <span className="font-bold">
                                  Total a pagar:
                                </span>
                                <span className="font-bold text-primary">
                                  Bs.{" "}
                                  {pagoInfo?.sueldoNeto.toLocaleString() || "0"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {editandoComision === empleado.id ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={nuevaComision}
                            onChange={(e) => setNuevaComision(e.target.value)}
                            placeholder="Bs por persona"
                            className="w-32 h-8 text-sm"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => actualizarComision(empleado.id)}
                          >
                            Guardar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditandoComision(null);
                              setNuevaComision("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500/30 hover:bg-green-500/10"
                          onClick={() =>
                            abrirEditorComision(
                              empleado.id,
                              pagoInfo?.valorComision || empleado.comision || 0
                            )
                          }
                        >
                          Editar valor
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Clock className="h-5 w-5" />
            Detalle de Atrasos - {formatearMes(mesActual)}
          </CardTitle>
          <CardDescription>
            Desglose de minutos de atraso por empleado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {atrasosCompletos
              .filter(
                (a) =>
                  empleados.find((e) => e.id === a.empleadoId)?.tipo !== "zumba"
              )
              .map((atraso) => (
                <div key={atraso.empleadoId} className="border rounded-lg p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {atraso.empleadoNombre}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {atraso.sucursalNombre}
                        </Badge>
                      </div>
                      <div className="flex gap-3 mt-1 text-sm">
                        <span className="text-red-500">
                          {atraso.totalMinutos} minutos
                        </span>
                        <span className="text-orange-500">
                          {atraso.totalDias} días
                        </span>
                      </div>
                    </div>
                    <div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDetalleAtraso(atraso)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver detalles
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-primary">
                              Detalle de Atrasos
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            <div>
                              <p className="font-semibold">
                                {detalleAtraso?.empleadoNombre}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {detalleAtraso?.sucursalNombre}
                              </p>
                            </div>
                            <div className="border-t pt-2">
                              <p className="font-medium mb-2">
                                Fechas con atraso:
                              </p>
                              <div className="space-y-1 max-h-60 overflow-y-auto">
                                {detalleAtraso?.detalles.map((detalle, idx) => (
                                  <div
                                    key={idx}
                                    className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded gap-2"
                                  >
                                    <span className="flex-shrink-0">
                                      {new Date(
                                        detalle.fecha
                                      ).toLocaleDateString("es-ES")}
                                    </span>
                                    <span
                                      className={`flex-1 text-right ${
                                        detalle.tipo === "Sin Marcar"
                                          ? "text-muted-foreground"
                                          : "text-red-500"
                                      }`}
                                    >
                                      {detalle.tipo === "Sin Marcar"
                                        ? "—"
                                        : `${detalle.minutos} minutos`}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={`text-xs flex-shrink-0 ${
                                        detalle.tipo === "Entrada"
                                          ? "border-blue-500/40 text-blue-500"
                                          : detalle.tipo === "Salida"
                                          ? "border-orange-500/40 text-orange-500"
                                          : "border-muted-foreground/40 text-muted-foreground"
                                      }`}
                                    >
                                      {detalle.tipo}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}