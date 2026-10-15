//para memberlist la busqueda de miembros
CREATE EXTENSION IF NOT EXISTS unaccent;

//para la vista de servicios
-- ============================================
-- 1. CREAR TABLA tipos_servicio (nueva)
-- ============================================
CREATE TABLE IF NOT EXISTS tipos_servicio (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    estado SMALLINT DEFAULT 1 CHECK (estado IN (0, 1, 2))
);

-- ============================================
-- 2. AGREGAR COLUMNAS FALTANTES A servicios
-- ============================================
ALTER TABLE servicios 
    ADD COLUMN IF NOT EXISTS descripcion TEXT,
    ADD COLUMN IF NOT EXISTS tipo_servicio_id INTEGER,
    ADD COLUMN IF NOT EXISTS cantidad_personas INTEGER DEFAULT 1;

-- Agregar FK de tipo_servicio_id (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'servicios_tipo_servicio_id_fkey'
    ) THEN
        ALTER TABLE servicios 
            ADD CONSTRAINT servicios_tipo_servicio_id_fkey 
            FOREIGN KEY (tipo_servicio_id) 
            REFERENCES tipos_servicio(id) 
            ON DELETE RESTRICT;
    END IF;
END $$;

-- ============================================
-- 3. CREAR TABLA horarios_servicio (nueva)
-- ============================================
CREATE TABLE IF NOT EXISTS horarios_servicio (
    id SERIAL PRIMARY KEY,
    servicio_id INTEGER NOT NULL,
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_horarios_servicio_dia ON horarios_servicio(dia_semana);
CREATE INDEX IF NOT EXISTS idx_horarios_servicio_servicio ON horarios_servicio(servicio_id);

-- ============================================
-- 4. ÍNDICES ADICIONALES PARA servicios
-- ============================================
CREATE INDEX IF NOT EXISTS idx_servicios_tipo_servicio ON servicios(tipo_servicio_id);
CREATE INDEX IF NOT EXISTS idx_servicios_estado ON servicios(estado);

-- ============================================
-- 5. INSERTAR TIPOS DE SERVICIO POR DEFECTO
-- ============================================
INSERT INTO tipos_servicio (nombre, estado) VALUES
('Gimnasio', 1),
('Zumba', 1),
('Entrenamiento', 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. ASIGNAR TIPO POR DEFECTO A SERVICIOS EXISTENTES
-- ============================================
UPDATE servicios 
SET tipo_servicio_id = (SELECT id FROM tipos_servicio WHERE nombre = 'Gimnasio' LIMIT 1)
WHERE tipo_servicio_id IS NULL;



//vista para productos
-- ============================================
-- 1. AGREGAR COLUMNAS FALTANTES A productos
-- ============================================

-- Descripción
ALTER TABLE productos 
    ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- Código de barras (único pero puede ser null)
ALTER TABLE productos 
    ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);

-- Precio de compra
ALTER TABLE productos 
    ADD COLUMN IF NOT EXISTS precio_compra DECIMAL(10, 2) DEFAULT 0;

-- Imagen como BYTEA
ALTER TABLE productos 
    ADD COLUMN IF NOT EXISTS imagen BYTEA;

-- Mostrar en landing
ALTER TABLE productos 
    ADD COLUMN IF NOT EXISTS landing BOOLEAN DEFAULT FALSE;

-- ============================================
-- 2. AGREGAR CONSTRAINT UNIQUE A codigo
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'productos_codigo_key'
    ) THEN
        ALTER TABLE productos 
            ADD CONSTRAINT productos_codigo_key UNIQUE (codigo);
    END IF;
END $$;

-- ============================================
-- 3. AGREGAR COLUMNA stock_minimo A producto_sucursal
-- ============================================
ALTER TABLE producto_sucursal 
    ADD COLUMN IF NOT EXISTS stock_minimo INTEGER DEFAULT NULL;

-- ============================================
-- 4. ÍNDICES ADICIONALES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_landing ON productos(landing);
CREATE INDEX IF NOT EXISTS idx_productos_estado ON productos(estado);

