// src/pages/admin/views/Consultar.tsx
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  User,
  Calendar,
  Phone,
  CreditCard,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Loader2,
  X,
  FileText,
  ShieldCheck,
  Clock,
  MapPin,
  Building,
} from "lucide-react";

interface Cliente {
  id: string;
  carnet: string;
  nombre: string;
  apellido: string;
  celular: string;
  fechaNacimiento: string;
  fechaInscripcion: string;
  sucursal: "Bunker" | "Arsenal";
}

interface Inscripcion {
  id: string;
  clienteId: string;
  planId: string;
  fechaInicio: string;
  fechaVencimiento: string;
  ingresosRestantes: number;
  ultimoIngreso: string | null;
  estado: "activo" | "vencido" | "pendiente";
  servicio: string;
  sucursal: "Bunker" | "Arsenal";
}

export function Consultar() {
  const [carnet, setCarnet] = useState("");
  const [clienteEncontrado, setClienteEncontrado] = useState<Cliente | null>(
    null,
  );
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [loadingConsulta, setLoadingConsulta] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  // Mock de clientes existentes con sucursal
  const clientesMock: Cliente[] = [
    {
      id: "1",
      carnet: "1234567",
      nombre: "Donald",
      apellido: "Trompetas",
      celular: "77712345",
      fechaNacimiento: "1985-06-15",
      fechaInscripcion: "2024-01-01",
      sucursal: "Bunker",
    },
    {
      id: "2",
      carnet: "7654321",
      nombre: "Ana María",
      apellido: "García",
      celular: "77754321",
      fechaNacimiento: "1990-08-22",
      fechaInscripcion: "2024-01-15",
      sucursal: "Arsenal",
    },
    {
      id: "3",
      carnet: "9876543",
      nombre: "Carlos",
      apellido: "Pérez",
      celular: "77798765",
      fechaNacimiento: "1992-03-10",
      fechaInscripcion: "2024-02-01",
      sucursal: "Bunker",
    },
  ];

  // Mock de inscripciones con sucursal
  const inscripcionesMock: Inscripcion[] = [
    {
      id: "1",
      clienteId: "1",
      planId: "2",
      fechaInicio: "2026-01-01",
      fechaVencimiento: "2026-01-31",
      ingresosRestantes: 10,
      ultimoIngreso: "2026-01-20",
      estado: "activo",
      servicio: "Plan Avanzado",
      sucursal: "Bunker",
    },
    {
      id: "2",
      clienteId: "1",
      planId: "1",
      fechaInicio: "2026-01-03",
      fechaVencimiento: "2026-02-02",
      ingresosRestantes: 5,
      ultimoIngreso: "2026-01-20",
      estado: "activo",
      servicio: "Crossfit Premium",
      sucursal: "Bunker",
    },
    {
      id: "3",
      clienteId: "2",
      planId: "1",
      fechaInicio: "2026-01-10",
      fechaVencimiento: "2026-01-25",
      ingresosRestantes: 3,
      ultimoIngreso: "2026-01-22",
      estado: "activo",
      servicio: "Plan Básico",
      sucursal: "Arsenal",
    },
    {
      id: "4",
      clienteId: "3",
      planId: "3",
      fechaInicio: "2026-01-05",
      fechaVencimiento: "2026-02-04",
      ingresosRestantes: 15,
      ultimoIngreso: "2026-01-21",
      estado: "activo",
      servicio: "Plan Premium",
      sucursal: "Bunker",
    },
  ];

  // Función para consultar carnet
  const consultarCarnet = async () => {
    if (!carnet.trim()) {
      return;
    }

    setLoadingConsulta(true);

    setTimeout(() => {
      const cliente = clientesMock.find((c) => c.carnet === carnet);

      if (cliente) {
        setClienteEncontrado(cliente);
        const inscripcionesCliente = inscripcionesMock.filter(
          (i) => i.clienteId === cliente.id,
        );
        setInscripciones(inscripcionesCliente);
      } else {
        setClienteEncontrado(null);
        setInscripciones([]);
      }

      setLoadingConsulta(false);
      setShowResults(true);
    }, 800);
  };

  // Formatear fecha
  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Calcular edad
  const calcularEdad = (fechaNacimiento: string) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }

    return edad;
  };

  // Resetear consulta
  const resetearConsulta = () => {
    setClienteEncontrado(null);
    setInscripciones([]);
    setShowResults(false);

    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  return (
    <section className="py-10 md:py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary/10 mb-4 md:mb-6">
              <FileText className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4 px-2">
              Consulta tu <span className="text-primary">Membresía</span>
            </h2>
            <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto px-2">
              Verifica el estado de tu membresía ingresando tu número de carnet
            </p>
          </div>

          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardContent className="p-4 md:p-8">
              {/* Campo de búsqueda - Siempre visible */}
              <div className="relative mb-6" ref={formRef}>
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Input
                      ref={searchInputRef}
                      placeholder="Ingresa tu número de carnet"
                      value={carnet}
                      onChange={(e) => setCarnet(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && consultarCarnet()}
                      className="pl-11 md:pl-12 bg-black/50 border-gray-700 h-12 md:h-14 text-base md:text-lg"
                    />
                    <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                    {carnet && (
                      <button
                        onClick={() => setCarnet("")}
                        className="absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        <X className="h-4 w-4 md:h-5 md:w-5" />
                      </button>
                    )}
                  </div>
                  <Button
                    onClick={consultarCarnet}
                    disabled={loadingConsulta || !carnet.trim()}
                    className="gap-2 md:gap-3 gym-gradient text-black font-bold h-12 md:h-14 px-4 md:px-8 text-base md:text-lg"
                  >
                    {loadingConsulta ? (
                      <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 md:h-5 md:w-5" />
                    )}
                    Consultar
                  </Button>
                </div>
              </div>

              {/* Estado de carga */}
              {loadingConsulta && (
                <div className="text-center py-8 md:py-12 space-y-3 md:space-y-4">
                  <div className="relative">
                    <Loader2 className="h-12 w-12 md:h-16 md:w-16 animate-spin text-primary mx-auto" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ShieldCheck className="h-6 w-6 md:h-8 md:w-8 text-white" />
                    </div>
                  </div>
                  <p className="text-gray-400 text-base md:text-lg animate-pulse">
                    Verificando información...
                  </p>
                </div>
              )}

              {/* Contenido principal */}
              <div className="relative">
                {/* Contenido informativo inicial */}
                {!showResults && !loadingConsulta && (
                  <div
                    ref={infoRef}
                    className="animate-in fade-in duration-300"
                  >
                    <div className="space-y-4 md:space-y-6">
                      <div className="flex justify-center gap-4 md:gap-6 pt-4 md:pt-6 border-t border-gray-800/50">
                        <div className="flex flex-col items-center gap-1 md:gap-2">
                          <div className="p-2 rounded-full bg-green-500/10">
                            <ShieldCheck className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                          </div>
                          <span className="text-xs md:text-sm text-gray-400">
                            Seguro
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-1 md:gap-2">
                          <div className="p-2 rounded-full bg-blue-500/10">
                            <Clock className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                          </div>
                          <span className="text-xs md:text-sm text-gray-400">
                            Instantáneo
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-1 md:gap-2">
                          <div className="p-2 rounded-full bg-primary/10">
                            <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                          </div>
                          <span className="text-xs md:text-sm text-gray-400">
                            Confiable
                          </span>
                        </div>
                      </div>
                      <div className="bg-black/30 p-4 md:p-6 rounded-lg border border-gray-800/50">
                        <h3 className="text-lg md:text-xl font-semibold text-gray-300 mb-2 md:mb-3">
                          ¿Cómo consultar?
                        </h3>
                        <ol className="text-gray-500 text-sm md:text-base text-left space-y-2 md:space-y-3 max-w-md mx-auto">
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                              1
                            </span>
                            <span>
                              Escribe tu número de carnet en el campo superior
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                              2
                            </span>
                            <span>Presiona el botón "Consultar"</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                              3
                            </span>
                            <span>
                              Visualiza el estado de tu membresía en segundos
                            </span>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resultados - Mismo comportamiento en desktop y móvil */}
                {showResults && !loadingConsulta && clienteEncontrado && (
                  <div
                    ref={resultsRef}
                    className="animate-in fade-in duration-300"
                  >
                    <div className="space-y-4 md:space-y-6">
                      {/* Tarjeta de cliente */}
                      <div className="p-4 md:p-6 rounded-xl bg-gradient-to-br from-black to-gray-900 border border-gray-800 shadow-lg">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start justify-between mb-6">
                          <div className="flex items-start gap-3 md:gap-4">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-primary to-yellow-500 flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 md:h-6 md:w-6 text-black" />
                            </div>
                            <div>
                              <h3 className="text-xl md:text-2xl font-bold">
                                {clienteEncontrado.nombre}{" "}
                                {clienteEncontrado.apellido}
                              </h3>
                              <div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-3 mt-2 text-gray-300">
                                <div className="flex items-center gap-1 md:gap-2">
                                  <div className="p-1 md:p-1.5 rounded-md bg-primary/10">
                                    <Calendar className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                                  </div>
                                  <span className="text-sm md:text-base">
                                    <span className="text-gray-400">
                                      Edad:{" "}
                                    </span>
                                    <span className="font-semibold">
                                      {calcularEdad(
                                        clienteEncontrado.fechaNacimiento,
                                      )}{" "}
                                      años
                                    </span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 md:gap-2">
                                  <div className="p-1 md:p-1.5 rounded-md bg-primary/10">
                                    <Phone className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                                  </div>
                                  <span className="text-sm md:text-base">
                                    <span className="text-gray-400">Tel: </span>
                                    <span className="font-semibold">
                                      {clienteEncontrado.celular}
                                    </span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 md:gap-2">
                                  <div className="p-1 md:p-1.5 rounded-md bg-primary/10">
                                    <Building className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                                  </div>
                                  <span className="text-sm md:text-base">
                                    <span className="text-gray-400">
                                      Sucursal:{" "}
                                    </span>
                                    <Badge
                                      className={
                                        clienteEncontrado.sucursal === "Bunker"
                                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30 ml-1 md:ml-2 text-xs"
                                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 ml-1 md:ml-2 text-xs"
                                      }
                                    >
                                      <MapPin className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                                      {clienteEncontrado.sucursal}
                                    </Badge>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 md:mt-0">
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-semibold">
                              <CheckCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                              Miembro Activo
                            </Badge>
                          </div>
                        </div>

                        <Separator className="my-4 bg-gradient-to-r from-transparent via-primary/20 to-transparent h-px" />

                        {/* Planes activos */}
                        <div className="space-y-3 md:space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-bold flex items-center gap-2 md:gap-3">
                              <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                                <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                              </div>
                              Planes Activos
                              <Badge
                                variant="outline"
                                className="ml-2 md:ml-3 text-xs"
                              >
                                {inscripciones.length} Planes
                              </Badge>
                            </h4>
                          </div>

                          <div className="space-y-3 max-h-[300px] md:max-h-[350px] overflow-y-auto pr-2 custom-scroll">
                            {inscripciones.map((inscripcion) => (
                              <div
                                key={inscripcion.id}
                                className="p-3 md:p-4 rounded-lg bg-black/50 border border-gray-800 hover:border-primary/30 transition-all duration-300"
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h5 className="font-bold text-base md:text-lg">
                                      {inscripcion.servicio}
                                    </h5>
                                    <div className="flex flex-wrap gap-1 md:gap-2">
                                      <Badge
                                        className={`
                                          text-xs
                                          ${
                                            inscripcion.estado === "activo"
                                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                                              : "bg-red-500/20 text-red-400 border-red-500/30"
                                          }
                                        `}
                                      >
                                        {inscripcion.estado === "activo"
                                          ? "ACTIVO"
                                          : "VENCIDO"}
                                      </Badge>
                                      <Badge
                                        className={`
                                        text-xs
                                        ${
                                          inscripcion.sucursal === "Bunker"
                                            ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                        }
                                      `}
                                      >
                                        <Building className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                                        {inscripcion.sucursal}
                                      </Badge>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-3">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-md bg-primary/10">
                                        <Calendar className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                                      </div>
                                      <div>
                                        <p className="text-xs md:text-sm text-gray-400">
                                          Vencimiento
                                        </p>
                                        <p className="font-semibold text-sm">
                                          {formatFecha(
                                            inscripcion.fechaVencimiento,
                                          )}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-md bg-yellow-500/10">
                                        <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-yellow-400" />
                                      </div>
                                      <div>
                                        <p className="text-xs md:text-sm text-gray-400">
                                          Ingresos Rest.
                                        </p>
                                        <p className="font-semibold text-sm">
                                          {inscripcion.ingresosRestantes}
                                        </p>
                                      </div>
                                    </div>

                                    {inscripcion.ultimoIngreso && (
                                      <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-md bg-blue-500/10">
                                          <Clock className="h-3 w-3 md:h-4 md:w-4 text-blue-400" />
                                        </div>
                                        <div>
                                          <p className="text-xs md:text-sm text-gray-400">
                                            Últ. Ingreso
                                          </p>
                                          <p className="font-semibold text-sm">
                                            {formatFecha(
                                              inscripcion.ultimoIngreso,
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Botón para nueva consulta */}
                      <Button
                        onClick={resetearConsulta}
                        className="w-full h-12 md:h-12 gym-gradient text-black font-bold text-base md:text-lg"
                      >
                        Nueva Consulta
                      </Button>
                    </div>
                  </div>
                )}

                {/* Mensaje de no encontrado */}
                {showResults &&
                  !loadingConsulta &&
                  !clienteEncontrado &&
                  carnet && (
                    <div className="animate-in fade-in duration-300">
                      <Alert className="bg-red-500/10 border-red-500/20">
                        <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-red-400" />
                        <AlertTitle className="text-base md:text-lg font-semibold text-red-400">
                          Cliente No Encontrado
                        </AlertTitle>
                        <AlertDescription className="text-gray-300 mt-1 md:mt-2 text-sm md:text-base">
                          No encontramos registro del carnet{" "}
                          <span className="font-bold">{carnet}</span>.
                          <p className="mt-1 md:mt-2 text-gray-400 text-sm">
                            Verifica que el número sea correcto o contacta con
                            atención al cliente.
                          </p>
                        </AlertDescription>
                        <div className="mt-3 md:mt-4">
                          <Button
                            onClick={resetearConsulta}
                            className="w-full md:w-auto gym-gradient text-black font-bold text-sm md:text-base"
                          >
                            Nueva Consulta
                          </Button>
                        </div>
                      </Alert>
                    </div>
                  )}
              </div>

              {/* Estilos para el scroll personalizado */}
              <style>{`
                .custom-scroll::-webkit-scrollbar {
                  width: 6px;
                }
                .custom-scroll::-webkit-scrollbar-track {
                  background: rgba(255, 255, 255, 0.05);
                  border-radius: 3px;
                }
                .custom-scroll::-webkit-scrollbar-thumb {
                  background: rgba(255, 255, 255, 0.1);
                  border-radius: 3px;
                }
                .custom-scroll::-webkit-scrollbar-thumb:hover {
                  background: rgba(255, 255, 255, 0.15);
                }
                @media (min-width: 768px) {
                  .custom-scroll::-webkit-scrollbar {
                    width: 8px;
                  }
                }
              `}</style>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
