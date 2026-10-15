// src/pages/admin/Tienda.tsx
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Gift,
  Star,
  Sparkles,
  Eye,
  Loader2,
  PackageX,
  Image as ImageIcon,
  Package,
  Trash2,
  ArrowRight,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getProductosLanding,
  type TiendaProducto,
} from "@/api/PlanesApi";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function Tienda() {
  const { toast } = useToast();
  const [productos, setProductos] = useState<TiendaProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [carrito, setCarrito] = useState<TiendaProducto[]>([]);
  const [showCarrito, setShowCarrito] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<TiendaProducto | null>(
    null
  );
  const [showProductModal, setShowProductModal] = useState(false);
  const [verTodos, setVerTodos] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [isMobile, setIsMobile] = useState(false);

  const carruselRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // ============================================
  // DETECTAR MÓVIL
  // ============================================
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ============================================
  // CARGA DE PRODUCTOS DEL LANDING
  // ============================================
  useEffect(() => {
    loadProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProductos = async () => {
    try {
      setLoading(true);
      const data = await getProductosLanding();
      setProductos(data);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los productos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // AUTO-SCROLL (SOLO EN DESKTOP)
  // ============================================
  useEffect(() => {
    if (isMobile) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (!verTodos && productos.length > 0) {
      intervalRef.current = setInterval(() => {
        if (!isDragging.current) {
          setCurrentIndex((prev) => {
            const nextIndex = (prev + 1) % productos.length;
            scrollToIndex(nextIndex);
            return nextIndex;
          });
        }
      }, 4000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [productos.length, verTodos, isMobile]);

  const scrollToIndex = (index: number) => {
    const carrusel = carruselRef.current;
    if (!carrusel) return;

    const card = carrusel.children[index] as HTMLElement;
    if (!card) return;

    const carruselWidth = carrusel.offsetWidth;
    const cardWidth = card.offsetWidth;
    const scrollPosition = card.offsetLeft - (carruselWidth - cardWidth) / 2;

    carrusel.scrollTo({
      left: Math.max(0, scrollPosition),
      behavior: "smooth",
    });
  };

  const pauseAutoScroll = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resumeAutoScroll = () => {
    if (isMobile) return;
    if (!intervalRef.current && !verTodos && productos.length > 0) {
      intervalRef.current = setInterval(() => {
        if (!isDragging.current) {
          setCurrentIndex((prev) => {
            const nextIndex = (prev + 1) % productos.length;
            scrollToIndex(nextIndex);
            return nextIndex;
          });
        }
      }, 4000);
    }
  };

  const scrollPrev = () => {
    pauseAutoScroll();
    const prev = (currentIndex - 1 + productos.length) % productos.length;
    setCurrentIndex(prev);
    scrollToIndex(prev);
    if (!isMobile) setTimeout(resumeAutoScroll, 3000);
  };

  const scrollNext = () => {
    pauseAutoScroll();
    const next = (currentIndex + 1) % productos.length;
    setCurrentIndex(next);
    scrollToIndex(next);
    if (!isMobile) setTimeout(resumeAutoScroll, 3000);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const carrusel = carruselRef.current;
    if (!carrusel || verTodos) return;

    isDragging.current = true;
    startX.current = e.pageX - carrusel.offsetLeft;
    scrollLeft.current = carrusel.scrollLeft;
    pauseAutoScroll();
    carrusel.style.cursor = "grabbing";
    carrusel.style.userSelect = "none";
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || verTodos) return;
    const carrusel = carruselRef.current;
    if (!carrusel) return;

    e.preventDefault();
    const x = e.pageX - carrusel.offsetLeft;
    const walk = (x - startX.current) * 2;
    carrusel.scrollLeft = scrollLeft.current - walk;
  };

  const handleMouseUp = () => {
    if (!verTodos) {
      isDragging.current = false;
      const carrusel = carruselRef.current;
      if (carrusel) {
        carrusel.style.cursor = "grab";
        carrusel.style.removeProperty("user-select");
      }
      if (!isMobile) setTimeout(resumeAutoScroll, 3000);
    }
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    if (isDragging.current) handleMouseUp();
    if (!verTodos) resumeAutoScroll();
  };

  // ============================================
  // CARRITO
  // ============================================
  const agregarAlCarrito = (producto: TiendaProducto) => {
    setCarrito([...carrito, producto]);
    toast({
      title: "Agregado al carrito",
      description: `${producto.nombre} se agregó correctamente`,
    });
  };

  const eliminarDelCarrito = (productoId: number) => {
    setCarrito(carrito.filter((item) => item.id !== productoId));
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + item.precio, 0);

  const enviarPedidoWhatsApp = () => {
    if (carrito.length === 0) return;

    let mensaje = "*PEDIDO ENERFIT STORE*\n\n";
    mensaje += "Hola! Me gustaria realizar el siguiente pedido:\n\n";
    mensaje += "*PRODUCTOS:*\n";

    carrito.forEach((item, index) => {
      mensaje += `${index + 1}. ${item.nombre} - Bs. ${item.precio.toFixed(
        2
      )}\n`;
    });

    mensaje += `\n*TOTAL:* Bs. ${totalCarrito.toFixed(2)}\n\n`;
    mensaje += "Gracias!";

    const mensajeEncoded = encodeURIComponent(mensaje);
    window.open(`https://wa.me/59167461937?text=${mensajeEncoded}`, "_blank");

    setCarrito([]);
    setShowCarrito(false);
  };

  const formatearPrecio = (precio: number) => `Bs. ${precio.toFixed(2)}`;

  const handleImageError = (id: number) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  // ============================================
  // LOADING
  // ============================================
  if (loading) {
    return (
      <section className="py-12 bg-gradient-to-b from-secondary to-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Cargando tienda...</p>
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

      <div className="container mx-auto px-3 sm:px-4 relative z-10">
        {/* ============ HEADER ============ */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-primary text-xs font-semibold tracking-wide">
              EQUIPAMIENTO PREMIUM
            </span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
              <ShoppingBag className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight">
              ENERFIT{" "}
              <span className="bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent">
                STORE
              </span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            Equípate con lo mejor para tu entrenamiento
          </p>
        </div>

        {/* ============ CARRITO FLOTANTE ============ */}
        <button
          onClick={() => setShowCarrito(true)}
          className="fixed bottom-6 right-6 z-40 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 shadow-[0_0_30px_rgba(250,204,21,0.4)] hover:scale-110 transition-all duration-300"
          aria-label="Ver carrito"
        >
          <div className="relative">
            <ShoppingCart className="h-6 w-6" />
            {carrito.length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
              >
                {carrito.length}
              </motion.span>
            )}
          </div>
        </button>

        {/* ============ SIN PRODUCTOS ============ */}
        {productos.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4 border border-border">
              <PackageX className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-lg mb-2">
              No hay productos disponibles
            </p>
            <p className="text-muted-foreground/70 text-sm">
              Vuelve a intentarlo más tarde
            </p>
          </div>
        ) : (
          <div>
            {/* ============ HEADER PRODUCTOS ============ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                  {verTodos ? (
                    <>
                      <Package className="h-5 w-5 text-primary" />
                      Todos los Productos
                    </>
                  ) : (
                    <>
                      <Gift className="h-5 w-5 text-primary" />
                      Productos Destacados
                    </>
                  )}
                </h2>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                  {verTodos
                    ? `${productos.length} productos disponibles`
                    : isMobile
                      ? "Desliza para explorar"
                      : "Usa las flechas o desliza para explorar"}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setVerTodos(!verTodos)}
                className="border-border text-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 gap-2 self-start sm:self-auto"
              >
                {verTodos ? "Ver menos" : "Ver todos"}
                <Eye className="h-4 w-4" />
              </Button>
            </div>

            {/* ============ VISTA GRID (VER TODOS) ============ */}
            {verTodos ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {productos.map((producto) => (
                  <ProductCard
                    key={producto.id}
                    producto={producto}
                    onAgregar={agregarAlCarrito}
                    onVerDetalle={() => {
                      setSelectedProduct(producto);
                      setShowProductModal(true);
                    }}
                    hasImageError={imageErrors[producto.id]}
                    onImageError={() => handleImageError(producto.id)}
                  />
                ))}
              </div>
            ) : (
              /* ============ VISTA CARRUSEL ============ */
              <div className="relative">
                {/* Flecha Izquierda (desktop) */}
                {productos.length > 1 && (
                  <button
                    onClick={scrollPrev}
                    className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-20 w-11 h-11 rounded-full bg-card/90 border border-border hover:border-primary/50 hover:bg-secondary items-center justify-center text-muted-foreground hover:text-primary transition-all shadow-xl"
                    aria-label="Producto anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}

                {/* Flecha Derecha (desktop) */}
                {productos.length > 1 && (
                  <button
                    onClick={scrollNext}
                    className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-20 w-11 h-11 rounded-full bg-card/90 border border-border hover:border-primary/50 hover:bg-secondary items-center justify-center text-muted-foreground hover:text-primary transition-all shadow-xl"
                    aria-label="Siguiente producto"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}

                <div
                  ref={carruselRef}
                  className="flex gap-2 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide pt-2 cursor-grab snap-x snap-mandatory md:snap-none"
                  onMouseEnter={() => !isMobile && pauseAutoScroll()}
                  onMouseLeave={handleMouseLeave}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onTouchStart={pauseAutoScroll}
                  onScroll={() => {
                    const carrusel = carruselRef.current;
                    if (!carrusel || verTodos) return;

                    const cards = Array.from(
                      carrusel.children
                    ) as HTMLElement[];
                    const center =
                      carrusel.scrollLeft + carrusel.offsetWidth / 2;

                    let closestIndex = 0;
                    let closestDistance = Infinity;

                    cards.forEach((card, index) => {
                      const cardCenter =
                        card.offsetLeft + card.offsetWidth / 2;
                      const distance = Math.abs(cardCenter - center);
                      if (distance < closestDistance) {
                        closestDistance = distance;
                        closestIndex = index;
                      }
                    });

                    setCurrentIndex(closestIndex);
                  }}
                >
                  {productos.map((producto) => (
                    <div
                      key={producto.id}
                      className="w-[calc(50%-4px)] sm:w-[calc(50%-8px)] md:w-64 flex-shrink-0 snap-start md:snap-center"
                    >
                      <ProductCard
                        producto={producto}
                        onAgregar={agregarAlCarrito}
                        onVerDetalle={() => {
                          setSelectedProduct(producto);
                          setShowProductModal(true);
                        }}
                        hasImageError={imageErrors[producto.id]}
                        onImageError={() => handleImageError(producto.id)}
                      />
                    </div>
                  ))}
                </div>

                {/* Indicadores */}
                {productos.length > 1 && (
                  <div className="flex justify-center items-center mt-4 gap-1.5">
                    {productos.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          pauseAutoScroll();
                          setCurrentIndex(index);
                          scrollToIndex(index);
                          if (!isMobile) setTimeout(resumeAutoScroll, 3000);
                        }}
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-300",
                          index === currentIndex
                            ? "w-8 bg-primary shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                            : "w-1.5 bg-muted hover:bg-muted-foreground"
                        )}
                        aria-label={`Ir al producto ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============ MODAL CARRITO ============ */}
      <Dialog open={showCarrito} onOpenChange={setShowCarrito}>
        <DialogContent className="bg-card border-border max-w-[92vw] sm:max-w-md p-5 sm:p-6">
          <div className="h-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary -mt-5 -mx-5 mb-4 sm:-mt-6 sm:-mx-6 sm:mb-5" />
          <DialogHeader className="space-y-0">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl text-foreground">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <ShoppingCart className="h-4 w-4 text-primary" />
              </div>
              Tu Carrito
              {carrito.length > 0 && (
                <Badge className="bg-primary/20 text-primary border-primary/30 ml-auto">
                  {carrito.length}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1 -mr-1">
            {carrito.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3 border border-border">
                  <ShoppingCart className="h-8 w-8 opacity-50" />
                </div>
                <p className="font-medium">Tu carrito está vacío</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Agrega productos para comenzar
                </p>
              </div>
            ) : (
              <>
                {carrito.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    {item.imagen && !imageErrors[item.id] ? (
                      <img
                        src={item.imagen}
                        alt={item.nombre}
                        className="w-12 h-12 rounded-lg object-contain bg-white flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {item.nombre}
                      </p>
                      <p className="text-primary text-sm font-bold">
                        {formatearPrecio(item.precio)}
                      </p>
                    </div>
                    <button
                      onClick={() => eliminarDelCarrito(item.id)}
                      className="text-destructive hover:text-destructive/80 p-1.5 rounded-md hover:bg-destructive/10 transition-colors flex-shrink-0"
                      aria-label="Eliminar del carrito"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <div className="border-t border-border pt-4 mt-4">
                  <div className="flex justify-between items-center mb-4 p-3 bg-input/30 rounded-lg border border-border">
                    <span className="font-semibold text-foreground">Total:</span>
                    <span className="font-black text-primary text-xl sm:text-2xl">
                      {formatearPrecio(totalCarrito)}
                    </span>
                  </div>

                  <Button
                    onClick={enviarPedidoWhatsApp}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-12 text-base font-bold rounded-lg shadow-lg hover:shadow-primary/30 transition-all"
                  >
                    <FaWhatsapp className="h-5 w-5" />
                    Enviar Pedido por WhatsApp
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ MODAL DETALLE PRODUCTO ============ */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="bg-card border-border max-w-[92vw] sm:max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <div className="h-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary -mt-5 -mx-5 mb-4 sm:-mt-6 sm:-mx-6 sm:mb-5" />
              <DialogHeader className="space-y-0">
                <DialogTitle className="text-lg sm:text-xl text-foreground flex items-center gap-2">
                  {selectedProduct.destacado && (
                    <Star className="h-4 w-4 text-primary fill-current" />
                  )}
                  {selectedProduct.nombre}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Imagen */}
                {selectedProduct.imagen && !imageErrors[selectedProduct.id] ? (
                  <div className="relative rounded-xl overflow-hidden bg-white border border-border">
                    <img
                      src={selectedProduct.imagen}
                      alt={selectedProduct.nombre}
                      className="w-full h-56 sm:h-64 object-contain"
                      onError={() => handleImageError(selectedProduct.id)}
                    />
                    {selectedProduct.destacado && (
                      <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-bold">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Destacado
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-56 sm:h-64 rounded-xl bg-secondary flex items-center justify-center border border-border">
                    <ImageIcon className="h-16 w-16 text-muted-foreground/50" />
                  </div>
                )}

                {/* Categoría + Precio */}
                <div className="flex items-center justify-between gap-3">
                  <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1">
                    {selectedProduct.categoria}
                  </Badge>
                  <span className="text-2xl sm:text-3xl font-black text-primary">
                    {formatearPrecio(selectedProduct.precio)}
                  </span>
                </div>

                {/* Descripción */}
                <div className="bg-secondary/40 rounded-lg p-3 border border-border">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-foreground text-sm leading-relaxed">
                      {selectedProduct.descripcion || "Sin descripción"}
                    </p>
                  </div>
                </div>

                {/* Stock */}
                {selectedProduct.stock > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                    <span className="text-sm text-muted-foreground">
                      Stock disponible
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {selectedProduct.stock} unidades
                    </span>
                  </div>
                )}

                {/* Botón agregar */}
                <Button
                  onClick={() => {
                    agregarAlCarrito(selectedProduct);
                    setShowProductModal(false);
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 h-12 text-base rounded-lg shadow-lg hover:shadow-primary/30 transition-all"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Agregar al Carrito
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
      `}</style>
    </section>
  );
}

// ============================================
// COMPONENTE: ProductCard
// ============================================
interface ProductCardProps {
  producto: TiendaProducto;
  onAgregar: (producto: TiendaProducto) => void;
  onVerDetalle: () => void;
  hasImageError: boolean;
  onImageError: () => void;
}

function ProductCard({
  producto,
  onAgregar,
  onVerDetalle,
  hasImageError,
  onImageError,
}: ProductCardProps) {
  const formatearPrecio = (precio: number) => `Bs. ${precio.toFixed(2)}`;
  const sinStock = producto.stock !== undefined && producto.stock <= 0;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="bg-secondary/50 border-border hover:border-primary/30 transition-all duration-300 h-full flex flex-col overflow-hidden group relative">
        {/* Imagen */}
        <div
          className="relative aspect-square overflow-hidden cursor-pointer bg-white"
          onClick={onVerDetalle}
        >
          {producto.imagen && !hasImageError ? (
            <img
              src={producto.imagen}
              alt={producto.nombre}
              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
              onError={onImageError}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <ImageIcon className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
            </div>
          )}

          {/* Badge Destacado */}
          {producto.destacado && (
            <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
              <Badge className="bg-primary text-primary-foreground text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 shadow-lg">
                <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 fill-current" />
                <span className="hidden sm:inline">Destacado</span>
                <span className="sm:hidden">Top</span>
              </Badge>
            </div>
          )}

          {/* Badge Sin Stock */}
          {sinStock && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
              <Badge className="bg-destructive text-destructive-foreground text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1">
                SIN STOCK
              </Badge>
            </div>
          )}

          {/* Overlay hover */}
          <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors duration-300 flex items-center justify-center pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-background/70 text-foreground text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Ver detalle
            </div>
          </div>
        </div>

        <CardContent className="p-2.5 sm:p-4 flex-1 flex flex-col">
          {/* Nombre */}
          <h3 className="font-bold text-foreground mb-1 line-clamp-1 text-xs sm:text-base">
            {producto.nombre}
          </h3>

          {/* Descripción */}
          <p className="text-muted-foreground text-[10px] sm:text-sm mb-1.5 sm:mb-2 line-clamp-2 leading-relaxed hidden sm:block">
            {producto.descripcion || "Sin descripción"}
          </p>

          {/* Categoría */}
          <Badge
            variant="outline"
            className="w-fit mb-2 sm:mb-3 text-[9px] sm:text-[10px] border-border text-muted-foreground px-1.5 sm:px-2"
          >
            {producto.categoria}
          </Badge>

          {/* Precio + Botón */}
          <div className="flex items-center justify-between mt-auto pt-1.5 sm:pt-2 gap-1.5 sm:gap-2">
            <span className="text-primary font-black text-xs sm:text-lg">
              {formatearPrecio(producto.precio)}
            </span>
            <Button
              size="sm"
              onClick={() => onAgregar(producto)}
              disabled={sinStock}
              className={cn(
                "font-bold gap-1 h-7 sm:h-9 px-2 sm:px-3 text-[10px] sm:text-xs rounded-lg transition-all",
                sinStock
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary hover:bg-primary/80 text-primary-foreground shadow-md hover:shadow-primary/30"
              )}
            >
              <ShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">
                {sinStock ? "Sin stock" : "Agregar"}
              </span>
              <span className="sm:hidden">
                {sinStock ? "N/A" : "+"}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default Tienda;