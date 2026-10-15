import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, CreditCard, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  getClientSubscriptions,
  parseLocalYMD,
  type ClientSubscription,
} from "@/api/AccessApi";

interface MemberSubscriptionDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    name: string;
    ci: string;
    memberType: "client" | "employee";
  } | null;
  onEnroll: (member: any) => void;
  /** ✅ Sucursal del usuario logueado. Solo se muestran inscripciones de esta sucursal. */
  branchId?: number;
}

export function MemberSubscriptionDetails({
  open,
  onOpenChange,
  member,
  onEnroll,
  branchId,
}: MemberSubscriptionDetailsProps) {
  const [subscriptions, setSubscriptions] = useState<ClientSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSubscriptions = async () => {
      if (!member || member.memberType !== "client") {
        setSubscriptions([]);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // ✅ Pasamos branchId para filtrar por sucursal del usuario logueado
        const subs = await getClientSubscriptions(
          parseInt(member.id),
          branchId,
        );
        setSubscriptions(subs);
      } catch (err: any) {
        console.error("Error cargando suscripciones:", err);
        setError(err.message || "No se pudieron cargar las suscripciones");
        setSubscriptions([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      loadSubscriptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member, open, branchId]);

  if (!member) return null;

  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === "active"
  );
  const expiredSubscriptions = subscriptions.filter(
    (s) => s.status === "expired"
  );
  const pendingSubscriptions = subscriptions.filter(
    (s) => s.status === "pending"
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            Activo
          </span>
        );
      case "expired":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
            Vencido
          </span>
        );
      case "pending":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
            Pendiente
          </span>
        );
      default:
        return null;
    }
  };

  // ============================================
  // ✅ FIX ZONA HORARIA
  // ============================================
  // Antes: new Date("2025-10-05") → se interpreta como UTC medianoche
  //        → en Bolivia (UTC-4) muestra el 4 de octubre ❌
  // Ahora: parseLocalYMD("2025-10-05") → new Date(2025, 9, 5)
  //        → 5 de octubre local ✅
  const formatDate = (dateString: string) => {
    try {
      const date = parseLocalYMD(dateString);
      if (!date) return dateString;
      return format(date, "dd/MM/yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">
            Detalles del Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del cliente */}
          <Card className="bg-muted/30 border-border">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Nombre completo
                  </p>
                  <p className="font-semibold text-foreground">{member.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Cédula de Identidad
                  </p>
                  <p className="font-semibold text-foreground">{member.ci}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <Card className="bg-destructive/10 border-destructive">
              <CardContent className="pt-6 text-center">
                <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
                <p className="text-destructive text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Suscripciones activas */}
          {!isLoading && activeSubscriptions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Suscripciones Activas
              </h3>
              <div className="space-y-3">
                {activeSubscriptions.map((sub) => (
                  <Card
                    key={sub.id}
                    className="border-l-4 border-l-green-500 border-border"
                  >
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-foreground">
                            {sub.serviceName}
                          </h4>
                          <div className="mt-1 flex items-center gap-2">
                            {getStatusBadge(sub.status)}
                            {sub.isMultisucursal && (
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                Multisucursal
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-lg font-bold text-primary">
                          Bs. {sub.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Inicio: {formatDate(sub.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Vence: {formatDate(sub.endDate)}</span>
                        </div>
                      </div>
                      {sub.visitsLeft !== null && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">
                            Visitas restantes:{" "}
                          </span>
                          <span className="font-semibold text-primary">
                            {sub.visitsLeft}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Suscripciones pendientes (futuras) */}
          {!isLoading && pendingSubscriptions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-yellow-500" />
                Suscripciones Programadas
              </h3>
              <div className="space-y-3">
                {pendingSubscriptions.map((sub) => (
                  <Card
                    key={sub.id}
                    className="border-l-4 border-l-yellow-500 border-border"
                  >
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-foreground">
                            {sub.serviceName}
                          </h4>
                          <div className="mt-1">
                            {getStatusBadge(sub.status)}
                          </div>
                        </div>
                        <p className="text-lg font-bold text-primary">
                          Bs. {sub.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Inicia: {formatDate(sub.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Vence: {formatDate(sub.endDate)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Suscripciones vencidas */}
          {!isLoading && expiredSubscriptions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Suscripciones Vencidas
              </h3>
              <div className="space-y-3">
                {expiredSubscriptions.map((sub) => (
                  <Card
                    key={sub.id}
                    className="border-l-4 border-l-red-500 border-border opacity-70"
                  >
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-foreground">
                            {sub.serviceName}
                          </h4>
                          <div className="mt-1">
                            {getStatusBadge(sub.status)}
                          </div>
                        </div>
                        <p className="text-lg font-bold text-muted-foreground">
                          Bs. {sub.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Inicio: {formatDate(sub.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Venció: {formatDate(sub.endDate)}</span>
                        </div>
                      </div>
                      {sub.visitsLeft !== null && sub.visitsLeft > 0 && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">
                            Visitas no usadas:{" "}
                          </span>
                          <span className="font-semibold text-muted-foreground">
                            {sub.visitsLeft}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Mensaje cuando no hay suscripciones */}
          {!isLoading &&
            !error &&
            subscriptions.length === 0 &&
            member.memberType === "client" && (
              <Card className="bg-muted/30 border-border">
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">
                    No hay suscripciones registradas para este cliente en esta
                    sucursal
                  </p>
                </CardContent>
              </Card>
            )}

          {/* Botón para inscribir */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              onClick={() => {
                onEnroll(member);
                onOpenChange(false);
              }}
              className="bg-primary text-black hover:bg-primary/90"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Inscribir Nuevo Servicio
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}