-- ============================================================
-- BASE DE DATOS FINAL - SISTEMA DE GIMNASIO
-- ============================================================
-- Notas sobre estados (SMALLINT):
--   0 = eliminado / inactivo según tabla
--   1 = activo
--   2 = otro estado (solo donde existía originalmente)
--
-- Convención de estados según CHECK original de cada tabla:
--   estado IN (0,1)    -> 0=inactivo, 1=activo
--   estado IN (0,1,2)  -> 0=inactivo, 1=activo, 2=eliminado
-- ============================================================

-- ============================================================
-- EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================
-- 1. SUCURSALES
-- ============================================================
CREATE TABLE sucursales (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    -- 0=inactivo, 1=activo, 2=eliminado
    estado SMALLINT DEFAULT 1 CHECK (estado IN (0, 1, 2))
);

-- ============================================================
-- 2. PERSONAS
-- ============================================================
CREATE TABLE personas (
    id SERIAL PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    ci VARCHAR(20) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    fecha_nacimiento DATE,
    huella_digital BYTEA,
    -- 0=inactivo, 1=activo
    estado SMALLINT DEFAULT 0 CHECK (estado IN (0, 1))
);

-- ============================================================
-- 3. EMPLEADOS
-- ============================================================
CREATE TABLE empleados (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER NOT NULL,
    rol VARCHAR(20) CHECK (rol IN ('admin', 'recepcionista', 'entrenador', 'limpieza', 'zumba', 'lactobar')),
    sucursal_id INTEGER NULL,
    sueldo DECIMAL(10, 2) DEFAULT 0,
    comision DECIMAL(10, 2) DEFAULT NULL,
    -- 0=inactivo, 1=activo, 2=eliminado
    estado SMALLINT DEFAULT 1 CHECK (estado IN (0, 1, 2)),
    FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT
);

-- ============================================================
-- 4. HORARIOS DE EMPLEADOS
-- ============================================================
CREATE TABLE horarios_empleado (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER NOT NULL,
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    hora_ingreso TIME NOT NULL,
    hora_salida TIME NOT NULL,
    sucursal_id INTEGER,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE SET NULL
);

-- ============================================================
-- 5. CAJAS
-- ============================================================
CREATE TABLE cajas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    estado_caja VARCHAR(20) DEFAULT 'cerrada' CHECK (estado_caja IN ('abierta', 'cerrada')),
    total DECIMAL(10,2) DEFAULT 0,
    sucursal_id INTEGER NOT NULL,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE CASCADE,
    CONSTRAINT caja_nombre_sucursal_unique UNIQUE (nombre, sucursal_id)
);

-- ============================================================
-- 6. USUARIOS DEL SISTEMA
-- ============================================================
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    empleado_id INTEGER NOT NULL,
    -- 0=inactivo, 1=activo, 2=eliminado
    estado SMALLINT DEFAULT 1 CHECK (estado IN (0, 1, 2)),
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
);

-- ============================================================
-- 7. USUARIOS CLIENTES
-- ============================================================
CREATE TABLE usuarios_clientes (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    persona_id INTEGER NOT NULL,
    -- 0=inactivo, 1=activo, 2=eliminado
    estado SMALLINT DEFAULT 1 CHECK (estado IN (0, 1, 2)),
    FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
);

-- ============================================================
-- 8. ASIGNACIÓN DE CAJAS A EMPLEADOS
-- ============================================================
CREATE TABLE empleado_caja (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER NOT NULL,
    caja_id INTEGER NOT NULL,
    -- 0=inactivo, 1=activo, 2=eliminado
    estado SMALLINT DEFAULT 1 CHECK (estado IN (0, 1, 2)),
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
    FOREIGN KEY (caja_id) REFERENCES cajas(id) ON DELETE CASCADE,
    UNIQUE(empleado_id, caja_id)
);

-- ============================================================
-- 9. TIPOS DE SERVICIO
-- ============================================================
CREATE TABLE tipos_servicio (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    -- 0=inactivo, 1=activo, 2=eliminado
    estado SMALLINT DEFAULT 1 CHECK (estado IN (0, 1, 2))
);

