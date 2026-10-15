import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Plus,
  User,
  Bell,
  AlertTriangle,
  Fingerprint,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as AccessApi from "@/api/AccessApi";
import { AccessLog, ApiMember, ClientAccessResponse } from "@/api/AccessApi";
import { useUser } from "@/contexts/UserContext";
import { useRealtimeAccessLogs } from "@/hooks/useRealtimeAccessLogs";
import { useFingerprintIdentify } from "@/hooks/useFingerprintIdentify";
import { MemberSubscriptionDetails } from "./MemberSubscriptionDetails";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 50;

export function AccessControlAdmin() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "client" | "employee">(
    "all",
  );
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [members, setMembers] = useState<ApiMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<ApiMember | null>(null);
  const [isFingerReaded, setIsFingerReaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingButtons, setLoadingButtons] = useState<Record<string, boolean>>(
    {},
  );
  const [showDeudaDialog, setShowDeudaDialog] = useState(false);
  const [deudaInfo, setDeudaInfo] = useState<{
    memberName: string;
    montoPendiente: number;
    servicioNombre: string;
  } | null>(null);
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);
  const [selectedMemberForDetails, setSelectedMemberForDetails] =
    useState<ApiMember | null>(null);

  const [successHighlightIds, setSuccessHighlightIds] = useState<Set<string>>(
    new Set(),
  );
  const highlightTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // ============================================
  // Buscador discreto de registros (lupa)
  // ============================================
  const [showLogSearch, setShowLogSearch] = useState(false);
  const [logSearchTerm, setLogSearchTerm] = useState("");
  const logSearchInputRef = useRef<HTMLInputElement | null>(null);

  // ============================================
  // Paginación
  // ============================================
  const [currentPage, setCurrentPage] = useState(1);

  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !user.idsucursal) {
      console.warn(
        "⚠️ Usuario sin idsucursal - los filtros por sucursal no funcionarán"
      );
      toast({
        title: "Advertencia",
        description:
          "Tu usuario no tiene sucursal asignada. Los filtros pueden no funcionar correctamente.",
        variant: "destructive",
      });
    }
  }, [user]);

  const { newLogs, clearNewLogs } = useRealtimeAccessLogs(user?.idsucursal);

  const allLogs = [
    ...newLogs,
    ...accessLogs.filter(
      (log) => !newLogs.some((newLog) => newLog.id === log.id),
    ),
  ];

  // El ID del registro MÁS RECIENTE (el primero en la lista)
  const mostRecentLogId = allLogs.length > 0 ? allLogs[0].id : null;

  // ============================================
  // Filtrado por búsqueda de logs (frontend, solo hoy)
  // - Soporta múltiples palabras (todas deben aparecer)
  // - Normaliza tildes y espacios múltiples
  // - Busca en nombre, CI y detalle
  // ============================================
  const filteredLogs = useMemo(() => {
    const rawTerm = logSearchTerm.trim().toLowerCase();
    if (!rawTerm) return allLogs;

    const normalize = (s: string) =>
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const termWords = normalize(rawTerm).split(" ").filter(Boolean);
    if (termWords.length === 0) return allLogs;

    return allLogs.filter((log) => {
      const haystack = normalize(
        `${log.memberName || ""} ${log.ci || ""} ${log.detail || ""}`
      );

      // Todas las palabras del término deben aparecer en el haystack
      return termWords.every((word) => haystack.includes(word));
    });
  }, [allLogs, logSearchTerm]);

  // ============================================
  // Paginación
  // ============================================
  const totalPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / PAGE_SIZE),
  );

  // Reset page cuando cambian filtros o búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, logSearchTerm, searchTerm]);

  // Si la página actual excede el total, ajustar
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  useEffect(() => {
    loadAccessLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  useEffect(() => {
    return () => {
      Object.values(highlightTimeoutsRef.current).forEach((t) =>
        clearTimeout(t),
      );
    };
  }, []);

  // ============================================
  // Focus al input cuando se abre el buscador
  // ============================================
  useEffect(() => {
    if (showLogSearch) {
      setTimeout(() => logSearchInputRef.current?.focus(), 50);
    } else {
      setLogSearchTerm("");
    }
  }, [showLogSearch]);

  const loadAccessLogs = async () => {
    try {
      setIsLoading(true);
      // Pedimos 500 para tener todo el día en memoria y paginar en front
      const logs = await AccessApi.getAccessLogs({
        typeFilter,
        limit: 500,
        branchId: user?.idsucursal,
      });
      setAccessLogs(logs);
      clearNewLogs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchMembers = async () => {
    if (searchTerm.length > 1) {
      try {
        setIsLoading(true);
        const foundMembers = await AccessApi.searchMembers(
          searchTerm,
          typeFilter,
          user?.idsucursal,
        );

        setMembers(foundMembers);

        if (isFingerReaded && foundMembers.length > 0) {
          selectDefaultService(foundMembers);
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      setMembers([]);
    }
  };

  const selectDefaultService = (foundMembers: ApiMember[]) => {
    if (foundMembers.length === 1) {
      const member = foundMembers[0];
      switch (member.memberType) {
        case "client":
          if (member.services.length === 1)
            handleRegisterAccess(member, member.services[0]);
          break;
        case "employee":
          if (member.employeeInfo?.status === "in")
            handleEmployeeCheckOut(member);
          else if (member.employeeInfo?.status === "out")
            handleEmployeeCheckIn(member);
          break;
        default:
          console.log("tipo de usuario desconocido");
          break;
      }
    }
    setIsFingerReaded(false);
  };

  useEffect(() => {
    if (!user?.idsucursal) {
      console.warn("Sin sucursal, no se busca");
      return;
    }
    const delayDebounce = setTimeout(() => {
      searchMembers();
    }, 300);

    return () => clearTimeout(delayDebounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, typeFilter, user?.idsucursal]);

  useFingerprintIdentify({
    onVerified: (data) => {
      setSearchTerm(data);
      setIsFingerReaded(true);
    },
  });

  const startButtonLoading = (buttonId: string) => {
    setLoadingButtons((prev) => ({ ...prev, [buttonId]: true }));
  };

  const stopButtonLoading = (buttonId: string) => {
    setLoadingButtons((prev) => ({ ...prev, [buttonId]: false }));
  };

  const isButtonLoading = (buttonId: string) => {
    return loadingButtons[buttonId] || false;
  };

  const highlightSuccessLog = (logId: string) => {
    setSuccessHighlightIds((prev) => new Set(prev).add(logId));

    if (highlightTimeoutsRef.current[logId]) {
      clearTimeout(highlightTimeoutsRef.current[logId]);
    }

    highlightTimeoutsRef.current[logId] = setTimeout(() => {
      setSuccessHighlightIds((prev) => {
        const next = new Set(prev);
        next.delete(logId);
        return next;
      });
      delete highlightTimeoutsRef.current[logId];
    }, 3000);
  };

  const prependLog = (log: AccessLog) => {
    setAccessLogs((prev) => {
      if (prev.some((l) => l.id === log.id)) return prev;
      return [log, ...prev];
    });

    if (log.status === "success") {
      highlightSuccessLog(log.id);
    }
  };

  const handleEmployeeCheckIn = async (member: ApiMember) => {
    if (!member.employeeInfo) return;

    const buttonId = `checkin-${member.id}`;

    if (isButtonLoading(buttonId)) return;

    try {
      startButtonLoading(buttonId);
      const branchId = user?.idsucursal;
      const userId = user?.idusuario;

      if (!branchId || !userId) {
        throw new Error("No se pudo identificar la sucursal o usuario");
      }

      const result = await AccessApi.registerEmployeeCheckIn(
        parseInt(member.employeeInfo.id),
        branchId,
        userId,
      );

      if (result.denied) {
        toast({
          title: "Acceso Denegado",
          description: `${member.name} - ${result.message}`,
          variant: "destructive",
        });

        if (result.log) {
          prependLog(result.log);
        }

        setSelectedMember(null);
        setSearchTerm("");
        return;
      }

      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id && m.employeeInfo
            ? {
                ...m,
                employeeInfo: {
                  ...m.employeeInfo,
                  status: "in",
                  lastCheckIn: new Date().toLocaleString(),
                },
              }
            : m,
        ),
      );

      toast({
        title: result.isLate ? "Entrada Tardía" : "Entrada Registrada",
        description: `${member.name} - ${result.message}`,
        variant: result.isLate ? "destructive" : "default",
      });

      setSelectedMember(null);
      setSearchTerm("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      stopButtonLoading(buttonId);
    }
  };

  const handleEmployeeCheckOut = async (member: ApiMember) => {
    if (!member.employeeInfo) return;

    const buttonId = `checkout-${member.id}`;

    if (isButtonLoading(buttonId)) return;

    try {
      startButtonLoading(buttonId);
      const branchId = user?.idsucursal;
      const userId = user?.idusuario;

      if (!branchId || !userId) {
        throw new Error("No se pudo identificar la sucursal o usuario");
      }

      const result = await AccessApi.registerEmployeeCheckOut(
        parseInt(member.employeeInfo.id),
        branchId,
        userId,
      );

      if (result.denied) {
        toast({
          title: "Acceso Denegado",
          description: `${member.name} - ${result.message}`,
          variant: "destructive",
        });

        if (result.log) {
          prependLog(result.log);
        }

        setSelectedMember(null);
        setSearchTerm("");
        return;
      }

      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id && m.employeeInfo
            ? {
                ...m,
                employeeInfo: {
                  ...m.employeeInfo,
                  status: "out",
                  lastCheckOut: new Date().toLocaleString(),
                },
              }
            : m,
        ),
      );

      toast({
        title: "Salida Registrada",
        description: `${member.name} - ${result.message}`,
      });

      setSelectedMember(null);
      setSearchTerm("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      stopButtonLoading(buttonId);
    }
  };

  const handleRegisterAccess = async (member: ApiMember, service?: any) => {
    if (member.memberType === "client") {
      if (!service) {
        toast({
          title: "Error",
          description: "Debe seleccionar un servicio para el cliente",
          variant: "destructive",
        });
        return;
      }

      const buttonId = `access-${member.id}-${service.id}`;

      if (isButtonLoading(buttonId)) return;

      try {
        startButtonLoading(buttonId);
        const branchId = user?.idsucursal;
        const userId = user?.idusuario;

        if (!branchId || !userId) {
          throw new Error("No se pudo identificar la sucursal o usuario");
        }

        const result: ClientAccessResponse =
          await AccessApi.registerClientAccess(
            parseInt(member.id),
            parseInt(service.id),
            branchId,
            userId,
          );

        if (result.success) {
          setMembers((prev) =>
            prev.map((m) =>
              m.id === member.id
                ? {
                    ...m,
                    services: m.services.map((s) =>
                      s.id === service.id
                        ? { ...s, visits: result.remainingVisits ?? s.visits }
                        : s,
                    ),
                  }
                : m,
            ),
          );

          toast({
            title: "Acceso Registrado",
            description: `${member.name} - ${service.name}. ${result.message}`,
          });

          if (result.tieneDeuda && result.deudaInfo) {
            setDeudaInfo({
              memberName: member.name,
              montoPendiente: result.deudaInfo.montoPendiente,
              servicioNombre: result.deudaInfo.servicioNombre,
            });
            setTimeout(() => {
              setShowDeudaDialog(true);
            }, 500);
          }
        } else {
          toast({
            title: "Acceso Denegado",
            description: result.message,
            variant: "destructive",
          });
        }

        if (result.log) {
          prependLog(result.log);
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        stopButtonLoading(buttonId);
      }
    } else if (member.memberType === "employee") {
      // ============================================================
      // 🔒 RESTRICCIÓN RE-ACTIVADA: empleados solo por huella
      // ============================================================
      toast({
        title: "Acceso no permitido",
        description:
          "Los empleados solo pueden registrar acceso mediante huella digital",
        variant: "destructive",
      });
      // ============================================================
    }

    setSelectedMember(null);
    setSearchTerm("");
  };

  const displayVisits = (service: any) => {
    if (service.visits === null) {
      return "Ilimitado";
    }
    return service.visits;
  };

  const isServiceExpired = (service: any) => {
    return service.status === "expired";
  };

  const handleViewDetails = (member: ApiMember | null) => {
    if (member) {
      setSelectedMemberForDetails(member);
      setShowSubscriptionDetails(true);
    }
  };

  const handleEnrollMember = (member: ApiMember) => {
    const nameParts = member.name.split(" ");
    const nombres = nameParts[0] || "";
    const apellidos = nameParts.slice(1).join(" ") || "";

    localStorage.setItem(
      "selectedMemberForEnrollment",
      JSON.stringify({
        id: parseInt(member.id),
        nombres: nombres,
        apellidos: apellidos,
        ci: member.ci,
        telefono: "",
      })
    );

    navigate("/admin/register");
  };

  const findMemberFromLog = async (log: AccessLog) => {
    try {
      const searchQuery = log.ci || log.memberName;
      const foundMembers = await AccessApi.searchMembers(
        searchQuery,
        "all",
        user?.idsucursal,
      );

      const member = foundMembers.find(
        (m) => m.name === log.memberName || m.ci === log.ci
      );

      if (member) {
        handleViewDetails(member);
      } else {
        toast({
          title: "Cliente no encontrado",
          description: `No se pudo encontrar la información de ${log.memberName}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar la información del cliente",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const savedMember = localStorage.getItem("selectedMemberForEnrollment");
    if (savedMember) {
      const member = JSON.parse(savedMember);
      const foundMember = members.find((m) => m.id === member.id);
      if (foundMember) {
        setSearchTerm(foundMember.ci || foundMember.name);
      } else if (member.ci) {
        setSearchTerm(member.ci);
      }
      localStorage.removeItem("selectedMemberForEnrollment");
    }
  }, [members]);

  useEffect(() => {
    if (newLogs.length > 0) {
      newLogs.forEach((log) => {
        if (log.status === "success") {
          highlightSuccessLog(log.id);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newLogs]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary">
          Control de Acceso
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Monitorea todos los accesos al gimnasio en tiempo real
        </p>
      </div>

      <Card className="gym-card">
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            Registro de Accesos
            {newLogs.length > 0 && (
              <Badge variant="destructive" className="animate-pulse text-xs">
                <Bell className="h-3 w-3 mr-1" />
                {newLogs.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          {/* Filtros - Responsive */}
          <div className="flex flex-col gap-3 mb-4 md:mb-6">
            {/* Buscador de miembros */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o CI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            {/* Filtros de tipo + actualizar + lupa búsqueda de logs */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1.5 flex-1 min-w-0">
                <Button
                  variant={typeFilter === "all" ? "default" : "outline"}
                  onClick={() => setTypeFilter("all")}
                  size="sm"
                  className="text-xs px-2.5 h-8 flex-1 sm:flex-none"
                >
                  Todos
                </Button>
                <Button
                  variant={typeFilter === "client" ? "default" : "outline"}
                  onClick={() => setTypeFilter("client")}
                  size="sm"
                  className="text-xs px-2.5 h-8 flex-1 sm:flex-none"
                >
                  Clientes
                </Button>
                <Button
                  variant={typeFilter === "employee" ? "default" : "outline"}
                  onClick={() => setTypeFilter("employee")}
                  size="sm"
                  className="text-xs px-2.5 h-8 flex-1 sm:flex-none"
                >
                  Empleados
                </Button>
              </div>

              {/* Lupa búsqueda de registros */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant={showLogSearch ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowLogSearch((v) => !v)}
                  className="h-8 w-8 p-0 flex-shrink-0"
                  title="Buscar en registros de acceso"
                >
                  <Search className="h-3.5 w-3.5" />
                </Button>
                {showLogSearch && (
                  <Input
                    ref={logSearchInputRef}
                    placeholder="Buscar en registros de hoy..."
                    value={logSearchTerm}
                    onChange={(e) => setLogSearchTerm(e.target.value)}
                    className="h-8 w-[180px] sm:w-[220px] text-xs"
                  />
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={loadAccessLogs}
                disabled={isLoading}
                className="h-8 flex-shrink-0"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""} sm:mr-2`}
                />
                <span className="hidden sm:inline">
                  {isLoading ? "Actualizando..." : "Actualizar"}
                </span>
              </Button>
            </div>
          </div>

          {/* Nota: empleados solo por huella */}
          {members.some((member) => member.memberType === "employee") && (
            <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs md:text-sm text-blue-700">
              <div className="flex items-start gap-2">
                <Fingerprint className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Nota:</strong> Los empleados solo pueden registrar
                  acceso mediante huella digital
                </span>
              </div>
            </div>
          )}

          {/* Miembros encontrados */}
          {members.length > 0 && (
            <div className="mb-4 md:mb-6 p-3 md:p-4 border rounded-lg bg-muted/50">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Registrar Acceso
              </h3>
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 p-3 bg-background rounded border"
                  >
                    {/* Fila 1: Info + Botones alineados a la derecha */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm md:text-base">
                          {member.name}
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground">
                          CI: {member.ci}
                        </div>
                        {member.memberType === "client" &&
                          member.services.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-1">
                              {member.services.map((service) => (
                                <span
                                  key={service.id}
                                  className={
                                    isServiceExpired(service)
                                      ? "text-rose-700 dark:text-rose-400 line-through"
                                      : "text-yellow-600 dark:text-yellow-400"
                                  }
                                >
                                  {service.name}: {displayVisits(service)}{" "}
                                  {service.visits === null ? "" : "visitas"}
                                  {isServiceExpired(service)
                                    ? " (Vencido)"
                                    : service.status === "active"
                                    ? " (Activo)"
                                    : ""}
                                </span>
                              ))}
                            </div>
                          )}
                        {member.memberType === "employee" &&
                          member.employeeInfo && (
                            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                              <span>
                                Rol:{" "}
                                <span className="font-medium capitalize">
                                  {member.employeeInfo.rol}
                                </span>
                              </span>
                              <span>
                                Estado:{" "}
                                <span
                                  className={
                                    member.employeeInfo.status === "in"
                                      ? "text-green-600"
                                      : "text-gray-600"
                                  }
                                >
                                  {member.employeeInfo.status === "in"
                                    ? "Presente"
                                    : "Ausente"}
                                </span>
                              </span>
                              {member.employeeInfo.lastCheckIn && (
                                <span>
                                  Entrada: {member.employeeInfo.lastCheckIn}
                                </span>
                              )}
                              {member.employeeInfo.lastCheckOut && (
                                <span>
                                  Salida: {member.employeeInfo.lastCheckOut}
                                </span>
                              )}
                              {member.employeeInfo.rol !== "admin" &&
                                !member.employeeInfo.trabajaHoy && (
                                  <span className="text-rose-600 font-medium">
                                    ⚠️ Hoy no trabaja
                                  </span>
                                )}
                            </div>
                          )}
                      </div>

                      {/* Botones de servicio (alineados a la derecha en desktop) */}
                      <div className="flex flex-wrap gap-2 sm:justify-end sm:flex-shrink-0">
                        {member.memberType === "client" ? (
                          member.services.length > 0 ? (
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                              {member.services.map((service) => {
                                const buttonId = `access-${member.id}-${service.id}`;
                                const isLoading = isButtonLoading(buttonId);
                                const isExpired = isServiceExpired(service);

                                return (
                                  <Button
                                    key={service.id}
                                    size="sm"
                                    className={`text-xs ${
                                      isExpired
                                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                                        : "bg-yellow-500 hover:bg-yellow-600 text-black"
                                    }`}
                                    variant="default"
                                    onClick={() =>
                                      handleRegisterAccess(member, service)
                                    }
                                    disabled={isLoading}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    {isLoading
                                      ? "Procesando..."
                                      : `${service.name} (${displayVisits(service)})`}
                                  </Button>
                                );
                              })}
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled
                              className="w-full sm:w-auto"
                            >
                              Sin servicios activos
                            </Button>
                          )
                        ) : (
                          // ============================================================
                          // 🔒 EMPLEADOS: solo huella digital (botones deshabilitados)
                          // ============================================================
                          <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={
                                  member.employeeInfo?.status === "in"
                                    ? "outline"
                                    : "default"
                                }
                                disabled
                                title="Solo disponible mediante huella digital"
                                className="flex-1 text-xs"
                              >
                                <Fingerprint className="h-3 w-3 mr-1" />
                                Entrada
                              </Button>
                              <Button
                                size="sm"
                                variant={
                                  member.employeeInfo?.status === "out"
                                    ? "outline"
                                    : "secondary"
                                }
                                disabled
                                title="Solo disponible mediante huella digital"
                                className="flex-1 text-xs"
                              >
                                <Fingerprint className="h-3 w-3 mr-1" />
                                Salida
                              </Button>
                            </div>
                            <div className="text-xs text-blue-600 text-center">
                              Solo por huella digital
                            </div>
                          </div>
                          // ============================================================
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchTerm.length > 0 && members.length === 0 && !isLoading && (
            <div className="mb-4 md:mb-6 p-4 border rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
              No se encontraron miembros con ese nombre o CI
            </div>
          )}

          {/* Tabla Desktop / Cards Mobile */}
          <div className="rounded-md border">
            {/* Vista Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha y Hora</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && accessLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        Cargando registros...
                      </TableCell>
                    </TableRow>
                  ) : paginatedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        {logSearchTerm
                          ? "No se encontraron registros con ese criterio"
                          : "No hay registros de acceso hoy"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLogs.map((log) => {
                      const isDenied = log.status === "denied";
                      // Solo el registro MÁS RECIENTE se pinta verde
                      const isMostRecent =
                        log.id === mostRecentLogId && log.status === "success";
                      const isSuccessHighlighted =
                        successHighlightIds.has(log.id) && isMostRecent;

                      return (
                        <TableRow
                          key={log.id}
                          className={`
                            transition-colors duration-700
                            ${
                              isDenied
                                ? "bg-rose-800 hover:bg-rose-900 dark:bg-rose-950 dark:hover:bg-rose-900 text-white"
                                : isSuccessHighlighted
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "hover:bg-muted/50"
                            }
                          `}
                        >
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              {log.timestamp}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {log.memberName}
                            {log.ci && (
                              <div
                                className={`text-xs ${
                                  isDenied
                                    ? "text-rose-200"
                                    : isSuccessHighlighted
                                    ? "text-green-100"
                                    : "text-muted-foreground"
                                }`}
                              >
                                CI: {log.ci}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                log.memberType === "client"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {log.memberType === "client"
                                ? "Cliente"
                                : "Empleado"}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={
                              isDenied
                                ? "text-rose-100"
                                : isSuccessHighlighted
                                ? "text-green-50"
                                : ""
                            }
                          >
                            {log.detail}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  log.status === "success"
                                    ? "default"
                                    : "destructive"
                                }
                                className={
                                  log.status === "denied"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : ""
                                }
                              >
                                {log.status === "success"
                                  ? "Exitoso"
                                  : "Rechazado"}
                              </Badge>
                              {log.memberType === "client" && (
                                <button
                                  onClick={() => findMemberFromLog(log)}
                                  className={`transition-colors ${
                                    isSuccessHighlighted
                                      ? "text-green-100 hover:text-white"
                                      : "text-muted-foreground hover:text-primary"
                                  }`}
                                  title="Ver detalles del cliente"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Vista Mobile - Cards */}
            <div className="md:hidden divide-y">
              {isLoading && accessLogs.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  Cargando registros...
                </div>
              ) : paginatedLogs.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  {logSearchTerm
                    ? "No se encontraron registros con ese criterio"
                    : "No hay registros de acceso hoy"}
                </div>
              ) : (
                paginatedLogs.map((log) => {
                  const isDenied = log.status === "denied";
                  const isMostRecent =
                    log.id === mostRecentLogId && log.status === "success";
                  const isSuccessHighlighted =
                    successHighlightIds.has(log.id) && isMostRecent;

                  return (
                    <div
                      key={log.id}
                      className={`
                        p-3 transition-colors duration-700
                        ${
                          isDenied
                            ? "bg-rose-800 text-white"
                            : isSuccessHighlighted
                            ? "bg-green-600 text-white"
                            : "hover:bg-muted/50"
                        }
                      `}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {log.memberName}
                          </div>
                          {log.ci && (
                            <div
                              className={`text-xs ${
                                isDenied
                                  ? "text-rose-200"
                                  : isSuccessHighlighted
                                  ? "text-green-100"
                                  : "text-muted-foreground"
                              }`}
                            >
                              CI: {log.ci}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant={
                            log.status === "success" ? "default" : "destructive"
                          }
                          className={`text-[10px] flex-shrink-0 ${
                            log.status === "denied"
                              ? "bg-red-600 hover:bg-red-700"
                              : ""
                          }`}
                        >
                          {log.status === "success" ? "Exitoso" : "Rechazado"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge
                          variant={
                            log.memberType === "client" ? "default" : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {log.memberType === "client" ? "Cliente" : "Empleado"}
                        </Badge>
                        <span className="text-xs font-mono opacity-90">
                          {log.timestamp}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={`text-xs flex-1 min-w-0 ${
                            isDenied
                              ? "text-rose-100"
                              : isSuccessHighlighted
                              ? "text-green-50"
                              : "text-muted-foreground"
                          }`}
                        >
                          {log.detail}
                        </div>
                        {log.memberType === "client" && (
                          <button
                            onClick={() => findMemberFromLog(log)}
                            className={`flex-shrink-0 p-1.5 rounded transition-colors ${
                              isSuccessHighlighted
                                ? "text-green-100 hover:text-white"
                                : "text-muted-foreground hover:text-primary"
                            }`}
                            title="Ver detalles del cliente"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Paginación */}
          {filteredLogs.length > PAGE_SIZE && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <div className="text-xs sm:text-sm text-muted-foreground">
                Mostrando{" "}
                <span className="font-medium text-foreground">
                  {(currentPage - 1) * PAGE_SIZE + 1}
                </span>{" "}
                -{" "}
                <span className="font-medium text-foreground">
                  {Math.min(currentPage * PAGE_SIZE, filteredLogs.length)}
                </span>{" "}
                de{" "}
                <span className="font-medium text-foreground">
                  {filteredLogs.length}
                </span>{" "}
                registros
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.max(1, p - 1))
                  }
                  disabled={currentPage === 1}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Anterior</span>
                </Button>
                <div className="text-xs sm:text-sm text-foreground px-2">
                  Página{" "}
                  <span className="font-medium">{currentPage}</span> de{" "}
                  <span className="font-medium">{totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="h-8"
                >
                  <span className="hidden sm:inline mr-1">Siguiente</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeudaDialog} onOpenChange={setShowDeudaDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 text-base md:text-lg">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              Cliente con Deuda Pendiente
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm md:text-base">
              {deudaInfo && (
                <div className="space-y-3">
                  <p>
                    El cliente <strong>"{deudaInfo.memberName}"</strong> tiene
                    una deuda pendiente de:
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 md:p-4">
                    <p className="text-center text-xl md:text-2xl font-bold text-amber-700">
                      {deudaInfo.montoPendiente.toFixed(2)} Bs.
                    </p>
                    <p className="text-center text-xs md:text-sm text-amber-600 mt-2">
                      Por el servicio:{" "}
                      <strong>{deudaInfo.servicioNombre}</strong>
                    </p>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground mt-2">
                    Recuerde informar al cliente sobre su deuda pendiente.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowDeudaDialog(false)}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Aceptar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MemberSubscriptionDetails
        open={showSubscriptionDetails}
        onOpenChange={setShowSubscriptionDetails}
        member={selectedMemberForDetails}
        onEnroll={handleEnrollMember}
        branchId={user?.idsucursal}
      />
    </div>
  );
}