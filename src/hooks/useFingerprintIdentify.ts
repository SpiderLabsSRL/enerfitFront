import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { getStoredUserData } from '@/api/loginapi';

interface UseFingerprintReaderOptions {
  onVerified: (personaCI: string) => void;
  enabled?: boolean;
  autoRestart?: boolean;
  restartDelay?: number;
}

export const useFingerprintIdentify = ({
  onVerified,
  enabled = true,
}: Omit<UseFingerprintReaderOptions, 'autoRestart' | 'restartDelay'>) => {
  const [message, setMessage] = useState<string>('');
  const hasShownErrorRef = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onVerifiedRef = useRef(onVerified);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isEnabledRef = useRef(enabled);
  const shouldReconnectRef = useRef(true);

  useEffect(() => {
    onVerifiedRef.current = onVerified;
  }, [onVerified]);

  useEffect(() => {
    isEnabledRef.current = enabled;
  }, [enabled]);

  const connect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

 /* No conectar si está deshabilitado
    if (!isEnabledRef.current) {
      return;
    }
    */

    const user = getStoredUserData();
    const params = new URLSearchParams({
      sucursalId: user.idsucursal.toString(),
    });

    console.log('[SSE Identify] Conectando...');

    const eventSource = new EventSource(
      `${import.meta.env.VITE_FINGERPRINT_API_URL}/identify-stream?${params}`
    );
    eventSourceRef.current = eventSource;

    const handleEvent = (eventType: string) => (e: MessageEvent) => {
      const eventData = JSON.parse(e.data);
      setMessage(eventData.message || '');

      if (eventType === 'success') {
        onVerifiedRef.current(eventData.personaCI);
        hasShownErrorRef.current = false;

       /*toast({
          title: "Huella identificada",
          description: `${eventData.nombrePersona}`,
        }); */

        // ✅ Emitir evento global para el listener en segundo plano
        if (!(window as any).__FINGERPRINT_PAUSED__) {
          window.dispatchEvent(
            new CustomEvent("fingerprint-verified", {
              detail: {
                ci: eventData.personaCI,
                nombre: eventData.nombrePersona,
              },
            })
          );
        }

        eventSource.close();
        scheduleReconnect(2000);
      }

      if (eventType === 'not_found') {
        toast({
          title: "Huella no encontrada",
          description: eventData.message,
          variant: "destructive",
        });
        eventSource.close();
        scheduleReconnect(2000);
      }

      if (eventType === 'poor_quality') {
        toast({
          title: "Error",
          description: eventData.message,
        });
        eventSource.close();
        scheduleReconnect(2000);
      }

      if (eventType === 'timeout') {
        eventSource.close();
        scheduleReconnect(1000);
      }

      if (eventType === 'error') {
        toast({
          title: "Error",
          description: eventData.message,
          variant: "destructive",
        });
        eventSource.close();
        scheduleReconnect(5000);
      }

      if (eventType === 'complete') {
        console.log('[SSE] Proceso completado');
        eventSource.close();
        scheduleReconnect(1000);
      }
    };

    const events = [
      'started', 'opening', 'reader_ready', 'waiting', 'heartbeat',
      'captured', 'quality_ok', 'processing', 'comparing', 'db_loaded',
      'progress', 'match_found', 'comparison_complete', 'reader_closed',
      'success', 'not_found', 'poor_quality', 'timeout', 'error', 'complete'
    ];

    events.forEach(eventType => {
      eventSource.addEventListener(eventType, handleEvent(eventType));
    });

    eventSource.onerror = (error) => {
      if (!hasShownErrorRef.current) {
        toast({
          title: "Error",
          description: "Error al conectar con el lector de huella",
          variant: "destructive",
        });
        hasShownErrorRef.current = true;
      }
      eventSource.close();
      scheduleReconnect(10000);
    };

    eventSource.onopen = () => {
      console.log('[SSE Identify] Conexión establecida');
    };
  }, []);

  const scheduleReconnect = useCallback((delay: number) => {
    if (!shouldReconnectRef.current || !isEnabledRef.current) {
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isEnabledRef.current && shouldReconnectRef.current) {
        connect();
      }
    }, delay);
  }, [connect]);

  const disconnect = useCallback(() => {
    console.log('[SSE Identify] Desconectando...');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      shouldReconnectRef.current = true;
      setTimeout(() => connect(), 1000);
    } else {
      shouldReconnectRef.current = false;
      disconnect();
    }

    return () => {
      shouldReconnectRef.current = false;
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    message,
    connect,
    disconnect,
  };
};