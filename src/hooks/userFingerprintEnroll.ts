import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';

interface UseFingerprintEnrollOptions {
  onSuccess: (data: { personaId: number; nombrePersona: string; personaCI: string;}) => void;
  onError?: (error: string) => void;
}

export const useFingerprintEnroll = ({
  onSuccess,
  onError,
}: UseFingerprintEnrollOptions) => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const currentUserIdRef = useRef<string | null>(null);
  const shouldRetryRef = useRef(false);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const startEnroll = useCallback((userId: string) => {
    // Limpiar cualquier timeout pendiente
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Cerrar conexión previa si existe
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    currentUserIdRef.current = userId;
    shouldRetryRef.current = true;

    const url = `${import.meta.env.VITE_FINGERPRINT_API_URL}/enroll-stream/${userId}`;
    console.log("🎯 [Enroll] Abriendo EventSource:", url);

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    const handleEvent = (eventType: string) => (e: MessageEvent) => {
      const eventData = JSON.parse(e.data);

      if (eventType === 'success') {
        toast({
          title: "Huella registrada",
          description: `Registro exitoso para ${eventData.nombrePersona}`,
        });
        shouldRetryRef.current = false;

        onSuccessRef.current({
          personaId: eventData.personaId,
          nombrePersona: eventData.nombrePersona,
          personaCI: eventData.personaCI
        });

        eventSource.close();
        currentUserIdRef.current = null;
      }

      if (eventType === 'poor_quality') {
        toast({
          title: "Calidad insuficiente",
          description: eventData.message,
          variant: "destructive",
        });

        eventSource.close();
        scheduleRetry(2000);
      }

      if (eventType === 'timeout') {
        eventSource.close();
        scheduleRetry(1500);
      }

      if (eventType === 'error') {
        const errorMsg = eventData.message || 'Error al procesar huella';

        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });

        if (errorMsg.includes('no encontrada') || errorMsg.includes('not found')) {
          shouldRetryRef.current = false;
          onErrorRef.current?.(errorMsg);
          eventSource.close();
          currentUserIdRef.current = null;
        } else {
          eventSource.close();
          scheduleRetry(3000);
        }
      }
    };

    const events = [
      'started', 'user_found', 'opening', 'reader_ready', 'waiting', 
      'heartbeat', 'captured', 'quality_ok', 'processing', 'saving',
      'reader_closed', 'success', 'poor_quality', 'timeout', 'error', 'complete'
    ];

    events.forEach(eventType => {
      eventSource.addEventListener(eventType, handleEvent(eventType));
    });

    eventSource.onerror = (error) => {
      console.error("[Enroll SSE] Error de conexión:", error);
      console.error("[Enroll SSE] readyState:", eventSource.readyState);
      console.error("[Enroll SSE] URL intentada:", eventSource.url);

      toast({
        title: "Error",
        description: `No se pudo conectar con el lector (${eventSource.url})`,
        variant: "destructive",
      });

      eventSource.close();
      scheduleRetry(5000);
    };

    eventSource.onopen = () => {
      console.log('[Enroll SSE] Conexión establecida con', eventSource.url);
    };

  }, []);

  const scheduleRetry = useCallback((delay: number) => {
    if (!shouldRetryRef.current || !currentUserIdRef.current) {
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      if (shouldRetryRef.current && currentUserIdRef.current) {
        startEnroll(currentUserIdRef.current);
      }
    }, delay);
  }, [startEnroll]);

  const cancelEnroll = useCallback(() => {
    shouldRetryRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    currentUserIdRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      shouldRetryRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    startEnroll,
    cancelEnroll,
  };
};