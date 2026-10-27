// src/components/auth/LoginForm.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn } from "lucide-react";
import mutantLogo from "@/assets/mutant-logo.png";
import { checkSuscripcion } from "@/api/suscripcionApi";
import { loginWithFingerprint } from "@/api/loginapi";
import { useFingerprintIdentify } from "@/hooks/useFingerprintIdentify";
import { toast } from "@/hooks/use-toast";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useUser();
  const navigate = useNavigate();

  const isTempUserSet = useRef(false);

  // Verificar si ya está autenticado
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const userData = sessionStorage.getItem("userData");

    if (token && userData) {
      console.log("Usuario ya autenticado, redirigiendo...");
      const user = JSON.parse(userData);

      if (user.rol === "admin") {
        navigate("/admin/sales", { replace: true });
      } else if (["recepcionista", "entrenador", "limpieza"].includes(user.rol)) {
        navigate("/admin/access", { replace: true });
      } else {
        navigate("/access", { replace: true });
      }
      return;
    }

    // 🆕 LIMPIAMOS TOKENS VIEJOS ANTES DE INYECTAR EL USUARIO FANTASMA
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");

    if (!userData) {
      sessionStorage.setItem(
        "userData",
        JSON.stringify({
          idusuario: 0,
          idpersona: 0,
          username: "login-guest",
          rol: "invitado",
          userType: "empleado",
          nombres: "Invitado",
          apellidos: "",
          idsucursal: 1, 
        })
      );
      isTempUserSet.current = true;
    }

    return () => {
      if (isTempUserSet.current && !sessionStorage.getItem("token")) {
        sessionStorage.removeItem("userData");
      }
    };
  }, [navigate]);

  // 🆕 ESCUCHA DEL EVENTO GLOBAL DEL HOOK (HUELLA)
  useEffect(() => {
    const handleFingerprintGlobal = async (e: any) => {
      const ci = e.detail?.ci;
      if (!ci || isLoading) return;

      setIsLoading(true);
      setError("");

      try {
        const success = await loginWithFingerprint(ci);

        if (success) {
          toast({
            title: "Acceso por Huella",
            description: `Autenticación exitosa. Redirigiendo...`,
          });
          
          // 🔥 Recargamos la página para asegurar que el UserContext y el Sidebar carguen bien
          setTimeout(() => {
            window.location.replace("/admin"); 
          }, 300);
          
          return;
        }
      } catch (err: any) {
        setError(err.message || "Error al autenticar por huella");
        toast({
          title: "Error de huella",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    window.addEventListener("fingerprint-verified", handleFingerprintGlobal);

    return () => {
      window.removeEventListener("fingerprint-verified", handleFingerprintGlobal);
    };
  }, [isLoading]);

  // 🆕 LLAMAMOS AL HOOK (Esto enciende el hardware del lector)
  useFingerprintIdentify({
    onVerified: () => {
      // El hook emite el evento global, no hacemos nada aquí
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    if (!username.trim() || !password.trim()) {
      setError("Por favor, complete todos los campos");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      console.log("Intentando login con usuario:", username);

      let suscripcionStatus;
      try {
        suscripcionStatus = await checkSuscripcion();
      } catch (suscripcionError: any) {
        console.error("Error al verificar suscripción:", suscripcionError);

        const isConnectionError =
          suscripcionError.message?.includes("Network Error") ||
          suscripcionError.message?.includes("ERR_CONNECTION_REFUSED") ||
          suscripcionError.message?.includes("ERR_CONNECTION_TIMED_OUT") ||
          suscripcionError.message?.includes("ERR_INTERNET_DISCONNECTED") ||
          suscripcionError.message?.includes("ECONNREFUSED") ||
          suscripcionError.message?.includes("timeout") ||
          suscripcionError.message?.includes("time out") ||
          suscripcionError.message?.includes("timedout") ||
          suscripcionError.code === "ECONNABORTED" ||
          suscripcionError.code === "ERR_NETWORK" ||
          suscripcionError.code === "ETIMEDOUT" ||
          (suscripcionError.name === "AxiosError" && !suscripcionError.response) ||
          (suscripcionError.name === "AxiosError" && suscripcionError.code === "ECONNABORTED");

        if (isConnectionError) {
          navigate("/error", { replace: true });
          return;
        }

        throw suscripcionError;
      }

      console.log("Estado de suscripción:", suscripcionStatus);

      if (suscripcionStatus && !suscripcionStatus.pagado) {
        navigate("/faltapago", { replace: true });
        return;
      }

      console.log("Suscripción OK, procediendo con login");
      const success = await login(username, password);

      if (success) {
        isTempUserSet.current = false;
        console.log("Login exitoso, obteniendo userData...");
        const userData = sessionStorage.getItem("userData");

        if (userData) {
          const user = JSON.parse(userData);
          console.log("Usuario autenticado:", user);

          if (user.rol === "admin") {
            navigate("/admin/sales", { replace: true });
          } else if (["recepcionista", "entrenador", "limpieza"].includes(user.rol)) {
            navigate("/admin/access", { replace: true });
          } else {
            navigate("/access", { replace: true });
          }
        } else {
          setError("Error al cargar datos del usuario");
        }
      } else {
        setError("Credenciales incorrectas");
      }
    } catch (err: any) {
      console.error("Error en handleSubmit:", err);

      const isConnectionError =
        err.message?.includes("Network Error") ||
        err.message?.includes("ERR_CONNECTION_REFUSED") ||
        err.message?.includes("ERR_CONNECTION_TIMED_OUT") ||
        err.message?.includes("ERR_INTERNET_DISCONNECTED") ||
        err.message?.includes("ECONNREFUSED") ||
        err.message?.includes("timeout") ||
        err.message?.includes("time out") ||
        err.message?.includes("timedout") ||
        err.code === "ECONNABORTED" ||
        err.code === "ERR_NETWORK" ||
        err.code === "ETIMEDOUT" ||
        (err.name === "AxiosError" && !err.response) ||
        (err.name === "AxiosError" && err.code === "ECONNABORTED");

      if (isConnectionError) {
        navigate("/error", { replace: true });
        return;
      }

      if (
        err.message?.includes("SUSCRIPCION_NO_PAGADA") ||
        err.message?.includes("Acceso restringido: Suscripción no pagada") ||
        err.message?.includes("suscripción no pagada") ||
        err.message?.includes("cortado por falta de pago") ||
        err.message?.includes("falta de pago")
      ) {
        navigate("/faltapago", { replace: true });
        return;
      }

      setError(
        err.message ||
          "Error al iniciar sesión. Por favor, intenta nuevamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md gym-card relative">
        <CardHeader className="text-center space-y-4">
          <img src={mutantLogo} alt="MUTANT Gym" className="h-16 mx-auto" />
          <CardTitle className="text-3xl font-bold text-primary">
            INICIAR SESIÓN
          </CardTitle>
          <p className="text-muted-foreground">
            Ingresa tus credenciales para acceder al sistema
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">
                Usuario
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                className="gym-input"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="gym-input pr-10"
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/15 border border-destructive/50 rounded-md animate-pulse">
                <strong>Error:</strong> {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full gym-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verificando...
                </div>
              ) : (
                <div className="flex items-center">
                  <LogIn className="mr-2 h-4 w-4" />
                  Iniciar Sesión
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}