-- ============================================
-- 5. COMENTARIOS (opcional, para claridad)
-- ============================================
COMMENT ON COLUMN productos.imagen IS 'Imagen del producto en formato BYTEA';
COMMENT ON COLUMN productos.codigo IS 'Código de barras del producto';
COMMENT ON COLUMN productos.landing IS 'Si se muestra en la página de inicio';
COMMENT ON COLUMN producto_sucursal.stock_minimo IS 'Stock mínimo para alertas';

//vista de Employe
-- Índice para búsquedas rápidas de horarios por empleado
CREATE INDEX IF NOT EXISTS idx_horarios_empleado_empleado 
    ON horarios_empleado(empleado_id);

-- Índice para filtrar por día
CREATE INDEX IF NOT EXISTS idx_horarios_empleado_dia 
    ON horarios_empleado(dia_semana);


    -- ============================================
-- 1. AGREGAR COLUMNA sucursal_id A horarios_empleado
-- ============================================
ALTER TABLE horarios_empleado 
    ADD COLUMN IF NOT EXISTS sucursal_id INTEGER;

-- ============================================
-- 2. AGREGAR FK DE sucursal_id
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'horarios_empleado_sucursal_id_fkey'
    ) THEN
        ALTER TABLE horarios_empleado 
            ADD CONSTRAINT horarios_empleado_sucursal_id_fkey 
            FOREIGN KEY (sucursal_id) 
            REFERENCES sucursales(id) 
            ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================
-- 3. ELIMINAR EL UNIQUE(empleado_id, dia_semana)
--    porque ahora se permiten múltiples horarios por día
-- ============================================
DO $$
BEGIN
    -- Buscar el nombre exacto del constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'horarios_empleado' 
          AND constraint_type = 'UNIQUE'
    ) THEN
        -- Se llama normalmente "horarios_empleado_empleado_id_dia_semana_key"
        ALTER TABLE horarios_empleado 
            DROP CONSTRAINT IF EXISTS horarios_empleado_empleado_id_dia_semana_key;
    END IF;
END $$;

-- ============================================
-- 4. MIGRAR sucursal_id EXISTENTE
--    Asignar la sucursal del empleado a sus horarios actuales
-- ============================================
UPDATE horarios_empleado he
SET sucursal_id = e.sucursal_id
FROM empleados e
WHERE he.empleado_id = e.id 
  AND he.sucursal_id IS NULL;

-- ============================================
-- 5. ÍNDICES NUEVOS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_horarios_empleado_sucursal 
    ON horarios_empleado(sucursal_id);

CREATE INDEX IF NOT EXISTS idx_horarios_empleado_empleado_dia 
    ON horarios_empleado(empleado_id, dia_semana);

-- ============================================
-- 6. COMENTARIOS
-- ============================================
COMMENT ON COLUMN horarios_empleado.sucursal_id 
    IS 'Sucursal donde el empleado trabaja ese horario. NULL = hereda del empleado';


//vista CUPONES
-- ============================================
-- 1. CREAR TABLA cupones (si no existe)
-- ============================================
CREATE TABLE IF NOT EXISTS cupones (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('porcentaje', 'monto_fijo')),
    valor_descuento DECIMAL(10, 2) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    usos INTEGER DEFAULT 0,
    usos_maximos INTEGER DEFAULT 0,
    aplica_servicios BOOLEAN DEFAULT TRUE,
    aplica_productos BOOLEAN DEFAULT TRUE,
    estado SMALLINT DEFAULT 1 CHECK (estado IN (0, 1, 2))
);

-- ============================================
-- 2. CREAR TABLA cupon_sucursal (relación N:N)
-- ============================================
CREATE TABLE IF NOT EXISTS cupon_sucursal (
    id SERIAL PRIMARY KEY,
    cupon_id INTEGER NOT NULL,
    sucursal_id INTEGER NOT NULL,
    FOREIGN KEY (cupon_id) REFERENCES cupones(id) ON DELETE CASCADE,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE CASCADE,
    UNIQUE(cupon_id, sucursal_id)
);

