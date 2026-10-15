// src/pages/admin/views/Planes.tsx
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Building2,
  Calendar,
  Users,
  Tag,
  CheckCircle,
  XCircle,
  FileText,
  Loader2,
  Clock,
  Infinity as InfinityIcon,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPlanesActivos, type Plan } from "@/api/PlanesApi";

// ============================================
// DÍAS
// ============================================
const NOMBRES_DIAS: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

const NOMBRES_DIAS_CORTOS: Record<string, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mié",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sáb",
  sunday: "Dom",
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export function Planes() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [currentIndexPlanes, setCurrentIndexPlanes] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const carruselPlanesRef = useRef<HTMLDivElement>(null);
  const intervalPlanesRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingPlanes = useRef(false);
  const startXPlanes = useRef(0);
  const scrollLeftPlanes = useRef(0);

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    loadPlanes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPlanes = async () => {
    try {
      setLoadingPlanes(true);
      const data = await getPlanesActivos();
      setPlanes(data);
    } catch (error) {
      console.error("Error cargando planes:", error);
    } finally {
      setLoadingPlanes(false);
    }
  };

  // ============================================
  // AUTO-SCROLL (SOLO EN DESKTOP)
  // ============================================
  useEffect(() => {
    // No activar auto-scroll en móvil
    if (isMobile) {
      if (intervalPlanesRef.current) {
        clearInterval(intervalPlanesRef.current);
        intervalPlanesRef.current = null;
      }
      return;
    }

    if (planes.length > 0) {
      intervalPlanesRef.current = setInterval(() => {
        if (!isDraggingPlanes.current) {
          setCurrentIndexPlanes((prev) => {
            const next = (prev + 1) % planes.length;
            scrollToIndex(carruselPlanesRef.current, next);
            return next;
          });
        }
      }, 4000);
    }
    return () => {
      if (intervalPlanesRef.current) clearInterval(intervalPlanesRef.current);
    };
  }, [planes.length, isMobile]);

  // ============================================
  // SCROLL HELPERS
  // ============================================
  const scrollToIndex = (ref: HTMLDivElement | null, index: number) => {
    if (!ref) return;
    const card = ref.children[index] as HTMLElement;
    if (!card) return;
    const refWidth = ref.offsetWidth;
    const cardWidth = card.offsetWidth;
    const scrollPosition = card.offsetLeft - (refWidth - cardWidth) / 2;
    ref.scrollTo({ left: Math.max(0, scrollPosition), behavior: "smooth" });
  };

  const pauseAutoScrollPlanes = () => {
    if (intervalPlanesRef.current) {
      clearInterval(intervalPlanesRef.current);
      intervalPlanesRef.current = null;
    }
  };

  const resumeAutoScrollPlanes = () => {
    // No reanudar auto-scroll en móvil
    if (isMobile) return;
    if (!intervalPlanesRef.current && planes.length > 0) {
      intervalPlanesRef.current = setInterval(() => {
        if (!isDraggingPlanes.current) {
          setCurrentIndexPlanes((prev) => {
            const next = (prev + 1) % planes.length;
            scrollToIndex(carruselPlanesRef.current, next);
            return next;
          });
        }
      }, 4000);
    }
  };

  const scrollPrev = () => {
    pauseAutoScrollPlanes();
    const prev = (currentIndexPlanes - 1 + planes.length) % planes.length;
    setCurrentIndexPlanes(prev);
    scrollToIndex(carruselPlanesRef.current, prev);
    if (!isMobile) setTimeout(resumeAutoScrollPlanes, 3000);
  };

  const scrollNext = () => {
    pauseAutoScrollPlanes();
    const next = (currentIndexPlanes + 1) % planes.length;
    setCurrentIndexPlanes(next);
    scrollToIndex(carruselPlanesRef.current, next);
    if (!isMobile) setTimeout(resumeAutoScrollPlanes, 3000);
  };

  // ============================================
  // DRAG HANDLERS PLANES
  // ============================================
  const handleMouseDownPlanes = (e: React.MouseEvent) => {
    const ref = carruselPlanesRef.current;
    if (!ref) return;
    isDraggingPlanes.current = true;
    startXPlanes.current = e.pageX - ref.offsetLeft;
    scrollLeftPlanes.current = ref.scrollLeft;
    pauseAutoScrollPlanes();
    ref.style.cursor = "grabbing";
    ref.style.userSelect = "none";
  };

  const handleMouseMovePlanes = (e: React.MouseEvent) => {
    if (!isDraggingPlanes.current) return;
    const ref = carruselPlanesRef.current;
    if (!ref) return;
    e.preventDefault();
    const x = e.pageX - ref.offsetLeft;
    const walk = (x - startXPlanes.current) * 2;
    ref.scrollLeft = scrollLeftPlanes.current - walk;
  };

  const handleMouseUpPlanes = () => {
    isDraggingPlanes.current = false;
    const ref = carruselPlanesRef.current;
    if (ref) {
      ref.style.cursor = "grab";
      ref.style.removeProperty("user-select");
    }
    if (!isMobile) setTimeout(resumeAutoScrollPlanes, 3000);
  };

  // ============================================
  // COLOR DEL PLAN
  // ============================================
  const getPlanColor = (plan: Plan) => {
    if (plan.multisucursal) return "primary";
    if (plan.precio > 200) return "primary";
    if (plan.numeroIngresos && plan.numeroIngresos > 30) return "primary";
    return "primary";
  };

  // ============================================
  // LOADING
  // ============================================
  if (loadingPlanes) {
    return (
      <section className="py-12 bg-gradient-to-b from-secondary to-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Cargando planes...</p>
        </div>
      </section>
    );
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <section className="py-8 sm:py-12 bg-gradient-to-b from-secondary to-background relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="mb-8 sm:mb-12">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary text-xs font-semibold tracking-wide">
                MEMBRESÍAS DISPONIBLES
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 text-foreground tracking-tight">
              Nuestros{" "}
              <span className="bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent">
                Planes
              </span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
              {planes.length}{" "}
              {planes.length === 1
                ? "plan disponible"
                : "planes disponibles"}{" "}
              para ti.{" "}
              {isMobile
                ? "Desliza para explorar."
                : "Usa las flechas o desliza para explorar."}
            </p>
          </div>

          {planes.length === 0 ? (
            <div className="text-center py-16">
              <Tag className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground text-lg">
                No hay planes disponibles por el momento
              </p>
              <p className="text-muted-foreground/70 text-sm mt-2">
                Vuelve a intentarlo más tarde
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Flecha Izquierda (desktop) */}
              {planes.length > 1 && (
                <button
                  onClick={scrollPrev}
                  className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-20 w-11 h-11 rounded-full bg-card/90 border border-border hover:border-primary/50 hover:bg-secondary items-center justify-center text-muted-foreground hover:text-primary transition-all shadow-xl"
                  aria-label="Plan anterior"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}

              {/* Flecha Derecha (desktop) */}
              {planes.length > 1 && (
                <button
                  onClick={scrollNext}
                  className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-20 w-11 h-11 rounded-full bg-card/90 border border-border hover:border-primary/50 hover:bg-secondary items-center justify-center text-muted-foreground hover:text-primary transition-all shadow-xl"
                  aria-label="Siguiente plan"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              )}

              {/* Carrusel */}
              <div
                ref={carruselPlanesRef}
                className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 scrollbar-hide pt-4 cursor-grab select-none snap-x snap-mandatory md:snap-none"
                onMouseEnter={() => !isMobile && pauseAutoScrollPlanes()}
                onMouseLeave={() => {
                  if (isMobile) return;
                  if (isDraggingPlanes.current) handleMouseUpPlanes();
                  if (!isDraggingPlanes.current) resumeAutoScrollPlanes();
                }}
                onMouseDown={handleMouseDownPlanes}
                onMouseMove={handleMouseMovePlanes}
                onMouseUp={handleMouseUpPlanes}
                onTouchStart={pauseAutoScrollPlanes}
                onScroll={() => {
                  const ref = carruselPlanesRef.current;
                  if (!ref) return;
                  const cards = Array.from(ref.children) as HTMLElement[];
                  const center = ref.scrollLeft + ref.offsetWidth / 2;
                  let closestIndex = 0;
                  let closestDistance = Infinity;
                  cards.forEach((card, index) => {
                    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
                    const distance = Math.abs(cardCenter - center);
                    if (distance < closestDistance) {
                      closestDistance = distance;
                      closestIndex = index;
                    }
                  });
                  setCurrentIndexPlanes(closestIndex);
                }}
              >
                {planes.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    hoveredCard={hoveredCard}
                    setHoveredCard={setHoveredCard}
                    getPlanColor={getPlanColor}
                  />
                ))}
              </div>

              {/* Indicadores */}
              {planes.length > 1 && (
                <div className="flex justify-center items-center mt-4 gap-1.5">
                  {planes.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        pauseAutoScrollPlanes();
                        setCurrentIndexPlanes(index);
                        scrollToIndex(carruselPlanesRef.current, index);
                        if (!isMobile) setTimeout(resumeAutoScrollPlanes, 3000);
                      }}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        index === currentIndexPlanes
                          ? "w-8 bg-primary shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                          : "w-1.5 bg-muted hover:bg-muted-foreground"
                      )}
                      aria-label={`Ir al plan ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s infinite;
        }
      `}</style>
    </section>
  );
}

