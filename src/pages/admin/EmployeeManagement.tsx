import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TimePicker } from "@/components/ui/time-picker";
import { useToast } from "@/hooks/use-toast";
import {
  Fingerprint,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  Clock,
  Plus,
  X,
  Filter,
  Building2,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toggleEmployeeStatus,
  getBranches,
  getBoxes,
  CARGOS,
  ROLES_CON_ACCESO,
  ROLES_SIN_HORARIO,
  DIAS_MAP,
  type Employee,
  type EmployeeRequest,
  type Branch,
  type Box,
  type HorarioConSucursal,
  type HorarioDia,
  type HorarioVisualizacion,
} from "@/api/EmployeeApi";
import { useFingerprintEnroll } from "@/hooks/userFingerprintEnroll";

// ============================================
// TIPOS DE CONFIRMACIÓN
// ============================================
type ConfirmActionType = "create" | "update" | "delete";

interface ConfirmState {
  open: boolean;
  action: ConfirmActionType | null;
  employee: Employee | null;
}

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [filteredBoxes, setFilteredBoxes] = useState<Box[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cargoFilter, setCargoFilter] = useState<string>("all");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isRegisteringFingerprint, setIsRegisteringFingerprint] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isScanning, setIsScanning] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // ✅ Estado para el diálogo de confirmación (crear / editar / eliminar)
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    action: null,
    employee: null,
  });

  // ✅ Bloquea los botones mientras se ejecuta la operación
  const [isConfirming, setIsConfirming] = useState(false);

  // Estado para el modal de horarios
  const [horariosModalOpen, setHorariosModalOpen] = useState(false);
  const [horariosToShow, setHorariosToShow] = useState<HorarioVisualizacion[]>([]);

  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    ci: "",
    telefono: "",
    cargo: "",
    sucursal_id: 0,
    caja_id: 0,
    registrarHuella: true,
    usuario: "",
    contraseña: "",
  });

  const [horarios, setHorarios] = useState<HorarioDia[]>([
    { dia_semana: 1, dia_nombre: "Lunes", horarios: [] },
    { dia_semana: 2, dia_nombre: "Martes", horarios: [] },
    { dia_semana: 3, dia_nombre: "Miércoles", horarios: [] },
    { dia_semana: 4, dia_nombre: "Jueves", horarios: [] },
    { dia_semana: 5, dia_nombre: "Viernes", horarios: [] },
    { dia_semana: 6, dia_nombre: "Sábado", horarios: [] },
    { dia_semana: 7, dia_nombre: "Domingo", horarios: [] },
  ]);

  const { toast } = useToast();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (formData.sucursal_id > 0 && formData.cargo === "recepcionista") {
      const filtered = boxes.filter(
        (box) => box.sucursal_id === formData.sucursal_id && box.estado === 1
      );
      setFilteredBoxes(filtered);
    } else {
      setFilteredBoxes([]);
    }
  }, [formData.sucursal_id, boxes, formData.cargo]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [employeesData, branchesData, boxesData] = await Promise.all([
        getEmployees(),
        getBranches(),
        getBoxes(),
      ]);
      setEmployees(employeesData);
      setBranches(branchesData);
      setBoxes(boxesData);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // FILTRADO
  // ============================================
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      `${employee.nombres} ${employee.apellidos}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      employee.ci.includes(searchTerm) ||
      employee.telefono.includes(searchTerm) ||
      employee.cargo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCargo = cargoFilter === "all" || employee.cargo === cargoFilter;
    const matchesEstado =
      estadoFilter === "all" ||
      (estadoFilter === "active" && employee.activo) ||
      (estadoFilter === "inactive" && !employee.activo);

    return matchesSearch && matchesCargo && matchesEstado;
  });

  // ============================================
  // PAGINACIÓN
  // ============================================
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ============================================
  // VER HORARIOS
  // ============================================
  const verHorarios = (employee: Employee) => {
    if (!employee.horarios || employee.horarios.length === 0) {
      toast({
        title: "Información",
        description: "Este trabajador no tiene horarios asignados",
      });
      return;
    }

    const porSucursal: Record<
      string,
      Record<number, { hora_ingreso: string; hora_salida: string }[]>
    > = {};

    employee.horarios.forEach((h) => {
      const sucursalKey = h.sucursal_nombre || employee.sucursal || "Sin sucursal";
      if (!porSucursal[sucursalKey]) {
        porSucursal[sucursalKey] = {};
      }
      if (!porSucursal[sucursalKey][h.dia_semana]) {
        porSucursal[sucursalKey][h.dia_semana] = [];
      }
      porSucursal[sucursalKey][h.dia_semana].push({
        hora_ingreso: h.hora_ingreso,
        hora_salida: h.hora_salida,
      });
    });

    const horariosData: HorarioVisualizacion[] = Object.entries(porSucursal).map(
      ([sucursalNombre, dias]) => ({
        sucursal_nombre: sucursalNombre,
        horarios: Object.entries(dias).map(([dia, lista]) => ({
          dia_nombre: DIAS_MAP[Number(dia)],
          horarios: lista,
        })),
      })
    );

    setHorariosToShow(horariosData);
    setHorariosModalOpen(true);
  };

  // ============================================
  // RESET
  // ============================================
  const resetForm = () => {
    setFormData({
      nombres: "",
      apellidos: "",
      ci: "",
      telefono: "",
      cargo: "",
      sucursal_id: 0,
      caja_id: 0,
      registrarHuella: true,
      usuario: "",
      contraseña: "",
    });

    setHorarios([
      { dia_semana: 1, dia_nombre: "Lunes", horarios: [] },
      { dia_semana: 2, dia_nombre: "Martes", horarios: [] },
      { dia_semana: 3, dia_nombre: "Miércoles", horarios: [] },
      { dia_semana: 4, dia_nombre: "Jueves", horarios: [] },
      { dia_semana: 5, dia_nombre: "Viernes", horarios: [] },
      { dia_semana: 6, dia_nombre: "Sábado", horarios: [] },
      { dia_semana: 7, dia_nombre: "Domingo", horarios: [] },
    ]);

    setFormErrors({});
    setEditingEmployee(null);
  };

  // ============================================
  // HORARIOS
  // ============================================
  const addHorarioToDay = (diaSemana: number) => {
    setHorarios((prev) =>
      prev.map((horario) =>
        horario.dia_semana === diaSemana
          ? {
              ...horario,
              horarios: [
                ...horario.horarios,
                {
                  id: Date.now().toString() + Math.random(),
                  dia_semana: diaSemana,
                  dia_nombre: horario.dia_nombre,
                  hora_ingreso: "09:00",
                  hora_salida: "17:00",
                  sucursal_id: formData.sucursal_id || null,
                },
              ],
            }
          : horario
      )
    );
  };

  const removeHorarioFromDay = (diaSemana: number, horarioId: string) => {
    setHorarios((prev) =>
      prev.map((horario) =>
        horario.dia_semana === diaSemana
          ? {
              ...horario,
              horarios: horario.horarios.filter((h) => h.id !== horarioId),
            }
          : horario
      )
    );
  };

  const handleHorarioChange = (
    diaSemana: number,
    horarioId: string,
    field: "hora_ingreso" | "hora_salida",
    value: string
  ) => {
    setHorarios((prev) =>
      prev.map((horario) =>
        horario.dia_semana === diaSemana
          ? {
              ...horario,
              horarios: horario.horarios.map((h) =>
                h.id === horarioId ? { ...h, [field]: value } : h
              ),
            }
          : horario
      )
    );
  };

  // ============================================
  // VALIDACIÓN
  // ============================================
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.nombres.trim()) errors.nombres = "Los nombres son obligatorios";
    if (!formData.apellidos.trim()) errors.apellidos = "Los apellidos son obligatorios";

    if (!formData.ci.trim()) {
      errors.ci = "La cédula de identidad es obligatoria";
    } else if (formData.ci.length < 7 || formData.ci.length > 12) {
      errors.ci = "La cédula debe tener entre 7 y 12 caracteres";
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.ci)) {
      errors.ci = "La cédula solo puede contener números y letras";
    }

    if (!formData.telefono.trim()) {
      errors.telefono = "El teléfono es obligatorio";
    } else if (formData.telefono.length !== 8) {
      errors.telefono = "El teléfono debe tener exactamente 8 dígitos";
    } else if (!/^\d+$/.test(formData.telefono)) {
      errors.telefono = "El teléfono solo puede contener números";
    }

    if (!formData.cargo) errors.cargo = "El cargo es obligatorio";

    if (
      formData.cargo === "limpieza" ||
      formData.cargo === "entrenador" ||
      formData.cargo === "lactobar"
    ) {
      if (!formData.sucursal_id) errors.sucursal_id = "La sucursal es obligatoria";
      const tieneHorarios = horarios.some((dia) => dia.horarios.length > 0);
      if (!tieneHorarios) {
        errors.horarios = "Debe agregar al menos un horario";
      }
    }

    if (formData.cargo === "recepcionista" && !formData.caja_id) {
      errors.caja_id = "Debe seleccionar una caja";
    }

    if (ROLES_CON_ACCESO.includes(formData.cargo)) {
      if (!formData.usuario.trim()) errors.usuario = "El usuario es obligatorio";
      if (!editingEmployee && !formData.contraseña.trim())
        errors.contraseña = "La contraseña es obligatoria";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================
  // FINGERPRINT
  // ============================================
  const { startEnroll } = useFingerprintEnroll({
    onSuccess: () => {
      setIsRegisteringFingerprint(false);
      setIsScanning(false);
      setIsScannerOpen(false);
      loadData();
    },
  });

  // ============================================
  // GUARDAR (abre el diálogo de confirmación)
  // ============================================
  const handleSave = () => {
    if (!validateForm()) return;

    setConfirmState({
      open: true,
      action: editingEmployee ? "update" : "create",
      employee: editingEmployee,
    });
  };

  // ============================================
  // EJECUTAR GUARDADO (después de confirmar)
  // ============================================
  const executeSave = async () => {
    // 🟢 FIX: usar el ID del EMPLEADO (no el persona_id)
    //    porque el endpoint /employees/:id/register-fingerprint
    //    espera un empleado_id.
    let employeeIdToEnroll = "";
    setIsConfirming(true);

    // ✅ Capturar ANTES de resetForm(), porque resetForm() lo vuelve a true
    const shouldEnrollFingerprint = formData.registrarHuella;

    try {
      const horariosToSend: HorarioConSucursal[] = [];

      if (!ROLES_SIN_HORARIO.includes(formData.cargo)) {
        for (const dia of horarios) {
          for (const horario of dia.horarios) {
            if (horario.hora_ingreso && horario.hora_salida) {
              horariosToSend.push({
                dia_semana: dia.dia_semana,
                hora_ingreso: horario.hora_ingreso,
                hora_salida: horario.hora_salida,
                sucursal_id: horario.sucursal_id || formData.sucursal_id,
              });
            }
          }
        }
      }

      const employeeRequest: EmployeeRequest = {
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        ci: formData.ci,
        telefono: formData.telefono,
        cargo: formData.cargo,
        sucursal_id: ROLES_SIN_HORARIO.includes(formData.cargo)
          ? null
          : formData.sucursal_id,
        caja_id: formData.cargo === "recepcionista" ? formData.caja_id : null,
        horarios: horariosToSend,
        username: ROLES_CON_ACCESO.includes(formData.cargo)
          ? formData.usuario
          : undefined,
        password: formData.contraseña || undefined,
      };

      if (editingEmployee) {
        const updatedEmployee = await updateEmployee(
          editingEmployee.id,
          employeeRequest
        );
        // 🟢 empleado_id (no persona_id)
        employeeIdToEnroll = String(updatedEmployee.id);
        toast({
          title: "Éxito",
          description: "Trabajador actualizado correctamente",
        });
      } else {
        const newEmployee = await createEmployee(employeeRequest);
        // 🟢 empleado_id (no persona_id)
        employeeIdToEnroll = String(newEmployee.id);
        toast({
          title: "Éxito",
          description: "Trabajador registrado correctamente",
        });
      }

      // 🛡️ Sanity check: si por algún motivo el backend no devolvió un id
      //    válido, evitamos abrir el scanner con un id basura.
      const idIsValid =
        employeeIdToEnroll &&
        employeeIdToEnroll !== "null" &&
        employeeIdToEnroll !== "undefined" &&
        employeeIdToEnroll !== "0" &&
        !Number.isNaN(Number(employeeIdToEnroll));

      if (!idIsValid) {
        console.error(
          "❌ ID de empleado inválido al intentar abrir el scanner:",
          employeeIdToEnroll
        );
      }

      // Log de trazabilidad (útil mientras depuras)
      console.log("🟢 Empleado guardado:", {
        empleado_id: employeeIdToEnroll,
        modo: editingEmployee ? "update" : "create",
        registrarHuella: shouldEnrollFingerprint,
      });

      // ✅ Cerrar ambos diálogos SOLO cuando la operación tuvo éxito
      setIsDialogOpen(false);
      setConfirmState({ open: false, action: null, employee: null });
      resetForm();
      await loadData();

      // ✅ Abrir scanner (crear Y editar) con el ID correcto
      if (shouldEnrollFingerprint && idIsValid) {
        setIsScanning(true);
        setIsScannerOpen(true);
        setIsRegisteringFingerprint(true);
        startEnroll(employeeIdToEnroll);
      }
    } catch (error: unknown) {
      let errorMessage = "Error al guardar el empleado";
      if (error instanceof Error) {
        if (error.message.includes("ci_unique"))
          errorMessage = "La cédula de identidad ya existe";
        else if (error.message.includes("username_unique"))
          errorMessage = "El nombre de usuario ya existe";
        else if (error.message) errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      // ✅ En error cerramos el confirm, pero dejamos el form abierto
      setConfirmState({ open: false, action: null, employee: null });
    } finally {
      setIsConfirming(false);
    }
  };

  // ============================================
  // EDITAR
  // ============================================
  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      nombres: employee.nombres,
      apellidos: employee.apellidos,
      ci: employee.ci,
      telefono: employee.telefono,
      cargo: employee.cargo,
      sucursal_id: employee.sucursal_id || 0,
      caja_id: employee.caja_id || 0,
      // ✅ Si aún no tiene huella, sugerimos registrarla por defecto
      registrarHuella: !employee.tieneHuella,
      usuario: employee.username || "",
      contraseña: "",
    });

    const newHorarios: HorarioDia[] = [
      { dia_semana: 1, dia_nombre: "Lunes", horarios: [] },
      { dia_semana: 2, dia_nombre: "Martes", horarios: [] },
      { dia_semana: 3, dia_nombre: "Miércoles", horarios: [] },
      { dia_semana: 4, dia_nombre: "Jueves", horarios: [] },
      { dia_semana: 5, dia_nombre: "Viernes", horarios: [] },
      { dia_semana: 6, dia_nombre: "Sábado", horarios: [] },
      { dia_semana: 7, dia_nombre: "Domingo", horarios: [] },
    ];

    if (employee.horarios && employee.horarios.length > 0) {
      employee.horarios.forEach((horarioEmp) => {
        const diaIndex = newHorarios.findIndex(
          (h) => h.dia_semana === horarioEmp.dia_semana
        );
        if (diaIndex !== -1) {
          newHorarios[diaIndex].horarios.push({
            id: Date.now().toString() + Math.random(),
            dia_semana: horarioEmp.dia_semana,
            dia_nombre: newHorarios[diaIndex].dia_nombre,
            hora_ingreso: horarioEmp.hora_ingreso,
            hora_salida: horarioEmp.hora_salida,
            sucursal_id: horarioEmp.sucursal_id ?? employee.sucursal_id ?? null,
          });
        }
      });
    }

    setHorarios(newHorarios);
    setIsDialogOpen(true);
  };

  // ============================================
  // ELIMINAR (abre el diálogo de confirmación)
  // ============================================
  const confirmDelete = (employee: Employee) => {
    setConfirmState({
      open: true,
      action: "delete",
      employee,
    });
  };

  const executeDelete = async () => {
    const employeeToDelete = confirmState.employee;
    if (!employeeToDelete) return;

    setIsConfirming(true);

    try {
      await deleteEmployee(employeeToDelete.id);
      await loadData();
      toast({
        title: "Éxito",
        description: "Trabajador eliminado correctamente",
      });
      setConfirmState({ open: false, action: null, employee: null });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar el empleado",
        variant: "destructive",
      });
      setConfirmState({ open: false, action: null, employee: null });
    } finally {
      setIsConfirming(false);
    }
  };

  // ============================================
  // CONFIRMAR ACCIÓN (dispatch)
  // ============================================
  const handleConfirmAction = async () => {
    if (confirmState.action === "create" || confirmState.action === "update") {
      await executeSave();
    } else if (confirmState.action === "delete") {
      await executeDelete();
    }
  };

  // ============================================
  // TOGGLE STATUS
  // ============================================
  const toggleActive = async (id: number) => {
    setUpdatingStatus(id);
    try {
      const updatedEmployee = await toggleEmployeeStatus(id);
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === id ? updatedEmployee : emp))
      );
      toast({ title: "Éxito", description: "Estado actualizado" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cambiar el estado",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const formatCajaDisplay = (employee: Employee) => {
    if (!employee.caja_id) return "Sin caja";
    return employee.caja_nombre || `Caja ${employee.caja_id}`;
  };

  const tieneHorarios = (employee: Employee) => {
    return employee.horarios && employee.horarios.length > 0;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 text-center">
        Cargando...
      </div>
    );
  }

  // ============================================
  // TÍTULOS Y DESCRIPCIONES DEL DIÁLOGO DE CONFIRMACIÓN
  // ============================================
  const getConfirmTitle = () => {
    if (confirmState.action === "create") return "¿Registrar nuevo trabajador?";
    if (confirmState.action === "update") return "¿Guardar cambios?";
    if (confirmState.action === "delete") return "¿Estás seguro?";
    return "";
  };

  const getConfirmDescription = () => {
    if (confirmState.action === "create") {
      return `Se registrará a ${formData.nombres} ${formData.apellidos} como "${formData.cargo}". ¿Deseas continuar?`;
    }
    if (confirmState.action === "update") {
      return `Se actualizará la información de ${formData.nombres} ${formData.apellidos}. ¿Deseas continuar?`;
    }
    if (confirmState.action === "delete" && confirmState.employee) {
      return `Esta acción eliminará permanentemente al trabajador ${confirmState.employee.nombres} ${confirmState.employee.apellidos}. No se puede deshacer.`;
    }
    return "";
  };

  return (
    <div className="space-y-4 p-3 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-primary">
            Gestión de Trabajadores
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Administra el personal del gimnasio
          </p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (!open && isConfirming) return;
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              className="w-full sm:w-auto"
              disabled={isRegisteringFingerprint}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {isRegisteringFingerprint ? "Registrando..." : "Nuevo Trabajador"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Editar Trabajador" : "Registrar Nuevo Trabajador"}
              </DialogTitle>
              <DialogDescription>
                Completa la información del trabajador
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Datos Personales */}
              <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">Datos Personales</Label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <Label>
                      Nombres <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.nombres}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, nombres: e.target.value }))
                      }
                    />
                    {formErrors.nombres && (
                      <p className="text-xs text-destructive">{formErrors.nombres}</p>
                    )}
                  </div>
                  <div className="grid gap-1">
                    <Label>
                      Apellidos <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.apellidos}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          apellidos: e.target.value,
                        }))
                      }
                    />
                    {formErrors.apellidos && (
                      <p className="text-xs text-destructive">{formErrors.apellidos}</p>
                    )}
                  </div>
                  <div className="grid gap-1">
                    <Label>
                      CI <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.ci}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, ci: e.target.value }))
                      }
                      maxLength={12}
                    />
                    {formErrors.ci && (
                      <p className="text-xs text-destructive">{formErrors.ci}</p>
                    )}
                  </div>
                  <div className="grid gap-1">
                    <Label>
                      Teléfono <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.telefono}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          telefono: e.target.value,
                        }))
                      }
                      maxLength={8}
                    />
                    {formErrors.telefono && (
                      <p className="text-xs text-destructive">{formErrors.telefono}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Datos Laborales */}
              <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">Datos Laborales</Label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <Label>
                      Cargo <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.cargo}
                      onValueChange={(value) => {
                        const necesitaSucursal = value !== "admin";
                        setFormData((prev) => ({
                          ...prev,
                          cargo: value,
                          caja_id: 0,
                          sucursal_id: necesitaSucursal
                            ? prev.sucursal_id || editingEmployee?.sucursal_id || 0
                            : 0,
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {CARGOS.map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">
                            <span>{c}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.cargo && (
                      <p className="text-xs text-destructive">{formErrors.cargo}</p>
                    )}
                  </div>

                  {!ROLES_SIN_HORARIO.includes(formData.cargo) &&
                    formData.cargo !== "" && (
                      <div className="grid gap-1">
                        <Label>
                          Sucursal <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.sucursal_id.toString()}
                          onValueChange={(v) =>
                            setFormData((prev) => ({
                              ...prev,
                              sucursal_id: parseInt(v),
                              caja_id: 0,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map((b) => (
                              <SelectItem key={b.id} value={b.id.toString()}>
                                {b.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formErrors.sucursal_id && (
                          <p className="text-xs text-destructive">
                            {formErrors.sucursal_id}
                          </p>
                        )}
                      </div>
                    )}
                </div>

                {formData.cargo === "recepcionista" && formData.sucursal_id > 0 && (
                  <div className="grid gap-2">
                    <Label>
                      Caja asignada <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.caja_id.toString()}
                      onValueChange={(v) =>
                        setFormData((prev) => ({ ...prev, caja_id: parseInt(v) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar caja" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredBoxes.length === 0 ? (
                          <SelectItem value="0" disabled>
                            No hay cajas disponibles
                          </SelectItem>
                        ) : (
                          filteredBoxes.map((box) => (
                            <SelectItem key={box.id} value={box.id.toString()}>
                              {box.nombre}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {formErrors.caja_id && (
                      <p className="text-xs text-destructive">{formErrors.caja_id}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Horarios */}
              {!ROLES_SIN_HORARIO.includes(formData.cargo) && formData.cargo !== "" && (
                <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-semibold">
                        Horarios de Trabajo
                      </Label>
                    </div>
                  </div>

                  {horarios.map((dia) => (
                    <div key={dia.dia_semana} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="font-medium">{dia.dia_nombre}</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addHorarioToDay(dia.dia_semana)}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Agregar
                        </Button>
                      </div>

                      {dia.horarios.map((horario) => (
                        <div
                          key={horario.id}
                          className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 items-end"
                        >
                          <div>
                            <Label className="text-xs">Ingreso</Label>
                            <TimePicker
                              value={horario.hora_ingreso}
                              onChange={(v) =>
                                handleHorarioChange(
                                  dia.dia_semana,
                                  horario.id,
                                  "hora_ingreso",
                                  v
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Salida</Label>
                            <TimePicker
                              value={horario.hora_salida}
                              onChange={(v) =>
                                handleHorarioChange(
                                  dia.dia_semana,
                                  horario.id,
                                  "hora_salida",
                                  v
                                )
                              }
                            />
                          </div>
                          <div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                removeHorarioFromDay(dia.dia_semana, horario.id)
                              }
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  {formErrors.horarios && (
                    <p className="text-xs text-destructive">{formErrors.horarios}</p>
                  )}
                </div>
              )}

              {/* Datos de Acceso */}
              {ROLES_CON_ACCESO.includes(formData.cargo) && (
                <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">Datos de Acceso</Label>
                  </div>
                  <div className="grid gap-3">
                    <div className="grid gap-1">
                      <Label>
                        Usuario <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={formData.usuario}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            usuario: e.target.value,
                          }))
                        }
                      />
                      {formErrors.usuario && (
                        <p className="text-xs text-destructive">{formErrors.usuario}</p>
                      )}
                    </div>
                    <div className="grid gap-1">
                      <Label>
                        Contraseña{" "}
                        {!editingEmployee && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        type="password"
                        value={formData.contraseña}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            contraseña: e.target.value,
                          }))
                        }
                      />
                      {formErrors.contraseña && (
                        <p className="text-xs text-destructive">
                          {formErrors.contraseña}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Huella */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="registrarHuella"
                  checked={formData.registrarHuella}
                  onCheckedChange={(c) =>
                    setFormData((prev) => ({
                      ...prev,
                      registrarHuella: c as boolean,
                    }))
                  }
                />
                <Label htmlFor="registrarHuella" className="text-sm">
                  {editingEmployee
                    ? "Actualizar huella dactilar ahora"
                    : "Registrar huella dactilar ahora"}
                </Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isConfirming}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isRegisteringFingerprint}>
                {isRegisteringFingerprint
                  ? "Registrando..."
                  : editingEmployee
                  ? "Actualizar"
                  : "Registrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scanner Dialog */}
      <Dialog
        open={isScannerOpen}
        onOpenChange={(open) => {
          setIsScannerOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-[90vw] md:max-w-md">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div
                className={`mx-auto w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-primary flex items-center justify-center ${
                  isScanning ? "animate-pulse" : ""
                }`}
              >
                <Fingerprint size={48} className="md:w-16 md:h-16 text-primary" />
              </div>
              <p className="mt-4 text-base">
                {isScanning ? "Escaneando huella..." : "Esperando escaneo..."}
              </p>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Modal de Horarios */}
      <Dialog open={horariosModalOpen} onOpenChange={setHorariosModalOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horarios de Trabajo
            </DialogTitle>
            <DialogDescription>
              Horarios asignados por sucursal y día
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {horariosToShow.map((sucursal, idx) => (
              <div key={idx} className="border rounded-lg overflow-hidden">
                <div className="bg-primary/10 px-4 py-2">
                  <h3 className="font-semibold text-primary flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {sucursal.sucursal_nombre}
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {sucursal.horarios.length > 0 ? (
                    sucursal.horarios.map((dia, diaIdx) => (
                      <div
                        key={diaIdx}
                        className="border-b last:border-0 pb-3 last:pb-0"
                      >
                        <div className="font-medium text-sm mb-2">
                          {dia.dia_nombre}
                        </div>
                        <div className="space-y-1 pl-2">
                          {dia.horarios.map((horario, horIdx) => (
                            <div
                              key={horIdx}
                              className="text-sm text-muted-foreground"
                            >
                              {horario.hora_ingreso} - {horario.hora_salida}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Sin horarios asignados
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Buscar y Filtrar</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden"
            >
              <Filter className="h-4 w-4 mr-1" />
              {showFilters ? "Ocultar" : "Mostrar"} filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, CI, teléfono o cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${
                showFilters ? "grid" : "hidden md:grid"
              }`}
            >
              <Select value={cargoFilter} onValueChange={setCargoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los cargos</SelectItem>
                  {CARGOS.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      <span>{c}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla - Desktop */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="text-base">Lista de Trabajadores</CardTitle>
          <CardDescription>
            Total: {filteredEmployees.length} trabajadores (
            {filteredEmployees.filter((e) => e.activo).length} activos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>CI</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Caja</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Huella</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      <span>{`${employee.nombres} ${employee.apellidos}`}</span>
                    </TableCell>
                    <TableCell>{employee.ci}</TableCell>
                    <TableCell>{employee.telefono}</TableCell>
                    <TableCell className="capitalize">{employee.cargo}</TableCell>
                    <TableCell>
                      {employee.cargo === "admin" ? "N/A" : employee.sucursal || "-"}
                    </TableCell>
                    <TableCell>
                      {employee.cargo === "recepcionista"
                        ? formatCajaDisplay(employee)
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={employee.activo}
                          onCheckedChange={() => toggleActive(employee.id)}
                          disabled={updatingStatus === employee.id}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={employee.tieneHuella ? "default" : "outline"}>
                        {employee.tieneHuella ? "Registrada" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => verHorarios(employee)}
                          title={
                            tieneHorarios(employee)
                              ? "Ver horarios"
                              : "Sin horarios asignados"
                          }
                          disabled={!tieneHorarios(employee)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(employee)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => confirmDelete(employee)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Paginación Desktop */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Pág. {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vista Móvil - Cards */}
      <div className="md:hidden space-y-3">
        {paginatedEmployees.map((employee) => (
          <Card key={employee.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base">
                      {employee.nombres} {employee.apellidos}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{employee.ci}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => verHorarios(employee)}
                    className="h-8 w-8 p-0"
                    title={
                      tieneHorarios(employee)
                        ? "Ver horarios"
                        : "Sin horarios asignados"
                    }
                    disabled={!tieneHorarios(employee)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(employee)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => confirmDelete(employee)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teléfono:</span>
                  <span>{employee.telefono}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cargo:</span>
                  <span className="capitalize">{employee.cargo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sucursal:</span>
                  <span>
                    {employee.cargo === "admin" ? "N/A" : employee.sucursal || "-"}
                  </span>
                </div>
                {employee.cargo === "recepcionista" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Caja:</span>
                    <span>{formatCajaDisplay(employee)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Estado:</span>
                  <Switch
                    checked={employee.activo}
                    onCheckedChange={() => toggleActive(employee.id)}
                    disabled={updatingStatus === employee.id}
                    className="scale-75"
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Huella:</span>
                  <Badge
                    variant={employee.tieneHuella ? "default" : "outline"}
                    className="text-xs"
                  >
                    {employee.tieneHuella ? "✅ Registrada" : "⏳ Pendiente"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Paginación Móvil */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Pág. {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* ✅ Diálogo de confirmación unificado (crear / editar / eliminar) */}
      <AlertDialog
        open={confirmState.open}
        onOpenChange={(open) => {
          if (!open && isConfirming) return;
          if (!open) {
            setConfirmState({ open: false, action: null, employee: null });
          }
        }}
      >
        <AlertDialogContent className="max-w-[90vw] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmState.action === "delete" ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <UserCheck className="h-5 w-5 text-primary" />
              )}
              {getConfirmTitle()}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={isConfirming}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmAction();
              }}
              disabled={isConfirming}
              className={
                confirmState.action === "delete"
                  ? "bg-destructive"
                  : "bg-primary text-black"
              }
            >
              {isConfirming ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {confirmState.action === "delete"
                    ? "Eliminando..."
                    : confirmState.action === "create"
                    ? "Registrando..."
                    : "Guardando..."}
                </span>
              ) : confirmState.action === "delete" ? (
                "Eliminar"
              ) : confirmState.action === "create" ? (
                "Registrar"
              ) : (
                "Guardar cambios"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}