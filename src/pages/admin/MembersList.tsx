// src/pages/admin/MembersList.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, Edit, Trash2, Fingerprint, CalendarIcon, ChevronDown, Phone, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO as parseISODate } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Importar las API functions
import {
  getMembers,
  deleteMember,
  editMember,
  getAvailableServices,
  getAvailableBranches,
  updateServiceDates,
  Member,
  Service,
  EditMemberRequest,
} from "@/api/MemberListapi";
import { getStoredUserData } from "@/api/loginapi";
import { useToast } from "@/hooks/use-toast";
import { useFingerprintEnroll } from "@/hooks/userFingerprintEnroll";

// Componente de calendario simple (sin selector de año) para fechas de servicio
function SimpleCalendar({ 
  selected, 
  onSelect, 
  disabled,
  className 
}: { 
  selected?: Date; 
  onSelect: (date: Date) => void; 
  disabled?: (date: Date) => boolean;
  className?: string;
}) {
  const [currentDate, setCurrentDate] = useState(selected || new Date());
  
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const weekDays = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
  
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };
  
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  const handleDateClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    if (!disabled || !disabled(newDate)) {
      onSelect(newDate);
    }
  };
  
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  const isSelectedDate = (day: number) => {
    if (!selected) return false;
    return selected.getDate() === day && 
           selected.getMonth() === currentDate.getMonth() && 
           selected.getFullYear() === currentDate.getFullYear();
  };
  
  const isDisabledDate = (day: number) => {
    if (!disabled) return false;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return disabled(date);
  };
  
  return (
    <div className={cn("p-3 bg-card", className)}>
      <div className="flex items-center justify-between mb-4">
        <Button type="button" variant="outline" size="sm" onClick={handlePrevMonth} className="border-border text-foreground">
          {"<"}
        </Button>
        <span className="font-medium text-foreground">
          {months[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={handleNextMonth} className="border-border text-foreground">
          {">"}
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {weekDays.map(day => (
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
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0 font-normal",
                  isSelectedDate(day) && "bg-primary text-black hover:bg-primary/90",
                  isDisabledDate(day) && "opacity-50 cursor-not-allowed text-muted-foreground",
                  !isSelectedDate(day) && !isDisabledDate(day) && "text-foreground hover:bg-muted"
                )}
                onClick={() => !isDisabledDate(day) && handleDateClick(day)}
                disabled={isDisabledDate(day)}
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

// Función para formatear fecha respetando el valor exacto de la BD (YYYY-MM-DD)
const formatDateExact = (dateString: string): string => {
  if (!dateString) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  }
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
  } catch {
    return dateString;
  }
};

// Función para calcular la edad a partir de la fecha de nacimiento
const calculateAge = (birthDate: string | null | undefined): number | null => {
  if (!birthDate) return null;
  
  try {
    let birthDateObj: Date;
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      const [year, month, day] = birthDate.split("-");
      birthDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      birthDateObj = new Date(birthDate);
    }
    
    if (isNaN(birthDateObj.getTime())) return null;
    
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    
    return age;
  } catch {
    return null;
  }
};

const MemberServices: React.FC<{ 
  services: Service[]; 
  onEditDates?: (service: Service) => void;
  canEdit?: boolean;
}> = ({ services, onEditDates, canEdit = false }) => {
  const isExpired = (expirationDate: string) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
    return expirationDate < todayStr;
  };

  const hasLowEntries = (ingresosDisponibles: number | null | undefined) => {
    if (ingresosDisponibles === null || ingresosDisponibles === undefined) {
      return false;
    }
    return ingresosDisponibles < 5 && ingresosDisponibles > 0;
  };

  const hasNoEntries = (ingresosDisponibles: number | null | undefined) => {
    if (ingresosDisponibles === null || ingresosDisponibles === undefined) {
      return false;
    }
    return ingresosDisponibles === 0;
  };

  if (services.length === 0) {
    return (
      <div className="text-muted-foreground italic text-sm">
        Sin servicios registrados
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {services.map((service, index) => {
        const expired = isExpired(service.expirationDate);
        const lowEntries = hasLowEntries(service.ingresos_disponibles);
        const noEntries = hasNoEntries(service.ingresos_disponibles);
        const isInactive = service.status === "inactive";
        // ✅ AHORA: permite editar siempre que canEdit sea true (sin bloquear por inactivo)
        const canEditThisService = canEdit && !!onEditDates;

        return (
          <div key={index} className="p-2 bg-muted/30 rounded">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <span className="font-medium">{service.name}</span>
                <div className="text-xs space-y-0.5 mt-1">
                  <div>
                    <span className="text-muted-foreground">Inicio: </span>
                    <span className={noEntries || expired || isInactive ? "text-red-600 font-medium" : "text-muted-foreground"}>
                      {service.startDate ? formatDateExact(service.startDate) : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vence: </span>
                    <span className={noEntries || expired || isInactive ? "text-red-600 font-medium" : "text-muted-foreground"}>
                      {formatDateExact(service.expirationDate)}
                    </span>
                  </div>
                </div>
              </div>
              {/* ✅ AHORA se muestra siempre que canEdit sea true */}
              {canEditThisService && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditDates!(service)}
                  className="h-6 w-6 p-0"
                  title="Editar fechas"
                >
                  <Calendar className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="text-xs mt-1">
              {service.ingresos_disponibles === null ||
              service.ingresos_disponibles === undefined ? (
                <span className={isInactive ? "text-red-600" : "text-green-600"}>
                  Ilimitados
                </span>
              ) : (
                <span
                  className={
                    noEntries || lowEntries || expired || isInactive
                      ? "text-red-600"
                      : "text-green-600"
                  }
                >
                  {service.ingresos_disponibles}{" "}
                  {service.ingresos_disponibles === 1 ? "ingreso" : "ingresos"}{" "}
                  disponible{service.ingresos_disponibles !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Componente de tarjeta para vista móvil
const MemberCard: React.FC<{ 
  member: Member; 
  getSucursalName: (id: string) => string;
  onEdit: () => void;
  onEditServiceDates?: (service: Service) => void;
  onDelete: () => void;
  loading: boolean;
  canEditDates: boolean;
}> = ({ member, getSucursalName, onEdit, onEditServiceDates, onDelete, loading, canEditDates }) => {
  const sucursalesToShow =
    member.sucursales && member.sucursales.length > 0
      ? member.sucursales
      : member.sucursal
        ? [member.sucursal]
        : [];
  
  return (
    <Card className="mb-4 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-base">{member.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge
                variant={member.status === "active" ? "default" : "secondary"}
                className={
                  member.status === "active"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-500 hover:bg-red-600"
                }
              >
                {member.status === "active" ? "Activo" : "Inactivo"}
              </Badge>
              {sucursalesToShow.length > 0 && (
                <Badge variant="outline" className="whitespace-nowrap">
                  {sucursalesToShow.map((s) => getSucursalName(s)).join(" / ")}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">CI:</span>
            <span className="font-medium">{member.ci}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Teléfono:</span>
            <span className="font-medium">{member.phone}</span>
          </div>
        </div>

        <div className="mt-3">
          <p className="text-sm text-muted-foreground mb-2">Servicios activos:</p>
          <MemberServices 
            services={member.services} 
            onEditDates={canEditDates ? onEditServiceDates : undefined}
            canEdit={canEditDates}
          />
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            disabled={loading}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={loading}
            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente principal
export function MembersList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [sucursalFilter, setSucursalFilter] = useState("all");
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [availableBranches, setAvailableBranches] = useState<
    { id: string; name: string }[]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(10);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [pageInput, setPageInput] = useState("1");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [fingerprintDialogOpen, setFingerprintDialogOpen] = useState(false);
  const [editServiceDatesDialogOpen, setEditServiceDatesDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [serviceToEditDates, setServiceToEditDates] = useState<Service | null>(null);
  const [editServiceDatesData, setEditServiceDatesData] = useState({
    startDate: "",
    expirationDate: "",
  });
  // ✅ Sin birthDate
  const [editFormData, setEditFormData] = useState({
    nombres: "",
    apellidos: "",
    ci: "",
    phone: "",
  });
  const [registerFingerprint, setRegisterFingerprint] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [startDateCalendarOpen, setStartDateCalendarOpen] = useState(false);
  const [endDateCalendarOpen, setEndDateCalendarOpen] = useState(false);

  const { toast } = useToast();
  const userData = getStoredUserData();
  const dataInitialized = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isEditingRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const skipPageEffectRef = useRef(true);

  // ✅ Permiso unificado: admin Y recepcionista pueden editar fechas
  const canEditDates =
    userData?.rol === "admin" || userData?.rol === "recepcionista";

  const { startEnroll } = useFingerprintEnroll({
    onSuccess: (data) => {
      setIsScanning(false);
      setFingerprintDialogOpen(false);
      setRegisterFingerprint(false);
      toast({
        title: "✅ Huella registrada",
        description: "La huella dactilar se ha registrado correctamente",
      });
      loadMembers();
    },
    onError: (error) => {
      setIsScanning(false);
      toast({
        title: "❌ Error",
        description: "Error al registrar la huella",
        variant: "destructive",
      });
    },
  });

  // ✅ Pausar/reanudar el lector global mientras el modal de enrolamiento está abierto
  useEffect(() => {
    const paused = !!fingerprintDialogOpen;
    (window as any).__FINGERPRINT_PAUSED__ = paused;
    window.dispatchEvent(
      new CustomEvent("fingerprint-pause-changed", { detail: { paused } })
    );

    return () => {
      (window as any).__FINGERPRINT_PAUSED__ = false;
      window.dispatchEvent(
        new CustomEvent("fingerprint-pause-changed", {
          detail: { paused: false },
        })
      );
    };
  }, [fingerprintDialogOpen]);

  // ✅ Cuando el modal de enrolamiento se abre, arrancar el enroll
  useEffect(() => {
    if (!fingerprintDialogOpen || !memberToEdit) return;

    console.log("⏳ [MembersList] Esperando a que el SSE global se cierre...");

    const timer = setTimeout(() => {
      console.log("🎯 [MembersList] startEnroll con userId:", memberToEdit.id);
      setIsScanning(true);
      startEnroll(memberToEdit.id);
    }, 1500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprintDialogOpen, memberToEdit]);

  // Función para obtener el nombre de la sucursal por ID
  const getSucursalName = (sucursalId: string): string => {
    if (!sucursalId) return "Sin sucursal";

    const branch = availableBranches.find((b) => b.id === sucursalId);
    return branch ? branch.name : sucursalId;
  };

  // Cargar miembros - función memoizada
  const loadMembers = useCallback(
    async (page = 1, search = "") => {
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        setLoading(true);

        const data = await getMembers(
          page,
          itemsPerPage,
          search,
          serviceFilter,
          "all",
          sucursalFilter,
        );

        // ✅ Detectar rol y sucursal del usuario
        const isAdmin = userData?.rol === "admin";
        const mySucursal = userData?.idsucursal?.toString();

        // ✅ Agrupar por persona (id) combinando sucursales
        const groupedMap = new Map<string, Member & { sucursales: string[] }>();

        data.members.forEach((member) => {
          // ✅ Si NO es admin y esta persona no pertenece a su sucursal, ignorar
          if (!isAdmin && mySucursal && member.sucursal !== mySucursal) {
            return;
          }

          const existing = groupedMap.get(member.id);

          if (existing) {
            if (!existing.sucursales.includes(member.sucursal)) {
              existing.sucursales.push(member.sucursal);
            }

            member.services.forEach((newSvc) => {
              const dup = existing.services.find(
                (s) =>
                  s.name === newSvc.name &&
                  s.startDate === newSvc.startDate &&
                  s.expirationDate === newSvc.expirationDate &&
                  s.ingresos_disponibles === newSvc.ingresos_disponibles,
              );
              if (!dup) {
                existing.services.push(newSvc);
              }
            });
          } else {
            groupedMap.set(member.id, {
              ...member,
              sucursales: [member.sucursal],
            });
          }
        });

        const uniqueMembers = Array.from(groupedMap.values());

        console.log(
          "🔍 Miembros agrupados (página " + page + "):",
          uniqueMembers.map((m) => ({
            id: m.id,
            name: m.name,
            sucursales: m.sucursales,
          })),
        );

        setMembers(uniqueMembers);
        setFilteredMembers(uniqueMembers);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      } catch (error: any) {
        if (error.name === "AbortError") {
          console.log("Petición cancelada");
          return;
        }

        console.error("Error cargando miembros:", error);
        toast({
          title: "❌ Error",
          description: error.message || "Error al cargar miembros",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [itemsPerPage, serviceFilter, sucursalFilter],
  );

  // ✅ useEffect para manejar búsquedas (con debounce)
  useEffect(() => {
    if (!dataInitialized.current) return;
    if (isEditingRef.current) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const shouldSearch = searchTerm.length === 0 || searchTerm.length >= 3;
    if (!shouldSearch) return;

    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      loadMembers(1, searchTerm);
    }, 600);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, serviceFilter, sucursalFilter]);

  // ✅ useEffect para cargar cuando cambia la página
  useEffect(() => {
    if (skipPageEffectRef.current) {
      skipPageEffectRef.current = false;
      return;
    }
    if (!dataInitialized.current) return;
    if (isEditingRef.current) return;

    loadMembers(currentPage, searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // ✅ Mantener el input de página sincronizado con la página actual
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  // Cargar datos iniciales solo una vez
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);

        const [services, branches] = await Promise.all([
          getAvailableServices(),
          getAvailableBranches(),
        ]);

        setAvailableServices(["all", ...services]);
        setAvailableBranches(branches);

        if (userData) {
          if (userData.rol === "admin") {
            setSucursalFilter("all");
          } else if (userData.idsucursal) {
            setSucursalFilter(userData.idsucursal.toString());
          } else {
            setSucursalFilter("all");
          }
        }

        dataInitialized.current = true;
        await loadMembers(1, "");
      } catch (error: any) {
        console.error("Error inicializando datos:", error);
        toast({
          title: "❌ Error",
          description: error.message || "Error al cargar datos iniciales",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    initializeData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Abrir diálogo para editar fechas de un servicio
  const handleEditServiceDates = (member: Member, service: Service) => {
    // ✅ Ya NO se bloquea por servicio inactivo: admin/recepcionista pueden editar
    setSelectedMember(member);
    setServiceToEditDates(service);
    setEditServiceDatesData({
      startDate: service.startDate || "",
      expirationDate: service.expirationDate || "",
    });
    setEditServiceDatesDialogOpen(true);
  };

  // Guardar cambios de fechas del servicio
  const handleSaveServiceDates = async () => {
    if (!selectedMember || !serviceToEditDates) return;

    try {
      if (!editServiceDatesData.startDate || !editServiceDatesData.expirationDate) {
        toast({
          title: "❌ Datos incompletos",
          description: "Debes seleccionar ambas fechas",
          variant: "destructive",
        });
        return;
      }

      await updateServiceDates(
        selectedMember.id,
        serviceToEditDates.name,
        editServiceDatesData.startDate,
        editServiceDatesData.expirationDate,
      );

      toast({
        title: "✅ Fechas actualizadas",
        description: `Se actualizaron las fechas del servicio ${serviceToEditDates.name}`,
      });

      setEditServiceDatesDialogOpen(false);
      setServiceToEditDates(null);
      setSelectedMember(null);
      loadMembers(currentPage, searchTerm);
    } catch (error: any) {
      console.error("Error actualizando fechas:", error);
      toast({
        title: "❌ Error",
        description: error.message || "Error al actualizar las fechas",
        variant: "destructive",
      });
    }
  };

  // Manejar eliminación de miembro
  const handleDelete = async () => {
    if (!memberToDelete) return;

    try {
      await deleteMember(memberToDelete);
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
      loadMembers(currentPage, searchTerm);
      toast({
        title: "✅ Miembro eliminado",
        description: "El miembro ha sido eliminado correctamente",
      });
    } catch (error: any) {
      console.error("Error eliminando miembro:", error);
      toast({
        title: "❌ Error",
        description: error.message || "Error al eliminar miembro",
        variant: "destructive",
      });
    }
  };

  // Editar miembro
  const handleEditMember = (member: Member) => {
    isEditingRef.current = true;

    setMemberToEdit(member);
    const nameParts = member.name.trim().split(/\s+/);
    const apellidos = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
    const nombres = nameParts.slice(0, -1).join(" ");

    // ✅ Sin birthDate
    setEditFormData({
      nombres: nombres,
      apellidos: apellidos,
      ci: member.ci,
      phone: member.phone,
    });
    setRegisterFingerprint(false);
    setEditDialogOpen(true);
  };

  // Manejar cambio en el formulario de edición
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Manejar cambio de fecha de inicio del servicio
  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;
      setEditServiceDatesData((prev) => ({
        ...prev,
        startDate: formattedDate,
      }));
    }
    setStartDateCalendarOpen(false);
  };

  // Manejar cambio de fecha de vencimiento del servicio
  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;
      setEditServiceDatesData((prev) => ({
        ...prev,
        expirationDate: formattedDate,
      }));
    }
    setEndDateCalendarOpen(false);
  };

  // Guardar cambios del miembro editado
  const handleSaveEdit = async () => {
    if (!memberToEdit) return;

    try {
      if (
        !editFormData.nombres ||
        !editFormData.apellidos ||
        !editFormData.ci ||
        !editFormData.phone
      ) {
        toast({
          title: "❌ Datos incompletos",
          description: "Por favor completa todos los campos",
          variant: "destructive",
        });
        return;
      }

      if (!/^[a-zA-Z0-9]{7,12}$/.test(editFormData.ci)) {
        toast({
          title: "❌ CI inválido",
          description:
            "La cédula de identidad debe contener solo letras y números, entre 7 y 12 caracteres",
          variant: "destructive",
        });
        return;
      }

      // ✅ Payload explícito sin birthDate
      const payload: EditMemberRequest = {
        nombres: editFormData.nombres,
        apellidos: editFormData.apellidos,
        ci: editFormData.ci,
        phone: editFormData.phone,
      };

      await editMember(memberToEdit.id, payload);

      toast({
        title: "✅ Cambios guardados",
        description:
          "La información del miembro se ha actualizado correctamente",
      });

      if (registerFingerprint) {
        setEditDialogOpen(false);
        setFingerprintDialogOpen(true);
      } else {
        setEditDialogOpen(false);
        setMemberToEdit(null);
        isEditingRef.current = false;
        loadMembers(currentPage, searchTerm);
      }
    } catch (error: any) {
      console.error("Error guardando cambios:", error);
      toast({
        title: "❌ Error",
        description: error.message || "Error al guardar los cambios",
        variant: "destructive",
      });
    }
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setMemberToEdit(null);
    setEditFormData({
      nombres: "",
      apellidos: "",
      ci: "",
      phone: "",
    });
    setRegisterFingerprint(false);
    isEditingRef.current = false;
  };

  // Handler para cambio de filtro
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const handleServiceFilterChange = (value: string) => {
    setServiceFilter(value);
  };

  const handleSucursalFilterChange = (value: string) => {
    setSucursalFilter(value);
  };

  // Función para cambiar de página
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Manejar el input de página
  const handlePageInputSubmit = () => {
    const num = parseInt(pageInput);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      handlePageChange(num);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Lista de Miembros
          </h1>
          <p className="text-muted-foreground text-sm">
            Total: {totalCount} miembros
          </p>
        </div>
      </div>

      {/* Filtros - Desktop */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Buscar y Filtrar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2 search-section">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  ref={searchInputRef}
                  placeholder="Buscar por nombre, CI o teléfono..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Escribe al menos 3 caracteres para buscar
              </p>
            </div>

            <div>
              <Select
                value={serviceFilter}
                onValueChange={handleServiceFilterChange}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Servicio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los servicios</SelectItem>
                  {availableServices
                    .filter((s) => s !== "all")
                    .map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {userData?.rol === "admin" && (
              <div>
                <Select
                  value={sucursalFilter}
                  onValueChange={handleSucursalFilterChange}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las sucursales</SelectItem>
                    {availableBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filtros - Móvil */}
      <div className="md:hidden space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            ref={searchInputRef}
            placeholder="Buscar por nombre, CI o teléfono..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="w-full flex items-center justify-between"
        >
          <span>Filtros</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showMobileFilters ? "rotate-180" : ""}`} />
        </Button>
        
        {showMobileFilters && (
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label className="text-sm mb-1 block">Servicio</Label>
                <Select
                  value={serviceFilter}
                  onValueChange={handleServiceFilterChange}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los servicios</SelectItem>
                    {availableServices
                      .filter((s) => s !== "all")
                      .map((service) => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {userData?.rol === "admin" && (
                <div>
                  <Label className="text-sm mb-1 block">Sucursal</Label>
                  <Select
                    value={sucursalFilter}
                    onValueChange={handleSucursalFilterChange}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las sucursales</SelectItem>
                      {availableBranches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        <p className="text-xs text-muted-foreground text-center">
          Escribe al menos 3 caracteres para buscar
        </p>
      </div>

      {/* Tabla de miembros - Desktop */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>CI</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Edad</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Servicios Activos</TableHead>
                <TableHead className="w-[100px]">Estado</TableHead>
                <TableHead className="w-[120px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !dataInitialized.current ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      <span>Inicializando datos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      <span>Cargando miembros...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {searchTerm ||
                    serviceFilter !== "all" ||
                    sucursalFilter !== "all"
                      ? "No se encontraron miembros con los filtros actuales"
                      : "No hay miembros registrados"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => {
                  const age = calculateAge(member.birthDate);
                  const sucursalesToShow =
                    member.sucursales && member.sucursales.length > 0
                      ? member.sucursales
                      : member.sucursal
                        ? [member.sucursal]
                        : [];
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.name}
                      </TableCell>
                      <TableCell>{member.ci}</TableCell>
                      <TableCell>{member.phone}</TableCell>
                      <TableCell>
                        {age !== null ? (
                          <Badge variant="secondary" className="whitespace-nowrap">
                            {age} años
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sucursalesToShow.length > 0 ? (
                          <Badge variant="outline" className="whitespace-nowrap">
                            {sucursalesToShow
                              .map((s) => getSucursalName(s))
                              .join(" / ")}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <MemberServices 
                          services={member.services} 
                          onEditDates={canEditDates ? (service) => handleEditServiceDates(member, service) : undefined}
                          canEdit={canEditDates}
                        />
                      </TableCell>
                      <TableCell className="w-[100px]">
                        <Badge
                          variant={
                            member.status === "active" ? "default" : "secondary"
                          }
                          className={
                            member.status === "active"
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-red-500 hover:bg-red-600"
                          }
                        >
                          {member.status === "active" ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-[120px] text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar"
                            onClick={() => handleEditMember(member)}
                            disabled={loading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setMemberToDelete(member.id);
                              setDeleteDialogOpen(true);
                            }}
                            title="Eliminar"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tarjetas de miembros - Móvil */}
      <div className="md:hidden">
        {loading && !dataInitialized.current ? (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="flex justify-center items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span>Inicializando datos...</span>
              </div>
            </CardContent>
          </Card>
        ) : loading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="flex justify-center items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span>Cargando miembros...</span>
              </div>
            </CardContent>
          </Card>
        ) : filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {searchTerm ||
              serviceFilter !== "all" ||
              sucursalFilter !== "all"
                ? "No se encontraron miembros con los filtros actuales"
                : "No hay miembros registrados"}
            </CardContent>
          </Card>
        ) : (
          filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              getSucursalName={getSucursalName}
              onEdit={() => handleEditMember(member)}
              onEditServiceDates={canEditDates ? (service) => handleEditServiceDates(member, service) : undefined}
              onDelete={() => {
                setMemberToDelete(member.id);
                setDeleteDialogOpen(true);
              }}
              loading={loading}
              canEditDates={canEditDates}
            />
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
          >
            Anterior
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Página</span>
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handlePageInputSubmit();
                }
              }}
              onBlur={handlePageInputSubmit}
              className="w-16 h-8 text-center"
              disabled={loading}
            />
            <span className="text-sm text-muted-foreground">de {totalPages}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="w-[95vw] max-w-md rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al miembro. Esta acción no
              se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={() => setMemberToDelete(null)}
              disabled={loading}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo para editar miembro (SIN fecha de nacimiento) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] rounded-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Miembro</DialogTitle>
            <DialogDescription>
              Modifica la información del miembro
            </DialogDescription>
          </DialogHeader>

          {memberToEdit && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-nombres"
                    className="flex items-center gap-1"
                  >
                    Nombres <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-nombres"
                    name="nombres"
                    value={editFormData.nombres}
                    onChange={handleEditFormChange}
                    placeholder="Ingrese nombres"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="edit-apellidos"
                    className="flex items-center gap-1"
                  >
                    Apellidos <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-apellidos"
                    name="apellidos"
                    value={editFormData.apellidos}
                    onChange={handleEditFormChange}
                    placeholder="Ingrese apellidos"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-ci" className="flex items-center gap-1">
                  Cédula de Identidad{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-ci"
                  name="ci"
                  value={editFormData.ci}
                  onChange={handleEditFormChange}
                  placeholder="Ingrese CI"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="flex items-center gap-1">
                  Teléfono <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-phone"
                  name="phone"
                  value={editFormData.phone}
                  onChange={handleEditFormChange}
                  placeholder="Ingrese teléfono"
                  required
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="register-fingerprint"
                  checked={registerFingerprint}
                  onCheckedChange={(checked) =>
                    setRegisterFingerprint(!!checked)
                  }
                />
                <Label
                  htmlFor="register-fingerprint"
                  className="text-sm font-medium leading-none flex items-center gap-2"
                >
                  <Fingerprint size={16} />
                  Actualizar huella dactilar
                </Label>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={loading}
                  className="gym-gradient"
                >
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar fechas de servicio */}
      <Dialog open={editServiceDatesDialogOpen} onOpenChange={setEditServiceDatesDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] rounded-lg">
          <DialogHeader>
            <DialogTitle>Editar Fechas del Servicio</DialogTitle>
            <DialogDescription>
              Modifica las fechas de inicio y vencimiento para {serviceToEditDates?.name}
            </DialogDescription>
          </DialogHeader>

          {serviceToEditDates && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  Fecha de Inicio
                </Label>
                <Popover open={startDateCalendarOpen} onOpenChange={setStartDateCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editServiceDatesData.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editServiceDatesData.startDate ? (
                        format(parseISODate(editServiceDatesData.startDate), "dd/MM/yyyy", { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <SimpleCalendar
                      selected={editServiceDatesData.startDate ? parseISODate(editServiceDatesData.startDate) : undefined}
                      onSelect={(date) => handleStartDateChange(date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  Fecha de Vencimiento
                </Label>
                <Popover open={endDateCalendarOpen} onOpenChange={setEndDateCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editServiceDatesData.expirationDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editServiceDatesData.expirationDate ? (
                        format(parseISODate(editServiceDatesData.expirationDate), "dd/MM/yyyy", { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <SimpleCalendar
                      selected={editServiceDatesData.expirationDate ? parseISODate(editServiceDatesData.expirationDate) : undefined}
                      onSelect={(date) => handleEndDateChange(date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditServiceDatesDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveServiceDates}
                  className="bg-primary text-black hover:bg-primary/90"
                >
                  Guardar Cambios
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo para registrar huella dactilar */}
      <Dialog
        open={fingerprintDialogOpen}
        onOpenChange={(open) => {
          setFingerprintDialogOpen(open);
          if (!open) {
            setIsScanning(false);
            isEditingRef.current = false;
            setMemberToEdit(null);
            loadMembers(currentPage, searchTerm);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-lg">
          <DialogHeader>
            <DialogTitle>Registro de Huella Dactilar</DialogTitle>
            <DialogDescription>
              Escanee la huella dactilar del miembro
            </DialogDescription>
          </DialogHeader>

          <div className="text-center py-6">
            <div
              className={`mx-auto w-32 h-32 sm:w-48 sm:h-48 rounded-full border-4 ${isScanning ? "border-primary animate-pulse" : "border-gray-300"} flex items-center justify-center mb-4`}
            >
              <Fingerprint
                size={64}
                className={`sm:w-24 sm:h-24 ${isScanning ? "text-primary" : "text-gray-400"}`}
              />
            </div>

            <p className="text-base sm:text-lg font-medium mb-2">
              {isScanning
                ? "Escaneando huella..."
                : "Esperando a que el lector esté disponible..."}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isScanning
                ? "Por favor, coloque su dedo en el lector"
                : "Preparando el lector de huellas..."}
            </p>

            <div className="mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsScanning(false);
                  setFingerprintDialogOpen(false);
                  isEditingRef.current = false;
                  setMemberToEdit(null);
                  loadMembers(currentPage, searchTerm);
                }}
                disabled={isScanning}
              >
                {isScanning ? "Cancelar Escaneo" : "Cerrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MembersList;