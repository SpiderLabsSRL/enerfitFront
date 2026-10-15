import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Edit,
  Loader2,
  RefreshCw
} from "lucide-react";
import { 
  getNewMembers, 
  getExpiringMembers, 
  sendWhatsAppMessage,
  type NewMember,
  type ExpiringMember,
  type BirthdayMember
} from "@/api/RemindersAdminapi";
import { getStoredUserData } from "@/api/loginapi";

export function RemindersAdmin() {
  const [newMembers, setNewMembers] = useState<NewMember[]>([]);
  const [expiringMembers, setExpiringMembers] = useState<ExpiringMember[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<NewMember | ExpiringMember | BirthdayMember | null>(null);
  const [editingMessage, setEditingMessage] = useState('');
  const [editingType, setEditingType] = useState<'bienvenida' | 'vencimiento'>('bienvenida');
  const [loading, setLoading] = useState({
    newMembers: true,
    expiringMembers: true,
    birthdayMembers: true
  });
  const [currentSucursalId, setCurrentSucursalId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { toast } = useToast();

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
      setLoading({ newMembers: false, expiringMembers: false, birthdayMembers: false });
    }
  }, []);

  const loadData = async (sucursalId: number) => {
    try {
      setRefreshing(true);
      setLoading({ newMembers: true, expiringMembers: true, birthdayMembers: true });
      
      console.log("Cargando datos para sucursal:", sucursalId);
      
      const [newMembersData, expiringMembersData] = await Promise.all([
        getNewMembers(sucursalId),
        getExpiringMembers(sucursalId),
      ]);
      
      setNewMembers(newMembersData);
      setExpiringMembers(expiringMembersData);
    } catch (error: any) {
      console.error("Error al cargar datos:", error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading({ newMembers: false, expiringMembers: false, birthdayMembers: false });
      setRefreshing(false);
    }
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