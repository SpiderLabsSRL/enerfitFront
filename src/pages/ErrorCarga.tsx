// src/pages/ErrorCarga.tsx
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react";

const ErrorCarga = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center">
        <div className="gym-card max-w-md mx-auto border-warning/30">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-warning/10 p-4">
              <WifiOff className="h-16 w-16 text-warning" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-warning mb-3">
            ERROR DE CONEXIÓN
          </h1>

          <div className="bg-warning/5 border border-warning/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <p className="text-warning font-semibold text-lg">
                No se pudo conectar con el servidor
              </p>
            </div>
            <p className="text-muted-foreground text-base">
              No hemos podido establecer conexión con el sistema. Esto puede
              deberse a:
            </p>
            <ul className="text-sm text-muted-foreground mt-3 space-y-1 list-disc list-inside">
              <li>Problemas de conexión a internet</li>
              <li>El servidor está temporalmente fuera de servicio</li>
              <li>Problemas con el firewall o la red local</li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Por favor, verifique su conexión a internet e intente nuevamente.
              Si el problema persiste, contacte al administrador del sistema.
            </p>

            <Button onClick={handleRetry} className="w-full gym-button">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar conexión
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorCarga;
