// Configuration and Definitions of Available Modules in Los Pits App

export const ALL_AVAILABLE_MODULES = [
  {
    id: "dashboard",
    label: "Dashboard General",
    categoria: "General",
    iconName: "Gauge",
    desc: "Centro de mando y resumen métrico en tiempo real con estadísticas y balance general.",
    core: true
  },
  {
    id: "citas",
    label: "Citas & Agenda",
    categoria: "Operaciones",
    iconName: "CalendarClock",
    desc: "Programación de citas futuras para taller o carwash con recordatorios automáticos por WhatsApp."
  },
  {
    id: "taller",
    label: "Taller Mecánico",
    categoria: "Operaciones",
    iconName: "Wrench",
    desc: "Gestión integral de órdenes mecánicas, técnicos asignados, inspección visual, cotizaciones y estados."
  },
  {
    id: "carwash",
    label: "Carwash Express",
    categoria: "Operaciones",
    iconName: "Car",
    desc: "Control de vehículos en lavado, selección de tipo de servicio, lavadores y consumo de insumos."
  },
  {
    id: "pantalla",
    label: "Pantalla Monitor en Vivo",
    categoria: "Operaciones",
    iconName: "Tv",
    desc: "Pantalla digital de avance para sala de espera que muestra a los clientes el estado de sus autos."
  },
  {
    id: "parqueo",
    label: "Parqueo / Estacionamiento",
    categoria: "Operaciones",
    iconName: "CircleParking",
    desc: "Control de entradas, tickets de parqueo, tarifas por hora o fracción y cálculo automático de cobro."
  },
  {
    id: "bodega",
    label: "Bodega & Inventario de Taller",
    categoria: "Inventarios",
    iconName: "Warehouse",
    desc: "Catálogo de repuestos mecánicos, niveles de stock, precios de compra/venta y alertas de stock mínimo."
  },
  {
    id: "cafeteria",
    label: "Cafetería / Snack Bar",
    categoria: "Ventas",
    iconName: "Coffee",
    desc: "Punto de venta y control de inventario de bebidas, café y alimentos para clientes en sala de espera."
  },
  {
    id: "tienda",
    label: "Tienda POS / Mostrador",
    categoria: "Ventas",
    iconName: "Store",
    desc: "Venta directa al público de lubricantes, aditivos, productos de limpieza y artículos de mostrador."
  },
  {
    id: "accesorios",
    label: "Accesorios POS",
    categoria: "Ventas",
    iconName: "ShoppingBag",
    desc: "Inventario y punto de venta especializado en accesorios automotrices, alarmas y tecnología."
  },
  {
    id: "repuestosFaltantes",
    label: "Repuestos Faltantes & Pedidos",
    categoria: "Compras",
    iconName: "ShoppingCart",
    desc: "Control y seguimiento de piezas solicitadas por los mecánicos para órdenes activas de taller."
  },
  {
    id: "cuentas",
    label: "Cuentas por Pagar & Cobrar",
    categoria: "Finanzas",
    iconName: "Receipt",
    desc: "Seguimiento de saldos pendientes a crédito con clientes y facturas pendientes con proveedores."
  },
  {
    id: "compras",
    label: "Compras Generales & Gastos",
    categoria: "Compras",
    iconName: "Wallet",
    desc: "Registro de facturas de compras, gastos operativos, insumos de limpieza y proveedores."
  },
  {
    id: "vehiculosVenta",
    label: "Vehículos en Venta (Predio)",
    categoria: "Ventas",
    iconName: "Car",
    desc: "Exhibición y catálogo de autos en venta o consignación con fotos, precios y detalles técnicos."
  },
  {
    id: "clientesVehiculos",
    label: "Clientes & Vehículos",
    categoria: "Clientes",
    iconName: "Users",
    desc: "Directorio centralizado de clientes, datos de facturación (NIT) y padrón general de vehículos."
  },
  {
    id: "recompensas",
    label: "Recompensas Pits (Fidelización)",
    categoria: "Clientes",
    iconName: "Gift",
    desc: "Programa de puntos por consumo, canje de premios, cupones de descuento y pases referidos."
  },
  {
    id: "portal",
    label: "Portal Cliente & Wallet QR",
    categoria: "Clientes",
    iconName: "Smartphone",
    desc: "Enlace web para que los clientes consulten su saldo de puntos y estado de vehículo desde su teléfono."
  },
  {
    id: "historial",
    label: "Historial Clínico Vehicular",
    categoria: "Operaciones",
    iconName: "History",
    desc: "Expediente digital de mantenimientos, reparaciones pasadas y servicios por placa o chasis."
  },
  {
    id: "cotizacionesVendedores",
    label: "Cotizar con Proveedores",
    categoria: "Compras",
    iconName: "ShoppingBag",
    desc: "Portal para solicitar presupuestos de repuestos a diferentes distribuidores externos."
  },
  {
    id: "finanzas",
    label: "Finanzas & Cuadre de Caja",
    categoria: "Finanzas",
    iconName: "TrendingUp",
    desc: "Cierre diario de caja (efectivo vs bancos), cálculo de nómina/comisiones y balance general."
  },
  {
    id: "configuracion",
    label: "Configuración del Sistema",
    categoria: "General",
    iconName: "Settings",
    desc: "Personalización de marca, usuarios, permisos, costos fijos y módulos activos.",
    core: true
  }
];

export const DEFAULT_ACTIVE_MODULES = ALL_AVAILABLE_MODULES.map(m => m.id);

export const MODULE_PRESETS = [
  {
    id: "full",
    nombre: "🚀 Suite Completa (Todos)",
    desc: "Activa todos los módulos de Taller, Carwash, Parqueo, Ventas y Finanzas.",
    modules: ALL_AVAILABLE_MODULES.map(m => m.id)
  },
  {
    id: "taller_completo",
    nombre: "🔧 Solo Taller Mecánico",
    desc: "Especializado para talleres de mecánica, diagnóstico e inspección.",
    modules: ["dashboard", "citas", "taller", "pantalla", "bodega", "repuestosFaltantes", "clientesVehiculos", "historial", "cuentas", "compras", "cotizacionesVendedores", "finanzas", "recompensas", "portal", "configuracion"]
  },
  {
    id: "carwash_express",
    nombre: "🧼 Solo Carwash / Detailing",
    desc: "Optimizado para centros de lavado express, detailing y cafetería.",
    modules: ["dashboard", "citas", "carwash", "pantalla", "cafeteria", "tienda", "clientesVehiculos", "recompensas", "portal", "finanzas", "compras", "configuracion"]
  },
  {
    id: "taller_carwash_parqueo",
    nombre: "🚗 Taller + Carwash + Parqueo",
    desc: "Combo automotriz integral para centros de servicio con estacionamiento.",
    modules: ["dashboard", "citas", "taller", "carwash", "parqueo", "pantalla", "bodega", "cafeteria", "tienda", "clientesVehiculos", "historial", "recompensas", "portal", "cuentas", "compras", "finanzas", "configuracion"]
  },
  {
    id: "taller_basico",
    nombre: "⚡ Taller Rápido / Básico",
    desc: "Configuración ligera sin módulos comerciales secundarios.",
    modules: ["dashboard", "citas", "taller", "bodega", "clientesVehiculos", "historial", "finanzas", "configuracion"]
  }
];

export const isModuleActive = (moduleId, activeModules) => {
  if (moduleId === "dashboard" || moduleId === "configuracion" || moduleId === "saasAdmin") return true;
  if (!Array.isArray(activeModules)) return true; // Si no está configurado aún, asumir activo
  return activeModules.includes(moduleId);
};