-- ============================================================
-- 10. SERVICIOS
-- ============================================================
CREATE TABLE servicios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10, 2) NOT NULL,
    numero_ingresos INTEGER DEFAULT NULL,
    -- 0=inactivo, 1=activo, 2=eliminado
    estado SMALLINT DEFAULT 1 CHECK (estado IN (0, 1, 2)),
    tipo_duracion VARCHAR(100) NOT NULL,
    cantidad_duracion INTEGER NOT NULL,
    tipo_servicio_id INTEGER,
    cantidad_personas INTEGER DEFAULT 1,
    multisucursal BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (tipo_servicio_id) REFERENCES tipos_servicio(id) ON DELETE RESTRICT
);

-- ============================================================
-- 11. HORARIOS DE SERVICIOS
-- ============================================================
CREATE TABLE horarios_servicio (
    id SERIAL PRIMARY KEY,
    servicio_id INTEGER NOT NULL,
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE,
    UNIQUE(servicio_id, dia_semana, hora_inicio)
);

-- ============================================================
-- 12. SERVICIOS POR SUCURSAL
-- ============================================================
CREATE TABLE servicio_sucursal (
    id SERIAL PRIMARY KEY,
    servicio_id INTEGER NOT NULL,
    sucursal_id INTEGER NOT NULL,
    disponible BOOLEAN DEFAULT TRUE,
    multisucursal BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE CASCADE,
    UNIQUE(servicio_id, sucursal_id)
);

-- ============================================================
-- 13. INSCRIPCIONES
-- ============================================================
CREATE TABLE inscripciones (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER NOT NULL,
    servicio_id INTEGER NOT NULL,
    sucursal_id INTEGER NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    ingresos_disponibles INTEGER DEFAULT NULL,
    -- 0=inactivo, 1=activo, 2=eliminado
    estado SMALLINT DEFAULT 1 CHECK (estado IN (0, 1, 2)),
    estado_inscripcion VARCHAR(10) DEFAULT 'activo'
        CHECK (estado_inscripcion IN ('activo', 'inactivo')),
    FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE RESTRICT,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT
);

-- ============================================================
-- 14. PRODUCTOS
-- ============================================================
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    codigo VARCHAR(50) UNIQUE,
    precio_venta DECIMAL(10, 2) NOT NULL,
    precio_compra DECIMAL(10, 2) NOT NULL DEFAULT 0,
    imagen BYTEA,
    landing BOOLEAN DEFAULT FALSE,
    -- 0=inactivo, 1=activo, 2=eliminado
    estado SMALLINT DEFAULT 1 CHECK (estado IN (0, 1, 2))
);

-- ============================================================
-- 15. STOCK POR SUCURSAL
-- ============================================================
CREATE TABLE producto_sucursal (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL,
    sucursal_id INTEGER NOT NULL,
    stock INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT NULL,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE CASCADE,
    UNIQUE(producto_id, sucursal_id)
);

