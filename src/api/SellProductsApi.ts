// src/api/SellProductsApi.ts
import axios from "axios";
import { getStoredUserData } from "./loginapi";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendProduct {
  idproducto: number;
  nombre: string;
  precio_venta: string;
  stock: number | null;
  sin_stock: boolean;
  imagen?: string | null;
  codigo_barras?: string | null;
}

export interface Product {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  sinStock: boolean;
  imagen?: string | null;
  codigoBarras?: string | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface PaymentMethod {
  type: "efectivo" | "qr" | "mixto";
  efectivo?: number;
  qr?: number;
}

export interface SaleRequest {
  productos: Array<{
    producto_id: number;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
  subtotal: number;
  descuento: number;
  descripcion_descuento: string;
  total: number;
  forma_pago: "efectivo" | "qr" | "mixto";
  detalle_pago: string;
  monto_efectivo: number;
  monto_qr: number;
  cupon_codigo?: string;
}

export interface SaleResponse {
  idventa: number;
  mensaje: string;
}

export interface CashRegisterStatus {
  estado_caja_id: number | null;
  caja_id: number;
  estado: "abierta" | "cerrada";
  monto_inicial: number;
  monto_final: number;
  usuario_id: number;
  nombre_caja?: string;
}

// ✅ Tipo para cupón validado
export interface ValidatedCoupon {
  id: string;
  codigo: string;
  tipo: "porcentaje" | "monto_fijo";
  valor: number;
  descripcion: string;
  fechaInicio: string;
  fechaExpiracion: string;
  usosMaximos: number;
  usosActuales: number;
  aplicableA: ("servicios" | "productos")[];
}

const api = axios.create({
  baseURL: `${API_URL}/sell-products`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const getUserId = (): number => {
  const userData = getStoredUserData();
  if (!userData) {
    throw new Error(
      "No se encontraron datos de usuario. Por favor, inicie sesión nuevamente."
    );
  }
  return userData.idusuario;
};

// ============================================
// GET PRODUCTS
// ============================================
export const getProducts = async (): Promise<Product[]> => {
  try {
    const userId = getUserId();
    const response = await api.get<BackendProduct[]>(
      `/products?userId=${userId}`
    );

    return response.data.map((product) => {
      const stockValue = product.sin_stock ? 9999 : product.stock || 0;

      return {
        id: product.idproducto.toString(),
        nombre: product.nombre,
        precio: parseFloat(product.precio_venta),
        stock: stockValue,
        sinStock: product.sin_stock,
        imagen: product.imagen || null,
        codigoBarras: product.codigo_barras || null,
      };
    });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    if (error.message) throw new Error(error.message);
    throw new Error("No se pudieron cargar los productos");
  }
};

// ============================================
// GET CASH REGISTER STATUS
// ============================================
export const getCashRegisterStatus = async (
  userId: number
): Promise<CashRegisterStatus> => {
  try {
    const response = await api.get<CashRegisterStatus>(
      `/cash-register-status?userId=${userId}`
    );
    return response.data;
  } catch (error: any) {
    console.error("Error fetching cash register status:", error);
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    if (error.message) throw new Error(error.message);
    throw new Error("No se pudo obtener el estado de la caja");
  }
};

// ============================================
// ✅ VALIDATE COUPON
// ============================================
export const validateCoupon = async (
  codigo: string
): Promise<ValidatedCoupon> => {
  try {
    const userId = getUserId();
    const response = await api.get<ValidatedCoupon>(
      `/validate-coupon?userId=${userId}&codigo=${encodeURIComponent(codigo)}`
    );
    return response.data;
  } catch (error: any) {
    console.error("Error validating coupon:", error);
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    if (error.message) throw new Error(error.message);
    throw new Error("No se pudo validar el cupón");
  }
};

// ============================================
// PROCESS SALE
// ============================================
export const processSale = async (
  saleData: SaleRequest
): Promise<SaleResponse> => {
  try {
    const userId = getUserId();
    const response = await api.post<SaleResponse>(
      `/process-sale?userId=${userId}`,
      saleData
    );
    return response.data;
  } catch (error: any) {
    console.error("Error processing sale:", error);
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    if (error.message) throw new Error(error.message);
    throw new Error("No se pudo procesar la venta");
  }
};