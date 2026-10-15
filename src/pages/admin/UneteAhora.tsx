// src/pages/admin/UneteAhora.tsx
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  UserCheck,
  UserPlus,
  RefreshCw,
  Clock,
  X,
  CreditCard,
  MapPin,
  TrendingUp,
  TrendingDown,
  Phone,
  IdCard,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Calendar,
  Ticket,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UsuarioExistente,
  BuscarUsuarioResponse,
  buscarUsuarioPorCI,
  registrarUsuario,
} from "@/api/UneteAhoraApi";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import spiderlabsLogo from "@/assets/Logo-sl.png";

export function UneteAhora() {
  const [paso, setPaso] = useState<"busqueda" | "nuevo" | "existe">("busqueda");
  const [ciBusqueda, setCiBusqueda] = useState("");
  const [usuarioEncontrado, setUsuarioEncontrado] =
    useState<UsuarioExistente | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [showExitoDialog, setShowExitoDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  const [formData, setFormData] = useState({
    ci: "",
    nombre: "",
    apellido: "",
    celular: "",
  });

  const [ciError, setCiError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Función para formatear fecha (DD/MM/YYYY)
  const formatearFecha = (fechaString: string): string => {
    if (!fechaString) return "No definida";
    try {
      const fecha = new Date(fechaString);
      if (isNaN(fecha.getTime())) return "Fecha inválida";
      const day = String(fecha.getDate()).padStart(2, "0");
      const month = String(fecha.getMonth() + 1).padStart(2, "0");
      const year = fecha.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Error formateando fecha:", error);
      return "Fecha inválida";
    }
  };

  // Función para formatear fecha con formato amigable
  const formatearFechaAmigable = (fechaString: string): string => {
    if (!fechaString) return "No definida";
    try {
      const fecha = new Date(fechaString);
      if (isNaN(fecha.getTime())) return "Fecha inválida";
      return format(fecha, "dd MMM yyyy", { locale: es });
    } catch (error) {
      console.error("Error formateando fecha:", error);
      return "Fecha inválida";
    }
  };

  // Función para calcular días restantes
  const calcularDiasRestantes = (fechaVencimiento: string): number => {
    if (!fechaVencimiento) return 0;
    try {
      const vencimiento = new Date(fechaVencimiento);
      const hoy = new Date();
      if (isNaN(vencimiento.getTime())) return 0;
      hoy.setHours(0, 0, 0, 0);
      vencimiento.setHours(0, 0, 0, 0);
      const diferenciaMs = vencimiento.getTime() - hoy.getTime();
      return Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error("Error calculando días restantes:", error);
      return 0;
    }
  };

  // Validación de cédula de identidad
  const validateCI = (ci: string): boolean => {
    if (!ci) {
      setCiError("");
      return true;
    }
    if (ci.length < 7 || ci.length > 12) {
      setCiError("La cédula debe tener entre 7 y 12 caracteres");
      return false;
    }
    if (/^[a-zA-Z]+$/.test(ci)) {
      setCiError("La cédula no puede contener solo letras");
      return false;
    }
    if (/[^a-zA-Z0-9]/.test(ci)) {
      setCiError("La cédula solo puede contener números y letras");
      return false;
    }
    setCiError("");
    return true;
  };

  // Validación de teléfono
  const validatePhone = (phone: string): boolean => {
    if (!phone) {
      setPhoneError("");
      return true;
    }
    if (!/^\d+$/.test(phone)) {
      setPhoneError("El teléfono solo puede contener números");
      return false;
    }
    if (phone.length !== 8) {
      setPhoneError("El teléfono debe tener exactamente 8 dígitos");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const buscarUsuario = async () => {
    if (!ciBusqueda.trim()) {
      mostrarError("Por favor, ingresa un número de carnet de identidad");
      return;
    }
    setBuscando(true);
    setError(null);
    setShowError(false);
    try {
      const resultado: BuscarUsuarioResponse =
        await buscarUsuarioPorCI(ciBusqueda);
      if (resultado.encontrado && resultado.usuario) {
        setUsuarioEncontrado(resultado.usuario);
        setPaso("existe");
      } else {
        setUsuarioEncontrado(null);
        setPaso("nuevo");
        setFormData({ ci: ciBusqueda, nombre: "", apellido: "", celular: "" });
        validateCI(ciBusqueda);
      }
    } catch (error: any) {
      console.error("Error buscando usuario:", error);
      mostrarError(
        error.message ||
          "Error al buscar usuario. Por favor, intenta nuevamente.",
      );
      setUsuarioEncontrado(null);
      setPaso("nuevo");
      setFormData({ ci: ciBusqueda, nombre: "", apellido: "", celular: "" });
      validateCI(ciBusqueda);
    } finally {
      setBuscando(false);
    }
  };

  const manejarRegistro = async () => {
    if (
      !formData.ci ||
      !formData.nombre ||
      !formData.apellido ||
      !formData.celular
    ) {
      mostrarError("Por favor, completa todos los campos obligatorios");
      return;
    }
    if (!validateCI(formData.ci)) return;
    if (!validatePhone(formData.celular)) return;

    setRegistrando(true);
    setError(null);
    setShowError(false);
    try {
      const resultado = await registrarUsuario({
        ci: formData.ci,
        nombre: formData.nombre,
        apellido: formData.apellido,
        celular: formData.celular,
      });
      if (resultado.success) {
        setShowExitoDialog(true);
      } else {
        mostrarError(resultado.mensaje || "Error al registrar usuario");
      }
    } catch (error: any) {
      console.error("Error en registro:", error);
      mostrarError(
        error.message ||
          "Hubo un error al registrar el usuario. Por favor, intenta nuevamente.",
      );
    } finally {
      setRegistrando(false);
    }
  };

  const mostrarError = (mensaje: string) => {
    setError(mensaje);
    setShowError(true);
    setTimeout(() => setShowError(false), 5000);
  };

  const cerrarError = () => {
    setShowError(false);
    setError(null);
  };

  const reiniciarProceso = () => {
    setPaso("busqueda");
    setCiBusqueda("");
    setUsuarioEncontrado(null);
    setFormData({ ci: "", nombre: "", apellido: "", celular: "" });
    setError(null);
    setShowError(false);
    setCiError("");
    setPhoneError("");
  };

  const handleCloseModal = () => {
    setShowExitoDialog(false);
    reiniciarProceso();
  };

  useEffect(() => {
    if (formData.ci) validateCI(formData.ci);
    if (formData.celular) validatePhone(formData.celular);
  }, [formData.ci, formData.celular]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary to-black flex items-center justify-center relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <AnimatePresence>
        {showError && error && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-2 right-2 left-2 sm:left-auto sm:top-4 sm:right-4 z-50 w-auto sm:w-full sm:max-w-md"
          >
            <Alert className="bg-destructive/90 border-destructive backdrop-blur-sm py-2">
              <AlertCircle className="h-4 w-4 text-destructive-foreground" />
              <AlertTitle className="text-destructive-foreground font-semibold text-sm">
                Error
              </AlertTitle>
              <AlertDescription className="text-foreground text-xs">
                {error}
              </AlertDescription>
              <button
                onClick={cerrarError}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenedor principal */}
      <div className="container mx-auto px-4 w-full max-w-md relative z-10 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="relative inline-block">
            <div className="absolute inset-0 blur-2xl opacity-50 bg-gradient-to-r from-primary/40 via-primary/40 to-primary/40 -z-10 scale-110" />

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative text-3xl sm:text-4xl font-black tracking-tight"
            >
              <span className="relative inline-block bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">
                MUTANT GYM
              </span>
            </motion.h1>

            <div className="h-0.5 mt-2 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* PASO 1: BÚSQUEDA */}
          {paso === "busqueda" && (
            <motion.div
              key="busqueda"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="bg-card/80 border-border backdrop-blur-sm shadow-2xl shadow-black/50 overflow-hidden">
                <div className="h-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary" />
                <CardContent className="p-5 sm:p-6">
                  <div className="space-y-5">
                    {/* Header del paso */}
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-3 border border-primary/20">
                        <UserCheck className="h-7 w-7 text-primary" />
                      </div>
                      <h2 className="text-xl font-bold mb-1.5 text-foreground">
                        Consulta tu Información
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        Ingresa tu carnet para verificar tu registro
                      </p>
                    </div>

                    {/* Input de búsqueda */}
                    <div className="space-y-3">
                      <div className="relative">
                        <Input
                          placeholder="Ej: 12345678"
                          value={ciBusqueda}
                          onChange={(e) => setCiBusqueda(e.target.value)}
                          className="bg-input border-border pl-11 pr-20 h-13 text-base rounded-lg focus:border-primary focus:ring-primary/20 transition-all"
                          onKeyDown={(e) =>
                            e.key === "Enter" && buscarUsuario()
                          }
                        />
                        <div className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                          <IdCard className="h-5 w-5" />
                        </div>
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Badge
                            variant="outline"
                            className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold px-2 py-0.5"
                          >
                            CARNET
                          </Badge>
                        </div>
                      </div>

                      <Button
                        onClick={buscarUsuario}
                        disabled={!ciBusqueda.trim() || buscando}
                        className="w-full gym-gradient text-primary-foreground font-bold h-13 text-base rounded-lg hover:shadow-[0_0_25px_rgba(250,204,21,0.3)] transition-all duration-300"
                      >
                        {buscando ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Buscando...
                          </>
                        ) : (
                          <>
                            <Search className="h-5 w-5 mr-2" />
                            Consultar
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Separador */}
                    <div className="relative">
                      <Separator className="bg-border" />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-muted-foreground text-xs">
                        o
                      </span>
                    </div>

                    {/* Nuevo usuario */}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPaso("nuevo");
                        setUsuarioEncontrado(null);
                        setFormData({
                          ci: "",
                          nombre: "",
                          apellido: "",
                          celular: "",
                        });
                      }}
                      className="w-full border-border text-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 h-12 text-sm rounded-lg transition-all duration-300"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Soy nuevo usuario
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>

                    {/* Crédito SpiderLabs */}
                    <div className="flex flex-col items-center gap-2 pt-4 border-t border-border/50">
                      <div className="text-muted-foreground/60 text-[10px] font-light tracking-wide">
                        Desarrollado por SPIDERLABS SYSTEMS S.R.L
                      </div>
                      <a
                        href="https://beacons.ai/spiderlabs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-secondary/50 rounded-md border border-border/50 hover:bg-secondary/80 hover:border-primary/30 transition-all duration-300"
                      >
                        <img
                          src={spiderlabsLogo}
                          alt="SPIDERLABS"
                          className="h-8 sm:h-9 mx-auto transition-opacity hover:opacity-90"
                        />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* PASO 2: NUEVO USUARIO */}
          {paso === "nuevo" && (
            <motion.div
              key="nuevo"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="bg-card/80 border-border backdrop-blur-sm shadow-2xl shadow-black/50 overflow-hidden">
                <div className="h-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary" />
                <CardContent className="p-5 sm:p-6">
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                          <UserPlus className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-foreground">
                            Nuevo Usuario
                          </h2>
                          <p className="text-muted-foreground text-xs">
                            Completa tus datos
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={reiniciarProceso}
                        className="text-muted-foreground hover:text-foreground hover:bg-secondary h-9 px-3"
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        <span className="text-xs">Volver</span>
                      </Button>
                    </div>

                    {/* Formulario */}
                    <div className="space-y-3.5">
                      {/* CI */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="ci"
                          className="text-foreground text-sm font-medium flex items-center gap-1.5"
                        >
                          <IdCard className="h-4 w-4 text-primary" />
                          Cédula de Identidad{" "}
                          <span className="text-primary">*</span>
                        </Label>
                        <Input
                          id="ci"
                          placeholder="Ej: 1234567"
                          value={formData.ci}
                          onChange={(e) =>
                            setFormData({ ...formData, ci: e.target.value })
                          }
                          className={`bg-input border-border h-12 text-base rounded-lg transition-all ${
                            ciError
                              ? "border-destructive focus:ring-destructive focus:border-destructive"
                              : "focus:border-primary focus:ring-primary/20"
                          }`}
                          disabled={registrando}
                          maxLength={12}
                        />
                        {ciError && (
                          <p className="text-destructive text-xs flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {ciError}
                          </p>
                        )}
                      </div>

                      {/* Grid Nombre + Apellido */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="nombre"
                            className="text-foreground text-sm font-medium flex items-center gap-1.5"
                          >
                            <User className="h-4 w-4 text-primary" />
                            Nombre <span className="text-primary">*</span>
                          </Label>
                          <Input
                            id="nombre"
                            placeholder="Juan"
                            value={formData.nombre}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                nombre: e.target.value,
                              })
                            }
                            className="bg-input border-border h-12 text-base rounded-lg focus:border-primary focus:ring-primary/20 transition-all"
                            disabled={registrando}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label
                            htmlFor="apellido"
                            className="text-foreground text-sm font-medium flex items-center gap-1.5"
                          >
                            <User className="h-4 w-4 text-primary" />
                            Apellido <span className="text-primary">*</span>
                          </Label>
                          <Input
                            id="apellido"
                            placeholder="Pérez"
                            value={formData.apellido}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                apellido: e.target.value,
                              })
                            }
                            className="bg-input border-border h-12 text-base rounded-lg focus:border-primary focus:ring-primary/20 transition-all"
                            disabled={registrando}
                          />
                        </div>
                      </div>

                      {/* Celular */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="celular"
                          className="text-foreground text-sm font-medium flex items-center gap-1.5"
                        >
                          <Phone className="h-4 w-4 text-primary" />
                          Celular <span className="text-primary">*</span>
                        </Label>
                        <Input
                          id="celular"
                          placeholder="Ej: 77712345"
                          value={formData.celular}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              celular: e.target.value,
                            })
                          }
                          className={`bg-input border-border h-12 text-base rounded-lg transition-all ${
                            phoneError
                              ? "border-destructive focus:ring-destructive focus:border-destructive"
                              : "focus:border-primary focus:ring-primary/20"
                          }`}
                          disabled={registrando}
                          type="tel"
                          maxLength={8}
                        />
                        {phoneError && (
                          <p className="text-destructive text-xs flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {phoneError}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Botón de registro */}
                    <Button
                      onClick={manejarRegistro}
                      disabled={
                        !formData.ci ||
                        !formData.nombre ||
                        !formData.apellido ||
                        !formData.celular ||
                        registrando ||
                        !!ciError ||
                        !!phoneError
                      }
                      className="w-full gym-gradient text-primary-foreground font-bold h-13 text-base rounded-lg hover:shadow-[0_0_25px_rgba(250,204,21,0.3)] transition-all duration-300"
                    >
                      {registrando ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Registrando...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-5 w-5 mr-2" />
                          Completar Registro
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* PASO 3: USUARIO EXISTE */}
          {paso === "existe" && usuarioEncontrado && (
            <motion.div
              key="existe"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="bg-card/80 border-border backdrop-blur-sm shadow-2xl shadow-black/50 overflow-hidden">
                <div className="h-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary" />
                <CardContent className="p-5 sm:p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex-shrink-0">
                          <CheckCircle className="h-6 w-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-lg font-bold text-foreground truncate">
                            ¡Hola, {usuarioEncontrado.nombre}!
                          </h2>
                          <p className="text-muted-foreground text-xs truncate">
                            {usuarioEncontrado.tieneInscripcionActiva
                              ? "Tienes planes activos"
                              : "Sin planes activos"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={reiniciarProceso}
                        className="text-muted-foreground hover:text-foreground hover:bg-secondary h-9 px-3 flex-shrink-0"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Tarjeta de usuario */}
                    <div className="bg-secondary/50 border border-border rounded-lg p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/20 flex items-center justify-center border border-primary/30 flex-shrink-0">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-foreground truncate">
                            {usuarioEncontrado.nombre}{" "}
                            {usuarioEncontrado.apellido}
                          </h3>
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <IdCard className="h-3.5 w-3.5 text-primary" />
                              {usuarioEncontrado.ci}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5 text-primary" />
                              {usuarioEncontrado.celular || "N/R"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Planes */}
                    {usuarioEncontrado.ultimasInscripciones &&
                    usuarioEncontrado.ultimasInscripciones.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold flex items-center gap-2 text-foreground">
                            <Ticket className="h-4 w-4 text-primary" />
                            Tus Planes
                          </h4>
                          <Badge
                            variant="outline"
                            className={cn(
                              "px-2.5 py-0.5 text-[10px]",
                              usuarioEncontrado.tieneInscripcionActiva
                                ? "bg-primary/20 text-primary border-primary/30"
                                : "bg-muted/20 text-muted-foreground border-muted/30",
                            )}
                          >
                            {usuarioEncontrado.ultimasInscripciones.length}{" "}
                            plan(es)
                          </Badge>
                        </div>

                        <div className="space-y-2 max-h-[300px] sm:max-h-[340px] overflow-y-auto pr-1 -mr-1">
                          {usuarioEncontrado.ultimasInscripciones.map(
                            (inscripcion, index) => {
                              const diasRestantes = calcularDiasRestantes(
                                inscripcion.fecha_vencimiento,
                              );
                              return (
                                <div
                                  key={`${inscripcion.id}-${index}`}
                                  className={cn(
                                    "border rounded-lg overflow-hidden",
                                    inscripcion.activa
                                      ? "border-primary/30 bg-primary/5"
                                      : "border-destructive/30 bg-destructive/5",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "h-0.5",
                                      inscripcion.activa
                                        ? "bg-gradient-to-r from-primary to-primary/80"
                                        : "bg-gradient-to-r from-destructive to-destructive/80",
                                    )}
                                  />
                                  <div className="p-3">
                                    {/* Header del plan */}
                                    <div className="flex items-start justify-between gap-2 mb-2.5">
                                      <div className="min-w-0 flex-1">
                                        <h5 className="font-bold text-sm text-foreground truncate">
                                          {inscripcion.servicio_nombre}
                                        </h5>
                                        <div className="flex items-center gap-1 mt-1">
                                          <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                          <span className="text-xs text-muted-foreground truncate">
                                            {inscripcion.sucursal_nombre}
                                          </span>
                                        </div>
                                      </div>
                                      <Badge
                                        className={cn(
                                          "px-2 py-0.5 text-[10px] flex-shrink-0",
                                          inscripcion.activa
                                            ? "bg-primary/20 text-primary border-primary/30"
                                            : "bg-destructive/20 text-destructive border-destructive/30",
                                        )}
                                      >
                                        {inscripcion.activa
                                          ? "ACTIVA"
                                          : "VENCIDA"}
                                      </Badge>
                                    </div>

                                    {/* Info del plan */}
                                    <div className="flex items-center justify-between gap-2 text-xs">
                                      <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>
                                          {formatearFechaAmigable(
                                            inscripcion.fecha_vencimiento,
                                          )}
                                        </span>
                                      </div>

                                      <div
                                        className={cn(
                                          "flex items-center gap-1 px-2.5 py-1 rounded font-bold text-[11px]",
                                          inscripcion.activa
                                            ? diasRestantes > 7
                                              ? "bg-primary/20 text-primary"
                                              : diasRestantes > 3
                                                ? "bg-warning/20 text-warning"
                                                : "bg-destructive/20 text-destructive"
                                            : "bg-muted/20 text-muted-foreground",
                                        )}
                                      >
                                        {inscripcion.activa ? (
                                          <>
                                            {diasRestantes > 7 ? (
                                              <TrendingUp className="h-3.5 w-3.5" />
                                            ) : diasRestantes > 3 ? (
                                              <TrendingDown className="h-3.5 w-3.5" />
                                            ) : (
                                              <AlertCircle className="h-3.5 w-3.5" />
                                            )}
                                            <span>{diasRestantes} días</span>
                                          </>
                                        ) : (
                                          <span>VENCIDO</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Ingresos disponibles */}
                                    {inscripcion.ingresos_disponibles !==
                                      null && (
                                      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border">
                                        <span className="text-xs text-muted-foreground">
                                          Ingresos disponibles
                                        </span>
                                        <span className="text-base font-bold text-foreground">
                                          {inscripcion.ingresos_disponibles}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </div>

                        {/* Alerta informativa */}
                        <div
                          className={cn(
                            "border rounded-lg p-3",
                            usuarioEncontrado.tieneInscripcionActiva
                              ? "bg-primary/5 border-primary/20"
                              : "bg-warning/5 border-warning/20",
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <Info
                              className={cn(
                                "h-4 w-4 mt-0.5 flex-shrink-0",
                                usuarioEncontrado.tieneInscripcionActiva
                                  ? "text-primary"
                                  : "text-warning",
                              )}
                            />
                            <p className="text-foreground text-xs leading-relaxed">
                              {usuarioEncontrado.tieneInscripcionActiva
                                ? "Accede con tus planes activos. Para renovar, acércate a recepción."
                                : "Tus planes vencieron. Acércate a recepción para renovar."}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-warning/5 border border-warning/20 rounded-lg p-3.5">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-warning text-sm font-semibold mb-1">
                              Sin planes activos
                            </p>
                            <p className="text-foreground text-xs leading-relaxed">
                              Acércate a recepción de Mutant Gym para adquirir
                              un plan.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dialog de éxito */}
      <Dialog open={showExitoDialog} onOpenChange={handleCloseModal}>
        <DialogContent className="bg-card border-border max-w-[92vw] w-full mx-auto sm:max-w-sm max-h-[90vh] overflow-y-auto p-5 sm:p-6">
          <div className="h-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary -mt-5 -mx-5 mb-4 sm:-mt-6 sm:-mx-6 sm:mb-5" />
          <DialogHeader className="space-y-0">
            <DialogTitle className="flex items-center gap-2 text-primary text-lg">
              <CheckCircle className="h-5 w-5" />
              ¡Registro Exitoso!
            </DialogTitle>
          </DialogHeader>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-3"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/20 flex items-center justify-center mx-auto mb-3 border border-primary/30">
                <UserCheck className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1.5 text-foreground">
                ¡Bienvenido a MUTANT GYM!
              </h3>
              <p className="text-muted-foreground text-xs mb-3">
                Tus datos han sido guardados exitosamente.
              </p>

              <div className="bg-input rounded-lg p-3 mb-3 border border-border">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Nombre:</span>
                    <span className="font-bold text-foreground truncate ml-2 max-w-[60%]">
                      {formData.nombre} {formData.apellido}
                    </span>
                  </div>
                  <Separator className="bg-border" />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Carnet:</span>
                    <span className="font-bold text-foreground">{formData.ci}</span>
                  </div>
                  <Separator className="bg-border" />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Celular:</span>
                    <span className="font-bold text-foreground">
                      {formData.celular}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-warning text-xs font-semibold mb-1">
                    Próximo paso
                  </p>
                  <p className="text-foreground text-xs leading-relaxed">
                    Acércate a recepción para elegir tu plan fitness.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center text-[11px] text-muted-foreground bg-input/50 rounded-lg p-3 border border-border/50">
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold text-foreground">Horarios:</span>
              </div>
              <p>Lun-Vie: 6:00 AM - 10:00 PM</p>
              <p>Sáb-Dom: 8:00 AM - 3:00 PM</p>
            </div>
          </motion.div>

          <DialogFooter className="pt-2">
            <Button
              onClick={handleCloseModal}
              className="w-full gym-gradient text-primary-foreground font-bold h-11 text-sm rounded-lg hover:shadow-[0_0_25px_rgba(250,204,21,0.3)] transition-all duration-300"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}