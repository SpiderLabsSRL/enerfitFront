// src/pages/admin/Couch.tsx
import { useState, useEffect, useMemo, useRef } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus,
  Edit2,
  Trash2,
  Search,
  DollarSign,
  Target,
  UserCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Award,
  CalendarDays,
  Eye,
  Check,
  X,
} from "lucide-react";
import {
  getCoaches,
  createCoach,
  updateCoach,
  deleteCoach,
  toggleCoachStatus,
  upsertRegistroMes,
  getRegistroMes,
  inscritosDelMes,
  ultimosMeses,
  mesActual,
  formatMes,
  type Coach,
  type CoachCreateRequest,
} from "@/api/CouchApi";

// ============================================
// TIPOS LOCALES
// ============================================
type ConfirmActionType = "create" | "update" | "delete";
interface ConfirmState {
  open: boolean;
  action: ConfirmActionType | null;
  coach: Coach | null;
}

const emptyForm = {
  nombres: "",
  apellidos: "",
  ci: "",
  telefono: "",
  metaInscritos: 10,
};

export function Couch() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [mesSel, setMesSel] = useState<string>(mesActual());

  // Form crear / editar coach
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    action: null,
    coach: null,
  });
  const [isConfirming, setIsConfirming] = useState(false);

  // Estado de edición inline del adelanto
  const [adelantoEditingId, setAdelantoEditingId] = useState<string | null>(
    null
  );
  const [adelantoInput, setAdelantoInput] = useState<string>("");
  const [savingAdelantoId, setSavingAdelantoId] = useState<string | null>(null);
  const adelantoInputRef = useRef<HTMLInputElement>(null);

  // Modal OJO (resumen)
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [coachVer, setCoachVer] = useState<Coach | null>(null);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { toast } = useToast();

  // ============================================
  // CARGA
  // ============================================
  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getCoaches();
      setCoaches(data);
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar los coaches",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al cambiar de mes, cierra cualquier edición inline abierta
  useEffect(() => {
    setAdelantoEditingId(null);
    setAdelantoInput("");
  }, [mesSel]);

  // ============================================
  // MESES DISPONIBLES
  // ============================================
  const mesesSelector = useMemo(() => {
    const set = new Set<string>(ultimosMeses(12));
    coaches.forEach((c) => {
      c.registrosMes.forEach((r) => set.add(r.mes));
      c.inscritos.forEach((i) => set.add(i.mes));
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [coaches]);

  // ============================================
  // FILTRADO + PAGINACIÓN
  // ============================================
  const filteredCoaches = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return coaches;
    return coaches.filter(
      (c) =>
        `${c.nombres} ${c.apellidos}`.toLowerCase().includes(term) ||
        c.ci.includes(term) ||
        c.telefono.includes(term)
    );
  }, [coaches, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCoaches.length / itemsPerPage)
  );
  const paginatedCoaches = filteredCoaches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  // ============================================
  // FORM CREAR / EDITAR COACH
  // ============================================
  const resetForm = () => {
    setFormData(emptyForm);
    setFormErrors({});
    setEditingCoach(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.nombres.trim())
      errors.nombres = "Los nombres son obligatorios";
    if (!formData.apellidos.trim())
      errors.apellidos = "Los apellidos son obligatorios";

    if (!formData.ci.trim()) {
      errors.ci = "La cédula es obligatoria";
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

    if (!editingCoach) {
      if (!formData.metaInscritos || formData.metaInscritos <= 0) {
        errors.metaInscritos = "Debe indicar una meta mayor a 0";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    setConfirmState({
      open: true,
      action: editingCoach ? "update" : "create",
      coach: editingCoach,
    });
  };

  const executeSave = async () => {
    setIsConfirming(true);
    try {
      const payload: CoachCreateRequest = {
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        ci: formData.ci,
        telefono: formData.telefono,
        metaInscritos: formData.metaInscritos,
      };

      if (editingCoach) {
        await updateCoach(editingCoach.id, payload);
        toast({
          title: "Éxito",
          description: "Coach actualizado correctamente",
        });
      } else {
        await createCoach(payload);
        toast({
          title: "Éxito",
          description: "Coach registrado correctamente",
        });
      }

      setIsDialogOpen(false);
      setConfirmState({ open: false, action: null, coach: null });
      resetForm();
      await loadData();
    } catch (error: unknown) {
      let msg = "Error al guardar el coach";
      if (error instanceof Error) {
        if (error.message.includes("ci_unique"))
          msg = "La cédula de identidad ya existe";
        else msg = error.message;
      }
      toast({ title: "Error", description: msg, variant: "destructive" });
      setConfirmState({ open: false, action: null, coach: null });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleEditCoach = (coach: Coach) => {
    setEditingCoach(coach);
    setFormData({
      nombres: coach.nombres,
      apellidos: coach.apellidos,
      ci: coach.ci,
      telefono: coach.telefono,
      metaInscritos: 10,
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const confirmDelete = (coach: Coach) => {
    setConfirmState({ open: true, action: "delete", coach });
  };

  const executeDelete = async () => {
    const target = confirmState.coach;
    if (!target) return;
    setIsConfirming(true);
    try {
      await deleteCoach(target.id);
      await loadData();
      toast({ title: "Éxito", description: "Coach eliminado correctamente" });
      setConfirmState({ open: false, action: null, coach: null });
    } catch {
      toast({
        title: "Error",
        description: "Error al eliminar el coach",
        variant: "destructive",
      });
      setConfirmState({ open: false, action: null, coach: null });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleConfirmAction = async () => {
    if (confirmState.action === "create" || confirmState.action === "update") {
      await executeSave();
    } else if (confirmState.action === "delete") {
      await executeDelete();
    }
  };

  const toggleActive = async (id: string) => {
    setUpdatingStatus(id);
    try {
      const updated = await toggleCoachStatus(id);
      setCoaches((prev) => prev.map((c) => (c.id === id ? updated : c)));
      toast({ title: "Éxito", description: "Estado actualizado" });
    } catch {
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
  // ADELANTO INLINE (con actualización optimista)
  // ============================================
  const startAdelantoEdit = (coach: Coach) => {
    const reg = getRegistroMes(coach, mesSel);
    setAdelantoEditingId(coach.id);
    setAdelantoInput(String(reg?.adelantoMonto ?? 0));
    setTimeout(() => {
      adelantoInputRef.current?.focus();
      adelantoInputRef.current?.select();
    }, 50);
  };

  const cancelAdelantoEdit = () => {
    setAdelantoEditingId(null);
    setAdelantoInput("");
  };

  const saveAdelanto = async (coach: Coach) => {
    const monto = parseFloat(adelantoInput) || 0;
    if (monto < 0) {
      toast({
        title: "Error",
        description: "El monto no puede ser negativo",
        variant: "destructive",
      });
      return;
    }

    setSavingAdelantoId(coach.id);
    try {
      const reg = getRegistroMes(coach, mesSel);
      const metaExistente = reg?.metaInscritos ?? 0;

      await upsertRegistroMes(coach.id, {
        mes: mesSel,
        metaInscritos: metaExistente,
        adelantoMonto: monto,
      });

      // ✅ Actualización optimista del estado local (sin recargar)
      setCoaches((prev) =>
        prev.map((c) => {
          if (c.id !== coach.id) return c;

          const existe = c.registrosMes.some((r) => r.mes === mesSel);
          const nuevosRegistros = existe
            ? c.registrosMes.map((r) =>
                r.mes === mesSel
                  ? {
                      ...r,
                      adelantoMonto: monto,
                      fechaActualizacion: new Date().toISOString(),
                    }
                  : r
              )
            : [
                ...c.registrosMes,
                {
                  mes: mesSel,
                  metaInscritos: metaExistente,
                  adelantoMonto: monto,
                  fechaActualizacion: new Date().toISOString(),
                },
              ];

          return { ...c, registrosMes: nuevosRegistros };
        })
      );

      toast({
        title: "Adelanto guardado",
        description: `Bs. ${monto.toFixed(2)} — ${formatMes(mesSel)}`,
      });

      cancelAdelantoEdit();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo guardar",
        variant: "destructive",
      });
    } finally {
      setSavingAdelantoId(null);
    }
  };

  // ============================================
  // MODAL OJO
  // ============================================
  const openViewModal = (coach: Coach) => {
    setCoachVer(coach);
    setViewModalOpen(true);
  };

  // ============================================
  // CONFIRM TEXT
  // ============================================
  const getConfirmTitle = () => {
    if (confirmState.action === "create") return "¿Registrar nuevo coach?";
    if (confirmState.action === "update") return "¿Guardar cambios?";
    if (confirmState.action === "delete") return "¿Estás seguro?";
    return "";
  };

  const getConfirmDescription = () => {
    if (confirmState.action === "create") {
      return `Se registrará a ${formData.nombres} ${formData.apellidos} como coach con meta de ${formData.metaInscritos} inscritos. ¿Deseas continuar?`;
    }
    if (confirmState.action === "update") {
      return `Se actualizará la información personal de ${formData.nombres} ${formData.apellidos}. ¿Deseas continuar?`;
    }
    if (confirmState.action === "delete" && confirmState.coach) {
      return `Esta acción eliminará permanentemente al coach ${confirmState.coach.nombres} ${confirmState.coach.apellidos}. No se puede deshacer.`;
    }
    return "";
  };

  // ============================================
  // RENDER
  // ============================================
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 text-center">
        Cargando coaches...
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-primary">
            Gestión de Coaches
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Administra coaches, inscritos y adelantos mes a mes
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
            <Button onClick={resetForm} className="w-full sm:w-auto">
              <UserPlus className="mr-2 h-4 w-4" />
              Nuevo Coach
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
            <DialogHeader>
              <DialogTitle>
                {editingCoach ? "Editar Coach" : "Registrar Nuevo Coach"}
              </DialogTitle>
              <DialogDescription>
                {editingCoach
                  ? "Modifica los datos personales del coach."
                  : "Completa la información del coach. El adelanto se registra directamente en la tabla, en la columna Adelanto."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">
                    Datos Personales
                  </Label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <Label>
                      Nombres <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.nombres}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          nombres: e.target.value,
                        }))
                      }
                    />
                    {formErrors.nombres && (
                      <p className="text-xs text-destructive">
                        {formErrors.nombres}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-1">
                    <Label>
                      Apellidos <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.apellidos}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          apellidos: e.target.value,
                        }))
                      }
                    />
                    {formErrors.apellidos && (
                      <p className="text-xs text-destructive">
                        {formErrors.apellidos}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-1">
                    <Label>
                      CI <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.ci}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, ci: e.target.value }))
                      }
                      maxLength={12}
                    />
                    {formErrors.ci && (
                      <p className="text-xs text-destructive">
                        {formErrors.ci}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-1">
                    <Label>
                      Teléfono <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.telefono}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          telefono: e.target.value,
                        }))
                      }
                      maxLength={8}
                    />
                    {formErrors.telefono && (
                      <p className="text-xs text-destructive">
                        {formErrors.telefono}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {!editingCoach && (
                <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">
                      Meta de inscritos — {formatMes(mesActual())}
                    </Label>
                  </div>
                  <div className="grid gap-1">
                    <Label>
                      Meta de inscritos <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.metaInscritos}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          metaInscritos: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                    {formErrors.metaInscritos && (
                      <p className="text-xs text-destructive">
                        {formErrors.metaInscritos}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isConfirming}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingCoach ? "Actualizar" : "Registrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Selector de mes + buscador */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3">
            <div>
              <Label className="text-xs mb-1 block">Mes</Label>
              <Select value={mesSel} onValueChange={setMesSel}>
                <SelectTrigger>
                  <CalendarDays className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mesesSelector.map((m) => (
                    <SelectItem key={m} value={m}>
                      {formatMes(m)}
                      {m === mesActual() ? " (actual)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, CI o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla desktop */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="text-base">
            Coaches — {formatMes(mesSel)}
          </CardTitle>
          <CardDescription>
            Total: {filteredCoaches.length} coaches (
            {filteredCoaches.filter((c) => c.activo).length} activos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coach</TableHead>
                  <TableHead>CI</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Inscritos</TableHead>
                  <TableHead>Adelanto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCoaches.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No hay coaches registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCoaches.map((coach) => {
                    const reg = getRegistroMes(coach, mesSel);
                    const { nuevas, reinscripciones, total } = inscritosDelMes(
                      coach,
                      mesSel
                    );
                    const meta = reg?.metaInscritos ?? 0;
                    const adelantoMes = reg?.adelantoMonto ?? 0;
                    const progreso =
                      meta > 0
                        ? Math.min(100, Math.round((total / meta) * 100))
                        : 0;
                    const isEditing = adelantoEditingId === coach.id;
                    const isSaving = savingAdelantoId === coach.id;

                    return (
                      <TableRow key={coach.id}>
                        <TableCell className="font-medium">
                          {coach.nombres} {coach.apellidos}
                        </TableCell>
                        <TableCell>{coach.ci}</TableCell>
                        <TableCell>{coach.telefono}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <Target className="h-3 w-3" />
                            {meta}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 text-xs">
                              <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] px-1.5 py-0">
                                {nuevas} nuevas
                              </Badge>
                              <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] px-1.5 py-0">
                                {reinscripciones} reinsc.
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${progreso}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {total}/{meta}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Adelanto inline */}
                        <TableCell>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input
                                ref={adelantoInputRef}
                                type="number"
                                min={0}
                                value={adelantoInput}
                                onChange={(e) =>
                                  setAdelantoInput(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    saveAdelanto(coach);
                                  } else if (e.key === "Escape") {
                                    cancelAdelantoEdit();
                                  }
                                }}
                                className="h-8 w-24 text-sm"
                                disabled={isSaving}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => saveAdelanto(coach)}
                                disabled={isSaving}
                                title="Guardar"
                              >
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={cancelAdelantoEdit}
                                disabled={isSaving}
                                title="Cancelar"
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {adelantoMes > 0 ? (
                                <Badge variant="secondary" className="gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  Bs. {adelantoMes.toFixed(2)}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-muted-foreground"
                                >
                                  Sin adelanto
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => startAdelantoEdit(coach)}
                                title={`Editar adelanto de ${formatMes(mesSel)}`}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          <Switch
                            checked={coach.activo}
                            onCheckedChange={() => toggleActive(coach.id)}
                            disabled={updatingStatus === coach.id}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openViewModal(coach)}
                              title="Ver resumen del mes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCoach(coach)}
                              title="Editar datos del coach"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => confirmDelete(coach)}
                              title="Eliminar coach"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

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
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
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

      {/* Cards móvil */}
      <div className="md:hidden space-y-3">
        {paginatedCoaches.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay coaches registrados
            </CardContent>
          </Card>
        ) : (
          paginatedCoaches.map((coach) => {
            const reg = getRegistroMes(coach, mesSel);
            const { nuevas, reinscripciones, total } = inscritosDelMes(
              coach,
              mesSel
            );
            const meta = reg?.metaInscritos ?? 0;
            const adelantoMes = reg?.adelantoMonto ?? 0;
            const progreso =
              meta > 0 ? Math.min(100, Math.round((total / meta) * 100)) : 0;
            const isEditing = adelantoEditingId === coach.id;
            const isSaving = savingAdelantoId === coach.id;

            return (
              <Card key={coach.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-base">
                        {coach.nombres} {coach.apellidos}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {coach.ci}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openViewModal(coach)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCoach(coach)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDelete(coach)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Teléfono:</span>
                      <span>{coach.telefono}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Meta:</span>
                      <span>{meta} inscritos</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Inscritos:</span>
                      <div className="flex gap-1">
                        <Badge className="bg-green-600 text-white text-[10px]">
                          {nuevas} N
                        </Badge>
                        <Badge className="bg-blue-600 text-white text-[10px]">
                          {reinscripciones} R
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${progreso}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {total}/{meta}
                        </span>
                      </div>
                    </div>

                    {/* Adelanto inline (versión móvil) */}
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground">Adelanto:</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            value={adelantoInput}
                            onChange={(e) => setAdelantoInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveAdelanto(coach);
                              else if (e.key === "Escape") cancelAdelantoEdit();
                            }}
                            className="h-8 w-24 text-sm"
                            disabled={isSaving}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => saveAdelanto(coach)}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={cancelAdelantoEdit}
                            disabled={isSaving}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>
                            {adelantoMes > 0
                              ? `Bs. ${adelantoMes.toFixed(2)}`
                              : "—"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => startAdelantoEdit(coach)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Estado:</span>
                      <Switch
                        checked={coach.activo}
                        onCheckedChange={() => toggleActive(coach.id)}
                        disabled={updatingStatus === coach.id}
                        className="scale-75"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

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
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <AlertDialog
        open={confirmState.open}
        onOpenChange={(open) => {
          if (!open && isConfirming) return;
          if (!open) {
            setConfirmState({ open: false, action: null, coach: null });
          }
        }}
      >
        <AlertDialogContent className="max-w-[90vw] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{getConfirmTitle()}</AlertDialogTitle>
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
                  Procesando...
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

      {/* Modal OJO - resumen simple del mes */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-[90vw] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              {coachVer?.nombres} {coachVer?.apellidos}
            </DialogTitle>
            <DialogDescription>Resumen de {formatMes(mesSel)}</DialogDescription>
          </DialogHeader>

          {coachVer &&
            (() => {
              const reg = getRegistroMes(coachVer, mesSel);
              const { nuevas, reinscripciones, total } = inscritosDelMes(
                coachVer,
                mesSel
              );
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Meta</p>
                        <p className="text-2xl font-bold">
                          {reg?.metaInscritos ?? 0}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">
                          Total inscritos
                        </p>
                        <p className="text-2xl font-bold">{total}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Nuevas</p>
                        <p className="text-2xl font-bold text-green-600">
                          {nuevas}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">
                          Reinscripciones
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {reinscripciones}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground">
                      Adelanto del mes
                    </p>
                    <p className="text-xl font-bold">
                      Bs. {(reg?.adelantoMonto ?? 0).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setViewModalOpen(false)}
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}