-- ============================================================
-- 16. MOVIMIENTOS DE STOCK
-- ============================================================
CREATE TABLE movimientos_stock (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL,
    sucursal_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    cantidad_anterior INTEGER NOT NULL,
    cantidad_nueva INTEGER NOT NULL,
    cantidad_modificada INTEGER NOT NULL,
    descripcion TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/La_Paz', NOW()),
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- ============================================================
-- 17. CUPONES
--     (incluye empleado_id opcional, ON DELETE SET NULL)
-- ============================================================
CREATE TABLE cupones (
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
    -- 0=inactivo, 1=activo, 2=eliminado
    estado SMALLINT DEFAULT 1 CHECK (estado IN (0, 1, 2)),
    -- Empleado al que pertenece el cupón (opcional). NULL = cupón general
    empleado_id INTEGER NULL,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE SET NULL
);

CREATE TABLE cupon_sucursal (
    id SERIAL PRIMARY KEY,
    cupon_id INTEGER NOT NULL,
    sucursal_id INTEGER NOT NULL,
    FOREIGN KEY (cupon_id) REFERENCES cupones(id) ON DELETE CASCADE,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE CASCADE,
    UNIQUE(cupon_id, sucursal_id)
);

-- ============================================================
-- 18. VENTAS DE SERVICIOS
-- ============================================================
CREATE TABLE ventas_servicios (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER NOT NULL,
    empleado_id INTEGER NOT NULL,
    cupon_id INTEGER,
    subtotal DECIMAL(15, 2) NOT NULL,
    descuento DECIMAL(15, 2) DEFAULT 0,
    descripcion_descuento TEXT,
    total DECIMAL(15, 2) NOT NULL,
    forma_pago VARCHAR(20) CHECK (forma_pago IN ('efectivo', 'qr', 'mixto')),
    detalle_pago TEXT,
    sucursal_id INTEGER NOT NULL,
    caja_id INTEGER NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/La_Paz', NOW()),
    FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE RESTRICT,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE RESTRICT,
    FOREIGN KEY (cupon_id) REFERENCES cupones(id) ON DELETE SET NULL,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT,
    FOREIGN KEY (caja_id) REFERENCES cajas(id) ON DELETE RESTRICT
);

CREATE TABLE detalle_venta_servicios (
    id SERIAL PRIMARY KEY,
    venta_servicio_id INTEGER NOT NULL,
    inscripcion_id INTEGER NOT NULL,
    precio DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (venta_servicio_id) REFERENCES ventas_servicios(id) ON DELETE CASCADE,
    FOREIGN KEY (inscripcion_id) REFERENCES inscripciones(id) ON DELETE RESTRICT
);

-- ============================================================
-- 19. VENTAS DE PRODUCTOS
-- ============================================================
CREATE TABLE ventas_productos (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER NOT NULL,
    cupon_id INTEGER,
    subtotal DECIMAL(15, 2) NOT NULL,
    descuento DECIMAL(15, 2) DEFAULT 0,
    descripcion_descuento TEXT,
    total DECIMAL(15, 2) NOT NULL,
    forma_pago VARCHAR(20) CHECK (forma_pago IN ('efectivo', 'qr', 'mixto')),
    detalle_pago TEXT,
    sucursal_id INTEGER NOT NULL,
    caja_id INTEGER NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/La_Paz', NOW()),
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE RESTRICT,
    FOREIGN KEY (cupon_id) REFERENCES cupones(id) ON DELETE SET NULL,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT,
    FOREIGN KEY (caja_id) REFERENCES cajas(id) ON DELETE RESTRICT
);

CREATE TABLE detalle_venta_productos (
    id SERIAL PRIMARY KEY,
    venta_producto_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(15, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (venta_producto_id) REFERENCES ventas_productos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT
);

-- ============================================================
-- 20. MOVIMIENTOS DE CAJA
-- ============================================================
CREATE TABLE movimientos_caja (
    id SERIAL PRIMARY KEY,
    caja_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('apertura', 'ingreso', 'egreso', 'cierre')),
    descripcion TEXT,
    monto_anterior DECIMAL(10,2) DEFAULT 0,
    monto_actual DECIMAL(10,2) DEFAULT 0,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/La_Paz', NOW()),
    venta_servicio_id INTEGER,
    venta_producto_id INTEGER,
    FOREIGN KEY (caja_id) REFERENCES cajas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (venta_servicio_id) REFERENCES ventas_servicios(id) ON DELETE SET NULL,
    FOREIGN KEY (venta_producto_id) REFERENCES ventas_productos(id) ON DELETE SET NULL
);

-- ============================================================
-- 21. REGISTROS DE ACCESO
-- ============================================================
CREATE TABLE registros_acceso (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER NOT NULL,
    servicio_id INTEGER,
    inscripcion_id INTEGER,
    detalle TEXT,
    estado VARCHAR(20) CHECK (estado IN ('exitoso', 'denegado')),
    sucursal_id INTEGER NOT NULL,
    usuario_registro_id INTEGER NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/La_Paz', NOW()),
    tipo_persona VARCHAR(20) CHECK (tipo_persona IN ('cliente', 'empleado')),
    FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE SET NULL,
    FOREIGN KEY (inscripcion_id) REFERENCES inscripciones(id) ON DELETE SET NULL,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_registro_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- ============================================================
-- 22. PAGOS PENDIENTES
-- ============================================================
CREATE TABLE pagos_pendientes (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER NOT NULL,
    venta_servicio_id INTEGER NOT NULL,
    monto_total DECIMAL(15, 2) NOT NULL,
    monto_pagado DECIMAL(15, 2) NOT NULL DEFAULT 0,
    monto_pendiente DECIMAL(15, 2) NOT NULL,
    fecha_inscripcion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/La_Paz', NOW()),
    fecha_ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/La_Paz', NOW()),
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'cancelado', 'completado')),
    FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE RESTRICT,
    FOREIGN KEY (venta_servicio_id) REFERENCES ventas_servicios(id) ON DELETE RESTRICT
);

-- ============================================================
-- 23. OBJETIVOS MENSUALES
-- ============================================================
CREATE TABLE objetivos_mensuales (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER NOT NULL,
    mes VARCHAR(7) NOT NULL,
    objetivo DECIMAL(15, 2) NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario_creacion_id INTEGER,
    -- 0=inactivo, 1=activo, 2=eliminado
    estado SMALLINT DEFAULT 1 CHECK (estado IN (0, 1, 2)),
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_creacion_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE(sucursal_id, mes)
);

