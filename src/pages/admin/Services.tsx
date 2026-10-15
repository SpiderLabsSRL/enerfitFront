import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TimePicker } from "@/components/ui/time-picker";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dumbbell,
  Plus,
  Edit3,
  Trash2,
  Building2,
  MapPin,
  Infinity,
  Calendar,
  Clock,
  Users,
  Tag,
  Eye,
  FileText,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getServices,
  getSucursales,
  getServiceTypes,
  createServiceType,
  createService,
  updateService,
  deleteService,
  toggleServiceStatus,
  type Service,
  type Sucursal,
  type ServiceType,
  type ServiceFormData,
} from "../../api/Servicesapi";

const WEEKDAYS = [
  { id: "monday", name: "Lunes" },
  { id: "tuesday", name: "Martes" },
  { id: "wednesday", name: "Miércoles" },
  { id: "thursday", name: "Jueves" },
  { id: "friday", name: "Viernes" },
  { id: "saturday", name: "Sábado" },
  { id: "sunday", name: "Domingo" },
];

// Tipo local para permitir '' como "sin selección" en tipoDuracion
type TipoDuracionLocal = "dias" | "meses" | "";

interface ServiceFormDataLocal extends Omit<ServiceFormData, "tipoDuracion"> {
  tipoDuracion: TipoDuracionLocal;
}

