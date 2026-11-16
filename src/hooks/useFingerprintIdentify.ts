// src/hooks/useFingerprintIdentify.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { getStoredUserData } from '@/api/loginapi';

interface UseFingerprintReaderOptions {
  onVerified: (personaCI: string) => void;
  enabled?: boolean;
}

export const useFingerprintIdentify = ({
  onVerified,
  enabled = true,
}: UseFingerprintReaderOptions) => {
  const [message, setMessage] = useState<string>('');
  const [isUnavailable, setIsUnavailable] = useState<boolean>(false);

  const hasShownErrorRef = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onVerifiedRef = useRef(onVerified);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEnabledRef = useRef(enabled);
  const shouldReconnectRef = useRef(true);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    onVerifiedRef.current = onVerified;
  }, [onVerified]);

  useEffect(() => {
    isEnabledRef.current = enabled;
  }, [enabled]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const safeClose = useCallback(() => {
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch {
        /* noop */
      }
      eventSourceRef.current = null;
    }
    isConnectingRef.current = false;
  }, []);

  /**
   * Marca el lector como no disponible y DETIENE el bucle de reconexión.
   * El usuario debe presionar "Reconectar Lector de Huella" para volver a intentar.
   */
  const markUnavailable = useCallback(() => {
    clearReconnectTimer();
    safeClose();
    shouldReconnectRef.current = false;
    setIsUnavailable(true);

    if (!hasShownErrorRef.current) {
      const { dismiss } = toast({
        title: 'Lector no disponible',
        description:
          'No se pudo conectar con el lector de huella. Presiona el botón de reconectar.',
        variant: 'destructive',
        duration: 4000,
      });

      setTimeout(() => {
        dismiss();
      }, 4000);

      hasShownErrorRef.current = true;
    }
  }, [clearReconnectTimer, safeClose]);

  const connect = useCallback(() => {
    if (isConnectingRef.current || eventSourceRef.current) return;
    if (!isEnabledRef.current) return;

    clearReconnectTimer();
    isConnectingRef.current = true;
    setIsUnavailable(false);

    let user: any = null;
    try {
      user = getStoredUserData();
    } catch {
      user = null;
    }

    if (!user || !user.idsucursal) {
      isConnectingRef.current = false;
      return;
    }

    const params = new URLSearchParams({
      sucursalId: String(user.idsucursal),
    });

    console.log('[SSE Identify] Conectando...');

    let eventSource: EventSource;
    try {
      eventSource = new EventSource(
        `${import.meta.env.VITE_FINGERPRINT_API_URL}/identify-stream?${params.toString()}`
      );
    } catch {
      isConnectingRef.current = false;
      markUnavailable();
      return;
    }

    eventSourceRef.current = eventSource;

    const handleEvent = (eventType: string) => (e: MessageEvent) => {
      if (eventSourceRef.current !== e.target) return;

      let eventData: any = {};
      try {
        eventData = e.data ? JSON.parse(e.data) : {};
      } catch {
        return;
      }

      setMessage(eventData.message || '');

      if (eventType === 'success') {
        onVerifiedRef.current(eventData.personaCI);
        hasShownErrorRef.current = false;
        return;
      }

      if (eventType === 'not_found') {
        toast({
          title: 'Huella no encontrada',
          description: eventData.message,
          variant: 'destructive',
        });
        return;
      }

      if (eventType === 'poor_quality') {
        toast({ title: 'Error', description: eventData.message });
        return;
      }

      if (eventType === 'error') {
        toast({
          title: 'Error',
          description: eventData.message,
          variant: 'destructive',
        });
        return;
      }
    };

    const events = [
      'started', 'opening', 'reader_ready', 'waiting', 'heartbeat',
      'captured', 'quality_ok', 'processing', 'comparing', 'db_loaded',
      'progress', 'match_found', 'comparison_complete', 'reader_closed',
      'success', 'not_found', 'poor_quality', 'timeout', 'error', 'complete',
    ];

    events.forEach((eventType) => {
      eventSource.addEventListener(eventType, handleEvent(eventType));
    });

    eventSource.onopen = () => {
      console.log('[SSE Identify] Conexión establecida');
      isConnectingRef.current = false;
      hasShownErrorRef.current = false;
      setIsUnavailable(false);
    };

    eventSource.onerror = () => {
      isConnectingRef.current = false;
      markUnavailable();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearReconnectTimer, markUnavailable]);

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    safeClose();
  }, [clearReconnectTimer, safeClose]);

  const reconnect = useCallback(() => {
    console.log('[SSE Identify] Intentando reconexión manual...');
    hasShownErrorRef.current = false;
    shouldReconnectRef.current = true;
    setIsUnavailable(false);
    disconnect();
    setTimeout(() => connect(), 500);
  }, [connect, disconnect]);

  useEffect(() => {
    if (enabled) {
      shouldReconnectRef.current = true;
      hasShownErrorRef.current = false;
      const t = setTimeout(() => connect(), 1000);
      return () => {
        clearTimeout(t);
        shouldReconnectRef.current = false;
        disconnect();
      };
    } else {
      shouldReconnectRef.current = false;
      disconnect();
      return () => {
        shouldReconnectRef.current = false;
        disconnect();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    message,
    connect,
    disconnect,
    isUnavailable,
    reconnect,
  };
};