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
import Pantalla from "./components/Pantalla";
import VendorQuotes from "./components/VendorQuotes";
import LoyaltyRewards from "./components/LoyaltyRewards";
import SaaSAdmin from "./components/SaaSAdmin";
import { getLocalStorage, setLocalStorage, getTenantLocalStorage, setTenantLocalStorage } from "./utils/storage";
import { getSupabaseClient, syncKeyToCloud, safeParseJSON, withTimeout, processOfflineQueue } from "./utils/supabase";
import { initHourlyBackupScheduler, checkAndCreateHourlyBackup } from "./services/backupService";
import { autoPurgeTrash } from "./services/trashService";

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
  papeleraSistema: null,
  systemSnapshots: null,
  puntosRecompensas: null,
  catalogoPremios: null,
  historialCanjes: null,
  reglasPrograma: null,
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
  "accesoriosInventory",
  "papeleraSistema",
  "systemSnapshots",
  "puntosRecompensas",
  "catalogoPremios",
  "historialCanjes",
  "reglasPrograma"
];

const filterOutMockItems = (key, list) => {
  if (!Array.isArray(list)) return list;
  return list.filter(item => Boolean(item));
};

export const deduplicateUsers = (userList) => {
  if (!Array.isArray(userList)) return [];
  const map = new Map();
  userList.forEach(u => {
    if (!u) return;
    const usernameKey = String(u.user || u.username || "").toLowerCase().trim();
    if (!usernameKey) return;
    if (!map.has(usernameKey)) {
      map.set(usernameKey, u);
    } else {
      const existing = map.get(usernameKey);
      map.set(usernameKey, {
        ...existing,
        ...u,
        permissions: (u.permissions && u.permissions.length > 0) ? u.permissions : (existing.permissions || [])
      });
    }
  });
  return Array.from(map.values());
};

