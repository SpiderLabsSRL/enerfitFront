import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Wallet, 
  Coffee, 
  Building2, 
  ArrowRight, 
  Loader2, 
  CheckCircle2,
  Store,
  LayoutGrid,
  Search,
  ChevronRight
} from "lucide-react";
import { getBranches, getCashBoxesByBranch, Branch, CashBox } from "@/api/CashApi";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";

export function CashSelector() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cashBoxes, setCashBoxes] = useState<CashBox[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedCashBox, setSelectedCashBox] = useState<CashBox | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCashBoxes, setIsLoadingCashBoxes] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const navigate = useNavigate();

  useEffect(() => {
    const loadBranches = async () => {
      try {
        setIsLoading(true);
        const branchesData = await getBranches();
        setBranches(branchesData);
      } catch (error) {
        console.error("Error loading branches:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBranches();
  }, []);

  useEffect(() => {
    const loadCashBoxes = async () => {
      if (!selectedBranch) {
        setCashBoxes([]);
        setSelectedCashBox(null);
        return;
      }

      try {
        setIsLoadingCashBoxes(true);
        const cashBoxesData = await getCashBoxesByBranch(selectedBranch.idSucursal);
        setCashBoxes(cashBoxesData);
        setSelectedCashBox(null);
      } catch (error) {
        console.error("Error loading cash boxes:", error);
        setCashBoxes([]);
        setSelectedCashBox(null);
      } finally {
        setIsLoadingCashBoxes(false);
      }
    };

    loadCashBoxes();
  }, [selectedBranch]);

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch);
    setSelectedCashBox(null);
  };

  const handleCashBoxSelect = (cashBox: CashBox) => {
    setSelectedCashBox(cashBox);
  };

  const handleAccess = () => {
    if (!selectedBranch || !selectedCashBox) {
      return;
    }
    
    navigate(`/admin/cash/${selectedCashBox.idCaja}?sucursal=${selectedBranch.idSucursal}&sucursalNombre=${selectedBranch.nombre}&caja=${selectedCashBox.nombre}`);
  };

  const filteredCashBoxes = cashBoxes.filter(cashBox =>
    cashBox.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLactobar = (cashBox: CashBox) => cashBox.nombre.toLowerCase().includes('lactobar');

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando sucursales...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header con diseño mejorado */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-2">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Gestión de Caja
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Selecciona tu sucursal y la caja que deseas gestionar para comenzar
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Panel izquierdo - Selección de Sucursal */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Sucursales
              </h2>
              <p className="text-sm text-muted-foreground">
                Elige la sucursal donde trabajarás
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {branches.length} disponibles
            </Badge>
          </div>

          <div className="grid gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {branches.map((branch) => {
              const isSelected = selectedBranch?.idSucursal === branch.idSucursal;
              return (
                <button
                  key={branch.idSucursal}
                  onClick={() => handleBranchSelect(branch)}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 transition-all duration-200 text-left group",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-accent/50 hover:shadow-sm"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted group-hover:bg-primary/20"
                      )}>
                        <Store className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className={cn(
                          "font-semibold",
                          isSelected && "text-primary"
                        )}>
                          {branch.nombre}
                        </h3>
                        {/* Eliminado el ID de la sucursal */}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 text-primary animate-in zoom-in-50" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel derecho - Selección de Caja */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary" />
                Cajas Disponibles
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedBranch 
                  ? `Cajas en ${selectedBranch.nombre}` 
                  : "Primero selecciona una sucursal"}
              </p>
            </div>
            {selectedBranch && cashBoxes.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {cashBoxes.length} cajas
                </Badge>
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-auto">
                  <TabsList className="h-8">
                    <TabsTrigger value="grid" className="h-6 px-2 text-xs">
                      <LayoutGrid className="h-3 w-3" />
                    </TabsTrigger>
                    <TabsTrigger value="list" className="h-6 px-2 text-xs">
                      <Search className="h-3 w-3" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}
          </div>

          {!selectedBranch ? (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-center">
                  Selecciona una sucursal<br />
                  para ver sus cajas disponibles
                </p>
              </CardContent>
            </Card>
          ) : isLoadingCashBoxes ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : cashBoxes.length === 0 ? (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-center">
                  No hay cajas disponibles<br />
                  en esta sucursal
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Buscador de cajas */}
              {viewMode === "list" && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar caja..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}

              {/* Grid de cajas */}
              {viewMode === "grid" && (
                <div className="grid gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredCashBoxes.map((cashBox) => {
                    const isSelected = selectedCashBox?.idCaja === cashBox.idCaja;
                    const lactobar = isLactobar(cashBox);
                    const Icon = lactobar ? Coffee : Wallet;
                    
                    return (
                      <button
                        key={cashBox.idCaja}
                        onClick={() => handleCashBoxSelect(cashBox)}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 transition-all duration-200 text-left group",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-accent/50 hover:shadow-sm"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg transition-colors",
                              isSelected 
                                ? "bg-primary text-primary-foreground" 
                                : lactobar 
                                  ? "bg-amber-100 text-amber-700 group-hover:bg-amber-200" 
                                  : "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200"
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className={cn(
                                "font-semibold",
                                isSelected && "text-primary"
                              )}>
                                {cashBox.nombre}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {lactobar 
                                  ? "Ventas de productos y suplementos" 
                                  : "Gestión de dinero en efectivo"}
                                {cashBox.estado === 1 && (
                                  <span className="ml-2 inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    Activa
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-primary animate-in zoom-in-50" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {filteredCashBoxes.length === 0 && viewMode === "grid" && (
                    <div className="text-center py-8 text-muted-foreground">
                      No se encontraron cajas
                    </div>
                  )}
                </div>
              )}

              {/* Vista de lista */}
              {viewMode === "list" && (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredCashBoxes.map((cashBox) => {
                    const isSelected = selectedCashBox?.idCaja === cashBox.idCaja;
                    const lactobar = isLactobar(cashBox);
                    const Icon = lactobar ? Coffee : Wallet;
                    
                    return (
                      <button
                        key={cashBox.idCaja}
                        onClick={() => handleCashBoxSelect(cashBox)}
                        className={cn(
                          "w-full p-3 rounded-lg border transition-all duration-200 text-left flex items-center justify-between group",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-accent/50"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={cn(
                            "p-1.5 rounded-md shrink-0",
                            lactobar ? "text-amber-600" : "text-emerald-600"
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={cn(
                              "text-sm font-medium truncate",
                              isSelected && "text-primary"
                            )}>
                              {cashBox.nombre}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {lactobar ? "Lactobar" : "Caja general"}
                              {cashBox.estado === 1 && (
                                <span className="ml-2 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                  Activa
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                  {filteredCashBoxes.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No se encontraron cajas con "{searchTerm}"
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Botón de Acceso Mejorado */}
      <div className="flex justify-center pt-8">
        <Button
          onClick={handleAccess}
          disabled={!selectedBranch || !selectedCashBox}
          size="lg"
          className="min-w-[280px] h-12 text-base gap-3 shadow-lg hover:shadow-xl transition-all duration-200 group"
        >
          {!selectedBranch || !selectedCashBox ? (
            <>
              <Wallet className="h-5 w-5 opacity-70" />
              Completa la selección
            </>
          ) : (
            <>
              <span>Acceder a</span>
              <span className="font-semibold">{selectedCashBox.nombre}</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </div>

      {/* Resumen de Selección Mejorado */}
      {(selectedBranch || selectedCashBox) && (
        <Card className="max-w-lg mx-auto border-primary/20 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-1 rounded-full bg-primary/10">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              Selección Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {selectedBranch && (
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">Sucursal</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selectedBranch.nombre}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            )}
            {selectedCashBox && (
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {isLactobar(selectedCashBox) ? (
                    <Coffee className="h-4 w-4" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  <span className="text-sm">Caja</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-primary">{selectedCashBox.nombre}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Componente Badge auxiliar
function Badge({ children, variant, className }: { children: React.ReactNode; variant?: "outline" | "secondary"; className?: string }) {
  const baseStyles = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  const variants = {
    outline: "border border-border text-muted-foreground",
    secondary: "bg-secondary text-secondary-foreground"
  };
  return (
    <span className={cn(baseStyles, variant ? variants[variant] : variants.outline, className)}>
      {children}
    </span>
  );
}