import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Building2,
  Loader2,
  Target,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import {
  getReportes,
  getSucursales,
  getObjetivosMensuales,
  guardarObjetivoMensual,
  eliminarObjetivoMensual,
  getVentasRealesPorMes,
  getResumenPorSucursal,
  getDesglosePagos,
  FiltrosReporte,
  TendenciaReporte,
  Sucursal,
  ObjetivoMensual,
  VentaRealMensual,
  ResumenSucursal,
  DesglosePagos,
} from "@/api/ReportsApi";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const getBoliviaDate = (): Date => {
  const now = new Date();
  const boliviaOffset = -4 * 60;
  const localOffset = now.getTimezoneOffset();
  return new Date(now.getTime() + (localOffset - boliviaOffset) * 60 * 1000);
};

export function Reports() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingSucursales, setLoadingSucursales] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [tendenciasData, setTendenciasData] = useState<TendenciaReporte[]>([]);
  const [resumenSucursales, setResumenSucursales] = useState<ResumenSucursal[]>([]);
  const [desglosePagos, setDesglosePagos] = useState<Record<string, DesglosePagos>>({});
  const [objetivos, setObjetivos] = useState<ObjetivoMensual[]>([]);
  const [ventasReales, setVentasReales] = useState<VentaRealMensual[]>([]);
  const [editandoObjetivo, setEditandoObjetivo] = useState<{
    sucursalId: string;
    mes: string;
  } | null>(null);
  const [nuevoObjetivo, setNuevoObjetivo] = useState<string>("");
  const [detalleSucursal, setDetalleSucursal] = useState<ResumenSucursal | null>(null);

  const [mesActual, setMesActual] = useState<string>(() => {
    const now = getBoliviaDate();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const carruselRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const { toast } = useToast();

  // ============================================
  // CARGA INICIAL
  // ============================================
  const cargarSucursales = async () => {
    try {
      setLoadingSucursales(true);
      const sucursalesData = await getSucursales();
      // Excluir "Todas las sucursales" para las cards de resumen
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

  const cargarReportes = async () => {
    try {
      setLoading(true);
      setError(null);

      const filtros: FiltrosReporte = {
        dateFilterType: "thisMonth",
        specificDate: undefined,
        startDate: undefined,
        endDate: undefined,
        sucursalId: undefined,
      };

      const [
        reportes,
        resumenData,
        desgloseData,
        ventasData,
        objetivosData,
      ] = await Promise.all([
        getReportes(filtros),
        getResumenPorSucursal(filtros),
        getDesglosePagos(filtros),
        getVentasRealesPorMes(),
        getObjetivosMensuales(),
      ]);

      setTendenciasData(reportes.tendencias);
      setResumenSucursales(resumenData);
      setDesglosePagos(desgloseData);
      setVentasReales(ventasData);
      setObjetivos(objetivosData);
    } catch (err) {
      console.error("Error al cargar reportes:", err);
      setError("No se pudieron cargar los reportes. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSucursales();
    cargarReportes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // OBJETIVOS
  // ============================================
  const obtenerVentaReal = (sucursalId: string, mes: string): number => {
    const venta = ventasReales.find(
      (v) => v.sucursalId === sucursalId && v.mes === mes
    );
    return venta ? venta.total : 0;
  };

  const obtenerObjetivo = (sucursalId: string, mes: string): number | null => {
    const objetivo = objetivos.find(
      (o) => o.sucursalId === sucursalId && o.mes === mes
    );
    return objetivo ? objetivo.objetivo : null;
  };

  const guardarObjetivo = async (sucursalId: string, mes: string) => {
    const valor = parseFloat(nuevoObjetivo);
    if (isNaN(valor) || valor <= 0) {
      toast({
        title: "Error",
        description: "Ingrese un monto válido mayor a 0",
        variant: "destructive",
      });
      return;
    }

    try {
      const guardado = await guardarObjetivoMensual(sucursalId, mes, valor);

      setObjetivos((prev) => {
        const existe = prev.findIndex(
          (o) => o.sucursalId === sucursalId && o.mes === mes
        );
        if (existe !== -1) {
          const copia = [...prev];
          copia[existe] = guardado;
          return copia;
        }
        return [...prev, guardado];
      });

      setEditandoObjetivo(null);
      setNuevoObjetivo("");
      toast({ title: "Éxito", description: "Objetivo guardado" });
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo guardar el objetivo",
        variant: "destructive",
      });
    }
  };

  const eliminarObjetivo = async (sucursalId: string, mes: string) => {
    try {
      await eliminarObjetivoMensual(sucursalId, mes);
      setObjetivos((prev) =>
        prev.filter((o) => !(o.sucursalId === sucursalId && o.mes === mes))
      );
      toast({ title: "Éxito", description: "Objetivo eliminado" });
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el objetivo",
        variant: "destructive",
      });
    }
  };

  const calcularPorcentajeCumplimiento = (total: number, objetivo: number): number => {
    if (!objetivo || objetivo === 0) return 0;
    return (total / objetivo) * 100;
  };

  const totalGeneral = resumenSucursales.reduce((sum, suc) => sum + suc.total, 0);

  // ============================================
  // CARRUSEL DE MESES
  // ============================================
  const mesAnterior = () => {
    const [year, month] = mesActual.split("-").map(Number);
    const fecha = new Date(year, month - 2, 1);
    setMesActual(`${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`);
  };

  const mesSiguiente = () => {
    const [year, month] = mesActual.split("-").map(Number);
    const fecha = new Date(year, month, 1);
    setMesActual(`${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`);
  };

  const formatearMes = (mes: string): string => {
    const [year, month] = mes.split("-");
    const fecha = new Date(parseInt(year), parseInt(month) - 1);
    return fecha.toLocaleString("es-ES", { month: "long", year: "numeric" });
  };

  const esMesFuturo = (mes: string): boolean => {
    const ahora = getBoliviaDate();
    const mesActualDate = new Date(
      parseInt(mes.split("-")[0]),
      parseInt(mes.split("-")[1]) - 1
    );
    return mesActualDate > ahora;
  };

  const abrirDetalle = (sucursal: ResumenSucursal) => {
    setDetalleSucursal(sucursal);
  };

  // ============================================
  // RENDER
  // ============================================
  if (loadingSucursales || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando reportes...</span>
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">
            Reportes y Análisis
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Tendencias y evolución de ventas
          </p>
        </div>
      </div>

      {/* Tarjetas de resumen por sucursal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resumenSucursales.map((sucursal) => (
          <Card key={sucursal.sucursalId} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{sucursal.sucursalNombre}</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirDetalle(sucursal)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="text-2xl font-bold">
                    Bs. {sucursal.total.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Servicios:</span>
                  <span className="font-medium">
                    Bs. {sucursal.servicios.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Productos:</span>
                  <span className="font-medium">
                    Bs. {sucursal.productos.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Total General</span>
              <TrendingUp className="h-5 w-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">Total:</span>
              <span className="text-3xl font-bold text-primary">
                Bs. {totalGeneral.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalle de Sucursal */}
      <Dialog open={!!detalleSucursal} onOpenChange={() => setDetalleSucursal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Detalle de Ventas - {detalleSucursal?.sucursalNombre}
            </DialogTitle>
          </DialogHeader>
          {detalleSucursal && desglosePagos[detalleSucursal.sucursalId] && (
            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="font-semibold text-lg mb-2">Servicios</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Efectivo:</span>
                      <span className="font-medium">
                        Bs. {desglosePagos[detalleSucursal.sucursalId].serviciosEfectivo.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">QR:</span>
                      <span className="font-medium">
                        Bs. {desglosePagos[detalleSucursal.sucursalId].serviciosQr.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Productos</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Efectivo:</span>
                      <span className="font-medium">
                        Bs. {desglosePagos[detalleSucursal.sucursalId].productosEfectivo.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">QR:</span>
                      <span className="font-medium">
                        Bs. {desglosePagos[detalleSucursal.sucursalId].productosQr.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="font-semibold text-lg mb-2">Totales por Método</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Efectivo:</span>
                      <span className="font-medium text-green-600">
                        Bs. {desglosePagos[detalleSucursal.sucursalId].totalEfectivo.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total QR:</span>
                      <span className="font-medium text-blue-600">
                        Bs. {desglosePagos[detalleSucursal.sucursalId].totalQr.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 rounded-lg p-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-lg">Total General:</span>
                    <span className="text-2xl font-bold text-primary">
                      Bs. {detalleSucursal.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Objetivos Mensuales con Carrusel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Objetivos Mensuales
          </CardTitle>
          <CardDescription>
            Define metas de ventas por sucursal y haz seguimiento de su cumplimiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" size="icon" onClick={mesAnterior} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-center">
              <h3 className="text-xl font-semibold capitalize">
                {formatearMes(mesActual)}
              </h3>
              {esMesFuturo(mesActual) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Mes futuro - No hay datos de ventas disponibles
                </p>
              )}
            </div>

            <Button variant="outline" size="icon" onClick={mesSiguiente} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div ref={carruselRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resumenSucursales.map((sucursal) => {
              const objetivo = obtenerObjetivo(sucursal.sucursalId, mesActual);
              const ventaReal = esMesFuturo(mesActual)
                ? 0
                : obtenerVentaReal(sucursal.sucursalId, mesActual);
              const porcentaje = objetivo
                ? calcularPorcentajeCumplimiento(ventaReal, objetivo)
                : 0;
              const editando =
                editandoObjetivo?.sucursalId === sucursal.sucursalId &&
                editandoObjetivo?.mes === mesActual;
              const esMesActual =
                mesActual ===
                `${getBoliviaDate().getFullYear()}-${String(
                  getBoliviaDate().getMonth() + 1
                ).padStart(2, "0")}`;

              return (
                <div key={sucursal.sucursalId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-medium">{sucursal.sucursalNombre}</span>
                    {!editando ? (
                      <div className="flex gap-2">
                        {objetivo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarObjetivo(sucursal.sucursalId, mesActual)}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditandoObjetivo({
                              sucursalId: sucursal.sucursalId,
                              mes: mesActual,
                            });
                            setNuevoObjetivo(objetivo?.toString() || "");
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => guardarObjetivo(sucursal.sucursalId, mesActual)}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditandoObjetivo(null);
                            setNuevoObjetivo("");
                          }}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {editando ? (
                    <Input
                      type="number"
                      value={nuevoObjetivo}
                      onChange={(e) => setNuevoObjetivo(e.target.value)}
                      placeholder="Monto del objetivo"
                      className="mb-2"
                    />
                  ) : (
                    <>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Objetivo:</span>
                        <span className="font-medium">
                          {objetivo ? `Bs. ${objetivo.toLocaleString()}` : "No definido"}
                        </span>
                      </div>
                      {objetivo && (
                        <>
                          {!esMesFuturo(mesActual) ? (
                            <>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">
                                  {esMesActual ? "Venta actual:" : "Venta real:"}
                                </span>
                                <span>Bs. {ventaReal.toLocaleString()}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    porcentaje >= 100
                                      ? "bg-green-500"
                                      : porcentaje >= 75
                                      ? "bg-yellow-500"
                                      : "bg-blue-500"
                                  }`}
                                  style={{ width: `${Math.min(porcentaje, 100)}%` }}
                                />
                              </div>
                              <div className="text-right text-sm mt-1">
                                <span
                                  className={
                                    porcentaje >= 100
                                      ? "text-green-600 font-bold"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {porcentaje.toFixed(1)}% cumplido
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center text-sm text-muted-foreground py-4">
                              No hay datos de ventas para meses futuros
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Tendencias */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencias de Ventas</CardTitle>
          <CardDescription>Evolución mensual de servicios y productos</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={tendenciasData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  color: "black",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="servicios"
                name="Servicios"
                stroke="#8B5CF6"
                strokeWidth={3}
                activeDot={{ r: 8, stroke: "#7C3AED", strokeWidth: 2, fill: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="productos"
                name="Productos"
                stroke="#06B6D4"
                strokeWidth={3}
                activeDot={{ r: 8, stroke: "#0891B2", strokeWidth: 2, fill: "#fff" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}