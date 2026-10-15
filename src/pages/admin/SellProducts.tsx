// src/pages/admin/SellProducts.tsx
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  CreditCard,
  Search,
  Loader2,
  Lock,
  Banknote,
  QrCode,
  PackageX,
  Camera,
  Image as ImageIcon,
  Ticket,
  CheckCircle,
} from "lucide-react";
import {
  getProducts,
  processSale,
  getCashRegisterStatus,
  validateCoupon,
  Product,
  CartItem,
  PaymentMethod,
  SaleRequest,
  CashRegisterStatus,
  ValidatedCoupon,
} from "@/api/SellProductsApi";
import { getStoredUserData, UserData } from "@/api/loginapi";
import BarcodeScanner from "./BarcodeScanner";

interface ExtendedProduct extends Product {
  codigoBarras?: string | null;
  imagen?: string | null;
}

interface SellProductsProps {
  /** Modo compacto tipo chat (para el botón flotante) */
  compact?: boolean;
  /** Callback al completar una venta (usado por el panel flotante para cerrarse) */
  onSaleSuccess?: () => void;
}

const getProductImageUrl = (imagen: string | null): string => {
  if (!imagen) return "";
  if (imagen.startsWith("http://") || imagen.startsWith("https://")) {
    return imagen;
  }
  if (imagen.startsWith("data:")) {
    return imagen;
  }
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const cleanPath = imagen.startsWith("/") ? imagen : `/${imagen}`;
  return `${baseUrl}${cleanPath}`;
};

