import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  PlusCircle,
  MinusCircle,
  DollarSign,
  Calculator,
  Loader2,
  AlertCircle,
  Landmark,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import {
  Transaction,
  TransactionRequest,
  getTransactionsByCashRegisterAndUser,
  createTransaction,
  getAssignedCashRegister,
  getCashRegisterStatus,
  openCashRegister,
  closeCashRegister,
  CashRegisterStatus,
} from "@/api/NewTransactionapi";

// Interface para el usuario - ajusta según tu estructura real
interface AppUser {
  id?: number;
  idusuario?: number;
  idUsuario?: number;
  userId?: number;
  usuarioId?: number;
  [key: string]: any;
}

export function NewTransaction() {
  const [transactionType, setTransactionType] = useState<
    "ingreso" | "egreso" | "apertura" | "cierre"
  >("apertura");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedCashRegister, setAssignedCashRegister] = useState<
    number | null
  >(null);
  const [cashRegisterStatus, setCashRegisterStatus] =
    useState<CashRegisterStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [montoEsperadoApertura, setMontoEsperadoApertura] = useState<number>(0);

  const { toast } = useToast();
  const { user } = useUser() as { user: AppUser | null };

  // Función para obtener el ID del usuario de diferentes formas
  const getUserId = (): number | null => {
    if (!user) return null;

    if (user.idusuario !== undefined && user.idusuario !== null) {
      return user.idusuario;
    }

    const possibleIdProps = ["id", "userId", "usuarioId", "idUsuario"];
    for (const prop of possibleIdProps) {
      if (user[prop] !== undefined && user[prop] !== null) {
        return user[prop] as number;
      }
    }

    return null;
  };

  useEffect(() => {
    const userId = getUserId();
    console.log("Usuario del contexto:", user);
    console.log("ID de usuario obtenido:", userId);

    if (userId) {
      loadData(userId);
    } else {
      setIsLoading(false);
      setError("Usuario no autenticado o ID no disponible");
    }
  }, [user]);

  const loadData = async (userId: number) => {
    try {
      setIsLoading(true);
      setError(null);

      const idCaja = await getAssignedCashRegister(userId);
      setAssignedCashRegister(idCaja);

      const [transactionsData, statusData] = await Promise.all([
        getTransactionsByCashRegisterAndUser(idCaja, userId),
        getCashRegisterStatus(idCaja),
      ]);

      setTransactions(transactionsData);
      setCashRegisterStatus(statusData);

      // Obtener el monto final del último cierre para usarlo como monto esperado en apertura
      const ultimoCierre = transactionsData.find((t) => t.tipo === "cierre");
      if (ultimoCierre) {
        setMontoEsperadoApertura(ultimoCierre.monto);
      }

      // Establecer tipo de transacción por defecto según estado de caja
      if (statusData && statusData.estado === "abierta") {
        setTransactionType("ingreso");
      } else {
        setTransactionType("apertura");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al cargar los datos";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userId = getUserId();
    const esAperturaOCierre =
      transactionType === "apertura" || transactionType === "cierre";

    // Descripción es OBLIGATORIA solo para ingreso/egreso
    if (!esAperturaOCierre && !description.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa una descripción",
        variant: "destructive",
      });
      return;
    }

    if (!assignedCashRegister || !userId) {
      toast({
        title: "Error",
        description: "Inicia sesión nuevamente",
        variant: "destructive",
      });
      return;
    }

    // Para apertura y cierre, el monto se toma automáticamente
    let montoNumero: number;

    if (transactionType === "apertura") {
      montoNumero = montoEsperadoApertura > 0 ? montoEsperadoApertura : 0;
    } else if (transactionType === "cierre") {
      montoNumero = cashRegisterStatus?.montoFinal || 0;
    } else {
      // Para ingreso/egreso, validar que se ingrese un monto
      if (!amount) {
        toast({
          title: "Error",
          description: "Por favor ingresa un monto",
          variant: "destructive",
        });
        return;
      }
      montoNumero = parseFloat(amount);
      if (montoNumero < 0) {
        toast({
          title: "Error",
          description: "El monto debe ser mayor o igual a cero",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let descripcionFinal = "";
      const totalCaja = cashRegisterStatus?.montoFinal || 0;

      // ✅ Construir descripción (opcional para apertura/cierre)
      if (esAperturaOCierre) {
        if (description.trim()) {
          descripcionFinal = `${description.trim()}`;
        } else {
          descripcionFinal =
            transactionType === "apertura"
              ? ` Apertura de caja con Bs. ${montoNumero.toFixed(2)}`
              : `Cierre de caja con Bs. ${montoNumero.toFixed(2)}`;
        }
      } else {
        descripcionFinal = `${description.trim()}`;
      }

      // Verificar discrepancias y modificar la descripción automáticamente
      if (
        transactionType === "apertura" &&
        montoNumero !== montoEsperadoApertura
      ) {
        const diferencia = montoNumero - montoEsperadoApertura;
        descripcionFinal = `${descripcionFinal} (discrepancia de ${diferencia.toFixed(2)}Bs)`;
      } else if (transactionType === "cierre" && montoNumero !== totalCaja) {
        const diferencia = montoNumero - totalCaja;
        descripcionFinal = `${descripcionFinal} (discrepancia de ${diferencia.toFixed(2)}Bs)`;
      }

      if (transactionType === "apertura") {
        await openCashRegister(
          assignedCashRegister,
          montoNumero,
          userId,
          descripcionFinal
        );
        toast({
          title: "Caja abierta",
          description: `Apertura de caja con Bs. ${montoNumero.toFixed(2)} realizada correctamente`,
        });
      } else if (transactionType === "cierre") {
        await closeCashRegister(
          assignedCashRegister,
          montoNumero,
          userId,
          descripcionFinal
        );
        toast({
          title: "Caja cerrada",
          description: `Cierre de caja con Bs. ${montoNumero.toFixed(2)} realizado correctamente`,
        });
      } else {
        // Para ingresos y egresos
        const transactionRequest: TransactionRequest = {
          tipo: transactionType,
          descripcion: descripcionFinal,
          monto: montoNumero,
          idCaja: assignedCashRegister,
          idUsuario: userId,
        };

        await createTransaction(transactionRequest);
        toast({
          title: "Transacción registrada",
          description: `${
            transactionType.charAt(0).toUpperCase() + transactionType.slice(1)
          } de Bs. ${montoNumero.toFixed(2)} registrada correctamente`,
        });
      }

      setAmount("");
      setDescription("");

      // Recargar datos
      await loadData(userId);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al registrar la transacción";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Usamos el monto_final del estado de caja
  const totalCaja = cashRegisterStatus?.montoFinal || 0;

  // Determinar qué opciones mostrar según el estado de la caja
  const getAvailableTransactionTypes = () => {
    if (!cashRegisterStatus) return [];

    if (cashRegisterStatus.estado === "abierta") {
      return [
        { value: "ingreso", label: "Ingreso" },
        { value: "egreso", label: "Egreso" },
        { value: "cierre", label: "Cierre de Caja" },
      ];
    } else {
      return [{ value: "apertura", label: "Apertura de Caja" }];
    }
  };

  const getTransactionIcon = (tipo: string) => {
    switch (tipo) {
      case "ingreso":
        return <PlusCircle className="h-4 w-4 text-green-500" />;
      case "egreso":
        return <MinusCircle className="h-4 w-4 text-red-500" />;
      case "apertura":
        return <DollarSign className="h-4 w-4 text-blue-500" />;
      case "cierre":
        return <Calculator className="h-4 w-4 text-orange-500" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTransactionBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case "ingreso":
        return "default";
      case "egreso":
        return "destructive";
      case "apertura":
        return "secondary";
      case "cierre":
        return "outline";
      default:
        return "default";
    }
  };

  // ✅ FIX: Formatea la fecha SIN conversión de zona horaria.
  // El backend ya envía la hora correcta de Bolivia; el navegador NO debe convertirla.
  const formatDate = (dateString: string) => {
    if (!dateString) return "—";

    try {
      // Soportar formatos:
      //   "2026-10-04T18:00:00.000Z"
      //   "2026-10-04T18:00:00"
      //   "2026-10-04 18:00:00"
      //   "2026-10-04 18:00:00+00"
      const match = dateString.match(
        /(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/
      );

      if (match) {
        const [, year, month, day, hour, minute] = match;
        return `${day}/${month}/${year}, ${hour}:${minute}`;
      }

      // Fallback si no matchea el patrón
      return dateString;
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-primary mb-2">Error</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button
          onClick={() => {
            const userId = getUserId();
            if (userId) loadData(userId);
          }}
          variant="outline"
        >
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (!assignedCashRegister) {
    return (
      <div className="text-center py-12">
        <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-primary mb-2">
          No tienes caja asignada
        </h2>
        <p className="text-muted-foreground">
          Contacta con un administrador para asignarte una caja.
        </p>
      </div>
    );
  }

  const availableTransactionTypes = getAvailableTransactionTypes();
  const isAperturaOCierre =
    transactionType === "apertura" || transactionType === "cierre";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-primary">
              Nueva Transacción
            </h1>
            <Badge variant="default" className="text-sm px-3 py-1">
              <Landmark className="h-3 w-3 mr-1" /> Efectivo
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Registra ingresos, egresos y movimientos de caja en efectivo
          </p>
          {cashRegisterStatus && (
            <Badge
              variant={
                cashRegisterStatus.estado === "abierta"
                  ? "default"
                  : "destructive"
              }
              className="mt-2"
            >
              Caja {cashRegisterStatus.estado} - {cashRegisterStatus.nombreCaja}
            </Badge>
          )}
        </div>
        <Card className="sm:w-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total en Caja</p>
              <p className="text-2xl font-bold text-primary">
                Bs. {totalCaja.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de Nueva Transacción */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" />
              Registrar Transacción - Efectivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Transacción</Label>
                <Select
                  value={transactionType}
                  onValueChange={(value: any) => {
                    setTransactionType(value);
                    if (value === "apertura" || value === "cierre") {
                      setAmount("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTransactionTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">
                  Monto (Bs.)
                  {isAperturaOCierre && (
                    <span className="text-sm text-muted-foreground ml-2">
                      (automático)
                    </span>
                  )}
                </Label>
                {isAperturaOCierre ? (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-lg font-semibold text-center">
                      {transactionType === "apertura"
                        ? `Bs. ${
                            montoEsperadoApertura > 0
                              ? montoEsperadoApertura.toFixed(2)
                              : "0.00"
                          }`
                        : `Bs. ${totalCaja.toFixed(2)}`}
                    </p>
                    <p className="text-xs text-center text-muted-foreground mt-1">
                      {transactionType === "apertura"
                        ? "Monto del último cierre"
                        : "Total actual de la caja"}
                    </p>
                  </div>
                ) : (
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*\.?\d*$/.test(value)) {
                        setAmount(value);
                      }
                    }}
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    required
                  />
                )}
                {transactionType === "cierre" && !isAperturaOCierre && (
                  <p className="text-sm text-muted-foreground">
                    Monto esperado: Bs. {totalCaja.toFixed(2)}
                  </p>
                )}
                {transactionType === "apertura" && montoEsperadoApertura > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Monto esperado: Bs. {montoEsperadoApertura.toFixed(2)}
                  </p>
                )}
              </div>

              {/* ✅ Descripción: opcional para apertura/cierre */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Descripción
                  {!isAperturaOCierre && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                  {isAperturaOCierre && (
                    <span className="text-sm text-muted-foreground ml-2">
                      (opcional)
                    </span>
                  )}
                </Label>
                <Textarea
                  id="description"
                  placeholder={
                    isAperturaOCierre
                      ? "Si lo dejas vacío, se generará automáticamente..."
                      : "Describe el motivo de la transacción..."
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required={!isAperturaOCierre}
                />
                <p className="text-xs text-muted-foreground">
                  {isAperturaOCierre
                    ? "Opcional. Si lo dejas vacío, se usará un mensaje por defecto."
                    : "Las transacciones se registrarán en la caja de efectivo"}
                </p>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    className="w-full gym-gradient"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Procesando...
                      </>
                    ) : (
                      "Registrar Transacción"
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar Transacción</DialogTitle>
                    <DialogDescription>
                      ¿Estás seguro de que deseas registrar esta transacción de{" "}
                      {transactionType}
                      {!isAperturaOCierre && ` por Bs. ${amount}`}
                      {isAperturaOCierre &&
                        transactionType === "apertura" &&
                        ` por Bs. ${
                          montoEsperadoApertura > 0
                            ? montoEsperadoApertura.toFixed(2)
                            : "0.00"
                        }`}
                      {isAperturaOCierre &&
                        transactionType === "cierre" &&
                        ` por Bs. ${totalCaja.toFixed(2)}`}
                      ? (Efectivo)
                      {/* ✅ Mostrar descripción en el diálogo */}
                      {description.trim() && (
                        <span className="block mt-2 text-xs text-muted-foreground">
                          Descripción: {description.trim()}
                        </span>
                      )}
                      {!description.trim() && isAperturaOCierre && (
                        <span className="block mt-2 text-xs text-muted-foreground italic">
                          Se usará una descripción automática
                        </span>
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-2 pt-4">
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={isSubmitting}>
                        Cancelar
                      </Button>
                    </DialogTrigger>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        handleSubmit(e as any);
                      }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Procesando...
                        </>
                      ) : (
                        "Confirmar Registro"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </form>
          </CardContent>
        </Card>

        {/* Historial de Transacciones */}
        <Card>
          <CardHeader>
            <CardTitle>Mis Transacciones del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2" />
                  <p>No has realizado transacciones hoy</p>
                </div>
              ) : (
                transactions.map((transaction) => (
                  <div
                    key={transaction.idTransaccion}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.tipo)}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">
                            {transaction.descripcion}
                          </p>
                          <Badge
                            variant={getTransactionBadgeVariant(
                              transaction.tipo
                            )}
                            className="text-xs"
                          >
                            {transaction.tipo}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(transaction.fecha)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          transaction.tipo === "ingreso" ||
                          transaction.tipo === "apertura"
                            ? "text-green-600"
                            : transaction.tipo === "egreso"
                            ? "text-red-600"
                            : "text-blue-600"
                        }`}
                      >
                        {transaction.tipo === "egreso" ? "-" : "+"}Bs.{" "}
                        {transaction.monto.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
}