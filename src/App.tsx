import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider, useUser } from "./contexts/UserContext";
import { Suspense, useEffect, useState } from "react";
import FaltaPago from "./pages/faltapago";
import ErrorCarga from "./pages/ErrorCarga";
import NotFound from "./pages/NotFound";
import { AccessControl } from "./components/AccessControl";
import { LoginForm } from "./components/LoginForm";
import { AdminLayout } from "./components/AdminLayout";
import { AccessControlAdmin } from "./pages/admin/AccessControlAdmin";
import { MembersList } from "./pages/admin/MembersList";
import { RegisterMember } from "./pages/admin/RegisterMember";
import { Services } from "./pages/admin/Services";
import { EmployeeManagement } from "./pages/admin/EmployeeManagement";
import { RemindersAdmin } from "./pages/admin/RemindersAdmin";
import { Reports } from "./pages/admin/Reports";
import { Products } from "./pages/admin/Products";
import { SellProducts } from "./pages/admin/SellProducts";
import { SalesControl } from "./pages/admin/SalesControl";
import { CashBox } from "./pages/admin/CashBox";
import { CashSelector } from "./pages/admin/CashSelector";
import { NewTransaction } from "./pages/admin/NewTransaction";
import { Pendientes } from "./pages/admin/Pendientes";
import { Home } from "./pages/admin/home";
import { ReporteServicios } from "./pages/admin/ReporteServicios";
import { ReporteProductos } from "./pages/admin/ReporteProductos";
import { ReporteEmpleados } from "./pages/admin/ReporteEmpleados";
import { Cupones } from "./pages/admin/Cupones";

const queryClient = new QueryClient();

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-muted-foreground">Cargando...</p>
    </div>
  </div>
);

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useUser();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const userData = sessionStorage.getItem("userData");

    if (user) {
      setIsAuthenticated(true);
    } else if (token && userData) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [user]);

  if (isLoading || isAuthenticated === null) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const RoleBasedRedirect = () => {
  const { user } = useUser();

  if (user) {
    if (
      user.userType === "empleado" ||
      user.rol === "admin" ||
      user.rol === "recepcionista" ||
      user.rol === "entrenador" ||
      user.rol === "limpieza"
    ) {
      return <Navigate to="/admin/access" replace />;
    } else if (user.userType === "cliente" || user.rol === "cliente") {
      return <Navigate to="/access" replace />;
    }
  }

  const userData = sessionStorage.getItem("userData");
  if (userData) {
    try {
      const user = JSON.parse(userData);
      if (
        user.userType === "empleado" ||
        user.rol === "admin" ||
        user.rol === "recepcionista" ||
        user.rol === "entrenador" ||
        user.rol === "limpieza"
      ) {
        return <Navigate to="/admin/access" replace />;
      } else if (user.userType === "cliente" || user.rol === "cliente") {
        return <Navigate to="/access" replace />;
      }
    } catch (error) {
      console.error("Error al parsear userData:", error);
    }
  }

  return <Navigate to="/login" replace />;
};

const ProtectedAdminLayout = () => {
  return (
    <AuthGuard>
      <AdminLayout />
    </AuthGuard>
  );
};

const AppRoutes = () => {
  const { isLoading } = useUser();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/access" element={<AccessControl />} />
      <Route path="/faltapago" element={<FaltaPago />} />
      <Route path="/error" element={<ErrorCarga />} />
      <Route path="/notfound" element={<NotFound />} />

      <Route path="/admin" element={<RoleBasedRedirect />} />
      <Route path="/admin/dashboard" element={<RoleBasedRedirect />} />

      <Route path="/admin" element={<ProtectedAdminLayout />}>
        <Route path="access" element={<AccessControlAdmin />} />
        <Route path="members" element={<MembersList />} />
        <Route path="register" element={<RegisterMember />} />
        <Route path="pending" element={<Pendientes />} />
        <Route path="services" element={<Services />} />
        <Route path="products" element={<Products />} />
        <Route path="sell" element={<SellProducts />} />
        <Route path="sales" element={<SalesControl />} />
        <Route path="cash" element={<CashSelector />} />
        <Route path="cash/:cashBoxId" element={<CashBox />} />
        <Route path="transaction" element={<NewTransaction />} />
        <Route path="reminders" element={<RemindersAdmin />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reporte-servicios" element={<ReporteServicios />} />
        <Route path="reporte-productos" element={<ReporteProductos />} />
        <Route path="reporte-empleados" element={<ReporteEmpleados />} />
        <Route path="employees" element={<EmployeeManagement />} />
        <Route path="cupones" element={<Cupones />} />
      </Route>

      <Route path="/redirect-by-role" element={<RoleBasedRedirect />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const MainApp = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <AppRoutes />
      </Suspense>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <MainApp />
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;