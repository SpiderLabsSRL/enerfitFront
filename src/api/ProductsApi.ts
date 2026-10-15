import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ============================================
// TIPOS BACKEND
// ============================================
interface BackendStockInfo {
  sucursal_id: number;
  stock: number | null;
  stock_minimo?: number | null;
}

interface BackendProduct {
  idproducto: number;
  nombre: string;
  descripcion?: string | null;
  precio_venta: string;
  precio_compra?: string | null;
  codigo?: string | null;
  imagen?: string | null;
  landing?: boolean;
  estado: number;
  stock_info?: BackendStockInfo[]; // 👈 viene del JOIN
}

// ============================================
// TIPOS FRONTEND
// ============================================
export interface Product {
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

export interface ProductRequest {
  nombre: string;
  precioVenta: number;
  precioCompra?: number;
  codigoBarras?: string;
  stockMinimoPorSucursal?: { [sucursalId: string]: number | null };
  sucursales: string[];
  stockPorSucursal: { [sucursalId: string]: number | null };
  sinStock: boolean;
  imagen?: string;
  mostrarEnLanding?: boolean;
}

interface StockUpdateRequest {
  productoId: string;
  sucursalId: string;
  cantidad: number;
}

// ============================================
// AXIOS INSTANCE
// ============================================
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token =
      sessionStorage.getItem("token") || localStorage.getItem("token");
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("⚠️ Sesión expirada o no autorizada");
    }
    return Promise.reject(error);
  }
);

// ============================================
// MAPPER (SIN LLAMADAS HTTP)
// ============================================
const mapBackendToProduct = (product: BackendProduct): Product => {
  const stockPorSucursal: { [sucursalId: string]: number | null } = {};
  const stockMinimoPorSucursal: { [sucursalId: string]: number | null } = {};
  const sucursales: string[] = [];

  (product.stock_info || []).forEach((item) => {
    const sid = item.sucursal_id.toString();
    stockPorSucursal[sid] = item.stock;
    stockMinimoPorSucursal[sid] = item.stock_minimo ?? null;
    sucursales.push(sid);
  });

  const sinStock =
    sucursales.length === 0 ||
    Object.values(stockPorSucursal).every((s) => s === null);

  return {
    id: product.idproducto.toString(),
    nombre: product.nombre,
    precioVenta: parseFloat(product.precio_venta),
    precioCompra: product.precio_compra ? parseFloat(product.precio_compra) : null,
    codigoBarras: product.codigo || null,
    stockMinimoPorSucursal,
    stockPorSucursal,
    sucursales,
    activo: product.estado === 1,
    sinStock,
    imagen: product.imagen || null,
    mostrarEnLanding: product.landing || false,
  };
};

// ============================================
// GET PRODUCTS (1 SOLA LLAMADA HTTP)
// ============================================
export const getProducts = async (sucursalId?: string): Promise<Product[]> => {
  try {
    const url = sucursalId
      ? `/products/products?sucursal=${sucursalId}`
      : "/products/products";

    const response = await api.get<BackendProduct[]>(url);
    return response.data.map(mapBackendToProduct);
  } catch (error) {
    console.error("Error fetching products:", error);
    throw new Error("No se pudieron cargar los productos");
  }
};

// ============================================
// CREATE PRODUCT
// ============================================
export const createProduct = async (
  product: ProductRequest
): Promise<Product> => {
  try {
    const response = await api.post<BackendProduct>("/products/products", {
      nombre: product.nombre,
      precio_venta: product.precioVenta.toString(),
      precio_compra: product.precioCompra?.toString(),
      codigo: product.codigoBarras,
      sucursales: product.sucursales,
      stock_por_sucursal: product.stockPorSucursal,
      stock_minimo_por_sucursal: product.stockMinimoPorSucursal,
      sin_stock: product.sinStock,
      imagen: product.imagen,
      landing: product.mostrarEnLanding,
    });

    return mapBackendToProduct(response.data);
  } catch (error) {
    console.error("Error creating product:", error);
    throw new Error("No se pudo crear el producto");
  }
};

// ============================================
// UPDATE PRODUCT
// ============================================
export const updateProduct = async (
  id: string,
  product: ProductRequest
): Promise<Product> => {
  try {
    const response = await api.put<BackendProduct>(`/products/products/${id}`, {
      nombre: product.nombre,
      precio_venta: product.precioVenta.toString(),
      precio_compra: product.precioCompra?.toString(),
      codigo: product.codigoBarras,
      sucursales: product.sucursales,
      stock_por_sucursal: product.stockPorSucursal,
      stock_minimo_por_sucursal: product.stockMinimoPorSucursal,
      sin_stock: product.sinStock,
      imagen: product.imagen,
      landing: product.mostrarEnLanding,
    });

    return mapBackendToProduct(response.data);
  } catch (error) {
    console.error("Error updating product:", error);
    throw new Error("No se pudo actualizar el producto");
  }
};

// ============================================
// DELETE PRODUCT
// ============================================
export const deleteProduct = async (id: string): Promise<void> => {
  try {
    await api.delete(`/products/products/${id}`);
  } catch (error) {
    console.error("Error deleting product:", error);
    throw new Error("No se pudo eliminar el producto");
  }
};

// ============================================
// TOGGLE PRODUCT STATUS
// ============================================
export const toggleProductStatus = async (id: string): Promise<Product> => {
  try {
    const response = await api.patch<BackendProduct>(
      `/products/products/${id}/update-status`
    );
    return mapBackendToProduct(response.data);
  } catch (error) {
    console.error("Error toggling product status:", error);
    throw new Error("No se pudo cambiar el estado del producto");
  }
};

// ============================================
// TOGGLE PRODUCT LANDING
// ============================================
export const toggleProductLanding = async (id: string): Promise<Product> => {
  try {
    const response = await api.patch<BackendProduct>(
      `/products/products/${id}/toggle-landing`
    );
    return mapBackendToProduct(response.data);
  } catch (error) {
    console.error("Error toggling product landing:", error);
    throw new Error("No se pudo cambiar el estado en Landing");
  }
};

// ============================================
// ADD STOCK
// ============================================
export const addStock = async (
  request: StockUpdateRequest
): Promise<{ stockNuevo: number } | void> => {
  try {
    const res = await api.post(
      `/products/products/${request.productoId}/add-stock`,
      {
        sucursal_id: request.sucursalId,
        cantidad: request.cantidad,
      }
    );
    return res.data;
  } catch (error) {
    console.error("Error adding stock:", error);
    throw new Error("No se pudo agregar el stock");
  }
};

// ============================================
// GET SUCURSALES
// ============================================
export const getSucursales = async (): Promise<
  { id: string; name: string }[]
> => {
  try {
    const response = await api.get<{ id: number; nombre: string }[]>(
      "/products/sucursales"
    );
    return response.data.map((sucursal) => ({
      id: sucursal.id.toString(),
      name: sucursal.nombre,
    }));
  } catch (error) {
    console.error("Error fetching sucursales:", error);
    throw new Error("No se pudieron cargar las sucursales");
  }
};