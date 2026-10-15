import { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Users,
  UserPlus,
  Dumbbell,
  MessageSquare,
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
  Send,
  ArrowLeft,
  ChevronDown,
  KeyRound,
  MapPin,
  Image,
  LayoutDashboard,
  Music,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/contexts/UserContext";
import { toast } from "@/hooks/use-toast";
import { useFingerprintIdentify } from "@/hooks/useFingerprintIdentify";
import * as AccessApi from "@/api/AccessApi";
import { ApiMember } from "@/api/AccessApi";
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
  {
    title: "Control de Ventas",
    icon: CreditCard,
    path: "/admin/sales",
    roles: ["recepcionista", "admin"],
  },
  {
    title: "Caja",
    icon: Wallet,
    path: "/admin/cash",
    roles: ["admin"],
  },
  {
    title: "Servicios",
    icon: Dumbbell,
    path: "/admin/services",
    roles: ["admin"],
  },
  {
    title: "Productos",
    icon: Package,
    path: "/admin/products",
    roles: ["recepcionista", "admin"],
  },
  {
    title: "Cupones",
    icon: Ticket,
    path: "/admin/cupones",
    roles: ["admin"],
  },
  {
    title: "Lista de Miembros",
    icon: Users,
    path: "/admin/members",
    roles: ["recepcionista", "admin"],
  },
  {
    title: "Gestión de Trabajadores",
    icon: UserCog,
    path: "/admin/employees",
    roles: ["admin"],
  },
  {
    title: "Reportes",
    icon: TrendingUp,
    path: "/admin/reports",
    roles: ["admin"],
  },
];

const reportsSubmenuItems: SidebarItem[] = [
  {
    title: "Reporte Servicios",
    icon: PieChart,
    path: "/admin/reporte-servicios",
    roles: ["admin"],
  },
  {
    title: "Reporte Productos",
    icon: Package,
    path: "/admin/reporte-productos",
    roles: ["admin"],
  },
  {
    title: "Reporte Empleados",
    icon: Briefcase,
    path: "/admin/reporte-empleados",
    roles: ["admin"],
  },
];

const additionalSidebarItems: SidebarItem[] = [
  {
    title: "Inscribir",
    icon: UserPlus,
    path: "/admin/register",
    roles: ["recepcionista"],
  },
  {
    title: "Pagos Pendientes",
    icon: Clock,
    path: "/admin/pending",
    roles: ["recepcionista"],
  },
  {
    title: "Recordatorios",
    icon: MessageSquare,
    path: "/admin/reminders",
    roles: ["recepcionista"],
  },
  {
    title: "Vender Producto",
    icon: ShoppingCart,
    path: "/admin/sell",
    roles: ["recepcionista"],
  },
  {
    title: "Nueva Transacción",
    icon: PlusCircle,
    path: "/admin/transaction",
    roles: ["recepcionista"],
  },
  {
    title: "Control de Acceso",
    icon: Fingerprint,
    path: "/admin/access",
    roles: ["recepcionista"],
  },
  {
    title: "Zumba",
    icon: Music,
    path: "/admin/zumba",
    roles: ["recepcionista"],
  },
];