export function SellProducts({ compact = false, onSaleSuccess }: SellProductsProps) {
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountReason, setDiscountReason] = useState("");

  // ✅ CAMBIO: sin método de pago por defecto
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  const [showDiscountField, setShowDiscountField] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [cashRegisterStatus, setCashRegisterStatus] =
    useState<CashRegisterStatus | null>(null);
  const [isCashRegisterOpen, setIsCashRegisterOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Cupones
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<ValidatedCoupon | null>(
    null
  );
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const storedUserData = getStoredUserData();
    if (!storedUserData) {
      toast({
        title: "Error",
        description:
          "No se encontraron datos de usuario. Por favor, inicie sesión nuevamente.",
        variant: "destructive",
      });
      return;
    }

    setUserData(storedUserData);
    loadCashRegisterStatus(storedUserData);
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // CARGA DE DATOS
  // ============================================
  const loadCashRegisterStatus = async (userData: UserData) => {
    try {
      const status = await getCashRegisterStatus(userData.idusuario);
      setCashRegisterStatus(status);
      setIsCashRegisterOpen(status.estado === "abierta");
    } catch (error) {
      console.error("Error al obtener estado de caja:", error);
      setIsCashRegisterOpen(false);
    }
  };

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const productsData = await getProducts();
      const extendedProducts = productsData.map((product) => ({
        ...product,
        codigoBarras: (product as any).codigoBarras || null,
        imagen: (product as any).imagen || null,
      }));
      setProducts(extendedProducts as ExtendedProduct[]);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // FILTRADO
  // ============================================
  const filteredProducts = products.filter(
    (product) =>
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.codigoBarras &&
        product.codigoBarras.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const productsToShow =
    compact && searchTerm.trim() === "" ? [] : filteredProducts;
  const hasSearch = searchTerm.trim() !== "";

  // ============================================
  // CARRITO
  // ============================================
  const addToCart = (product: ExtendedProduct) => {
    if (!isCashRegisterOpen) return;

    const existingItem = cart.find((item) => item.product.id === product.id);

    if (existingItem) {
      if (!product.sinStock && existingItem.quantity >= product.stock) {
        toast({
          title: "Stock insuficiente",
          description: `Solo hay ${product.stock} unidades disponibles`,
          variant: "destructive",
        });
        return;
      }
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart((prev) => [...prev, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (!isCashRegisterOpen) return;

    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (product && !product.sinStock && quantity > product.stock) {
      toast({
        title: "Stock insuficiente",
        description: `Solo hay ${product.stock} unidades disponibles`,
        variant: "destructive",
      });
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    if (!isCashRegisterOpen) return;
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // ============================================
  // TOTALES
  // ============================================
  const getSubtotal = () => {
    return cart.reduce(
      (total, item) => total + item.product.precio * item.quantity,
      0
    );
  };

  const getTotal = () => {
    return getSubtotal() - discount;
  };

  // ============================================
  // DESCUENTO MANUAL
  // ============================================
  const handleDiscountChange = (value: string) => {
    if (!isCashRegisterOpen) return;

    const discountValue = parseFloat(value) || 0;
    if (discountValue > 0) {
      setShowDiscountField(true);
    } else {
      setShowDiscountField(false);
      setDiscountReason("");
    }
    setDiscount(discountValue);
  };

  // ============================================
  // CUPONES
  // ============================================
  const handleApplyCoupon = async () => {
    setCouponError(null);

    if (!couponCode.trim()) {
      setCouponError("Ingresa un código de cupón");
      return;
    }

    if (cart.length === 0) {
      setCouponError("Agrega productos antes de aplicar un cupón");
      return;
    }

    try {
      setIsValidatingCoupon(true);
      const validatedCoupon = await validateCoupon(couponCode.trim());
      const subtotal = getSubtotal();
      let descuentoCalculado = 0;

      if (validatedCoupon.tipo === "porcentaje") {
        descuentoCalculado = (subtotal * validatedCoupon.valor) / 100;
      } else {
        descuentoCalculado = validatedCoupon.valor;
      }

      descuentoCalculado = Math.min(descuentoCalculado, subtotal);

      setAppliedCoupon(validatedCoupon);
      setDiscount(descuentoCalculado);
      setDiscountReason(`Cupón: ${validatedCoupon.codigo}`);
      setShowDiscountField(false);
      setCouponError(null);

      toast({
        title: "Cupón aplicado",
        description: `Descuento de Bs. ${descuentoCalculado.toFixed(2)} aplicado`,
      });
    } catch (error: any) {
      const msg =
        error instanceof Error ? error.message : "No se pudo validar el cupón";
      setCouponError(msg);
      setAppliedCoupon(null);
      setDiscount(0);
      setDiscountReason("");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setDiscount(0);
    setDiscountReason("");
    setShowDiscountField(false);
    setCouponError(null);
  };

  // ============================================
  // PAGO
  // ============================================
  // ✅ CAMBIO: acepta null para permitir deselección si se desea
  const handlePaymentMethodChange = (
    method: "efectivo" | "qr" | "mixto" | null
  ) => {
    if (!isCashRegisterOpen) return;

    if (method === null) {
      setPaymentMethod(null);
      return;
    }

    if (method === "mixto") {
      const total = getTotal();
      setPaymentMethod({ type: "mixto", efectivo: total, qr: 0 });
    } else {
      setPaymentMethod({ type: method });
    }
  };

  const handleMixedPaymentChange = (
    field: "efectivo" | "qr",
    value: string
  ) => {
    if (!isCashRegisterOpen) return;

    const numericValue = parseFloat(value) || 0;
    const total = getTotal();

    if (field === "efectivo") {
      setPaymentMethod({
        type: "mixto",
        efectivo: numericValue,
        qr: total - numericValue,
      });
    } else {
      setPaymentMethod({
        type: "mixto",
        efectivo: total - numericValue,
        qr: numericValue,
      });
    }
  };

  // ============================================
  // SCANNER
  // ============================================
  const handleScanSuccess = (decodedText: string) => {
    setSearchTerm(decodedText);
    setShowScanner(false);

    const foundProduct = products.find(
      (product) => product.codigoBarras === decodedText
    );

    if (foundProduct && isProductAvailable(foundProduct)) {
      addToCart(foundProduct);
      toast({
        title: "Producto agregado",
        description: `${foundProduct.nombre} agregado al carrito`,
      });
    } else if (foundProduct && !isProductAvailable(foundProduct)) {
      toast({
        title: "Producto sin stock",
        description: `${foundProduct.nombre} no tiene stock disponible`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Producto no encontrado",
        description: "No se encontró ningún producto con ese código de barras",
        variant: "destructive",
      });
    }
  };

  // ============================================
  // PROCESAR VENTA
  // ============================================
  const processSaleHandler = async () => {
    if (!isCashRegisterOpen) {
      toast({
        title: "Caja cerrada",
        description: "No se pueden realizar ventas cuando la caja está cerrada",
        variant: "destructive",
      });
      return;
    }

    if (!userData) {
      toast({
        title: "Error",
        description: "Inicia sesión nuevamente",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "El carrito está vacío",
        variant: "destructive",
      });
      return;
    }

    // ✅ CAMBIO: validar que exista un método de pago seleccionado
    if (!paymentMethod) {
      toast({
        title: "Método de pago requerido",
        description: "Debes seleccionar una forma de pago antes de procesar la venta.",
        variant: "destructive",
      });
      return;
    }

    if (discount > 0 && !appliedCoupon && !discountReason.trim()) {
      toast({
        title: "Error",
        description: "Debe justificar el descuento aplicado",
        variant: "destructive",
      });
      return;
    }

    const total = getTotal();

    if (paymentMethod.type === "mixto") {
      const efectivo = paymentMethod.efectivo || 0;
      const qr = paymentMethod.qr || 0;

      if (Math.abs(efectivo + qr - total) > 0.01) {
        toast({
          title: "Error",
          description: "La suma de efectivo y QR debe ser igual al total",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setIsProcessing(true);

      const saleData: SaleRequest = {
        productos: cart.map((item) => ({
          producto_id: parseInt(item.product.id),
          cantidad: item.quantity,
          precio_unitario: item.product.precio,
          subtotal: item.product.precio * item.quantity,
        })),
        subtotal: getSubtotal(),
        descuento: discount,
        descripcion_descuento: discountReason,
        total: total,
        forma_pago: paymentMethod.type,
        detalle_pago:
          paymentMethod.type === "mixto"
            ? `Efectivo: Bs. ${paymentMethod.efectivo}, QR: Bs. ${paymentMethod.qr}`
            : paymentMethod.type === "efectivo"
            ? `Pago en efectivo: Bs. ${total}`
            : `Pago QR: Bs. ${total}`,
        monto_efectivo:
          paymentMethod.type === "efectivo"
            ? total
            : paymentMethod.efectivo || 0,
        monto_qr: paymentMethod.type === "qr" ? total : paymentMethod.qr || 0,
        cupon_codigo: appliedCoupon?.codigo || undefined,
      };

      const result = await processSale(saleData);

      toast({
        title: "Venta realizada",
        description: `Venta #${result.idventa} por Bs. ${total.toFixed(
          2
        )} procesada correctamente`,
      });

      setCart([]);
      setDiscount(0);
      setDiscountReason("");
      setShowDiscountField(false);
      setPaymentMethod(null); // ✅ CAMBIO: reset a null
      setSearchTerm("");
      setAppliedCoupon(null);
      setCouponCode("");
      setCouponError(null);

      await loadProducts();

      // 🔔 Notificar al contenedor (para que el panel flotante se cierre)
      onSaleSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar la venta",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const displayStock = (product: ExtendedProduct) => {
    if (product.sinStock) return "Ilimitado";
    return product.stock.toString();
  };

  const isProductAvailable = (product: ExtendedProduct) => {
    if (product.sinStock) return true;
    return product.stock > 0;
  };

  const handleImageError = (productId: string) => {
    setImageErrors((prev) => ({ ...prev, [productId]: true }));
  };

  // ============================================
  // RENDER MODO COMPACTO (tipo chat)
  // ============================================
  if (compact) {
    return (
      <div className="flex flex-col h-full bg-background">
        {showScanner && (
          <BarcodeScanner
            onScanSuccess={handleScanSuccess}
            onClose={() => setShowScanner(false)}
          />
        )}

        {/* Header compacto */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-card flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Venta Rápida</span>
          </div>
          <Badge
            variant={isCashRegisterOpen ? "default" : "destructive"}
            className="text-[10px] py-0.5 px-2"
          >
            {isCashRegisterOpen ? "ABIERTA" : "CERRADA"}
          </Badge>
        </div>

        {/* Buscador sticky */}
        <div className="px-3 py-2 border-b bg-card flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-8 text-sm"
              disabled={!isCashRegisterOpen}
            />
          </div>
        </div>

        {/* Área scrolleable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-2">
          {hasSearch && (
            <div className="space-y-1.5">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : productsToShow.length === 0 ? (
                <p className="text-center text-muted-foreground text-xs py-4">
                  No se encontraron productos
                </p>
              ) : (
                productsToShow.map((product) => {
                  const imageUrl = getProductImageUrl(product.imagen || null);
                  const hasError = imageErrors[product.id];
                  const showImage = imageUrl && !hasError;

                  return (
                    <button
                      key={product.id}
                      onClick={() => {
                        addToCart(product);
                        setSearchTerm("");
                      }}
                      disabled={
                        !isProductAvailable(product) || !isCashRegisterOpen
                      }
                      className="w-full flex items-center gap-2 p-2 border rounded-lg hover:bg-muted transition-colors text-left disabled:opacity-50"
                    >
                      <div className="w-9 h-9 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border">
                        {showImage ? (
                          <img
                            src={imageUrl}
                            alt={product.nombre}
                            className="w-full h-full object-contain bg-white"
                            onError={() => handleImageError(product.id)}
                            loading="lazy"
                          />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {product.nombre}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Bs. {product.precio.toFixed(2)} •{" "}
                          {displayStock(product)}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                    </button>
                  );
                })
              )}
            </div>
          )}

          {cart.length > 0 && (
            <>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  CARRITO ({cart.length})
                </span>
              </div>

              <div className="space-y-1.5">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-2 p-2 border rounded-lg bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {item.product.nombre}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Bs. {item.product.precio.toFixed(2)} x {item.quantity} =
                        Bs. {(item.product.precio * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                        disabled={!isCashRegisterOpen}
                        className="w-6 h-6 rounded border flex items-center justify-center hover:bg-muted disabled:opacity-50"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                        disabled={!isCashRegisterOpen}
                        className="w-6 h-6 rounded border flex items-center justify-center hover:bg-muted disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        disabled={!isCashRegisterOpen}
                        className="w-6 h-6 rounded border flex items-center justify-center hover:bg-destructive/10 text-destructive disabled:opacity-50 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {!appliedCoupon ? (
                <div className="space-y-1">
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="Cupón"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError(null);
                      }}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleApplyCoupon()
                      }
                      disabled={!isCashRegisterOpen || isValidatingCoupon}
                      className="font-mono h-7 text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApplyCoupon}
                      disabled={
                        !isCashRegisterOpen ||
                        !couponCode.trim() ||
                        isValidatingCoupon
                      }
                      className="h-7 text-xs px-2"
                    >
                      {isValidatingCoupon ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Ticket className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  {couponError && (
                    <p className="text-[10px] text-destructive">
                      {couponError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-1.5 border rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    <div>
                      <p className="text-[11px] font-mono font-medium">
                        {appliedCoupon.codigo}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {appliedCoupon.tipo === "porcentaje"
                          ? `${appliedCoupon.valor}%`
                          : `Bs. ${appliedCoupon.valor}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    disabled={!isCashRegisterOpen}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-destructive/10 text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {!appliedCoupon && (
                <div className="space-y-1">
                  <Input
                    type="text"
                    value={discount || ""}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    placeholder="Descuento manual Bs."
                    disabled={!isCashRegisterOpen}
                    className="h-7 text-xs"
                  />
                  {showDiscountField && (
                    <Textarea
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      placeholder="Justificación..."
                      rows={2}
                      disabled={!isCashRegisterOpen}
                      className="text-xs"
                    />
                  )}
                </div>
              )}

              <Separator />

              <div className="space-y-0.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>Bs. {getSubtotal().toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Descuento</span>
                    <span>-Bs. {discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-0.5">
                  <span>Total</span>
                  <span>Bs. {getTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {/* ✅ CAMBIO: sin selección por defecto */}
                <button
                  onClick={() => handlePaymentMethodChange("efectivo")}
                  disabled={!isCashRegisterOpen}
                  className={`flex flex-col items-center gap-0.5 py-1.5 rounded border text-[10px] transition-colors ${
                    paymentMethod?.type === "efectivo"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <Banknote size={14} />
                  Efectivo
                </button>
                <button
                  onClick={() => handlePaymentMethodChange("qr")}
                  disabled={!isCashRegisterOpen}
                  className={`flex flex-col items-center gap-0.5 py-1.5 rounded border text-[10px] transition-colors ${
                    paymentMethod?.type === "qr"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <QrCode size={14} />
                  QR
                </button>
                <button
                  onClick={() => handlePaymentMethodChange("mixto")}
                  disabled={!isCashRegisterOpen}
                  className={`flex flex-col items-center gap-0.5 py-1.5 rounded border text-[10px] transition-colors ${
                    paymentMethod?.type === "mixto"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <CreditCard size={14} />
                  Mixto
                </button>
              </div>

              {paymentMethod?.type === "mixto" && (
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    type="text"
                    value={paymentMethod.efectivo || ""}
                    onChange={(e) =>
                      handleMixedPaymentChange("efectivo", e.target.value)
                    }
                    placeholder="Efectivo"
                    disabled={!isCashRegisterOpen}
                    className="h-7 text-xs"
                  />
                  <Input
                    type="text"
                    value={paymentMethod.qr || ""}
                    onChange={(e) =>
                      handleMixedPaymentChange("qr", e.target.value)
                    }
                    placeholder="QR"
                    disabled={!isCashRegisterOpen}
                    className="h-7 text-xs"
                  />
                </div>
              )}
            </>
          )}

          {cart.length === 0 && !hasSearch && (
            <div className="text-center py-8 px-4">
              <ShoppingCart className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">
                Busca un producto por nombre o código
              </p>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-2 border-t bg-card flex-shrink-0">
            <Button
              className="w-full h-9 text-sm"
              onClick={processSaleHandler}
              disabled={isProcessing || !isCashRegisterOpen || !paymentMethod}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                  Procesar - Bs. {getTotal().toFixed(2)}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // RENDER NORMAL (vista completa en /admin/sell)
  // ============================================
  return (
    <div className="space-y-6">
      {showScanner && (
        <BarcodeScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Vender Productos</h1>
          <p className="text-muted-foreground">
            Realiza ventas de productos del gimnasio
          </p>
        </div>

        <Badge
          variant={isCashRegisterOpen ? "default" : "destructive"}
          className="text-sm py-1 px-3"
        >
          {isCashRegisterOpen ? (
            <span>Caja: ABIERTA</span>
          ) : (
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Caja: CERRADA
            </span>
          )}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={!isCashRegisterOpen ? "opacity-70" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Productos Disponibles
              {!isCashRegisterOpen && <Lock className="w-4 h-4" />}
            </CardTitle>
            <CardDescription>
              {isCashRegisterOpen
                ? "Selecciona los productos para vender"
                : "La caja está cerrada. No se pueden realizar ventas."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="hidden md:flex relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  disabled={!isCashRegisterOpen}
                />
              </div>

              <div className="flex gap-2 md:hidden">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                    disabled={!isCashRegisterOpen}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowScanner(true)}
                  disabled={!isCashRegisterOpen}
                  className="flex-shrink-0"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => {
                          const imageUrl = getProductImageUrl(
                            product.imagen || null
                          );
                          const hasError = imageErrors[product.id];
                          const showImage = imageUrl && !hasError;

                          return (
                            <div
                              key={product.id}
                              className="flex items-center justify-between p-3 border rounded-lg mb-3"
                            >
                              <div className="flex items-center gap-4 flex-1">
                                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border">
                                  {showImage ? (
                                    <img
                                      src={imageUrl}
                                      alt={product.nombre}
                                      className="w-full h-full object-contain bg-white"
                                      onError={() =>
                                        handleImageError(product.id)
                                      }
                                      loading="lazy"
                                    />
                                  ) : (
                                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <p className="font-medium truncate">
                                      {product.nombre}
                                    </p>
                                    {product.sinStock && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs flex-shrink-0"
                                      >
                                        <PackageX className="w-3 h-3 mr-1" />
                                        Sin Stock
                                      </Badge>
                                    )}
                                    {product.codigoBarras && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs font-mono flex-shrink-0"
                                      >
                                        {product.codigoBarras}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Bs. {product.precio.toFixed(2)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Disponibilidad: {displayStock(product)}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => addToCart(product)}
                                disabled={
                                  !isProductAvailable(product) ||
                                  !isCashRegisterOpen
                                }
                                className="flex-shrink-0 ml-2"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Agregar
                              </Button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-center text-muted-foreground py-4">
                          {searchTerm
                            ? "No se encontraron productos"
                            : "No hay productos disponibles"}
                        </p>
                      )}
                    </div>

                    <div className="md:hidden">
                      {searchTerm.trim() !== "" ? (
                        filteredProducts.length > 0 ? (
                          filteredProducts.map((product) => {
                            const imageUrl = getProductImageUrl(
                              product.imagen || null
                            );
                            const hasError = imageErrors[product.id];
                            const showImage = imageUrl && !hasError;

                            return (
                              <div
                                key={product.id}
                                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg mb-3 gap-3"
                              >
                                <div className="flex items-center gap-4 flex-1 w-full">
                                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border">
                                    {showImage ? (
                                      <img
                                        src={imageUrl}
                                        alt={product.nombre}
                                        className="w-full h-full object-contain bg-white"
                                        onError={() =>
                                          handleImageError(product.id)
                                        }
                                        loading="lazy"
                                      />
                                    ) : (
                                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <p className="font-medium">
                                        {product.nombre}
                                      </p>
                                      {product.sinStock && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          <PackageX className="w-3 h-3 mr-1" />
                                          Sin Stock
                                        </Badge>
                                      )}
                                      {product.codigoBarras && (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs font-mono"
                                        >
                                          {product.codigoBarras}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Bs. {product.precio.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Disponibilidad: {displayStock(product)}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => addToCart(product)}
                                  disabled={
                                    !isProductAvailable(product) ||
                                    !isCashRegisterOpen
                                  }
                                  className="w-full sm:w-auto"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Agregar
                                </Button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8">
                            <Search className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-muted-foreground">
                              No se encontraron productos
                            </p>
                          </div>
                        )
                      ) : (
                        <div className="text-center py-12">
                          <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                          <p className="text-muted-foreground">
                            Busca productos por nombre o escanea su código de
                            barras
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={!isCashRegisterOpen ? "opacity-70" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Carrito de Compras
              {!isCashRegisterOpen && <Lock className="w-4 h-4" />}
            </CardTitle>
            <CardDescription>
              {isCashRegisterOpen
                ? "Productos seleccionados para la venta"
                : "La caja está cerrada. No se pueden realizar ventas."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                El carrito está vacío
              </p>
            ) : (
              <>
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1 w-full">
                        {(() => {
                          const imageUrl = getProductImageUrl(
                            item.product.imagen || null
                          );
                          const hasError = imageErrors[item.product.id];
                          const showImage = imageUrl && !hasError;

                          return (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border">
                              {showImage ? (
                                <img
                                  src={imageUrl}
                                  alt={item.product.nombre}
                                  className="w-full h-full object-contain bg-white"
                                  onError={() =>
                                    handleImageError(item.product.id)
                                  }
                                  loading="lazy"
                                />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          );
                        })()}

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-medium">{item.product.nombre}</p>
                            {item.product.sinStock && (
                              <Badge variant="outline" className="text-xs">
                                <PackageX className="w-3 h-3 mr-1" />
                                Sin Stock
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Bs. {item.product.precio.toFixed(2)} x{" "}
                            {item.quantity}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity - 1
                              )
                            }
                            disabled={!isCashRegisterOpen}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity + 1
                              )
                            }
                            disabled={!isCashRegisterOpen}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFromCart(item.product.id)}
                          disabled={!isCashRegisterOpen}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    Cupón de descuento
                  </Label>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium text-sm font-mono">
                            {appliedCoupon.codigo}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {appliedCoupon.tipo === "porcentaje"
                              ? `${appliedCoupon.valor}% de descuento`
                              : `Bs. ${appliedCoupon.valor} de descuento`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveCoupon}
                        disabled={!isCashRegisterOpen}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ingresa el código"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            setCouponError(null);
                          }}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleApplyCoupon()
                          }
                          disabled={!isCashRegisterOpen || isValidatingCoupon}
                          className="font-mono"
                        />
                        <Button
                          variant="outline"
                          onClick={handleApplyCoupon}
                          disabled={
                            !isCashRegisterOpen ||
                            !couponCode.trim() ||
                            isValidatingCoupon
                          }
                        >
                          {isValidatingCoupon ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Aplicar"
                          )}
                        </Button>
                      </div>
                      {couponError && (
                        <p className="text-xs text-destructive">
                          {couponError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {!appliedCoupon && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="discount">Descuento manual (Bs.)</Label>
                      <Input
                        id="discount"
                        type="text"
                        min="0"
                        step="0.01"
                        value={discount || ""}
                        onChange={(e) => handleDiscountChange(e.target.value)}
                        placeholder="0.00"
                        disabled={!isCashRegisterOpen}
                      />
                    </div>

                    {showDiscountField && (
                      <div>
                        <Label htmlFor="discountReason">
                          Justificación del descuento *
                        </Label>
                        <Textarea
                          id="discountReason"
                          value={discountReason}
                          onChange={(e) => setDiscountReason(e.target.value)}
                          placeholder="Explique el motivo del descuento..."
                          rows={3}
                          disabled={!isCashRegisterOpen}
                        />
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Bs. {getSubtotal().toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>
                        Descuento
                        {appliedCoupon && (
                          <span className="text-xs ml-1">
                            ({appliedCoupon.codigo})
                          </span>
                        )}
                        :
                      </span>
                      <span>-Bs. {discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>Bs. {getTotal().toFixed(2)}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Forma de pago</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* ✅ CAMBIO: sin selección por defecto */}
                    <Button
                      type="button"
                      variant={
                        paymentMethod?.type === "efectivo"
                          ? "default"
                          : "outline"
                      }
                      onClick={() => handlePaymentMethodChange("efectivo")}
                      className="flex flex-col gap-1 h-auto p-3"
                      disabled={!isCashRegisterOpen}
                    >
                      <Banknote size={20} />
                      <span className="text-xs">Efectivo</span>
                    </Button>
                    <Button
                      type="button"
                      variant={
                        paymentMethod?.type === "qr" ? "default" : "outline"
                      }
                      onClick={() => handlePaymentMethodChange("qr")}
                      className="flex flex-col gap-1 h-auto p-3"
                      disabled={!isCashRegisterOpen}
                    >
                      <QrCode size={20} />
                      <span className="text-xs">QR</span>
                    </Button>
                    <Button
                      type="button"
                      variant={
                        paymentMethod?.type === "mixto" ? "default" : "outline"
                      }
                      onClick={() => handlePaymentMethodChange("mixto")}
                      className="flex flex-col gap-1 h-auto p-3"
                      disabled={!isCashRegisterOpen}
                    >
                      <CreditCard size={20} />
                      <span className="text-xs">Mixto</span>
                    </Button>
                  </div>

                  {paymentMethod?.type === "mixto" && (
                    <div className="space-y-2">
                      <div className="space-y-2">
                        <Label htmlFor="cashAmount">Monto en Efectivo</Label>
                        <Input
                          id="cashAmount"
                          type="text"
                          value={paymentMethod.efectivo || ""}
                          onChange={(e) =>
                            handleMixedPaymentChange(
                              "efectivo",
                              e.target.value
                            )
                          }
                          placeholder="0.00"
                          disabled={!isCashRegisterOpen}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="qrAmount">Monto QR</Label>
                        <Input
                          id="qrAmount"
                          type="text"
                          value={paymentMethod.qr || ""}
                          onChange={(e) =>
                            handleMixedPaymentChange("qr", e.target.value)
                          }
                          placeholder="0.00"
                          disabled={!isCashRegisterOpen}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full"
                      size="lg"
                      disabled={isProcessing || !isCashRegisterOpen || !paymentMethod}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Procesar Venta
                        </>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmar Venta</DialogTitle>
                      <DialogDescription>
                        ¿Confirmar venta por Bs. {getTotal().toFixed(2)}?
                        {appliedCoupon && (
                          <span className="block mt-2 text-xs text-green-600">
                            Cupón aplicado: {appliedCoupon.codigo} (-Bs.{" "}
                            {discount.toFixed(2)})
                          </span>
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 pt-4">
                      <DialogTrigger asChild>
                        <Button variant="outline">Cancelar</Button>
                      </DialogTrigger>
                      <Button
                        onClick={processSaleHandler}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          "Confirmar Venta"
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}