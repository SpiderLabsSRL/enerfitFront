import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  UserPlus,
  CreditCard,
  QrCode,
  Banknote,
  AlertCircle,
  Calendar as CalendarIcon,
  Fingerprint,
  Ticket,
  X,
  CheckCircle,
  Loader2,
  Pencil,
  Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  format,
  addDays,
  addMonths,
  isBefore,
  isAfter,
  isSameDay,
  subDays,
  differenceInDays,
} from "date-fns";
import { es } from "date-fns/locale";
import ClientSelection from "./ClientSelection";
import ServiceSelection from "./ServiceSelection";
import { useUser } from "@/contexts/UserContext";
import { useFingerprintEnroll } from "@/hooks/userFingerprintEnroll";
import {
  getServicesByBranch,
  getActiveSubscriptions,
  getCashRegisterStatus,
  registerMember,
  validateCoupon as validateCouponApi,
  type Service,
  type Person,
  type ActiveSubscription,
  type Coupon,
} from "../../api/RegisterMemberApi";

interface PersonValidationState {
  personKey: string;
  personName: string;
  serviceId: number;
  serviceName: string;
  activeSubscription: ActiveSubscription | null;
  action: "replace" | "future" | null;
  startDate: Date | null;
  isPending: boolean;
  /** Indica que la fecha fue fijada por una regla (replace/future) y NO es editable */
  isDateLocked: boolean;
}

interface PersonDateAssignment {
  personKey: string;
  personName: string;
  startDate: Date | null;
  endDate: Date | null;
  /** Si es true, no se le pedirá fecha ni se podrá editar después */
  dateLocked: boolean;
}

interface GroupDateAssignmentFlow {
  service: Service;
  assignments: PersonDateAssignment[];
  /** Índices (dentro de assignments) que aún necesitan fecha manual */
  pendingIndexes: number[];
  /** Posición actual dentro de pendingIndexes */
  pendingCursor: number;
}

function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}

// ============================================
// HELPERS
// ============================================

function toLocalYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function diasRestantes(fechaVencimiento: Date | string): number {
  const fv = new Date(fechaVencimiento);
  fv.setHours(0, 0, 0, 0);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return differenceInDays(fv, hoy);
}

