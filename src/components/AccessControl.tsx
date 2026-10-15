import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, Clock, CheckCircle, XCircle } from "lucide-react";
import mutantLogo from "@/assets/mutant-logo.png";

interface Service {
  id: string;
  name: string;
  visits: number;
  maxVisits: number;
  status: 'active' | 'expired';
}

interface Member {
  id: string;
  name: string;
  type: 'client' | 'employee';
  services?: Service[];
  shift?: string;
  arrivalTime?: string;
}

// Datos simulados
const mockMembers: Member[] = [
  {
    id: "1",
    name: "Carlos Mendoza",
    type: "client",
    services: [
      { id: "1", name: "Musculación", visits: 8, maxVisits: 12, status: "active" },
      { id: "2", name: "Crossfit", visits: 3, maxVisits: 8, status: "active" }
    ]
  },
  {
    id: "2", 
    name: "Ana García",
    type: "employee",
    shift: "06:00 - 14:00",
    arrivalTime: "06:15"
  },
  {
    id: "3",
    name: "Roberto Silva", 
    type: "employee",
    shift: "14:00 - 22:00",
    arrivalTime: "13:55"
  }
];

export function AccessControl() {
  const [isScanning, setIsScanning] = useState(false);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [selectedService, setSelectedService] = useState<string>("");

  const simulateFingerprint = () => {
    setIsScanning(true);
    setTimeout(() => {
      const randomMember = mockMembers[Math.floor(Math.random() * mockMembers.length)];
      setCurrentMember(randomMember);
      setIsScanning(false);
    }, 2000);
  };

  const handleServiceSelection = (serviceId: string) => {
    if (!currentMember || currentMember.type !== 'client') return;
    
    setSelectedService(serviceId);
    // Simular resta de visita
    const updatedServices = currentMember.services?.map(service => 
      service.id === serviceId 
        ? { ...service, visits: service.visits + 1 }
        : service
    );
    
    setCurrentMember({ ...currentMember, services: updatedServices });
    
    setTimeout(() => {
      setCurrentMember(null);
      setSelectedService("");
    }, 3000);
  };

  const calculateDelay = (arrivalTime: string, shiftStart: string) => {
    const [arrivalHour, arrivalMin] = arrivalTime.split(':').map(Number);
    const [shiftHour, shiftMin] = shiftStart.split(':').map(Number);
    
    const arrivalMinutes = arrivalHour * 60 + arrivalMin;
    const shiftMinutes = shiftHour * 60 + shiftMin;
    
    return arrivalMinutes - shiftMinutes;
  };

  const reset = () => {
    setCurrentMember(null);
    setSelectedService("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <img src={mutantLogo} alt="ENERFIT" className="h-16 mx-auto" />
          <h1 className="text-4xl font-bold text-primary">SISTEMA DE ACCESO</h1>
          <p className="text-muted-foreground">Coloca tu huella para acceder</p>
        </div>

        {/* Scanner */}
        <Card className="gym-card text-center">
          <CardContent className="pt-6">
            <div 
              className={`mx-auto w-32 h-32 rounded-full border-4 border-primary flex items-center justify-center cursor-pointer gym-transition ${
                isScanning ? 'animate-pulse gym-glow' : 'hover:gym-glow'
              }`}
              onClick={simulateFingerprint}
            >
              <Fingerprint size={64} className="text-primary" />
            </div>
            <p className="mt-4 text-lg">
              {isScanning ? "Escaneando..." : "Toca para escanear huella"}
            </p>
          </CardContent>
        </Card>

        {/* Member Info */}
        {currentMember && (
          <Card className="gym-card">
            <CardHeader>
              <CardTitle className="text-center text-2xl text-primary">
                ¡Bienvenido {currentMember.name}!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentMember.type === 'client' && currentMember.services && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Selecciona tu servicio:</h3>
                  <div className="grid gap-3">
                    {currentMember.services.map((service) => (
                      <div key={service.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div>
                          <h4 className="font-medium">{service.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Visitas: {service.visits}/{service.maxVisits}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={service.status === 'active' ? 'default' : 'destructive'}>
                            {service.status === 'active' ? 'Activo' : 'Vencido'}
                          </Badge>
                          <Button 
                            onClick={() => handleServiceSelection(service.id)}
                            disabled={service.status !== 'active' || service.visits >= service.maxVisits}
                            variant="outline"
                          >
                            Usar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentMember.type === 'employee' && (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Clock size={24} />
                    <span className="text-lg">Turno: {currentMember.shift}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    {(() => {
                      const delay = calculateDelay(currentMember.arrivalTime!, currentMember.shift!.split(' - ')[0]);
                      const isLate = delay > 0;
                      return (
                        <>
                          {isLate ? (
                            <XCircle className="text-destructive" size={24} />
                          ) : (
                            <CheckCircle className="text-success" size={24} />
                          )}
                          <span className={`text-xl font-semibold ${isLate ? 'text-destructive' : 'text-success'}`}>
                            {isLate ? `${delay} minutos de atraso` : 'A tiempo'}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              <div className="flex justify-center pt-4">
                <Button onClick={reset} variant="outline">
                  Finalizar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}