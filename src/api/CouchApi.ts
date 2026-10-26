// src/api/CouchApi.ts
export type TipoInscrito = "nueva" | "reinscripcion";

export interface Inscrito {
  id: string;
  nombre: string;
  ci: string;
  tipo: TipoInscrito;
  fechaRegistro: string;
  mes: string;
}

export interface RegistroMes {
  mes: string;
  metaInscritos: number;
  adelantoMonto: number;
  fechaActualizacion: string;
}

export interface Coach {
  id: string;
  nombres: string;
  apellidos: string;
  ci: string;
  telefono: string;
  fechaRegistro: string;
  activo: boolean;
  inscritos: Inscrito[];
  registrosMes: RegistroMes[];
}

export interface CoachCreateRequest {
  nombres: string;
  apellidos: string;
  ci: string;
  telefono: string;
  metaInscritos: number;
}

export interface InscritoCreateRequest {
  nombre: string;
  ci: string;
  tipo: TipoInscrito;
  mes?: string;
}

export interface RegistroMesRequest {
  mes: string;
  metaInscritos: number;
  adelantoMonto: number;
}

const STORAGE_KEY = "mutant_coaches_v4";

// ============================================
// HELPERS
// ============================================
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function nowISO(): string {
  return new Date().toISOString();
}
function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function addMonths(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map((n) => parseInt(n, 10));
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function delay(ms = 200): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
function ensureRegistroMes(coach: Coach, mes: string): RegistroMes {
  const existing = coach.registrosMes.find((r) => r.mes === mes);
  if (existing) return existing;
  const previos = coach.registrosMes
    .filter((r) => r.mes < mes)
    .sort((a, b) => b.mes.localeCompare(a.mes));
  const metaHeredada = previos.length > 0 ? previos[0].metaInscritos : 0;
  const nuevo: RegistroMes = {
    mes,
    metaInscritos: metaHeredada,
    adelantoMonto: 0,
    fechaActualizacion: nowISO(),
  };
  coach.registrosMes.push(nuevo);
  return nuevo;
}

function loadCoaches(): Coach[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedInitialData();
    const parsed = JSON.parse(raw) as Coach[];
    if (!Array.isArray(parsed)) return seedInitialData();
    return parsed;
  } catch {
    return seedInitialData();
  }
}
function saveCoaches(coaches: Coach[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(coaches));
}