-- ============================================
-- 3. ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cupones_codigo ON cupones(codigo);
CREATE INDEX IF NOT EXISTS idx_cupones_estado ON cupones(estado);
CREATE INDEX IF NOT EXISTS idx_cupones_fechas ON cupones(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_cupon_sucursal_cupon ON cupon_sucursal(cupon_id);
CREATE INDEX IF NOT EXISTS idx_cupon_sucursal_sucursal ON cupon_sucursal(sucursal_id);

-- ============================================
-- 4. COMENTARIOS
-- ============================================
COMMENT ON TABLE cupones IS 'Cupones de descuento para servicios y productos';
COMMENT ON TABLE cupon_sucursal IS 'Sucursales donde aplica cada cupón';

//Vista de caja
-- ============================================
-- 1. AGREGAR COLUMNAS A cajas (estado_caja y total)
-- ============================================
ALTER TABLE cajas 
    ADD COLUMN IF NOT EXISTS estado_caja VARCHAR(20) 
        CHECK (estado_caja IN ('abierta', 'cerrada'));
ALTER TABLE cajas 
    ADD COLUMN IF NOT EXISTS total DECIMAL(10,2) DEFAULT 0;

-- ============================================
-- 2. MIGRAR datos desde estado_caja a cajas
--    (tomar el último monto_final de cada caja)
-- ============================================
UPDATE cajas c
SET 
    total = COALESCE(sub.monto_final, 0),
    estado_caja = COALESCE(sub.estado, 'cerrada')
FROM (
    SELECT DISTINCT ON (caja_id) 
        caja_id, 
        monto_final, 
        estado
    FROM estado_caja
    ORDER BY caja_id, id DESC
) sub
WHERE c.id = sub.caja_id
  AND (c.total IS NULL OR c.total = 0);

-- Para cajas sin historial en estado_caja, marcarlas como cerradas
UPDATE cajas 
SET estado_caja = 'cerrada', total = 0 
WHERE estado_caja IS NULL;

-- ============================================
-- 3. CREAR TABLA movimientos_caja (si no existe)
-- ============================================
CREATE TABLE IF NOT EXISTS movimientos_caja (
    id SERIAL PRIMARY KEY,
    caja_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('apertura', 'ingreso', 'egreso', 'cierre')),
    descripcion TEXT,
    monto_anterior DECIMAL(10,2) DEFAULT 0,
    monto_actual DECIMAL(10,2) DEFAULT 0,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/La_Paz', NOW()),
    venta_servicio_id INTEGER REFERENCES ventas_servicios(id) ON DELETE SET NULL,
    venta_producto_id INTEGER REFERENCES ventas_productos(id) ON DELETE SET NULL,
    FOREIGN KEY (caja_id) REFERENCES cajas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- ============================================
-- 4. MIGRAR datos de transacciones_caja → movimientos_caja
--    (solo si transacciones_caja existe y movimientos_caja está vacía)
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transacciones_caja')
       AND NOT EXISTS (SELECT 1 FROM movimientos_caja LIMIT 1)
    THEN
        INSERT INTO movimientos_caja (
            caja_id, usuario_id, monto, tipo, descripcion, fecha
        )
        SELECT 
            caja_id, usuario_id, monto, tipo, descripcion, fecha
        FROM transacciones_caja
        ORDER BY id;
        
        RAISE NOTICE 'Migrados % movimientos desde transacciones_caja', 
            (SELECT COUNT(*) FROM transacciones_caja);
    END IF;
END $$;

-- ============================================
-- 5. MIGRAR usuario_id: si existe usuario_id, mapear a usuarios
--    (si no existe, tomar el usuario admin por defecto)
-- ============================================
UPDATE movimientos_caja m
SET usuario_id = (
    SELECT id FROM usuarios ORDER BY id LIMIT 1
)
WHERE usuario_id IS NULL 
   OR usuario_id NOT IN (SELECT id FROM usuarios);

-- ============================================
-- 6. ÍNDICES NUEVOS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_caja 
    ON movimientos_caja(caja_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_fecha 
    ON movimientos_caja(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_tipo 
    ON movimientos_caja(tipo);
CREATE INDEX IF NOT EXISTS idx_cajas_estado_caja 
    ON cajas(estado_caja);

-- ============================================
-- 7. COMENTARIOS
-- ============================================
COMMENT ON COLUMN cajas.estado_caja IS 'abierta | cerrada';
COMMENT ON COLUMN cajas.total IS 'Monto actual en la caja';
COMMENT ON TABLE movimientos_caja IS 'Todos los movimientos de dinero por caja';

//IMPORTANTE SOLO BORRAR DESPUES DE LA MIGRACION
DROP TABLE IF EXISTS transacciones_caja;
DROP TABLE IF EXISTS estado_caja;


/vista Vender
-- Agregar columna cupon_id a ventas_productos
ALTER TABLE ventas_productos 
    ADD COLUMN IF NOT EXISTS cupon_id INTEGER;

-- FK a cupones
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ventas_productos_cupon_id_fkey'
    ) THEN
        ALTER TABLE ventas_productos 
            ADD CONSTRAINT ventas_productos_cupon_id_fkey 
            FOREIGN KEY (cupon_id) 
            REFERENCES cupones(id) 
            ON DELETE SET NULL;
    END IF;
END $$;

-- Índice
CREATE INDEX IF NOT EXISTS idx_ventas_productos_cupon 
    ON ventas_productos(cupon_id);


    ALTER TABLE ventas_servicios 
    ADD COLUMN IF NOT EXISTS cupon_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ventas_servicios_cupon_id_fkey'
    ) THEN
        ALTER TABLE ventas_servicios 
            ADD CONSTRAINT ventas_servicios_cupon_id_fkey 
            FOREIGN KEY (cupon_id) 
            REFERENCES cupones(id) 
            ON DELETE SET NULL;
    END IF;
END $$;

// Vista de reportes
-- ============================================
-- 1. TABLA: objetivos_mensuales
-- ============================================
CREATE TABLE IF NOT EXISTS objetivos_mensuales (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER NOT NULL,
    mes VARCHAR(7) NOT NULL,  -- formato "YYYY-MM"
    objetivo DECIMAL(15, 2) NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario_creacion_id INTEGER,
    estado SMALLINT DEFAULT 1 CHECK (estado IN (0, 1, 2)),
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_creacion_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE(sucursal_id, mes)
);

CREATE INDEX IF NOT EXISTS idx_objetivos_sucursal_mes 
    ON objetivos_mensuales(sucursal_id, mes);

CREATE INDEX IF NOT EXISTS idx_objetivos_mes 
    ON objetivos_mensuales(mes);

CREATE INDEX IF NOT EXISTS idx_objetivos_estado 
    ON objetivos_mensuales(estado);

COMMENT ON TABLE objetivos_mensuales 
    IS 'Objetivos de ventas mensuales por sucursal';
COMMENT ON COLUMN objetivos_mensuales.mes 
    IS 'Mes en formato YYYY-MM (ej: 2024-03)';

-- ============================================
-- 2. VISTA: ventas_mensuales_por_sucursal
-- ============================================
CREATE OR REPLACE VIEW ventas_mensuales_por_sucursal AS
SELECT 
    sucursal_id,
    TO_CHAR(fecha, 'YYYY-MM') AS mes,
    SUM(total) AS total_ventas,
    COUNT(*) AS cantidad_ventas,
    SUM(CASE WHEN tipo = 'servicio' THEN total ELSE 0 END) AS ventas_servicios,
    SUM(CASE WHEN tipo = 'producto' THEN total ELSE 0 END) AS ventas_productos
FROM (
    SELECT 
        sucursal_id,
        fecha,
        total,
        'servicio' AS tipo
    FROM ventas_servicios
    UNION ALL
    SELECT 
        sucursal_id,
        fecha,
        total,
        'producto' AS tipo
    FROM ventas_productos
) AS todas_ventas
GROUP BY sucursal_id, TO_CHAR(fecha, 'YYYY-MM');

COMMENT ON VIEW ventas_mensuales_por_sucursal 
    IS 'Ventas agregadas por sucursal y mes (servicios + productos)';

    CREATE TABLE movimientos_stock (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL,
    sucursal_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    cantidad_anterior INTEGER NOT NULL,
    cantidad_nueva INTEGER NOT NULL,
    cantidad_modificada INTEGER NOT NULL,
    descripcion TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/La_Paz', NOW())
);

//PARA ZUMBA CRE CREO QUE OLVIDE
create table public.reportes_zumba (
  id serial not null,
  fecha date not null,
  instructor_id integer not null,
  numero_personas integer not null,
  registrado_por_id integer not null,
  registrado_en timestamp with time zone null default timezone ('America/La_Paz'::text, now()),
  created_at timestamp with time zone null default timezone ('America/La_Paz'::text, now()),
  updated_at timestamp with time zone null default timezone ('America/La_Paz'::text, now()),
  constraint reportes_zumba_pkey primary key (id),
  constraint reportes_zumba_fecha_unique unique (fecha),
  constraint reportes_zumba_instructor_id_fkey foreign KEY (instructor_id) references empleados (id) on delete RESTRICT,
  constraint reportes_zumba_registrado_por_id_fkey foreign KEY (registrado_por_id) references empleados (id) on delete RESTRICT,
  constraint reportes_zumba_numero_personas_check check ((numero_personas >= 0))
) TABLESPACE pg_default;

create index IF not exists idx_reportes_zumba_fecha on public.reportes_zumba using btree (fecha desc) TABLESPACE pg_default;

create index IF not exists idx_reportes_zumba_instructor on public.reportes_zumba using btree (instructor_id) TABLESPACE pg_default;

//inscripciones
-- ============================================================
-- MIGRACIÓN: Agregar columna es_futura a inscripciones
-- ============================================================
-- ============================================================
-- MIGRACIÓN: Agregar columna estado_inscripcion a inscripciones
-- ============================================================

ALTER TABLE inscripciones
ADD COLUMN estado_inscripcion VARCHAR(10)
DEFAULT 'activo'
CHECK (estado_inscripcion IN ('activo', 'inactivo'));

-- Marcar como inactivas las inscripciones ya vencidas
UPDATE inscripciones
SET estado_inscripcion = 'inactivo'
WHERE fecha_vencimiento < CURRENT_DATE;

-- Índice para acelerar consultas por persona + estado
CREATE INDEX idx_inscripciones_persona_estado
ON inscripciones(persona_id, estado_inscripcion);

CREATE INDEX idx_inscripciones_servicio_estado
ON inscripciones(servicio_id, estado_inscripcion);

COMMENT ON COLUMN inscripciones.estado_inscripcion
IS 'activo | inactivo. Se calcula según fechas y reglas de reemplazo/futuro.';

-- ============================================================
-- MIGRACIÓN: Agregar inscripcion_id a registros_acceso
-- ============================================================

ALTER TABLE registros_acceso
ADD COLUMN inscripcion_id INTEGER;

ALTER TABLE registros_acceso
ADD CONSTRAINT fk_registros_acceso_inscripcion
FOREIGN KEY (inscripcion_id)
REFERENCES inscripciones(id)
ON DELETE SET NULL;

CREATE INDEX idx_registros_acceso_inscripcion
ON registros_acceso(inscripcion_id);

CREATE INDEX idx_registros_acceso_inscripcion_fecha
ON registros_acceso(inscripcion_id, fecha);

COMMENT ON COLUMN registros_acceso.inscripcion_id
IS 'Inscripción específica a la que corresponde el acceso (para bloquear doble ingreso por día por inscripción).';


//registros de movimineto en member list
-- ============================================================
-- 26. MOVIMIENTOS DE FECHAS DE INSCRIPCIÓN (auditoría)
-- ============================================================
CREATE TABLE movimientos_fechas_inscripcion (
    id SERIAL PRIMARY KEY,
    inscripcion_id INTEGER NOT NULL,
    persona_id INTEGER NOT NULL,
    servicio_id INTEGER NOT NULL,
    sucursal_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    fecha_inicio_anterior DATE,
    fecha_inicio_nueva DATE,
    fecha_vencimiento_anterior DATE,
    fecha_vencimiento_nueva DATE,
    descripcion TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/La_Paz', NOW()),
    FOREIGN KEY (inscripcion_id) REFERENCES inscripciones(id) ON DELETE CASCADE,
    FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE RESTRICT,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

CREATE INDEX idx_mov_fechas_insc_inscripcion ON movimientos_fechas_inscripcion(inscripcion_id);
CREATE INDEX idx_mov_fechas_insc_persona ON movimientos_fechas_inscripcion(persona_id);
CREATE INDEX idx_mov_fechas_insc_usuario ON movimientos_fechas_inscripcion(usuario_id);
CREATE INDEX idx_mov_fechas_insc_fecha ON movimientos_fechas_inscripcion(fecha DESC);

COMMENT ON TABLE movimientos_fechas_inscripcion IS 'Auditoría de cambios de fechas (inicio/vencimiento) en inscripciones';