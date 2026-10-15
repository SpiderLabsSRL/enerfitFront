import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fingerprint, Settings, Dumbbell } from "lucide-react";
import mutantLogo from "@/assets/mutant-logo.png";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" style={{minHeight: '100vh', backgroundColor: '#0d0d0d'}}>
      <div className="text-center space-y-8 max-w-4xl">
        {/* Header */}
        <div className="space-y-4">
          <img src={mutantLogo} alt="ENERFIT" className="h-24 mx-auto" />
          <h1 className="text-6xl font-bold text-primary" style={{color: '#f0d000'}}>MUTANT</h1>
          <p className="text-2xl text-muted-foreground" style={{color: '#b8a000'}}>Sistema de Control de Gimnasio</p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card 
            className="gym-card cursor-pointer gym-transition hover:gym-glow group"
            onClick={() => navigate("/access")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 gym-transition">
                <Fingerprint size={32} className="text-primary" />
              </div>
              <CardTitle className="text-xl">Control de Acceso</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Acceso rápido con huella digital para clientes y empleados
              </p>
            </CardContent>
          </Card>

          <Card 
            className="gym-card cursor-pointer gym-transition hover:gym-glow group"
            onClick={() => navigate("/login")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 gym-transition">
                <Settings size={32} className="text-primary" />
              </div>
              <CardTitle className="text-xl">Panel Administrativo</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Gestión completa de miembros, servicios y reportes
              </p>
            </CardContent>
          </Card>

          <Card className="gym-card">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Dumbbell size={32} className="text-primary" />
              </div>
              <CardTitle className="text-xl">Acerca del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Sistema integral para la gestión y control de acceso del gimnasio MUTANT
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-muted-foreground">
            © 2026 ENERFIT - Sistema de Control Integral
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