// ============================================
// SEED
// ============================================
function seedInitialData(): Coach[] {
  const mesActual = currentMonth();
  const mesAnterior = addMonths(mesActual, -1);
  const mesAnterior2 = addMonths(mesActual, -2);

  const mi = (
    nombre: string,
    ci: string,
    tipo: TipoInscrito,
    mes: string
  ): Inscrito => ({
    id: generateId(),
    nombre,
    ci,
    tipo,
    fechaRegistro: nowISO(),
    mes,
  });
  const mr = (mes: string, meta: number, adelanto: number): RegistroMes => ({
    mes,
    metaInscritos: meta,
    adelantoMonto: adelanto,
    fechaActualizacion: nowISO(),
  });

  const initial: Coach[] = [
    {
      id: "coach-1",
      nombres: "Carlos",
      apellidos: "Mendoza",
      ci: "8765432",
      telefono: "71234567",
      fechaRegistro: nowISO(),
      activo: true,
      inscritos: [
        mi("Ana Pérez", "1122334", "nueva", mesAnterior2),
        mi("Luis Rojas", "2233445", "reinscripcion", mesAnterior),
        mi("Pedro Lima", "3344556", "nueva", mesAnterior),
        mi("María Quispe", "4455667", "nueva", mesActual),
      ],
      registrosMes: [
        mr(mesAnterior2, 15, 400),
        mr(mesAnterior, 18, 450),
        mr(mesActual, 20, 500),
      ],
    },
    {
      id: "coach-2",
      nombres: "María",
      apellidos: "Gutiérrez",
      ci: "7654321",
      telefono: "72345678",
      fechaRegistro: nowISO(),
      activo: true,
      inscritos: [
        mi("Carla Vargas", "5566778", "nueva", mesAnterior),
        mi("Diego Siles", "6677889", "reinscripcion", mesAnterior),
      ],
      registrosMes: [mr(mesAnterior, 12, 300), mr(mesActual, 15, 0)],
    },
    {
      id: "coach-3",
      nombres: "Roberto",
      apellidos: "Flores",
      ci: "6543210",
      telefono: "73456789",
      fechaRegistro: nowISO(),
      activo: true,
      inscritos: [
        mi("Elena Cruz", "7788990", "nueva", mesAnterior2),
        mi("Fabián Ortiz", "8899001", "nueva", mesAnterior),
        mi("Gabriela Ruiz", "9900112", "reinscripcion", mesAnterior),
        mi("Hugo Salas", "1011223", "nueva", mesActual),
        mi("Irene Paz", "2122334", "nueva", mesActual),
      ],
      registrosMes: [
        mr(mesAnterior2, 20, 600),
        mr(mesAnterior, 22, 650),
        mr(mesActual, 25, 700),
      ],
    },
    {
      id: "coach-4",
      nombres: "Lucía",
      apellidos: "Ramos",
      ci: "5432109",
      telefono: "74567890",
      fechaRegistro: nowISO(),
      activo: true,
      inscritos: [mi("Javier Torres", "3233445", "nueva", mesAnterior)],
      registrosMes: [mr(mesAnterior, 10, 200), mr(mesActual, 12, 250)],
    },
    {
      id: "coach-5",
      nombres: "Andrés",
      apellidos: "Castro",
      ci: "4321098",
      telefono: "75678901",
      fechaRegistro: nowISO(),
      activo: true,
      inscritos: [],
      registrosMes: [mr(mesActual, 8, 0)],
    },
    {
      id: "coach-6",
      nombres: "Sofía",
      apellidos: "Navarro",
      ci: "3210987",
      telefono: "76789012",
      fechaRegistro: nowISO(),
      activo: false,
      inscritos: [
        mi("Kevin Mamani", "4344556", "nueva", mesAnterior2),
        mi("Laura Choque", "5455667", "reinscripcion", mesAnterior2),
        mi("Mario Condori", "6566778", "nueva", mesAnterior),
      ],
      registrosMes: [
        mr(mesAnterior2, 15, 350),
        mr(mesAnterior, 18, 400),
        mr(mesActual, 18, 0),
      ],
    },
    {
      id: "coach-7",
      nombres: "Pablo",
      apellidos: "Ríos",
      ci: "2109876",
      telefono: "77890123",
      fechaRegistro: nowISO(),
      activo: true,
      inscritos: [mi("Natalia Vega", "7677889", "nueva", mesActual)],
      registrosMes: [mr(mesActual, 10, 150)],
    },
  ];

  saveCoaches(initial);
  return initial;
}

// ============================================
// API CALLS
// ============================================
export const getCoaches = async (): Promise<Coach[]> => {
  await delay();
  return loadCoaches();
};

export const getCoachById = async (id: string): Promise<Coach | null> => {
  await delay(100);
  const coaches = loadCoaches();
  return coaches.find((c) => c.id === id) ?? null;
};

export const createCoach = async (
  data: CoachCreateRequest
): Promise<Coach> => {
  await delay();
  const coaches = loadCoaches();
  if (coaches.some((c) => c.ci === data.ci)) throw new Error("ci_unique");

  const mesActual = currentMonth();
  const newCoach: Coach = {
    id: generateId(),
    nombres: data.nombres,
    apellidos: data.apellidos,
    ci: data.ci,
    telefono: data.telefono,
    fechaRegistro: nowISO(),
    activo: true,
    inscritos: [],
    registrosMes: [
      {
        mes: mesActual,
        metaInscritos: data.metaInscritos,
        adelantoMonto: 0,
        fechaActualizacion: nowISO(),
      },
    ],
  };

  coaches.push(newCoach);
  saveCoaches(coaches);
  return newCoach;
};

export const updateCoach = async (
  id: string,
  data: Partial<CoachCreateRequest>
): Promise<Coach> => {
  await delay();
  const coaches = loadCoaches();
  const idx = coaches.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Coach no encontrado");

  if (data.ci && coaches.some((c) => c.ci === data.ci && c.id !== id)) {
    throw new Error("ci_unique");
  }

  const coach = coaches[idx];
  coach.nombres = data.nombres ?? coach.nombres;
  coach.apellidos = data.apellidos ?? coach.apellidos;
  coach.ci = data.ci ?? coach.ci;
  coach.telefono = data.telefono ?? coach.telefono;

  coaches[idx] = coach;
  saveCoaches(coaches);
  return coach;
};

