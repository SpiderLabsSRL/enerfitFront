// src/pages/FaltaPago.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Phone, Mail, ArrowLeft } from "lucide-react";

const FaltaPago = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "Acceso restringido por falta de pago - Intento de acceso a:",
      location.pathname,
    );
  }, [location.pathname]);

  const handleGoBack = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center">
        <div className="gym-card max-w-md mx-auto border-destructive/30">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-destructive mb-3">
            ¡CUENTA SUSPENDIDA!
          </h1>

          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 mb-4">
            <p className="text-destructive font-semibold text-xl mb-2">
              ⚠️ Acceso Restringido por Falta de Pago
            </p>
            <p className="text-muted-foreground text-base">
              Su membresía ha sido suspendida debido a pagos pendientes. Para
              poder acceder nuevamente al sistema, debe regularizar su
              situación.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <p className="text-sm text-muted-foreground font-medium">
              Para más información o para realizar el pago, contacte a
              administración:
            </p>

            <div className="flex items-center justify-center gap-2 text-sm bg-secondary/50 p-3 rounded-lg">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-foreground">+59167461937</span>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground mb-4">
              Horario de atención: Lunes a Viernes de 9:00 a 20:00 hrs.
            </p>

            <Button onClick={handleGoBack} variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al inicio de sesión
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaltaPago;
