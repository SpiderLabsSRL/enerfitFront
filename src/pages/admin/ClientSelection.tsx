import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  X,
  User,
  Fingerprint,
  Plus,
  Users,
  Trash2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  searchPeople,
  hasFingerprint,
  createPersonQuick,
  type Person,
} from "../../api/RegisterMemberApi";

interface ClientSelectionProps {
  onClientSelect: (person: Person | null) => void;
  selectedPerson: Person | null;
  resetTrigger?: number;
  onIdentifyFingerprint: () => void;
  onFamilyMemberAdd: (member: Person) => void;
  onFamilyMemberRemove: (key: string) => void;
  familyMembers: Person[];
  requiredPersonsCount: number;
  onEnrollFingerprint?: (personaId: number, personName: string) => void;
}

let localKeyCounter = 0;
function nextLocalKey(): string {
  localKeyCounter += 1;
  return `new-${localKeyCounter}-${Date.now()}`;
}

export default function ClientSelection({
  onClientSelect,
  selectedPerson,
  resetTrigger = 0,
  onIdentifyFingerprint,
  onFamilyMemberAdd,
  onFamilyMemberRemove,
  familyMembers,
  requiredPersonsCount,
  onEnrollFingerprint,
}: ClientSelectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [registerFingerprint, setRegisterFingerprint] = useState(true);
  const [newClient, setNewClient] = useState({
    nombres: "",
    apellidos: "",
    ci: "",
    telefono: "",
  });
  const [ciError, setCiError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [fingerprintStatus, setFingerprintStatus] = useState<
    Record<number, boolean>
  >({});
  const [checkingFingerprint, setCheckingFingerprint] = useState<
    Record<number, boolean>
  >({});

  const searchRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const allSelectedClients: Person[] = selectedPerson
    ? [selectedPerson, ...familyMembers]
    : [...familyMembers];
  const totalSelected = allSelectedClients.length;

  useEffect(() => {
    if (resetTrigger > 0) {
      setSearchTerm("");
      setSearchResults([]);
      setShowSearchResults(false);
      setFingerprintStatus({});
      setCheckingFingerprint({});
    }
  }, [resetTrigger]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Búsqueda + chequeo de huella
  useEffect(() => {
    const searchMembers = async () => {
      if (searchTerm.trim().length > 2) {
        setIsSearching(true);
        setShowSearchResults(true);
        try {
          const results = await searchPeople(searchTerm);
          setSearchResults(results);

          const checks = results
            .filter((p) => p.personaId && p.personaId > 0)
            .map(async (p) => {
              const pid = p.personaId!;
              setCheckingFingerprint((prev) => ({ ...prev, [pid]: true }));
              try {
                const res = await hasFingerprint(pid);
                setFingerprintStatus((prev) => ({
                  ...prev,
                  [pid]: res.hasFingerprint,
                }));
              } catch {
                setFingerprintStatus((prev) => ({ ...prev, [pid]: false }));
              } finally {
                setCheckingFingerprint((prev) => ({ ...prev, [pid]: false }));
              }
            });
          await Promise.all(checks);
        } catch (error) {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    };
    const timeoutId = setTimeout(searchMembers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const validateCI = (ci: string): boolean => {
    if (!ci) return true;
    if (ci.length < 7 || ci.length > 12) {
      setCiError("La cédula debe tener entre 7 y 12 caracteres");
      return false;
    }
    if (/^[a-zA-Z]+$/.test(ci)) {
      setCiError("La cédula no puede contener solo letras");
      return false;
    }
    if (/[^a-zA-Z0-9]/.test(ci)) {
      setCiError("La cédula solo puede contener números y letras");
      return false;
    }
    setCiError("");
    return true;
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true;
    if (!/^\d+$/.test(phone)) {
      setPhoneError("El teléfono solo puede contener números");
      return false;
    }
    if (phone.length !== 8) {
      setPhoneError("El teléfono debe tener exactamente 8 dígitos");
      return false;
    }
    setPhoneError("");
    return true;
  };

  // Helper: agregar la persona al plan
  const addPersonToPlan = (person: Person) => {
    if (
      allSelectedClients.some((m) => m._key === person._key || m.ci === person.ci)
    ) {
      toast({
        title: "⚠️ Ya agregado",
        description: "Esta persona ya está en la lista de clientes",
        variant: "default",
      });
      return;
    }

    if (totalSelected >= requiredPersonsCount && requiredPersonsCount > 0) {
      toast({
        title: "⚠️ Límite alcanzado",
        description: `Ya has seleccionado ${totalSelected} de ${requiredPersonsCount} personas requeridas para este plan.`,
        variant: "default",
      });
      return;
    }

    if (!selectedPerson) {
      onClientSelect(person);
      toast({
        title: "✅ Cliente agregado",
        description: `${person.nombres} ${person.apellidos} ha sido agregado como titular`,
      });
    } else {
      onFamilyMemberAdd(person);
      toast({
        title: "✅ Cliente agregado",
        description: `${person.nombres} ${person.apellidos} ha sido agregado como familiar`,
      });
    }
    setSearchTerm("");
    setShowSearchResults(false);
  };

  // ✅ AL HACER CLIC EN LA FILA
  const handleRowClick = (person: Person) => {
    const isAlreadySelected = allSelectedClients.some(
      (m) => m._key === person._key
    );
    if (isAlreadySelected) return;

    if (totalSelected >= requiredPersonsCount && requiredPersonsCount > 0) {
      toast({
        title: "⚠️ Límite alcanzado",
        description: `Ya has seleccionado ${totalSelected} de ${requiredPersonsCount} personas requeridas para este plan.`,
        variant: "default",
      });
      return;
    }

    // Sin personaId o sin callback → agregar directo
    if (!person.personaId || !onEnrollFingerprint) {
      addPersonToPlan(person);
      return;
    }

    const fp = fingerprintStatus[person.personaId];
    const isChecking = checkingFingerprint[person.personaId];

    if (isChecking) {
      toast({
        title: "⏳ Verificando huella...",
        description: "Espera un momento",
      });
      return;
    }

    // ✅ NO tiene huella → abrir modal de enrolamiento
    if (fp === false) {
      console.log(
        "🚨 Sin huella → abrir enrolamiento:",
        person.personaId,
        person.nombres
      );

      toast({
        title: "📌 Registrar huella primero",
        description: `${person.nombres} no tiene huella. Regístrala para continuar.`,
      });

      // Cerrar dropdown
      setShowSearchResults(false);
      setSearchTerm("");

      // Agregamos la persona al plan INMEDIATAMENTE
      addPersonToPlan(person);

      // Y disparamos el enrolamiento
      onEnrollFingerprint(
        person.personaId,
        `${person.nombres} ${person.apellidos}`
      );
      return;
    }

    // Tiene huella → agregar directo
    addPersonToPlan(person);
  };

  const handleRemoveClient = (person: Person, isMainClient: boolean) => {
    if (isMainClient) {
      onClientSelect(null);
      toast({
        title: "✅ Cliente removido",
        description: "El cliente titular ha sido removido",
      });
    } else {
      onFamilyMemberRemove(person._key);
      toast({
        title: "✅ Cliente removido",
        description: "El cliente ha sido removido de la lista",
      });
    }
  };

  const handleCreateNewClient = async () => {
    if (
      !newClient.nombres ||
      !newClient.apellidos ||
      !newClient.ci ||
      !newClient.telefono
    ) {
      toast({
        title: "❌ Error",
        description: "Complete todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }
    if (!validateCI(newClient.ci)) return;
    if (!validatePhone(newClient.telefono)) return;

    if (totalSelected >= requiredPersonsCount && requiredPersonsCount > 0) {
      toast({
        title: "⚠️ Límite alcanzado",
        description: `Ya has seleccionado ${totalSelected} de ${requiredPersonsCount} personas requeridas para este plan.`,
        variant: "default",
      });
      return;
    }

    if (allSelectedClients.some((m) => m.ci === newClient.ci)) {
      toast({
        title: "⚠️ Ya agregado",
        description: "Ya hay una persona con esa cédula en la lista",
        variant: "default",
      });
      return;
    }

    setIsCreating(true);

    try {
      const result = await createPersonQuick({
        nombres: newClient.nombres,
        apellidos: newClient.apellidos,
        ci: newClient.ci,
        telefono: newClient.telefono,
        fechaNacimiento: null,
      });

      const personaId = result.persona.id;

      const newPerson: Person = {
        personaId,
        _key: `db-${personaId}`,
        isNew: false,
        nombres: result.persona.nombres,
        apellidos: result.persona.apellidos,
        ci: result.persona.ci,
        telefono: result.persona.telefono || "",
      };

      if (!selectedPerson) {
        onClientSelect(newPerson);
        toast({
          title: "✅ Cliente creado",
          description: `${newPerson.nombres} ${newPerson.apellidos} ha sido agregado como titular`,
        });
      } else {
        onFamilyMemberAdd(newPerson);
        toast({
          title: "✅ Cliente agregado",
          description: `${newPerson.nombres} ${newPerson.apellidos} ha sido agregado como familiar`,
        });
      }

      setIsNewClientDialogOpen(false);
      setNewClient({ nombres: "", apellidos: "", ci: "", telefono: "" });

      if (registerFingerprint && onEnrollFingerprint) {
        setTimeout(() => {
          onEnrollFingerprint(
            personaId,
            `${newPerson.nombres} ${newPerson.apellidos}`
          );
        }, 400);
      }
    } catch (error: any) {
      toast({
        title: "❌ Error al crear cliente",
        description: error.message || "No se pudo crear el cliente",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const openNewClientDialog = () => {
    if (totalSelected >= requiredPersonsCount && requiredPersonsCount > 0) {
      toast({
        title: "⚠️ Límite alcanzado",
        description: `Ya has seleccionado ${totalSelected} de ${requiredPersonsCount} personas requeridas para este plan.`,
        variant: "default",
      });
      return;
    }
    setRegisterFingerprint(true);
    setIsNewClientDialogOpen(true);
  };

  return (
    <Card className="border-border bg-gradient-to-br from-card to-card/95 shadow-xl rounded-2xl overflow-visible">
      <CardHeader className="pb-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-lg flex items-center gap-2 text-foreground">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <span>Clientes del Plan</span>
          {requiredPersonsCount > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({totalSelected}/{requiredPersonsCount})
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-5 space-y-5 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
        <div className="space-y-2 relative" ref={searchRef}>
          <div className="flex items-center justify-between">
            <Label className="text-foreground font-semibold">
              Buscar Cliente Existente
            </Label>
          </div>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, apellido o CI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 transition-all"
                onFocus={() =>
                  searchTerm.length > 2 && setShowSearchResults(true)
                }
              />
              {searchTerm && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={openNewClientDialog}
              className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-primary/80 text-black hover:from-primary/90 hover:to-primary/70 shadow-md transition-all duration-200 flex items-center justify-center cursor-pointer flex-shrink-0"
              title="Nuevo cliente"
            >
              <Plus size={18} />
            </button>
          </div>

          {showSearchResults && (
            <div className="absolute z-[9999] w-full mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
              {isSearching ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <div className="animate-pulse">Buscando...</div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y divide-border max-h-64 overflow-y-auto">
                  {searchResults.map((person) => {
                    const isAlreadySelected = allSelectedClients.some(
                      (m) => m._key === person._key
                    );
                    const isLimitReached =
                      totalSelected >= requiredPersonsCount &&
                      requiredPersonsCount > 0 &&
                      !isAlreadySelected;

                    const pid = person.personaId ?? 0;
                    const fp = fingerprintStatus[pid];
                    const isChecking = checkingFingerprint[pid];
                    const missingFingerprint =
                      person.personaId &&
                      person.personaId > 0 &&
                      fp === false &&
                      !isChecking;
                    const hasFp = fp === true;

                    return (
                      <div
                        key={person._key}
                        className={`p-3 transition-all duration-150 flex justify-between items-center group ${
                          isAlreadySelected
                            ? "opacity-50 bg-muted/20 cursor-not-allowed"
                            : isLimitReached
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-primary/5 cursor-pointer"
                        }`}
                        onClick={() => handleRowClick(person)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {person.nombres} {person.apellidos}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            CI: {person.ci} • Tel: {person.telefono}
                          </div>

                          {isChecking && (
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                              Verificando huella...
                            </div>
                          )}
                          {missingFingerprint && !isAlreadySelected && (
                            <div className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                              <AlertTriangle size={12} />
                              Sin huella — Se solicitará al agregar
                            </div>
                          )}
                          {hasFp && !isAlreadySelected && (
                            <div className="text-xs text-green-600 mt-1 inline-flex items-center gap-1">
                              <Fingerprint size={12} />
                              Huella registrada
                            </div>
                          )}

                          {isAlreadySelected && (
                            <div className="text-xs text-primary mt-1">
                              ✓ Ya agregado
                            </div>
                          )}
                          {isLimitReached && !isAlreadySelected && (
                            <div className="text-xs text-destructive mt-1">
                              Límite alcanzado
                            </div>
                          )}
                        </div>
                        {!isAlreadySelected && !isLimitReached && (
                          <button
                            className={`h-8 w-8 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer flex-shrink-0 ml-2 ${
                              missingFingerprint
                                ? "bg-amber-500/20 text-amber-600 hover:bg-amber-500 hover:text-white"
                                : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(person);
                            }}
                            title={
                              missingFingerprint
                                ? "Registrar huella"
                                : "Agregar al plan"
                            }
                          >
                            {missingFingerprint ? (
                              <Fingerprint size={14} />
                            ) : (
                              <Plus size={14} />
                            )}
                          </button>
                        )}
                        {isAlreadySelected && (
                          <CheckCircle
                            size={16}
                            className="text-primary flex-shrink-0 ml-2"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : searchTerm.length > 2 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No se encontraron clientes
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Label className="text-foreground font-semibold flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            Clientes seleccionados
            {requiredPersonsCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({totalSelected}/{requiredPersonsCount})
              </span>
            )}
          </Label>
          <div className="space-y-2 h-[120px] overflow-y-auto pr-1 custom-scrollbar border border-dashed border-border rounded-lg p-2 bg-muted/5">
            {allSelectedClients.length > 0 ? (
              allSelectedClients.map((client, index) => {
                const isMainClient = selectedPerson?._key === client._key;
                return (
                  <div
                    key={client._key}
                    className={`flex justify-between items-center p-3 rounded-xl border transition-all duration-200 ${
                      isMainClient
                        ? "bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30"
                        : "bg-muted/10 border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isMainClient
                            ? "bg-primary text-black"
                            : "bg-muted-foreground/20 text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {client.nombres} {client.apellidos}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          CI: {client.ci} • Tel: {client.telefono}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveClient(client, isMainClient)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 rounded-full h-8 w-8 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No hay clientes seleccionados
              </div>
            )}
          </div>
        </div>

        <Separator className="bg-border" />
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

      <Dialog
        open={isNewClientDialogOpen}
        onOpenChange={setIsNewClientDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px] bg-card border-border rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {!selectedPerson
                ? "Registrar Nuevo Cliente"
                : "Agregar Nuevo Cliente"}
            </DialogTitle>
            <DialogDescription asChild>
              <p className="text-sm text-muted-foreground mt-1">
                {!selectedPerson
                  ? "Complete los datos del cliente que será el titular del plan"
                  : "Complete los datos del nuevo cliente para agregarlo al plan"}
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">
                  Nombres <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={newClient.nombres}
                  onChange={(e) =>
                    setNewClient({ ...newClient, nombres: e.target.value })
                  }
                  className="bg-input border-border text-foreground focus:ring-2 focus:ring-primary/50 transition-all rounded-xl"
                  placeholder="Ej: Juan"
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">
                  Apellidos <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={newClient.apellidos}
                  onChange={(e) =>
                    setNewClient({ ...newClient, apellidos: e.target.value })
                  }
                  className="bg-input border-border text-foreground focus:ring-2 focus:ring-primary/50 transition-all rounded-xl"
                  placeholder="Ej: Pérez"
                  disabled={isCreating}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">
                  Cédula de Identidad <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={newClient.ci}
                  onChange={(e) => {
                    setNewClient({ ...newClient, ci: e.target.value });
                    validateCI(e.target.value);
                  }}
                  className="bg-input border-border text-foreground focus:ring-2 focus:ring-primary/50 transition-all rounded-xl"
                  placeholder="Ej: 12345678"
                  disabled={isCreating}
                />
                {ciError && <p className="text-xs text-red-500">{ciError}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">
                  Teléfono <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={newClient.telefono}
                  onChange={(e) => {
                    setNewClient({ ...newClient, telefono: e.target.value });
                    validatePhone(e.target.value);
                  }}
                  maxLength={8}
                  className="bg-input border-border text-foreground focus:ring-2 focus:ring-primary/50 transition-all rounded-xl"
                  placeholder="Ej: 71234567"
                  disabled={isCreating}
                />
                {phoneError && (
                  <p className="text-xs text-red-500">{phoneError}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2 p-3 bg-muted/10 rounded-xl">
              <button
                type="button"
                onClick={() => setRegisterFingerprint(!registerFingerprint)}
                className={`w-6 h-6 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                  registerFingerprint
                    ? "bg-primary border-primary/80"
                    : "bg-transparent border-muted-foreground/50"
                }`}
                disabled={isCreating}
              >
                {registerFingerprint && (
                  <Fingerprint size={14} className="text-black" />
                )}
              </button>
              <Label
                className="text-sm font-medium leading-none cursor-pointer text-foreground select-none"
                onClick={() =>
                  !isCreating && setRegisterFingerprint(!registerFingerprint)
                }
              >
                Registrar huella dactilar ahora
              </Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsNewClientDialogOpen(false)}
                className="border-border text-foreground hover:bg-muted rounded-xl transition-all duration-200"
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateNewClient}
                disabled={isCreating}
                className="bg-gradient-to-r from-primary to-primary/80 text-black hover:from-primary/90 hover:to-primary/70 rounded-xl shadow-md transition-all duration-200 px-6"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                    Creando...
                  </>
                ) : (
                  <>
                    <User size={16} className="mr-2" />
                    {!selectedPerson ? "Registrar Cliente" : "Agregar Cliente"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}