export const deleteCoach = async (id: string): Promise<void> => {
  await delay();
  saveCoaches(loadCoaches().filter((c) => c.id !== id));
};

export const toggleCoachStatus = async (id: string): Promise<Coach> => {
  await delay(100);
  const coaches = loadCoaches();
  const idx = coaches.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Coach no encontrado");
  coaches[idx].activo = !coaches[idx].activo;
  saveCoaches(coaches);
  return coaches[idx];
};

export const addInscrito = async (
  coachId: string,
  data: InscritoCreateRequest
): Promise<Coach> => {
  await delay();
  const coaches = loadCoaches();
  const idx = coaches.findIndex((c) => c.id === coachId);
  if (idx === -1) throw new Error("Coach no encontrado");

  const nuevo: Inscrito = {
    id: generateId(),
    nombre: data.nombre,
    ci: data.ci,
    tipo: data.tipo,
    fechaRegistro: nowISO(),
    mes: data.mes || currentMonth(),
  };
  coaches[idx].inscritos.push(nuevo);
  saveCoaches(coaches);
  return coaches[idx];
};

export const removeInscrito = async (
  coachId: string,
  inscritoId: string
): Promise<Coach> => {
  await delay(150);
  const coaches = loadCoaches();
  const idx = coaches.findIndex((c) => c.id === coachId);
  if (idx === -1) throw new Error("Coach no encontrado");
  coaches[idx].inscritos = coaches[idx].inscritos.filter(
    (i) => i.id !== inscritoId
  );
  saveCoaches(coaches);
  return coaches[idx];
};

export const upsertRegistroMes = async (
  coachId: string,
  data: RegistroMesRequest
): Promise<Coach> => {
  await delay();
  const coaches = loadCoaches();
  const idx = coaches.findIndex((c) => c.id === coachId);
  if (idx === -1) throw new Error("Coach no encontrado");

  const coach = coaches[idx];
  const existing = coach.registrosMes.find((r) => r.mes === data.mes);
  if (existing) {
    existing.metaInscritos = data.metaInscritos;
    existing.adelantoMonto = data.adelantoMonto;
    existing.fechaActualizacion = nowISO();
  } else {
    coach.registrosMes.push({
      mes: data.mes,
      metaInscritos: data.metaInscritos,
      adelantoMonto: data.adelantoMonto,
      fechaActualizacion: nowISO(),
    });
  }
  coaches[idx] = coach;
  saveCoaches(coaches);
  return coach;
};

// ============================================
// HELPERS PÚBLICOS
// ============================================
export function getRegistroMes(
  coach: Coach,
  mes: string
): RegistroMes | null {
  return coach.registrosMes.find((r) => r.mes === mes) ?? null;
}

export function inscritosDelMes(coach: Coach, mes: string) {
  const delMes = coach.inscritos.filter((i) => i.mes === mes);
  const nuevas = delMes.filter((i) => i.tipo === "nueva").length;
  const reinscripciones = delMes.filter(
    (i) => i.tipo === "reinscripcion"
  ).length;
  return {
    nuevas,
    reinscripciones,
    total: nuevas + reinscripciones,
    lista: delMes,
  };
}

export function conteoInscritosTotal(coach: Coach) {
  const nuevas = coach.inscritos.filter((i) => i.tipo === "nueva").length;
  const reinscripciones = coach.inscritos.filter(
    (i) => i.tipo === "reinscripcion"
  ).length;
  return { nuevas, reinscripciones, total: nuevas + reinscripciones };
}

export function mesesDisponibles(coach: Coach): string[] {
  const set = new Set<string>();
  coach.registrosMes.forEach((r) => set.add(r.mes));
  coach.inscritos.forEach((i) => set.add(i.mes));
  set.add(currentMonth());
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

export function totalAdelantos(coach: Coach): number {
  return coach.registrosMes.reduce((s, r) => s + r.adelantoMonto, 0);
}

export function mesActual(): string {
  return currentMonth();
}

export function addMeses(mes: string, delta: number): string {
  return addMonths(mes, delta);
}

export function formatMes(mes: string): string {
  const [year, month] = mes.split("-");
  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const m = parseInt(month, 10) - 1;
  return `${meses[m] ?? month} ${year}`;
}

export function ultimosMeses(n: number): string[] {
  const actual = currentMonth();
  const arr: string[] = [];
  for (let i = 0; i < n; i++) {
    arr.push(addMonths(actual, -i));
  }
  return arr;
}