// ============================================
// COMPONENTE: PlanCard
// ============================================
interface PlanCardProps {
  plan: Plan;
  hoveredCard: string | null;
  setHoveredCard: (id: string | null) => void;
  getPlanColor: (plan: Plan) => string;
}

function PlanCard({
  plan,
  hoveredCard,
  setHoveredCard,
  getPlanColor,
}: PlanCardProps) {
  const color = getPlanColor(plan);
  // All plans use primary (yellow) now
  const colorClasses = {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/30",
    glow: "hover:shadow-primary/20",
    gradient: "from-primary to-primary/80",
    icon: "text-primary",
  };

  const formatDuracion = () => {
    const cantidad = plan.cantidadDuracion;
    const tipo = (plan.tipoDuracion || "").toLowerCase();
    if (tipo.includes("hora")) {
      return cantidad === 1 ? "1 hora" : `${cantidad} horas`;
    }
    if (tipo === "día" || tipo === "dia" || tipo === "días" || tipo === "dias") {
      return cantidad === 1 ? "1 día" : `${cantidad} días`;
    }
    if (tipo === "mes" || tipo === "meses") {
      return cantidad === 1 ? "1 mes" : `${cantidad} meses`;
    }
    if (tipo === "semana" || tipo === "semanas") {
      return cantidad === 1 ? "1 semana" : `${cantidad} semanas`;
    }
    if (
      tipo === "año" ||
      tipo === "años" ||
      tipo === "ano" ||
      tipo === "anos"
    ) {
      return cantidad === 1 ? "1 año" : `${cantidad} años`;
    }
    return `${cantidad} ${tipo}`;
  };

  const hasDescription = plan.descripcion && plan.descripcion.trim() !== "";
  const hasHorario = plan.hasTimeRange && plan.startTime && plan.endTime;

  return (
    <Card
      className={cn(
        "relative overflow-hidden border transition-all duration-300 w-[280px] sm:w-[320px] flex-shrink-0 hover:shadow-xl group flex flex-col bg-card/80 backdrop-blur-sm snap-center",
        colorClasses.border,
        hoveredCard === plan.id.toString()
          ? "scale-[1.02] " + colorClasses.glow
          : "hover:border-border"
      )}
      onMouseEnter={() => setHoveredCard(plan.id.toString())}
      onMouseLeave={() => setHoveredCard(null)}
    >
      {/* Barra superior de color */}
      <div className={cn("h-1 bg-gradient-to-r", colorClasses.gradient)} />

      {/* Efecto shine */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <CardHeader className="pb-3 pt-4 px-5 relative z-10">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg sm:text-xl font-bold text-foreground flex-1 leading-tight">
            {plan.nombre}
          </CardTitle>
          {plan.multisucursal && (
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] flex-shrink-0 border",
                colorClasses.bg,
                colorClasses.text,
                colorClasses.border
              )}
            >
              <Building2 className="h-3 w-3" />
              <span className="font-semibold uppercase tracking-wide">
                Multi
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 relative z-10 flex-1 flex flex-col px-5 pb-5">
        {/* Precio + Duración */}
        <div className="text-center py-3 rounded-xl bg-input/30 border border-border/50">
          <div className="text-3xl sm:text-4xl font-black text-primary mb-1 leading-none">
            Bs. {plan.precio.toFixed(2)}
          </div>
          <div className="text-muted-foreground text-xs flex items-center justify-center gap-1.5 mt-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">{formatDuracion()}</span>
          </div>
        </div>

        {/* Ingresos */}
        <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-secondary/30 border border-border/50">
          {plan.numeroIngresos ? (
            <>
              <Users className={cn("h-4 w-4", colorClasses.icon)} />
              <span className="font-semibold text-foreground text-sm">
                {plan.numeroIngresos} ingresos
              </span>
            </>
          ) : (
            <>
              <InfinityIcon className={cn("h-4 w-4", colorClasses.icon)} />
              <span className="font-semibold text-foreground text-sm">
                Ingresos ilimitados
              </span>
            </>
          )}
        </div>

        {/* Descripción */}
        {hasDescription && (
          <div
            className={cn(
              "text-xs text-foreground border-l-2 pl-3 py-2 rounded-r-md",
              colorClasses.border,
              colorClasses.bg
            )}
          >
            <div className="flex items-start gap-2">
              <FileText
                className={cn(
                  "h-3.5 w-3.5 mt-0.5 flex-shrink-0",
                  colorClasses.icon
                )}
              />
              <span className="line-clamp-3 leading-relaxed">
                {plan.descripcion}
              </span>
            </div>
          </div>
        )}

        {/* Horarios */}
        {hasHorario && (
          <div
            className={cn(
              "space-y-2 p-3 rounded-lg border",
              colorClasses.border,
              colorClasses.bg
            )}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground uppercase tracking-wide">
              <Clock className={cn("h-3.5 w-3.5", colorClasses.icon)} />
              <span>Disponibilidad</span>
            </div>

            <div className="text-sm font-bold text-foreground">
              {plan.startTime.slice(0, 5)} - {plan.endTime.slice(0, 5)}
            </div>

            {plan.hasSpecificDays && plan.specificDays.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {plan.specificDays.map((dia) => (
                  <span
                    key={dia}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-bold border",
                      colorClasses.text,
                      colorClasses.border,
                      "bg-white/5"
                    )}
                    title={NOMBRES_DIAS[dia]}
                  >
                    {NOMBRES_DIAS_CORTOS[dia]}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                <Info className="h-3 w-3" />
                Todos los días
              </div>
            )}
          </div>
        )}

        {/* Sucursales */}
        <div className="space-y-2.5 mt-auto pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-foreground">
              <MapPin className={cn("h-4 w-4", colorClasses.icon)} />
              <span className="font-semibold">Sucursales</span>
            </div>
            <span
              className={cn(
                "text-xs font-bold px-2 py-0.5 rounded-full border",
                colorClasses.bg,
                colorClasses.text,
                colorClasses.border
              )}
            >
              {plan.sucursales.length}
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground italic leading-relaxed">
            {plan.multisucursal
              ? "Accede a todas las sucursales con este plan"
              : "Válido para la sucursal seleccionada"}
          </p>

          <div className="flex flex-col gap-1.5 max-h-[88px] overflow-y-auto pr-1 scrollbar-thin">
            {plan.sucursales.map((sucursal) => (
              <div
                key={sucursal.id}
                className={cn(
                  "px-2.5 py-1.5 rounded-md text-xs flex items-center gap-2 transition-all duration-200",
                  colorClasses.bg,
                  colorClasses.text
                )}
              >
                {sucursal.disponible ? (
                  <CheckCircle className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 flex-shrink-0 opacity-60" />
                )}
                <span className="truncate font-medium">{sucursal.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Planes;