import { useEffect, useRef, useState } from 'react';
import { AccessLog, getAccessLogs } from '@/api/AccessApi';

/**
 * Hook que simula "tiempo real" haciendo polling al backend
 * cada INTERVAL_MS milisegundos para traer los nuevos registros de acceso.
 *
 * Reemplaza la versión anterior basada en Supabase Realtime.
 */
const INTERVAL_MS = 5000; // 5 segundos

export function useRealtimeAccessLogs(branchId?: number) {
  const [newLogs, setNewLogs] = useState<AccessLog[]>([]);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    if (!branchId) return;

    let isCancelled = false;

    const fetchLogs = async () => {
      try {
        const logs = await getAccessLogs({
          typeFilter: 'all',
          limit: 50,
          branchId,
        });

        if (isCancelled) return;

        // En la primera carga, guardamos los IDs existentes para no
        // marcarlos todos como "nuevos" (evita el badge con 50 al inicio).
        if (isFirstLoadRef.current) {
          logs.forEach((log) => knownIdsRef.current.add(log.id));
          isFirstLoadRef.current = false;
          return;
        }

        // Detectar solo los registros que NO habíamos visto antes
        const freshLogs = logs.filter(
          (log) => !knownIdsRef.current.has(log.id)
        );

        if (freshLogs.length > 0) {
          freshLogs.forEach((log) => knownIdsRef.current.add(log.id));

          setNewLogs((prev) => {
            const existingIds = new Set(prev.map((l) => l.id));
            const uniqueFresh = freshLogs.filter(
              (l) => !existingIds.has(l.id)
            );
            if (uniqueFresh.length === 0) return prev;
            return [...uniqueFresh, ...prev];
          });
        }
      } catch (error) {
        // Silencioso: no queremos llenar la consola si el backend falla un tick
        console.error('Error polling access logs:', error);
      }
    };

    // Primera carga inmediata (solo para registrar IDs conocidos)
    fetchLogs();

    const interval = setInterval(fetchLogs, INTERVAL_MS);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [branchId]);

  const clearNewLogs = () => {
    setNewLogs([]);
  };

  return {
    newLogs,
    clearNewLogs,
  };
}