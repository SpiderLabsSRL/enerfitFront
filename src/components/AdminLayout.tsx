// src/components/AdminLayout.tsx
import { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Users,
  UserPlus,
  Dumbbell,
  Package,
  ShoppingCart,
  CreditCard,
  UserCog,
  Fingerprint,
  LogOut,
  Menu,
  X,
  Wallet,
  PlusCircle,
  Clock,
  Phone,
  TrendingUp,
  PieChart,
  Briefcase,
  Ticket,
  ChevronDown,
  KeyRound,
  PanelLeftClose,
  PanelLeftOpen,
  Award,
  Bell,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/contexts/UserContext";
import { toast } from "@/hooks/use-toast";
import { useFingerprintIdentify } from "@/hooks/useFingerprintIdentify";
import * as AccessApi from "@/api/AccessApi";
import mutantLogo from "@/assets/mutant-logo.png";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { SellProducts } from "@/pages/admin/SellProducts";

interface SidebarItem {
  title: string;
  icon: React.ComponentType<any>;
  path: string;
  badge?: string;
  roles?: string[];
}

const mainSidebarItems: SidebarItem[] = [
  { title: "Control de Ventas", icon: CreditCard, path: "/admin/sales", roles: ["recepcionista", "admin"] },
  { title: "Caja", icon: Wallet, path: "/admin/cash", roles: ["admin"] },
  { title: "Servicios", icon: Dumbbell, path: "/admin/services", roles: ["admin"] },
  { title: "Productos", icon: Package, path: "/admin/products", roles: ["recepcionista", "admin"] },
  { title: "Cupones", icon: Ticket, path: "/admin/cupones", roles: ["admin"] },
  { title: "Lista de Miembros", icon: Users, path: "/admin/members", roles: ["recepcionista", "admin"] },
  { title: "Gestión de Trabajadores", icon: UserCog, path: "/admin/employees", roles: ["admin"] },
  { title: "Coaches", icon: Award, path: "/admin/coaches", roles: ["admin"] },
  { title: "Reportes", icon: TrendingUp, path: "/admin/reports", roles: ["admin"] },
  { title: "Recordatorios", icon: Bell, path: "/admin/reminders", roles: ["admin"] },
];

const reportsSubmenuItems: SidebarItem[] = [
  { title: "Reporte Servicios", icon: PieChart, path: "/admin/reporte-servicios", roles: ["admin"] },
  { title: "Reporte Productos", icon: Package, path: "/admin/reporte-productos", roles: ["admin"] },
  { title: "Reporte Empleados", icon: Briefcase, path: "/admin/reporte-empleados", roles: ["admin"] },
];

const additionalSidebarItems: SidebarItem[] = [
  { title: "Inscribir", icon: UserPlus, path: "/admin/register", roles: ["recepcionista"] },
  { title: "Pagos Pendientes", icon: Clock, path: "/admin/pending", roles: ["recepcionista"] },
  { title: "Vender Producto", icon: ShoppingCart, path: "/admin/sell", roles: ["recepcionista"] },
  { title: "Nueva Transacción", icon: PlusCircle, path: "/admin/transaction", roles: ["recepcionista"] },
  { title: "Control de Acceso", icon: Fingerprint, path: "/admin/access", roles: ["recepcionista"] },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [showReportsSubmenu, setShowReportsSubmenu] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [floatingSaleOpen, setFloatingSaleOpen] = useState(false);

  // ✅ Estados de huella global
  const [fingerprintPaused, setFingerprintPaused] = useState<boolean>(false);
  const [fingerprintBusy, setFingerprintBusy] = useState(false);
  const [fingerprintLastCi, setFingerprintLastCi] = useState<string | null>(null);
  const [hasActiveToast, setHasActiveToast] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const fingerprintPausedRef = useRef<boolean>(false);
  const lastReadRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useUser();

  const isStaffOperativo = ["admin", "recepcionista"].includes(user?.rol ?? "");
  const canUseFingerprint = isStaffOperativo;

  // Detectar móvil
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Detectar toasts (para reposicionar botón reconectar)
  useEffect(() => {
    const checkToasts = () => {
      const viewport = document.querySelector(
        '[data-radix-toast-viewport], [data-sonner-toaster], [role="region"][aria-label*="Notification"], ol[tabindex="-1"]'
      );
      if (viewport) {
        const toasts = viewport.querySelectorAll(
          '[data-state="open"], [data-radix-toast-item], li'
        );
        setHasActiveToast(toasts.length > 0);
      } else {
        setHasActiveToast(false);
      }
    };
    checkToasts();
    const observer = new MutationObserver(() => checkToasts());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "data-radix-toast-item"],
    });
    return () => observer.disconnect();
  }, []);

  // Escuchar cambios en la bandera de pausa
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ paused: boolean }>;
      const paused = customEvent.detail?.paused === true;
      setFingerprintPaused(paused);
      fingerprintPausedRef.current = paused;
    };
    window.addEventListener("fingerprint-pause-changed", handler);
    return () => window.removeEventListener("fingerprint-pause-changed", handler);
  }, []);

  // Sincronizar bandera con la ruta
  useEffect(() => {
    const paused = (window as any).__FINGERPRINT_PAUSED__ === true;
    fingerprintPausedRef.current = paused;
    setFingerprintPaused(paused);
  }, [location.pathname]);

  // ✅ HUELLA → registro directo en backend (igual que Mutant)
  const processFingerprintInBackground = async (ci: string) => {
    if (!user?.idsucursal || !user?.idusuario) return;
    try {
      const res = await AccessApi.registerByFingerprint(
        ci,
        user.idsucursal,
        user.idusuario
      );
      switch (res.mode) {
        case "client_auto": {
          if (res.denied || res.success === false) {
            toast({
              title: "🔴 Acceso Denegado",
              description: `${res.memberName || "Cliente"} - ${res.message}`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "✅ Acceso Registrado",
              description: `${res.memberName || ""} - ${res.message}`,
              variant: "success",
            });
          }
          if (res.tieneDeuda && res.deudaInfo) {
            setTimeout(() => {
              toast({
                title: "⚠️ Cliente con Deuda",
                description: `${res.memberName || "Cliente"} debe Bs. ${res.deudaInfo?.montoPendiente.toFixed(2)} por ${res.deudaInfo?.servicioNombre}`,
                variant: "destructive",
              });
            }, 800);
          }
          break;
        }
        case "employee": {
          if (res.denied || res.success === false) {
            toast({
              title: "🔴 Acceso Denegado",
              description: `${res.memberName || ""} - ${res.message}`,
              variant: "destructive",
            });
          } else {
            toast({
              title: res.isLate ? "⚠️ Entrada Tardía" : "✅ Registro de Empleado",
              description: `${res.memberName || ""} - ${res.message}`,
              variant: res.isLate ? "destructive" : "success",
            });
          }
          break;
        }
        case "requires_selection": {
          toast({
            title: "⚠️ Varios servicios activos",
            description: (
              <div
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate(`/admin/access?search=${ci}`)}
              >
                <p>
                  {res.memberName || "Cliente"} tiene{" "}
                  {res.services?.length || "varios"} servicios (
                  {(res.services || []).map((s) => s.name).join(", ")}).
                </p>
                <p className="font-semibold underline mt-1">
                  👉 Haz clic aquí para elegir uno en Control de Acceso
                </p>
              </div>
            ),
            className: "bg-amber-500 text-black border-amber-600 shadow-lg",
          });
          break;
        }
        case "denied":
        case "not_found":
        default: {
          toast({
            title: res.mode === "not_found" ? "🔴 Huella no reconocida" : "🔴 Acceso Denegado",
            description: res.message,
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Error procesando huella en segundo plano:", error);
      toast({
        title: "🔴 Error",
        description: error.message || "No se pudo procesar la huella",
        variant: "destructive",
      });
    }
  };

  // ✅ Hook global de huella (activo en TODAS las vistas, incluida /admin/access)
  const { message: fingerprintMessage, isUnavailable, reconnect } =
    useFingerprintIdentify({
      enabled: isStaffOperativo && !isMobile && !fingerprintPaused,
      onVerified: async (ci: string) => {
        if (!canUseFingerprint) return;
        if (fingerprintPausedRef.current) return;
        if ((window as any).__FINGERPRINT_PAUSED__ === true) return;
        if (!ci) return;

        const now = Date.now();
        if (now - lastReadRef.current < 2500) return;
        if (processingRef.current) return;

        lastReadRef.current = now;
        processingRef.current = true;
        setFingerprintBusy(true);
        setFingerprintLastCi(ci);
        try {
          await processFingerprintInBackground(ci);
        } finally {
          setTimeout(() => {
            setFingerprintBusy(false);
            setFingerprintLastCi(null);
            processingRef.current = false;
          }, 600);
        }
      },
    });

  const handleLogout = () => {
    (window as any).__FINGERPRINT_PAUSED__ = false;
    fingerprintPausedRef.current = false;
    setFingerprintPaused(false);
    window.dispatchEvent(
      new CustomEvent("fingerprint-pause-changed", { detail: { paused: false } })
    );
    logout();
    navigate("/login");
  };

  const handleWhatsAppClick = () => {
    const phoneNumber = "+59167461937";
    const message = "Hola, necesito soporte para el sistema del gimnasio.";
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const filterItemsByRole = (items: SidebarItem[]) => {
    if (user?.rol === "admin") return items;
    return items.filter(
      (item) => !item.roles || (user && item.roles.includes(user.rol))
    );
  };

  const filteredMainItems = filterItemsByRole(mainSidebarItems);
  const filteredAdditionalItems = filterItemsByRole(additionalSidebarItems);
  const filteredReportsItems = filterItemsByRole(reportsSubmenuItems);

  const getCurrentItems = () => {
    const todosItems = [...filteredMainItems, ...filteredAdditionalItems];

    if (user?.rol === "admin") {
      const ordenAdmin = [
        "Control de Acceso", "Inscribir", "Pagos Pendientes", "Lista de Miembros",
        "Servicios", "Productos", "Vender Producto", "Control de Ventas",
        "Nueva Transacción", "Caja", "Cupones", "Gestión de Trabajadores",
        "Coaches", "Reportes", "Recordatorios",
      ];
      return ordenAdmin
        .map((titulo) => todosItems.find((item) => item.title === titulo))
        .filter((item): item is SidebarItem => item !== undefined);
    }

    if (user?.rol === "recepcionista") {
      const ordenRecepcionista = [
        "Control de Acceso", "Inscribir", "Pagos Pendientes", "Lista de Miembros",
        "Productos", "Vender Producto", "Control de Ventas", "Nueva Transacción",
      ];
      return ordenRecepcionista
        .map((titulo) => todosItems.find((item) => item.title === titulo))
        .filter((item): item is SidebarItem => item !== undefined);
    }

    return todosItems;
  };

  const currentItems = getCurrentItems();

  const handleItemClick = (item: SidebarItem) => {
    if (item.title === "Reportes") {
      setShowReportsSubmenu(!showReportsSubmenu);
      navigate(item.path);
    } else {
      navigate(item.path);
      setSidebarOpen(false);
    }
  };

  const isActivePath = (path: string) => {
    if (path === "/admin/cash") return location.pathname.startsWith("/admin/cash");
    if (path === "/admin/reports" && showReportsSubmenu)
      return location.pathname === "/admin/reports";
    return location.pathname === path;
  };

  useEffect(() => {
    if (user && location.pathname === "/admin") {
      if (user.rol === "admin") navigate("/admin/sales");
      else navigate("/admin/access");
    }
  }, [user, location.pathname, navigate]);

  useEffect(() => {
    const isReportsPath =
      location.pathname.startsWith("/admin/reporte-") ||
      location.pathname === "/admin/reports";
    setShowReportsSubmenu(isReportsPath);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".user-menu-container")) setUserMenuOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (sidebarCollapsed) setShowReportsSubmenu(false);
  }, [sidebarCollapsed]);

  const getUserInitials = () => {
    if (!user?.name) return "U";
    return user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRolDisplay = () => {
    if (user?.rol === "admin") return "Administrador";
    if (user?.rol === "recepcionista") return "Recepcionista";
    return user?.rol?.toUpperCase() || "";
  };

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  const SidebarContent = () => (
    <div className="flex flex-col h-full min-h-0">
      <div className="h-[73px] flex-shrink-0 hidden lg:block"></div>

      <nav
        className={`px-4 pb-4 space-y-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar ${
          sidebarCollapsed ? "px-2" : ""
        }`}
      >
        <div className="pt-4">
          {currentItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(item.path);
            const isReports = item.title === "Reportes";

            return (
              <div key={item.path}>
                <button
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left gym-transition ${
                    isActive || (isReports && showReportsSubmenu)
                      ? "bg-primary text-primary-foreground gym-glow"
                      : "hover:bg-muted text-foreground hover:text-accent-foreground"
                  } ${sidebarCollapsed ? "justify-center px-2" : ""}`}
                  title={sidebarCollapsed ? item.title : ""}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="font-medium text-sm md:text-base flex-1">
                        {item.title}
                      </span>
                      {isReports && (
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${
                            showReportsSubmenu ? "rotate-180" : ""
                          }`}
                        />
                      )}
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </button>

                {isReports && showReportsSubmenu && !sidebarCollapsed && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-primary/30 pl-3 animate-in slide-in-from-left-2 duration-200">
                    {filteredReportsItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = location.pathname === subItem.path;
                      return (
                        <button
                          key={subItem.path}
                          onClick={() => {
                            navigate(subItem.path);
                            setSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left gym-transition ${
                            isSubActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted text-foreground hover:text-accent-foreground"
                          }`}
                        >
                          <SubIcon size={16} className="flex-shrink-0" />
                          <span className="text-sm">{subItem.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {!sidebarCollapsed && (
        <>
          <div className="flex-shrink-0 p-4 border-t border-border space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start group hover:bg-accent"
              onClick={handleWhatsAppClick}
            >
              <Phone size={16} className="mr-2" />
              <div className="flex-1 text-left">
                <div className="font-medium">Contactar Soporte</div>
                <div className="text-xs text-muted-foreground group-hover:text-black">
                  +591 67461937
                </div>
              </div>
            </Button>
          </div>
          <div className="flex-shrink-0 p-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Realizado por SPIDERLABS SYSTEMS S.R.L.
            </p>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <ChangePasswordDialog
        open={changePasswordDialogOpen}
        onOpenChange={setChangePasswordDialogOpen}
      />

      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 px-4 md:px-6 py-2 flex items-center justify-between fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden flex-shrink-0"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="hidden lg:flex flex-shrink-0"
            title={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </Button>

          <img
            src={mutantLogo}
            alt="ENERFIT"
            className={`h-[70px] w-auto flex-shrink-0 object-contain transition-all duration-300 ${
              sidebarCollapsed ? "ml-0" : ""
            }`}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="relative user-menu-container hidden md:block">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 bg-muted/50 rounded-full px-4 py-1.5 border border-border/50 hover:bg-muted transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold text-sm">{getUserInitials()}</span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-foreground">{user?.name}</span>
                <div className="flex items-center gap-2">
                  {user?.sucursalNombre && (
                    <>
                      <span className="text-xs text-muted-foreground">{user.sucursalNombre}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                    </>
                  )}
                  <span className="text-xs font-medium text-primary">{getRolDisplay()}</span>
                </div>
              </div>
              <ChevronDown
                size={16}
                className={`text-muted-foreground transition-transform duration-200 ${
                  userMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => {
                      setChangePasswordDialogOpen(true);
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <KeyRound size={16} />
                    Cambiar Contraseña
                  </button>
                  <hr className="my-1 border-border" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut size={16} />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative md:hidden user-menu-container">
            <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold text-xs">{getUserInitials()}</span>
              </div>
              <ChevronDown
                size={14}
                className={`text-muted-foreground transition-transform duration-200 ${
                  userMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-border overflow-hidden z-50">
                <div className="p-2 space-y-1">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{getRolDisplay()}</p>
                    {user?.sucursalNombre && (
                      <p className="text-xs text-muted-foreground">{user.sucursalNombre}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setChangePasswordDialogOpen(true);
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <KeyRound size={16} />
                    Cambiar Contraseña
                  </button>
                  <hr className="my-1 border-border" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut size={16} />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`fixed left-0 top-0 h-screen bg-card/95 backdrop-blur-sm border-r border-border overflow-hidden hidden lg:flex flex-col shadow-lg z-40 transition-all duration-300 ${
            sidebarCollapsed ? "w-16" : "w-64"
          }`}
        >
          <SidebarContent />
        </aside>

        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed top-[73px] left-0 w-64 h-[calc(100vh-73px)] bg-card border-r border-border overflow-hidden z-50 lg:hidden flex flex-col shadow-xl animate-in slide-in-from-left-2 duration-200">
              <SidebarContent />
            </aside>
          </>
        )}

        <main
          className={`flex-1 pt-[73px] p-4 md:p-6 min-w-0 overflow-y-auto transition-all duration-300 ${
            sidebarOpen ? "ml-64" : "ml-0"
          } ${sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"}`}
        >
          <div className="pt-4 md:pt-6">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* ✅ Overlay "Procesando huella" */}
      {!isMobile && fingerprintBusy && (
        <div className="fixed top-[85px] right-4 sm:right-6 z-[100] pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-card text-card-foreground shadow-2xl rounded-xl border border-primary/40 px-6 py-4 flex items-center gap-4 pointer-events-auto min-w-[280px]">
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full border-[4px] border-primary/20 border-t-primary animate-spin" />
              <Fingerprint
                size={20}
                className="absolute inset-0 m-auto text-primary animate-pulse"
              />
            </div>
            <div>
              <div className="font-bold text-base leading-tight">Procesando huella</div>
              <div className="text-sm text-muted-foreground leading-tight mt-1 max-w-[220px] truncate">
                {fingerprintMessage
                  ? fingerprintMessage
                  : fingerprintLastCi
                  ? `CI ${fingerprintLastCi}`
                  : "Verificando identidad..."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Botón "Reconectar Lector de Huella" (en TODAS las vistas, incluida /admin/access) */}
      {!isMobile && !fingerprintPaused && isUnavailable && (
        <div
          className={`fixed right-4 sm:right-6 z-[100] transition-all duration-500 ease-in-out ${
            hasActiveToast ? "top-[150px]" : "top-[85px]"
          }`}
        >
          <Button
            variant="destructive"
            className="shadow-2xl flex items-center gap-2 border-2 border-red-400/50 hover:scale-105 transition-transform animate-in fade-in slide-in-from-top-4 duration-300"
            onClick={reconnect}
          >
            <RefreshCw size={18} className="animate-pulse" />
            Reconectar Lector de Huella
          </Button>
        </div>
      )}

      {isStaffOperativo && location.pathname !== "/admin/sell" && (
        <>
          <div
            className={`
              fixed z-40 bg-background border shadow-2xl rounded-xl flex flex-col overflow-hidden
              transition-all duration-300 ease-in-out
              bottom-0 right-0 left-0 w-full h-[85vh] rounded-b-none
              sm:bottom-24 sm:right-6 sm:left-auto sm:w-[380px] sm:h-[600px] sm:rounded-xl
              ${
                floatingSaleOpen
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-4 pointer-events-none"
              }
            `}
            style={{ transformOrigin: "bottom right" }}
          >
            <SellProducts compact onSaleSuccess={() => setFloatingSaleOpen(false)} />
          </div>

          <button
            onClick={() => setFloatingSaleOpen((v) => !v)}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl hover:scale-110 transition-transform duration-200 flex items-center justify-center gym-glow"
            title={floatingSaleOpen ? "Cerrar venta rápida" : "Vender Producto"}
          >
            {floatingSaleOpen ? <X size={24} /> : <ShoppingCart size={24} />}
          </button>
        </>
      )}

      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--muted-foreground)) hsl(var(--card));
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: hsl(var(--card));
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-top-2 {
          from { transform: translateY(-0.5rem); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-in-from-top-4 {
          from { transform: translateY(-1rem); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-in-from-left-2 {
          from { transform: translateX(-1rem); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slide-in-from-bottom-4 {
          from { transform: translateY(1rem); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in { animation-duration: 0.2s; animation-fill-mode: both; }
        .fade-in { animation-name: fade-in; }
        .slide-in-from-top-2 { animation-name: slide-in-from-top-2; }
        .slide-in-from-top-4 { animation-name: slide-in-from-top-4; }
        .slide-in-from-left-2 { animation-name: slide-in-from-left-2; }
        .slide-in-from-bottom-4 { animation-name: slide-in-from-bottom-4; }
        @media (max-width: 1024px) {
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        }
        @media (max-width: 1023px) {
          main { margin-left: 0 !important; width: 100%; }
        }
      `}</style>
    </div>
  );
}