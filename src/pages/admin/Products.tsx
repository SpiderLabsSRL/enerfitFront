import { useState, useEffect, useRef, useMemo, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  PackagePlus,
  Search,
  Filter,
  X,
  Camera,
  Eye,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  toggleProductLanding,
  addStock,
  getSucursales,
  Product as ApiProduct,
  ProductRequest,
} from "@/api/ProductsApi";
import BarcodeScanner from "./BarcodeScanner";

// ============================================
// TIPOS LOCALES
// ============================================
interface ExtendedProductRequest {
  nombre: string;
  precioVenta: number;
  sucursales: string[];
  stockPorSucursal: { [sucursalId: string]: number | null };
  sinStock: boolean;
  precioCompra?: number;
  codigoBarras?: string;
  stockMinimoPorSucursal?: { [sucursalId: string]: number | null };
  imagen?: string;
  mostrarEnLanding?: boolean;
}

interface Product {
  id: string;
  nombre: string;
  precioVenta: number;
  precioCompra?: number | null;
  codigoBarras?: string | null;
  stockMinimoPorSucursal?: { [sucursalId: string]: number | null };
  stockPorSucursal: { [sucursalId: string]: number | null };
  sucursales: string[];
  activo: boolean;
  sinStock: boolean;
  imagen?: string | null;
  mostrarEnLanding?: boolean;
}

// ============================================
// COMPONENTE: Card de producto (memoizado)
// ============================================
interface ProductCardProps {
  product: Product;
  userRol: string | undefined;
  userSucursal: string | undefined;
  sucursales: { id: string; name: string }[];
  onOpenStock: (p: Product) => void;
  onOpenEdit: (p: Product) => void;
  onOpenDelete: (p: Product) => void;
  onOpenView: (p: Product) => void;
  onToggleLanding: (p: Product) => void;
  onToggleStatus: (p: Product) => void;
  displayStock: (s: number | null | undefined) => string;
}