// Helper to merge local cached array data with cloud data to prevent silent data wipes on initial connection
const mergeCollections = (key, localValRaw, cloudValRaw, trashRaw = null) => {
  const localVal = filterOutMockItems(key, safeParseJSON(localValRaw));
  const cloudVal = filterOutMockItems(key, safeParseJSON(cloudValRaw));

  // 🗑️ SOFT-DELETE REGISTRY: Extraer todos los IDs resguardados en Papelera para evitar que resuciten
  const activeTenant = getActiveTenantId();
  const deletedItemIds = new Set();
  const trashItems = trashRaw !== null ? safeParseJSON(trashRaw) : safeParseJSON(getTenantLocalStorage("papeleraSistema", [], activeTenant));
  if (Array.isArray(trashItems)) {
    trashItems.forEach(entry => {
      if (!entry) return;
      const entryTenant = (entry.tenantId || "lospits").toLowerCase().trim();
      if (entryTenant !== activeTenant) {
        return; // 🔒 Ignorar elementos eliminados de otros talleres / sucursales!
      }
      const entryKey = (entry.moduloOrigen || entry.module || entry.key || entry.tablaOriginal || entry.origen || "").toLowerCase().trim();
      const targetKey = String(key).toLowerCase().trim();
      if (entryKey && entryKey !== targetKey) {
        if (!(entryKey === "taller" && targetKey === "ordenes") && !(entryKey === "ordenes" && targetKey === "taller")) {
          return; // Ignorar elementos eliminados de otros módulos
        }
      }
      const origId = entry.originalId || (entry.itemOriginal && entry.itemOriginal.id) || (entry.originalData && entry.originalData.id);
      if (origId !== undefined && origId !== null && String(origId).trim() !== "" && String(origId) !== "undefined" && String(origId) !== "null") {
        deletedItemIds.add(String(origId).trim());
      }
    });
  }

  const isItemDeleted = (item) => {
    if (!item) return true;
    if (item.id !== undefined && item.id !== null) {
      const strId = String(item.id).trim();
      if (strId !== "" && strId !== "undefined" && strId !== "null" && deletedItemIds.has(strId)) {
        return true;
      }
    }
    return false;
  };

  const CONFIG_KEYS = ["fixedCosts", "carwashPresets", "usuarios"];
  const isConfigKey = CONFIG_KEYS.includes(key);

  const cleanLocal = isConfigKey ? (Array.isArray(localVal) ? localVal : []) : (Array.isArray(localVal) ? localVal.filter(item => !isItemDeleted(item)) : localVal);
  const cleanCloud = isConfigKey ? (Array.isArray(cloudVal) ? cloudVal : []) : (Array.isArray(cloudVal) ? cloudVal.filter(item => !isItemDeleted(item)) : cloudVal);

  if (isConfigKey) {
    if (key === "usuarios") {
      const cloudUsers = Array.isArray(cleanCloud) ? deduplicateUsers(cleanCloud) : [];
      const localUsers = Array.isArray(cleanLocal) ? deduplicateUsers(cleanLocal) : [];
      const mergedUsersMap = new Map();
      localUsers.forEach(u => {
        const uKey = String(u.user || u.username || "").toLowerCase().trim();
        if (uKey) mergedUsersMap.set(uKey, u);
      });
      cloudUsers.forEach(u => {
        const uKey = String(u.user || u.username || "").toLowerCase().trim();
        if (uKey) {
          const existing = mergedUsersMap.get(uKey);
          mergedUsersMap.set(uKey, existing ? { ...existing, ...u } : u);
        }
      });
      return Array.from(mergedUsersMap.values());
    }

    const mergedConfigMap = new Map();
    if (Array.isArray(cleanCloud)) {
      cleanCloud.forEach((cItem, idx) => {
        const cId = cItem?.id !== undefined ? String(cItem.id) : (cItem?.name || cItem?.tipo || `c_${idx}`);
        mergedConfigMap.set(String(cId).toLowerCase().trim(), cItem);
      });
    }
    if (Array.isArray(cleanLocal)) {
      cleanLocal.forEach((lItem, idx) => {
        const lId = lItem?.id !== undefined ? String(lItem.id) : (lItem?.name || lItem?.tipo || `l_${idx}`);
        const cMatch = mergedConfigMap.get(String(lId).toLowerCase().trim());
        mergedConfigMap.set(String(lId).toLowerCase().trim(), cMatch ? { ...cMatch, ...lItem } : lItem);
      });
    }
    return Array.from(mergedConfigMap.values());
  }

  if (!cleanCloud || (Array.isArray(cleanCloud) && cleanCloud.length === 0)) {
    const res = Array.isArray(cleanLocal) ? cleanLocal : (cleanCloud || []);
    return key === "usuarios" ? deduplicateUsers(res) : res;
  }

  if (!cleanLocal || (Array.isArray(cleanLocal) && cleanLocal.length === 0)) {
    return key === "usuarios" ? deduplicateUsers(cleanCloud) : cleanCloud;
  }

  if (Array.isArray(cleanLocal) && Array.isArray(cleanCloud)) {
    if (key === "clientes") {
      const mergedMap = new Map();
      cleanCloud.forEach((c, idx) => {
        const id = (c.telefono && c.telefono.trim()) || (c.nombre && c.nombre.trim()) || `cloud_c_${idx}`;
        mergedMap.set(id, c);
      });
      cleanLocal.forEach((c, idx) => {
        const id = (c.telefono && c.telefono.trim()) || (c.nombre && c.nombre.trim()) || `local_c_${idx}`;
        if (!mergedMap.has(id)) {
          mergedMap.set(id, c);
        } else {
          const cloudItem = mergedMap.get(id);
          mergedMap.set(id, { ...cloudItem, ...c });
        }
      });
      return Array.from(mergedMap.values());
    }

    if (key === "vehiculos") {
      const mergedMap = new Map();
      cleanCloud.forEach((v, idx) => {
        const id = (v.placa && v.placa.trim().toUpperCase()) || (v.chasis && v.chasis.trim().toUpperCase()) || `cloud_v_${idx}`;
        mergedMap.set(id, v);
      });
      cleanLocal.forEach((v, idx) => {
        const id = (v.placa && v.placa.trim().toUpperCase()) || (v.chasis && v.chasis.trim().toUpperCase()) || `local_v_${idx}`;
        if (!mergedMap.has(id)) {
          mergedMap.set(id, v);
        } else {
          const cloudItem = mergedMap.get(id);
          mergedMap.set(id, { ...cloudItem, ...v });
        }
      });
      return Array.from(mergedMap.values());
    }

    // For all other array keys (ordenes, carwash, parkingHistory, workshopInventory, etc.)
    const mergedMap = new Map();

    const normalizeStatus = (item) => {
      if (!item || typeof item !== "object") return item;
      let est = item.estado;
      if (est === "Cobrado") est = "Entregado";
      if (key === "ordenes" && est === "En proceso") est = "En proceso de reparación";
      if (est === "Listo") est = "Listo para entrega";
      return { ...item, estado: est };
    };

    const getItemId = (item, idx) => {
      if (!item) return `item_${idx}`;
      if (item.id !== undefined && item.id !== null && String(item.id).trim() !== "") {
        return String(item.id);
      }
      if (item.uuid) {
        return String(item.uuid);
      }
      if (key === "ordenes") {
        const cl = String(item.cliente || '').toLowerCase().trim();
        const pl = String(item.placa || '').toLowerCase().trim();
        const fc = item.fecha ? new Date(item.fecha).getTime() : idx;
        return `ord_${cl}_${pl}_${fc}`;
      }
      if (key === "carwash") {
        const cl = String(item.cliente || '').toLowerCase().trim();
        const vh = String(item.vehiculo?.placa || item.vehiculo || '').toLowerCase().trim();
        const fc = item.fecha ? new Date(item.fecha).getTime() : idx;
        return `cw_${cl}_${vh}_${fc}`;
      }
      if (key === "compras") {
        const prov = String(item.proveedor || '').toLowerCase().trim();
        const tot = item.total || item.monto || 0;
        const fc = item.fecha ? new Date(item.fecha).getTime() : idx;
        return `comp_${prov}_${tot}_${fc}`;
      }
      if (key === "cuentasPorCobrar" || key === "cuentasPorPagar") {
        const entity = String(item.cliente || item.proveedor || '').toLowerCase().trim();
        const m = item.monto || item.total || 0;
        const fc = item.fecha ? new Date(item.fecha).getTime() : idx;
        return `ccta_${entity}_${m}_${fc}`;
      }
      if (key === "vehiculosVenta") {
        const pl = String(item.placa || item.chasis || item.vin || '').toLowerCase().trim();
        if (pl) return `vventa_${pl}`;
        return `vventa_${item.marca || ''}_${item.linea || ''}_${idx}`;
      }
      if (key === "payrollHistory") {
        const usr = String(item.user || item.colaborador || '').toLowerCase().trim();
        const per = item.periodo || item.fecha || idx;
        return `payroll_${usr}_${per}`;
      }
      if (key === "workshopInventory" || key === "cafeteriaInventory" || key === "carwashInventory" || key === "toolsInventory" || key === "accesoriosInventory") {
        const code = String(item.code || item.codigo || item.nombre || item.name || '').toLowerCase().trim();
        if (code) return `inv_${key}_${code}`;
      }
      if (key === "cafeteriaSales" || key === "tiendaSales") {
        const fc = item.fecha ? new Date(item.fecha).getTime() : idx;
        const tot = item.total || 0;
        return `sale_${key}_${fc}_${tot}`;
      }
      if (key === "parkingHistory" || key === "parkingEntries") {
        const pl = String(item.placa || '').toLowerCase().trim();
        const h = item.horaEntrada || item.fecha || idx;
        return `park_${pl}_${h}`;
      }
      const fallbackSig = (item.name || item.tipo || item.descripcion || item.total || item.fecha);
      if (fallbackSig) {
        return `item_${key}_${String(fallbackSig).toLowerCase().trim()}`;
      }
      return `item_${key}_${idx}`;
    };

    const mergeSingleItem = (cloudItem, localItem) => {
      const cNorm = normalizeStatus(cloudItem);
      const lNorm = normalizeStatus(localItem);

      if (!cNorm) return lNorm;
      if (!lNorm) return cNorm;

      const timeC = cNorm.updatedAt ? new Date(cNorm.updatedAt).getTime() : (cNorm.fecha ? new Date(cNorm.fecha).getTime() : 0);
      const timeL = lNorm.updatedAt ? new Date(lNorm.updatedAt).getTime() : (lNorm.fecha ? new Date(lNorm.fecha).getTime() : 0);

      let winnerBase, loserBase;

      // Primary conflict resolution: record with newer updatedAt timestamp wins (local wins on tie)
      if (cNorm.updatedAt || lNorm.updatedAt) {
        if (timeL >= timeC) {
          winnerBase = lNorm;
          loserBase = cNorm;
        } else {
          winnerBase = cNorm;
          loserBase = lNorm;
        }
      } else {
        // Fallback when neither record has updatedAt: prefer local unless cloud has higher status weight
        const stateWeight = (st) => {
          if (st === "Entregado" || st === "Cobrado") return 4;
          if (st === "Listo para entrega" || st === "Listo") return 3;
          if (st === "En proceso de reparación" || st === "En proceso") return 2;
          return 1;
        };
        const cWeight = stateWeight(cNorm?.estado);
        const lWeight = stateWeight(lNorm?.estado);

        if (cWeight !== lWeight) {
          winnerBase = (cWeight > lWeight) ? cNorm : lNorm;
          loserBase = (cWeight > lWeight) ? lNorm : cNorm;
        } else {
          winnerBase = (timeL >= timeC) ? lNorm : cNorm;
          loserBase = (timeL >= timeC) ? cNorm : lNorm;
        }
      }

      // Merge photos uniquely
      const photosC = Array.isArray(cNorm.fotos) ? cNorm.fotos : [];
      const photosL = Array.isArray(lNorm.fotos) ? lNorm.fotos : [];
      const mergedPhotos = Array.from(new Set([...photosL, ...photosC])).filter(Boolean);

      return {
        ...loserBase,
        ...winnerBase,
        fotos: mergedPhotos
      };
    };

    cleanLocal.forEach((item, idx) => {
      if (!isItemDeleted(item)) {
        const norm = normalizeStatus(item);
        const id = getItemId(norm, idx);
        mergedMap.set(id, norm);
      }
    });

    cleanCloud.forEach((item, idx) => {
      if (!isItemDeleted(item)) {
        const norm = normalizeStatus(item);
        const id = getItemId(norm, idx);
        if (!mergedMap.has(id)) {
          mergedMap.set(id, norm);
        } else {
          const localItem = mergedMap.get(id);
          mergedMap.set(id, mergeSingleItem(item, localItem));
        }
      }
    });

    return Array.from(mergedMap.values());
  }

  return key === "usuarios" ? deduplicateUsers(cleanCloud) : cleanCloud;
};



