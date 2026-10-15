// src/pages/NotFound.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, Search, Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: Usuario intentó acceder a una ruta no existente:",
      location.pathname,
    );
  }, [location.pathname]);

  const handleGoHome = () => {
    navigate("/home");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center">
        <div className="gym-card max-w-md mx-auto border-muted">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-muted p-4">
              <Compass className="h-16 w-16 text-muted-foreground" />
            </div>
          </div>

          <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            PÁGINA NO ENCONTRADA
          </h2>

          <div className="bg-muted/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <p className="text-muted-foreground text-sm font-mono">
                {location.pathname}
              </p>
            </div>
            <p className="text-muted-foreground text-base">
              Lo sentimos, la página que estás buscando no existe o ha sido
              movida.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleGoHome}
              variant="default"
              className="gym-button"
            >
              <Home className="h-4 w-4 mr-2" />
              Ir al inicio
            </Button>

            <Button onClick={handleGoBack} variant="outline">
              Volver atrás
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
