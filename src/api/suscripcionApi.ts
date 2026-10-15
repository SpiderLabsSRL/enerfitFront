// src/api/suscripcionApi.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Crear instancia de axios con timeout
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 segundos de timeout
  headers: {
    "Content-Type": "application/json",
  },
});

export interface SuscripcionStatus {
  pagado: boolean;
}

export const checkSuscripcion = async (): Promise<SuscripcionStatus> => {
  const response = await apiClient.get<SuscripcionStatus>(
    "/suscripcion/estado",
  );
  return response.data;
};