export default function App() {
  // 🏢 MULTI-TENANT SAAS ARCHITECTURE STATE
  const [tenantId, setTenantId] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTenant = urlParams.get("taller") || urlParams.get("tenant");
      if (urlTenant) {
        const clean = urlTenant.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
        if (clean) {
          setLocalStorage("current_tenant_id", clean);
          return clean;
        }
      }
    } catch (e) {}
    return getLocalStorage("current_tenant_id", "lospits");
  });

  const handleSwitchTenant = (newTenant) => {
    const clean = (newTenant || "lospits").toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
    setTenantId(clean);
    setLocalStorage("current_tenant_id", clean);
    window.location.reload();
  };

  // 🔐 USER DEFINITIONS
  const [usuarios, setUsuarios] = useState(() => {
    const defaultUsers = [
      { user: "admin", pass: "1234", rol: "admin", permissions: ["dashboard", "taller", "carwash", "parqueo", "bodega", "cafeteria", "finanzas", "repuestosFaltantes", "configuracion", "historial", "tienda", "cuentas", "vehiculosVenta", "clientesVehiculos", "compras", "accesorios"], salarioBase: 15000, comisionTaller: 10, comisionCarwash: 5, comisionarLabor: true, comisionarRepuestos: true, comisionarCarwash: true, comisionRepuestos: 5, nombreCompleto: "Alan Estrada" },
      { user: "armando avila", pass: "Armando123", rol: "admin", permissions: ["dashboard", "taller", "carwash", "parqueo", "bodega", "cafeteria", "repuestosFaltantes", "configuracion", "historial", "tienda", "cuentas", "vehiculosVenta", "clientesVehiculos", "compras", "accesorios"], salarioBase: 4000, comisionTaller: 10, comisionCarwash: 5, comisionarLabor: false, comisionarRepuestos: false, comisionarCarwash: true, comisionRepuestos: 5, nombreCompleto: "Armando Avila" },
      { user: "leandro", pass: "Leandro123", rol: "lavador", permissions: ["carwash"], salarioBase: 3200, comisionTaller: 10, comisionCarwash: 7, comisionarLabor: false, comisionarRepuestos: false, comisionarCarwash: true, comisionRepuestos: 5, nombreCompleto: "Leandro" },
      { user: "carlos", pass: "Carlos123", rol: "lavador", permissions: ["carwash"], salarioBase: 3200, comisionTaller: 10, comisionCarwash: 7, comisionarLabor: false, comisionarRepuestos: false, comisionarCarwash: true, comisionRepuestos: 5, nombreCompleto: "Carlos" },
      { user: "mario kestler", pass: "Mario123", rol: "jefe de taller", permissions: ["dashboard", "parqueo", "repuestosFaltantes", "historial", "taller", "bodega", "tienda", "carwash", "cafeteria", "cuentas", "finanzas"], salarioBase: 0, comisionTaller: 10, comisionCarwash: 7, comisionarLabor: true, comisionarRepuestos: false, comisionarCarwash: false, comisionRepuestos: 5, nombreCompleto: "Mario Kestler" },
      { user: "marco henrnadez", pass: "Marco7890", rol: "mecanico", permissions: ["taller"], salarioBase: 5000, comisionTaller: 10, comisionCarwash: 7, comisionarLabor: false, comisionarRepuestos: false, comisionarCarwash: false, comisionRepuestos: 5, nombreCompleto: "Marco Henrnadez" }
    ];
    const val = getTenantLocalStorage("usuarios", [], tenantId);
    const localUsers = Array.isArray(val) ? val : [];
    const loaded = deduplicateUsers([...defaultUsers, ...localUsers]);
    return loaded.map(u => {
      const updatedPerms = Array.isArray(u.permissions) ? u.permissions : [];
      
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
    const saved = getLocalStorage("usuarioActual", null);
    if (saved && (saved.user || "").toLowerCase().trim() === "armando avila") {
      if (Array.isArray(saved.permissions)) {
        saved.permissions = saved.permissions.filter(p => p !== "finanzas");
      }
    }
    return saved;
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
    const val = getTenantLocalStorage("ordenes", [], tenantId);
    const raw = Array.isArray(val) ? val : [];
    const filtered = filterOutMockItems("ordenes", raw);
    return (Array.isArray(filtered) ? filtered : []).filter(Boolean).map(o => {
      if (!o || typeof o !== "object") return o;
      let migratedEstado = o.estado;
      if (o.estado === "En proceso") migratedEstado = "En proceso de reparación";
      else if (o.estado === "Listo") migratedEstado = "Listo para entrega";
      else if (o.estado === "Cobrado") migratedEstado = "Entregado";
      return { ...o, estado: migratedEstado };
    });
  });

  const [carwash, setCarwash] = useState(() => {
    const val = getTenantLocalStorage("carwash", [], tenantId);
    const raw = Array.isArray(val) ? val : [];
    const filtered = filterOutMockItems("carwash", raw);
    return (Array.isArray(filtered) ? filtered : []).filter(Boolean).map(c => {
      if (!c || typeof c !== "object") return c;
      let migratedEstado = c.estado;
      if (c.estado === "Listo") migratedEstado = "Listo para entrega";
      else if (c.estado === "Cobrado") migratedEstado = "Entregado";
      return { ...c, estado: migratedEstado };
    });
  });

  const [parkingEntries, setParkingEntries] = useState(() => {
    const val = getTenantLocalStorage("parkingEntries", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const [parkingRate, setParkingRate] = useState(() => {
    return getTenantLocalStorage("parkingRate", 10.0, tenantId);
  });

  const [parkingHistory, setParkingHistory] = useState(() => {
    const val = getTenantLocalStorage("parkingHistory", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const [vehiculosVenta, setVehiculosVenta] = useState(() => {
    const val = getTenantLocalStorage("vehiculosVenta", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const [workshopInventory, setWorkshopInventory] = useState(() => {
    const val = getTenantLocalStorage("workshopInventory", initialWorkshopInventory, tenantId);
    return Array.isArray(val) ? val : initialWorkshopInventory;
  });

  const [cafeteriaInventory, setCafeteriaInventory] = useState(() => {
    const val = getTenantLocalStorage("cafeteriaInventory", initialCafeteriaInventory, tenantId);
    return Array.isArray(val) ? val : initialCafeteriaInventory;
  });

  const [cafeteriaSales, setCafeteriaSales] = useState(() => {
    const val = getTenantLocalStorage("cafeteriaSales", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const [comisionMecanico, setComisionMecanico] = useState(() => {
    return getTenantLocalStorage("comisionMecanico", 0.10, tenantId);
  });

  const [cotizacionesRepuestos, setCotizacionesRepuestos] = useState(() => {
    const val = getTenantLocalStorage("cotizacionesRepuestos", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const [dashboardPeriod, setDashboardPeriod] = useState(() => {
    return getTenantLocalStorage("dashboardPeriod", "mes", tenantId);
  });

  const [customStartDate, setCustomStartDate] = useState(() => {
    return getTenantLocalStorage("customStartDate", "", tenantId);
  });

  const [customEndDate, setCustomEndDate] = useState(() => {
    return getTenantLocalStorage("customEndDate", "", tenantId);
  });

  const [carwashPresets, setCarwashPresets] = useState(() => {
    const defaultPresets = [
      { tipo: "Pequeño", precio: 70, comision: 5 },
      { tipo: "Mediano", precio: 90, comision: 7 },
      { tipo: "Grande", precio: 110, comision: 10 }
    ];
    const val = getTenantLocalStorage("carwashPresets", defaultPresets, tenantId);
    return Array.isArray(val) ? val : defaultPresets;
  });

  const [carwashInventory, setCarwashInventory] = useState(() => {
    const defaultInventory = [
      { id: 1, name: "Shampoo con Cera (Litro)", quantity: 10, purchasePrice: 45.00 },
      { id: 2, name: "Silicona para Llantas (Litro)", quantity: 5, purchasePrice: 60.00 },
      { id: 3, name: "Microfibras", quantity: 20, purchasePrice: 15.00 },
      { id: 4, name: "Aromatizante (Galón)", quantity: 2, purchasePrice: 80.00 }
    ];
    const val = getTenantLocalStorage("carwashInventory", defaultInventory, tenantId);
    return Array.isArray(val) ? val : defaultInventory;
  });

  const [carwashConsumption, setCarwashConsumption] = useState(() => {
    const val = getTenantLocalStorage("carwashConsumption", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const [tiendaSales, setTiendaSales] = useState(() => {
    const val = getTenantLocalStorage("tiendaSales", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const [cuentasPorCobrar, setCuentasPorCobrar] = useState(() => {
    const val = getTenantLocalStorage("cuentasPorCobrar", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const [cuentasPorPagar, setCuentasPorPagar] = useState(() => {
    const val = getTenantLocalStorage("cuentasPorPagar", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const initialFixedCosts = [
    { id: 1, nit: "C/F", name: "Alquiler del Taller", amount: 24000, fotos: [], saldo: 0, total: 0, anticipo: 0 },
    { id: 3, nit: "C/F", name: "Servicios Públicos (Luz y Agua)", amount: 800, fotos: [], saldo: 0, total: 0, anticipo: 0 },
    { id: 1781836594982, nit: "C/F", name: "Financistas", amount: 20000, fotos: [], saldo: 0, total: 0, anticipo: 0 },
    { id: 1781836650914, nit: "C/F", name: "Contador", amount: 500, fotos: [], saldo: 0, total: 0, anticipo: 0 }
  ];

  const [fixedCosts, setFixedCosts] = useState(() => {
    const val = getTenantLocalStorage("fixedCosts", initialFixedCosts, tenantId);
    return Array.isArray(val) && val.length > 0 ? val : initialFixedCosts;
  });

  const [clientes, setClientes] = useState(() => {
    const val = getTenantLocalStorage("clientes", [], tenantId);
    const raw = Array.isArray(val) ? val : [];
    return filterOutMockItems("clientes", raw);
  });

  const [vehiculos, setVehiculos] = useState(() => {
    const val = getTenantLocalStorage("vehiculos", [], tenantId);
    const raw = Array.isArray(val) ? val : [];
    return filterOutMockItems("vehiculos", raw);
  });

  const [compras, setCompras] = useState(() => {
    const val = getTenantLocalStorage("compras", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const [payrollHistory, setPayrollHistory] = useState(() => {
    const val = getTenantLocalStorage("payrollHistory", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const [toolsInventory, setToolsInventory] = useState(() => {
    const val = getTenantLocalStorage("toolsInventory", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const [accesoriosInventory, setAccesoriosInventory] = useState(() => {
    const val = getTenantLocalStorage("accesoriosInventory", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const [papeleraSistema, setPapeleraSistema] = useState(() => {
    const val = getTenantLocalStorage("papeleraSistema", [], tenantId);
    const clean = Array.isArray(val) ? val : [];
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return clean.filter(item => item && item.fechaEliminacion && (now - new Date(item.fechaEliminacion).getTime() <= thirtyDaysMs));
  });

  const [systemSnapshots, setSystemSnapshots] = useState(() => {
    const val = getTenantLocalStorage("systemSnapshots", [], tenantId);
    const clean = Array.isArray(val) ? val : [];
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return clean.filter(s => s && s.fecha && (now - new Date(s.fecha).getTime() <= thirtyDaysMs));
  });

  const [puntosRecompensas, setPuntosRecompensas] = useState(() => {
    const val = getTenantLocalStorage("puntosRecompensas", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const [catalogoPremios, setCatalogoPremios] = useState(() => {
    const val = getTenantLocalStorage("catalogoPremios", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const [historialCanjes, setHistorialCanjes] = useState(() => {
    const val = getTenantLocalStorage("historialCanjes", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const [reglasPrograma, setReglasPrograma] = useState(() => {
    const defaultReglas = [
      { id: "r1", titulo: "Carwash, Detailing y Cafetería", formula: "Q1.00 gastado = 1 Punto Pits", descripcion: "Acumulación directa sobre el total cobrado al cliente.", tipo: "acumulacion" },
      { id: "r2", titulo: "Taller Automotriz (Mano de Obra)", formula: "Q4.00 en Mano de Obra = 1 Punto Pits", descripcion: "Calculado exclusivamente sobre la Mano de Obra (excluye repuestos). Tope máximo: 1,500 pts por factura.", tipo: "acumulacion" },
      { id: "r3", titulo: "Caducidad de Puntos por Inactividad", formula: "Vencimiento a los 6 Meses (180 Días)", descripcion: "Los puntos vencerán si el cliente pasa más de 6 meses sin registrar una sola visita.", tipo: "caducidad" }
    ];
    const val = getLocalStorage("reglasPrograma", defaultReglas);
    return Array.isArray(val) && val.length > 0 ? val : defaultReglas;
  });

  // 🏆 LOYALTY REWARDS HELPER: Auto-calculates & awards Puntos Pits for completed services
  const addPuntosLealtad = (clienteKey, clienteNombre, monto, area, tallerLaborMonto = 0) => {
    if (!clienteKey && !clienteNombre) return;

    let puntosGanados = 0;

    if (area === "carwash" || area === "cafeteria" || area === "detailing") {
      // Q1 = 1 Punto Pits
      puntosGanados = Math.floor(parseFloat(monto) || 0);
    } else if (area === "taller") {
      // Q4 in Labor = 1 Punto Pits (Excludes parts, max 1,500 pts per invoice)
      const laborMonto = parseFloat(tallerLaborMonto) || 0;
      puntosGanados = Math.min(1500, Math.floor(laborMonto / 4));
    }

    if (puntosGanados <= 0) return;

    const targetKey = String(clienteKey || clienteNombre).toLowerCase().trim();

    setPuntosRecompensas(prev => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const idx = list.findIndex(p => 
        String(p.telefono || "").toLowerCase().trim() === targetKey ||
        String(p.nombre || "").toLowerCase().trim() === targetKey
      );

      const nowIso = new Date().toISOString();

      if (idx >= 0) {
        const existing = list[idx];
        list[idx] = {
          ...existing,
          puntos: (parseInt(existing.puntos) || 0) + puntosGanados,
          ultimaVisita: nowIso
        };
      } else {
        list.push({
          telefono: String(clienteKey || "").trim(),
          nombre: String(clienteNombre || "Cliente").trim(),
          puntos: puntosGanados,
          fechaRegistro: nowIso,
          ultimaVisita: nowIso
        });
      }

      return list;
    });
  };

  const handleCanjearPremio = (ticket) => {
    if (!ticket) return;

    setHistorialCanjes(prev => [ticket, ...(Array.isArray(prev) ? prev : [])]);

    const targetKey = String(ticket.clienteTelefono || ticket.clienteNombre).toLowerCase().trim();
    setPuntosRecompensas(prev => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const idx = list.findIndex(p => 
        String(p.telefono || "").toLowerCase().trim() === targetKey ||
        String(p.nombre || "").toLowerCase().trim() === targetKey
      );

      if (idx >= 0) {
        const existing = list[idx];
        list[idx] = {
          ...existing,
          puntos: Math.max(0, (parseInt(existing.puntos) || 0) - ticket.puntosCanjeados)
        };
      }
      return list;
    });
  };

  // 🗑️ SOFT-DELETE HELPER: Moves deleted item to 30-day Trash Bin instead of destroying it
  const softDelete = (modulo, item, user) => {
    if (!item) return;
    const activeTenant = (tenantId || getActiveTenantId()).toLowerCase().trim();
    const deletedEntry = {
      id: `trash_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tenantId: activeTenant,
      moduloOrigen: modulo,
      itemOriginal: item,
      fechaEliminacion: new Date().toISOString(),
      usuarioEliminador: user || usuarioActual?.user || "admin"
    };
    setPapeleraSistema(prev => [deletedEntry, ...(Array.isArray(prev) ? prev : [])]);
  };

  // 🔄 RESTORE TRASH ITEM: Restores soft-deleted item back to its origin module
  const restoreTrashItem = (trashId) => {
    const entry = (papeleraSistema || []).find(p => p.id === trashId);
    if (!entry) return;

    const { moduloOrigen, itemOriginal } = entry;

    if (moduloOrigen === "taller") {
      setOrdenes(prev => [itemOriginal, ...(Array.isArray(prev) ? prev : [])]);
    } else if (moduloOrigen === "carwash") {
      setCarwash(prev => [itemOriginal, ...(Array.isArray(prev) ? prev : [])]);
    } else if (moduloOrigen === "clientes") {
      setClientes(prev => [itemOriginal, ...(Array.isArray(prev) ? prev : [])]);
    } else if (moduloOrigen === "vehiculos") {
      setVehiculos(prev => [itemOriginal, ...(Array.isArray(prev) ? prev : [])]);
    } else if (moduloOrigen === "workshopInventory") {
      setWorkshopInventory(prev => [itemOriginal, ...(Array.isArray(prev) ? prev : [])]);
    } else if (moduloOrigen === "cafeteriaInventory") {
      setCafeteriaInventory(prev => [itemOriginal, ...(Array.isArray(prev) ? prev : [])]);
    } else if (moduloOrigen === "compras") {
      setCompras(prev => [itemOriginal, ...(Array.isArray(prev) ? prev : [])]);
    }

    setPapeleraSistema(prev => (prev || []).filter(p => p.id !== trashId));
    alert(`¡Elemento del módulo "${moduloOrigen}" restituido con éxito!`);
  };

  // ⏪ POINT-IN-TIME RESTORE: Restores full system state to a chosen hourly snapshot
  const restoreSystemSnapshot = (snapshotId) => {
    const snapshot = (systemSnapshots || []).find(s => s.id === snapshotId);
    if (!snapshot || !snapshot.data) return;

    const confirmRestore = window.confirm(
      `⚠️ RESTAURACIÓN DEL SISTEMA A UN PUNTO EN EL TIEMPO\n\n¿Estás seguro de restaurar el sistema al respaldo del ${new Date(snapshot.fecha).toLocaleString()}?\n\nEsto devolverá el 100% de las órdenes, lavados, inventarios y finanzas exactamente a como estaban en esa hora.`
    );
    if (!confirmRestore) return;

    const { data } = snapshot;

    if (Array.isArray(data.ordenes)) setOrdenes(data.ordenes);
    if (Array.isArray(data.carwash)) setCarwash(data.carwash);
    if (Array.isArray(data.clientes)) setClientes(data.clientes);
    if (Array.isArray(data.vehiculos)) setVehiculos(data.vehiculos);
    if (Array.isArray(data.workshopInventory)) setWorkshopInventory(data.workshopInventory);
    if (Array.isArray(data.cafeteriaInventory)) setCafeteriaInventory(data.cafeteriaInventory);
    if (Array.isArray(data.cuentasPorCobrar)) setCuentasPorCobrar(data.cuentasPorCobrar);
    if (Array.isArray(data.cuentasPorPagar)) setCuentasPorPagar(data.cuentasPorPagar);
    if (Array.isArray(data.compras)) setCompras(data.compras);

    alert(`¡Sistema restaurado con éxito al estado del ${new Date(snapshot.fecha).toLocaleString()}!`);
  };

  // 💾 PERSISTENCE EFFECT
  useEffect(() => {
    setLocalStorage("usuarioActual", usuarioActual);
    
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

  // 🔄 Sync logged-in user permissions & role with updated usuarios array (e.g. when Admin updates permissions)
  useEffect(() => {
    if (usuarioActual && Array.isArray(usuarios) && usuarios.length > 0) {
      const match = usuarios.find(u => (u.user || "").toLowerCase().trim() === (usuarioActual.user || "").toLowerCase().trim());
      if (match) {
        const permsMatch = JSON.stringify(match.permissions) === JSON.stringify(usuarioActual.permissions);
        const roleMatch = match.rol === usuarioActual.rol;
        const passMatch = match.pass === usuarioActual.pass;
        if (!permsMatch || !roleMatch || !passMatch) {
          setUsuarioActual(match);
        }
      }
    }
  }, [usuarios]);

  // 💾 Save usuarios state to LocalStorage and sync to Cloud when changed
  useEffect(() => {
    if (Array.isArray(usuarios) && usuarios.length > 0) {
      setLocalStorage("usuarios", usuarios);
      syncKeyToCloud("usuarios", usuarios);
    }
  }, [usuarios]);

  // 🧹 Purge stale finanzas & configuracion permissions for Armando if cached locally
  useEffect(() => {
    if (usuarioActual && (usuarioActual.user || "").toLowerCase().trim().includes("armando")) {
      const perms = Array.isArray(usuarioActual.permissions) ? usuarioActual.permissions : [];
      const hasFinanzas = perms.includes("finanzas");
      const hasConfig = perms.includes("configuracion");
      if (hasFinanzas || hasConfig) {
        const cleanedPerms = perms.filter(p => p !== "finanzas" && p !== "configuracion");
        const updated = { ...usuarioActual, permissions: cleanedPerms };
        setUsuarioActual(updated);
        setLocalStorage("usuarioActual", updated);
        setUsuarios(prev => (Array.isArray(prev) ? prev.map(u => (u.user || "").toLowerCase().trim().includes("armando") ? updated : u) : [updated]));
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
    globalActiveSetters.papeleraSistema = setPapeleraSistema;
    globalActiveSetters.systemSnapshots = setSystemSnapshots;
    globalActiveSetters.setIsInitialPullDone = setIsInitialPullDone;
    globalActiveSetters.setRealtimeStatus = setRealtimeStatus;
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

  const globalBroadcastChannel = useRef(null);
  const instanceId = useRef(Math.random().toString(36).substring(2, 9));

  const getLatestLocalValue = (k) => {
    const fromStorage = safeParseJSON(getLocalStorage(k, null));
    const fromRef = stateRef.current ? stateRef.current[k] : null;
    if (!fromStorage && !fromRef) return null;
    if (!fromStorage) return fromRef;
    if (!fromRef) return fromStorage;

    if (Array.isArray(fromStorage) && Array.isArray(fromRef)) {
      const combinedMap = new Map();
      fromRef.forEach((item, idx) => {
        if (!item) return;
        const id = item.id !== undefined && item.id !== null ? String(item.id) : `ref_${idx}`;
        combinedMap.set(id, item);
      });
      fromStorage.forEach((item, idx) => {
        if (!item) return;
        const id = item.id !== undefined && item.id !== null ? String(item.id) : `stg_${idx}`;
        combinedMap.set(id, item);
      });
      return Array.from(combinedMap.values());
    }
    return fromStorage || fromRef;
  };

  // Fetch a single key from cloud on-demand when notified via WebSocket Broadcast
  const fetchSingleKeyFromCloud = async (targetKey) => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const queryPromise = client
        .from('app_data')
        .select('key, value')
        .eq('key', targetKey);
      
      const { data, error } = await withTimeout(queryPromise, 4000, `Timeout en fetch de ${targetKey}`);
      if (error || !data || data.length === 0) return;

      const cloudRaw = data[0].value;
      const cloudValue = safeParseJSON(cloudRaw);
      const localValue = getLatestLocalValue(targetKey);

      const papeleraRaw = safeParseJSON(getLocalStorage("papeleraSistema", []));
      let mergedValue = mergeCollections(targetKey, localValue, cloudValue, papeleraRaw);

      if (ARRAY_KEYS.includes(targetKey) && !Array.isArray(mergedValue)) {
        if (mergedValue && typeof mergedValue === "object") {
          mergedValue = Object.values(mergedValue);
        } else {
          mergedValue = Array.isArray(cloudValue) ? cloudValue : [];
        }
      }

      const mergedValStr = JSON.stringify(mergedValue);
      const activeSetter = globalActiveSetters[targetKey];

      globalLastSynced[targetKey] = mergedValStr;
      if (activeSetter) activeSetter(mergedValue);
      setLocalStorage(targetKey, mergedValue);
    } catch (err) {
      console.warn(`[Sync] Error en fetch rápido de "${targetKey}":`, err.message);
    }
  };

  // Sync a key-value pair to cloud if it has actually changed
  const syncToCloud = async (baseKey, value) => {
    if (!isInitialPullDone) return; // Guard: prevent syncing local states before initial setup completes
    
    const client = getSupabaseClient();
    if (!client) return;

    const activeTenant = (tenantId || "lospits").toLowerCase().trim();
    const cloudKey = activeTenant === "lospits" ? baseKey : `${activeTenant}_${baseKey}`;

    const cleanVal = filterOutMockItems(baseKey, safeParseJSON(value));
    const valueStr = JSON.stringify(cleanVal);
    if (globalLastSynced[cloudKey] === valueStr) {
      return; // Already in sync, avoid loops
    }
    
    const ok = await syncKeyToCloud(cloudKey, cleanVal);
    if (ok) {
      globalLastSynced[cloudKey] = valueStr;
      if (activeTenant === "lospits") {
        syncKeyToCloud(`lospits_${baseKey}`, cleanVal);
      }
      // 🚀 Emit instant WebSocket Broadcast event to all active clients
      try {
        if (globalBroadcastChannel.current) {
          globalBroadcastChannel.current.send({
            type: 'broadcast',
            event: 'app_key_changed',
            payload: { key: cloudKey, senderId: instanceId.current }
          });
        }
      } catch (e) {}
    } else {
      console.warn(`[Sync] Falló la sincronización para la llave "${cloudKey}". Se reintentará en la próxima actualización.`);
    }
  };

  const failedPullCount = useRef(0);

  const forcePullFromCloud = async (isUserInitiated = false) => {
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
      if (isUserInitiated && activeSetRealtimeStatus) {
        activeSetRealtimeStatus("connecting");
      }
      
      const activeTenant = (tenantId || "lospits").toLowerCase().trim();
      const getScopedKey = (k) => activeTenant === "lospits" ? k : `${activeTenant}_${k}`;

      const cloudDataMap = new Map();
      const allKeysList = Array.from(new Set([...ARRAY_KEYS, "usuarios", "ordenes", "carwash", "parkingEntries", "parkingHistory", "vehiculosVenta", "workshopInventory", "cafeteriaInventory", "cafeteriaSales", "carwashPresets", "carwashInventory", "carwashConsumption", "tiendaSales", "cuentasPorCobrar", "cuentasPorPagar", "fixedCosts", "clientes", "vehiculos", "compras", "toolsInventory", "accesoriosInventory", "papeleraSistema", "cotizacionesRepuestos"])).filter(k => k !== "systemSnapshots" && k !== "app_data_backup_snapshot");

      const scopedQueryKeys = allKeysList.map(k => getScopedKey(k));
      if (activeTenant === "lospits") {
        allKeysList.forEach(k => scopedQueryKeys.push(`lospits_${k}`));
      }

      // Consultar llaves en paralelo en lotes de 8 para respuesta ultrarrápida (< 300ms)
      const chunkSize = 8;
      const promises = [];
      for (let i = 0; i < scopedQueryKeys.length; i += chunkSize) {
        const chunk = scopedQueryKeys.slice(i, i + chunkSize);
        const queryPromise = client
          .from('app_data')
          .select('key, value')
          .in('key', chunk);
        promises.push(withTimeout(queryPromise, 3500, `Timeout en lote`));
      }

      const results = await Promise.allSettled(promises);
      results.forEach(res => {
        if (res.status === "fulfilled" && res.value && res.value.data) {
          res.value.data.forEach(item => {
            cloudDataMap.set(item.key, item.value);
          });
        }
      });

      allKeysList.forEach(baseKey => {
        const activeSetter = globalActiveSetters[baseKey];
        const scopedKey = getScopedKey(baseKey);

        let cloudRaw = cloudDataMap.get(scopedKey);
        if (cloudRaw === undefined && activeTenant === "lospits") {
          cloudRaw = cloudDataMap.get(`lospits_${baseKey}`) || cloudDataMap.get(baseKey);
        }

        const cloudValue = cloudRaw !== undefined ? safeParseJSON(cloudRaw) : null;
        const localValue = getTenantLocalStorage(baseKey, null, activeTenant);

        const papeleraRaw = cloudDataMap.get(getScopedKey("papeleraSistema"));
        let mergedValue = mergeCollections(baseKey, localValue, cloudValue, papeleraRaw);

        if (ARRAY_KEYS.includes(baseKey) && !Array.isArray(mergedValue)) {
          if (mergedValue && typeof mergedValue === "object") {
            mergedValue = Object.values(mergedValue);
          } else {
            mergedValue = Array.isArray(cloudValue) ? cloudValue : [];
          }
        }

        const mergedValStr = JSON.stringify(mergedValue);
        const cloudValStr = JSON.stringify(cloudValue);

        globalLastSynced[scopedKey] = mergedValStr;
        if (activeSetter) activeSetter(mergedValue);
        setTenantLocalStorage(baseKey, mergedValue, activeTenant);

        // Subir a Supabase solo si hay datos locales legítimos recién creados sin sincronizar
        if (mergedValStr !== cloudValStr && mergedValue !== null && mergedValue !== undefined) {
          syncKeyToCloud(scopedKey, mergedValue);
        }
      });

      // Procesar cualquier operación pendiente en la cola offline
      processOfflineQueue();

      failedPullCount.current = 0;
      globalSyncFlags.isInitialPullSucceeded = true;
      globalSyncFlags.isInitialPullDone = true;
      if (activeSetRealtimeStatus) activeSetRealtimeStatus("connected");
      const activeSetInitialPullDone = globalActiveSetters.setIsInitialPullDone || setIsInitialPullDone;
      if (activeSetInitialPullDone) activeSetInitialPullDone(true);
      return true;
    } catch (err) {
      console.warn("[Sync] Falló o expiró la respuesta del servidor:", err.message);
      failedPullCount.current += 1;
      const activeSetRealtimeStatus = globalActiveSetters.setRealtimeStatus || setRealtimeStatus;
      
      if (activeSetRealtimeStatus) activeSetRealtimeStatus("disconnected");

      const activeSetInitialPullDone = globalActiveSetters.setIsInitialPullDone || setIsInitialPullDone;
      if (activeSetInitialPullDone) activeSetInitialPullDone(true);
      return false;
    }
  };

  // Initial Sync from Cloud on mount + Background & Focus Sync
  useEffect(() => {
    forcePullFromCloud(true);

    const handleSyncEvent = () => {
      if (navigator.onLine && !document.hidden) {
        forcePullFromCloud(false);
      }
    };

    window.addEventListener("online", handleSyncEvent);
    window.addEventListener("focus", handleSyncEvent);
    document.addEventListener("visibilitychange", handleSyncEvent);

    const interval = setInterval(() => {
      if (navigator.onLine && !document.hidden && failedPullCount.current < 2) {
        forcePullFromCloud(false);
      }
    }, 15000);

    return () => {
      window.removeEventListener("online", handleSyncEvent);
      window.removeEventListener("focus", handleSyncEvent);
      document.removeEventListener("visibilitychange", handleSyncEvent);
      clearInterval(interval);
    };
  }, []);

  // ⏰ HOURLY BACKUP SCHEDULER & AUTO-PURGE TRASH ENGINE
  useEffect(() => {
    autoPurgeTrash();
    const cleanupScheduler = initHourlyBackupScheduler();
    return () => {
      if (cleanupScheduler) cleanupScheduler();
    };
  }, []);

  // Subscribe to Realtime Postgres changes + Instant Broadcast Channel once initial pull is complete
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !isInitialPullDone) return;

    const activeTenant = (tenantId || "lospits").toLowerCase().trim();

    const channel = client
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_data' },
        (payload) => {
          if (!payload.new) return;
          const { key, value } = payload.new;
          
          if (value === null || value === undefined) {
            return;
          }

          // 🔒 TENANT ISOLATION GUARD: Parse tenant and baseKey from key
          let eventTenant = "lospits";
          let baseKey = key;

          if (key.includes("_")) {
            const parts = key.split("_");
            const possibleTenant = parts[0].toLowerCase().trim();
            const restKey = parts.slice(1).join("_");
            if (restKey) {
              eventTenant = possibleTenant;
              baseKey = restKey;
            }
          }

          // 🛑 IF EVENT IS FOR A DIFFERENT TENANT, IGNORE IMMEDIATELY!
          if (eventTenant !== activeTenant) {
            return;
          }

          let sanitizedValue = safeParseJSON(value);
          
          if (ARRAY_KEYS.includes(baseKey)) {
            sanitizedValue = filterOutMockItems(baseKey, sanitizedValue);
            if (baseKey === "usuarios") {
              sanitizedValue = deduplicateUsers(sanitizedValue);
            }
            if (!Array.isArray(sanitizedValue)) {
              if (sanitizedValue && typeof sanitizedValue === "object") {
                sanitizedValue = Object.values(sanitizedValue);
              } else {
                return;
              }
            }
          }

          const currentLocalVal = getLatestLocalValue(baseKey);

          const mergedValue = mergeCollections(baseKey, currentLocalVal, sanitizedValue);
          const mergedValStr = JSON.stringify(mergedValue);
          const localValStr = stateRef.current ? JSON.stringify(stateRef.current[baseKey]) : "";

          if (localValStr === mergedValStr) {
            return; // No actual change, skip to avoid loop
          }

          const activeSetter = globalActiveSetters[baseKey];
          if (activeSetter) {
            globalLastSynced[key] = mergedValStr;
            activeSetter(mergedValue);
            setTenantLocalStorage(baseKey, mergedValue, activeTenant);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'app_key_changed' },
        (payload) => {
          if (payload && payload.payload && payload.payload.key) {
            if (payload.payload.senderId && payload.payload.senderId === instanceId.current) {
              return; // Ignorar el propio broadcast emitido por esta instancia
            }
            const targetKey = payload.payload.key;
            console.log(`[Instant Broadcast] Notificación de cambio recibida para la llave "${targetKey}"`);
            fetchSingleKeyFromCloud(targetKey);
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`[Realtime Sync] Status changed: ${status}`, err || '');
        const activeSetRealtimeStatus = globalActiveSetters.setRealtimeStatus || setRealtimeStatus;
        if (status === 'SUBSCRIBED') {
          activeSetRealtimeStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Reintento silencioso en segundo plano sin falsas alarmas si REST sigue funcionando
          setTimeout(() => {
            try {
              if (channel) channel.subscribe();
            } catch (e) {}
          }, 3000);
        }
      });

    globalBroadcastChannel.current = channel;

    return () => {
      client.removeChannel(channel);
    };
  }, [isInitialPullDone]);

  useEffect(() => {
    setTenantLocalStorage("ordenes", ordenes, tenantId);
    syncToCloud("ordenes", ordenes);
  }, [ordenes, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("carwash", carwash, tenantId);
    syncToCloud("carwash", carwash);
  }, [carwash, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("parkingEntries", parkingEntries, tenantId);
    syncToCloud("parkingEntries", parkingEntries);
  }, [parkingEntries, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("parkingRate", parkingRate, tenantId);
    syncToCloud("parkingRate", parkingRate);
  }, [parkingRate, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("parkingHistory", parkingHistory, tenantId);
    syncToCloud("parkingHistory", parkingHistory);
  }, [parkingHistory, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("vehiculosVenta", vehiculosVenta, tenantId);
    syncToCloud("vehiculosVenta", vehiculosVenta);
  }, [vehiculosVenta, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("payrollHistory", payrollHistory, tenantId);
    syncToCloud("payrollHistory", payrollHistory);
  }, [payrollHistory, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("workshopInventory", workshopInventory, tenantId);
    syncToCloud("workshopInventory", workshopInventory);
  }, [workshopInventory, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("cafeteriaInventory", cafeteriaInventory, tenantId);
    syncToCloud("cafeteriaInventory", cafeteriaInventory);
  }, [cafeteriaInventory, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("cafeteriaSales", cafeteriaSales, tenantId);
    syncToCloud("cafeteriaSales", cafeteriaSales);
  }, [cafeteriaSales, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("comisionMecanico", comisionMecanico, tenantId);
    syncToCloud("comisionMecanico", comisionMecanico);
  }, [comisionMecanico, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("dashboardPeriod", dashboardPeriod, tenantId);
    syncToCloud("dashboardPeriod", dashboardPeriod);
  }, [dashboardPeriod, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("customStartDate", customStartDate, tenantId);
    syncToCloud("customStartDate", customStartDate);
  }, [customStartDate, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("customEndDate", customEndDate, tenantId);
    syncToCloud("customEndDate", customEndDate);
  }, [customEndDate, tenantId]);

  useEffect(() => {
    const clean = (carwashPresets || []).filter((p, idx, self) => 
      p && p.tipo && idx === self.findIndex(t => t && t.tipo && t.tipo.toLowerCase().trim() === p.tipo.toLowerCase().trim())
    );
    if (clean.length !== (carwashPresets || []).length) {
      setCarwashPresets(clean);
    } else {
      setTenantLocalStorage("carwashPresets", clean, tenantId);
      syncToCloud("carwashPresets", clean);
    }
  }, [carwashPresets, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("carwashInventory", carwashInventory, tenantId);
    syncToCloud("carwashInventory", carwashInventory);
  }, [carwashInventory, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("carwashConsumption", carwashConsumption, tenantId);
    syncToCloud("carwashConsumption", carwashConsumption);
  }, [carwashConsumption, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("fixedCosts", fixedCosts, tenantId);
    syncToCloud("fixedCosts", fixedCosts);
  }, [fixedCosts, tenantId]);

  useEffect(() => {
    const cleanUsers = deduplicateUsers(usuarios);
    setTenantLocalStorage("usuarios", cleanUsers, tenantId);
    syncToCloud("usuarios", cleanUsers);
  }, [usuarios, tenantId]);

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
    setTenantLocalStorage("clientes", clientes, tenantId);
    syncToCloud("clientes", clientes);
  }, [clientes, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("vehiculos", vehiculos, tenantId);
    syncToCloud("vehiculos", vehiculos);
  }, [vehiculos, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("tiendaSales", tiendaSales, tenantId);
    syncToCloud("tiendaSales", tiendaSales);
  }, [tiendaSales, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("cuentasPorCobrar", cuentasPorCobrar, tenantId);
    syncToCloud("cuentasPorCobrar", cuentasPorCobrar);
  }, [cuentasPorCobrar, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("cuentasPorPagar", cuentasPorPagar, tenantId);
    syncToCloud("cuentasPorPagar", cuentasPorPagar);
  }, [cuentasPorPagar, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("compras", compras, tenantId);
    syncToCloud("compras", compras);
  }, [compras, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("toolsInventory", toolsInventory, tenantId);
    syncToCloud("toolsInventory", toolsInventory);
  }, [toolsInventory, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("accesoriosInventory", accesoriosInventory, tenantId);
    syncToCloud("accesoriosInventory", accesoriosInventory);
  }, [accesoriosInventory, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("cotizacionesRepuestos", cotizacionesRepuestos, tenantId);
    syncToCloud("cotizacionesRepuestos", cotizacionesRepuestos);
  }, [cotizacionesRepuestos, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("papeleraSistema", papeleraSistema, tenantId);
    syncToCloud("papeleraSistema", papeleraSistema);
  }, [papeleraSistema, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("systemSnapshots", systemSnapshots, tenantId);
    syncToCloud("systemSnapshots", systemSnapshots);
  }, [systemSnapshots, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("puntosRecompensas", puntosRecompensas, tenantId);
    syncToCloud("puntosRecompensas", puntosRecompensas);
  }, [puntosRecompensas, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("catalogoPremios", catalogoPremios, tenantId);
    syncToCloud("catalogoPremios", catalogoPremios);
  }, [catalogoPremios, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("reglasPrograma", reglasPrograma, tenantId);
    syncToCloud("reglasPrograma", reglasPrograma);
  }, [reglasPrograma, tenantId]);

  const usuarioActivo = usuarios.find(u => (u.user || "").toLowerCase().trim() === (usuarioActual?.user || "").toLowerCase().trim()) || usuarioActual;

  const userHasPermission = (user, tabId) => {
    if (!user) return false;
    if (tabId === "pantalla") return true; // Pantalla de monitoreo accesible para todos los usuarios registrados
    const activeUser = usuarios.find(u => (u.user || "").toLowerCase().trim() === ((typeof user === "string" ? user : user.user) || "").toLowerCase().trim()) || user;
    const activeUsername = ((typeof activeUser === "string" ? activeUser : activeUser.user) || "").toLowerCase().trim();

    // Primary master super-admin ("admin") retains full access
    if (activeUsername === "admin") return true;

    // STRICT EXCLUSIVE ENFORCEMENT: ONLY grant access if module is explicitly listed in user's permissions array!
    if (Array.isArray(activeUser.permissions)) {
      return activeUser.permissions.includes(tabId);
    }

    // No fallback defaults: If permissions array is missing, deny access
    return false;
  };

  // Auth Operations
  const handleLogin = (userObj) => {
    let cleanUserObj = userObj;
    if (userObj && (userObj.user || "").toLowerCase().trim() === "armando avila") {
      if (Array.isArray(userObj.permissions)) {
        cleanUserObj = { ...userObj, permissions: userObj.permissions.filter(p => p !== "finanzas") };
      }
    }
    setUsuarioActual(cleanUserObj);
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
        activeTenantId={tenantId}
        onTenantChange={handleSwitchTenant}
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
        handleForceSyncMobile={forcePullFromCloud}
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
            usuarioActual={usuarioActivo}
            userHasPermission={userHasPermission}
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
            cotizacionesRepuestos={cotizacionesRepuestos}
            setCotizacionesRepuestos={setCotizacionesRepuestos}
            softDelete={softDelete}
            compras={compras}
            setCompras={setCompras}
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
            setOrdenes={setOrdenes}
            carwash={carwash}
            setCarwash={setCarwash}
            workshopInventory={workshopInventory}
            mecanicos={mecanicos}
            usuarioActual={usuarioActivo}
            compras={compras}
            setCompras={setCompras}
            cuentasPorCobrar={cuentasPorCobrar}
            setCuentasPorCobrar={setCuentasPorCobrar}
            cuentasPorPagar={cuentasPorPagar}
            setCuentasPorPagar={setCuentasPorPagar}
          />
        )}

        {currentTab === "cotizacionesVendedores" && userHasPermission(usuarioActivo, "cotizacionesVendedores") && (
          <VendorQuotes 
            ordenes={ordenes}
            cotizacionesRepuestos={cotizacionesRepuestos}
            setCotizacionesRepuestos={setCotizacionesRepuestos}
            usuarioActual={usuarioActivo}
          />
        )}

        {currentTab === "recompensas" && userHasPermission(usuarioActivo, "recompensas") && (
          <LoyaltyRewards 
            clientes={clientes}
            puntosRecompensas={puntosRecompensas}
            catalogoPremios={catalogoPremios}
            historialCanjes={historialCanjes}
            reglasPrograma={reglasPrograma}
            onUpdatePuntos={setPuntosRecompensas}
            onCanjearPremio={handleCanjearPremio}
            onUpdateCatalogo={setCatalogoPremios}
            onUpdateReglas={setReglasPrograma}
            usuarioActual={usuarioActivo}
          />
        )}

        {currentTab === "finanzas" && userHasPermission(usuarioActivo, "finanzas") && (
          <Finance 
            usuarioActual={usuarioActivo}
            ordenes={ordenes} 
            setOrdenes={setOrdenes}
            carwash={carwash} 
            setCarwash={setCarwash}
            mecanicos={mecanicos} 
            lavadores={lavadores} 
            parkingHistory={parkingHistory}
            cafeteriaSales={cafeteriaSales}
            tiendaSales={tiendaSales}
            usuarios={usuarios}
            fixedCosts={fixedCosts}
            vehiculosVenta={vehiculosVenta}
            setVehiculosVenta={setVehiculosVenta}
            cuentasPorCobrar={cuentasPorCobrar}
            cuentasPorPagar={cuentasPorPagar}
            carwashConsumption={carwashConsumption}
            compras={compras}
            setCompras={setCompras}
            payrollHistory={payrollHistory}
            setPayrollHistory={setPayrollHistory}
            carwashPresets={carwashPresets}
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
            compras={compras}
            clientes={clientes}
            setClientes={setClientes}
            vehiculos={vehiculos}
            setVehiculos={setVehiculos}
            realtimeStatus={realtimeStatus}
            papeleraSistema={papeleraSistema}
            setPapeleraSistema={setPapeleraSistema}
            systemSnapshots={systemSnapshots}
            setSystemSnapshots={setSystemSnapshots}
            softDelete={softDelete}
            restoreTrashItem={restoreTrashItem}
            restoreSystemSnapshot={restoreSystemSnapshot}
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
            puntosRecompensas={puntosRecompensas}
          />
        )}

        {currentTab === "pantalla" && userHasPermission(usuarioActivo, "pantalla") && (
          <Pantalla 
            ordenes={ordenes}
            carwash={carwash}
            usuarioActual={usuarioActivo}
            usuarios={usuarios}
          />
        )}

        {currentTab === "saasAdmin" && (usuarioActivo?.user || "").toLowerCase().trim() === "admin" && (
          <SaaSAdmin 
            activeTenantId={tenantId}
            onSwitchTenant={handleSwitchTenant}
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