-- ============================================================
-- 24. REPORTES ZUMBA
-- ============================================================
CREATE TABLE reportes_zumba (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    instructor_id INTEGER NOT NULL,
    numero_personas INTEGER NOT NULL CHECK (numero_personas >= 0),
    registrado_por_id INTEGER NOT NULL,
    registrado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/La_Paz', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/La_Paz', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/La_Paz', NOW()),
    FOREIGN KEY (instructor_id) REFERENCES empleados(id) ON DELETE RESTRICT,
    FOREIGN KEY (registrado_por_id) REFERENCES empleados(id) ON DELETE RESTRICT
);

-- ============================================================
-- 25. SUSCRIPCIÓN (flag de licencia para la app)
-- ============================================================
CREATE TABLE suscripcion (
    id SERIAL PRIMARY KEY,
    pagado BOOLEAN NOT NULL DEFAULT false
);

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

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_personas_ci ON personas(ci);
CREATE INDEX idx_personas_nombre_apellido ON personas(nombres, apellidos);
CREATE INDEX idx_empleados_sucursal ON empleados(sucursal_id);
CREATE INDEX idx_horarios_empleado_empleado ON horarios_empleado(empleado_id);
CREATE INDEX idx_horarios_empleado_dia ON horarios_empleado(dia_semana);
CREATE INDEX idx_horarios_empleado_sucursal ON horarios_empleado(sucursal_id);
CREATE INDEX idx_horarios_empleado_empleado_dia ON horarios_empleado(empleado_id, dia_semana);
CREATE INDEX idx_inscripciones_persona ON inscripciones(persona_id);
CREATE INDEX idx_inscripciones_vencimiento ON inscripciones(fecha_vencimiento);
CREATE INDEX idx_inscripciones_sucursal ON inscripciones(sucursal_id);
CREATE INDEX idx_inscripciones_persona_estado ON inscripciones(persona_id, estado_inscripcion);
CREATE INDEX idx_inscripciones_servicio_estado ON inscripciones(servicio_id, estado_inscripcion);
CREATE INDEX idx_registros_acceso_fecha ON registros_acceso(fecha);
CREATE INDEX idx_registros_acceso_tipo ON registros_acceso(tipo_persona);
CREATE INDEX idx_registros_acceso_inscripcion ON registros_acceso(inscripcion_id);
CREATE INDEX idx_registros_acceso_inscripcion_fecha ON registros_acceso(inscripcion_id, fecha);
CREATE INDEX idx_ventas_servicios_fecha ON ventas_servicios(fecha);
CREATE INDEX idx_ventas_productos_fecha ON ventas_productos(fecha);
CREATE INDEX idx_ventas_productos_cupon ON ventas_productos(cupon_id);
CREATE INDEX idx_ventas_servicios_cupon ON ventas_servicios(cupon_id);
CREATE INDEX idx_usuarios_clientes_username ON usuarios_clientes(username);
CREATE INDEX idx_empleado_caja_asignacion ON empleado_caja(empleado_id, caja_id);
CREATE INDEX idx_servicios_multisucursal ON servicios(multisucursal);
CREATE INDEX idx_servicios_tipo_servicio ON servicios(tipo_servicio_id);
CREATE INDEX idx_servicios_estado ON servicios(estado);
CREATE INDEX idx_servicio_sucursal_disponible ON servicio_sucursal(disponible);
CREATE INDEX idx_servicio_sucursal_multisucursal ON servicio_sucursal(multisucursal);
CREATE INDEX idx_pagos_pendientes_persona ON pagos_pendientes(persona_id);
CREATE INDEX idx_pagos_pendientes_estado ON pagos_pendientes(estado);
CREATE INDEX idx_pagos_pendientes_fecha ON pagos_pendientes(fecha_inscripcion);
CREATE INDEX idx_movimientos_caja_fecha ON movimientos_caja(fecha DESC);
CREATE INDEX idx_movimientos_caja_caja ON movimientos_caja(caja_id);
CREATE INDEX idx_movimientos_caja_tipo ON movimientos_caja(tipo);
CREATE INDEX idx_movimientos_stock_fecha ON movimientos_stock(fecha);
CREATE INDEX idx_movimientos_stock_producto ON movimientos_stock(producto_id, sucursal_id);
CREATE INDEX idx_cupones_codigo ON cupones(codigo);
CREATE INDEX idx_cupones_estado ON cupones(estado);
CREATE INDEX idx_cupones_fechas ON cupones(fecha_inicio, fecha_fin);
CREATE INDEX idx_cupones_empleado ON cupones(empleado_id);       -- ⭐ NUEVO
CREATE INDEX idx_cupon_sucursal_cupon ON cupon_sucursal(cupon_id);
CREATE INDEX idx_cupon_sucursal_sucursal ON cupon_sucursal(sucursal_id);
CREATE INDEX idx_horarios_servicio_dia ON horarios_servicio(dia_semana);
CREATE INDEX idx_horarios_servicio_servicio ON horarios_servicio(servicio_id);
CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_landing ON productos(landing);
CREATE INDEX idx_productos_estado ON productos(estado);
CREATE INDEX idx_cajas_estado_caja ON cajas(estado_caja);
CREATE INDEX idx_objetivos_sucursal_mes ON objetivos_mensuales(sucursal_id, mes);
CREATE INDEX idx_objetivos_mes ON objetivos_mensuales(mes);
CREATE INDEX idx_objetivos_estado ON objetivos_mensuales(estado);
CREATE INDEX idx_reportes_zumba_fecha ON reportes_zumba(fecha DESC);
CREATE INDEX idx_reportes_zumba_instructor ON reportes_zumba(instructor_id);
CREATE INDEX idx_mov_fechas_insc_inscripcion ON movimientos_fechas_inscripcion(inscripcion_id);
CREATE INDEX idx_mov_fechas_insc_persona ON movimientos_fechas_inscripcion(persona_id);
CREATE INDEX idx_mov_fechas_insc_usuario ON movimientos_fechas_inscripcion(usuario_id);
CREATE INDEX idx_mov_fechas_insc_fecha ON movimientos_fechas_inscripcion(fecha DESC);

