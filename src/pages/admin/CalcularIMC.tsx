// src/pages/admin/views/CalcularIMC.tsx
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Scale,
  Calculator,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Heart,
  TrendingUp,
  Activity,
  Sparkles,
  Info,
  Target,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { cn } from "@/lib/utils";

export function CalcularIMC() {
  const [pesoInput, setPesoInput] = useState<string>("70");
  const [alturaInput, setAlturaInput] = useState<string>("170");
  const [imc, setImc] = useState<number | null>(null);
  const [categoria, setCategoria] = useState<string>("");
  const [imcCalculadoMobile, setImcCalculadoMobile] = useState(false);

  const peso = pesoInput === "" ? 0 : Number(pesoInput);
  const altura = alturaInput === "" ? 0 : Number(alturaInput);

  const categoriasIMC = [
    {
      min: 0,
      max: 18.5,
      categoria: "Bajo peso",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      icon: TrendingUp,
      recomendacion:
        "Recomendamos nuestro programa de ganancia muscular con seguimiento nutricional personalizado.",
    },
    {
      min: 18.5,
      max: 24.9,
      categoria: "Peso normal",
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
      icon: CheckCircle,
      recomendacion:
        "¡Excelente! Mantén tu rutina o mejora tu condición física con nuestros planes avanzados.",
    },
    {
      min: 25,
      max: 29.9,
      categoria: "Sobrepeso",
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
      icon: AlertCircle,
      recomendacion:
        "Te recomendamos nuestro programa de pérdida de peso con entrenamiento cardiovascular y nutrición.",
    },
    {
      min: 30,
      max: 34.9,
      categoria: "Obesidad I",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/30",
      icon: Heart,
      recomendacion:
        "Nuestros entrenadores especializados pueden ayudarte con un programa seguro y efectivo.",
    },
    {
      min: 35,
      max: 39.9,
      categoria: "Obesidad II",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-destructive/30",
      icon: Heart,
      recomendacion:
        "Nuestros entrenadores especializados pueden ayudarte con un programa seguro y efectivo.",
    },
    {
      min: 40,
      max: 100,
      categoria: "Obesidad III",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-destructive/30",
      icon: Heart,
      recomendacion:
        "Nuestros entrenadores especializados pueden ayudarte con un programa seguro y efectivo.",
    },
  ];

  const categoriaActual = imc
    ? categoriasIMC.find((cat) => imc >= cat.min && imc <= cat.max)
    : null;

  // Abrir WhatsApp
  const abrirWhatsApp = () => {
    let imcTexto = "aún no calculado";
    if (imc !== null) imcTexto = imc.toString();

    const mensaje = encodeURIComponent(
      `Hola, me gustaría recibir asesoría para un plan nutricional personalizado para mi proceso en el gimnasio Mutant.\n\n` +
        `Mis datos actuales son:\n` +
        `• Peso: ${peso} kg\n` +
        `• Altura: ${altura} cm\n` +
        `• IMC: ${imcTexto}\n` +
        `${categoria ? `• Categoría: ${categoria}\n` : ""}\n` +
        `Quedo atento a su respuesta. ¡Gracias!`
    );
    window.open(`https://wa.me/+59176989991?text=${mensaje}`, "_blank");
  };

  // Calcular IMC
  const calcularIMC = () => {
    if (peso <= 0 || altura <= 0) return;
    const alturaMetros = altura / 100;
    const calculo = peso / (alturaMetros * alturaMetros);
    const imcCalculado = parseFloat(calculo.toFixed(1));
    setImc(imcCalculado);

    const categoriaEncontrada = categoriasIMC.find(
      (cat) => imcCalculado >= cat.min && imcCalculado <= cat.max
    );
    if (categoriaEncontrada) setCategoria(categoriaEncontrada.categoria);

    if (window.innerWidth < 768) setImcCalculadoMobile(true);
  };

  const recalcularIMCMobile = () => setImcCalculadoMobile(false);

  const sanitizarNumero = (valor: string, permitirDecimal = false): string => {
    if (permitirDecimal) {
      const limpio = valor.replace(/[^0-9.]/g, "");
      const partes = limpio.split(".");
      if (partes.length > 2) return partes[0] + "." + partes.slice(1).join("");
      return limpio;
    }
    return valor.replace(/[^0-9]/g, "");
  };

  useEffect(() => {
    if (window.innerWidth >= 768 && peso > 0 && altura > 0) {
      const alturaMetros = altura / 100;
      const calculo = peso / (alturaMetros * alturaMetros);
      const imcCalculado = parseFloat(calculo.toFixed(1));
      setImc(imcCalculado);
      const categoriaEncontrada = categoriasIMC.find(
        (cat) => imcCalculado >= cat.min && imcCalculado <= cat.max
      );
      if (categoriaEncontrada) setCategoria(categoriaEncontrada.categoria);
    }
  }, [peso, altura]);

  // ============================================
  // COMPONENTES REUTILIZABLES
  // ============================================

  const InputsSection = () => (
    <div className="space-y-5">
      {/* Peso */}
      <div>
        <Label className="text-foreground mb-2.5 flex items-center gap-2 text-sm sm:text-base font-semibold">
          <Scale className="h-4 w-4 text-primary" />
          Peso (kg)
        </Label>
        <div className="flex items-center gap-3">
          <Input
            type="text"
            inputMode="decimal"
            value={pesoInput}
            onChange={(e) =>
              setPesoInput(sanitizarNumero(e.target.value, true))
            }
            placeholder="0"
            className="bg-input border-border text-center text-xl font-bold h-12 rounded-lg focus:border-primary focus:ring-primary/20 w-28 sm:w-32"
          />
          <span className="text-muted-foreground text-base font-medium">kg</span>
        </div>
        <Slider
          value={[peso]}
          onValueChange={([value]) => setPesoInput(String(value))}
          min={30}
          max={200}
          step={0.5}
          className="mt-4"
        />
        <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-2 font-medium">
          <span>30 kg</span>
          <span>200 kg</span>
        </div>
      </div>

      {/* Altura */}
      <div>
        <Label className="text-foreground mb-2.5 flex items-center gap-2 text-sm sm:text-base font-semibold">
          <Activity className="h-4 w-4 text-primary" />
          Altura (cm)
        </Label>
        <div className="flex items-center gap-3">
          <Input
            type="text"
            inputMode="numeric"
            value={alturaInput}
            onChange={(e) =>
              setAlturaInput(sanitizarNumero(e.target.value, false))
            }
            placeholder="0"
            className="bg-input border-border text-center text-xl font-bold h-12 rounded-lg focus:border-primary focus:ring-primary/20 w-28 sm:w-32"
          />
          <span className="text-muted-foreground text-base font-medium">cm</span>
        </div>
        <Slider
          value={[altura]}
          onValueChange={([value]) => setAlturaInput(String(value))}
          min={100}
          max={250}
          step={1}
          className="mt-4"
        />
        <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-2 font-medium">
          <span>100 cm</span>
          <span>250 cm</span>
        </div>
      </div>
    </div>
  );

  const ResultadoSection = ({ isMobile = false }: { isMobile?: boolean }) => {
    if (imc === null || !categoriaActual) return null;
    const IconoCat = categoriaActual.icon;

    return (
      <div className="space-y-4">
        {/* Card del resultado */}
        <div className="text-center p-5 sm:p-6 rounded-xl bg-gradient-to-br from-secondary/80 to-card/80 border border-border/50 relative overflow-hidden">
          <div
            className={cn(
              "absolute inset-0 opacity-30",
              categoriaActual.bgColor
            )}
          />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-input/40 border border-border mb-3">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-[10px] sm:text-xs font-semibold text-foreground tracking-wide">
                TU RESULTADO
              </span>
            </div>

            <div className="text-5xl sm:text-6xl font-black text-primary mb-1 drop-shadow-[0_0_20px_rgba(250,204,21,0.3)]">
              {imc}
            </div>
            <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-4">
              Índice de Masa Corporal
            </div>

            <div
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm sm:text-base font-bold border",
                categoriaActual.bgColor,
                categoriaActual.color,
                categoriaActual.borderColor
              )}
            >
              <IconoCat className="h-4 w-4" />
              {categoria}
            </div>
          </div>
        </div>

        {/* Recomendación */}
        <Card className="bg-secondary/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "p-2 rounded-lg flex-shrink-0",
                  categoriaActual.bgColor
                )}
              >
                <Info className={cn("h-4 w-4", categoriaActual.color)} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground mb-1">
                  Recomendación Personalizada
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {categoriaActual.recomendacion}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de referencia */}
        {!isMobile && (
          <div>
            <h4 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Tabla de Referencia IMC
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {categoriasIMC.map((cat) => {
                const isActive = imc >= cat.min && imc <= cat.max;
                return (
                  <div
                    key={cat.categoria}
                    className={cn(
                      "p-2.5 rounded-lg text-center border transition-all",
                      isActive
                        ? `${cat.borderColor} ${cat.bgColor} ring-1 ring-primary/50 scale-[1.02]`
                        : "border-border/50 bg-secondary/30"
                    )}
                  >
                    <div
                      className={cn(
                        "font-bold text-[11px] sm:text-xs",
                        isActive ? cat.color : "text-muted-foreground"
                      )}
                    >
                      {cat.categoria}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {cat.min} - {cat.max}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const BotonesSection = ({ showRecalcular = false }: { showRecalcular?: boolean }) => (
    <div className="space-y-2.5">
      <Button
        onClick={() => (window.location.hash = "unete-ahora")}
        className="w-full gym-gradient text-primary-foreground font-bold h-12 text-sm sm:text-base rounded-lg hover:shadow-[0_0_30px_rgba(250,204,21,0.3)] transition-all gap-2"
      >
        <Target className="h-4 w-4" />
        ¡Comienza tu Transformación!
      </Button>

      <Button
        onClick={abrirWhatsApp}
        variant="outline"
        className="w-full border-primary/50 text-primary hover:bg-primary/10 hover:border-primary h-12 text-xs sm:text-sm rounded-lg gap-2 transition-all"
      >
        <FaWhatsapp className="h-4 w-4 flex-shrink-0" />
        <span className="text-center leading-tight">
          ¿Quieres asesoría nutricional? Contáctanos
        </span>
      </Button>

      {showRecalcular && (
        <Button
          onClick={recalcularIMCMobile}
          variant="outline"
          className="w-full border-primary/50 text-primary hover:bg-primary/10 hover:border-primary h-12 text-sm rounded-lg gap-2 transition-all"
        >
          <RotateCcw className="h-4 w-4" />
          Recalcular IMC
        </Button>
      )}
    </div>
  );

  // ============================================
  // RENDER PRINCIPAL
  // ============================================
  return (
    <section className="py-8 sm:py-16 bg-gradient-to-br from-secondary via-background to-black relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-3 sm:px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* ============ HEADER ============ */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Calculator className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary text-[10px] sm:text-xs font-semibold tracking-wide">
                HERRAMIENTA DE SALUD
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black mb-3 text-foreground tracking-tight">
              ¿Sabes cuál es tu{" "}
              <span className="bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent">
                IMC
              </span>
              ?
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
              Calcula tu Índice de Masa Corporal para conocer tu estado de
              salud y recibir recomendaciones personalizadas
            </p>
          </div>

          {/* ============ CARD PRINCIPAL ============ */}
          <Card className="bg-card/80 border-border backdrop-blur-sm shadow-2xl shadow-black/50 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary" />
            <CardContent className="p-4 sm:p-6 md:p-8">
              {/* ============ VISTA DESKTOP ============ */}
              <div className="hidden md:grid md:grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Columna izquierda: Inputs + Botones */}
                <div className="space-y-6">
                  <InputsSection />
                  <BotonesSection />
                </div>

                {/* Columna derecha: Resultados */}
                {imc !== null && (
                  <div className="space-y-6">
                    <ResultadoSection />
                  </div>
                )}
              </div>

              {/* ============ VISTA MÓVIL ============ */}
              <div className="md:hidden">
                {!imcCalculadoMobile ? (
                  <div className="space-y-6">
                    <InputsSection />

                    <Button
                      onClick={calcularIMC}
                      className="w-full gym-gradient text-primary-foreground font-bold h-12 text-base rounded-lg gap-2 hover:shadow-[0_0_30px_rgba(250,204,21,0.3)] transition-all"
                    >
                      <Calculator className="h-5 w-5" />
                      Calcular IMC
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <ResultadoSection isMobile />

                    {/* Tabla referencia compacta en móvil */}
                    <div>
                      <h4 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        Tabla de Referencia
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {categoriasIMC.map((cat) => {
                          const isActive = imc! >= cat.min && imc! <= cat.max;
                          return (
                            <div
                              key={cat.categoria}
                              className={cn(
                                "p-2 rounded-lg text-center border transition-all",
                                isActive
                                  ? `${cat.borderColor} ${cat.bgColor} ring-1 ring-primary/50`
                                  : "border-border/50 bg-secondary/30"
                              )}
                            >
                              <div
                                className={cn(
                                  "font-bold text-[11px]",
                                  isActive ? cat.color : "text-muted-foreground"
                                )}
                              >
                                {cat.categoria}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {cat.min} - {cat.max}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <BotonesSection showRecalcular />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default CalcularIMC;