import { useState, useEffect, useRef } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Taller from "./components/Taller";
import Carwash from "./components/Carwash";
import Parking from "./components/Parking";
import Inventory from "./components/Inventory";
import Cafeteria from "./components/Cafeteria";
import Finance from "./components/Finance";
import Settings from "./components/Settings";
import RepuestosFaltantes from "./components/RepuestosFaltantes";
import VehicleHistory from "./components/VehicleHistory";
import Tienda from "./components/Tienda";
import Cuentas from "./components/Cuentas";
import VehiculosVenta from "./components/VehiculosVenta";
import ClientesVehiculos from "./components/ClientesVehiculos";
import Compras from "./components/Compras";
import Accesorios from "./components/Accesorios";
import { getLocalStorage, setLocalStorage } from "./utils/storage";
import { getSupabaseClient, syncKeyToCloud, safeParseJSON } from "./utils/supabase";

// ☁️ GLOBAL CLOUD SYNC STATE (Saves data across React remounts/Strict Mode)
const globalLastSynced = {};
const globalSyncFlags = {
  isInitialPullDone: false,
  isInitialPullSucceeded: false,
  isInitialPullInProgress: false
};
const globalActiveSetters = {
  usuarios: null,
  ordenes: null,
  carwash: null,
  parkingEntries: null,
  parkingRate: null,
  parkingHistory: null,
  vehiculosVenta: null,
  workshopInventory: null,
  cafeteriaInventory: null,
  cafeteriaSales: null,
  comisionMecanico: null,
  dashboardPeriod: null,
  customStartDate: null,
  customEndDate: null,
  carwashPresets: null,
  carwashInventory: null,
  carwashConsumption: null,
  tiendaSales: null,
  cuentasPorCobrar: null,
  cuentasPorPagar: null,
  fixedCosts: null,
  clientes: null,
  vehiculos: null,
  compras: null,
  toolsInventory: null,
  accesoriosInventory: null,
  setIsInitialPullDone: null,
  setRealtimeStatus: null
};

const ARRAY_KEYS = [
  "usuarios",
  "ordenes",
  "carwash",
  "parkingEntries",
  "parkingHistory",
  "vehiculosVenta",
  "workshopInventory",
  "cafeteriaInventory",
  "cafeteriaSales",
  "carwashPresets",
  "carwashInventory",
  "carwashConsumption",
  "tiendaSales",
  "cuentasPorCobrar",
  "cuentasPorPagar",
  "fixedCosts",
  "clientes",
  "vehiculos",
  "compras",
  "toolsInventory",
  "accesoriosInventory"
];

const MOCK_CLIENT_NAMES = ["mariana estévez", "mariana estevez", "carlos mendoza", "alejandro ruiz"];
const MOCK_VEHICLE_PLATES = ["P-984FLB", "P-420DSK", "P-112HJD", "P-456GBD", "P-789DKS"];

const filterOutMockItems = (key, list) => {
  if (!Array.isArray(list)) return list;
  return list.filter(item => {
    if (!item) return false;
    if (key === "clientes") {
      const name = (item.nombre || "").toLowerCase().trim();
      if (MOCK_CLIENT_NAMES.includes(name)) return false;
    }
    if (key === "vehiculos") {
      const placa = (item.placa || "").toUpperCase().trim();
      if (MOCK_VEHICLE_PLATES.includes(placa)) return false;
    }
    if (key === "ordenes" || key === "carwash") {
      const mockIds = [1716301200000, 1716304800000, 1716308400000, 1716312000000, 1716315600000];
      if (mockIds.includes(item.id)) return false;
      const clienteStr = typeof item.cliente === "string" ? item.cliente.toLowerCase() : "";
      if (MOCK_CLIENT_NAMES.some(m => clienteStr.includes(m))) return false;
    }
    return true;
  });
};

// Helper to merge local cached array data with cloud data to prevent silent data wipes on initial connection
const mergeCollections = (key, localValRaw, cloudValRaw) => {
  const localVal = filterOutMockItems(key, safeParseJSON(localValRaw));
  const cloudVal = filterOutMockItems(key, safeParseJSON(cloudValRaw));

  if (!cloudVal || (Array.isArray(cloudVal) && cloudVal.length === 0)) {
    return Array.isArray(localVal) ? localVal : (cloudVal || []);
  }
  if (!localVal || (Array.isArray(localVal) && localVal.length === 0)) {
    return cloudVal;
  }

  if (Array.isArray(localVal) && Array.isArray(cloudVal)) {
    if (key === "clientes") {
      const mergedMap = new Map();
      cloudVal.forEach((c, idx) => {
        const id = (c.telefono && c.telefono.trim()) || (c.nombre && c.nombre.trim()) || `cloud_c_${idx}`;
        mergedMap.set(id, c);
      });
      localVal.forEach((c, idx) => {
        const id = (c.telefono && c.telefono.trim()) || (c.nombre && c.nombre.trim()) || `local_c_${idx}`;
        if (!mergedMap.has(id)) {
          mergedMap.set(id, c);
        }
      });
      return Array.from(mergedMap.values());
    }

    if (key === "vehiculos") {
      const mergedMap = new Map();
      cloudVal.forEach((v, idx) => {
        const id = (v.placa && v.placa.trim().toUpperCase()) || (v.chasis && v.chasis.trim().toUpperCase()) || `cloud_v_${idx}`;
        mergedMap.set(id, v);
      });
      localVal.forEach((v, idx) => {
        const id = (v.placa && v.placa.trim().toUpperCase()) || (v.chasis && v.chasis.trim().toUpperCase()) || `local_v_${idx}`;
        if (!mergedMap.has(id)) {
          mergedMap.set(id, v);
        }
      });
      return Array.from(mergedMap.values());
    }

    // For all other array keys (ordenes, carwash, parkingHistory, workshopInventory, etc.)
    const mergedMap = new Map();
    cloudVal.forEach((item, idx) => {
      const id = item && item.id !== undefined ? String(item.id) : `cloud_item_${idx}`;
      mergedMap.set(id, item);
    });
    localVal.forEach((item, idx) => {
      const id = item && item.id !== undefined ? String(item.id) : `local_item_${idx}`;
      if (!mergedMap.has(id)) {
        mergedMap.set(id, item);
      }
    });
    return Array.from(mergedMap.values());
  }

  return cloudVal;
};


