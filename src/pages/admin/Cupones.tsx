import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Ticket,
  PlusCircle,
  Trash2,
  Edit2,
  Percent,
  DollarSign,
  Calendar,
  Users,
  Copy,
  CheckCircle,
  XCircle,
  Store,
  FileText,
  Tag,
  MapPin,
  Clock,
  Hash,
  Sparkles,
  Package,
  Briefcase,
  Plus,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  getCupones,
  getSucursales,
  createCupon,
  updateCupon,
  deleteCupon,
  toggleCuponStatus,
  type Cupon,
  type Sucursal,
  type CuponFormData,
} from "../../api/CuponesApi";

const getBoliviaDate = (): string => {
  const now = new Date();
  const boliviaOffset = -4 * 60;
  const localOffset = now.getTimezoneOffset();
  const boliviaDate = new Date(
    now.getTime() + (localOffset - boliviaOffset) * 60 * 1000
  );
  return boliviaDate.toISOString().split("T")[0];
};

const formatearFecha = (fecha: string): string => {
  return new Date(fecha).toLocaleDateString("es-ES");
};

const generarCodigo = (): string => {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codigo = "";
  for (let i = 0; i < 8; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
};

// ✅ CAMBIO: tipo local que permite "" como "sin selección"
type TipoDescuentoLocal = "porcentaje" | "monto_fijo" | "";

interface CuponFormDataLocal extends Omit<CuponFormData, "tipo"> {
  tipo: TipoDescuentoLocal;
}

export function Cupones() {
  const [loading, setLoading] = useState<boolean>(true);
  const [cupones, setCupones] = useState<Cupon[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoCupon, setEditandoCupon] = useState<Cupon | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [loadingButtons, setLoadingButtons] = useState<Record<string, boolean>>(
    {}
  );

  // ✅ CAMBIO: tipo inicia vacío
  const [formData, setFormData] = useState<CuponFormDataLocal>({
    codigo: "",
    tipo: "",
    valor: "",
    descripcion: "",
    fechaInicio: getBoliviaDate(),
    fechaExpiracion: "",
    usosMaximos: "",
    aplicableA: [],
    sucursalesIds: [],
  });

  const { toast } = useToast();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cuponesData, sucursalesData] = await Promise.all([
        getCupones(),
        getSucursales(),
      ]);
      setCupones(cuponesData);
      setSucursales(sucursalesData);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startButtonLoading = (buttonId: string) => {
    setLoadingButtons((prev) => ({ ...prev, [buttonId]: true }));
  };

  const stopButtonLoading = (buttonId: string) => {
    setLoadingButtons((prev) => ({ ...prev, [buttonId]: false }));
  };

  const isButtonLoading = (buttonId: string) => {
    return loadingButtons[buttonId] || false;
  };

  // Helper para castear al tipo esperado por el API
  const toApiFormData = (data: CuponFormDataLocal): CuponFormData => ({
    ...data,
    tipo: (data.tipo || "porcentaje") as "porcentaje" | "monto_fijo",
  });

  const handleSubmit = async () => {
    if (!formData.codigo || !formData.valor || !formData.fechaExpiracion) {
      toast({
        title: "Datos incompletos",
        description: "Complete todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    // ✅ CAMBIO: validar que se haya seleccionado el tipo de descuento
    if (!formData.tipo) {
      toast({
        title: "Datos incompletos",
        description: "Seleccione el tipo de descuento (Porcentaje o Monto Fijo)",
        variant: "destructive",
      });
      return;
    }

    if (formData.sucursalesIds.length === 0) {
      toast({
        title: "Error",
        description: "Seleccione al menos una sucursal",
        variant: "destructive",
      });
      return;
    }

    const buttonId = editandoCupon
      ? `edit-${editandoCupon.id}`
      : "create-cupon";
    if (isButtonLoading(buttonId)) return;

    try {
      startButtonLoading(buttonId);

      if (editandoCupon) {
        const updatedCupon = await updateCupon(
          editandoCupon.id,
          toApiFormData(formData)
        );
        setCupones((prev) =>
          prev.map((c) => (c.id === editandoCupon.id ? updatedCupon : c))
        );
        toast({
          title: "Cupón actualizado",
          description: `${formData.codigo} se ha actualizado correctamente`,
        });
      } else {
        const newCupon = await createCupon(toApiFormData(formData));
        setCupones((prev) => [newCupon, ...prev]);
        toast({
          title: "Cupón creado",
          description: `${formData.codigo} se ha creado correctamente`,
        });
      }

      setDialogOpen(false);
      setEditandoCupon(null);
      resetForm();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Error al guardar el cupón",
        variant: "destructive",
      });
    } finally {
      stopButtonLoading(buttonId);
    }
  };

  const resetForm = () => {
    setFormData({
      codigo: "",
      tipo: "", // ✅ CAMBIO
      valor: "",
      descripcion: "",
      fechaInicio: getBoliviaDate(),
      fechaExpiracion: "",
      usosMaximos: "",
      aplicableA: [],
      sucursalesIds: [],
    });
  };

  const handleEdit = (cupon: Cupon) => {
    setEditandoCupon(cupon);
    setFormData({
      codigo: cupon.codigo,
      tipo: cupon.tipo, // al editar sí se mantiene el tipo guardado
      valor: cupon.valor.toString(),
      descripcion: cupon.descripcion,
      fechaInicio: cupon.fechaInicio,
      fechaExpiracion: cupon.fechaExpiracion,
      usosMaximos: cupon.usosMaximos.toString(),
      aplicableA: cupon.aplicableA,
      sucursalesIds: cupon.sucursalesIds,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const buttonId = `delete-${id}`;
    if (isButtonLoading(buttonId)) return;

    if (!confirm("¿Estás seguro de eliminar este cupón?")) return;

    try {
      startButtonLoading(buttonId);
      await deleteCupon(id);
      setCupones((prev) => prev.filter((c) => c.id !== id));
      toast({
        title: "Cupón eliminado",
        description: "El cupón se ha eliminado correctamente",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Error al eliminar el cupón",
        variant: "destructive",
      });
    } finally {
      stopButtonLoading(buttonId);
    }
  };

  const toggleActivo = async (id: string) => {
    const buttonId = `toggle-${id}`;
    if (isButtonLoading(buttonId)) return;

    try {
      startButtonLoading(buttonId);
      const updatedCupon = await toggleCuponStatus(id);
      setCupones((prev) =>
        prev.map((c) => (c.id === id ? updatedCupon : c))
      );
      toast({
        title: updatedCupon.activo ? "Cupón activado" : "Cupón desactivado",
        description: `${updatedCupon.codigo} está ahora ${
          updatedCupon.activo ? "activo" : "inactivo"
        }`,
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Error al cambiar el estado del cupón",
        variant: "destructive",
      });
    } finally {
      stopButtonLoading(buttonId);
    }
  };

  const copiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    setCopiado(codigo);
    setTimeout(() => setCopiado(null), 2000);
  };

  const handleSucursalToggle = (sucursalId: string) => {
    setFormData((prev) => ({
      ...prev,
      sucursalesIds: prev.sucursalesIds.includes(sucursalId)
        ? prev.sucursalesIds.filter((id) => id !== sucursalId)
        : [...prev.sucursalesIds, sucursalId],
    }));
  };

  const handleSelectAllSucursales = () => {
    if (formData.sucursalesIds.length === sucursales.length) {
      setFormData((prev) => ({ ...prev, sucursalesIds: [] }));
    } else {
      setFormData((prev) => ({
        ...prev,
        sucursalesIds: sucursales.map((s) => s.id),
      }));
    }
  };

  const handleAplicableToggle = (
    tipo: "servicios" | "productos",
    checked: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      aplicableA: checked
        ? [...prev.aplicableA, tipo]
        : prev.aplicableA.filter((a) => a !== tipo),
    }));
  };

  const getSucursalesNombres = (ids: string[]) => {
    return ids
      .map((id) => sucursales.find((s) => s.id === id)?.nombre)
      .filter(Boolean)
      .join(", ");
  };

  const cuponesActivos = cupones.filter((c) => c.activo);
  const cuponesInactivos = cupones.filter((c) => !c.activo);
  const totalUsos = cupones.reduce((sum, c) => sum + c.usosActuales, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Ticket className="h-12 w-12 mx-auto mb-4 animate-bounce" />
          <p>Cargando cupones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">
            Gestión de Cupones
          </h1>
          <p className="text-sm text-muted-foreground">
            Crea y gestiona cupones de descuento para servicios y productos
          </p>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cupones</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{cupones.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cupones Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {cuponesActivos.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cupones Inactivos
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {cuponesInactivos.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalUsos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Botón para agregar cupón */}
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <PlusCircle className="h-4 w-4 mr-2" />
              Nuevo Cupón
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                {editandoCupon ? "Editar Cupón" : "Crear Nuevo Cupón"}
              </DialogTitle>
              <DialogDescription>
                {editandoCupon
                  ? "Modifica la información del cupón"
                  : "Completa la información del nuevo cupón de descuento"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* ============================================ */}
              {/* SECCIÓN: Identificación */}
              {/* ============================================ */}
              <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">
                    Identificación del Cupón
                  </Label>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="codigo">
                    Código del Cupón <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="codigo"
                      value={formData.codigo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          codigo: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="Ej: DESCUENTO20"
                      className="flex-1 font-mono"
                    />
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, codigo: generarCodigo() })
                      }
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Código único que los clientes ingresarán para aplicar el
                    descuento.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="descripcion" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Descripción (opcional)
                  </Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) =>
                      setFormData({ ...formData, descripcion: e.target.value })
                    }
                    placeholder="Describe el cupón, condiciones o detalles relevantes..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* ============================================ */}
              {/* SECCIÓN: Descuento */}
              {/* ============================================ */}
              <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">
                    Valor del Descuento
                  </Label>
                </div>

                <div className="grid gap-2">
                  <Label>
                    Tipo de Descuento <span className="text-red-500">*</span>
                  </Label>
                  {/* ✅ CAMBIO: ningún botón seleccionado por defecto */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, tipo: "porcentaje" })
                      }
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md border transition-all ${
                        formData.tipo === "porcentaje"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input hover:bg-accent"
                      }`}
                    >
                      <Percent className="h-4 w-4" />
                      Porcentaje (%)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, tipo: "monto_fijo" })
                      }
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md border transition-all ${
                        formData.tipo === "monto_fijo"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input hover:bg-accent"
                      }`}
                    >
                      <DollarSign className="h-4 w-4" />
                      Monto Fijo (Bs.)
                    </button>
                  </div>
                  {!formData.tipo && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Selecciona el tipo de descuento para continuar
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="valor">
                    {formData.tipo === "porcentaje"
                      ? "Porcentaje de descuento"
                      : formData.tipo === "monto_fijo"
                      ? "Monto en Bolivianos"
                      : "Valor del descuento"}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    {formData.tipo === "porcentaje" && (
                      <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    )}
                    {formData.tipo === "monto_fijo" && (
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                        Bs.
                      </span>
                    )}
                    <Input
                      id="valor"
                      type="number"
                      value={formData.valor}
                      onChange={(e) =>
                        setFormData({ ...formData, valor: e.target.value })
                      }
                      placeholder={
                        formData.tipo === "porcentaje"
                          ? "Ej: 20"
                          : formData.tipo === "monto_fijo"
                          ? "Ej: 50"
                          : "Selecciona el tipo primero"
                      }
                      className={formData.tipo ? "pl-9" : ""}
                      min="0"
                      step={formData.tipo === "porcentaje" ? "1" : "0.01"}
                      disabled={!formData.tipo}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formData.tipo === "porcentaje"
                      ? "Ingresa un valor entre 1 y 100."
                      : formData.tipo === "monto_fijo"
                      ? "Ingresa el monto de descuento en bolivianos."
                      : "Primero selecciona si es porcentaje o monto fijo."}
                  </p>
                </div>
              </div>

              {/* ============================================ */}
              {/* SECCIÓN: Vigencia */}
              {/* ============================================ */}
              <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">
                    Vigencia del Cupón
                  </Label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fechaInicio">Fecha de Inicio</Label>
                    <Input
                      id="fechaInicio"
                      type="date"
                      value={formData.fechaInicio}
                      onChange={(e) =>
                        setFormData({ ...formData, fechaInicio: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Desde cuándo se puede usar el cupón.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fechaExpiracion">
                      Fecha de Expiración <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fechaExpiracion"
                      type="date"
                      value={formData.fechaExpiracion}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fechaExpiracion: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Último día en que será válido.
                    </p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="usosMaximos" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Usos Máximos
                  </Label>
                  <Input
                    id="usosMaximos"
                    type="number"
                    value={formData.usosMaximos}
                    onChange={(e) =>
                      setFormData({ ...formData, usosMaximos: e.target.value })
                    }
                    placeholder="Ilimitado si se deja vacío o en 0"
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cantidad máxima de veces que se puede usar este cupón.
                  </p>
                </div>
              </div>

              {/* ============================================ */}
              {/* SECCIÓN: Aplicabilidad */}
              {/* ============================================ */}
              <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">
                    Aplicable a
                  </Label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.aplicableA.includes("servicios")
                        ? "border-primary bg-primary/5"
                        : "border-input hover:bg-accent"
                    }`}
                    onClick={() =>
                      handleAplicableToggle(
                        "servicios",
                        !formData.aplicableA.includes("servicios")
                      )
                    }
                  >
                    <Checkbox
                      id="aplica-servicios"
                      checked={formData.aplicableA.includes("servicios")}
                      onCheckedChange={(checked) =>
                        handleAplicableToggle("servicios", checked as boolean)
                      }
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <Label
                        htmlFor="aplica-servicios"
                        className="cursor-pointer flex-1"
                      >
                        Servicios
                      </Label>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.aplicableA.includes("productos")
                        ? "border-primary bg-primary/5"
                        : "border-input hover:bg-accent"
                    }`}
                    onClick={() =>
                      handleAplicableToggle(
                        "productos",
                        !formData.aplicableA.includes("productos")
                      )
                    }
                  >
                    <Checkbox
                      id="aplica-productos"
                      checked={formData.aplicableA.includes("productos")}
                      onCheckedChange={(checked) =>
                        handleAplicableToggle("productos", checked as boolean)
                      }
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <Label
                        htmlFor="aplica-productos"
                        className="cursor-pointer flex-1"
                      >
                        Productos
                      </Label>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Si no seleccionas ninguna, el cupón aplicará tanto a servicios
                  como a productos.
                </p>
              </div>

              {/* ============================================ */}
              {/* SECCIÓN: Sucursales */}
              {/* ============================================ */}
              <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">
                      Sucursales <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllSucursales}
                  >
                    {formData.sucursalesIds.length === sucursales.length ? (
                      <>
                        <X className="h-3 w-3 mr-1" />
                        Deseleccionar
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3 mr-1" />
                        Seleccionar todas
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sucursales.map((sucursal) => {
                    const selected = formData.sucursalesIds.includes(sucursal.id);
                    return (
                      <div
                        key={sucursal.id}
                        className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-input hover:bg-accent"
                        }`}
                        onClick={() => handleSucursalToggle(sucursal.id)}
                      >
                        <Checkbox
                          id={`sucursal-${sucursal.id}`}
                          checked={selected}
                          onCheckedChange={() =>
                            handleSucursalToggle(sucursal.id)
                          }
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <Label
                              htmlFor={`sucursal-${sucursal.id}`}
                              className="cursor-pointer text-sm truncate"
                            >
                              {sucursal.nombre}
                            </Label>
                            {sucursal.direccion && (
                              <span className="text-xs text-muted-foreground truncate">
                                {sucursal.direccion}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {formData.sucursalesIds.length === 0 && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Seleccione al menos una sucursal
                  </p>
                )}
                {formData.sucursalesIds.length > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    {formData.sucursalesIds.length} sucursal(es) seleccionada(s)
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isButtonLoading(
                  editandoCupon ? `edit-${editandoCupon.id}` : "create-cupon"
                )}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-primary text-primary-foreground"
                disabled={
                  formData.sucursalesIds.length === 0 ||
                  !formData.tipo ||
                  isButtonLoading(
                    editandoCupon ? `edit-${editandoCupon.id}` : "create-cupon"
                  )
                }
              >
                {isButtonLoading(
                  editandoCupon ? `edit-${editandoCupon.id}` : "create-cupon"
                )
                  ? "Guardando..."
                  : editandoCupon
                  ? "Guardar Cambios"
                  : "Crear Cupón"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla de cupones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Ticket className="h-5 w-5" />
            Cupones
            {cupones.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {cupones.length} registrados
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Todos los cupones del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Código</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Aplica a</TableHead>
                  <TableHead>Sucursales</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cupones.map((cupon) => (
                  <TableRow key={cupon.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded font-mono text-sm">
                          {cupon.codigo}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copiarCodigo(cupon.codigo)}
                          className="h-6 w-6 p-0"
                        >
                          {copiado === cupon.codigo ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {cupon.tipo === "porcentaje"
                        ? `${cupon.valor}%`
                        : `Bs. ${cupon.valor}`}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {cupon.descripcion || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div>Inicio: {formatearFecha(cupon.fechaInicio)}</div>
                        <div>Expira: {formatearFecha(cupon.fechaExpiracion)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {cupon.usosActuales} / {cupon.usosMaximos || "∞"}
                      </div>
                      <div className="w-full bg-muted rounded-full h-1 mt-1">
                        <div
                          className="bg-primary rounded-full h-1"
                          style={{
                            width: cupon.usosMaximos
                              ? `${Math.min(
                                  (cupon.usosActuales / cupon.usosMaximos) * 100,
                                  100
                                )}%`
                              : "0%",
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {cupon.aplicableA.includes("servicios") && (
                          <Badge variant="secondary" className="text-xs">
                            Servicios
                          </Badge>
                        )}
                        {cupon.aplicableA.includes("productos") && (
                          <Badge variant="secondary" className="text-xs">
                            Productos
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="text-xs text-muted-foreground truncate">
                        {getSucursalesNombres(cupon.sucursalesIds) || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Switch
                          checked={cupon.activo}
                          onCheckedChange={() => toggleActivo(cupon.id)}
                          disabled={isButtonLoading(`toggle-${cupon.id}`)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(cupon)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(cupon.id)}
                          disabled={isButtonLoading(`delete-${cupon.id}`)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {cupones.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Ticket size={48} className="mx-auto mb-4 opacity-50" />
                <p>No hay cupones registrados</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}