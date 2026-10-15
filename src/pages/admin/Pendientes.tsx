// src/pages/admin/Pendientes.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote, QrCode, CreditCard, Trash2, Plus, AlertCircle, Calendar, User, FileText, ChevronRight, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPagosPendientes, registrarPago, cancelarPagoPendiente, PagoPendiente, PagoRequest } from "@/api/pendientesApi";
import { getStoredUserData } from "@/api/loginapi";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function Pendientes() {
  const [pagosPendientes, setPagosPendientes] = useState<PagoPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [selectedPago, setSelectedPago] = useState<PagoPendiente | null>(null);
  const [showPagoDialog, setShowPagoDialog] = useState(false);
  const [showConfirmPagoDialog, setShowConfirmPagoDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [pagoToCancel, setPagoToCancel] = useState<number | null>(null);
  const [selectedPagoForMobile, setSelectedPagoForMobile] = useState<PagoPendiente | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [pagoData, setPagoData] = useState({
    monto: 0,
    formaPago: 'efectivo' as 'efectivo' | 'qr' | 'mixto',
    montoEfectivo: 0,
    montoQr: 0
  });
  const { toast } = useToast();

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const user = getStoredUserData();
        setUserData(user);
        if (user && user.idsucursal) {
          console.log("Cargando pagos pendientes para sucursal ID:", user.idsucursal);
          await loadPagosPendientes(user.idsucursal);
        } else {
          toast({
            title: "Error",
            description: "No se pudo identificar la sucursal actual",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast({
          title: "❌ Error",
          description: "No se pudieron cargar los datos iniciales",
          variant: "destructive"
        });
      }
    };
    
    loadInitialData();
  }, [toast]);

  const loadPagosPendientes = async (sucursalId: number) => {
    try {
      setLoading(true);
      const pagos = await getPagosPendientes(sucursalId);
      setPagosPendientes(pagos);
    } catch (error) {
      console.error("Error loading pending payments:", error);
      toast({
        title: "❌ Error",
        description: "No se pudieron cargar los pagos pendientes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPagoDialog = (pago: PagoPendiente) => {
    setSelectedPago(pago);
    setPagoData({
      monto: 0,
      formaPago: 'efectivo',
      montoEfectivo: 0,
      montoQr: 0
    });
    setShowPagoDialog(true);
  };

  const handleOpenMobileDetail = (pago: PagoPendiente) => {
    setSelectedPagoForMobile(pago);
    setShowMobileDetail(true);
  };

  const handleMontoChange = (value: string) => {
    const monto = value === '' ? 0 : Math.max(0, parseFloat(value) || 0);
    const maxMonto = selectedPago?.montoPendiente || 0;
    
    if (monto > maxMonto) {
      toast({
        title: "❌ Monto inválido",
        description: `El monto no puede ser mayor al pendiente (${maxMonto.toFixed(2)} Bs.)`,
        variant: "destructive"
      });
      return;
    }

    setPagoData(prev => ({
      ...prev,
      monto: monto,
      montoEfectivo: prev.formaPago === 'efectivo' ? monto : prev.formaPago === 'mixto' ? prev.montoEfectivo : 0,
      montoQr: prev.formaPago === 'qr' ? monto : prev.formaPago === 'mixto' ? prev.montoQr : 0
    }));
  };

  const handleFormaPagoChange = (formaPago: 'efectivo' | 'qr' | 'mixto') => {
    setPagoData(prev => ({
      ...prev,
      formaPago: formaPago,
      montoEfectivo: formaPago === 'efectivo' ? prev.monto : formaPago === 'mixto' ? prev.montoEfectivo : 0,
      montoQr: formaPago === 'qr' ? prev.monto : formaPago === 'mixto' ? prev.montoQr : 0
    }));
  };

  const handleMontoEfectivoChange = (value: string) => {
    const montoIngresado = value === '' ? 0 : Math.max(0, parseFloat(value) || 0);
    const montoTotal = pagoData.monto;

    // Clampear al máximo permitido
    const monto = Math.min(montoIngresado, montoTotal);
    const montoRestante = montoTotal - monto;

    if (montoIngresado > montoTotal) {
      toast({
        title: "❌ Monto excedido",
        description: `El efectivo no puede ser mayor al monto total (${montoTotal.toFixed(2)} Bs.)`,
        variant: "destructive"
      });
    }

    setPagoData(prev => ({
      ...prev,
      montoEfectivo: monto,
      montoQr: Math.max(0, montoRestante)
    }));
  };

  const handleMontoQrChange = (value: string) => {
    const montoIngresado = value === '' ? 0 : Math.max(0, parseFloat(value) || 0);
    const montoTotal = pagoData.monto;

    // Clampear al máximo permitido
    const monto = Math.min(montoIngresado, montoTotal);
    const montoRestante = montoTotal - monto;

    if (montoIngresado > montoTotal) {
      toast({
        title: "❌ Monto excedido",
        description: `El QR no puede ser mayor al monto total (${montoTotal.toFixed(2)} Bs.)`,
        variant: "destructive"
      });
    }

    setPagoData(prev => ({
      ...prev,
      montoQr: monto,
      montoEfectivo: Math.max(0, montoRestante)
    }));
  };

  const handleConfirmarPago = () => {
    if (!selectedPago || !userData) return;

    if (pagoData.monto <= 0) {
      toast({
        title: "❌ Monto inválido",
        description: "El monto debe ser mayor a 0",
        variant: "destructive"
      });
      return;
    }

    if (pagoData.monto > selectedPago.montoPendiente) {
      toast({
        title: "❌ Monto excedido",
        description: "El monto no puede ser mayor al pendiente",
        variant: "destructive"
      });
      return;
    }

    if (pagoData.formaPago === 'mixto' && (pagoData.montoEfectivo + pagoData.montoQr) !== pagoData.monto) {
      toast({
        title: "❌ Pago incorrecto",
        description: "La suma de efectivo y QR debe ser igual al monto total",
        variant: "destructive"
      });
      return;
    }

    setShowConfirmPagoDialog(true);
  };

  const handleRegistrarPago = async () => {
    if (!selectedPago || !userData) return;

    const pagoRequest: PagoRequest = {
      montoPagado: pagoData.monto,
      formaPago: pagoData.formaPago,
      montoEfectivo: pagoData.montoEfectivo,
      montoQr: pagoData.montoQr,
      cajaId: userData.idcaja,
      empleadoId: userData.idempleado,
      sucursalId: userData.idsucursal
    };

    setProcessing(`pago-${selectedPago.id}`);
    try {
      await registrarPago(selectedPago.id, pagoRequest);
      
      toast({
        title: "✅ Pago registrado",
        description: `Se registró el pago de ${pagoData.monto.toFixed(2)} Bs. correctamente`,
      });
      
      setShowPagoDialog(false);
      setShowConfirmPagoDialog(false);
      setShowMobileDetail(false);
      await loadPagosPendientes(userData.idsucursal);
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "No se pudo registrar el pago",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleOpenCancelDialog = (pagoId: number) => {
    setPagoToCancel(pagoId);
    setShowCancelDialog(true);
  };

  const handleCancelarPago = async () => {
    if (!pagoToCancel) return;

    setProcessing(`cancelar-${pagoToCancel}`);
    try {
      await cancelarPagoPendiente(pagoToCancel);
      
      toast({
        title: "✅ Pago cancelado",
        description: "El pago pendiente ha sido cancelado",
      });
      
      setShowCancelDialog(false);
      setPagoToCancel(null);
      setShowMobileDetail(false);
      await loadPagosPendientes(userData.idsucursal);
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "No se pudo cancelar el pago pendiente",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pendiente</Badge>;
      case 'completado':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Completado</Badge>;
      case 'cancelado':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  // Función segura para formatear números
  const formatMonto = (monto: any): string => {
    if (monto === null || monto === undefined) return "0.00";
    const num = typeof monto === 'string' ? parseFloat(monto) : monto;
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando pagos pendientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Pagos Pendientes</h1>
          <p className="text-muted-foreground">
            Gestiona los pagos pendientes de los clientes
          </p>
        </div>
      </div>

      {/* Vista Desktop - Tabla */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lista de Pagos Pendientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pagosPendientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No hay pagos pendientes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Fecha Inscripción</TableHead>
                    <TableHead>Última Actualización</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pagado</TableHead>
                    <TableHead>Pendiente</TableHead>
                    <TableHead>Agregar Pago</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagosPendientes.map((pago) => (
                    <TableRow key={pago.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{pago.nombres} {pago.apellidos}</span>
                          <span className="text-sm text-muted-foreground">{pago.ci}</span>
                        </div>
                      </TableCell>
                      <TableCell>{pago.servicioNombre}</TableCell>
                      <TableCell>
                        {format(new Date(pago.fechaInscripcion), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(pago.fechaUltimaActualizacion), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium">{formatMonto(pago.montoTotal)} Bs.</TableCell>
                      <TableCell className="text-green-600 font-medium">{formatMonto(pago.montoPagado)} Bs.</TableCell>
                      <TableCell className="text-orange-600 font-medium">{formatMonto(pago.montoPendiente)} Bs.</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleOpenPagoDialog(pago)}
                          disabled={pago.estado !== 'pendiente' || processing !== null}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Pago
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenCancelDialog(pago.id)}
                          disabled={pago.estado !== 'pendiente' || processing !== null}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vista Móvil - Cards */}
      <div className="md:hidden space-y-4">
        {pagosPendientes.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No hay pagos pendientes</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          pagosPendientes.map((pago) => (
            <Card key={pago.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Encabezado con nombre y estado */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base">
                        {pago.nombres} {pago.apellidos}
                      </h3>
                      <p className="text-sm text-muted-foreground">{pago.ci}</p>
                    </div>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                      Pendiente
                    </Badge>
                  </div>

                  {/* Información del servicio */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Servicio:</span>
                      <span className="text-sm font-medium">{pago.servicioNombre}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Fecha inscripción:</span>
                      <span className="text-sm">
                        {format(new Date(pago.fechaInscripcion), "dd/MM/yyyy", { locale: es })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Última actualización:</span>
                      <span className="text-sm">
                        {format(new Date(pago.fechaUltimaActualizacion), "dd/MM/yyyy", { locale: es })}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Montos */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total:</span>
                      <span className="font-semibold">{formatMonto(pago.montoTotal)} Bs.</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Pagado:</span>
                      <span className="text-sm text-green-600 font-medium">{formatMonto(pago.montoPagado)} Bs.</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Pendiente:</span>
                      <span className="text-sm text-orange-600 font-semibold">{formatMonto(pago.montoPendiente)} Bs.</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Botones de acción */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleOpenPagoDialog(pago)}
                      disabled={pago.estado !== 'pendiente' || processing !== null}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar Pago
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenCancelDialog(pago.id)}
                      disabled={pago.estado !== 'pendiente' || processing !== null}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog para agregar pago */}
      <Dialog open={showPagoDialog} onOpenChange={setShowPagoDialog}>
        <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto rounded-lg">
          <DialogHeader>
            <DialogTitle>Agregar Pago</DialogTitle>
            <DialogDescription>
              Registra un pago para {selectedPago?.nombres} {selectedPago?.apellidos}
            </DialogDescription>
          </DialogHeader>

          {selectedPago && (
            <div className="space-y-4">
              {/* Información del pago pendiente */}
              <div className="bg-muted/50 p-3 rounded-md space-y-2">
                <div className="flex justify-between flex-wrap gap-2">
                  <span className="text-sm">Servicio:</span>
                  <span className="text-sm font-medium">{selectedPago.servicioNombre}</span>
                </div>
                <div className="flex justify-between flex-wrap gap-2">
                  <span className="text-sm">Total:</span>
                  <span className="text-sm font-medium">{formatMonto(selectedPago.montoTotal)} Bs.</span>
                </div>
                <div className="flex justify-between flex-wrap gap-2">
                  <span className="text-sm">Pagado:</span>
                  <span className="text-sm font-medium text-green-600">{formatMonto(selectedPago.montoPagado)} Bs.</span>
                </div>
                <div className="flex justify-between flex-wrap gap-2">
                  <span className="text-sm">Pendiente:</span>
                  <span className="text-sm font-medium text-orange-600">{formatMonto(selectedPago.montoPendiente)} Bs.</span>
                </div>
              </div>

              <Separator />

              {/* Formulario de pago */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto a Pagar (Bs.)</Label>
                  <Input
                    id="monto"
                    type="number"
                    min="0"
                    max={selectedPago.montoPendiente}
                    step="0.01"
                    value={pagoData.monto || ''}
                    onChange={(e) => handleMontoChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                    }}
                    placeholder="0.00"
                    onWheel={(e) => e.currentTarget.blur()}
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Máximo: {formatMonto(selectedPago.montoPendiente)} Bs.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Método de Pago</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={pagoData.formaPago === 'efectivo' ? 'default' : 'outline'}
                      onClick={() => handleFormaPagoChange('efectivo')}
                      className="flex flex-col gap-1 h-auto p-2"
                    >
                      <Banknote size={16} />
                      <span className="text-xs">Efectivo</span>
                    </Button>
                    <Button
                      type="button"
                      variant={pagoData.formaPago === 'qr' ? 'default' : 'outline'}
                      onClick={() => handleFormaPagoChange('qr')}
                      className="flex flex-col gap-1 h-auto p-2"
                    >
                      <QrCode size={16} />
                      <span className="text-xs">QR</span>
                    </Button>
                    <Button
                      type="button"
                      variant={pagoData.formaPago === 'mixto' ? 'default' : 'outline'}
                      onClick={() => handleFormaPagoChange('mixto')}
                      className="flex flex-col gap-1 h-auto p-2"
                    >
                      <CreditCard size={16} />
                      <span className="text-xs">Mixto</span>
                    </Button>
                  </div>
                </div>

                {pagoData.formaPago === 'mixto' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="efectivo" className="text-xs">Efectivo</Label>
                        <Input
                          id="efectivo"
                          type="number"
                          min="0"
                          max={pagoData.monto}
                          step="0.01"
                          value={pagoData.montoEfectivo || ''}
                          onChange={(e) => handleMontoEfectivoChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                          }}
                          placeholder="0"
                          onWheel={(e) => e.currentTarget.blur()}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="qr" className="text-xs">QR</Label>
                        <Input
                          id="qr"
                          type="number"
                          min="0"
                          max={pagoData.monto}
                          step="0.01"
                          value={pagoData.montoQr || ''}
                          onChange={(e) => handleMontoQrChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                          }}
                          placeholder="0"
                          onWheel={(e) => e.currentTarget.blur()}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      Total: {(pagoData.montoEfectivo + pagoData.montoQr).toFixed(2)} / {pagoData.monto.toFixed(2)} Bs.
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowPagoDialog(false)}
                    disabled={processing !== null}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirmarPago}
                    disabled={pagoData.monto <= 0 || processing !== null}
                  >
                    {processing === `pago-${selectedPago.id}` ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Procesando...
                      </div>
                    ) : (
                      "Continuar"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar pago */}
      <AlertDialog open={showConfirmPagoDialog} onOpenChange={setShowConfirmPagoDialog}>
        <AlertDialogContent className="w-[95vw] max-w-md rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar pago?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Estás a punto de registrar un pago de <strong>{pagoData.monto.toFixed(2)} Bs.</strong> para {selectedPago?.nombres} {selectedPago?.apellidos}.</p>
              <div className="bg-muted/30 p-2 rounded-md">
                <p><strong>Método de pago:</strong> {pagoData.formaPago === 'efectivo' ? 'Efectivo' : pagoData.formaPago === 'qr' ? 'QR' : 'Mixto'}</p>
                {pagoData.formaPago === 'mixto' && (
                  <>
                    <p><strong>Efectivo:</strong> {pagoData.montoEfectivo.toFixed(2)} Bs.</p>
                    <p><strong>QR:</strong> {pagoData.montoQr.toFixed(2)} Bs.</p>
                  </>
                )}
              </div>
              <p>¿Estás seguro de que deseas continuar?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={processing !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRegistrarPago}
              disabled={processing !== null}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {processing === `pago-${selectedPago?.id}` ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </div>
              ) : (
                "Confirmar Pago"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog para confirmar cancelación */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="w-[95vw] max-w-md rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar pago pendiente?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Esta acción cancelará permanentemente el pago pendiente seleccionado.</p>
              <p><strong>Esta acción no se puede deshacer.</strong></p>
              <p>¿Estás seguro de que deseas continuar?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={processing !== null}>Volver</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelarPago}
              disabled={processing !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing === `cancelar-${pagoToCancel}` ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </div>
              ) : (
                "Sí, Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}