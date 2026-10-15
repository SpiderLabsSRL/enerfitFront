import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AccessLog } from '@/api/AccessApi';

interface RealtimeAccessLog {
  id: number;
  fecha: string;
  persona_id: number;
  servicio_id?: number;
  detalle: string;
  estado: 'exitoso' | 'denegado';
  sucursal_id: number;
  usuario_registro_id: number;
  tipo_persona: 'cliente' | 'empleado';
  personas?: {
    nombres: string;
    apellidos: string;
    ci: string;
  };
  servicios?: {
    nombre: string;
  };
}

export function useRealtimeAccessLogs(branchId?: number) {
  const [newLogs, setNewLogs] = useState<AccessLog[]>([]);

  // Función para obtener los datos de la persona con JOIN incluido
  const getPersonData = async (personId: number) => {
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('nombres, apellidos, ci')
        .eq('id', personId)
        .single();

      if (error) {
        console.error('Error fetching person data:', error);
        return { nombres: 'Nombre', apellidos: 'no disponible', ci: '' };
      }

      return data || { nombres: 'Nombre', apellidos: 'no disponible', ci: '' };
    } catch (error) {
      console.error('Error fetching person data:', error);
      return { nombres: 'Nombre', apellidos: 'no disponible', ci: '' };
    }
  };

  // Función para obtener el nombre del servicio si existe
  const getServiceName = async (serviceId?: number) => {
    if (!serviceId) return '';

    try {
      const { data, error } = await supabase
        .from('servicios')
        .select('nombre')
        .eq('id', serviceId)
        .single();

      if (error) {
        console.error('Error fetching service data:', error);
        return '';
      }

      return data?.nombre || '';
    } catch (error) {
      console.error('Error fetching service data:', error);
      return '';
    }
  };

  // Función para mapear el log de Supabase al formato del frontend
  const mapRealtimeLog = async (log: RealtimeAccessLog): Promise<AccessLog> => {
    const normalizeDate = (dateString: string): string => {
      if (!dateString) return "";
      const date = new Date(dateString);
      return date.toLocaleString('es-BO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    };

    try {
      // Obtener datos de la persona
      const personData = await getPersonData(log.persona_id);

      // Obtener nombre del servicio si existe
      const serviceName = await getServiceName(log.servicio_id || undefined);

      // Construir el detalle completo
      let detail = log.detalle;
      if (serviceName && !detail.includes(serviceName)) {
        detail = `Servicio: ${serviceName} - ${log.detalle}`;
      }

      const fullName = `${personData.nombres || ''} ${personData.apellidos || ''}`.trim();

      return {
        id: log.id.toString(),
        timestamp: normalizeDate(log.fecha),
        memberName: fullName || 'Nombre no disponible',
        memberType: log.tipo_persona === 'cliente' ? 'client' : 'employee',
        detail: detail,
        status: log.estado === 'exitoso' ? 'success' : 'denied',
        ci: personData.ci
      };
    } catch (error) {
      console.error('Error mapping realtime log:', error);
      // Retornar un log básico en caso de error
      return {
        id: log.id.toString(),
        timestamp: normalizeDate(log.fecha),
        memberName: 'Cargando...',
        memberType: log.tipo_persona === 'cliente' ? 'client' : 'employee',
        detail: log.detalle,
        status: log.estado === 'exitoso' ? 'success' : 'denied',
        ci: ''
      };
    }
  };

  useEffect(() => {
    if (!branchId) return;

    // Configurar la suscripción a cambios en tiempo real
    const subscription = supabase
      .channel('access-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'registros_acceso',
          filter: branchId ? `sucursal_id=eq.${branchId}` : undefined
        },
        async (payload) => {
          const newLog = payload.new as RealtimeAccessLog;

          try {
            const mappedLog = await mapRealtimeLog(newLog);

            setNewLogs(prev => {
              // Evitar duplicados
              if (prev.some(log => log.id === mappedLog.id)) {
                return prev;
              }
              return [mappedLog, ...prev];
            });

            // ❌ Se eliminó el toast duplicado.
            //    El toast lo dispara processFingerprintInBackground (AdminLayout)
            //    y ya incluye nombre + resultado del acceso.
          } catch (error) {
            console.error('Error processing realtime log:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscrito a cambios en tiempo real de registros_acceso');
        }
      });

    // Limpiar suscripción cuando el componente se desmonte
    return () => {
      subscription.unsubscribe();
    };
  }, [branchId]);

  // Función para limpiar los logs nuevos (usar después de agregarlos a la lista principal)
  const clearNewLogs = () => {
    setNewLogs([]);
  };

  return {
    newLogs,
    clearNewLogs
  };
}