// ============================================
// CALENDAR
// ============================================
function Calendar({
  mode,
  selected,
  onSelect,
  disabled,
  locale,
  initialFocus,
  className,
}: any) {
  const [currentDate, setCurrentDate] = useState(selected || new Date());

  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
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

  const handleDateClick = (day: number) => {
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    if (!disabled || !disabled(newDate)) {
      onSelect(newDate);
    }
  };

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

  const isDisabledDate = (day: number) => {
    if (!disabled) return false;
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    return disabled(date);
  };

  return (
    <div className={cn("p-3 bg-card", className)}>
      <div className="flex items-center justify-between mb-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePrevMonth}
          className="border-border text-foreground"
        >
          {"<"}
        </Button>
        <span className="font-medium text-foreground">
          {months[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleNextMonth}
          className="border-border text-foreground"
        >
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
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0 font-normal",
                  isSelectedDate(day) &&
                    "bg-primary text-black hover:bg-primary/90",
                  isDisabledDate(day) &&
                    "opacity-50 cursor-not-allowed text-muted-foreground",
                  !isSelectedDate(day) &&
                    !isDisabledDate(day) &&
                    "text-foreground hover:bg-muted"
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

export function RegisterMember() {
  const { user } = useUser();

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [familyMembers, setFamilyMembers] = useState<Person[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [serviceDates, setServiceDates] = useState<
    Record<number, { startDate: Date; endDate: Date }>
  >({});
  const [perPersonDates, setPerPersonDates] = useState<
    Record<number, Record<string, { startDate: Date; endDate: Date }>>
  >({});
  const [lockedServiceIds, setLockedServiceIds] = useState<number[]>([]);
  /** NUEVO: personas con fecha bloqueada por servicio (no editables) */
  const [lockedPersonDates, setLockedPersonDates] = useState<
    Record<number, string[]>
  >({});

  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [discountLocked, setDiscountLocked] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<
    "efectivo" | "qr" | "mixto" | null
  >(null);

  const [cashAmount, setCashAmount] = useState(0);
  const [qrAmount, setQrAmount] = useState(0);
  const [pagoPlazos, setPagoPlazos] = useState(false);
  const [montoEntregado, setMontoEntregado] = useState(0);
  const [montoPendiente, setMontoPendiente] = useState(0);
  const [activeSubscriptions, setActiveSubscriptions] = useState<
    ActiveSubscription[]
  >([]);
  const [futureSubscriptions, setFutureSubscriptions] = useState<
    ActiveSubscription[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [cashRegisterOpen, setCashRegisterOpen] = useState(true);
  const [resetTrigger, setResetTrigger] = useState(0);

  const [isFingerprintEnrollOpen, setIsFingerprintEnrollOpen] = useState(false);
  const [pendingEnrollPersonId, setPendingEnrollPersonId] = useState<
    string | null
  >(null);
  const [pendingEnrollPersonName, setPendingEnrollPersonName] = useState<
    string | null
  >(null);

  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  const [pendingValidations, setPendingValidations] = useState<
    PersonValidationState[]
  >([]);
  const [currentValidationIndex, setCurrentValidationIndex] = useState(0);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [tempCalendarDate, setTempCalendarDate] = useState<Date>(new Date());
  const [showTempCalendar, setShowTempCalendar] = useState(false);
  const [pendingGroupService, setPendingGroupService] = useState<{
    service: Service;
    persons: Person[];
  } | null>(null);

  const [tempPersonForValidation, setTempPersonForValidation] =
    useState<Person | null>(null);
  const [tempServiceForValidation, setTempServiceForValidation] =
    useState<Service | null>(null);
  const [tempSubscriptionForValidation, setTempSubscriptionForValidation] =
    useState<ActiveSubscription | null>(null);
  const [showSinglePersonValidationDialog, setShowSinglePersonValidationDialog] =
    useState(false);

  // ============================================
  // Flujo de asignación de fechas por persona (grupal)
  // ============================================
  const [groupDateFlow, setGroupDateFlow] =
    useState<GroupDateAssignmentFlow | null>(null);
  const [showGroupDateDialog, setShowGroupDateDialog] = useState(false);
  const [showGroupDateCalendar, setShowGroupDateCalendar] = useState(false);
  const [groupDateTemp, setGroupDateTemp] = useState<Date>(new Date());

  // Edición de fecha individual de un servicio grupal
  const [editingPersonDate, setEditingPersonDate] = useState<{
    serviceId: number;
    personKey: string;
    personName: string;
    currentDate: Date;
  } | null>(null);
  const [showEditPersonDateDialog, setShowEditPersonDateDialog] =
    useState(false);
  const [showEditPersonCalendar, setShowEditPersonCalendar] = useState(false);
  const [editPersonTempDate, setEditPersonTempDate] = useState<Date>(new Date());

  const { toast } = useToast();

  const { startEnroll, cancelEnroll } = useFingerprintEnroll({
    onSuccess: () => {
      setIsFingerprintEnrollOpen(false);
      setPendingEnrollPersonId(null);
      setPendingEnrollPersonName(null);
      toast({
        title: "✅ Huella registrada",
        description: "La huella digital se ha guardado correctamente",
      });
    },
    onError: (msg) => {
      setIsFingerprintEnrollOpen(false);
      setPendingEnrollPersonId(null);
      setPendingEnrollPersonName(null);
      toast({
        title: "⚠️ Error al registrar huella",
        description: msg || "No se pudo guardar la huella digital",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const paused = !!isFingerprintEnrollOpen;
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
  }, [isFingerprintEnrollOpen]);

  useEffect(() => {
    if (!isFingerprintEnrollOpen || !pendingEnrollPersonId) return;

    const timer = setTimeout(() => {
      startEnroll(pendingEnrollPersonId);
    }, 1500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFingerprintEnrollOpen, pendingEnrollPersonId]);

  const totalPersonsSelected = selectedPerson
    ? 1 + familyMembers.length
    : familyMembers.length;
  const allPersons: Person[] = selectedPerson
    ? [selectedPerson, ...familyMembers]
    : [...familyMembers];

  const hasServiceWithoutPersons = selectedServices.some(
    (s) => s.requierePersonas === 0
  );

  const hasServicesRequiringPersons = selectedServices.some(
    (s) => s.requierePersonas > 0
  );

  useEffect(() => {
    const loadInitialData = async () => {
      if (!user?.idsucursal) {
        setLoadingServices(false);
        return;
      }

      try {
        setLoadingServices(true);
        const services = await getServicesByBranch(user.idsucursal);
        setAllServices(services);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los servicios",
          variant: "destructive",
        });
      } finally {
        setLoadingServices(false);
      }
    };
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.idsucursal]);

  useEffect(() => {
    const loadCashRegister = async () => {
      if (!user?.idcaja) {
        setCashRegisterOpen(false);
        return;
      }

      try {
        const status = await getCashRegisterStatus(user.idcaja);
        setCashRegisterOpen(status.estado === "abierta");
      } catch (error) {
        setCashRegisterOpen(false);
      }
    };
    loadCashRegister();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.idcaja]);

  useEffect(() => {
    const savedMember = localStorage.getItem("selectedMemberForEnrollment");
    if (savedMember) {
      try {
        const member = JSON.parse(savedMember);
        const person: Person = {
          personaId: member.id,
          _key: `db-${member.id}`,
          isNew: false,
          nombres: member.nombres,
          apellidos: member.apellidos,
          ci: member.ci,
          telefono: member.telefono || "",
        };
        setSelectedPerson(person);
        localStorage.removeItem("selectedMemberForEnrollment");
        toast({
          title: "Cliente preseleccionado",
          description: `${person.nombres} ${person.apellidos} ha sido cargado automáticamente`,
        });
      } catch (e) {
        localStorage.removeItem("selectedMemberForEnrollment");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadActiveSubscriptions = async () => {
      if (!user?.idsucursal) return;

      if (selectedPerson || familyMembers.length > 0) {
        const allSubs: ActiveSubscription[] = [];
        for (const person of allPersons) {
          if (person.personaId && person.personaId > 0) {
            try {
              const subs = await getActiveSubscriptions(
                person.personaId,
                user.idsucursal
              );
              allSubs.push(...subs);
            } catch (e) {
              // ignore
            }
          }
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const active = allSubs.filter((sub) => {
          const fv = new Date(sub.fechaVencimiento);
          fv.setHours(0, 0, 0, 0);
          return sub.estadoInscripcion === "activo" && !isBefore(fv, today);
        });

        const future = allSubs.filter((sub) => {
          const fi = new Date(sub.fechaInicio);
          fi.setHours(0, 0, 0, 0);
          return sub.estadoInscripcion === "inactivo" && isAfter(fi, today);
        });

        setActiveSubscriptions(active);
        setFutureSubscriptions(future);
      } else {
        setActiveSubscriptions([]);
        setFutureSubscriptions([]);
      }
    };
    loadActiveSubscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPerson, familyMembers, user?.idsucursal]);

  // ============================================
  // CÁLCULOS
  // ============================================
  const calculateSubtotal = () => {
    return selectedServices.reduce((sum, service) => {
      return sum + service.precio;
    }, 0);
  };

  const calculateTotal = () => {
    const sub = calculateSubtotal();
    return Math.max(0, sub - discountAmount);
  };

  const subtotal = calculateSubtotal();
  const total = calculateTotal();

  useEffect(() => {
    if (pagoPlazos) {
      const pendiente = Math.max(0, total - montoEntregado);
      setMontoPendiente(pendiente);
    } else {
      setMontoEntregado(total);
      setMontoPendiente(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, pagoPlazos, montoEntregado]);

  useEffect(() => {
    if (!paymentMethod) {
      setCashAmount(0);
      setQrAmount(0);
      return;
    }

    const displayTotal = pagoPlazos ? montoEntregado : total;
    if (paymentMethod === "efectivo") {
      setCashAmount(displayTotal);
      setQrAmount(0);
    } else if (paymentMethod === "qr") {
      setCashAmount(0);
      setQrAmount(displayTotal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, total, pagoPlazos, montoEntregado]);

  // ============================================
  // HELPERS
  // ============================================
  const canScheduleFuture = (expirationDate: Date): boolean => {
    return diasRestantes(expirationDate) <= 7;
  };

  const checkPersonActiveSubscription = (
    personaId: number | null,
    serviceTipo: string
  ) => {
    if (!personaId) {
      return { hasActive: false, canScheduleFuture: false };
    }
    const activeSub = activeSubscriptions.find(
      (sub) => sub.personaId === personaId && sub.tipo === serviceTipo
    );
    if (!activeSub) return { hasActive: false, canScheduleFuture: false };

    const expirationDate = new Date(activeSub.fechaVencimiento);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expirationDate);
    exp.setHours(0, 0, 0, 0);

    const isExpired = isBefore(exp, today) || isSameDay(exp, today);

    if (isExpired) return { hasActive: false, canScheduleFuture: false };

    return {
      hasActive: true,
      subscription: activeSub,
      canScheduleFuture: canScheduleFuture(exp),
    };
  };

  const isDateInAllowedRange = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    const oneWeekAgo = subDays(today, 7);
    const oneWeekFuture = addDays(today, 7);

    return !isBefore(d, oneWeekAgo) && !isAfter(d, oneWeekFuture);
  };

  const computeEndDate = (service: Service, startDate: Date): Date => {
    if (service.tipoDuracion === "dias") {
      return addDays(startDate, service.cantidadDuracion);
    }
    return addMonths(startDate, service.cantidadDuracion);
  };

  const startOfToday = (): Date => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // ============================================
  // VALIDACIÓN GRUPAL
  // ============================================
  const handleGroupServiceSelect = async (service: Service) => {
    if (selectedServices.some((s) => s.idServicio === service.idServicio)) {
      setSelectedServices((prev) =>
        prev.filter((s) => s.idServicio !== service.idServicio)
      );
      const newDates = { ...perPersonDates };
      delete newDates[service.idServicio];
      setPerPersonDates(newDates);
      setLockedServiceIds((prev) =>
        prev.filter((id) => id !== service.idServicio)
      );
      setLockedPersonDates((prev) => {
        const copy = { ...prev };
        delete copy[service.idServicio];
        return copy;
      });
      return;
    }

    if (totalPersonsSelected < service.requierePersonas) {
      toast({
        title: "⚠️ Personas insuficientes",
        description: `Este servicio requiere ${service.requierePersonas} personas. Actualmente tiene ${totalPersonsSelected}.`,
        variant: "destructive",
      });
      return;
    }

    const personsForService = allPersons.slice(0, service.requierePersonas);

    setPendingGroupService({
      service,
      persons: personsForService,
    });

    // Verificar suscripciones activas del mismo tipo para cada persona
    const validations: PersonValidationState[] = [];

    for (let i = 0; i < service.requierePersonas; i++) {
      const person = personsForService[i];
      const { hasActive, subscription } = checkPersonActiveSubscription(
        person.personaId,
        service.tipo
      );

      validations.push({
        personKey: person._key,
        personName: `${person.nombres} ${person.apellidos}`,
        serviceId: service.idServicio,
        serviceName: service.nombre,
        activeSubscription: subscription || null,
        action: hasActive ? null : null,
        startDate: null,
        isPending: hasActive,
        isDateLocked: false,
      });
    }

    const algunaConActiva = validations.some((v) => v.activeSubscription);

    if (algunaConActiva) {
      // Primero resolvemos las validaciones (replace/future)
      setPendingValidations(validations);
      const firstPending = validations.findIndex(
        (v) => v.activeSubscription && v.action === null
      );
      setCurrentValidationIndex(firstPending >= 0 ? firstPending : 0);
      setTempCalendarDate(new Date());
      setShowValidationDialog(true);
      return;
    }

    // Si nadie tiene suscripción activa, vamos directo al flujo de fechas
    startGroupDateAssignmentFlow(service, personsForService, validations);
  };

  // ============================================
  // Flujo de asignación de fechas por persona
  // Solo se pide fecha a quienes NO tienen fecha bloqueada por replace/future
  // ============================================
  const startGroupDateAssignmentFlow = (
    service: Service,
    persons: Person[],
    baseValidations: PersonValidationState[]
  ) => {
    const assignments: PersonDateAssignment[] = persons.map((p, i) => {
      const base = baseValidations[i];
      const locked = base?.action === "replace" || base?.action === "future";
      const startDate = base?.startDate ?? null;
      return {
        personKey: p._key,
        personName: `${p.nombres} ${p.apellidos}`,
        startDate,
        endDate: startDate ? computeEndDate(service, startDate) : null,
        dateLocked: locked,
      };
    });

    // Índices de personas que aún necesitan fecha manual
    const pendingIndexes = assignments
      .map((a, idx) => (a.dateLocked ? -1 : idx))
      .filter((idx) => idx !== -1);

    // Si nadie necesita fecha (todas bloqueadas), terminamos de una vez
    if (pendingIndexes.length === 0) {
      finishGroupDateAssignment({
        service,
        assignments,
        pendingIndexes: [],
        pendingCursor: 0,
      });
      return;
    }

    setGroupDateFlow({
      service,
      assignments,
      pendingIndexes,
      pendingCursor: 0,
    });
    setGroupDateTemp(new Date());
    setShowGroupDateCalendar(false);
    setShowGroupDateDialog(true);
    setShowValidationDialog(false);
  };

  const handleGroupDateConfirm = () => {
    if (!groupDateFlow) return;

    if (!isDateInAllowedRange(groupDateTemp)) {
      toast({
        title: "⚠️ Fecha fuera de rango",
        description:
          "Solo puede seleccionar fechas desde 1 semana atrás hasta 1 semana en el futuro",
        variant: "destructive",
      });
      return;
    }

    const updated: GroupDateAssignmentFlow = {
      ...groupDateFlow,
      assignments: [...groupDateFlow.assignments],
    };

    const currentPersonIndex =
      updated.pendingIndexes[updated.pendingCursor];
    const newAssignments = [...updated.assignments];
    newAssignments[currentPersonIndex] = {
      ...newAssignments[currentPersonIndex],
      startDate: groupDateTemp,
      endDate: computeEndDate(updated.service, groupDateTemp),
      dateLocked: false,
    };
    updated.assignments = newAssignments;

    if (updated.pendingCursor < updated.pendingIndexes.length - 1) {
      updated.pendingCursor += 1;
      setGroupDateFlow(updated);
      setGroupDateTemp(new Date());
      setShowGroupDateCalendar(false);
    } else {
      finishGroupDateAssignment(updated);
    }
  };

  const handleGroupDateCancel = () => {
    setShowGroupDateDialog(false);
    setShowGroupDateCalendar(false);
    setGroupDateFlow(null);
    setPendingGroupService(null);
  };

  const finishGroupDateAssignment = (flow: GroupDateAssignmentFlow) => {
    const { service, assignments } = flow;

    const newPerPersonDates: Record<
      string,
      { startDate: Date; endDate: Date }
    > = {};
    const newLockedPersons: string[] = [];

    for (const a of assignments) {
      if (!a.startDate || !a.endDate) continue;
      newPerPersonDates[a.personKey] = {
        startDate: a.startDate,
        endDate: a.endDate,
      };
      if (a.dateLocked) {
        newLockedPersons.push(a.personKey);
      }
    }

    setPerPersonDates((prev) => ({
      ...prev,
      [service.idServicio]: newPerPersonDates,
    }));

    setLockedPersonDates((prev) => ({
      ...prev,
      [service.idServicio]: newLockedPersons,
    }));

    // serviceDates general con la primera fecha disponible
    const first = assignments.find((a) => a.startDate && a.endDate);
    if (first && first.startDate && first.endDate) {
      setServiceDates((prev) => ({
        ...prev,
        [service.idServicio]: {
          startDate: first.startDate!,
          endDate: first.endDate!,
        },
      }));
    }

    setSelectedServices((prev) => [...prev, service]);

    // Bloqueamos el serviceId completo si TODAS las personas tienen fecha fija
    // (no editable desde el panel general)
    const allLocked = assignments.every((a) => a.dateLocked);
    if (allLocked) {
      setLockedServiceIds((prev) => [...prev, service.idServicio]);
    }

    setShowGroupDateDialog(false);
    setShowGroupDateCalendar(false);
    setGroupDateFlow(null);
    setPendingGroupService(null);

    toast({
      title: "✅ Servicio grupal registrado",
      description: `Se registró ${service.nombre} para ${assignments.length} personas.`,
    });
  };

  // ============================================
  // Manejo de validaciones (replace / future)
  // ============================================
  const handleValidationAction = (action: "replace" | "future") => {
    const currentValidation = pendingValidations[currentValidationIndex];
    if (!currentValidation) return;

    const updatedValidations = [...pendingValidations];

    if (action === "replace") {
      // Reemplazar: la fecha es HOY, ya queda bloqueada (no editable)
      updatedValidations[currentValidationIndex] = {
        ...currentValidation,
        action: "replace",
        startDate: startOfToday(),
        isPending: false,
        isDateLocked: true,
      };
    } else if (action === "future") {
      // Programar futuro: la fecha es el día siguiente al vencimiento,
      // ya queda bloqueada (no editable). NO se pide confirmación.
      if (!currentValidation.activeSubscription) return;
      const finActiva = new Date(
        currentValidation.activeSubscription.fechaVencimiento
      );
      finActiva.setDate(finActiva.getDate() + 1);
      finActiva.setHours(0, 0, 0, 0);

      updatedValidations[currentValidationIndex] = {
        ...currentValidation,
        action: "future",
        startDate: finActiva,
        isPending: false,
        isDateLocked: true,
      };
    }

    setPendingValidations(updatedValidations);

    // Buscar la siguiente validación pendiente (solo las que tienen activeSubscription y action null)
    const nextIndex = findNextPendingIndex(updatedValidations);
    if (nextIndex !== -1) {
      setCurrentValidationIndex(nextIndex);
    } else {
      // Todas las validaciones resueltas → pasamos al flujo de fechas
      // (que solo preguntará por quienes NO tengan fecha bloqueada)
      if (pendingGroupService) {
        startGroupDateAssignmentFlow(
          pendingGroupService.service,
          pendingGroupService.persons,
          updatedValidations
        );
      }
    }
  };

  const handleValidationDateConfirm = () => {
    const currentValidation = pendingValidations[currentValidationIndex];
    if (!currentValidation) return;

    if (!isDateInAllowedRange(tempCalendarDate)) {
      toast({
        title: "⚠️ Fecha fuera de rango",
        description:
          "Solo puede seleccionar fechas desde 1 semana atrás hasta 1 semana en el futuro",
        variant: "destructive",
      });
      return;
    }

    const updatedValidations = [...pendingValidations];
    updatedValidations[currentValidationIndex] = {
      ...currentValidation,
      action: null,
      startDate: tempCalendarDate,
      isPending: false,
      isDateLocked: false,
    };
    setPendingValidations(updatedValidations);

    const nextIndex = findNextPendingIndex(updatedValidations);
    if (nextIndex !== -1) {
      setCurrentValidationIndex(nextIndex);
      setTempCalendarDate(new Date());
    } else {
      if (pendingGroupService) {
        startGroupDateAssignmentFlow(
          pendingGroupService.service,
          pendingGroupService.persons,
          updatedValidations
        );
      }
    }
  };

  const findNextPendingIndex = (
    validations: PersonValidationState[]
  ): number => {
    for (let i = 0; i < validations.length; i++) {
      if (validations[i].activeSubscription && validations[i].action === null) {
        return i;
      }
    }
    return -1;
  };

  // ============================================
  // SELECCIÓN DE SERVICIOS (simples)
  // ============================================
  const handleSimpleServiceSelect = (service: Service) => {
    if (selectedServices.some((s) => s.idServicio === service.idServicio)) {
      setSelectedServices((prev) =>
        prev.filter((s) => s.idServicio !== service.idServicio)
      );
      const newDates = { ...perPersonDates };
      delete newDates[service.idServicio];
      setPerPersonDates(newDates);
      setLockedServiceIds((prev) =>
        prev.filter((id) => id !== service.idServicio)
      );
      setLockedPersonDates((prev) => {
        const copy = { ...prev };
        delete copy[service.idServicio];
        return copy;
      });
      return;
    }

    if (service.requierePersonas === 0) {
      const endDate = computeEndDate(service, new Date());

      setPerPersonDates((prev) => ({
        ...prev,
        [service.idServicio]: { ALL: { startDate: new Date(), endDate } },
      }));
      setServiceDates((prev) => ({
        ...prev,
        [service.idServicio]: { startDate: new Date(), endDate },
      }));
      setSelectedServices((prev) => [...prev, service]);
      return;
    }

    if (service.requierePersonas === 1) {
      if (!selectedPerson) {
        toast({
          title: "⚠️ Requiere cliente",
          description: "Seleccione un cliente primero",
          variant: "default",
        });
        return;
      }

      const { hasActive, subscription } = checkPersonActiveSubscription(
        selectedPerson.personaId,
        service.tipo
      );

      if (hasActive && subscription) {
        setTempPersonForValidation(selectedPerson);
        setTempServiceForValidation(service);
        setTempSubscriptionForValidation(subscription);
        setShowSinglePersonValidationDialog(true);
        return;
      }

      const startDate = new Date();
      const endDate = computeEndDate(service, startDate);

      setPerPersonDates((prev) => ({
        ...prev,
        [service.idServicio]: {
          [selectedPerson._key]: { startDate, endDate },
        },
      }));
      setServiceDates((prev) => ({
        ...prev,
        [service.idServicio]: { startDate, endDate },
      }));
      setSelectedServices((prev) => [...prev, service]);
    }
  };

  const handleSinglePersonValidationAction = (
    action: "replace" | "future"
  ) => {
    if (!tempPersonForValidation || !tempServiceForValidation) return;

    let startDate: Date;
    let lockPerson = false;

    if (action === "future" && tempSubscriptionForValidation) {
      const finActiva = new Date(
        tempSubscriptionForValidation.fechaVencimiento
      );
      finActiva.setDate(finActiva.getDate() + 1);
      finActiva.setHours(0, 0, 0, 0);
      startDate = finActiva;
      lockPerson = true;
    } else {
      startDate = startOfToday();
      lockPerson = true;
    }

    const endDate = computeEndDate(tempServiceForValidation, startDate);

    setPerPersonDates((prev) => ({
      ...prev,
      [tempServiceForValidation.idServicio]: {
        [tempPersonForValidation._key]: { startDate, endDate },
      },
    }));
    setServiceDates((prev) => ({
      ...prev,
      [tempServiceForValidation.idServicio]: { startDate, endDate },
    }));
    setSelectedServices((prev) => [...prev, tempServiceForValidation]);

    setLockedServiceIds((prev) => [
      ...prev,
      tempServiceForValidation.idServicio,
    ]);

    if (lockPerson) {
      setLockedPersonDates((prev) => ({
        ...prev,
        [tempServiceForValidation.idServicio]: [
          ...(prev[tempServiceForValidation.idServicio] || []),
          tempPersonForValidation._key,
        ],
      }));
    }

    setShowSinglePersonValidationDialog(false);
    setTempPersonForValidation(null);
    setTempServiceForValidation(null);
    setTempSubscriptionForValidation(null);
  };

  const handleServiceSelect = (service: Service, _startDate: Date) => {
    if (service.requierePersonas > 1) {
      handleGroupServiceSelect(service);
    } else {
      handleSimpleServiceSelect(service);
    }
  };

  const handleDateChange = (serviceId: number, startDate: Date) => {
    const service = selectedServices.find((s) => s.idServicio === serviceId);
    if (!service) return;

    if (service.requierePersonas > 1) return;

    const endDate = computeEndDate(service, startDate);

    if (service.requierePersonas === 0) {
      setPerPersonDates((prev) => ({
        ...prev,
        [serviceId]: { ALL: { startDate, endDate } },
      }));
      setServiceDates((prev) => ({
        ...prev,
        [serviceId]: { startDate, endDate },
      }));
    } else if (service.requierePersonas === 1 && selectedPerson) {
      setPerPersonDates((prev) => ({
        ...prev,
        [serviceId]: { [selectedPerson._key]: { startDate, endDate } },
      }));
      setServiceDates((prev) => ({
        ...prev,
        [serviceId]: { startDate, endDate },
      }));
    }
  };

  // ============================================
  // Editar fecha individual de un servicio grupal
  // ============================================
  const isPersonDateLocked = (
    serviceId: number,
    personKey: string
  ): boolean => {
    return (lockedPersonDates[serviceId] || []).includes(personKey);
  };

  const openEditPersonDate = (
    service: Service,
    personKey: string,
    personName: string
  ) => {
    if (isPersonDateLocked(service.idServicio, personKey)) {
      toast({
        title: "🔒 Fecha bloqueada",
        description:
          "Esta fecha fue fijada automáticamente por la validación de la suscripción y no puede modificarse.",
        variant: "default",
      });
      return;
    }

    const dates = perPersonDates[service.idServicio]?.[personKey];
    if (!dates) return;

    setEditingPersonDate({
      serviceId: service.idServicio,
      personKey,
      personName,
      currentDate: dates.startDate,
    });
    setEditPersonTempDate(dates.startDate);
    setShowEditPersonCalendar(false);
    setShowEditPersonDateDialog(true);
  };

  const handleEditPersonDateConfirm = () => {
    if (!editingPersonDate) return;

    if (!isDateInAllowedRange(editPersonTempDate)) {
      toast({
        title: "⚠️ Fecha fuera de rango",
        description:
          "Solo puede seleccionar fechas desde 1 semana atrás hasta 1 semana en el futuro",
        variant: "destructive",
      });
      return;
    }

    const service = selectedServices.find(
      (s) => s.idServicio === editingPersonDate.serviceId
    );
    if (!service) return;

    const endDate = computeEndDate(service, editPersonTempDate);

    setPerPersonDates((prev) => ({
      ...prev,
      [editingPersonDate.serviceId]: {
        ...prev[editingPersonDate.serviceId],
        [editingPersonDate.personKey]: {
          startDate: editPersonTempDate,
          endDate,
        },
      },
    }));

    const updated = perPersonDates[editingPersonDate.serviceId];
    const firstEntry = Object.values(updated || {})[0];
    if (firstEntry) {
      setServiceDates((prev) => ({
        ...prev,
        [editingPersonDate.serviceId]: {
          startDate: firstEntry.startDate,
          endDate: firstEntry.endDate,
        },
      }));
    }

    setShowEditPersonDateDialog(false);
    setEditingPersonDate(null);

    toast({
      title: "✅ Fecha actualizada",
      description: `Se actualizó la fecha de ${editingPersonDate.personName}.`,
    });
  };

  // ============================================
  // CUPONES
  // ============================================
  const handleApplyCoupon = async () => {
    setCouponError("");

    if (!user?.idsucursal) {
      setCouponError("No se pudo identificar tu sucursal");
      return;
    }

    if (selectedServices.length === 0) {
      setCouponError("Primero debes seleccionar un servicio");
      return;
    }

    if (!couponCode.trim()) {
      setCouponError("Ingresa un código de cupón");
      return;
    }

    try {
      setIsValidatingCoupon(true);

      const coupon = await validateCouponApi(
        couponCode.trim(),
        user.idsucursal
      );

      setAppliedCoupon(coupon);
      setDiscountLocked(true);

      let newDiscount = 0;
      if (coupon.tipo === "porcentaje") {
        newDiscount = (subtotal * coupon.valor) / 100;
      } else {
        newDiscount = coupon.valor;
      }

      newDiscount = Math.min(newDiscount, subtotal);
      setDiscountAmount(newDiscount);
      setDiscountReason(
        `Cupón aplicado: ${coupon.codigo} - ${coupon.descripcion}`
      );

      toast({
        title: "🎉 Cupón aplicado",
        description: `Se aplicó ${coupon.descripcion} por un total de Bs. ${newDiscount.toFixed(2)}`,
      });
    } catch (error: any) {
      const msg =
        error instanceof Error ? error.message : "No se pudo validar el cupón";
      setCouponError(msg);
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setDiscountReason("");
      setDiscountLocked(false);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountLocked(false);
    setDiscountAmount(0);
    setDiscountReason("");
    setCouponCode("");
    setCouponError("");
  };

  const handleManualDiscount = (amount: number) => {
    if (discountLocked) {
      toast({
        title: "Descuento bloqueado",
        description:
          "Hay un cupón aplicado. Elimina el cupón para modificar el descuento manualmente.",
        variant: "default",
      });
      return;
    }
    const newAmount = Math.min(amount, subtotal);
    setDiscountAmount(newAmount);
    if (newAmount === 0) {
      setDiscountReason("");
    }
  };

  // ============================================
  // RESET
  // ============================================
  const resetForm = () => {
    setSelectedPerson(null);
    setFamilyMembers([]);
    setSelectedServices([]);
    setServiceDates({});
    setPerPersonDates({});
    setLockedServiceIds([]);
    setLockedPersonDates({});
    setDiscountAmount(0);
    setDiscountReason("");
    setDiscountLocked(false);
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
    setPaymentMethod(null);
    setCashAmount(0);
    setQrAmount(0);
    setPagoPlazos(false);
    setMontoEntregado(0);
    setMontoPendiente(0);
    setActiveSubscriptions([]);
    setFutureSubscriptions([]);
    setGroupDateFlow(null);
    setShowGroupDateDialog(false);
    setShowGroupDateCalendar(false);
    setEditingPersonDate(null);
    setShowEditPersonDateDialog(false);
    setShowEditPersonCalendar(false);
    setResetTrigger((prev) => prev + 1);
  };

  const isSubmitDisabled = () => {
    if (isProcessing) return true;
    if (selectedServices.length === 0) return true;
    if (!cashRegisterOpen) return true;
    if (discountAmount > 0 && !discountReason.trim()) return true;
    if (!paymentMethod) return true;

    if (hasServicesRequiringPersons && totalPersonsSelected === 0) return true;

    for (const s of selectedServices) {
      if (s.requierePersonas > 0 && totalPersonsSelected < s.requierePersonas) {
        return true;
      }
    }

    return false;
  };

  const handleEnrollFingerprint = (personaId: number, personName: string) => {
    setPendingEnrollPersonId(personaId.toString());
    setPendingEnrollPersonName(personName);
    setIsFingerprintEnrollOpen(true);
  };

  // ============================================
  // SUBMIT
  // ============================================
  const handleSubmit = async () => {
    if (!paymentMethod) {
      toast({
        title: "⚠️ Método de pago requerido",
        description: "Debes seleccionar un método de pago antes de inscribir.",
        variant: "destructive",
      });
      return;
    }

    if (hasServicesRequiringPersons && totalPersonsSelected === 0) {
      toast({
        title: "⚠️ Cliente requerido",
        description:
          "Los servicios seleccionados requieren al menos una persona. Selecciona un cliente.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const sucursalId = user?.idsucursal;
      const empleadoId = user?.idempleado;
      const cajaId = user?.idcaja;

      if (!sucursalId || !empleadoId || !cajaId) {
        toast({
          title: "❌ Error",
          description: "Tu usuario no tiene sucursal/empleado/caja asignados",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      const personasPayload = allPersons.map((p) => ({
        personaId: p.personaId,
        nombres: p.nombres,
        apellidos: p.apellidos,
        ci: p.ci,
        telefono: p.telefono,
        fechaNacimiento: p.fechaNacimiento
          ? toLocalYMD(new Date(p.fechaNacimiento))
          : null,
      }));

      const indexByKey: Record<string, number> = {};
      allPersons.forEach((p, i) => {
        indexByKey[p._key] = i;
      });

      const serviciosPayload = selectedServices.map((service) => {
        const dates = perPersonDates[service.idServicio];
        const firstEntry = dates ? Object.values(dates)[0] : null;
        const firstDate = firstEntry || {
          startDate: new Date(),
          endDate: new Date(),
        };

        let personaIndexes: number[] = [];

        if (service.requierePersonas === 0) {
          if (allPersons.length > 0) {
            personaIndexes = allPersons.map((_, i) => i);
          } else {
            personaIndexes = [];
          }
        } else if (dates && dates.ALL) {
          personaIndexes = allPersons.map((_, i) => i);
        } else if (dates) {
          personaIndexes = Object.keys(dates)
            .map((k) => indexByKey[k])
            .filter((i) => i !== undefined);
        }

        return {
          servicioId: service.idServicio,
          fechaInicio: toLocalYMD(firstDate.startDate),
          fechaVencimiento: toLocalYMD(firstDate.endDate),
          precio: service.precio,
          personaIndexes,
          sinPersona:
            service.requierePersonas === 0 && personaIndexes.length === 0,
        };
      });

      // ✅ FIX: Enviar montoEntregado y montoPendiente correctamente
      //    para que el backend sepa cuánto ingresar a caja.
      const registrationData = {
        personas: personasPayload,
        servicios: serviciosPayload,
        descuento: discountAmount,
        descripcionDescuento: discountReason,
        formaPago: paymentMethod,
        montoEfectivo: cashAmount,
        montoQr: qrAmount,
        total: total,
        sucursalId: sucursalId,
        cajaId: cajaId,
        empleadoId: empleadoId,
        pagoPlazos: pagoPlazos,
        montoEntregado: pagoPlazos ? montoEntregado : total,
        montoPendiente: pagoPlazos ? montoPendiente : 0,
        cupon_codigo: appliedCoupon?.codigo || undefined,
      };

      const result = await registerMember(registrationData);

      if (result.success) {
        toast({
          title: "🎉 Inscripción exitosa",
          description:
            result.message ||
            `Se ha completado la inscripción para ${totalPersonsSelected} persona(s)`,
        });

        resetForm();
        setShowConfirmationDialog(false);
      } else {
        toast({
          title: "❌ Error en la inscripción",
          description:
            result.message || "Ocurrió un error al registrar la inscripción",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "No se pudo completar la inscripción",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================
  // FAMILY / CLIENT
  // ============================================
  const handleFamilyMemberAdd = (member: Person) => {
    setFamilyMembers((prev) => [...prev, member]);
  };

  const handleFamilyMemberRemove = (key: string) => {
    setFamilyMembers((prev) => {
      const next = prev.filter((m) => m._key !== key);
      setTimeout(() => reevaluateGroupServices(next), 0);
      return next;
    });
  };

  const handleClientRemove = (person: Person | null) => {
    setSelectedPerson(person);
    if (person === null) {
      const servicesToRemove = selectedServices.filter(
        (s) => s.requierePersonas >= 1
      );
      servicesToRemove.forEach((service) => {
        setSelectedServices((prev) =>
          prev.filter((s) => s.idServicio !== service.idServicio)
        );
        const newDates = { ...perPersonDates };
        delete newDates[service.idServicio];
        setPerPersonDates(newDates);
      });
      setLockedServiceIds((prev) =>
        prev.filter((id) => !servicesToRemove.some((s) => s.idServicio === id))
      );
    } else {
      setTimeout(() => reevaluateGroupServices(familyMembers), 0);
    }
  };

  const reevaluateGroupServices = (nextFamilyMembers: Person[]) => {
    const nextTotal = (selectedPerson ? 1 : 0) + nextFamilyMembers.length;

    const servicesToRemove = selectedServices.filter(
      (s) => s.requierePersonas > 1 && nextTotal < s.requierePersonas
    );

    if (servicesToRemove.length === 0) return;

    servicesToRemove.forEach((service) => {
      setSelectedServices((prev) =>
        prev.filter((s) => s.idServicio !== service.idServicio)
      );
      const newDates = { ...perPersonDates };
      delete newDates[service.idServicio];
      setPerPersonDates(newDates);
    });

    setLockedServiceIds((prev) =>
      prev.filter((id) => !servicesToRemove.some((s) => s.idServicio === id))
    );
    setLockedPersonDates((prev) => {
      const copy = { ...prev };
      servicesToRemove.forEach((s) => delete copy[s.idServicio]);
      return copy;
    });

    toast({
      title: "⚠️ Servicio grupal deseleccionado",
      description: `Se removió ${servicesToRemove
        .map((s) => s.nombre)
        .join(", ")} porque ya no cumple con la cantidad de personas requeridas.`,
      variant: "destructive",
    });
  };

  const submitDisabled = isSubmitDisabled();

  // ============================================
  // Render fechas por persona (con botón editar condicional)
  // ============================================
  const renderPersonDatesInServiceCard = (service: Service) => {
    const personDates = perPersonDates[service.idServicio];
    if (!personDates) return null;

    if (service.requierePersonas === 0) {
      const info = personDates.ALL;
      if (!info) return null;
      return (
        <div className="mt-3 pl-6 border-l-2 border-primary/30">
          <Label className="text-sm font-semibold text-foreground">
            Servicio sin personas requeridas
          </Label>
          <div className="text-xs text-muted-foreground mt-1">
            Fecha de Inicio: {format(info.startDate, "dd/MM/yyyy")} | Fecha de
            Vencimiento: {format(info.endDate, "dd/MM/yyyy")}
          </div>
          <div className="text-xs text-primary mt-1">
            {totalPersonsSelected > 0
              ? `Se aplicará a las ${totalPersonsSelected} persona(s) seleccionada(s).`
              : "Se registrará sin asociar a una persona."}
          </div>
        </div>
      );
    }

    const requiredPersons = service.requierePersonas;
    const personsToShow = allPersons.slice(0, requiredPersons);

    return (
      <div className="mt-3 space-y-3 pl-6 border-l-2 border-primary/30">
        <Label className="text-sm font-semibold text-foreground">
          Fechas por persona:
        </Label>
        {personsToShow.map((person) => {
          const dates = personDates[person._key];
          if (!dates) return null;
          const locked = isPersonDateLocked(service.idServicio, person._key);

          return (
            <div
              key={person._key}
              className={cn(
                "p-2 rounded-md flex items-start justify-between gap-2",
                locked
                  ? "bg-orange-500/10 border border-orange-500/30"
                  : "bg-muted/20"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-primary truncate flex items-center gap-1">
                  {person.nombres} {person.apellidos}
                  {locked && <Lock size={12} className="text-orange-500" />}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Inicio: {format(dates.startDate, "dd/MM/yyyy")} | Vence:{" "}
                  {format(dates.endDate, "dd/MM/yyyy")}
                </div>
                {locked && (
                  <div className="text-[10px] text-orange-500 mt-1">
                    Fecha fijada automáticamente — no editable
                  </div>
                )}
              </div>
              {!locked && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 border-border text-foreground hover:bg-muted shrink-0"
                  onClick={() =>
                    openEditPersonDate(
                      service,
                      person._key,
                      `${person.nombres} ${person.apellidos}`
                    )
                  }
                >
                  <Pencil size={12} className="mr-1" />
                  Editar
                </Button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loadingServices) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando servicios...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">
            Inscribir Nuevo Miembro
          </h1>
          <p className="text-muted-foreground">
            Registra un nuevo cliente en el gimnasio MUTANT
          </p>
        </div>
      </div>

      {!cashRegisterOpen && (
        <div className="bg-destructive/15 border border-destructive/50 text-destructive p-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">
            ⚠️ La caja está cerrada. No se pueden realizar inscripciones hasta
            abrirla.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6 h-full min-h-0">
          <ClientSelection
            onClientSelect={handleClientRemove}
            selectedPerson={selectedPerson}
            resetTrigger={resetTrigger}
            onIdentifyFingerprint={() => {}}
            onFamilyMemberAdd={handleFamilyMemberAdd}
            onFamilyMemberRemove={handleFamilyMemberRemove}
            familyMembers={familyMembers}
            requiredPersonsCount={Math.max(
              ...selectedServices.map((s) => s.requierePersonas),
              0
            )}
            onEnrollFingerprint={handleEnrollFingerprint}
          />
          <ServiceSelection
            services={allServices}
            selectedServices={selectedServices}
            serviceDates={serviceDates}
            onServiceSelect={handleServiceSelect}
            onDateChange={handleDateChange}
            activeSubscriptions={activeSubscriptions}
            futureSubscriptions={futureSubscriptions}
            disabled={!cashRegisterOpen}
            selectedPersonId={selectedPerson?.personaId || null}
            totalPersonsSelected={totalPersonsSelected}
            requiredPersonsForPlan={Math.max(
              ...selectedServices.map((s) => s.requierePersonas),
              0
            )}
            renderPersonDates={renderPersonDatesInServiceCard}
            lockedServiceIds={lockedServiceIds}
          />
        </div>

        <div className="flex flex-col">
          <Card className="border-border bg-card shadow-lg">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <CreditCard className="h-5 w-5" />
                Resumen de Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {selectedServices.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">
                    Servicios seleccionados:
                  </Label>
                  <div className="space-y-1">
                    {selectedServices.map((service) => {
                      let personasCubiertas = 1;
                      if (service.requierePersonas === 0) {
                        personasCubiertas = Math.max(totalPersonsSelected, 1);
                      } else if (service.requierePersonas > 1) {
                        personasCubiertas = service.requierePersonas;
                      }

                      return (
                        <div
                          key={service.idServicio}
                          className="flex justify-between text-sm py-1 border-b border-border last:border-0"
                        >
                          <span className="text-foreground">
                            {service.nombre}{" "}
                            {personasCubiertas > 1 && (
                              <span className="text-xs text-muted-foreground">
                                ({personasCubiertas} personas)
                              </span>
                            )}
                            {service.requierePersonas === 0 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                (sin persona)
                              </span>
                            )}
                          </span>
                          <span className="font-medium text-primary">
                            Bs. {service.precio.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Separator className="bg-border" />

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground">
                  <Ticket className="h-4 w-4" />
                  Cupón de descuento
                </Label>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium text-sm font-mono">
                          {appliedCoupon.codigo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {appliedCoupon.tipo === "porcentaje"
                            ? `${appliedCoupon.valor}% de descuento`
                            : `Bs. ${appliedCoupon.valor} de descuento`}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleRemoveCoupon}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ingresa código de cupón"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setCouponError("");
                        }}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleApplyCoupon()
                        }
                        disabled={!cashRegisterOpen || isValidatingCoupon}
                        className="flex-1 font-mono"
                      />
                      <Button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={
                          !couponCode.trim() ||
                          !cashRegisterOpen ||
                          isValidatingCoupon
                        }
                        className="bg-primary text-black hover:bg-primary/90"
                      >
                        {isValidatingCoupon ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Aplicar"
                        )}
                      </Button>
                    </div>
                    {couponError && (
                      <p className="text-xs text-destructive">{couponError}</p>
                    )}
                  </div>
                )}
              </div>

              {!appliedCoupon && (
                <div className="space-y-2">
                  <Label className="text-foreground">
                    Descuento adicional (Bs.)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max={subtotal}
                    value={discountAmount || ""}
                    onChange={(e) =>
                      handleManualDiscount(parseFloat(e.target.value) || 0)
                    }
                    disabled={!cashRegisterOpen}
                    placeholder="0"
                  />
                  {discountAmount > 0 && (
                    <Textarea
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      placeholder="Motivo del descuento *"
                      rows={2}
                      className={
                        !discountReason.trim() ? "border-destructive" : ""
                      }
                    />
                  )}
                </div>
              )}

              {appliedCoupon && (
                <div className="text-xs text-muted-foreground">
                  Motivo: {discountReason}
                </div>
              )}

              <Separator className="bg-border" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="text-foreground">
                    Bs. {subtotal.toFixed(2)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Descuento:</span>
                    <span>- Bs. {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <Separator className="my-2 bg-border" />
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-foreground">Total:</span>
                  <span className="text-primary">Bs. {total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pagoPlazos"
                    checked={pagoPlazos}
                    onChange={(e) => setPagoPlazos(e.target.checked)}
                    disabled={!cashRegisterOpen}
                    className="h-4 w-4 rounded border-border bg-input accent-primary"
                  />
                  <Label
                    htmlFor="pagoPlazos"
                    className="flex items-center gap-2 cursor-pointer text-foreground"
                  >
                    <CalendarIcon size={16} />
                    Pago en Plazos
                  </Label>
                </div>

                {pagoPlazos && (
                  <div className="bg-muted/30 p-3 rounded-md space-y-3 border border-border">
                    <div>
                      <Label className="text-sm text-foreground">
                        Monto Entregado (Bs.)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max={total}
                        value={montoEntregado || ""}
                        onChange={(e) =>
                          setMontoEntregado(
                            Math.min(total, parseFloat(e.target.value) || 0)
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-foreground">
                        Monto Pendiente (Bs.)
                      </Label>
                      <Input
                        value={montoPendiente.toFixed(2)}
                        disabled
                        className="bg-muted/50 mt-1 text-foreground"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-foreground">Método de Pago</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={paymentMethod === "efectivo" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("efectivo")}
                    className={`flex flex-col gap-1 h-auto py-2 ${
                      paymentMethod === "efectivo"
                        ? "bg-primary text-black hover:bg-primary/90"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                    disabled={!cashRegisterOpen}
                  >
                    <Banknote size={18} />
                    <span className="text-xs">Efectivo</span>
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "qr" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("qr")}
                    className={`flex flex-col gap-1 h-auto py-2 ${
                      paymentMethod === "qr"
                        ? "bg-primary text-black hover:bg-primary/90"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                    disabled={!cashRegisterOpen}
                  >
                    <QrCode size={18} />
                    <span className="text-xs">QR</span>
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "mixto" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("mixto")}
                    className={`flex flex-col gap-1 h-auto py-2 ${
                      paymentMethod === "mixto"
                        ? "bg-primary text-black hover:bg-primary/90"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                    disabled={!cashRegisterOpen}
                  >
                    <CreditCard size={18} />
                    <span className="text-xs">Mixto</span>
                  </Button>
                </div>

                {paymentMethod === "mixto" && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <Label className="text-sm text-foreground">
                        Efectivo
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max={pagoPlazos ? montoEntregado : total}
                        value={cashAmount || ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const maxTotal = pagoPlazos ? montoEntregado : total;
                          setCashAmount(Math.min(val, maxTotal));
                          setQrAmount(Math.max(0, maxTotal - val));
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-foreground">QR</Label>
                      <Input
                        type="number"
                        min="0"
                        max={pagoPlazos ? montoEntregado : total}
                        value={qrAmount || ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const maxTotal = pagoPlazos ? montoEntregado : total;
                          setQrAmount(Math.min(val, maxTotal));
                          setCashAmount(Math.max(0, maxTotal - val));
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {hasServiceWithoutPersons && totalPersonsSelected === 0 && (
                <div className="bg-muted/40 border border-muted rounded-md p-2 text-xs text-muted-foreground flex items-start gap-2">
                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-primary" />
                  <span>
                    Los servicios marcados como <strong>(sin persona)</strong> se
                    registrarán sin asociarse a un cliente.
                  </span>
                </div>
              )}

              <Dialog
                open={showConfirmationDialog}
                onOpenChange={setShowConfirmationDialog}
              >
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    className="w-full bg-primary text-black hover:bg-primary/90 mt-4"
                    disabled={submitDisabled}
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Procesando...
                      </div>
                    ) : (
                      <>
                        <UserPlus size={16} className="mr-2" />
                        Inscribir Cliente - Bs.{" "}
                        {(pagoPlazos ? montoEntregado : total).toFixed(2)}
                      </>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-primary">
                      Confirmar Inscripción
                    </DialogTitle>
                    <DialogDescription asChild>
                      <div className="text-muted-foreground space-y-2">
                        <p>
                          ¿Confirmar la inscripción de los siguientes servicios?
                        </p>
                        {selectedServices.map((service) => (
                          <p key={service.idServicio}>
                            <strong>{service.nombre}</strong> - Bs.{" "}
                            {service.precio}
                          </p>
                        ))}
                        <p>
                          <strong className="text-foreground">Total:</strong> Bs.{" "}
                          {total.toFixed(2)}
                        </p>
                        {discountAmount > 0 && (
                          <>
                            <p>
                              <strong className="text-foreground">
                                Descuento:
                              </strong>{" "}
                              Bs. {discountAmount.toFixed(2)}
                            </p>
                            <p>
                              <strong className="text-foreground">Motivo:</strong>{" "}
                              {discountReason}
                            </p>
                          </>
                        )}
                        {pagoPlazos && (
                          <>
                            <p>
                              <strong className="text-foreground">
                                Monto Entregado:
                              </strong>{" "}
                              Bs. {montoEntregado.toFixed(2)}
                            </p>
                            <p>
                              <strong className="text-foreground">
                                Monto Pendiente:
                              </strong>{" "}
                              Bs. {montoPendiente.toFixed(2)}
                            </p>
                          </>
                        )}
                        <p className="text-xs text-primary pt-2">
                          Al confirmar, aceptas que los pagos adelantados no son
                          reembolsables.
                        </p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowConfirmationDialog(false)}
                      className="border-border text-foreground"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isProcessing}
                      className="bg-primary text-black hover:bg-primary/90"
                    >
                      Confirmar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
                <p>
                  Los pagos adelantados no son reembolsables. Al inscribir
                  aceptas nuestras políticas.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ============================================================
          Modal de asignación de fechas por persona (solo para las que
          NO tienen fecha bloqueada por replace/future)
         ============================================================ */}
      <Dialog
        open={showGroupDateDialog}
        onOpenChange={(open) => {
          if (!open) handleGroupDateCancel();
        }}
      >
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">
              📅 Fechas por persona — {groupDateFlow?.service.nombre}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-muted-foreground">
                {groupDateFlow &&
                  (() => {
                    const currentPersonIndex =
                      groupDateFlow.pendingIndexes[
                        groupDateFlow.pendingCursor
                      ];
                    const currentPerson =
                      groupDateFlow.assignments[currentPersonIndex];
                    const totalPending = groupDateFlow.pendingIndexes.length;
                    return (
                      <>
                        <p className="mt-2">
                          Asigna la fecha de inicio ({groupDateFlow.pendingCursor + 1} de{" "}
                          {totalPending}):
                        </p>
                        <p className="font-semibold text-foreground mt-3">
                          {currentPerson?.personName}
                        </p>
                        <p className="text-xs text-orange-500 mt-1">
                          Solo puede seleccionar fechas desde 1 semana atrás
                          hasta 1 semana en el futuro
                        </p>

                        <div className="mt-4 space-y-2">
                          <Popover
                            open={showGroupDateCalendar}
                            onOpenChange={setShowGroupDateCalendar}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal border-border bg-input text-foreground"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                {format(groupDateTemp, "PPP", { locale: es })}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0 bg-card border-border"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={groupDateTemp}
                                onSelect={(date: Date) => {
                                  if (date) {
                                    setGroupDateTemp(date);
                                    setShowGroupDateCalendar(false);
                                  }
                                }}
                                disabled={(date: Date) =>
                                  !isDateInAllowedRange(date)
                                }
                                locale={es}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>

                          <div className="p-2 border border-border rounded-md bg-muted/30 text-xs text-foreground">
                            Vencimiento calculado:{" "}
                            {format(
                              computeEndDate(
                                groupDateFlow.service,
                                groupDateTemp
                              ),
                              "PPP",
                              { locale: es }
                            )}
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              className="flex-1 border-border text-foreground"
                              onClick={handleGroupDateCancel}
                            >
                              Cancelar
                            </Button>
                            <Button
                              className="flex-1 bg-primary text-black hover:bg-primary/90"
                              onClick={handleGroupDateConfirm}
                            >
                              {groupDateFlow.pendingCursor <
                              totalPending - 1
                                ? "Siguiente persona"
                                : "Confirmar y agregar"}
                            </Button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Modal editar fecha individual */}
      <Dialog
        open={showEditPersonDateDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowEditPersonDateDialog(false);
            setEditingPersonDate(null);
          }
        }}
      >
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">
              ✏️ Editar fecha de inicio
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-muted-foreground">
                {editingPersonDate && (
                  <>
                    <p className="font-semibold text-foreground mt-2">
                      {editingPersonDate.personName}
                    </p>
                    <p className="text-xs text-orange-500 mt-1">
                      Solo puede seleccionar fechas desde 1 semana atrás hasta 1
                      semana en el futuro
                    </p>
                    <div className="mt-4 space-y-2">
                      <Popover
                        open={showEditPersonCalendar}
                        onOpenChange={setShowEditPersonCalendar}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal border-border bg-input text-foreground"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                            {format(editPersonTempDate, "PPP", { locale: es })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0 bg-card border-border"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={editPersonTempDate}
                            onSelect={(date: Date) => {
                              if (date) {
                                setEditPersonTempDate(date);
                                setShowEditPersonCalendar(false);
                              }
                            }}
                            disabled={(date: Date) =>
                              !isDateInAllowedRange(date)
                            }
                            locale={es}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      <Button
                        className="w-full bg-primary text-black hover:bg-primary/90"
                        onClick={handleEditPersonDateConfirm}
                      >
                        Guardar fecha
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Validación grupal */}
      <Dialog
        open={showValidationDialog}
        onOpenChange={(open) => !open && setShowValidationDialog(false)}
      >
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">
              ⚠️ Validación de Cliente
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-muted-foreground">
                {pendingValidations[currentValidationIndex] && (
                  <>
                    <p className="font-semibold text-foreground mt-2">
                      {pendingValidations[currentValidationIndex].personName}
                    </p>
                    {pendingValidations[currentValidationIndex]
                      .activeSubscription ? (
                      (() => {
                        const dias = diasRestantes(
                          pendingValidations[currentValidationIndex]
                            .activeSubscription!.fechaVencimiento
                        );
                        const soloFuturo = dias <= 7;
                        const soloReemplazo = dias > 7;
                        return (
                          <>
                            <p className="mt-2">
                              Ya tiene una suscripción activa que vence el{" "}
                              {format(
                                new Date(
                                  pendingValidations[
                                    currentValidationIndex
                                  ].activeSubscription!.fechaVencimiento
                                ),
                                "dd/MM/yyyy"
                              )}
                            </p>
                            {soloReemplazo && (
                              <p className="text-xs text-destructive mt-2">
                                Como su suscripción actual vence en más de 7
                                días, se reemplazará (la actual quedará
                                inactiva). La nueva comenzará hoy.
                              </p>
                            )}
                            {soloFuturo && (
                              <p className="text-xs text-orange-500 mt-2">
                                Su suscripción vence en {dias} día(s). La nueva
                                se programará automáticamente para el día
                                siguiente al vencimiento.
                              </p>
                            )}
                            <p className="mt-2">¿Qué deseas hacer?</p>
                            <div className="space-y-2 mt-4">
                              {soloFuturo && (
                                <Button
                                  className="w-full bg-primary text-black hover:bg-primary/90"
                                  onClick={() =>
                                    handleValidationAction("future")
                                  }
                                >
                                  Programar para cuando acabe su mes
                                </Button>
                              )}
                              {soloReemplazo && (
                                <Button
                                  className="w-full bg-destructive text-white hover:bg-destructive/90"
                                  onClick={() =>
                                    handleValidationAction("replace")
                                  }
                                >
                                  Reemplazar mensualidad
                                </Button>
                              )}
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      <>
                        <p className="mt-2">
                          Seleccione la fecha de inicio para este servicio:
                        </p>
                        <p className="text-xs text-orange-500 mt-1">
                          Solo puede seleccionar fechas desde 1 semana atrás
                          hasta 1 semana en el futuro
                        </p>
                        <div className="mt-4">
                          <Popover
                            open={showTempCalendar}
                            onOpenChange={setShowTempCalendar}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal border-border bg-input text-foreground"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                {format(tempCalendarDate, "PPP", { locale: es })}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0 bg-card border-border"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={tempCalendarDate}
                                onSelect={(date: Date) => {
                                  if (date) {
                                    setTempCalendarDate(date);
                                    setShowTempCalendar(false);
                                  }
                                }}
                                disabled={(date: Date) =>
                                  !isDateInAllowedRange(date)
                                }
                                locale={es}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <Button
                            className="w-full mt-4 bg-primary text-black hover:bg-primary/90"
                            onClick={handleValidationDateConfirm}
                          >
                            Confirmar Fecha
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Validación individual (servicios de 1 persona) */}
      <Dialog
        open={showSinglePersonValidationDialog}
        onOpenChange={(open) =>
          !open && setShowSinglePersonValidationDialog(false)
        }
      >
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">
              ⚠️ Servicio activo detectado
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-muted-foreground">
                {tempPersonForValidation && tempServiceForValidation && (() => {
                  const dias = tempSubscriptionForValidation
                    ? diasRestantes(
                        tempSubscriptionForValidation.fechaVencimiento
                      )
                    : 0;
                  const soloFuturo = dias <= 7;
                  const soloReemplazo = dias > 7;

                  return (
                    <>
                      <p className="font-semibold text-foreground">
                        {tempPersonForValidation.nombres}{" "}
                        {tempPersonForValidation.apellidos}
                      </p>
                      <p className="mt-2">
                        Ya tiene una suscripción activa de{" "}
                        {tempServiceForValidation.tipo}
                      </p>
                      {tempSubscriptionForValidation && (
                        <>
                          <p className="text-sm">
                            Vence el:{" "}
                            {format(
                              new Date(
                                tempSubscriptionForValidation.fechaVencimiento
                              ),
                              "dd/MM/yyyy"
                            )}
                          </p>
                          {soloReemplazo && (
                            <p className="text-xs text-destructive mt-2">
                              Como su suscripción actual vence en más de 7
                              días, se reemplazará (la actual quedará
                              inactiva). La nueva comenzará hoy.
                            </p>
                          )}
                          {soloFuturo && (
                            <p className="text-xs text-orange-500 mt-2">
                              Su suscripción vence en {dias} día(s). La nueva
                              se programará automáticamente para el día
                              siguiente al vencimiento.
                            </p>
                          )}
                        </>
                      )}
                      <p className="mt-2">¿Qué deseas hacer?</p>
                      <div className="space-y-2 mt-4">
                        {soloFuturo && (
                          <Button
                            className="w-full bg-primary text-black hover:bg-primary/90"
                            onClick={() =>
                              handleSinglePersonValidationAction("future")
                            }
                          >
                            Programar para cuando acabe su mes
                          </Button>
                        )}
                        {soloReemplazo && (
                          <Button
                            className="w-full bg-destructive text-white hover:bg-destructive/90"
                            onClick={() =>
                              handleSinglePersonValidationAction("replace")
                            }
                          >
                            Reemplazar mensualidad
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="w-full border-border text-foreground"
                          onClick={() =>
                            setShowSinglePersonValidationDialog(false)
                          }
                        >
                          Cancelar
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Modal de enrolamiento de huella */}
      <Dialog
        open={isFingerprintEnrollOpen}
        onOpenChange={(open) => {
          if (!open) {
            cancelEnroll();
            setPendingEnrollPersonId(null);
            setPendingEnrollPersonName(null);
          }
          setIsFingerprintEnrollOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-primary text-center">
              Registrando Huella Digital
            </DialogTitle>
            <DialogDescription className="text-center">
              {pendingEnrollPersonName
                ? `Coloca el dedo en el lector para ${pendingEnrollPersonName}`
                : "Coloca el dedo en el lector para guardar la huella"}
            </DialogDescription>
          </DialogHeader>
          <Card className="text-center bg-card border-none">
            <CardContent className="pt-6">
              <div className="mx-auto w-24 h-24 rounded-full border-4 border-primary flex items-center justify-center animate-pulse gym-glow">
                <Fingerprint size={48} className="text-primary" />
              </div>
              <p className="mt-4 text-lg text-foreground">
                Escaneando huella digital...
              </p>
              <p className="text-sm text-muted-foreground">
                Coloca el dedo en el lector
              </p>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
}