// ============================================
// HELPER: auto-procesar huella en segundo plano
// ============================================
async function processFingerprintInBackground(ci: string, user: any) {
  if (!user?.idsucursal || !user?.idusuario) return;

  try {
    const foundMembers = await AccessApi.searchMembers(
      ci,
      "all",
      user.idsucursal
    );

    if (!foundMembers || foundMembers.length === 0) {
      toast({
        title: "🔴 Huella no reconocida",
        description: `No se encontró ningún miembro con CI: ${ci}`,
        variant: "destructive",
      });
      return;
    }

    if (foundMembers.length > 1) {
      toast({
        title: "⚠️ Múltiples coincidencias",
        description:
          "Se encontraron varios miembros. Ve al Control de Acceso para seleccionar.",
        variant: "destructive",
      });
      return;
    }

    const member: ApiMember = foundMembers[0];

    // ================ CLIENTE ================
    if (member.memberType === "client") {
      if (member.services.length === 0) {
        toast({
          title: "🔴 Acceso Denegado",
          description: `${member.name} no tiene servicios activos`,
          variant: "destructive",
        });
        return;
      }

      if (member.services.length > 1) {
        toast({
          title: "⚠️ Múltiples servicios",
          description: `${member.name} tiene ${member.services.length} servicios. Ve al Control de Acceso para seleccionar.`,
          variant: "destructive",
        });
        return;
      }

      const service = member.services[0];
      const result = await AccessApi.registerClientAccess(
        parseInt(member.id),
        parseInt(service.id),
        user.idsucursal,
        user.idusuario
      );

      if (result.success) {
        toast({
          title: "✅ Acceso Registrado",
          description: `${member.name} - ${service.name}. ${result.message}`,
          variant: "success",
        });

        if (result.tieneDeuda && result.deudaInfo) {
          setTimeout(() => {
            toast({
              title: "⚠️ Cliente con Deuda",
              description: `${member.name} debe Bs. ${result.deudaInfo?.montoPendiente.toFixed(2)} por ${result.deudaInfo?.servicioNombre}`,
              variant: "destructive",
            });
          }, 800);
        }
      } else {
        toast({
          title: "🔴 Acceso Denegado",
          description: `${member.name} - ${result.message}`,
          variant: "destructive",
        });
      }
      return;
    }

    // ================ EMPLEADO ================
    if (member.memberType === "employee") {
      if (!member.employeeInfo) {
        toast({
          title: "🔴 Error",
          description: "No se encontró información del empleado",
          variant: "destructive",
        });
        return;
      }

      const employeeId = parseInt(member.employeeInfo.id);
      const isInside = member.employeeInfo.status === "in";

      if (isInside) {
        const result = await AccessApi.registerEmployeeCheckOut(
          employeeId,
          user.idsucursal,
          user.idusuario
        );
        toast({
          title: "✅ Salida Registrada",
          description: `${member.name} - ${result.message}`,
          variant: "success",
        });
      } else {
        const result = await AccessApi.registerEmployeeCheckIn(
          employeeId,
          user.idsucursal,
          user.idusuario
        );
        toast({
          title: result.isLate ? "⚠️ Entrada Tardía" : "✅ Entrada Registrada",
          description: `${member.name} - ${result.message}`,
          variant: result.isLate ? "destructive" : "success",
        });
      }
      return;
    }
  } catch (error: any) {
    console.error("Error procesando huella en segundo plano:", error);
    toast({
      title: "🔴 Error",
      description: error.message || "No se pudo procesar la huella",
      variant: "destructive",
    });
  }
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [showReportsSubmenu, setShowReportsSubmenu] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [floatingSaleOpen, setFloatingSaleOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useUser();

  // ✅ Determinar si estamos en la vista de Control de Acceso
  const isAccessView = location.pathname.startsWith("/admin/access");

  // ✅ Estado para saber si el lector global está pausado
  const [fingerprintPaused, setFingerprintPaused] = useState<boolean>(false);

  // ✅ Escuchar cambios en la bandera de pausa
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ paused: boolean }>;
      console.log(
        "🔒 [AdminLayout] fingerprint-pause-changed:",
        customEvent.detail
      );
      setFingerprintPaused(customEvent.detail?.paused === true);
    };
    window.addEventListener("fingerprint-pause-changed", handler);
    return () => {
      window.removeEventListener("fingerprint-pause-changed", handler);
    };
  }, []);

  // ✅ Al cambiar de ruta, sincronizar la bandera
  useEffect(() => {
    const paused = (window as any).__FINGERPRINT_PAUSED__ === true;
    if (!location.pathname.startsWith("/admin/register")) {
      if (paused) {
        (window as any).__FINGERPRINT_PAUSED__ = false;
        window.dispatchEvent(
          new CustomEvent("fingerprint-pause-changed", {
            detail: { paused: false },
          })
        );
      }
      setFingerprintPaused(false);
    } else {
      setFingerprintPaused(paused);
    }
  }, [location.pathname]);

  // ✅ Activar el lector de huella globalmente para recepcionistas
  //    - Deshabilitado en /admin/access
  //    - Deshabilitado cuando fingerprintPaused === true (para enrolar sin conflicto)
  useFingerprintIdentify({
    onVerified: () => {
      // El trabajo real lo hace el listener global de 'fingerprint-verified'
    },
    enabled:
      user?.rol === "recepcionista" &&
      !isAccessView &&
      !fingerprintPaused,
  });

  // ✅ Log para confirmar el estado
  useEffect(() => {
    console.log(
      "🎛️ [AdminLayout] Estado SSE identify:",
      user?.rol === "recepcionista" && !isAccessView && !fingerprintPaused
        ? "ACTIVO"
        : "PAUSADO"
    );
  }, [user?.rol, isAccessView, fingerprintPaused]);

  // ============================================
  // LISTENER GLOBAL DE HUELLA (SEGUNDO PLANO)
  // ============================================
  const lastReadRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);

  useEffect(() => {
    if (user?.rol !== "recepcionista") return;
    if (!user?.idsucursal || !user?.idusuario) return;
    if (location.pathname.startsWith("/admin/access")) return;

    const handler = async (event: Event) => {
      // Si el hook está pausado (RegisterMember lo pausa), ignorar
      if ((window as any).__FINGERPRINT_PAUSED__) return;

      const e = event as CustomEvent<{ ci: string }>;
      const ci = e.detail?.ci;
      if (!ci) return;

      // Anti-spam: mínimo 2.5s entre lecturas
      const now = Date.now();
      if (now - lastReadRef.current < 2500) return;
      if (processingRef.current) return;

      lastReadRef.current = now;
      processingRef.current = true;

      try {
        await processFingerprintInBackground(ci, user);
      } finally {
        setTimeout(() => {
          processingRef.current = false;
        }, 1500);
      }
    };

    window.addEventListener("fingerprint-verified", handler);
    return () => {
      window.removeEventListener("fingerprint-verified", handler);
    };
  }, [user?.rol, user?.idsucursal, user?.idusuario, location.pathname]);

  const handleLogout = () => {
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
    return items.filter(
      (item) => !item.roles || (user && item.roles.includes(user.rol))
    );
  };

  const filteredMainItems = filterItemsByRole(mainSidebarItems);
  const filteredAdditionalItems = filterItemsByRole(additionalSidebarItems);
  const filteredReportsItems = filterItemsByRole(reportsSubmenuItems);

  const getCurrentItems = () => {
    if (user?.rol === "recepcionista") {
      const ordenRecepcionista = [
        "Control de Acceso",
        "Inscribir",
        "Pagos Pendientes",
        "Lista de Miembros",
        "Productos",
        "Vender Producto",
        "Control de Ventas",
        "Nueva Transacción",
        "Zumba",
      ];

      const todosItems = [...filteredMainItems, ...filteredAdditionalItems];
      return ordenRecepcionista
        .map((titulo) => todosItems.find((item) => item.title === titulo))
        .filter((item): item is SidebarItem => item !== undefined);
    }

    return [...filteredMainItems, ...filteredAdditionalItems];
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
    if (path === "/admin/cash") {
      return location.pathname.startsWith("/admin/cash");
    }
    if (path === "/admin/reports" && showReportsSubmenu) {
      return location.pathname === "/admin/reports";
    }
    return location.pathname === path;
  };

  const isReportActive = (path: string) => {
    return (
      location.pathname === path ||
      location.pathname.startsWith("/admin/reporte-")
    );
  };

  useEffect(() => {
    if (user && location.pathname === "/admin") {
      if (user.rol === "admin") {
        navigate("/admin/sales");
      } else if (user.rol === "recepcionista") {
        navigate("/admin/access");
      } else {
        navigate("/admin/access");
      }
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
      if (!target.closest(".user-menu-container")) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (sidebarCollapsed) {
      setShowReportsSubmenu(false);
    }
  }, [sidebarCollapsed]);

  const getUserInitials = () => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRolDisplay = () => {
    if (user?.rol === "admin") return "Administrador";
    if (user?.rol === "recepcionista") return "Recepcionista";
    return user?.rol?.toUpperCase() || "";
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="h-[73px] flex-shrink-0 hidden lg:block"></div>

      <nav
        className={`px-4 pb-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar ${
          sidebarCollapsed ? "px-2" : ""
        }`}
      >
        <div className="pt-4">
          {currentItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(item.path);
            const isReports = item.title === "Reportes";
            const isReportsActive = isReportActive(item.path);

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
          <div className="p-4 border-t border-border space-y-3">
            <div className="space-y-1">
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
          </div>

          <div className="p-4 border-t border-border">
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
            {sidebarCollapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </Button>

          <img
            src={mutantLogo}
            alt="MUTANT"
            className={`h-[50px] w-auto flex-shrink-0 object-contain transition-all duration-300 ${
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
                <span className="text-primary font-semibold text-sm">
                  {getUserInitials()}
                </span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-foreground">
                  {user?.name}
                </span>
                <div className="flex items-center gap-2">
                  {user?.sucursalNombre && (
                    <>
                      <span className="text-xs text-muted-foreground">
                        {user.sucursalNombre}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                    </>
                  )}
                  <span className="text-xs font-medium text-primary">
                    {getRolDisplay()}
                  </span>
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
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold text-xs">
                  {getUserInitials()}
                </span>
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
                    <p className="text-sm font-medium text-foreground">
                      {user?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getRolDisplay()}
                    </p>
                    {user?.sucursalNombre && (
                      <p className="text-xs text-muted-foreground">
                        {user.sucursalNombre}
                      </p>
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
            <aside className="fixed top-[73px] left-0 w-64 h-[calc(100vh-73px)] bg-card border-r border-border overflow-y-auto z-50 lg:hidden flex flex-col shadow-xl animate-in slide-in-from-left-2 duration-200">
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

      {user?.rol === "recepcionista" && location.pathname !== "/admin/sell" && (
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
            <SellProducts
              compact
              onSaleSuccess={() => setFloatingSaleOpen(false)}
            />
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

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

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

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slide-in-from-top-2 {
          from { transform: translateY(-0.5rem); opacity: 0; }
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

        .animate-in {
          animation-duration: 0.2s;
          animation-fill-mode: both;
        }

        .fade-in {
          animation-name: fade-in;
        }

        .slide-in-from-top-2 {
          animation-name: slide-in-from-top-2;
        }

        .slide-in-from-left-2 {
          animation-name: slide-in-from-left-2;
        }

        .slide-in-from-bottom-4 {
          animation-name: slide-in-from-bottom-4;
        }

        @media (max-width: 1024px) {
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
        }

        @media (max-width: 1023px) {
          main {
            margin-left: 0 !important;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}