export function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddTypeDialogOpen, setIsAddTypeDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [viewingService, setViewingService] = useState<Service | null>(null);

  // ✅ CAMBIO: sin selección por defecto en tipoDuracion ni en serviceType
  const [formData, setFormData] = useState<ServiceFormDataLocal>({
    name: "",
    description: "",
    price: 0,
    maxEntries: 0,
    sucursales: [],
    multisucursal: false,
    sucursalesMultisucursal: [],
    unlimited: false,
    tipoDuracion: "",
    cantidadDuracion: "",
    serviceType: "",
    hasTimeRange: false,
    startTime: "09:00",
    endTime: "18:00",
    hasSpecificDays: false,
    specificDays: [],
    requiredPeopleEnabled: false,
    requiredPeople: "",
  });

  const [loading, setLoading] = useState(true);
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    open: boolean;
    service: Service | null;
  }>({ open: false, service: null });
  const [loadingButtons, setLoadingButtons] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [servicesData, sucursalesData, typesData] = await Promise.all([
        getServices(),
        getSucursales(),
        getServiceTypes(),
      ]);
      setServices(servicesData);
      setSucursales(sucursalesData);
      setServiceTypes(typesData);
      // ✅ CAMBIO: ya NO se autoselecciona el primer tipo
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los datos",
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

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      maxEntries: 0,
      sucursales: [],
      multisucursal: false,
      sucursalesMultisucursal: [],
      unlimited: false,
      tipoDuracion: "",
      cantidadDuracion: "",
      serviceType: "",
      hasTimeRange: false,
      startTime: "09:00",
      endTime: "18:00",
      hasSpecificDays: false,
      specificDays: [],
      requiredPeopleEnabled: false,
      requiredPeople: "",
    });
    setEditingService(null);
  };

  const handleAddServiceType = async () => {
    if (!newTypeName.trim()) {
      toast({
        title: "Error",
        description: "Ingrese un nombre para el tipo de servicio",
        variant: "destructive",
      });
      return;
    }

    try {
      const newType = await createServiceType(newTypeName.trim());
      setServiceTypes((prev) => [...prev, newType]);
      setFormData((prev) => ({ ...prev, serviceType: newType.id }));
      setNewTypeName("");
      setIsAddTypeDialogOpen(false);
      toast({
        title: "Éxito",
        description: "Tipo de servicio creado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el tipo de servicio",
        variant: "destructive",
      });
    }
  };

  const validateForm = (): string | null => {
    if (!formData.name || formData.price <= 0) {
      return "Complete todos los campos obligatorios";
    }
    if (!formData.serviceType) {
      return "Seleccione un tipo de servicio";
    }
    // ✅ CAMBIO: validar que se haya seleccionado duración (días o meses)
    if (!formData.tipoDuracion) {
      return "Seleccione el tipo de duración (Días o Meses)";
    }
    if (formData.sucursales.length === 0) {
      return "Seleccione al menos una sucursal donde estará disponible el servicio";
    }
    if (formData.multisucursal && formData.sucursalesMultisucursal.length < 2) {
      return "Para servicios multisucursal debe seleccionar al menos 2 sucursales";
    }
    if (
      !formData.cantidadDuracion ||
      formData.cantidadDuracion === "" ||
      Number(formData.cantidadDuracion) <= 0
    ) {
      return "La cantidad de duración debe ser mayor a 0";
    }
    if (formData.hasTimeRange && (!formData.startTime || !formData.endTime)) {
      return "Seleccione la hora de inicio y fin";
    }
    if (formData.hasTimeRange && formData.startTime && formData.endTime) {
      const startMinutes =
        parseInt(formData.startTime.split(":")[0]) * 60 +
        parseInt(formData.startTime.split(":")[1]);
      const endMinutes =
        parseInt(formData.endTime.split(":")[0]) * 60 +
        parseInt(formData.endTime.split(":")[1]);
      if (startMinutes >= endMinutes) {
        return "La hora de inicio debe ser menor a la hora de fin";
      }
    }
    if (formData.hasSpecificDays && formData.specificDays.length === 0) {
      return "Seleccione al menos un día disponible";
    }
    // ✅ CAMBIO: permitir 0 como valor válido para "personas requeridas"
    if (formData.requiredPeopleEnabled) {
      if (
        formData.requiredPeople === "" ||
        formData.requiredPeople === null ||
        formData.requiredPeople === undefined ||
        isNaN(Number(formData.requiredPeople)) ||
        Number(formData.requiredPeople) < 0
      ) {
        return "La cantidad de personas debe ser mayor o igual a 0";
      }
    }
    return null;
  };

  const handleUnlimitedToggle = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      unlimited: checked,
      maxEntries: checked ? 0 : 0,
    }));
  };

  // Helper para castear el formData local al tipo esperado por el API
  const toApiFormData = (data: ServiceFormDataLocal): ServiceFormData => ({
    ...data,
    tipoDuracion: (data.tipoDuracion || "dias") as "dias" | "meses",
  });

  const handleAddService = async () => {
    const buttonId = "add-service-button";
    if (isButtonLoading(buttonId)) return;
    const error = validateForm();
    if (error) {
      toast({
        title: "Datos incompletos",
        description: error,
        variant: "destructive",
      });
      return;
    }
    try {
      startButtonLoading(buttonId);
      const newService = await createService(toApiFormData(formData));
      setServices((prev) => [...prev, newService]);
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Servicio agregado",
        description: `${formData.name} se ha agregado exitosamente`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al agregar el servicio",
        variant: "destructive",
      });
    } finally {
      stopButtonLoading(buttonId);
    }
  };

  const handleEditService = async () => {
    if (!editingService) return;
    const buttonId = `edit-service-${editingService.id}`;
    if (isButtonLoading(buttonId)) return;
    const error = validateForm();
    if (error) {
      toast({
        title: "Datos incompletos",
        description: error,
        variant: "destructive",
      });
      return;
    }
    try {
      startButtonLoading(buttonId);
      const updatedService = await updateService(
        editingService.id,
        toApiFormData(formData)
      );
      setServices((prev) =>
        prev.map((service) =>
          service.id === editingService.id ? updatedService : service
        )
      );
      setEditingService(null);
      resetForm();
      toast({
        title: "Servicio actualizado",
        description: `${formData.name} se ha actualizado exitosamente`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el servicio",
        variant: "destructive",
      });
    } finally {
      stopButtonLoading(buttonId);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    const buttonId = `delete-service-${serviceId}`;
    if (isButtonLoading(buttonId)) return;
    try {
      startButtonLoading(buttonId);
      await deleteService(serviceId);
      setServices((prev) => prev.filter((service) => service.id !== serviceId));
      toast({
        title: "Servicio eliminado",
        description: "El servicio se ha eliminado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el servicio",
        variant: "destructive",
      });
    } finally {
      stopButtonLoading(buttonId);
    }
  };

  const handleToggleStatus = async (serviceId: string) => {
    const buttonId = `toggle-status-${serviceId}`;
    if (isButtonLoading(buttonId)) return;
    try {
      startButtonLoading(buttonId);
      const updatedService = await toggleServiceStatus(serviceId);
      setServices((prev) =>
        prev.map((service) =>
          service.id === serviceId ? updatedService : service
        )
      );
      setStatusChangeDialog({ open: false, service: null });
      toast({
        title: updatedService.isActive
          ? "Servicio activado"
          : "Servicio desactivado",
        description: `${updatedService.name} está ahora ${
          updatedService.isActive ? "activo" : "inactivo"
        }`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al cambiar el estado del servicio",
        variant: "destructive",
      });
    } finally {
      stopButtonLoading(buttonId);
    }
  };

  const startEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      price: service.price,
      maxEntries: service.maxEntries || 0,
      sucursales: service.sucursales || [],
      multisucursal: service.multisucursal || false,
      sucursalesMultisucursal: service.sucursalesMultisucursal || [],
      unlimited: service.maxEntries === null,
      tipoDuracion: service.tipoDuracion,
      cantidadDuracion: service.cantidadDuracion,
      serviceType: service.serviceType || "",
      hasTimeRange: service.hasTimeRange || false,
      startTime: service.startTime || "09:00",
      endTime: service.endTime || "18:00",
      hasSpecificDays: service.hasSpecificDays || false,
      specificDays: service.specificDays || [],
      requiredPeopleEnabled: service.requiredPeopleEnabled || false,
      requiredPeople: service.requiredPeople ?? "",
    });
  };

  const handleMultisucursalToggle = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      multisucursal: checked,
      sucursalesMultisucursal: checked ? prev.sucursalesMultisucursal : [],
    }));
  };

  const handleSucursalSelection = (
    sucursalId: string,
    type: "available" | "multisucursal"
  ) => {
    if (type === "available") {
      setFormData((prev) => {
        const newSucursales = prev.sucursales.includes(sucursalId)
          ? prev.sucursales.filter((id) => id !== sucursalId)
          : [...prev.sucursales, sucursalId];
        return { ...prev, sucursales: newSucursales };
      });
    } else {
      setFormData((prev) => {
        const newSucursales = prev.sucursalesMultisucursal.includes(sucursalId)
          ? prev.sucursalesMultisucursal.filter((id) => id !== sucursalId)
          : [...prev.sucursalesMultisucursal, sucursalId];
        return { ...prev, sucursalesMultisucursal: newSucursales };
      });
    }
  };

  const getServiceTypeName = (serviceTypeId?: string) => {
    const type = serviceTypes.find((t) => t.id === serviceTypeId);
    return type?.name || "Sin tipo";
  };

  const scrollbarStyles = `
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: hsl(var(--muted-foreground)) hsl(var(--card));
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
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
    @media (max-width: 1024px) {
      .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
      }
    }
  `;

  // Componente para el diálogo de detalles
  const ServiceDetailsDialog = ({
    service,
    open,
    onOpenChange,
  }: {
    service: Service | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => {
    if (!service) return null;

    const getDayName = (dayId: string) => {
      const day = WEEKDAYS.find((d) => d.id === dayId);
      return day?.name || dayId;
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              {service.name}
            </DialogTitle>
            <DialogDescription>Detalles completos del servicio</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {service.description && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-primary font-semibold">
                  <FileText className="h-4 w-4" />
                  Descripción
                </Label>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">
                    {service.description}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Tipo de Servicio
                </Label>
                <p className="font-medium">
                  {getServiceTypeName(service.serviceType)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Precio</Label>
                <p className="font-medium text-primary">{service.price} Bs.</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Ingresos Permitidos
                </Label>
                <p>
                  {service.maxEntries === null
                    ? "Ilimitado"
                    : `${service.maxEntries} ingresos`}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Duración</Label>
                <p>
                  {service.cantidadDuracion}{" "}
                  {service.tipoDuracion === "dias" ? "días" : "meses"}
                </p>
              </div>
            </div>

            <Separator />

            {(service.hasTimeRange || service.hasSpecificDays) && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Configuración de Horarios
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {service.hasTimeRange &&
                      service.startTime &&
                      service.endTime && (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {service.startTime} - {service.endTime}
                        </Badge>
                      )}
                    {service.hasSpecificDays &&
                      service.specificDays &&
                      service.specificDays.length > 0 && (
                        <Badge variant="secondary" className="gap-1">
                          <Calendar className="h-3 w-3" />
                          {service.specificDays.map((d) => getDayName(d)).join(", ")}
                        </Badge>
                      )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {service.requiredPeopleEnabled &&
              service.requiredPeople !== undefined &&
              service.requiredPeople !== null && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Personas Requeridas
                    </Label>
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {service.requiredPeople === 0
                        ? "No requiere personas específicas"
                        : `${service.requiredPeople} ${
                            service.requiredPeople === 1 ? "persona" : "personas"
                          }`}
                    </Badge>
                  </div>
                  <Separator />
                </>
              )}

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Sucursales Disponibles
              </Label>
              <div className="flex flex-wrap gap-2">
                {service.sucursales.map((sucursalId) => {
                  const sucursal = sucursales.find(
                    (s) => s.id.toString() === sucursalId
                  );
                  return (
                    <Badge key={sucursalId} variant="outline" className="gap-1">
                      <Building2 className="h-3 w-3" />
                      {sucursal?.name || sucursalId}
                    </Badge>
                  );
                })}
              </div>
              {service.multisucursal && (
                <div className="mt-2 text-sm text-primary">
                  <Building2 className="h-3 w-3 inline mr-1" />
                  Servicio Multisucursal
                  {service.sucursalesMultisucursal.length > 0 && (
                    <span className="text-muted-foreground ml-1">
                      (Acceso en:{" "}
                      {service.sucursalesMultisucursal
                        .map((id) => {
                          const sucursal = sucursales.find(
                            (s) => s.id.toString() === id
                          );
                          return sucursal?.name;
                        })
                        .filter(Boolean)
                        .join(", ")}
                      )
                    </span>
                  )}
                </div>
              )}
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">
                Estado actual
              </Label>
              <Badge
                variant={service.isActive ? "default" : "secondary"}
                className="gap-1"
              >
                {service.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 animate-bounce" />
          <p>Cargando servicios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{scrollbarStyles}</style>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">
            Gestión de Servicios
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Administra los servicios ofrecidos en el gimnasio MUTANT
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gym-gradient w-full sm:w-auto">
              <Plus size={16} className="mr-2" />
              Nuevo Servicio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Servicio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tipo de Servicio <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.serviceType}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, serviceType: value }))
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsAddTypeDialogOpen(true)}
                    className="hover:bg-primary hover:text-black transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceName">
                  Nombre del Servicio <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="serviceName"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ej: Pilates"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="serviceDescription"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Descripción (opcional)
                </Label>
                <Textarea
                  id="serviceDescription"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe los beneficios, requisitos o características del servicio..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Esta descripción será visible para los clientes al momento de
                  adquirir el servicio.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="servicePrice">
                    Precio (Bs.) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="servicePrice"
                    type="number"
                    value={formData.price || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="serviceMaxEntries">
                      Ingresos Permitidos <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="unlimited"
                        checked={formData.unlimited}
                        onCheckedChange={handleUnlimitedToggle}
                        className="data-[state=checked]:bg-primary"
                      />
                      <Label
                        htmlFor="unlimited"
                        className="flex items-center text-sm cursor-pointer"
                      >
                        <Infinity className="h-3 w-3 mr-1" />
                        Ilimitado
                      </Label>
                    </div>
                  </div>
                  <Input
                    id="serviceMaxEntries"
                    type="number"
                    value={formData.unlimited ? "" : formData.maxEntries || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        maxEntries: formData.unlimited
                          ? null
                          : parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder={formData.unlimited ? "Ilimitado" : "0"}
                    disabled={formData.unlimited}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Duración <span className="text-red-500">*</span>
                </Label>
                {/* ✅ CAMBIO: ningún botón seleccionado por defecto */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, tipoDuracion: "dias" }))
                    }
                    className={`flex-1 py-2 px-4 rounded-md border transition-all ${
                      formData.tipoDuracion === "dias"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-input hover:bg-accent"
                    }`}
                  >
                    Días
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, tipoDuracion: "meses" }))
                    }
                    className={`flex-1 py-2 px-4 rounded-md border transition-all ${
                      formData.tipoDuracion === "meses"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-input hover:bg-accent"
                    }`}
                  >
                    Meses
                  </button>
                </div>
                <div className="mt-2">
                  <Input
                    id="cantidadDuracion"
                    type="number"
                    value={formData.cantidadDuracion}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        cantidadDuracion:
                          e.target.value === ""
                            ? ""
                            : parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder={`Número de ${
                      formData.tipoDuracion === "dias"
                        ? "días"
                        : formData.tipoDuracion === "meses"
                        ? "meses"
                        : "días/meses"
                    }`}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <Label htmlFor="hasTimeRange">Rango de horarios</Label>
                  </div>
                  <Switch
                    id="hasTimeRange"
                    checked={formData.hasTimeRange}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, hasTimeRange: checked }))
                    }
                  />
                </div>

                {formData.hasTimeRange && (
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Hora de inicio</Label>
                      <TimePicker
                        value={formData.startTime}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, startTime: value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">Hora de fin</Label>
                      <TimePicker
                        value={formData.endTime}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, endTime: value }))
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <Label htmlFor="hasSpecificDays">Días específicos</Label>
                  </div>
                  <Switch
                    id="hasSpecificDays"
                    checked={formData.hasSpecificDays}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        hasSpecificDays: checked,
                      }))
                    }
                  />
                </div>

                {formData.hasSpecificDays && (
                  <div className="pl-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 border rounded-md">
                      {WEEKDAYS.map((day) => (
                        <div key={day.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`day-${day.id}`}
                            checked={formData.specificDays.includes(day.id)}
                            onCheckedChange={() => {
                              setFormData((prev) => ({
                                ...prev,
                                specificDays: prev.specificDays.includes(day.id)
                                  ? prev.specificDays.filter((d) => d !== day.id)
                                  : [...prev.specificDays, day.id],
                              }));
                            }}
                          />
                          <Label
                            htmlFor={`day-${day.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {day.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <Label htmlFor="requiredPeopleEnabled">
                      Personas requeridas
                    </Label>
                  </div>
                  <Switch
                    id="requiredPeopleEnabled"
                    checked={formData.requiredPeopleEnabled}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        requiredPeopleEnabled: checked,
                        requiredPeople: checked ? "1" : "",
                      }))
                    }
                  />
                </div>

                {/* ✅ CAMBIO: aviso cuando el switch está apagado */}
                {!formData.requiredPeopleEnabled && (
                  <div className="pl-6">
                    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/40 border border-muted">
                      <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Si no especificas personas requeridas, se tomará por
                        defecto como{" "}
                        <span className="font-semibold text-foreground">
                          1 persona
                        </span>
                        .
                      </p>
                    </div>
                  </div>
                )}

                {formData.requiredPeopleEnabled && (
                  <div className="pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="requiredPeople">
                        Cantidad de personas
                      </Label>
                      <Input
                        id="requiredPeople"
                        type="number"
                        value={formData.requiredPeople}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            requiredPeople:
                              e.target.value === ""
                                ? ""
                                : parseInt(e.target.value) || 0,
                          }))
                        }
                        min="0"
                        placeholder="Número de personas"
                      />
                      <p className="text-xs text-muted-foreground">
                        0 = no requiere personas específicas (ideal para
                        inscripciones individuales)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Sucursales donde estará disponible el servicio{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 border rounded-md">
                  {sucursales.map((sucursal) => (
                    <div key={sucursal.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`add-available-${sucursal.id}`}
                        checked={formData.sucursales.includes(
                          sucursal.id.toString()
                        )}
                        onCheckedChange={() =>
                          handleSucursalSelection(
                            sucursal.id.toString(),
                            "available"
                          )
                        }
                      />
                      <Label
                        htmlFor={`add-available-${sucursal.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {sucursal.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2 py-2">
                <Switch
                  id="multisucursal"
                  checked={formData.multisucursal}
                  onCheckedChange={handleMultisucursalToggle}
                />
                <Label
                  htmlFor="multisucursal"
                  className="flex items-center cursor-pointer"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Servicio Multisucursal
                </Label>
              </div>

              {formData.multisucursal && (
                <div className="space-y-2">
                  <Label className="flex items-center text-primary">
                    <Building2 className="h-4 w-4 mr-2" />
                    Sucursales para acceso multisucursal (Mínimo 2){" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 border border-primary rounded-md bg-primary/5">
                    {sucursales.map((sucursal) => (
                      <div
                        key={sucursal.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`add-multisucursal-${sucursal.id}`}
                          checked={formData.sucursalesMultisucursal.includes(
                            sucursal.id.toString()
                          )}
                          onCheckedChange={() =>
                            handleSucursalSelection(
                              sucursal.id.toString(),
                              "multisucursal"
                            )
                          }
                          disabled={
                            !formData.sucursales.includes(
                              sucursal.id.toString()
                            )
                          }
                        />
                        <Label
                          htmlFor={`add-multisucursal-${sucursal.id}`}
                          className={`text-sm cursor-pointer ${
                            !formData.sucursales.includes(
                              sucursal.id.toString()
                            )
                              ? "text-muted-foreground"
                              : ""
                          }`}
                        >
                          {sucursal.name}
                          {!formData.sucursales.includes(
                            sucursal.id.toString()
                          ) && " (No disponible)"}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formData.sucursalesMultisucursal.length < 2 && (
                    <p className="text-sm text-red-500">
                      Debe seleccionar al menos 2 sucursales para servicio
                      multisucursal
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button
                  onClick={handleAddService}
                  className="flex-1"
                  disabled={
                    !!validateForm() || isButtonLoading("add-service-button")
                  }
                >
                  {isButtonLoading("add-service-button")
                    ? "Agregando..."
                    : "Agregar Servicio"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    resetForm();
                  }}
                  disabled={isButtonLoading("add-service-button")}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isAddTypeDialogOpen} onOpenChange={setIsAddTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Tipo de Servicio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="typeName">Nombre del tipo</Label>
              <Input
                id="typeName"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Ej: CrossFit, Yoga, etc."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddServiceType} className="flex-1">
                Agregar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddTypeDialogOpen(false);
                  setNewTypeName("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ServiceDetailsDialog
        service={viewingService}
        open={!!viewingService}
        onOpenChange={(open) => !open && setViewingService(null)}
      />

      <Card className="gym-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Servicios ({services.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Servicio
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden sm:table-cell">
                    Tipo
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden sm:table-cell">
                    Precio
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden md:table-cell">
                    Ingresos
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden lg:table-cell">
                    Duración
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden lg:table-cell">
                    Sucursales
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Estado
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {services.map((service) => (
                  <tr
                    key={service.id}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <td className="p-4 align-middle">
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm text-muted-foreground sm:hidden">
                        {service.price} Bs. •{" "}
                        {service.maxEntries === null
                          ? "Ilimitado"
                          : `${service.maxEntries} ingresos`}
                      </div>
                      <div className="text-sm text-muted-foreground sm:hidden">
                        Tipo: {getServiceTypeName(service.serviceType)}
                      </div>
                      {service.requiredPeopleEnabled &&
                        service.requiredPeople !== undefined &&
                        service.requiredPeople !== null && (
                          <div className="text-sm text-muted-foreground sm:hidden">
                            {service.requiredPeople === 0
                              ? "No requiere personas"
                              : `${service.requiredPeople} personas`}
                          </div>
                        )}
                      <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
                        {service.sucursales.slice(0, 2).map((sucursalId) => {
                          const sucursal = sucursales.find(
                            (s) => s.id.toString() === sucursalId
                          );
                          return (
                            <Badge
                              key={sucursalId}
                              variant="outline"
                              className="text-xs"
                            >
                              {sucursal?.name || sucursalId}
                            </Badge>
                          );
                        })}
                        {service.sucursales.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{service.sucursales.length - 2}
                          </Badge>
                        )}
                      </div>
                      {service.multisucursal && (
                        <div className="mt-1 sm:hidden">
                          <Badge variant="secondary" className="text-xs">
                            <Building2 className="h-3 w-3 mr-1" />
                            Multisucursal
                          </Badge>
                        </div>
                      )}
                      {service.description && (
                        <div className="mt-1 sm:hidden text-xs text-muted-foreground line-clamp-1">
                          {service.description}
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-middle hidden sm:table-cell">
                      <Badge variant="outline">
                        {getServiceTypeName(service.serviceType)}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle hidden sm:table-cell">
                      <div className="font-bold text-primary">
                        {service.price} Bs.
                      </div>
                    </td>
                    <td className="p-4 align-middle hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className={
                          service.maxEntries === null
                            ? "bg-green-100 text-green-800"
                            : ""
                        }
                      >
                        {service.maxEntries === null ? (
                          <span className="flex items-center">
                            <Infinity className="h-3 w-3 mr-1" />
                            Ilimitado
                          </span>
                        ) : (
                          `${service.maxEntries} ingresos`
                        )}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle hidden lg:table-cell">
                      <Badge variant="secondary">
                        <Calendar className="h-3 w-3 mr-1" />
                        {service.cantidadDuracion} {service.tipoDuracion}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {service.sucursales.slice(0, 2).map((sucursalId) => {
                          const sucursal = sucursales.find(
                            (s) => s.id.toString() === sucursalId
                          );
                          return (
                            <Badge
                              key={sucursalId}
                              variant="outline"
                              className="text-xs"
                            >
                              {sucursal?.name || sucursalId}
                            </Badge>
                          );
                        })}
                        {service.sucursales.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{service.sucursales.length - 2}
                          </Badge>
                        )}
                      </div>
                      {service.multisucursal && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <Building2 className="h-3 w-3 inline mr-1" />
                          Multisucursal
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <AlertDialog
                          open={
                            statusChangeDialog.open &&
                            statusChangeDialog.service?.id === service.id
                          }
                          onOpenChange={(open) =>
                            setStatusChangeDialog(
                              open
                                ? { open, service }
                                : { open: false, service: null }
                            )
                          }
                        >
                          <AlertDialogTrigger asChild>
                            <div>
                              <Switch
                                checked={service.isActive}
                                onCheckedChange={() =>
                                  setStatusChangeDialog({ open: true, service })
                                }
                                disabled={isButtonLoading(
                                  `toggle-status-${service.id}`
                                )}
                              />
                            </div>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {service.isActive
                                  ? "Desactivar servicio"
                                  : "Activar servicio"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Estás seguro de que deseas{" "}
                                {service.isActive ? "desactivar" : "activar"} el
                                servicio "{service.name}"?
                                {service.isActive &&
                                  " Los usuarios no podrán adquirir este servicio mientras esté desactivado."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                disabled={isButtonLoading(
                                  `toggle-status-${service.id}`
                                )}
                              >
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleToggleStatus(service.id)}
                                disabled={isButtonLoading(
                                  `toggle-status-${service.id}`
                                )}
                              >
                                {isButtonLoading(`toggle-status-${service.id}`)
                                  ? "Procesando..."
                                  : service.isActive
                                  ? "Desactivar"
                                  : "Activar"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <span className="text-sm sm:hidden">
                          {service.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setViewingService(service)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Dialog
                          open={editingService?.id === service.id}
                          onOpenChange={(open) => {
                            if (!open) {
                              setEditingService(null);
                              resetForm();
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(service)}
                              className="h-8 w-8 p-0"
                              disabled={isButtonLoading(
                                `edit-service-${service.id}`
                              )}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <DialogHeader>
                              <DialogTitle>Editar Servicio</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                  <Tag className="h-4 w-4" />
                                  Tipo de Servicio{" "}
                                  <span className="text-red-500">*</span>
                                </Label>
                                <div className="flex gap-2">
                                  <Select
                                    value={formData.serviceType}
                                    onValueChange={(value) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        serviceType: value,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="flex-1">
                                      <SelectValue placeholder="Seleccionar tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {serviceTypes.map((type) => (
                                        <SelectItem key={type.id} value={type.id}>
                                          {type.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setIsAddTypeDialogOpen(true)}
                                    className="hover:bg-primary hover:text-black transition-colors"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="editServiceName">
                                  Nombre del Servicio{" "}
                                  <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="editServiceName"
                                  value={formData.name}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      name: e.target.value,
                                    }))
                                  }
                                  placeholder="Ej: Pilates"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label
                                  htmlFor="editServiceDescription"
                                  className="flex items-center gap-2"
                                >
                                  <FileText className="h-4 w-4" />
                                  Descripción (opcional)
                                </Label>
                                <Textarea
                                  id="editServiceDescription"
                                  value={formData.description}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      description: e.target.value,
                                    }))
                                  }
                                  placeholder="Describe los beneficios, requisitos o características del servicio..."
                                  rows={3}
                                  className="resize-none"
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                                <div className="space-y-2">
                                  <Label htmlFor="editServicePrice">
                                    Precio (Bs.){" "}
                                    <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    id="editServicePrice"
                                    type="number"
                                    value={formData.price || ""}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        price: parseInt(e.target.value) || 0,
                                      }))
                                    }
                                    placeholder="0"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor="editServiceMaxEntries">
                                      Ingresos Permitidos{" "}
                                      <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="flex items-center space-x-2">
                                      <Switch
                                        id="editUnlimited"
                                        checked={formData.unlimited}
                                        onCheckedChange={handleUnlimitedToggle}
                                        className="data-[state=checked]:bg-primary"
                                      />
                                      <Label
                                        htmlFor="editUnlimited"
                                        className="flex items-center text-sm cursor-pointer"
                                      >
                                        <Infinity className="h-3 w-3 mr-1" />
                                        Ilimitado
                                      </Label>
                                    </div>
                                  </div>
                                  <Input
                                    id="editServiceMaxEntries"
                                    type="number"
                                    value={
                                      formData.unlimited
                                        ? ""
                                        : formData.maxEntries || ""
                                    }
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        maxEntries: formData.unlimited
                                          ? null
                                          : parseInt(e.target.value) || 0,
                                      }))
                                    }
                                    placeholder={
                                      formData.unlimited ? "Ilimitado" : "0"
                                    }
                                    disabled={formData.unlimited}
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Duración{" "}
                                  <span className="text-red-500">*</span>
                                </Label>
                                <div className="flex gap-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        tipoDuracion: "dias",
                                      }))
                                    }
                                    className={`flex-1 py-2 px-4 rounded-md border transition-all ${
                                      formData.tipoDuracion === "dias"
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background border-input hover:bg-accent"
                                    }`}
                                  >
                                    Días
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        tipoDuracion: "meses",
                                      }))
                                    }
                                    className={`flex-1 py-2 px-4 rounded-md border transition-all ${
                                      formData.tipoDuracion === "meses"
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background border-input hover:bg-accent"
                                    }`}
                                  >
                                    Meses
                                  </button>
                                </div>
                                <div className="mt-2">
                                  <Input
                                    id="editCantidadDuracion"
                                    type="number"
                                    value={formData.cantidadDuracion}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        cantidadDuracion:
                                          e.target.value === ""
                                            ? ""
                                            : parseInt(e.target.value) || 0,
                                      }))
                                    }
                                    placeholder={`Número de ${
                                      formData.tipoDuracion === "dias"
                                        ? "días"
                                        : formData.tipoDuracion === "meses"
                                        ? "meses"
                                        : "días/meses"
                                    }`}
                                  />
                                </div>
                              </div>

                              <Separator />

                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4" />
                                    <Label htmlFor="editHasTimeRange">
                                      Rango de horarios
                                    </Label>
                                  </div>
                                  <Switch
                                    id="editHasTimeRange"
                                    checked={formData.hasTimeRange}
                                    onCheckedChange={(checked) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        hasTimeRange: checked,
                                      }))
                                    }
                                  />
                                </div>

                                {formData.hasTimeRange && (
                                  <div className="grid grid-cols-2 gap-4 pl-6">
                                    <div className="space-y-2">
                                      <Label htmlFor="editStartTime">
                                        Hora de inicio
                                      </Label>
                                      <TimePicker
                                        value={formData.startTime}
                                        onChange={(value) =>
                                          setFormData((prev) => ({
                                            ...prev,
                                            startTime: value,
                                          }))
                                        }
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="editEndTime">
                                        Hora de fin
                                      </Label>
                                      <TimePicker
                                        value={formData.endTime}
                                        onChange={(value) =>
                                          setFormData((prev) => ({
                                            ...prev,
                                            endTime: value,
                                          }))
                                        }
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4" />
                                    <Label htmlFor="editHasSpecificDays">
                                      Días específicos
                                    </Label>
                                  </div>
                                  <Switch
                                    id="editHasSpecificDays"
                                    checked={formData.hasSpecificDays}
                                    onCheckedChange={(checked) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        hasSpecificDays: checked,
                                      }))
                                    }
                                  />
                                </div>

                                {formData.hasSpecificDays && (
                                  <div className="pl-6">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 border rounded-md">
                                      {WEEKDAYS.map((day) => (
                                        <div
                                          key={day.id}
                                          className="flex items-center space-x-2"
                                        >
                                          <Checkbox
                                            id={`edit-day-${day.id}`}
                                            checked={formData.specificDays.includes(
                                              day.id
                                            )}
                                            onCheckedChange={() => {
                                              setFormData((prev) => ({
                                                ...prev,
                                                specificDays:
                                                  prev.specificDays.includes(
                                                    day.id
                                                  )
                                                    ? prev.specificDays.filter(
                                                        (d) => d !== day.id
                                                      )
                                                    : [
                                                        ...prev.specificDays,
                                                        day.id,
                                                      ],
                                              }));
                                            }}
                                          />
                                          <Label
                                            htmlFor={`edit-day-${day.id}`}
                                            className="text-sm cursor-pointer"
                                          >
                                            {day.name}
                                          </Label>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Users className="h-4 w-4" />
                                    <Label htmlFor="editRequiredPeopleEnabled">
                                      Personas requeridas
                                    </Label>
                                  </div>
                                  <Switch
                                    id="editRequiredPeopleEnabled"
                                    checked={formData.requiredPeopleEnabled}
                                    onCheckedChange={(checked) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        requiredPeopleEnabled: checked,
                                        requiredPeople: checked ? "1" : "",
                                      }))
                                    }
                                  />
                                </div>

                                {/* ✅ CAMBIO: aviso también en edición */}
                                {!formData.requiredPeopleEnabled && (
                                  <div className="pl-6">
                                    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/40 border border-muted">
                                      <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                      <p className="text-xs text-muted-foreground">
                                        Si no especificas personas requeridas,
                                        se tomará por defecto como{" "}
                                        <span className="font-semibold text-foreground">
                                          1 persona
                                        </span>
                                        .
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {formData.requiredPeopleEnabled && (
                                  <div className="pl-6">
                                    <div className="space-y-2">
                                      <Label htmlFor="editRequiredPeople">
                                        Cantidad de personas
                                      </Label>
                                      <Input
                                        id="editRequiredPeople"
                                        type="number"
                                        value={formData.requiredPeople}
                                        onChange={(e) =>
                                          setFormData((prev) => ({
                                            ...prev,
                                            requiredPeople:
                                              e.target.value === ""
                                                ? ""
                                                : parseInt(e.target.value) || 0,
                                          }))
                                        }
                                        min="0"
                                        placeholder="Número de personas"
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        0 = no requiere personas específicas
                                        (ideal para inscripciones individuales)
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <Separator />

                              <div className="space-y-2">
                                <Label className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-2" />
                                  Sucursales donde estará disponible el
                                  servicio <span className="text-red-500">*</span>
                                </Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 border rounded-md">
                                  {sucursales.map((sucursal) => (
                                    <div
                                      key={sucursal.id}
                                      className="flex items-center space-x-2"
                                    >
                                      <Checkbox
                                        id={`edit-available-${sucursal.id}`}
                                        checked={formData.sucursales.includes(
                                          sucursal.id.toString()
                                        )}
                                        onCheckedChange={() =>
                                          handleSucursalSelection(
                                            sucursal.id.toString(),
                                            "available"
                                          )
                                        }
                                      />
                                      <Label
                                        htmlFor={`edit-available-${sucursal.id}`}
                                        className="text-sm cursor-pointer"
                                      >
                                        {sucursal.name}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 py-2">
                                <Switch
                                  id="editMultisucursal"
                                  checked={formData.multisucursal}
                                  onCheckedChange={handleMultisucursalToggle}
                                />
                                <Label
                                  htmlFor="editMultisucursal"
                                  className="flex items-center cursor-pointer"
                                >
                                  <Building2 className="h-4 w-4 mr-2" />
                                  Servicio Multisucursal
                                </Label>
                              </div>

                              {formData.multisucursal && (
                                <div className="space-y-2">
                                  <Label className="flex items-center text-primary">
                                    <Building2 className="h-4 w-4 mr-2" />
                                    Sucursales para acceso multisucursal (Mínimo
                                    2) <span className="text-red-500">*</span>
                                  </Label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 border border-primary rounded-md bg-primary/5">
                                    {sucursales.map((sucursal) => (
                                      <div
                                        key={sucursal.id}
                                        className="flex items-center space-x-2"
                                      >
                                        <Checkbox
                                          id={`edit-multisucursal-${sucursal.id}`}
                                          checked={formData.sucursalesMultisucursal.includes(
                                            sucursal.id.toString()
                                          )}
                                          onCheckedChange={() =>
                                            handleSucursalSelection(
                                              sucursal.id.toString(),
                                              "multisucursal"
                                            )
                                          }
                                          disabled={
                                            !formData.sucursales.includes(
                                              sucursal.id.toString()
                                            )
                                          }
                                        />
                                        <Label
                                          htmlFor={`edit-multisucursal-${sucursal.id}`}
                                          className={`text-sm cursor-pointer ${
                                            !formData.sucursales.includes(
                                              sucursal.id.toString()
                                            )
                                              ? "text-muted-foreground"
                                              : ""
                                          }`}
                                        >
                                          {sucursal.name}
                                          {!formData.sucursales.includes(
                                            sucursal.id.toString()
                                          ) && " (No disponible)"}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                  {formData.sucursalesMultisucursal.length <
                                    2 && (
                                    <p className="text-sm text-red-500">
                                      Debe seleccionar al menos 2 sucursales
                                      para servicio multisucursal
                                    </p>
                                  )}
                                </div>
                              )}

                              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                                <Button
                                  onClick={handleEditService}
                                  className="flex-1"
                                  disabled={
                                    !!validateForm() ||
                                    isButtonLoading(
                                      `edit-service-${service.id}`
                                    )
                                  }
                                >
                                  {isButtonLoading(
                                    `edit-service-${service.id}`
                                  )
                                    ? "Guardando..."
                                    : "Guardar Cambios"}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setEditingService(null);
                                    resetForm();
                                  }}
                                  disabled={isButtonLoading(
                                    `edit-service-${service.id}`
                                  )}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 w-8 p-0"
                              disabled={isButtonLoading(
                                `delete-service-${service.id}`
                              )}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Eliminar servicio
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Estás seguro de que deseas eliminar{" "}
                                {service.name}? Esta acción no se puede
                                deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                disabled={isButtonLoading(
                                  `delete-service-${service.id}`
                                )}
                              >
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteService(service.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={isButtonLoading(
                                  `delete-service-${service.id}`
                                )}
                              >
                                {isButtonLoading(`delete-service-${service.id}`)
                                  ? "Eliminando..."
                                  : "Eliminar"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {services.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Dumbbell size={48} className="mx-auto mb-4 opacity-50" />
              <p>No hay servicios registrados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}