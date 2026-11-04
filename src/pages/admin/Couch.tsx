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
  Building2,
} from "lucide-react";
import {
  getCoaches,
  createCoach,
  updateCoach,
  deleteCoach,
  toggleCoachStatus,
  upsertRegistroMes,
  getRegistrosMes,
  getInscritosCoach,
  mesActual,
  formatMes,
  ultimosMeses,
  type Coach,
  type CoachCreateRequest,
  type RegistroMes,
  type Inscrito,
} from "@/api/CouchApi";
import { getBranches, type Branch } from "@/api/EmployeeApi";

// ============================================
// TIPOS LOCALES
// ============================================
type ConfirmActionType = "create" | "update" | "delete";
interface ConfirmState {
  open: boolean;
  action: ConfirmActionType | null;
  coach: Coach | null;
}

type InlineEditField = "meta" | "adelanto";

interface InlineEditState {
  coachId: number | null;
  field: InlineEditField | null;
  value: string;
}

const emptyForm = {
  nombres: "",
  apellidos: "",
  ci: "",
  telefono: "",
  sucursal_id: 0,
  metaInscritos: 10, // solo se usa al crear
};

const emptyInlineEdit: InlineEditState = {
  coachId: null,
  field: null,
  value: "",
};

export function Couch() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [mesSel, setMesSel] = useState<string>(mesActual());

  // Cache: registros por coach
  const [registrosPorCoach, setRegistrosPorCoach] = useState<
    Record<number, RegistroMes[]>
  >({});

  // Form crear / editar
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    action: null,
    coach: null,
  });
  const [isConfirming, setIsConfirming] = useState(false);

  // Edición inline (meta o adelanto)
  const [inlineEdit, setInlineEdit] =
    useState<InlineEditState>(emptyInlineEdit);
  const [savingInline, setSavingInline] = useState<number | null>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // Modal de resumen
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [coachVer, setCoachVer] = useState<Coach | null>(null);
  const [inscritosVer, setInscritosVer] = useState<Inscrito[]>([]);
  const [loadingInscritos, setLoadingInscritos] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { toast } = useToast();

  // ============================================
  // CARGA
  // ============================================
  const loadData = async (mes: string = mesSel) => {
    try {
      setIsLoading(true);
      const [coachesData, branchesData] = await Promise.all([
        getCoaches(mes),
        getBranches(),
      ]);
      setCoaches(coachesData);
      setBranches(branchesData);

      // Cargar registros (metas/adelantos) de cada coach
      const entries = await Promise.all(
        coachesData.map<Promise<[number, RegistroMes[]]>>(async (c) => {
          try {
            const regs = await getRegistrosMes(c.id);
            return [c.id, regs];
          } catch {
            return [c.id, []];
          }
        })
      );

      const map: Record<number, RegistroMes[]> = {};
      entries.forEach(([id, regs]) => {
        map[id] = regs;
      });
      setRegistrosPorCoach(map);
    } catch (e) {
      toast({
        title: "Error",
        description:
          e instanceof Error ? e.message : "No se pudieron cargar los coaches",
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

  // Al cambiar de mes → recargar (los stats cambian) y cerrar edición inline
  useEffect(() => {
    setInlineEdit(emptyInlineEdit);
    loadData(mesSel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesSel]);

  // ============================================
  // MESES DISPONIBLES
  // ============================================
  const mesesSelector = useMemo(() => {
    const set = new Set<string>(ultimosMeses(12));
    Object.values(registrosPorCoach).forEach((regs) =>
      regs.forEach((r) => set.add(r.mes))
    );
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [registrosPorCoach]);

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
  // HELPERS
  // ============================================
  const getRegistro = (coachId: number): RegistroMes | null => {
    const regs = registrosPorCoach[coachId] || [];
    return regs.find((r) => r.mes === mesSel) ?? null;
  };

  // ============================================
  // FORM
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

    if (!formData.sucursal_id) {
      errors.sucursal_id = "La sucursal es obligatoria";
    }

    // ✅ La meta solo se valida al CREAR (al editar se cambia inline)
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
      if (editingCoach) {
        // ✅ En edición NO se envía metaInscritos (se edita inline)
        await updateCoach(editingCoach.id, {
          nombres: formData.nombres,
          apellidos: formData.apellidos,
          ci: formData.ci,
          telefono: formData.telefono,
          sucursal_id: formData.sucursal_id,
        });
        toast({
          title: "Éxito",
          description: "Coach actualizado correctamente",
        });
      } else {
        const payload: CoachCreateRequest = {
          nombres: formData.nombres,
          apellidos: formData.apellidos,
          ci: formData.ci,
          telefono: formData.telefono,
          sucursal_id: formData.sucursal_id,
          metaInscritos: formData.metaInscritos,
        };
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
      sucursal_id: coach.sucursalId || 0,
      metaInscritos: coach.metaInscritos > 0 ? coach.metaInscritos : 10,
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

  const toggleActive = async (id: number) => {
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
  // EDICIÓN INLINE (META / ADELANTO)
  // ============================================
  const startInlineEdit = (
    coach: Coach,
    field: InlineEditField,
    initialValue: number
  ) => {
    setInlineEdit({
      coachId: coach.id,
      field,
      value: String(initialValue ?? 0),
    });
    setTimeout(() => {
      inlineInputRef.current?.focus();
      inlineInputRef.current?.select();
    }, 50);
  };

  const cancelInlineEdit = () => {
    setInlineEdit(emptyInlineEdit);
  };

  const saveInline = async (coach: Coach) => {
    if (inlineEdit.coachId !== coach.id || !inlineEdit.field) return;

    const field = inlineEdit.field;
    const raw = parseFloat(inlineEdit.value);
    const num = isNaN(raw) ? 0 : raw;

    if (field === "adelanto" && num < 0) {
      toast({
        title: "Error",
        description: "El monto no puede ser negativo",
        variant: "destructive",
      });
      return;
    }

    if (field === "meta" && num <= 0) {
      toast({
        title: "Error",
        description: "La meta debe ser mayor a 0",
        variant: "destructive",
      });
      return;
    }

    setSavingInline(coach.id);
    try {
      const reg = getRegistro(coach.id);
      const metaExistente = reg?.metaInscritos ?? coach.metaInscritos ?? 0;
      const adelantoExistente = reg?.adelantoMonto ?? coach.adelantoMonto ?? 0;

      const newMeta = field === "meta" ? Math.round(num) : metaExistente;
      const newAdelanto = field === "adelanto" ? num : adelantoExistente;

      const saved = await upsertRegistroMes(coach.id, {
        mes: mesSel,
        metaInscritos: newMeta,
        adelantoMonto: newAdelanto,
      });

      // Actualización optimista del cache local
      setRegistrosPorCoach((prev) => {
        const actuales = prev[coach.id] || [];
        const existe = actuales.some((r) => r.mes === mesSel);
        const nuevos = existe
          ? actuales.map((r) => (r.mes === mesSel ? { ...r, ...saved } : r))
          : [...actuales, saved];
        return { ...prev, [coach.id]: nuevos };
      });

      // Actualizar el coach en la lista para reflejar cambios
      setCoaches((prev) =>
        prev.map((c) =>
          c.id === coach.id
            ? {
                ...c,
                metaInscritos: newMeta,
                adelantoMonto: newAdelanto,
              }
            : c
        )
      );

      toast({
        title: field === "meta" ? "Meta guardada" : "Adelanto guardado",
        description:
          field === "meta"
            ? `${newMeta} inscritos — ${formatMes(mesSel)}`
            : `Bs. ${newAdelanto.toFixed(2)} — ${formatMes(mesSel)}`,
      });

      cancelInlineEdit();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo guardar",
        variant: "destructive",
      });
    } finally {
      setSavingInline(null);
    }
  };

  // ============================================
  // MODAL RESUMEN
  // ============================================
  const openViewModal = async (coach: Coach) => {
    setCoachVer(coach);
    setInscritosVer([]);
    setViewModalOpen(true);
    setLoadingInscritos(true);
    try {
      const lista = await getInscritosCoach(coach.id, mesSel);
      setInscritosVer(lista);
    } catch (e) {
      toast({
        title: "Error",
        description:
          e instanceof Error
            ? e.message
            : "No se pudieron cargar los inscritos",
        variant: "destructive",
      });
    } finally {
      setLoadingInscritos(false);
    }
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
      return `Se actualizará la información personal y laboral de ${formData.nombres} ${formData.apellidos}. La meta y el adelanto se editan directamente en la tabla. ¿Deseas continuar?`;
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
                  ? "Modifica los datos personales y laborales del coach. La meta y el adelanto se editan directamente en la tabla."
                  : "Completa la información del coach. La meta se registra para el mes actual."}
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
                        setFormData((p) => ({ ...p, nombres: e.target.value }))
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

              <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">
                    Datos Laborales
                  </Label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <Label>
                      Sucursal <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.sucursal_id.toString()}
                      onValueChange={(v) =>
                        setFormData((p) => ({
                          ...p,
                          sucursal_id: parseInt(v),
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

                  {/* ✅ Meta SOLO al crear. Al editar se edita inline en la tabla. */}
                  {!editingCoach && (
                    <div className="grid gap-1">
                      <Label>
                        Meta de inscritos — {formatMes(mesActual())}{" "}
                        <span className="text-red-500">*</span>
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
                  )}
                  {editingCoach && (
                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">
                        Meta y adelanto
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        La meta y el adelanto se editan directamente en la
                        tabla (íconos de edición por fila).
                      </p>
                    </div>
                  )}
                </div>
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
                  <TableHead>Sucursal</TableHead>
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
                      colSpan={9}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No hay coaches registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCoaches.map((coach) => {
                    const reg = getRegistro(coach.id);
                    const meta =
                      reg?.metaInscritos ?? coach.metaInscritos ?? 0;
                    const adelantoMes =
                      reg?.adelantoMonto ?? coach.adelantoMonto ?? 0;
                    const nuevas = coach.nuevasMes;
                    const reinscripciones = coach.reinscripcionesMes;
                    const total = coach.totalInscritosMes;
                    const progreso =
                      meta > 0
                        ? Math.min(100, Math.round((total / meta) * 100))
                        : 0;

                    const editingMeta =
                      inlineEdit.coachId === coach.id &&
                      inlineEdit.field === "meta";
                    const editingAdelanto =
                      inlineEdit.coachId === coach.id &&
                      inlineEdit.field === "adelanto";
                    const isSaving = savingInline === coach.id;

                    return (
                      <TableRow key={coach.id}>
                        <TableCell className="font-medium">
                          {coach.nombres} {coach.apellidos}
                        </TableCell>
                        <TableCell>{coach.ci}</TableCell>
                        <TableCell>{coach.telefono}</TableCell>
                        <TableCell>{coach.sucursalNombre || "-"}</TableCell>

                        {/* ✅ Meta inline */}
                        <TableCell>
                          {editingMeta ? (
                            <div className="flex items-center gap-1">
                              <Input
                                ref={inlineInputRef}
                                type="number"
                                min={1}
                                value={inlineEdit.value}
                                onChange={(e) =>
                                  setInlineEdit((p) => ({
                                    ...p,
                                    value: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveInline(coach);
                                  else if (e.key === "Escape")
                                    cancelInlineEdit();
                                }}
                                className="h-8 w-20 text-sm"
                                disabled={isSaving}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => saveInline(coach)}
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
                                onClick={cancelInlineEdit}
                                disabled={isSaving}
                                title="Cancelar"
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="gap-1">
                                <Target className="h-3 w-3" />
                                {meta}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() =>
                                  startInlineEdit(coach, "meta", meta)
                                }
                                title={`Editar meta de ${formatMes(mesSel)}`}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
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

                        {/* ✅ Adelanto inline */}
                        <TableCell>
                          {editingAdelanto ? (
                            <div className="flex items-center gap-1">
                              <Input
                                ref={inlineInputRef}
                                type="number"
                                min={0}
                                value={inlineEdit.value}
                                onChange={(e) =>
                                  setInlineEdit((p) => ({
                                    ...p,
                                    value: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveInline(coach);
                                  else if (e.key === "Escape")
                                    cancelInlineEdit();
                                }}
                                className="h-8 w-24 text-sm"
                                disabled={isSaving}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => saveInline(coach)}
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
                                onClick={cancelInlineEdit}
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
                                onClick={() =>
                                  startInlineEdit(
                                    coach,
                                    "adelanto",
                                    adelantoMes
                                  )
                                }
                                title={`Editar adelanto de ${formatMes(
                                  mesSel
                                )}`}
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
            const reg = getRegistro(coach.id);
            const meta = reg?.metaInscritos ?? coach.metaInscritos ?? 0;
            const adelantoMes =
              reg?.adelantoMonto ?? coach.adelantoMonto ?? 0;
            const nuevas = coach.nuevasMes;
            const reinscripciones = coach.reinscripcionesMes;
            const total = coach.totalInscritosMes;
            const progreso =
              meta > 0
                ? Math.min(100, Math.round((total / meta) * 100))
                : 0;

            const editingMeta =
              inlineEdit.coachId === coach.id && inlineEdit.field === "meta";
            const editingAdelanto =
              inlineEdit.coachId === coach.id &&
              inlineEdit.field === "adelanto";
            const isSaving = savingInline === coach.id;

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
                      <span className="text-muted-foreground">Sucursal:</span>
                      <span>{coach.sucursalNombre || "-"}</span>
                    </div>

                    {/* ✅ Meta inline móvil */}
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground">Meta:</span>
                      {editingMeta ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={1}
                            value={inlineEdit.value}
                            onChange={(e) =>
                              setInlineEdit((p) => ({
                                ...p,
                                value: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveInline(coach);
                              else if (e.key === "Escape") cancelInlineEdit();
                            }}
                            className="h-8 w-20 text-sm"
                            disabled={isSaving}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => saveInline(coach)}
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
                            onClick={cancelInlineEdit}
                            disabled={isSaving}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{meta} inscritos</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() =>
                              startInlineEdit(coach, "meta", meta)
                            }
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
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

                    {/* ✅ Adelanto inline móvil */}
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground">Adelanto:</span>
                      {editingAdelanto ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            value={inlineEdit.value}
                            onChange={(e) =>
                              setInlineEdit((p) => ({
                                ...p,
                                value: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveInline(coach);
                              else if (e.key === "Escape") cancelInlineEdit();
                            }}
                            className="h-8 w-24 text-sm"
                            disabled={isSaving}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => saveInline(coach)}
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
                            onClick={cancelInlineEdit}
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
                            onClick={() =>
                              startInlineEdit(coach, "adelanto", adelantoMes)
                            }
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

      {/* Modal resumen del mes */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              {coachVer?.nombres} {coachVer?.apellidos}
            </DialogTitle>
            <DialogDescription>
              Resumen de {formatMes(mesSel)}
            </DialogDescription>
          </DialogHeader>

          {coachVer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Meta</p>
                    <p className="text-2xl font-bold">
                      {getRegistro(coachVer.id)?.metaInscritos ??
                        coachVer.metaInscritos ??
                        0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">
                      Total inscritos
                    </p>
                    <p className="text-2xl font-bold">
                      {coachVer.totalInscritosMes}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Nuevas</p>
                    <p className="text-2xl font-bold text-green-600">
                      {coachVer.nuevasMes}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">
                      Reinscripciones
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {coachVer.reinscripcionesMes}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="p-3 rounded-lg bg-muted/40">
                <p className="text-xs text-muted-foreground">
                  Adelanto del mes
                </p>
                <p className="text-xl font-bold">
                  Bs.{" "}
                  {(
                    getRegistro(coachVer.id)?.adelantoMonto ??
                    coachVer.adelantoMonto ??
                    0
                  ).toFixed(2)}
                </p>
              </div>

              {/* Lista de inscritos */}
              <div>
                <h4 className="text-sm font-semibold mb-2">
                  Inscritos atribuidos a este coach
                </h4>
                {loadingInscritos ? (
                  <div className="flex justify-center items-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : inscritosVer.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No hay inscripciones atribuidas a este coach en este mes.
                  </p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Persona</TableHead>
                          <TableHead>CI</TableHead>
                          <TableHead>Servicio</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inscritosVer.map((i) => (
                          <TableRow key={i.detalleId}>
                            <TableCell className="font-medium">
                              {i.nombre}
                            </TableCell>
                            <TableCell>{i.ci}</TableCell>
                            <TableCell>{i.servicioNombre}</TableCell>
                            <TableCell>
                              {new Date(i.fechaVenta).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {i.tipo === "nueva" ? (
                                <Badge className="bg-green-600 text-white">
                                  Nueva
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-600 text-white">
                                  Reinscripción
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              Bs. {i.totalVenta.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}