export default function App() {
  // 🔐 USER DEFINITIONS
  const [usuarios, setUsuarios] = useState(() => {
    const defaultUsers = [
      { user: "admin", pass: "1234", rol: "admin", permissions: ["dashboard", "taller", "carwash", "parqueo", "bodega", "cafeteria", "finanzas", "repuestosFaltantes", "configuracion", "historial", "tienda", "cuentas", "vehiculosVenta", "clientesVehiculos", "compras", "accesorios"], salarioBase: 0, comisionTaller: 10, comisionCarwash: 7, comisionarLabor: true, comisionarRepuestos: false, comisionarCarwash: true, comisionRepuestos: 0 },
      { user: "cajero", pass: "1234", rol: "cajero", permissions: ["dashboard", "taller", "carwash", "parqueo", "bodega", "cafeteria", "finanzas", "configuracion", "historial", "tienda", "cuentas", "vehiculosVenta", "clientesVehiculos", "compras", "accesorios"], salarioBase: 3000, comisionTaller: 10, comisionCarwash: 7, comisionarLabor: true, comisionarRepuestos: false, comisionarCarwash: true, comisionRepuestos: 0 },
      { user: "mecanico", pass: "1234", rol: "mecanico", permissions: ["taller", "historial"], salarioBase: 2500, comisionTaller: 10, comisionCarwash: 0, comisionarLabor: true, comisionarRepuestos: false, comisionarCarwash: false, comisionRepuestos: 0 },
      { user: "lavador", pass: "1234", rol: "lavador", permissions: ["carwash"], salarioBase: 2000, comisionTaller: 0, comisionCarwash: 7, comisionarLabor: false, comisionarRepuestos: false, comisionarCarwash: true, comisionRepuestos: 0 },
      { user: "jefe", pass: "1234", rol: "jefe de taller", permissions: ["dashboard", "taller", "repuestosFaltantes", "historial"], salarioBase: 4000, comisionTaller: 10, comisionCarwash: 0, comisionarLabor: true, comisionarRepuestos: true, comisionarCarwash: false, comisionRepuestos: 5 }
    ];
    const val = getLocalStorage("usuarios", defaultUsers);
    const loaded = Array.isArray(val) ? val : defaultUsers;
    return loaded.map(u => {
      const perms = u.permissions || [];
      const updatedPerms = (u.rol === "admin" || u.rol === "cajero")
        ? [...new Set([...perms, "finanzas", "configuracion", "tienda", "cuentas", "vehiculosVenta", "clientesVehiculos", "compras", "accesorios"])]
        : perms;
      
      const comisionarLabor = u.comisionarLabor !== undefined ? u.comisionarLabor : (u.rol?.toLowerCase() !== "lavador");
      const comisionarRepuestos = u.comisionarRepuestos !== undefined ? u.comisionarRepuestos : (u.rol?.toLowerCase() === "jefe de taller");
      const comisionarCarwash = u.comisionarCarwash !== undefined ? u.comisionarCarwash : (u.rol?.toLowerCase() === "lavador" || u.rol?.toLowerCase() === "admin" || u.rol?.toLowerCase() === "cajero");
      const comisionRepuestos = u.comisionRepuestos !== undefined ? u.comisionRepuestos : (u.rol?.toLowerCase() === "jefe de taller" ? 5 : 0);

      return {
        ...u,
        permissions: updatedPerms,
        comisionarLabor,
        comisionarRepuestos,
        comisionarCarwash,
        comisionRepuestos
      };
    });
  });

  const listMecanicos = Array.from(new Set(
    usuarios
      .filter(u => {
        const r = (u.rol || "").trim().toLowerCase();
        return r === "mecanico" || r === "mecánico" || r === "jefe de taller" || r === "jefe" || r === "admin" || r === "administrador" || r === "administradora";
      })
      .map(u => (u.user || "").trim())
      .filter(Boolean)
  ));
  const mecanicos = listMecanicos.length > 0 ? listMecanicos : ["Juan", "Pedro"];

  const listLavadores = Array.from(new Set(
    usuarios
      .filter(u => {
        const r = (u.rol || "").trim().toLowerCase();
        return r === "lavador" || r === "admin" || r === "administrador" || r === "administradora";
      })
      .map(u => (u.user || "").trim())
      .filter(Boolean)
  ));
  const lavadores = listLavadores.length > 0 ? listLavadores : ["Luis", "Carlos"];

  // 🔑 LOGIN STATES
  const [usuarioActual, setUsuarioActual] = useState(() => {
    return getLocalStorage("usuarioActual", null);
  });

  // 📂 ROUTING TAB STATE
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 🚗 INITIAL MOCK DATA (Gives a wow factor on first load)
  const initialOrdenes = [
    {
      id: 1716301200000,
      cliente: "Mariana Estévez",
      vehiculo: "Mazda 3 Gris (P-984FLB)",
      mecanico: "Juan",
      trabajo: "Servicio de alineación, balanceo de llantas y revisión de suspensión",
      fotos: [],
      estado: "Entregado",
      total: 350.00,
      comision: 35.00,
      fecha: new Date(Date.now() - 3600000 * 24).toISOString() // 1 day ago
    },
    {
      id: 1716304800000,
      cliente: "Carlos Mendoza",
      vehiculo: "Toyota Hilux Blanco (P-420DSK)",
      mecanico: "Pedro",
      trabajo: "Cambio de pastillas de freno delanteras y rectificación de discos",
      fotos: [],
      estado: "Listo para entrega",
      total: 1200.00,
      comision: 120.00,
      fecha: new Date(Date.now() - 3600000 * 8).toISOString() // 8 hours ago
    },
    {
      id: 1716308400000,
      cliente: "Alejandro Ruiz",
      vehiculo: "Honda Civic Negro (P-112HJD)",
      mecanico: "Juan",
      trabajo: "Cambio de aceite de motor de 10W-30, filtro de aceite y filtro de aire",
      fotos: [],
      estado: "En proceso de diagnóstico y presupuesto",
      total: 450.00,
      comision: 45.00,
      fecha: new Date().toISOString()
    }
  ];

  const initialCarwash = [
    {
      id: 1716312000000,
      cliente: "Juan José Pérez",
      telefono: "5544-3322",
      vehiculo: {
        placa: "P-456GBD",
        marca: "Honda",
        linea: "Civic"
      },
      tipo: "Grande",
      precio: 110.00,
      lavador: "Luis",
      estado: "Entregado",
      comision: 10.00,
      fecha: new Date(Date.now() - 3600000 * 4).toISOString() // 4 hours ago
    },
    {
      id: 1716315600000,
      cliente: "Sofía Montenegro",
      telefono: "4422-1188",
      vehiculo: {
        placa: "P-789DKS",
        marca: "Hyundai",
        linea: "Tucson"
      },
      tipo: "Mediano",
      precio: 90.00,
      lavador: "Carlos",
      estado: "En proceso",
      comision: 7.00,
      fecha: new Date().toISOString()
    }
  ];

  // 🔧 DATA STATES (Initialized with localStorage or realistic mock data)
  const initialWorkshopInventory = [
    { id: 1, code: "PA-01", name: "Pastillas de freno Bosch (delanteras)", brand: "Bosch", quantity: 8, purchasePrice: 120.00, salePrice: 200.00, presentation: "Juego de 4 uds" },
    { id: 2, code: "AC-05", name: "Aceite Castrol 10W-30 (Galón)", brand: "Castrol", quantity: 12, purchasePrice: 150.00, salePrice: 220.00, presentation: "Galón" },
    { id: 3, code: "FI-02", name: "Filtro de aceite Fram", brand: "Fram", quantity: 15, purchasePrice: 35.00, salePrice: 65.00, presentation: "Unidad" },
    { id: 4, code: "BU-09", name: "Bujía NGK Iridium", brand: "NGK", quantity: 3, purchasePrice: 40.00, salePrice: 75.00, presentation: "Unidad" }
  ];

  const initialCafeteriaInventory = [
    { id: 1, name: "Café Americano 8oz", quantity: 30, purchasePrice: 3.50, salePrice: 8.00, presentation: "8 oz" },
    { id: 2, name: "Coca Cola 350ml", quantity: 24, purchasePrice: 4.50, salePrice: 7.00, presentation: "350 ml" },
    { id: 3, name: "Pan con Jamón y Queso", quantity: 10, purchasePrice: 6.00, salePrice: 15.00, presentation: "Porción" },
    { id: 4, name: "Galleta de Chispas de Chocolate", quantity: 4, purchasePrice: 2.50, salePrice: 5.00, presentation: "Unidad" }
  ];

  const [ordenes, setOrdenes] = useState(() => {
    const val = getLocalStorage("ordenes", []);
    const raw = Array.isArray(val) ? val : [];
    const filtered = filterOutMockItems("ordenes", raw);
    return filtered.map(o => {
      let migratedEstado = o.estado;
      if (o.estado === "En proceso") migratedEstado = "En proceso de reparación";
      else if (o.estado === "Listo") migratedEstado = "Listo para entrega";
      else if (o.estado === "Cobrado") migratedEstado = "Entregado";
      return { ...o, estado: migratedEstado };
    });
  });

  const [carwash, setCarwash] = useState(() => {
    const val = getLocalStorage("carwash", []);
    const raw = Array.isArray(val) ? val : [];
    const filtered = filterOutMockItems("carwash", raw);
    return filtered.map(c => {
      let migratedEstado = c.estado;
      if (c.estado === "Listo") migratedEstado = "Listo para entrega";
      else if (c.estado === "Cobrado") migratedEstado = "Entregado";
      return { ...c, estado: migratedEstado };
    });
  });

  const [parkingEntries, setParkingEntries] = useState(() => {
    const val = getLocalStorage("parkingEntries", []);
    return Array.isArray(val) ? val : [];
  });

  const [parkingRate, setParkingRate] = useState(() => {
    return getLocalStorage("parkingRate", 10.0);
  });

  const [parkingHistory, setParkingHistory] = useState(() => {
    const val = getLocalStorage("parkingHistory", []);
    return Array.isArray(val) ? val : [];
  });

  const [vehiculosVenta, setVehiculosVenta] = useState(() => {
    const val = getLocalStorage("vehiculosVenta", []);
    return Array.isArray(val) ? val : [];
  });

  const [workshopInventory, setWorkshopInventory] = useState(() => {
    const val = getLocalStorage("workshopInventory", initialWorkshopInventory);
    return Array.isArray(val) ? val : initialWorkshopInventory;
  });

  const [cafeteriaInventory, setCafeteriaInventory] = useState(() => {
    const val = getLocalStorage("cafeteriaInventory", initialCafeteriaInventory);
    return Array.isArray(val) ? val : initialCafeteriaInventory;
  });

  const [cafeteriaSales, setCafeteriaSales] = useState(() => {
    const val = getLocalStorage("cafeteriaSales", []);
    return Array.isArray(val) ? val : [];
  });

  const [comisionMecanico, setComisionMecanico] = useState(() => {
    return getLocalStorage("comisionMecanico", 0.10);
  });

  const [dashboardPeriod, setDashboardPeriod] = useState(() => {
    return getLocalStorage("dashboardPeriod", "mes");
  });

  const [customStartDate, setCustomStartDate] = useState(() => {
    return getLocalStorage("customStartDate", "");
  });

  const [customEndDate, setCustomEndDate] = useState(() => {
    return getLocalStorage("customEndDate", "");
  });

  const [carwashPresets, setCarwashPresets] = useState(() => {
    const defaultPresets = [
      { tipo: "Pequeño", precio: 70, comision: 5 },
      { tipo: "Mediano", precio: 90, comision: 7 },
      { tipo: "Grande", precio: 110, comision: 10 }
    ];
    const val = getLocalStorage("carwashPresets", defaultPresets);
    return Array.isArray(val) ? val : defaultPresets;
  });

  const [carwashInventory, setCarwashInventory] = useState(() => {
    const defaultInventory = [
      { id: 1, name: "Shampoo con Cera (Litro)", quantity: 10, purchasePrice: 45.00 },
      { id: 2, name: "Silicona para Llantas (Litro)", quantity: 5, purchasePrice: 60.00 },
      { id: 3, name: "Microfibras", quantity: 20, purchasePrice: 15.00 },
      { id: 4, name: "Aromatizante (Galón)", quantity: 2, purchasePrice: 80.00 }
    ];
    const val = getLocalStorage("carwashInventory", defaultInventory);
    return Array.isArray(val) ? val : defaultInventory;
  });

  const [carwashConsumption, setCarwashConsumption] = useState(() => {
    const val = getLocalStorage("carwashConsumption", []);
    return Array.isArray(val) ? val : [];
  });

  const [tiendaSales, setTiendaSales] = useState(() => {
    const val = getLocalStorage("tiendaSales", []);
    return Array.isArray(val) ? val : [];
  });

  const [cuentasPorCobrar, setCuentasPorCobrar] = useState(() => {
    const val = getLocalStorage("cuentasPorCobrar", []);
    return Array.isArray(val) ? val : [];
  });

  const [cuentasPorPagar, setCuentasPorPagar] = useState(() => {
    const val = getLocalStorage("cuentasPorPagar", []);
    return Array.isArray(val) ? val : [];
  });

  const [fixedCosts, setFixedCosts] = useState(() => {
    const defaultFixedCosts = [
      { id: 1, name: "Alquiler del Taller", amount: 3500 },
      { id: 2, name: "Planilla Fija", amount: 6000 },
      { id: 3, name: "Servicios Públicos (Luz y Agua)", amount: 800 },
      { id: 4, name: "Seguro y Conectividad", amount: 500 }
    ];
    const val = getLocalStorage("fixedCosts", defaultFixedCosts);
    return Array.isArray(val) ? val : defaultFixedCosts;
  });

  const [clientes, setClientes] = useState(() => {
    const val = getLocalStorage("clientes", []);
    const raw = Array.isArray(val) ? val : [];
    return filterOutMockItems("clientes", raw);
  });

  const [vehiculos, setVehiculos] = useState(() => {
    const val = getLocalStorage("vehiculos", []);
    const raw = Array.isArray(val) ? val : [];
    return filterOutMockItems("vehiculos", raw);
  });

  const [compras, setCompras] = useState(() => {
    const val = getLocalStorage("compras", []);
    return Array.isArray(val) ? val : [];
  });

  const [toolsInventory, setToolsInventory] = useState(() => {
    const val = getLocalStorage("toolsInventory", []);
    return Array.isArray(val) ? val : [];
  });

  const [accesoriosInventory, setAccesoriosInventory] = useState(() => {
    const val = getLocalStorage("accesoriosInventory", []);
    return Array.isArray(val) ? val : [];
  });

  // 💾 PERSISTENCE EFFECT
  useEffect(() => {
    setLocalStorage("usuarioActual", usuarioActual);
    
    // Set appropriate landing page/tab according to user role when logging in
    if (usuarioActual) {
      if (usuarioActual.rol === "mecanico") {
        setCurrentTab("taller");
      } else if (usuarioActual.rol === "lavador") {
        setCurrentTab("carwash");
      } else {
        setCurrentTab("dashboard");
      }
    }
  }, [usuarioActual]);

  // ☁️ CLOUD SYNC ENGINE (Supabase)
  const [isInitialPullDone, setIsInitialPullDone] = useState(globalSyncFlags.isInitialPullDone);
  const stateRef = useRef(null);
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");

  // Register active state setters on every render/mount so async callbacks target the correct instance
  useEffect(() => {
    globalActiveSetters.usuarios = setUsuarios;
    globalActiveSetters.ordenes = setOrdenes;
    globalActiveSetters.carwash = setCarwash;
    globalActiveSetters.parkingEntries = setParkingEntries;
    globalActiveSetters.parkingRate = setParkingRate;
    globalActiveSetters.parkingHistory = setParkingHistory;
    globalActiveSetters.vehiculosVenta = setVehiculosVenta;
    globalActiveSetters.workshopInventory = setWorkshopInventory;
    globalActiveSetters.cafeteriaInventory = setCafeteriaInventory;
    globalActiveSetters.cafeteriaSales = setCafeteriaSales;
    globalActiveSetters.comisionMecanico = setComisionMecanico;
    globalActiveSetters.dashboardPeriod = setDashboardPeriod;
    globalActiveSetters.customStartDate = setCustomStartDate;
    globalActiveSetters.customEndDate = setCustomEndDate;
    globalActiveSetters.carwashPresets = setCarwashPresets;
    globalActiveSetters.carwashInventory = setCarwashInventory;
    globalActiveSetters.carwashConsumption = setCarwashConsumption;
    globalActiveSetters.tiendaSales = setTiendaSales;
    globalActiveSetters.cuentasPorCobrar = setCuentasPorCobrar;
    globalActiveSetters.cuentasPorPagar = setCuentasPorPagar;
    globalActiveSetters.fixedCosts = setFixedCosts;
    globalActiveSetters.clientes = setClientes;
    globalActiveSetters.vehiculos = setVehiculos;
    globalActiveSetters.compras = setCompras;
    globalActiveSetters.toolsInventory = setToolsInventory;
    globalActiveSetters.accesoriosInventory = setAccesoriosInventory;
    globalActiveSetters.setIsInitialPullDone = setIsInitialPullDone;
    globalActiveSetters.setRealtimeStatus = setRealtimeStatus;

    return () => {
      // If we are still the active setters, clean up on unmount
      if (globalActiveSetters.usuarios === setUsuarios) {
        Object.keys(globalActiveSetters).forEach(key => {
          globalActiveSetters[key] = null;
        });
      }
    };
  });

  // Keep stateRef updated with the absolute latest values
  useEffect(() => {
    stateRef.current = {
      usuarios,
      ordenes,
      carwash,
      parkingEntries,
      parkingRate,
      parkingHistory,
      vehiculosVenta,
      workshopInventory,
      cafeteriaInventory,
      cafeteriaSales,
      comisionMecanico,
      dashboardPeriod,
      customStartDate,
      customEndDate,
      carwashPresets,
      carwashInventory,
      carwashConsumption,
      tiendaSales,
      cuentasPorCobrar,
      cuentasPorPagar,
      fixedCosts,
      clientes,
      vehiculos,
      compras,
      toolsInventory,
      accesoriosInventory
    };
  }, [
    usuarios,
    ordenes,
    carwash,
    parkingEntries,
    parkingRate,
    parkingHistory,
    vehiculosVenta,
    workshopInventory,
    cafeteriaInventory,
    cafeteriaSales,
    comisionMecanico,
    dashboardPeriod,
    customStartDate,
    customEndDate,
    carwashPresets,
    carwashInventory,
    carwashConsumption,
    tiendaSales,
    cuentasPorCobrar,
    cuentasPorPagar,
    fixedCosts,
    clientes,
    vehiculos,
    compras,
    toolsInventory,
    accesoriosInventory
  ]);

  // Sync a key-value pair to cloud if it has actually changed
  const syncToCloud = async (key, value) => {
    if (!isInitialPullDone) return; // Guard: prevent syncing local states before initial pull completes
    
    const client = getSupabaseClient();
    if (!client) return;

    if (!globalSyncFlags.isInitialPullSucceeded) {
      console.warn(`[Sync] Sincronización bloqueada para la llave "${key}" porque la descarga inicial de la nube no ha sido completada con éxito en este ciclo de vida.`);
      return;
    }
    
    const cleanVal = filterOutMockItems(key, safeParseJSON(value));
    const valueStr = JSON.stringify(cleanVal);
    if (globalLastSynced[key] === valueStr) {
      return; // Already in sync, avoid loops
    }
    
    globalLastSynced[key] = valueStr;
    await syncKeyToCloud(key, cleanVal);
  };

  const forcePullFromCloud = async () => {
    const client = getSupabaseClient();
    if (!client) {
      globalSyncFlags.isInitialPullSucceeded = true;
      globalSyncFlags.isInitialPullDone = true;
      const activeSetInitialPullDone = globalActiveSetters.setIsInitialPullDone || setIsInitialPullDone;
      const activeSetRealtimeStatus = globalActiveSetters.setRealtimeStatus || setRealtimeStatus;
      if (activeSetInitialPullDone) activeSetInitialPullDone(true);
      if (activeSetRealtimeStatus) activeSetRealtimeStatus("disconnected");
      return false;
    }

    try {
      const activeSetRealtimeStatus = globalActiveSetters.setRealtimeStatus || setRealtimeStatus;
      if (activeSetRealtimeStatus) activeSetRealtimeStatus("connecting");
      const { data, error } = await client.from('app_data').select('*');
      if (error) throw error;

      if (data && data.length > 0) {
        data.forEach(item => {
          const activeSetter = globalActiveSetters[item.key];
          let cloudValue = safeParseJSON(item.value);

          if (cloudValue !== null && cloudValue !== undefined) {
            const localValue = safeParseJSON(getLocalStorage(item.key, null));
            let mergedValue = mergeCollections(item.key, localValue, cloudValue);

            if (ARRAY_KEYS.includes(item.key) && !Array.isArray(mergedValue)) {
              if (mergedValue && typeof mergedValue === "object") {
                mergedValue = Object.values(mergedValue);
              } else {
                mergedValue = Array.isArray(cloudValue) ? cloudValue : [];
              }
            }

            const mergedValStr = JSON.stringify(mergedValue);
            globalLastSynced[item.key] = mergedValStr;
            if (activeSetter) activeSetter(mergedValue);
            setLocalStorage(item.key, mergedValue);
          }
        });
      }

      globalSyncFlags.isInitialPullSucceeded = true;
      globalSyncFlags.isInitialPullDone = true;
      if (activeSetRealtimeStatus) activeSetRealtimeStatus("connected");
      const activeSetInitialPullDone = globalActiveSetters.setIsInitialPullDone || setIsInitialPullDone;
      if (activeSetInitialPullDone) activeSetInitialPullDone(true);
      return true;
    } catch (err) {
      console.error("Error doing force pull from cloud:", err);
      const activeSetRealtimeStatus = globalActiveSetters.setRealtimeStatus || setRealtimeStatus;
      if (activeSetRealtimeStatus) activeSetRealtimeStatus("disconnected");
      const activeSetInitialPullDone = globalActiveSetters.setIsInitialPullDone || setIsInitialPullDone;
      if (activeSetInitialPullDone) activeSetInitialPullDone(true);
      return false;
    }
  };

  // Initial Sync from Cloud on mount
  useEffect(() => {
    forcePullFromCloud();
  }, []);

  // Subscribe to Realtime Postgres changes once initial pull is complete
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !isInitialPullDone) return;

    const channel = client
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_data' },
        (payload) => {
          if (!payload.new) return;
          const { key, value } = payload.new;
          
          if (value === null || value === undefined) {
            console.warn(`[Realtime Sync] Recibido valor nulo o indefinido para la llave "${key}". Se ignora para evitar pérdida de datos locales.`);
            return;
          }

          let sanitizedValue = safeParseJSON(value);
          
          if (ARRAY_KEYS.includes(key)) {
            sanitizedValue = filterOutMockItems(key, sanitizedValue);
            if (!Array.isArray(sanitizedValue)) {
              if (sanitizedValue && typeof sanitizedValue === "object") {
                sanitizedValue = Object.values(sanitizedValue);
              } else {
                console.warn(`[Realtime Sync] Se recibió un valor que no es arreglo para la llave "${key}". Ignorando.`);
                return;
              }
            }
          }

          const sanitizedValStr = JSON.stringify(sanitizedValue);
          const localValStr = stateRef.current ? JSON.stringify(stateRef.current[key]) : "";
          
          if (localValStr === sanitizedValStr) {
            return; // No actual change, skip to avoid loop
          }

          const activeSetter = globalActiveSetters[key];
          if (activeSetter) {
            globalLastSynced[key] = sanitizedValStr;
            activeSetter(sanitizedValue);
            setLocalStorage(key, sanitizedValue);
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`[Realtime Sync] Status changed: ${status}`, err || '');
        const activeSetRealtimeStatus = globalActiveSetters.setRealtimeStatus || setRealtimeStatus;
        if (status === 'SUBSCRIBED') {
          activeSetRealtimeStatus('connected');
        } else if (status === 'CLOSED') {
          activeSetRealtimeStatus('disconnected');
        } else {
          activeSetRealtimeStatus('error');
        }
      });

    return () => {
      client.removeChannel(channel);
    };
  }, [isInitialPullDone]);

  useEffect(() => {
    setLocalStorage("ordenes", ordenes);
    syncToCloud("ordenes", ordenes);
  }, [ordenes]);

  useEffect(() => {
    setLocalStorage("carwash", carwash);
    syncToCloud("carwash", carwash);
  }, [carwash]);

  useEffect(() => {
    setLocalStorage("parkingEntries", parkingEntries);
    syncToCloud("parkingEntries", parkingEntries);
  }, [parkingEntries]);

  useEffect(() => {
    setLocalStorage("parkingRate", parkingRate);
    syncToCloud("parkingRate", parkingRate);
  }, [parkingRate]);

  useEffect(() => {
    setLocalStorage("parkingHistory", parkingHistory);
    syncToCloud("parkingHistory", parkingHistory);
  }, [parkingHistory]);

  useEffect(() => {
    setLocalStorage("vehiculosVenta", vehiculosVenta);
    syncToCloud("vehiculosVenta", vehiculosVenta);
  }, [vehiculosVenta]);

  useEffect(() => {
    setLocalStorage("workshopInventory", workshopInventory);
    syncToCloud("workshopInventory", workshopInventory);
  }, [workshopInventory]);

  useEffect(() => {
    setLocalStorage("cafeteriaInventory", cafeteriaInventory);
    syncToCloud("cafeteriaInventory", cafeteriaInventory);
  }, [cafeteriaInventory]);

  useEffect(() => {
    setLocalStorage("cafeteriaSales", cafeteriaSales);
    syncToCloud("cafeteriaSales", cafeteriaSales);
  }, [cafeteriaSales]);

  useEffect(() => {
    setLocalStorage("comisionMecanico", comisionMecanico);
    syncToCloud("comisionMecanico", comisionMecanico);
  }, [comisionMecanico]);

  useEffect(() => {
    setLocalStorage("dashboardPeriod", dashboardPeriod);
    syncToCloud("dashboardPeriod", dashboardPeriod);
  }, [dashboardPeriod]);

  useEffect(() => {
    setLocalStorage("customStartDate", customStartDate);
    syncToCloud("customStartDate", customStartDate);
  }, [customStartDate]);

  useEffect(() => {
    setLocalStorage("customEndDate", customEndDate);
    syncToCloud("customEndDate", customEndDate);
  }, [customEndDate]);

  useEffect(() => {
    setLocalStorage("carwashPresets", carwashPresets);
    syncToCloud("carwashPresets", carwashPresets);
  }, [carwashPresets]);

  useEffect(() => {
    setLocalStorage("carwashInventory", carwashInventory);
    syncToCloud("carwashInventory", carwashInventory);
  }, [carwashInventory]);

  useEffect(() => {
    setLocalStorage("carwashConsumption", carwashConsumption);
    syncToCloud("carwashConsumption", carwashConsumption);
  }, [carwashConsumption]);

  useEffect(() => {
    setLocalStorage("fixedCosts", fixedCosts);
    syncToCloud("fixedCosts", fixedCosts);
  }, [fixedCosts]);

  useEffect(() => {
    setLocalStorage("usuarios", usuarios);
    syncToCloud("usuarios", usuarios);
  }, [usuarios]);

  // Auto-recover missing clients and vehicles from orders/carwash/parking history deterministically
  useEffect(() => {
    if (!isInitialPullDone) return;

    const safeClientes = Array.isArray(clientes) ? [...clientes] : [];
    const safeVehiculos = Array.isArray(vehiculos) ? [...vehiculos] : [];
    
    const clientPhones = new Set(safeClientes.map(c => c.telefono?.trim()).filter(Boolean));
    const clientNames = new Set(safeClientes.map(c => c.nombre?.toLowerCase().trim()).filter(Boolean));
    const vehiclePlates = new Set(safeVehiculos.map(v => v.placa?.toUpperCase().trim()).filter(Boolean));

    const allRecords = [
      ...(Array.isArray(ordenes) ? ordenes : []),
      ...(Array.isArray(carwash) ? carwash : []),
      ...(Array.isArray(parkingEntries) ? parkingEntries : []),
      ...(Array.isArray(parkingHistory) ? parkingHistory : []),
      ...(Array.isArray(vehiculosVenta) ? vehiculosVenta : [])
    ];

    let clientsAdded = false;
    let vehiclesAdded = false;

    allRecords.forEach(rec => {
      const name = rec.cliente?.trim();
      const tel = rec.telefono?.trim();
      const nit = rec.nit?.trim() || "C/F";
      const nombreFacturacion = rec.nombreFacturacion?.trim() || name;

      if ((tel || name) && (!tel || !clientPhones.has(tel)) && (!name || !clientNames.has(name.toLowerCase()))) {
        const fallbackTel = tel || (name ? `nom-${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : "");
        if (fallbackTel && !clientPhones.has(fallbackTel)) {
          safeClientes.push({
            telefono: fallbackTel,
            nombre: name || "Cliente",
            nit: nit,
            nombreFacturacion: nombreFacturacion,
            fechaRegistro: rec.fecha || new Date().toISOString()
          });
          if (tel) clientPhones.add(tel);
          clientPhones.add(fallbackTel);
          if (name) clientNames.add(name.toLowerCase());
          clientsAdded = true;
        }
      }

      const placa = (rec.vehiculo?.placa || rec.placa)?.toUpperCase()?.trim();
      const marca = rec.vehiculo?.marca || rec.marca || "";
      const linea = rec.vehiculo?.linea || rec.linea || "";
      const color = rec.vehiculo?.color || rec.color || "";
      const anio = rec.anio || rec.vehiculo?.anio || "";

      if (placa && !vehiclePlates.has(placa)) {
        safeVehiculos.push({
          placa: placa,
          chasis: rec.chasis?.toUpperCase()?.trim() || "",
          marca: marca,
          linea: linea,
          anio: anio,
          color: color,
          clienteTelefono: tel || "",
          fechaRegistro: rec.fecha || new Date().toISOString()
        });
        vehiclePlates.add(placa);
        vehiclesAdded = true;
      }
    });

    if (clientsAdded) {
      setClientes(safeClientes);
    }
    if (vehiclesAdded) {
      setVehiculos(safeVehiculos);
    }
  }, [isInitialPullDone, ordenes, carwash, parkingEntries, parkingHistory, vehiculosVenta]);

  useEffect(() => {
    setLocalStorage("clientes", clientes);
    syncToCloud("clientes", clientes);
  }, [clientes]);

  useEffect(() => {
    setLocalStorage("vehiculos", vehiculos);
    syncToCloud("vehiculos", vehiculos);
  }, [vehiculos]);

  useEffect(() => {
    setLocalStorage("tiendaSales", tiendaSales);
    syncToCloud("tiendaSales", tiendaSales);
  }, [tiendaSales]);

  useEffect(() => {
    setLocalStorage("cuentasPorCobrar", cuentasPorCobrar);
    syncToCloud("cuentasPorCobrar", cuentasPorCobrar);
  }, [cuentasPorCobrar]);

  useEffect(() => {
    setLocalStorage("cuentasPorPagar", cuentasPorPagar);
    syncToCloud("cuentasPorPagar", cuentasPorPagar);
  }, [cuentasPorPagar]);

  useEffect(() => {
    setLocalStorage("compras", compras);
    syncToCloud("compras", compras);
  }, [compras]);

  useEffect(() => {
    setLocalStorage("toolsInventory", toolsInventory);
    syncToCloud("toolsInventory", toolsInventory);
  }, [toolsInventory]);

  useEffect(() => {
    setLocalStorage("accesoriosInventory", accesoriosInventory);
    syncToCloud("accesoriosInventory", accesoriosInventory);
  }, [accesoriosInventory]);

  const usuarioActivo = usuarios.find(u => (u.user || "").toLowerCase().trim() === (usuarioActual?.user || "").toLowerCase().trim()) || usuarioActual;

  const userHasPermission = (user, tabId) => {
    if (!user) return false;
    const activeUser = usuarios.find(u => (u.user || "").toLowerCase().trim() === ((typeof user === "string" ? user : user.user) || "").toLowerCase().trim()) || user;
    const activeRol = (typeof activeUser === "string" ? activeUser : (activeUser.rol || "")).toLowerCase().trim();
    if (activeRol === "admin" || activeRol === "administrador") return true;
    if (tabId === "historial" && activeRol !== "lavador") return true;

    if (Array.isArray(activeUser.permissions)) {
      if (activeUser.permissions.includes(tabId)) return true;
    }

    // Fallbacks
    if (activeRol === "cajero") {
      return ["dashboard", "taller", "carwash", "parqueo", "bodega", "cafeteria", "finanzas", "configuracion", "historial", "tienda", "cuentas", "vehiculosVenta", "clientesVehiculos", "compras", "accesorios"].includes(tabId);
    }
    if (activeRol === "mecanico") return ["taller", "historial"].includes(tabId);
    if (activeRol === "lavador") return tabId === "carwash";
    if (activeRol === "jefe de taller" || activeRol === "jefe") return ["dashboard", "taller", "repuestosFaltantes", "historial"].includes(tabId);
    return false;
  };

  // Auth Operations
  const handleLogin = (userObj) => {
    setUsuarioActual(userObj);
  };

  const handleLogout = () => {
    setUsuarioActual(null);
  };

  // Render Login page if not authenticated
  if (!usuarioActual) {
    return (
      <Login 
        usuarios={usuarios} 
        onLogin={handleLogin} 
        isInitialPullDone={isInitialPullDone} 
        realtimeStatus={realtimeStatus} 
      />
    );
  }

  return (
    <div style={styles.appContainer}>
      {/* 1. SIDEBAR NAVIGATION */}
      <Sidebar 
        usuarioActual={usuarioActivo} 
        currentTab={currentTab} 
        setCurrentTab={(tabId) => {
          setCurrentTab(tabId);
          setIsSidebarOpen(false);
        }} 
        onLogout={handleLogout} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        realtimeStatus={realtimeStatus}
      />

      {/* Floating Menu Button for mobile */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="mobile-fab-menu"
        title="Menú"
      >
        ☰
      </button>

      {/* 2. DYNAMIC CONTENT AREA */}
      <main style={styles.mainContent}>
        {currentTab === "dashboard" && userHasPermission(usuarioActivo, "dashboard") && (
          <Dashboard 
            ordenes={ordenes} 
            carwash={carwash} 
            parkingHistory={parkingHistory}
            cafeteriaSales={cafeteriaSales}
            tiendaSales={tiendaSales}
            workshopInventory={workshopInventory}
            cafeteriaInventory={cafeteriaInventory}
            carwashInventory={carwashInventory}
            setCurrentTab={setCurrentTab} 
            dashboardPeriod={dashboardPeriod}
            setDashboardPeriod={setDashboardPeriod}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
          />
        )}

        {currentTab === "taller" && userHasPermission(usuarioActivo, "taller") && (
          <Taller 
            ordenes={ordenes} 
            setOrdenes={setOrdenes} 
            usuarioActual={usuarioActivo} 
            mecanicos={mecanicos} 
            carwash={carwash}
            setCarwash={setCarwash}
            lavadores={lavadores}
            workshopInventory={workshopInventory}
            setWorkshopInventory={setWorkshopInventory}
            accesoriosInventory={accesoriosInventory}
            setAccesoriosInventory={setAccesoriosInventory}
            comisionMecanico={comisionMecanico}
            usuarios={usuarios}
            cuentasPorCobrar={cuentasPorCobrar}
            setCuentasPorCobrar={setCuentasPorCobrar}
            cuentasPorPagar={cuentasPorPagar}
            setCuentasPorPagar={setCuentasPorPagar}
            clientes={clientes}
            setClientes={setClientes}
            vehiculos={vehiculos}
            setVehiculos={setVehiculos}
            carwashPresets={carwashPresets}
          />
        )}

        {currentTab === "carwash" && userHasPermission(usuarioActivo, "carwash") && (
          <Carwash 
            carwash={carwash} 
            setCarwash={setCarwash} 
            usuarioActual={usuarioActivo} 
            lavadores={lavadores} 
            ordenes={ordenes}
            setOrdenes={setOrdenes}
            carwashPresets={carwashPresets}
            carwashInventory={carwashInventory}
            setCarwashInventory={setCarwashInventory}
            accesoriosInventory={accesoriosInventory}
            setAccesoriosInventory={setAccesoriosInventory}
            carwashConsumption={carwashConsumption}
            setCarwashConsumption={setCarwashConsumption}
            usuarios={usuarios}
            cuentasPorCobrar={cuentasPorCobrar}
            setCuentasPorCobrar={setCuentasPorCobrar}
            cuentasPorPagar={cuentasPorPagar}
            setCuentasPorPagar={setCuentasPorPagar}
            clientes={clientes}
            setClientes={setClientes}
            vehiculos={vehiculos}
            setVehiculos={setVehiculos}
          />
        )}

        {currentTab === "parqueo" && userHasPermission(usuarioActivo, "parqueo") && (
          <Parking 
            parkingEntries={parkingEntries}
            setParkingEntries={setParkingEntries}
            parkingRate={parkingRate}
            setParkingRate={setParkingRate}
            parkingHistory={parkingHistory}
            setParkingHistory={setParkingHistory}
            usuarioActual={usuarioActivo}
            cuentasPorCobrar={cuentasPorCobrar}
            setCuentasPorCobrar={setCuentasPorCobrar}
            clientes={clientes}
            setClientes={setClientes}
          />
        )}

        {currentTab === "bodega" && userHasPermission(usuarioActivo, "bodega") && (
          <Inventory 
            workshopInventory={workshopInventory}
            setWorkshopInventory={setWorkshopInventory}
            toolsInventory={toolsInventory}
            setToolsInventory={setToolsInventory}
            usuarioActual={usuarioActivo}
            ordenes={ordenes}
            cuentasPorPagar={cuentasPorPagar}
            setCuentasPorPagar={setCuentasPorPagar}
          />
        )}

        {currentTab === "cafeteria" && userHasPermission(usuarioActivo, "cafeteria") && (
          <Cafeteria 
            cafeteriaInventory={cafeteriaInventory}
            setCafeteriaInventory={setCafeteriaInventory}
            cafeteriaSales={cafeteriaSales}
            setCafeteriaSales={setCafeteriaSales}
            usuarioActual={usuarioActivo}
            cuentasPorCobrar={cuentasPorCobrar}
            setCuentasPorCobrar={setCuentasPorCobrar}
            clientes={clientes}
            setClientes={setClientes}
          />
        )}

        {currentTab === "tienda" && userHasPermission(usuarioActivo, "tienda") && (
          <Tienda 
            workshopInventory={workshopInventory}
            setWorkshopInventory={setWorkshopInventory}
            cafeteriaInventory={cafeteriaInventory}
            setCafeteriaInventory={setCafeteriaInventory}
            carwashInventory={carwashInventory}
            setCarwashInventory={setCarwashInventory}
            accesoriosInventory={accesoriosInventory}
            setAccesoriosInventory={setAccesoriosInventory}
            tiendaSales={tiendaSales}
            setTiendaSales={setTiendaSales}
            cuentasPorCobrar={cuentasPorCobrar}
            setCuentasPorCobrar={setCuentasPorCobrar}
            cuentasPorPagar={cuentasPorPagar}
            setCuentasPorPagar={setCuentasPorPagar}
            usuarioActual={usuarioActivo}
            clientes={clientes}
            setClientes={setClientes}
          />
        )}

        {currentTab === "accesorios" && userHasPermission(usuarioActivo, "accesorios") && (
          <Accesorios 
            accesoriosInventory={accesoriosInventory}
            setAccesoriosInventory={setAccesoriosInventory}
            usuarioActual={usuarioActivo}
            cuentasPorPagar={cuentasPorPagar}
            setCuentasPorPagar={setCuentasPorPagar}
          />
        )}

        {currentTab === "cuentas" && userHasPermission(usuarioActivo, "cuentas") && (
          <Cuentas 
            cuentasPorCobrar={cuentasPorCobrar}
            setCuentasPorCobrar={setCuentasPorCobrar}
            cuentasPorPagar={cuentasPorPagar}
            setCuentasPorPagar={setCuentasPorPagar}
            usuarioActual={usuarioActivo}
            clientes={clientes}
            setClientes={setClientes}
          />
        )}

        {currentTab === "repuestosFaltantes" && userHasPermission(usuarioActivo, "repuestosFaltantes") && (
          <RepuestosFaltantes 
            ordenes={ordenes}
            setOrdenes={setOrdenes}
            workshopInventory={workshopInventory}
            setWorkshopInventory={setWorkshopInventory}
            cuentasPorPagar={cuentasPorPagar}
            setCuentasPorPagar={setCuentasPorPagar}
            usuarios={usuarios}
            comisionMecanico={comisionMecanico}
          />
        )}

        {currentTab === "historial" && userHasPermission(usuarioActivo, "historial") && (
          <VehicleHistory 
            ordenes={ordenes}
            carwash={carwash}
            usuarioActual={usuarioActivo}
          />
        )}

        {currentTab === "finanzas" && userHasPermission(usuarioActivo, "finanzas") && (
          <Finance 
            ordenes={ordenes} 
            carwash={carwash} 
            mecanicos={mecanicos} 
            lavadores={lavadores} 
            parkingHistory={parkingHistory}
            cafeteriaSales={cafeteriaSales}
            tiendaSales={tiendaSales}
            usuarios={usuarios}
            fixedCosts={fixedCosts}
            vehiculosVenta={vehiculosVenta}
            cuentasPorCobrar={cuentasPorCobrar}
            cuentasPorPagar={cuentasPorPagar}
            dashboardPeriod={dashboardPeriod}
            setDashboardPeriod={setDashboardPeriod}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
          />
        )}

        {currentTab === "configuracion" && userHasPermission(usuarioActivo, "configuracion") && (
          <Settings 
            comisionMecanico={comisionMecanico}
            setComisionMecanico={setComisionMecanico}
            parkingRate={parkingRate}
            setParkingRate={setParkingRate}
            dashboardPeriod={dashboardPeriod}
            setDashboardPeriod={setDashboardPeriod}
            carwashPresets={carwashPresets}
            setCarwashPresets={setCarwashPresets}
            workshopInventory={workshopInventory}
            setWorkshopInventory={setWorkshopInventory}
            cafeteriaInventory={cafeteriaInventory}
            setCafeteriaInventory={setCafeteriaInventory}
            carwashInventory={carwashInventory}
            setCarwashInventory={setCarwashInventory}
            accesoriosInventory={accesoriosInventory}
            setAccesoriosInventory={setAccesoriosInventory}
            fixedCosts={fixedCosts}
            setFixedCosts={setFixedCosts}
            ordenes={ordenes}
            carwash={carwash}
            cafeteriaSales={cafeteriaSales}
            carwashConsumption={carwashConsumption}
            usuarios={usuarios}
            setUsuarios={setUsuarios}
            usuarioActual={usuarioActivo}
            parkingEntries={parkingEntries}
            parkingHistory={parkingHistory}
            vehiculosVenta={vehiculosVenta}
            tiendaSales={tiendaSales}
            cuentasPorCobrar={cuentasPorCobrar}
            cuentasPorPagar={cuentasPorPagar}
            clientes={clientes}
            setClientes={setClientes}
            vehiculos={vehiculos}
            setVehiculos={setVehiculos}
            realtimeStatus={realtimeStatus}
          />
        )}

        {currentTab === "compras" && userHasPermission(usuarioActivo, "compras") && (
          <Compras 
            compras={compras}
            setCompras={setCompras}
            toolsInventory={toolsInventory}
            setToolsInventory={setToolsInventory}
            workshopInventory={workshopInventory}
            setWorkshopInventory={setWorkshopInventory}
            carwashInventory={carwashInventory}
            setCarwashInventory={setCarwashInventory}
            cafeteriaInventory={cafeteriaInventory}
            setCafeteriaInventory={setCafeteriaInventory}
            cuentasPorPagar={cuentasPorPagar}
            setCuentasPorPagar={setCuentasPorPagar}
            usuarioActual={usuarioActivo}
          />
        )}

        {currentTab === "vehiculosVenta" && userHasPermission(usuarioActivo, "vehiculosVenta") && (
          <VehiculosVenta 
            vehiculosVenta={vehiculosVenta}
            setVehiculosVenta={setVehiculosVenta}
            usuarioActual={usuarioActivo}
            cuentasPorCobrar={cuentasPorCobrar}
            setCuentasPorCobrar={setCuentasPorCobrar}
            usuarios={usuarios}
          />
        )}

        {currentTab === "clientesVehiculos" && userHasPermission(usuarioActivo, "clientesVehiculos") && (
          <ClientesVehiculos
            clientes={clientes}
            setClientes={setClientes}
            vehiculos={vehiculos}
            setVehiculos={setVehiculos}
            usuarioActual={usuarioActivo}
            setOrdenes={setOrdenes}
            setCarwash={setCarwash}
            setCuentasPorCobrar={setCuentasPorCobrar}
            onForceSyncCloud={forcePullFromCloud}
          />
        )}
      </main>
    </div>
  );
}

const styles = {
  appContainer: {
    display: "flex",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    backgroundColor: "var(--bg-main)",
  },
  mainContent: {
    flex: 1,
    height: "100vh",
    overflow: "hidden",
    display: "flex",
  },
};