const ProductCard = memo(function ProductCard({
  product,
  userRol,
  userSucursal,
  sucursales,
  onOpenStock,
  onOpenEdit,
  onOpenDelete,
  onOpenView,
  onToggleLanding,
  onToggleStatus,
  displayStock,
}: ProductCardProps) {
  const stockToShow = product.stockPorSucursal;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3 flex-1">
            {product.imagen && (
              <img
                src={product.imagen}
                alt={product.nombre}
                className="w-12 h-12 rounded-lg object-contain border bg-white"
                loading="lazy"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{product.nombre}</h3>
              {product.codigoBarras && (
                <p className="text-xs text-muted-foreground mt-1">
                  {product.codigoBarras}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Precio Venta:</span>
            <span className="font-semibold">
              Bs. {product.precioVenta.toFixed(2)}
            </span>
          </div>

          {userRol === "admin" && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Precio Compra:</span>
                <span className="font-semibold">
                  Bs. {product.precioCompra?.toFixed(2) || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Landing:</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={product.mostrarEnLanding || false}
                    onCheckedChange={() => onToggleLanding(product)}
                    className="scale-75"
                  />
                  <span className="text-xs">
                    {product.mostrarEnLanding ? "Visible" : "Oculto"}
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado:</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={product.activo}
                    onCheckedChange={() => onToggleStatus(product)}
                    className="scale-75"
                  />
                  <span className="text-xs">
                    {product.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="border-t pt-2 mt-2">
            <span className="text-muted-foreground text-xs block mb-2">
              Stock por sucursal:
            </span>
            <div className="space-y-1">
              {Object.entries(stockToShow)
                .filter(([, stock]) => stock !== undefined)
                .map(([sucursalId, stock]) => {
                  const sucursal = sucursales.find((s) => s.id === sucursalId);
                  const stockMinimo = product.stockMinimoPorSucursal?.[sucursalId];
                  const isLow =
                    !product.sinStock &&
                    stockMinimo !== null &&
                    stockMinimo !== undefined &&
                    stock !== null &&
                    stock < stockMinimo;
                  const stockDisplay = displayStock(stock);
                  return (
                    <div key={sucursalId} className="flex justify-between items-center">
                      <span className="text-xs">
                        {sucursal?.name || sucursalId}:
                      </span>
                      <Badge
                        variant={
                          stockDisplay === "N/A"
                            ? "secondary"
                            : isLow
                            ? "destructive"
                            : "default"
                        }
                        className="text-xs"
                      >
                        {stockDisplay}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenStock(product)}
            disabled={product.sinStock}
            className="flex-1 min-w-0"
          >
            <PackagePlus className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Stock</span>
          </Button>
          {userRol === "admin" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenEdit(product)}
                className="flex-1 min-w-0"
              >
                <Edit className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onOpenDelete(product)}
                className="flex-none"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenView(product)}
                disabled={!product.precioCompra}
                className="flex-1 min-w-0"
              >
                <Eye className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Ver</span>
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export function Products() {
  const { user } = useUser();
  const [products, setProducts] = useState<Product[]>([]);
  const [sucursales, setSucursales] = useState<{ id: string; name: string }[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [isConfirmStockDialogOpen, setIsConfirmStockDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isToggleStatusDialogOpen, setIsToggleStatusDialogOpen] = useState(false);
  const [isToggleLandingDialogOpen, setIsToggleLandingDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedProductForAction, setSelectedProductForAction] = useState<Product | null>(null);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSucursal, setFilterSucursal] = useState<string>("");

  const [stockFormData, setStockFormData] = useState({
    sucursal: user?.rol === "admin" ? "" : user?.sucursal || "",
    cantidad: "",
  });

  const [formData, setFormData] = useState({
    nombre: "",
    precioVenta: "",
    precioCompra: "",
    codigoBarras: "",
    stockPorSucursal: {} as { [sucursalId: string]: string },
    stockMinimoPorSucursal: {} as { [sucursalId: string]: string },
    sucursales: [] as string[],
    sinStock: false,
    imagen: null as string | null,
    mostrarEnLanding: false,
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();

  // ============================================
  // CARGA INICIAL (con flag mounted)
  // ============================================
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const sucursalId = user?.rol !== "admin" ? user?.sucursal : undefined;
        const [productsData, sucursalesData] = await Promise.all([
          getProducts(sucursalId),
          getSucursales(),
        ]);

        if (!mounted) return;

        let filtered = productsData;
        if (user?.rol !== "admin") {
          filtered = productsData.filter((product) => product.activo);
        }

        setProducts(filtered);
        setSucursales(sucursalesData);
      } catch (error) {
        if (!mounted) return;
        toast({
          title: "Error",
          description: "No se pudieron cargar los productos",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // FILTRADO (useMemo evita cascada de renders)
  // ============================================
  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.nombre.toLowerCase().includes(term) ||
          (product.codigoBarras && product.codigoBarras.includes(searchTerm))
      );
    }

    if (user?.rol === "admin" && filterSucursal && filterSucursal !== "all") {
      filtered = filtered.filter((product) =>
        product.sucursales.includes(filterSucursal)
      );
    }

    return filtered;
  }, [products, searchTerm, filterSucursal, user?.rol]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterSucursal("");
  };

  // ============================================
  // RESET / FORM
  // ============================================
  const resetForm = () => {
    setFormData({
      nombre: "",
      precioVenta: "",
      precioCompra: "",
      codigoBarras: "",
      stockPorSucursal: {},
      stockMinimoPorSucursal: {},
      sucursales: [],
      sinStock: false,
      imagen: null,
      mostrarEnLanding: false,
    });
    setImagenPreview(null);
    setEditingProduct(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ============================================
  // IMAGEN: compresión en cliente antes de enviar
  // ============================================
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no puede ser mayor a 2MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const MAX = 400;
          let { width, height } = img;
          if (width > height) {
            if (width > MAX) {
              height = (height * MAX) / width;
              width = MAX;
            }
          } else {
            if (height > MAX) {
              width = (width * MAX) / height;
              height = MAX;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("No canvas context");

          // fondo blanco para PNGs con transparencia
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL("image/jpeg", 0.75);
          setImagenPreview(compressed);
          setFormData((prev) => ({ ...prev, imagen: compressed }));
        } catch (err) {
          // fallback: usar el original
          const original = reader.result as string;
          setImagenPreview(original);
          setFormData((prev) => ({ ...prev, imagen: original }));
        }
      };
      img.onerror = () => {
        toast({
          title: "Error",
          description: "No se pudo procesar la imagen",
          variant: "destructive",
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagenPreview(null);
    setFormData((prev) => ({ ...prev, imagen: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ============================================
  // ABRIR DIALOG EDICIÓN / CREACIÓN
  // ============================================
  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      const stockPorSucursal: { [sucursalId: string]: string } = {};
      const stockMinimoPorSucursal: { [sucursalId: string]: string } = {};

      product.sucursales.forEach((sucursalId) => {
        const stockValue = product.stockPorSucursal[sucursalId];
        stockPorSucursal[sucursalId] =
          stockValue !== null && stockValue !== undefined ? stockValue.toString() : "";

        const stockMinimoValue = product.stockMinimoPorSucursal?.[sucursalId];
        stockMinimoPorSucursal[sucursalId] =
          stockMinimoValue !== null && stockMinimoValue !== undefined
            ? stockMinimoValue.toString()
            : "";
      });

      setFormData({
        nombre: product.nombre,
        precioVenta: product.precioVenta.toString(),
        precioCompra: product.precioCompra?.toString() || "",
        codigoBarras: product.codigoBarras || "",
        stockPorSucursal,
        stockMinimoPorSucursal,
        sucursales: product.sucursales || [],
        sinStock: product.sinStock,
        imagen: product.imagen || null,
        mostrarEnLanding: product.mostrarEnLanding || false,
      });
      setImagenPreview(product.imagen || null);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  // ============================================
  // GUARDAR PRODUCTO
  // ============================================
  const handleSaveProduct = async () => {
    if (!formData.nombre || !formData.precioVenta) {
      toast({
        title: "Error",
        description: "Los campos nombre y precio de venta son obligatorios",
        variant: "destructive",
      });
      return;
    }

    const precioVenta = parseFloat(formData.precioVenta);
    const precioCompra = formData.precioCompra
      ? parseFloat(formData.precioCompra)
      : undefined;

    if (precioVenta <= 0) {
      toast({
        title: "Error",
        description: "El precio de venta debe ser mayor a 0",
        variant: "destructive",
      });
      return;
    }

    if (precioCompra !== undefined && precioCompra <= 0) {
      toast({
        title: "Error",
        description: "El precio de compra debe ser mayor a 0",
        variant: "destructive",
      });
      return;
    }

    if (!formData.sinStock) {
      const hasValidStock =
        formData.sucursales.length > 0 &&
        formData.sucursales.every((sucursalId) => {
          const stockValue = formData.stockPorSucursal[sucursalId];
          return (
            stockValue !== undefined &&
            stockValue !== "" &&
            parseInt(stockValue) >= 0
          );
        });

      if (!hasValidStock) {
        toast({
          title: "Error",
          description:
            "Debe asignar stock válido (≥ 0) para cada sucursal seleccionada",
          variant: "destructive",
        });
        return;
      }
    }

    const stockPorSucursal: { [sucursalId: string]: number | null } = {};
    const stockMinimoPorSucursal: { [sucursalId: string]: number | null } = {};

    formData.sucursales.forEach((sucursalId) => {
      stockPorSucursal[sucursalId] = formData.sinStock
        ? null
        : parseInt(formData.stockPorSucursal[sucursalId] || "0");

      const stockMinimoValue = formData.stockMinimoPorSucursal[sucursalId];
      stockMinimoPorSucursal[sucursalId] =
        stockMinimoValue && !formData.sinStock ? parseInt(stockMinimoValue) : null;
    });

    const productRequest: ExtendedProductRequest = {
      nombre: formData.nombre,
      precioVenta,
      sucursales: formData.sucursales,
      stockPorSucursal,
      sinStock: formData.sinStock,
      precioCompra,
      codigoBarras: formData.codigoBarras || undefined,
      stockMinimoPorSucursal:
        Object.keys(stockMinimoPorSucursal).length > 0
          ? stockMinimoPorSucursal
          : undefined,
      imagen: formData.imagen || undefined,
      mostrarEnLanding: formData.mostrarEnLanding,
    };

    try {
      setIsSaving(true);

      if (editingProduct) {
        const updatedProduct = await updateProduct(
          editingProduct.id,
          productRequest as ProductRequest
        );
        setProducts((prev) =>
          prev.map((product) =>
            product.id === editingProduct.id ? updatedProduct : product
          )
        );
        toast({
          title: "Éxito",
          description: "Producto actualizado correctamente",
        });
      } else {
        const newProduct = await createProduct(productRequest as ProductRequest);
        setProducts((prev) => [...prev, newProduct]);
        toast({
          title: "Éxito",
          description: "Producto creado correctamente",
        });
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Error al guardar el producto",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // TOGGLE ESTADO / LANDING
  // ============================================
  const handleToggleActive = async (productId: string) => {
    try {
      const updatedProduct = await toggleProductStatus(productId);

      setProducts((prev) => {
        if (user?.rol === "admin") {
          return prev.map((product) =>
            product.id === productId ? updatedProduct : product
          );
        } else {
          return prev.filter((product) => product.id !== productId);
        }
      });

      const product = products.find((p) => p.id === productId);
      toast({
        title: "Estado actualizado",
        description: `Producto ${
          product?.activo ? "deshabilitado" : "habilitado"
        } correctamente`,
      });
      setIsToggleStatusDialogOpen(false);
      setSelectedProductForAction(null);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Error al cambiar el estado",
        variant: "destructive",
      });
    }
  };

  const handleToggleLanding = async (productId: string) => {
    try {
      const updatedProduct = await toggleProductLanding(productId);

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? updatedProduct : p))
      );

      toast({
        title: "Landing actualizado",
        description: `Producto ${
          updatedProduct.mostrarEnLanding ? "mostrado" : "oculto"
        } en el Landing correctamente`,
      });
      setIsToggleLandingDialogOpen(false);
      setSelectedProductForAction(null);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Error al cambiar el estado en Landing",
        variant: "destructive",
      });
    }
  };

  // ============================================
  // ELIMINAR
  // ============================================
  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProduct(productId);
      const product = products.find((p) => p.id === productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      toast({
        title: "Producto eliminado",
        description: `${product?.nombre || "El producto"} ha sido eliminado correctamente`,
      });
      setIsDeleteDialogOpen(false);
      setSelectedProductForAction(null);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Error al eliminar el producto",
        variant: "destructive",
      });
    }
  };

  // ============================================
  // STOCK
  // ============================================
  const handleOpenStockDialog = (product: Product) => {
    if (product.sinStock) {
      toast({
        title: "Información",
        description:
          "Este producto está configurado como 'sin stock'. No se puede agregar stock.",
        variant: "default",
      });
      return;
    }

    setSelectedProductForAction(product);
    setStockFormData({
      sucursal: user?.rol === "admin" ? "" : user?.sucursal || "",
      cantidad: "",
    });
    setIsStockDialogOpen(true);
  };

  const validateStockForm = () => {
    if (
      !stockFormData.sucursal ||
      !stockFormData.cantidad ||
      !selectedProductForAction
    ) {
      toast({
        title: "Error",
        description: "Debes ingresar la cantidad",
        variant: "destructive",
      });
      return false;
    }

    const cantidad = parseInt(stockFormData.cantidad);
    if (cantidad <= 0) {
      toast({
        title: "Error",
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleAddStock = () => {
    if (!validateStockForm()) return;
    setIsConfirmStockDialogOpen(true);
  };

  const confirmAddStock = async () => {
    if (isAddingStock) return;

    try {
      setIsAddingStock(true);
      const cantidad = parseInt(stockFormData.cantidad);

      const result = await addStock({
        productoId: selectedProductForAction!.id,
        sucursalId: stockFormData.sucursal,
        cantidad,
      });

      // usar stock devuelto por el backend si está disponible
      const stockActual =
        selectedProductForAction!.stockPorSucursal[stockFormData.sucursal] ?? 0;
      const nuevoStock =
        result && typeof result === "object" && "stockNuevo" in result
          ? (result as { stockNuevo: number }).stockNuevo
          : (stockActual as number) + cantidad;

      setProducts((prev) =>
        prev.map((product) =>
          product.id === selectedProductForAction!.id
            ? {
                ...product,
                stockPorSucursal: {
                  ...product.stockPorSucursal,
                  [stockFormData.sucursal]: nuevoStock,
                },
              }
            : product
        )
      );

      toast({
        title: "Stock agregado",
        description: `Se agregaron ${cantidad} unidades de ${
          selectedProductForAction!.nombre
        } en ${sucursales.find((s) => s.id === stockFormData.sucursal)?.name}`,
      });

      setIsStockDialogOpen(false);
      setIsConfirmStockDialogOpen(false);
      setSelectedProductForAction(null);
      setStockFormData({
        sucursal: user?.rol === "admin" ? "" : user?.sucursal || "",
        cantidad: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Error al agregar stock",
        variant: "destructive",
      });
    } finally {
      setIsAddingStock(false);
    }
  };

  // ============================================
  // SUCURSALES / SIN STOCK EN FORM
  // ============================================
  const handleSucursalChange = (sucursalId: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        sucursales: [...prev.sucursales, sucursalId],
        stockPorSucursal: {
          ...prev.stockPorSucursal,
          [sucursalId]: "",
        },
        stockMinimoPorSucursal: {
          ...prev.stockMinimoPorSucursal,
          [sucursalId]: "",
        },
      }));
    } else {
      setFormData((prev) => {
        const newSucursales = prev.sucursales.filter((s) => s !== sucursalId);
        const newStock = { ...prev.stockPorSucursal };
        const newStockMinimo = { ...prev.stockMinimoPorSucursal };
        delete newStock[sucursalId];
        delete newStockMinimo[sucursalId];
        return {
          ...prev,
          sucursales: newSucursales,
          stockPorSucursal: newStock,
          stockMinimoPorSucursal: newStockMinimo,
        };
      });
    }
  };

  const handleSinStockChange = (sinStock: boolean) => {
    setFormData((prev) => {
      const newStockPorSucursal = { ...prev.stockPorSucursal };
      const newStockMinimoPorSucursal = { ...prev.stockMinimoPorSucursal };

      if (sinStock) {
        prev.sucursales.forEach((sucursalId) => {
          newStockPorSucursal[sucursalId] = "";
          newStockMinimoPorSucursal[sucursalId] = "";
        });
      }

      return {
        ...prev,
        sinStock,
        stockPorSucursal: newStockPorSucursal,
        stockMinimoPorSucursal: newStockMinimoPorSucursal,
      };
    });
  };

  // ============================================
  // OPENERS DE DIALOGS
  // ============================================
  const openDeleteDialog = (product: Product) => {
    setSelectedProductForAction(product);
    setIsDeleteDialogOpen(true);
  };

  const openToggleStatusDialog = (product: Product) => {
    setSelectedProductForAction(product);
    setIsToggleStatusDialogOpen(true);
  };

  const openToggleLandingDialog = (product: Product) => {
    setSelectedProductForAction(product);
    setIsToggleLandingDialogOpen(true);
  };

  const openViewDialog = (product: Product) => {
    if (!product.precioCompra) {
      toast({
        title: "Información",
        description: "Este producto no tiene precio de compra registrado",
        variant: "default",
      });
      return;
    }
    setSelectedProductForAction(product);
    setIsViewDialogOpen(true);
  };

  // ============================================
  // HELPERS
  // ============================================
  const displayStock = (stock: number | null | undefined) => {
    if (stock === undefined || stock === null) return "N/A";
    return stock.toString();
  };

  const handleScanSuccess = (decodedText: string) => {
    setSearchTerm(decodedText);
    setShowScanner(false);
    toast({
      title: "Código escaneado",
      description: `Buscando: ${decodedText}`,
    });
  };

  const calculateMargin = (precioVenta: number, precioCompra: number) => {
    const ganancia = precioVenta - precioCompra;
    const margen = (ganancia / precioVenta) * 100;
    return { ganancia, margen };
  };

  // ============================================
  // RENDER: Loading
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Cargando productos...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Principal
  // ============================================
  return (
    <div className="space-y-6">
      {showScanner && (
        <BarcodeScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Productos</h1>
          <p className="text-muted-foreground">
            Gestiona el inventario de productos del gimnasio
          </p>
        </div>
        {user?.rol === "admin" && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Editar Producto" : "Nuevo Producto"}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct
                    ? "Modifica los datos del producto"
                    : "Completa la información del nuevo producto"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Imagen del producto */}
                <div className="grid gap-2">
                  <Label>Imagen del producto</Label>
                  <div className="flex items-center gap-4">
                    {imagenPreview ? (
                      <div className="relative">
                        <img
                          src={imagenPreview}
                          alt="Preview"
                          className="w-20 h-20 rounded-lg object-contain border-2 border-primary bg-white"
                        />
                        <button
                          onClick={handleRemoveImage}
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 hover:bg-destructive/90 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20">
                        <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="imagen-upload"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {imagenPreview ? "Cambiar imagen" : "Subir imagen"}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        Formatos: JPG, PNG, WebP. Máx 2MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="nombre">
                    Nombre del producto <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                    }
                    placeholder="Ej: Proteína Whey"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="codigoBarras">Código de barras</Label>
                  <Input
                    id="codigoBarras"
                    value={formData.codigoBarras}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        codigoBarras: e.target.value,
                      }))
                    }
                    placeholder="Código de barras del producto"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="precioVenta">
                      Precio de venta (Bs.){" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="precioVenta"
                      type="number"
                      step="0.01"
                      value={formData.precioVenta}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          precioVenta: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="precioCompra">Precio de compra (Bs.)</Label>
                    <Input
                      id="precioCompra"
                      type="number"
                      step="0.01"
                      value={formData.precioCompra}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          precioCompra: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.sinStock}
                    onCheckedChange={handleSinStockChange}
                  />
                  <Label htmlFor="sin-stock" className="cursor-pointer">
                    Sin Stock
                  </Label>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formData.sinStock
                    ? "Este producto no requiere control de stock (ej: servicios, membresías)"
                    : "Este producto requiere control de stock"}
                </div>

                {/* Switch Landing */}
                <div className="flex items-center space-x-2 pt-2 border-t">
                  <Switch
                    checked={formData.mostrarEnLanding}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        mostrarEnLanding: checked,
                      }))
                    }
                  />
                  <Label className="cursor-pointer">Mostrar en Landing</Label>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formData.mostrarEnLanding
                    ? "Este producto aparecerá en la página de inicio"
                    : "Este producto NO aparecerá en la página de inicio"}
                </div>

                <div className="grid gap-2">
                  <Label>
                    Sucursales {formData.sinStock ? "disponibles" : "y Stock"}
                  </Label>
                  <div className="space-y-3">
                    {sucursales.map((sucursal) => (
                      <div key={sucursal.id} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={sucursal.id}
                            checked={formData.sucursales.includes(sucursal.id)}
                            onCheckedChange={(checked) =>
                              handleSucursalChange(sucursal.id, checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={sucursal.id}
                            className="text-sm font-medium"
                          >
                            {sucursal.name}
                          </Label>
                        </div>
                        {formData.sucursales.includes(sucursal.id) &&
                          !formData.sinStock && (
                            <div className="ml-6 grid grid-cols-2 gap-3">
                              <div>
                                <Label
                                  htmlFor={`stock-${sucursal.id}`}
                                  className="text-xs text-muted-foreground"
                                >
                                  Stock inicial
                                </Label>
                                <Input
                                  id={`stock-${sucursal.id}`}
                                  type="number"
                                  value={formData.stockPorSucursal[sucursal.id] || ""}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      stockPorSucursal: {
                                        ...prev.stockPorSucursal,
                                        [sucursal.id]: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="0"
                                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  onWheel={(e) => e.currentTarget.blur()}
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor={`stockMinimo-${sucursal.id}`}
                                  className="text-xs text-muted-foreground"
                                >
                                  Stock mínimo
                                </Label>
                                <Input
                                  id={`stockMinimo-${sucursal.id}`}
                                  type="number"
                                  value={
                                    formData.stockMinimoPorSucursal[sucursal.id] || ""
                                  }
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      stockMinimoPorSucursal: {
                                        ...prev.stockMinimoPorSucursal,
                                        [sucursal.id]: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Mínimo"
                                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  onWheel={(e) => e.currentTarget.blur()}
                                />
                              </div>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveProduct} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingProduct ? "Actualizando..." : "Creando..."}
                    </>
                  ) : editingProduct ? (
                    "Actualizar"
                  ) : (
                    "Crear"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Barra de búsqueda para ADMIN - Desktop */}
      {user?.rol === "admin" && (
        <Card className="hidden md:block">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o código de barras..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="w-full md:w-64">
                <Select value={filterSucursal} onValueChange={setFilterSucursal}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue placeholder="Todas las sucursales" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las sucursales</SelectItem>
                    {sucursales.map((sucursal) => (
                      <SelectItem key={sucursal.id} value={sucursal.id}>
                        {sucursal.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(searchTerm || filterSucursal) && (
                <Button variant="ghost" onClick={clearFilters} size="sm">
                  <X className="w-4 h-4 mr-2" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Barra de búsqueda para ADMIN - Móvil */}
      {user?.rol === "admin" && (
        <Card className="md:hidden">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowScanner(true)}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Barra de búsqueda para EMPLEADO - Desktop */}
      {user?.rol !== "admin" && (
        <Card className="hidden md:block">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searchTerm && (
                <Button variant="ghost" onClick={clearFilters} size="sm">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Barra de búsqueda para EMPLEADO - Móvil */}
      {user?.rol !== "admin" && (
        <Card className="md:hidden">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowScanner(true)}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Ver Detalles */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles del Producto</DialogTitle>
            <DialogDescription>Información de precios y márgenes</DialogDescription>
          </DialogHeader>
          {selectedProductForAction && selectedProductForAction.precioCompra && (
            <div className="space-y-4 py-4">
              {selectedProductForAction.imagen && (
                <div className="flex justify-center mb-4">
                  <img
                    src={selectedProductForAction.imagen}
                    alt={selectedProductForAction.nombre}
                    className="w-32 h-32 rounded-lg object-contain border bg-white"
                  />
                </div>
              )}
              <div className="grid gap-3">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium">Producto:</span>
                  <span className="text-right">
                    {selectedProductForAction.nombre}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Precio de Compra:</span>
                  <span className="font-semibold">
                    Bs. {selectedProductForAction.precioCompra.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Precio de Venta:</span>
                  <span className="font-semibold">
                    Bs. {selectedProductForAction.precioVenta.toFixed(2)}
                  </span>
                </div>
                {(() => {
                  const { ganancia, margen } = calculateMargin(
                    selectedProductForAction.precioVenta,
                    selectedProductForAction.precioCompra!
                  );
                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Ganancia:</span>
                        <span className="font-semibold text-green-600">
                          Bs. {ganancia.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">
                          Margen de Ganancia:
                        </span>
                        <span className="font-semibold text-blue-600">
                          {margen.toFixed(2)}%
                        </span>
                      </div>
                    </>
                  );
                })()}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-muted-foreground">Landing:</span>
                  <Badge
                    variant={
                      selectedProductForAction.mostrarEnLanding
                        ? "default"
                        : "secondary"
                    }
                  >
                    {selectedProductForAction.mostrarEnLanding
                      ? "Visible"
                      : "Oculto"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Agregar Stock */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Stock</DialogTitle>
            <DialogDescription>
              Agregar stock para {selectedProductForAction?.nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {user?.rol === "admin" && (
              <div className="grid gap-2">
                <Label>Sucursal</Label>
                <Select
                  value={stockFormData.sucursal}
                  onValueChange={(value) =>
                    setStockFormData((prev) => ({ ...prev, sucursal: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {sucursales
                      .filter((s) =>
                        selectedProductForAction?.sucursales.includes(s.id)
                      )
                      .map((sucursal) => (
                        <SelectItem key={sucursal.id} value={sucursal.id}>
                          {sucursal.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="cantidad">Cantidad a agregar</Label>
              <Input
                id="cantidad"
                type="number"
                value={stockFormData.cantidad}
                onChange={(e) =>
                  setStockFormData((prev) => ({
                    ...prev,
                    cantidad: e.target.value,
                  }))
                }
                placeholder="0"
                min="1"
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsStockDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddStock}>Agregar Stock</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmación Agregar Stock */}
      <AlertDialog
        open={isConfirmStockDialogOpen}
        onOpenChange={setIsConfirmStockDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Agregar Stock</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas agregar {stockFormData.cantidad} unidades
              de {selectedProductForAction?.nombre} en{" "}
              {user?.rol === "admin"
                ? sucursales.find((s) => s.id === stockFormData.sucursal)?.name
                : sucursales.find((s) => s.id === user?.sucursal)?.name}
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAddStock}
              disabled={isAddingStock}
              className={isAddingStock ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isAddingStock ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Agregando...
                </>
              ) : (
                "Confirmar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación Eliminar */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Estás seguro de eliminar este producto?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto "
              {selectedProductForAction?.nombre}" será marcado como eliminado
              (estado = 2) y ya no estará disponible en el sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                handleDeleteProduct(selectedProductForAction?.id || "")
              }
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación Toggle Estado */}
      <AlertDialog
        open={isToggleStatusDialogOpen}
        onOpenChange={setIsToggleStatusDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedProductForAction?.activo ? "Deshabilitar" : "Habilitar"}{" "}
              producto
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas{" "}
              {selectedProductForAction?.activo ? "deshabilitar" : "habilitar"} el
              producto "{selectedProductForAction?.nombre}"?
              {selectedProductForAction?.activo
                ? " Los usuarios no podrán verlo en las listas."
                : " El producto volverá a estar disponible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                handleToggleActive(selectedProductForAction?.id || "")
              }
            >
              {selectedProductForAction?.activo ? "Deshabilitar" : "Habilitar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación Toggle Landing */}
      <AlertDialog
        open={isToggleLandingDialogOpen}
        onOpenChange={setIsToggleLandingDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedProductForAction?.mostrarEnLanding
                ? "Ocultar del"
                : "Mostrar en"}{" "}
              Landing
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas{" "}
              {selectedProductForAction?.mostrarEnLanding ? "ocultar" : "mostrar"}{" "}
              el producto "{selectedProductForAction?.nombre}" en el Landing?
              {selectedProductForAction?.mostrarEnLanding
                ? " El producto ya no aparecerá en la página de inicio."
                : " El producto aparecerá en la página de inicio."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                handleToggleLanding(selectedProductForAction?.id || "")
              }
            >
              {selectedProductForAction?.mostrarEnLanding ? "Ocultar" : "Mostrar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Lista de Productos
            {filteredProducts.length > 0 && (searchTerm || filterSucursal) && (
              <Badge variant="secondary" className="ml-2">
                {filteredProducts.length} resultado(s)
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Gestiona los productos disponibles en el gimnasio
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 && products.length > 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                No hay productos que coincidan con los filtros
              </p>
              <Button variant="ghost" className="mt-4" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </div>
          ) : filteredProducts.length === 0 && products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                No hay productos registrados
              </p>
              {user?.rol === "admin" && (
                <Button className="mt-4" onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear primer producto
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Vista Desktop - Tabla */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imagen</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Precio Venta</TableHead>
                      {user?.rol === "admin" && (
                        <TableHead>Precio Compra</TableHead>
                      )}
                      <TableHead>Stock</TableHead>
                      {user?.rol === "admin" && (
                        <>
                          <TableHead>Landing</TableHead>
                          <TableHead>Estado</TableHead>
                        </>
                      )}
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const userSucursalStock =
                        user?.rol !== "admin"
                          ? product.stockPorSucursal[user?.sucursal || ""]
                          : null;

                      let stockToShow = product.stockPorSucursal;
                      if (
                        user?.rol === "admin" &&
                        filterSucursal &&
                        filterSucursal !== "all"
                      ) {
                        if (
                          product.stockPorSucursal[filterSucursal] !== undefined
                        ) {
                          stockToShow = {
                            [filterSucursal]:
                              product.stockPorSucursal[filterSucursal],
                          };
                        } else {
                          stockToShow = {};
                        }
                      }

                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            {product.imagen ? (
                              <img
                                src={product.imagen}
                                alt={product.nombre}
                                className="w-10 h-10 rounded-lg object-contain border bg-white"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20">
                                <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.nombre}</p>
                              {product.codigoBarras && (
                                <p className="text-xs text-muted-foreground">
                                  {product.codigoBarras}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.codigoBarras ? (
                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {product.codigoBarras}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">
                            Bs. {product.precioVenta.toFixed(2)}
                          </TableCell>
                          {user?.rol === "admin" && (
                            <TableCell>
                              {product.precioCompra ? (
                                `Bs. ${product.precioCompra.toFixed(2)}`
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            {user?.rol === "admin" ? (
                              <div className="flex flex-col gap-1">
                                {Object.entries(stockToShow)
                                  .filter(([, stock]) => stock !== undefined)
                                  .map(([sucursalId, stock]) => {
                                    const sucursal = sucursales.find(
                                      (s) => s.id === sucursalId
                                    );
                                    const stockMinimo =
                                      product.stockMinimoPorSucursal?.[sucursalId];
                                    const isLow =
                                      !product.sinStock &&
                                      stockMinimo !== null &&
                                      stockMinimo !== undefined &&
                                      stock !== null &&
                                      stock < stockMinimo;
                                    const stockDisplay = displayStock(stock);
                                    return (
                                      <div
                                        key={sucursalId}
                                        className="flex items-center gap-2"
                                      >
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                          {sucursal?.name || sucursalId}:
                                        </span>
                                        <Badge
                                          variant={
                                            stockDisplay === "N/A"
                                              ? "secondary"
                                              : isLow
                                              ? "destructive"
                                              : "default"
                                          }
                                          className="text-xs"
                                        >
                                          {stockDisplay}
                                        </Badge>
                                      </div>
                                    );
                                  })}
                              </div>
                            ) : (
                              <Badge
                                variant={
                                  product.sinStock
                                    ? "secondary"
                                    : userSucursalStock === null
                                    ? "secondary"
                                    : (userSucursalStock as number) < 10
                                    ? "destructive"
                                    : "default"
                                }
                              >
                                {displayStock(userSucursalStock)}
                              </Badge>
                            )}
                          </TableCell>
                          {user?.rol === "admin" && (
                            <>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={product.mostrarEnLanding || false}
                                    onCheckedChange={() =>
                                      openToggleLandingDialog(product)
                                    }
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {product.mostrarEnLanding
                                      ? "Visible"
                                      : "Oculto"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={product.activo}
                                    onCheckedChange={() =>
                                      openToggleStatusDialog(product)
                                    }
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {product.activo ? "Activo" : "Inactivo"}
                                  </span>
                                </div>
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenStockDialog(product)}
                                title="Agregar stock"
                                disabled={product.sinStock}
                              >
                                <PackagePlus className="w-4 h-4" />
                              </Button>
                              {user?.rol === "admin" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openViewDialog(product)}
                                  title="Ver detalles"
                                  disabled={!product.precioCompra}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              )}
                              {user?.rol === "admin" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenDialog(product)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openDeleteDialog(product)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Vista Móvil - Cards */}
              <div className="md:hidden">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    userRol={user?.rol}
                    userSucursal={user?.sucursal}
                    sucursales={sucursales}
                    onOpenStock={handleOpenStockDialog}
                    onOpenEdit={handleOpenDialog}
                    onOpenDelete={openDeleteDialog}
                    onOpenView={openViewDialog}
                    onToggleLanding={openToggleLandingDialog}
                    onToggleStatus={openToggleStatusDialog}
                    displayStock={displayStock}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}