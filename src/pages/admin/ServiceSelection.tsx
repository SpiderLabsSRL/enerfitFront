import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, AlertCircle, Users, Lock } from "lucide-react";
import {
  format,
  addDays,
  addMonths,
  isBefore,
  isAfter,
  isSameDay,
  differenceInDays,
  subDays,
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Service, ActiveSubscription } from "../../api/RegisterMemberApi";

interface ServiceSelectionProps {
  services: Service[];
  selectedServices: Service[];
  serviceDates: Record<number, { startDate: Date; endDate: Date }>;
  onServiceSelect: (service: Service, startDate: Date) => void;
  onDateChange: (serviceId: number, startDate: Date) => void;
  activeSubscriptions: ActiveSubscription[];
  futureSubscriptions: ActiveSubscription[];
  disabled?: boolean;
  selectedPersonId?: number | null;
  totalPersonsSelected?: number;
  requiredPersonsForPlan?: number;
  renderPersonDates?: (service: Service) => React.ReactNode;
  lockedServiceIds?: number[];
}

// ============================================
// HELPERS DE SUSCRIPCIÓN
// ============================================
const isSubscriptionActive = (subscription: ActiveSubscription): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expirationDate = new Date(subscription.fechaVencimiento);
  expirationDate.setHours(0, 0, 0, 0);
  return (
    subscription.estadoInscripcion === "activo" &&
    !isBefore(expirationDate, today)
  );
};

const hasFutureSubscriptionOfSameType = (
  subscriptions: ActiveSubscription[],
  tipo: string
): boolean => {
  return subscriptions.some((sub) => sub.tipo === tipo);
};

