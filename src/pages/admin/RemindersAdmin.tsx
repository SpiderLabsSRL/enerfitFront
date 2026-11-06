import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  Edit,
  Loader2,
  RefreshCw,
  MessageCircle,
  Search,
  RotateCcw,
  User,
  Filter,
} from "lucide-react";
import {
  getNewMembers,
  getExpiringMembers,
  getAllPersons,
  getServiceNames,
  sendWhatsAppMessage,
  type NewMember,
  type ExpiringMember,
  type BirthdayMember,
  type PersonForMessage,
} from "@/api/RemindersAdminapi";
import { getStoredUserData } from "@/api/loginapi";

const SENT_STORAGE_KEY = "reminders_sent_persona_ids";

export function RemindersAdmin() {
  const [newMembers, setNewMembers] = useState<NewMember[]>([]);
  const [expiringMembers, setExpiringMembers] = useState<ExpiringMember[]>([]);
  const [allPersons, setAllPersons] = useState<PersonForMessage[]>([]);
  const [serviceNames, setServiceNames] = useState<string[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<NewMember | ExpiringMember | BirthdayMember | null>(null);
  const [editingMessage, setEditingMessage] = useState('');
  const [editingType, setEditingType] = useState<'bienvenida' | 'vencimiento'>('bienvenida');
  const [loading, setLoading] = useState({
    newMembers: true,
    expiringMembers: true,
    birthdayMembers: true,
    allPersons: true,
  });
  const [currentSucursalId, setCurrentSucursalId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingPersons, setLoadingPersons] = useState(false);

  // ----- Estado para la sección "Enviar Mensaje" -----
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [sentPersonaIds, setSentPersonaIds] = useState<Set<number>>(new Set());

  const { toast } = useToast();

  // Cargar lista de IDs ya enviados desde sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SENT_STORAGE_KEY);
      if (raw) {
        const arr: number[] = JSON.parse(raw);
        setSentPersonaIds(new Set(arr));
      }
    } catch {
      // ignorar
    }
  }, []);

  const persistSent = (set: Set<number>) => {
    try {
      sessionStorage.setItem(SENT_STORAGE_KEY, JSON.stringify(Array.from(set)));
    } catch {
      // ignorar
    }
  };

  useEffect(() => {
    // Obtener la sucursal del usuario actual
    const userData = getStoredUserData();
    console.log("Datos de usuario:", userData);

    if (userData && userData.idsucursal) {
      setCurrentSucursalId(userData.idsucursal);
      loadData(userData.idsucursal);
    } else {
      toast({
        title: "Error",
        description: "No se pudo identificar la sucursal actual",
        variant: "destructive"
      });
      setLoading({ newMembers: false, expiringMembers: false, birthdayMembers: false, allPersons: false });
    }
  }, []);

  const loadData = async (sucursalId: number) => {
    try {
      setRefreshing(true);
      setLoading({ newMembers: true, expiringMembers: true, birthdayMembers: true, allPersons: true });

      console.log("Cargando datos para sucursal:", sucursalId);

      const [newMembersData, expiringMembersData, allPersonsData, servicesData] = await Promise.all([
        getNewMembers(sucursalId),
        getExpiringMembers(sucursalId),
        getAllPersons(sucursalId, null),
        getServiceNames(sucursalId),
      ]);

      setNewMembers(newMembersData);
      setExpiringMembers(expiringMembersData);
      setAllPersons(allPersonsData);
      setServiceNames(servicesData);
    } catch (error: any) {
      console.error("Error al cargar datos:", error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading({ newMembers: false, expiringMembers: false, birthdayMembers: false, allPersons: false });
      setRefreshing(false);
    }
  };

  // Recargar personas cuando cambia el filtro de servicio
  const reloadPersons = async (service: string) => {
    if (!currentSucursalId) return;
    try {
      setLoadingPersons(true);
      const persons = await getAllPersons(
        currentSucursalId,
        service === "all" ? null : service
      );
      setAllPersons(persons);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al filtrar personas",
        variant: "destructive",
      });
    } finally {
      setLoadingPersons(false);
    }
  };

  const handleServiceFilterChange = (value: string) => {
    setServiceFilter(value);
    reloadPersons(value);
  };

  const handleEditMessage = (member: NewMember | ExpiringMember | BirthdayMember, type: 'bienvenida' | 'vencimiento') => {
    setEditingMember(member);
    setEditingMessage(member.mensaje);
    setEditingType(type);
    setIsEditDialogOpen(true);
  };

  const handleSaveMessage = () => {
    if (!editingMessage.trim()) {
      toast({
        title: "Error",
        description: "El mensaje no puede estar vacío",
        variant: "destructive"
      });
      return;
    }

    if (editingType === 'bienvenida') {
      setNewMembers(prev => prev.map(member =>
        member.id === editingMember?.id ? { ...member, mensaje: editingMessage } : member
      ));
    } else if (editingType === 'vencimiento') {
      setExpiringMembers(prev => prev.map(member =>
        member.id === editingMember?.id ? { ...member, mensaje: editingMessage } : member
      ));
    }

    toast({
      title: "Éxito",
      description: "Mensaje actualizado correctamente"
    });

    setIsEditDialogOpen(false);
    setEditingMember(null);
    setEditingMessage('');
  };

  const sendMessage = async (member: NewMember | ExpiringMember | BirthdayMember, type: 'bienvenida' | 'vencimiento') => {
    try {
      // Limpiar el número de teléfono (eliminar espacios y caracteres especiales)
      const cleanPhone = member.telefono.replace(/\D/g, '');

      // Enviar mensaje a través de WhatsApp Web
      await sendWhatsAppMessage(cleanPhone, member.mensaje);

      toast({
        title: "Mensaje preparado",
        description: `Mensaje de ${type} preparado para ${member.nombre}. Se abrirá WhatsApp Web.`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al preparar el mensaje",
        variant: "destructive"
      });
    }
  };

  // ---------- Sección "Enviar Mensaje" ----------
  const markAsSent = (personaId: number) => {
    setSentPersonaIds(prev => {
      const next = new Set(prev);
      next.add(personaId);
      persistSent(next);
      return next;
    });
  };

  const handleSendBroadcast = async (person: PersonForMessage) => {
    if (!broadcastMessage.trim()) {
      toast({
        title: "Mensaje vacío",
        description: "Escribe un mensaje antes de enviarlo.",
        variant: "destructive",
      });
      return;
    }
    if (!person.telefono || person.telefono.replace(/\D/g, '').length < 6) {
      toast({
        title: "Sin teléfono",
        description: `${person.nombre} no tiene un número válido registrado.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const cleanPhone = person.telefono.replace(/\D/g, '');
      await sendWhatsAppMessage(cleanPhone, broadcastMessage);
      markAsSent(person.personaId);
      toast({
        title: "Mensaje preparado",
        description: `Se abrió WhatsApp Web para ${person.nombre}. Se eliminó de la lista.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al preparar el mensaje",
        variant: "destructive",
      });
    }
  };

  const handleResetSentList = () => {
    setSentPersonaIds(new Set());
    persistSent(new Set());
    toast({
      title: "Lista reiniciada",
      description: "Todas las personas inscritas vuelven a aparecer en la lista.",
    });
  };

  // Personas pendientes (no enviadas) + filtro de búsqueda
  const pendingPersons = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allPersons
      .filter(p => !sentPersonaIds.has(p.personaId))
      .filter(p =>
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        (p.telefono || "").toLowerCase().includes(q)
      );
  }, [allPersons, sentPersonaIds, searchTerm]);

  const totalEnviados = sentPersonaIds.size;
  const totalPendientes = allPersons.length - sentPersonaIds.size;

  const renderLoadingState = () => (
    <div className="flex justify-center items-center p-8">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <span className="ml-2">Cargando...</span>
    </div>
  );

  const renderEmptyState = (message: string) => (
    <div className="text-center p-8 text-muted-foreground">
      {message}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Recordatorios WhatsApp</h1>
          <p className="text-muted-foreground">Gestiona mensajes de bienvenida y recordatorios de vencimiento</p>
        </div>
        <Button
          onClick={() => currentSucursalId && loadData(currentSucursalId)}
          variant="outline"
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Actualizar
        </Button>
      </div>

      <Tabs defaultValue="bienvenida" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bienvenida">Bienvenida</TabsTrigger>
          <TabsTrigger value="vencimiento">Vencimiento</TabsTrigger>
          <TabsTrigger value="enviar-mensaje">
            <MessageCircle className="w-4 h-4 mr-2" />
            Enviar Mensaje
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bienvenida" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nuevos Miembros</CardTitle>
              <CardDescription>Envía mensajes de bienvenida a nuevos miembros registrados hoy</CardDescription>
            </CardHeader>
            <CardContent>
              {loading.newMembers ? (
                renderLoadingState()
              ) : newMembers.length === 0 ? (
                renderEmptyState("No hay nuevos miembros registrados hoy.")
              ) : (
                <div className="space-y-4">
                  {newMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{member.nombre}</p>
                          <p className="text-sm text-muted-foreground">{member.telefono}</p>
                          <p className="text-sm text-muted-foreground">Servicio: {member.servicio}</p>
                          <p className="text-sm text-muted-foreground">Registro: {member.fechaRegistro}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMessage(member, 'bienvenida')}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar Mensaje
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => sendMessage(member, 'bienvenida')}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Enviar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vencimiento" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Membresías por Vencer</CardTitle>
              <CardDescription>Envía recordatorios a miembros con membresías próximas a vencer</CardDescription>
            </CardHeader>
            <CardContent>
              {loading.expiringMembers ? (
                renderLoadingState()
              ) : expiringMembers.length === 0 ? (
                renderEmptyState("No hay membresías próximas a vencer en los próximos 3 días.")
              ) : (
                <div className="space-y-4">
                  {expiringMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{member.nombre}</p>
                          <p className="text-sm text-muted-foreground">{member.telefono}</p>
                          <p className="text-sm text-muted-foreground">Servicio: {member.servicio}</p>
                          <p className="text-sm text-muted-foreground">Vence: {member.fechaVencimiento}</p>
                          <p className={`text-sm font-medium ${member.diasRestantes <= 2 ? 'text-destructive' : 'text-warning'}`}>
                            {member.diasRestantes} días restantes
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMessage(member, 'vencimiento')}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar Mensaje
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => sendMessage(member, 'vencimiento')}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Enviar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* NUEVA SECCIÓN: ENVIAR MENSAJE MASIVO / MANUAL               */}
        {/* ============================================================ */}
        <TabsContent value="enviar-mensaje" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enviar Mensaje</CardTitle>
              <CardDescription>
                Escribe un mensaje y envíalo a cada persona inscrita. Al enviarlo, la persona
                desaparece de la lista para no enviarle el mismo mensaje dos veces.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Campo de mensaje */}
              <div className="grid gap-2">
                <Label htmlFor="broadcast-message">Mensaje</Label>
                <Textarea
                  id="broadcast-message"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={4}
                  placeholder="Escribe aquí el mensaje que quieres enviar a las personas inscritas..."
                />
                <p className="text-xs text-muted-foreground">
                  Puedes usar emojis. El mensaje se enviará por WhatsApp Web.
                </p>
              </div>

              {/* Barra de filtros */}
              <div className="flex flex-col md:flex-row md:items-end gap-3 md:justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">
                    Pendientes: {totalPendientes}
                  </Badge>
                  <Badge variant="default">
                    Enviados: {totalEnviados}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetSentList}
                    disabled={totalEnviados === 0}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reiniciar lista
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  {/* Filtro por servicio */}
                  <div className="w-full sm:w-56">
                    <div className="relative">
                      <Filter className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                      <Select
                        value={serviceFilter}
                        onValueChange={handleServiceFilterChange}
                      >
                        <SelectTrigger className="pl-8">
                          <SelectValue placeholder="Filtrar por servicio" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los servicios</SelectItem>
                          {serviceNames.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Buscador */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nombre o teléfono..."
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>

              {/* Lista de personas pendientes */}
              {loading.allPersons || loadingPersons ? (
                renderLoadingState()
              ) : pendingPersons.length === 0 ? (
                renderEmptyState(
                  allPersons.length === 0
                    ? serviceFilter !== "all"
                      ? `No hay personas inscritas en el servicio "${serviceFilter}" en esta sucursal.`
                      : "No hay personas inscritas en esta sucursal."
                    : "¡Listo! Ya enviaste el mensaje a todas las personas. Pulsa 'Reiniciar lista' si quieres volver a mostrarlas."
                )
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {pendingPersons.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{person.nombre}</p>
                          <p className="text-sm text-muted-foreground">
                            {person.telefono || "Sin teléfono"}
                          </p>
                          {person.servicios && person.servicios.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {person.servicios.map((svc) => (
                                <Badge
                                  key={svc}
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {svc}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSendBroadcast(person)}
                        disabled={!broadcastMessage.trim() || !person.telefono}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Enviar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para editar mensajes */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Mensaje</DialogTitle>
            <DialogDescription>
              Personaliza el mensaje antes de enviarlo a {editingMember?.nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="message">Mensaje</Label>
              <Textarea
                id="message"
                value={editingMessage}
                onChange={(e) => setEditingMessage(e.target.value)}
                rows={4}
                placeholder="Escribe tu mensaje aquí..."
              />
              <p className="text-sm text-muted-foreground">
                Puedes personalizar el mensaje antes de enviarlo
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMessage}>
              Guardar Mensaje
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}