-- ============================================================
-- COMENTARIOS
-- ============================================================
COMMENT ON COLUMN personas.estado IS '0=inactivo, 1=activo';
COMMENT ON COLUMN sucursales.estado IS '0=inactivo, 1=activo, 2=eliminado';
COMMENT ON COLUMN empleados.estado IS '0=inactivo, 1=activo, 2=eliminado';
COMMENT ON COLUMN usuarios.estado IS '0=inactivo, 1=activo, 2=eliminado';
COMMENT ON COLUMN usuarios_clientes.estado IS '0=inactivo, 1=activo, 2=eliminado';
COMMENT ON COLUMN empleado_caja.estado IS '0=inactivo, 1=activo, 2=eliminado';
COMMENT ON COLUMN tipos_servicio.estado IS '0=inactivo, 1=activo, 2=eliminado';
COMMENT ON COLUMN servicios.estado IS '0=inactivo, 1=activo, 2=eliminado';
COMMENT ON COLUMN inscripciones.estado IS '0=inactivo, 1=activo, 2=eliminado';
COMMENT ON COLUMN inscripciones.estado_inscripcion IS 'activo | inactivo. Se calcula según fechas y reglas de reemplazo/futuro.';
COMMENT ON COLUMN productos.estado IS '0=inactivo, 1=activo, 2=eliminado';
COMMENT ON COLUMN cupones.estado IS '0=inactivo, 1=activo, 2=eliminado';
COMMENT ON COLUMN objetivos_mensuales.estado IS '0=inactivo, 1=activo, 2=eliminado';

COMMENT ON COLUMN productos.imagen IS 'Imagen del producto en formato BYTEA';
COMMENT ON COLUMN productos.codigo IS 'Código de barras del producto';
COMMENT ON COLUMN productos.landing IS 'Si se muestra en la página de inicio';
COMMENT ON COLUMN producto_sucursal.stock_minimo IS 'Stock mínimo para alertas';
COMMENT ON COLUMN horarios_empleado.sucursal_id IS 'Sucursal donde el empleado trabaja ese horario. NULL = hereda del empleado';
COMMENT ON TABLE cupones IS 'Cupones de descuento para servicios y productos';
COMMENT ON COLUMN cupones.empleado_id IS 'Empleado al que pertenece el cupón. NULL = cupón general.';
COMMENT ON TABLE cupon_sucursal IS 'Sucursales donde aplica cada cupón';
COMMENT ON COLUMN cajas.estado_caja IS 'abierta | cerrada';
COMMENT ON COLUMN cajas.total IS 'Monto actual en la caja';
COMMENT ON TABLE movimientos_caja IS 'Todos los movimientos de dinero por caja';
COMMENT ON TABLE objetivos_mensuales IS 'Objetivos de ventas mensuales por sucursal';
COMMENT ON COLUMN objetivos_mensuales.mes IS 'Mes en formato YYYY-MM (ej: 2024-03)';
COMMENT ON COLUMN registros_acceso.inscripcion_id IS 'Inscripción específica a la que corresponde el acceso (para bloquear doble ingreso por día por inscripción).';
COMMENT ON TABLE movimientos_fechas_inscripcion IS 'Auditoría de cambios de fechas (inicio/vencimiento) en inscripciones';