export default function ServiceSelection({
  services,
  selectedServices,
  serviceDates,
  onServiceSelect,
  onDateChange,
  activeSubscriptions,
  futureSubscriptions,
  disabled = false,
  selectedPersonId = null,
  totalPersonsSelected = 0,
  requiredPersonsForPlan = 0,
  renderPersonDates,
  lockedServiceIds = [],
}: ServiceSelectionProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [prevPersonId, setPrevPersonId] = useState(selectedPersonId);

  useEffect(() => {
    if (prevPersonId !== null && selectedPersonId === null) {
      const servicesToRemove = selectedServices.filter(
        (service) => service.requierePersonas >= 1
      );
      servicesToRemove.forEach((service) => {
        onServiceSelect(service, new Date());
      });
    }
    setPrevPersonId(selectedPersonId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersonId, prevPersonId]);

  useEffect(() => {
    setRefreshKey((prev) => prev + 1);
  }, [selectedPersonId, totalPersonsSelected]);

  const isServiceTypeSelected = (tipo: string): boolean => {
    return selectedServices.some((s) => s.tipo === tipo);
  };

  const hasGroupServiceSelected = (): boolean => {
    return selectedServices.some((s) => s.requierePersonas >= 2);
  };

  const isServiceActiveForPerson = (
    service: Service
  ): { active: boolean; subscription?: ActiveSubscription } => {
    const activeSub = activeSubscriptions.find(
      (sub) => sub.tipo === service.tipo && isSubscriptionActive(sub)
    );
    return { active: !!activeSub, subscription: activeSub };
  };

  const hasFutureSameType = (service: Service): boolean => {
    return hasFutureSubscriptionOfSameType(futureSubscriptions, service.tipo);
  };

  const handleServiceToggle = (service: Service) => {
    if (selectedServices.some((s) => s.idServicio === service.idServicio)) {
      onServiceSelect(service, new Date());
    } else {
      const { active, subscription } = isServiceActiveForPerson(service);

      if (active && subscription) {
        onServiceSelect(service, new Date());
        return;
      }

      if (hasFutureSameType(service)) {
        return;
      }

      const isOneDay =
        service.tipoDuracion === "dias" && service.cantidadDuracion === 1;
      const startDate = isOneDay ? new Date() : new Date();
      onServiceSelect(service, startDate);
    }
  };

  const getActiveSubscriptionEndDate = (tipo: string): Date | null => {
    const activeSub = activeSubscriptions.find(
      (sub) => sub.tipo === tipo && isSubscriptionActive(sub)
    );
    if (activeSub) {
      return new Date(activeSub.fechaVencimiento);
    }
    return null;
  };

  const isServiceDisabledByPersonCount = (service: Service): boolean => {
    if (
      totalPersonsSelected > 0 &&
      service.requierePersonas < totalPersonsSelected &&
      service.requierePersonas !== 0
    ) {
      return true;
    }
    if (
      service.requierePersonas > totalPersonsSelected &&
      service.requierePersonas !== 0
    ) {
      return true;
    }
    return false;
  };

  const getPersonCountMessage = (service: Service): string | null => {
    if (
      totalPersonsSelected > 0 &&
      service.requierePersonas < totalPersonsSelected &&
      service.requierePersonas !== 0
    ) {
      return `Ya seleccionó ${totalPersonsSelected} personas. Este servicio requiere solo ${service.requierePersonas} persona(s).`;
    }
    if (
      service.requierePersonas > totalPersonsSelected &&
      service.requierePersonas !== 0
    ) {
      return `Este servicio requiere ${service.requierePersonas} personas.`;
    }
    return null;
  };

  const getServiceStatus = (
    service: Service
  ): {
    disabled: boolean;
    reason: string | null;
    isActive: boolean;
    hasActiveSubscription: boolean;
    daysLeft: number | null;
  } => {
    if (disabled) {
      return {
        disabled: true,
        reason: null,
        isActive: false,
        hasActiveSubscription: false,
        daysLeft: null,
      };
    }

    const personCountMessage = getPersonCountMessage(service);
    if (personCountMessage) {
      return {
        disabled: true,
        reason: personCountMessage,
        isActive: false,
        hasActiveSubscription: false,
        daysLeft: null,
      };
    }

    if (
      hasGroupServiceSelected() &&
      !selectedServices.some((s) => s.idServicio === service.idServicio)
    ) {
      return {
        disabled: true,
        reason: `Ya ha seleccionado un servicio grupal. No puede seleccionar más servicios.`,
        isActive: false,
        hasActiveSubscription: false,
        daysLeft: null,
      };
    }

    if (
      isServiceTypeSelected(service.tipo) &&
      !selectedServices.some((s) => s.idServicio === service.idServicio)
    ) {
      return {
        disabled: true,
        reason: `Ya ha seleccionado un servicio de tipo ${service.tipo}`,
        isActive: false,
        hasActiveSubscription: false,
        daysLeft: null,
      };
    }

    const { active, subscription } = isServiceActiveForPerson(service);

    if (active && subscription) {
      const expirationDate = new Date(subscription.fechaVencimiento);
      const daysLeft = differenceInDays(expirationDate, new Date());
      return {
        disabled: false,
        reason: null,
        isActive: true,
        hasActiveSubscription: true,
        daysLeft,
      };
    }

    if (hasFutureSameType(service)) {
      return {
        disabled: true,
        reason: `Ya tiene una suscripción futura programada para ${service.tipo}`,
        isActive: false,
        hasActiveSubscription: false,
        daysLeft: null,
      };
    }

    return {
      disabled: false,
      reason: null,
      isActive: false,
      hasActiveSubscription: false,
      daysLeft: null,
    };
  };

  const isOneDayService = (service: Service): boolean => {
    return service.tipoDuracion === "dias" && service.cantidadDuracion === 1;
  };

  const isDateDisabledForNormalSelection = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    const oneWeekAgo = subDays(today, 7);
    const oneWeekFuture = addDays(today, 7);

    if (isBefore(d, oneWeekAgo)) {
      return true;
    }
    if (isAfter(d, oneWeekFuture)) {
      return true;
    }

    return false;
  };

  const isDateDisabled = (date: Date, _service: Service): boolean => {
    return isDateDisabledForNormalSelection(date);
  };

  const renderPersonRequirement = (requierePersonas: number) => {
    if (requierePersonas >= 2) {
      return (
        <div className="text-xs text-primary flex items-center gap-1 mt-1">
          <Users size={12} />
          Requiere {requierePersonas} personas para inscribirse (Servicio
          Grupal)
        </div>
      );
    }
    return null;
  };

  const getVisitsText = (visitas: number | null): string => {
    if (visitas === null) return "Ingresos ilimitados";
    return `${visitas} ${visitas === 1 ? "ingreso" : "ingresos"}`;
  };

  const isGroupService = (service: Service): boolean => {
    return service.requierePersonas > 1;
  };

  return (
    <Card className="border-border bg-card shadow-lg flex-1 flex flex-col min-h-0 max-h-[350px]">
      <CardHeader className="pb-3 border-b border-border shrink-0">
        <CardTitle className="text-lg text-foreground">
          Servicios Disponibles
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 overflow-auto flex-1 min-h-0 custom-scrollbar">
        <div className="space-y-4">
          {services.map((service) => {
            const isSelected = selectedServices.some(
              (s) => s.idServicio === service.idServicio
            );
            const {
              disabled: isDisabled,
              reason: disabledReason,
              hasActiveSubscription,
              daysLeft,
            } = getServiceStatus(service);
            const dates = serviceDates[service.idServicio];
            const oneDay = isOneDayService(service);
            const activeEndDate = getActiveSubscriptionEndDate(service.tipo);
            const isGrupal = isGroupService(service);

            const canScheduleFuture =
              hasActiveSubscription && daysLeft !== null && daysLeft <= 7;

            const isDateLocked = lockedServiceIds.includes(service.idServicio);

            return (
              <div
                key={`${service.idServicio}-${refreshKey}`}
                className="border border-border rounded-lg p-3 space-y-3 bg-muted/10"
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={`service-${service.idServicio}`}
                    checked={isSelected}
                    onCheckedChange={() => handleServiceToggle(service)}
                    disabled={isDisabled}
                    className="mt-1 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-black"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={`service-${service.idServicio}`}
                      className={cn(
                        "font-medium cursor-pointer text-foreground",
                        isDisabled && "opacity-60"
                      )}
                    >
                      {service.nombre}
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      {getVisitsText(service.visitas)} - Bs. {service.precio}
                      {service.multisucursal && (
                        <span className="ml-2 text-primary text-xs">
                          (Multisucursal)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-primary">
                      Duración: {service.cantidadDuracion}{" "}
                      {service.tipoDuracion === "dias" ? "días" : "meses"}
                    </div>

                    {renderPersonRequirement(service.requierePersonas)}

                    {hasActiveSubscription &&
                      !isDisabled &&
                      activeEndDate &&
                      !isGrupal && (
                        <div
                          className={cn(
                            "text-xs flex items-center gap-1 mt-1",
                            canScheduleFuture
                              ? "text-orange-500"
                              : "text-destructive"
                          )}
                        >
                          <AlertCircle size={12} />
                          {canScheduleFuture
                            ? `Tiene una suscripción activa (vence el ${format(
                                activeEndDate,
                                "dd/MM/yyyy"
                              )}) - Puede programar futuro`
                            : `Tiene una suscripción activa (vence el ${format(
                                activeEndDate,
                                "dd/MM/yyyy"
                              )}) - Su inscripción será reemplazada al confirmar`}
                        </div>
                      )}
                    {disabledReason && (
                      <div className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle size={12} />
                        {disabledReason}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && !isGrupal && (
                  <div className="ml-6 space-y-3">
                    {oneDay ? (
                      <div className="space-y-2">
                        <Label className="text-sm text-foreground">
                          Fecha del Servicio{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <div className="p-2 border border-border rounded-md bg-muted/30 text-sm text-foreground">
                          {format(new Date(), "PPP", { locale: es })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Este servicio es válido únicamente para el día de hoy
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-foreground flex items-center gap-1">
                              Fecha de Inicio{" "}
                              <span className="text-destructive">*</span>
                              {isDateLocked && (
                                <Lock size={12} className="text-orange-500" />
                              )}
                            </Label>

                            {isDateLocked ? (
                              <div className="p-2 border border-border rounded-md bg-muted/30 text-sm text-foreground h-10 flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-orange-500" />
                                {dates?.startDate
                                  ? format(dates.startDate, "PPP", {
                                      locale: es,
                                    })
                                  : "Fecha fijada"}
                              </div>
                            ) : (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal border-border bg-input text-foreground hover:bg-muted"
                                    disabled={disabled}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                    {dates?.startDate
                                      ? format(dates.startDate, "PPP", {
                                          locale: es,
                                        })
                                      : "Seleccionar fecha"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto p-0 bg-card border-border"
                                  align="start"
                                >
                                  <Calendar
                                    mode="single"
                                    selected={dates?.startDate}
                                    onSelect={(date) =>
                                      date &&
                                      onDateChange(service.idServicio, date)
                                    }
                                    disabled={(date) =>
                                      isDateDisabled(date, service)
                                    }
                                    locale={es}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            )}

                            {isDateLocked && (
                              <p className="text-xs text-orange-500">
                                La fecha fue fijada automáticamente y no puede
                                modificarse.
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm text-foreground">
                              Fecha de Vencimiento
                            </Label>
                            <div className="p-2 border border-border rounded-md bg-muted/30 text-sm text-foreground h-10 flex items-center">
                              {dates?.endDate
                                ? format(dates.endDate, "PPP", { locale: es })
                                : "Se calculará automáticamente"}
                            </div>
                          </div>
                        </div>
                        {!isDateLocked && (
                          <p className="text-xs text-muted-foreground">
                            Puede seleccionar fechas desde 1 semana atrás hasta
                            1 semana en el futuro
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {isSelected &&
                  isGrupal &&
                  renderPersonDates &&
                  renderPersonDates(service)}
              </div>
            );
          })}

          {services.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No hay servicios disponibles en esta sucursal
            </div>
          )}
        </div>
      </CardContent>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </Card>
  );
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

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

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
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

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