-- ============================================================
-- VISTA: ventas_mensuales_por_sucursal
-- ============================================================
CREATE OR REPLACE VIEW ventas_mensuales_por_sucursal AS
SELECT 
    sucursal_id,
    TO_CHAR(fecha, 'YYYY-MM') AS mes,
    SUM(total) AS total_ventas,
    COUNT(*) AS cantidad_ventas,
    SUM(CASE WHEN tipo = 'servicio' THEN total ELSE 0 END) AS ventas_servicios,
    SUM(CASE WHEN tipo = 'producto' THEN total ELSE 0 END) AS ventas_productos
FROM (
    SELECT sucursal_id, fecha, total, 'servicio' AS tipo
    FROM ventas_servicios
    UNION ALL
    SELECT sucursal_id, fecha, total, 'producto' AS tipo
    FROM ventas_productos
) AS todas_ventas
GROUP BY sucursal_id, TO_CHAR(fecha, 'YYYY-MM');

COMMENT ON VIEW ventas_mensuales_por_sucursal 
    IS 'Ventas agregadas por sucursal y mes (servicios + productos)';

-- ============================================================
-- FUNCIÓN: sp_obtener_personas_por_sucursal
-- ============================================================
CREATE OR REPLACE FUNCTION sp_obtener_personas_por_sucursal(p_sucursal_id integer)
RETURNS TABLE(
    id integer,
    nombres varchar,
    apellidos varchar,
    ci varchar,
    telefono varchar,
    fecha_nacimiento date,
    huella_digital bytea,
    estado smallint
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.id, p.nombres, p.apellidos, p.ci, p.telefono,
        p.fecha_nacimiento, p.huella_digital, p.estado
    FROM personas p
    WHERE p.huella_digital IS NOT NULL
    AND p.id IN (
        SELECT e.persona_id
        FROM empleados e
        WHERE e.sucursal_id = p_sucursal_id

        UNION

        SELECT i.persona_id
        FROM inscripciones i
        WHERE i.sucursal_id = p_sucursal_id

        UNION

        SELECT i.persona_id
        FROM inscripciones i
        INNER JOIN servicios s ON s.id = i.servicio_id
        INNER JOIN servicio_sucursal ss ON ss.servicio_id = s.id
        WHERE s.multisucursal = true
          AND ss.sucursal_id = p_sucursal_id
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION sp_obtener_personas_por_sucursal(integer) TO PUBLIC;

-- ============================================================
-- DATOS DE PRUEBA
-- ============================================================

-- Sucursales
INSERT INTO sucursales (nombre, estado) VALUES
('Principal', 1),
('Secundaria', 1);

-- Persona administrador
INSERT INTO personas (nombres, apellidos, ci, telefono, estado) VALUES
('Administrador', 'Sistema', '1234567', '000000000', 1);

-- Empleado administrador
INSERT INTO empleados (persona_id, rol, sucursal_id, sueldo, comision, estado) VALUES
(1, 'admin', 1, 0, NULL, 1);

-- Cajas
INSERT INTO cajas (nombre, estado_caja, total, sucursal_id) VALUES
('Caja Principal', 'cerrada', 0, 1),
('Caja Secundaria', 'cerrada', 0, 2);

-- Usuario administrador
INSERT INTO usuarios (username, password_hash, empleado_id, estado) VALUES
('spiderlabs', '$2b$10$mCKLFpGKiWVeLl9f4rtW8uk84bIg9UIi1XXcF7kfXydSQVOvdk6JO', 1, 1);

-- Tipos de servicio
INSERT INTO tipos_servicio (nombre, estado) VALUES
('Gimnasio', 1),
('Zumba', 1),
('Entrenamiento', 1);

-- Suscripción
INSERT INTO suscripcion (pagado) VALUES (true);