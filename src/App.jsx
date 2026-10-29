import { useState, useEffect, useRef, useMemo } from "react";
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
import CustomerPortal from "./components/CustomerPortal";
import SaaSAdmin from "./components/SaaSAdmin";
import Citas from "./components/Citas";
import InicioMovil from "./components/movil/InicioMovil";
import { BarraInferiorMovil, MenuMasMovil, modulosPermitidos } from "./components/movil/NavegacionMovil";
import { useEsMovil } from "./utils/movil";
import { DEFAULT_CATALOGO_PREMIOS } from "./utils/wallet";
import { DEFAULT_BRANDING, getCleanBranding, setActiveBranding } from "./utils/branding";
import { DEFAULT_ACTIVE_MODULES, isModuleActive } from "./utils/modulesConfig";
import { getLocalStorage, setLocalStorage, getTenantLocalStorage, setTenantLocalStorage, getActiveTenantId, restoreMasterBackup, purgeStorageBloat, getDeletedUsernames, addDeletedUsername, removeDeletedUsername, getDeletedFixedCosts, addDeletedFixedCost, removeDeletedFixedCost, getTombMap, saveTombMap, mergeTombMaps, normalizeTombMap } from "./utils/storage";
import { getSupabaseClient, syncKeyToCloud, safeParseJSON, withTimeout, processOfflineQueue, cloudKeyVersions, getSessionForTenant, getSession, clearSession, logoutRemoto, cloudGet, cloudVersions, isSuperAdminSession, removeFromOfflineQueue } from "./utils/supabase";
import { getMissingExternalCosts } from "./utils/workshopCalc";
import { getPuntosPorVencer, yaSeAvisoVencimiento } from "./utils/loyaltyExpiry";
import { initHourlyBackupScheduler, checkAndCreateHourlyBackup } from "./services/backupService";
import { autoPurgeTrash } from "./services/trashService";

// ☁️ GLOBAL CLOUD SYNC STATE (Saves data across React remounts/Strict Mode)
const globalLastSynced = {};
const globalSyncFlags = {
  isInitialPullDone: false,
  isInitialPullSucceeded: false,
  isInitialPullInProgress: false,
  isPullRunning: false // 🛡️ Guard against overlapping full pulls
};

// 🚀 Debounce timers for broadcast-triggered fetches
const pendingBroadcastFetches = {};
// 🚀 Coalescencia de escrituras: una subida activa por llave, el último valor queda pendiente
const syncInFlight = {};
const syncPending = {};
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
  regalosPasesReferidos: null,
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
  "reglasPrograma",
  "regalosPasesReferidos",
  "cotizacionesRepuestos",
  "citas",
  "payrollHistory",
  "nominaMovimientos",
  "activeModules",
  "cotizacionesExpress",
  "paquetesServicios"
];

// ==========================================
// 🕒 MARCA DE TIEMPO POR REGISTRO (updatedAt)
// Cada vez que un módulo modifica un registro (orden, lavado, compra...) se le pone
// updatedAt = ahora. Así, al fusionar con la nube, SIEMPRE gana la versión editada más
// reciente y los cambios hechos en un dispositivo no son revertidos por otro.
// ==========================================
const stampChangedItems = (prev, next) => {
  if (!Array.isArray(next) || !Array.isArray(prev) || next === prev) return next;
  const prevById = new Map();
  prev.forEach(i => {
    if (i && typeof i === "object" && i.id !== undefined && i.id !== null) prevById.set(String(i.id), i);
  });
  const now = new Date().toISOString();
  let changed = false;
  const out = next.map(item => {
    if (!item || typeof item !== "object" || item.id === undefined || item.id === null) return item;
    const old = prevById.get(String(item.id));
    if (old === item) return item;
    if (!old) {
      if (item.updatedAt) return item;
      changed = true;
      return { ...item, updatedAt: now };
    }
    if (old.updatedAt !== item.updatedAt) return item; // el módulo ya lo marcó
    const keys = new Set([...Object.keys(old), ...Object.keys(item)]);
    let diff = false;
    for (const k of keys) {
      if (k === "updatedAt") continue;
      if (old[k] !== item[k]) { diff = true; break; }
    }
    if (!diff) return item;
    changed = true;
    return { ...item, updatedAt: now };
  });
  return changed ? out : next;
};

const makeStampedSetter = (rawSetter) => (valOrFn) =>
  rawSetter(prev => stampChangedItems(prev, typeof valOrFn === "function" ? valOrFn(prev) : valOrFn));

const filterOutMockItems = (key, list) => {
  if (!Array.isArray(list)) return list;
  return list.filter(item => {
    if (!item || typeof item !== "object") return false;
    if (Object.keys(item).length === 0) return false;
    if (key === "carwash") {
      const hasId = item.id !== undefined && item.id !== null && String(item.id).trim() !== "";
      const hasContent = Boolean(item.cliente || item.vehiculo || item.placa || item.servicio || item.total);
      return hasId || hasContent;
    }
    if (key === "ordenes") {
      const hasId = item.id !== undefined && item.id !== null && String(item.id).trim() !== "";
      const hasContent = Boolean(item.cliente || item.vehiculo || item.placa);
      return hasId || hasContent;
    }
    return true;
  });
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
const mergeCollections = (key, localValRaw, cloudValRaw, trashRaw = null, activeTenantOverride = null) => {
  const localVal = filterOutMockItems(key, safeParseJSON(localValRaw));
  const cloudVal = filterOutMockItems(key, safeParseJSON(cloudValRaw));

  // 🗑️ SOFT-DELETE REGISTRY: Extraer todos los IDs resguardados en Papelera para evitar que resuciten
  const activeTenant = (activeTenantOverride || getActiveTenantId()).toLowerCase().trim();
  const deletedItemIds = new Set();
  const deletedScopedIds = new Set();
  const trashItems = trashRaw !== null ? safeParseJSON(trashRaw) : safeParseJSON(getTenantLocalStorage("papeleraSistema", [], activeTenant));
  if (Array.isArray(trashItems)) {
    trashItems.forEach(entry => {
      if (!entry) return;
      const entryTenant = (entry.tenantId || "lospits").toLowerCase().trim();
      if (entryTenant !== activeTenant) {
        return; // 🔒 Ignorar estricta y absolutamente elementos eliminados de otros talleres!
      }
      const entryKey = (entry.moduloOrigen || entry.module || entry.key || entry.tablaOriginal || entry.origen || "").toLowerCase().trim();
      const targetKey = String(key).toLowerCase().trim();
      if (entryKey && entryKey !== targetKey) {
        if (!(entryKey === "taller" && targetKey === "ordenes") && !(entryKey === "ordenes" && targetKey === "taller")) {
          return; // Ignorar elementos eliminados de otros módulos
        }
      }
      const origId = entry.targetOriginalId || entry.originalId || (entry.itemOriginal && entry.itemOriginal.id) || (entry.originalData && entry.originalData.id);
      if (origId !== undefined && origId !== null && String(origId).trim() !== "" && String(origId) !== "undefined" && String(origId) !== "null") {
        const cleanId = String(origId).trim();
        deletedItemIds.add(cleanId);
        deletedScopedIds.add(`${activeTenant}_${cleanId}`);
      }
      if (entry.targetScopedId) {
        deletedScopedIds.add(String(entry.targetScopedId).trim());
      }
    });
  }

  const isItemDeleted = (item) => {
    if (!item) return true;
    const candidates = [];
    if (item.id !== undefined && item.id !== null) candidates.push(item.id);
    if (item.uuid) candidates.push(item.uuid);
    if (item.targetOriginalId) candidates.push(item.targetOriginalId);
    if (item.originalId) candidates.push(item.originalId);

    // Contextual candidates based on module key to avoid false-positive deletions
    // (e.g., an order must NEVER be marked deleted just because a vehicle or phone was once deleted)
    if (key === "clientes") {
      if (item.telefono) candidates.push(item.telefono);
      if (item.clienteTelefono) candidates.push(item.clienteTelefono);
    } else if (key === "vehiculos") {
      if (item.placa) candidates.push(item.placa);
      if (item.chasis) candidates.push(item.chasis);
    } else if (key === "workshopInventory" || key === "cafeteriaInventory" || key === "carwashInventory" || key === "toolsInventory" || key === "accesoriosInventory") {
      if (item.code) candidates.push(item.code);
      if (item.codigo) candidates.push(item.codigo);
    } else if (key === "usuarios") {
      if (item.user) candidates.push(item.user);
      if (item.username) candidates.push(item.username);
    } else if (key === "fixedCosts") {
      if (item.name) candidates.push(item.name);
    }

    for (const cand of candidates) {
      if (cand !== undefined && cand !== null) {
        const strId = String(cand).trim();
        if (strId !== "" && strId !== "undefined" && strId !== "null") {
          const upper = strId.toUpperCase();
          if (
            deletedScopedIds.has(`${activeTenant}_${strId}`) ||
            deletedScopedIds.has(`${activeTenant}_${upper}`) ||
            deletedItemIds.has(strId) ||
            deletedItemIds.has(upper)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const CONFIG_KEYS = ["fixedCosts", "carwashPresets", "usuarios", "activeModules"];
  const isConfigKey = CONFIG_KEYS.includes(key);

  const cleanLocal = isConfigKey ? (Array.isArray(localVal) ? localVal : []) : (Array.isArray(localVal) ? localVal.filter(item => !isItemDeleted(item)) : localVal);
  const cleanCloud = isConfigKey ? (Array.isArray(cloudVal) ? cloudVal : []) : (Array.isArray(cloudVal) ? cloudVal.filter(item => !isItemDeleted(item)) : cloudVal);

  if (isConfigKey) {
    if (key === "activeModules") {
      const cMods = Array.isArray(cleanCloud) ? cleanCloud : [];
      const lMods = Array.isArray(cleanLocal) ? cleanLocal : [];
      const combined = Array.from(new Set([...lMods, ...cMods])).filter(item => typeof item === "string" && item.trim() !== "");
      return combined.length > 0 ? combined : DEFAULT_ACTIVE_MODULES;
    }

    if (key === "usuarios") {
      const deletedUsers = getDeletedUsernames(activeTenant);
      const filterActive = (arr) => (Array.isArray(arr) ? deduplicateUsers(arr) : []).filter(u => {
        const uName = String(u?.user || u?.username || "").toLowerCase().trim();
        return uName && !deletedUsers.has(uName) && !(activeTenant === "lospits" && uName.includes("cristian"));
      });
      const cloudUsers = filterActive(cleanCloud);
      const localUsers = filterActive(cleanLocal);
      const mergedUsersMap = new Map();
      localUsers.forEach(u => {
        const uKey = String(u.user || u.username || "").toLowerCase().trim();
        if (uKey && !deletedUsers.has(uKey)) mergedUsersMap.set(uKey, u);
      });
      cloudUsers.forEach(u => {
        const uKey = String(u.user || u.username || "").toLowerCase().trim();
        if (uKey && !deletedUsers.has(uKey)) {
          const existing = mergedUsersMap.get(uKey);
          mergedUsersMap.set(uKey, existing ? { ...existing, ...u } : u);
        }
      });
      // 🔒 La nube es la referencia: nunca conservar contraseñas locales tras fusionar
      return Array.from(mergedUsersMap.values()).map(u => {
        const { pass, passHash, cambioClave, renombradoDe, ...limpio } = u || {};
        return limpio;
      });
    }

    if (key === "fixedCosts") {
      const deletedCosts = getDeletedFixedCosts(activeTenant);
      const isCostDeleted = (item) => {
        if (!item) return true;
        const cId = item?.id !== undefined && item?.id !== null ? String(item.id).toLowerCase().trim() : "";
        const cName = item?.name ? String(item.name).toLowerCase().trim() : "";
        return (cId && deletedCosts.has(cId)) || (cName && deletedCosts.has(cName));
      };
      const filteredCloud = (Array.isArray(cleanCloud) ? cleanCloud : []).filter(c => !isCostDeleted(c));
      const filteredLocal = (Array.isArray(cleanLocal) ? cleanLocal : []).filter(c => !isCostDeleted(c));
      const mergedConfigMap = new Map();
      filteredCloud.forEach((cItem, idx) => {
        const cId = cItem?.id !== undefined ? String(cItem.id) : (cItem?.name || `c_${idx}`);
        mergedConfigMap.set(String(cId).toLowerCase().trim(), cItem);
      });
      filteredLocal.forEach((lItem, idx) => {
        const lId = lItem?.id !== undefined ? String(lItem.id) : (lItem?.name || `l_${idx}`);
        const cMatch = mergedConfigMap.get(String(lId).toLowerCase().trim());
        mergedConfigMap.set(String(lId).toLowerCase().trim(), cMatch ? { ...cMatch, ...lItem } : lItem);
      });
      return Array.from(mergedConfigMap.values());
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

    if (key === "puntosRecompensas") {
      const mergedMap = new Map();
      cleanCloud.forEach((p, idx) => {
        const id = (p.telefono && String(p.telefono).trim()) || (p.nombre && String(p.nombre).trim().toLowerCase()) || `cloud_p_${idx}`;
        mergedMap.set(id, p);
      });
      cleanLocal.forEach((p, idx) => {
        const id = (p.telefono && String(p.telefono).trim()) || (p.nombre && String(p.nombre).trim().toLowerCase()) || `local_p_${idx}`;
        if (!mergedMap.has(id)) {
          mergedMap.set(id, p);
        } else {
          const cloudItem = mergedMap.get(id);
          const ptsCloud = parseInt(cloudItem.puntos) || 0;
          const ptsLocal = parseInt(p.puntos) || 0;
          mergedMap.set(id, {
            ...cloudItem,
            ...p,
            puntos: Math.max(ptsCloud, ptsLocal)
          });
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
      if (key === "puntosRecompensas") {
        const tel = String(item.telefono || '').trim();
        const nm = String(item.nombre || '').toLowerCase().trim();
        return `pts_${tel || nm || idx}`;
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

      // Primary conflict resolution: record with newer updatedAt timestamp wins
      if (cNorm.updatedAt || lNorm.updatedAt) {
        if (timeL > timeC) {
          winnerBase = lNorm;
          loserBase = cNorm;
        } else {
          winnerBase = cNorm;
          loserBase = lNorm;
        }
      } else {
        // Cloud is authoritative by default when updatedAt timestamps are missing or equal
        winnerBase = cNorm;
        loserBase = lNorm;
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

    cleanCloud.forEach((item, idx) => {
      if (!isItemDeleted(item)) {
        const norm = normalizeStatus(item);
        const id = getItemId(norm, idx);
        mergedMap.set(id, norm);
      }
    });

    cleanLocal.forEach((item, idx) => {
      if (!isItemDeleted(item)) {
        const norm = normalizeStatus(item);
        const id = getItemId(norm, idx);
        if (!mergedMap.has(id)) {
          mergedMap.set(id, norm);
        } else {
          const cloudItem = mergedMap.get(id);
          mergedMap.set(id, mergeSingleItem(cloudItem, norm));
        }
      }
    });

    return Array.from(mergedMap.values());
  }

  if (key === "usuarios") {
    const rawDedup = deduplicateUsers(cleanCloud);
    if (activeTenant === "lospits") {
      return rawDedup.filter(u => !String(u?.user || "").toLowerCase().includes("cristian"));
    }
    return rawDedup;
  }
  return cleanCloud;
};



export default function App() {
  const isTenantSwitchingRef = useRef(false);

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
    isTenantSwitchingRef.current = true;
    const clean = (newTenant || "lospits").toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
    setTenantId(clean);
    setLocalStorage("current_tenant_id", clean);
    window.location.reload();
  };

  // 🔐 USER DEFINITIONS
  const [usuarios, setUsuarios] = useState(() => {
    const val = getTenantLocalStorage("usuarios", null, tenantId);
    const deletedUsers = getDeletedUsernames(tenantId);
    let localUsers = Array.isArray(val) ? val : [];

    // Filter out deleted users and foreign cristian account (solo en Los Pits)
    localUsers = localUsers.filter(u => {
      const uName = String(u?.user || "").toLowerCase().trim();
      return uName && !deletedUsers.has(uName) && !(tenantId === "lospits" && uName.includes("cristian"));
    });

    // Fallback ONLY when database/localStorage has no users at all (brand new setup)
    if (localUsers.length === 0) {
      if (tenantId === "lospits") {
        localUsers = [
          { user: "admin", rol: "admin", permissions: ["dashboard", "taller", "carwash", "parqueo", "bodega", "cafeteria", "finanzas", "repuestosFaltantes", "configuracion", "historial", "tienda", "cuentas", "vehiculosVenta", "clientesVehiculos", "compras", "accesorios"], salarioBase: 15000, comisionTaller: 10, comisionCarwash: 5, comisionarLabor: true, comisionarRepuestos: true, comisionarCarwash: true, comisionRepuestos: 5, nombreCompleto: "Alan Estrada" }
        ];
      }
    }

    const loaded = deduplicateUsers(localUsers);
    return loaded.map(u => {
      const updatedPerms = Array.isArray(u.permissions) ? u.permissions : [];
      
      const comisionarLabor = u.comisionarLabor !== undefined ? u.comisionarLabor : (u.rol?.toLowerCase() !== "lavador");
      const comisionarRepuestos = u.comisionarRepuestos !== undefined ? u.comisionarRepuestos : (u.rol?.toLowerCase() === "jefe de taller");
      const comisionarCarwash = u.comisionarCarwash !== undefined ? u.comisionarCarwash : (u.rol?.toLowerCase() === "lavador" || u.rol?.toLowerCase() === "admin" || u.rol?.toLowerCase() === "cajero");
      const comisionRepuestos = u.comisionRepuestos !== undefined ? u.comisionRepuestos : (u.rol?.toLowerCase() === "jefe de taller" ? 5 : 0);

      // 🔒 Las contraseñas viven solo en el servidor: borrar las copias viejas de este dispositivo
      const { pass, passHash, ...sinClave } = u;
      const conservarClave = sinClave.cambioClave && pass;

      return {
        ...sinClave,
        ...(conservarClave ? { pass } : {}),
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
    // 🔐 Sin una sesión válida emitida por el servidor no hay usuario activo (se pide iniciar sesión)
    const serverSession = getSessionForTenant(tenantId);
    if (!serverSession) return null;
    // 🔒 Read session scoped by tenant to prevent cross-tenant session leaks
    const scopedSessionKey = `${tenantId}_usuarioActual`;
    let saved = getLocalStorage(scopedSessionKey, null);
    if (!saved || String(saved.user || "").toLowerCase().trim() !== String(serverSession.usuario?.user || "").toLowerCase().trim()) {
      saved = serverSession.usuario || null;
    }
    // One-time migration: if scoped key doesn't exist, try unscoped key for lospits only
    if (!saved && tenantId === "lospits") {
      saved = getLocalStorage("usuarioActual", null);
      if (saved) {
        setLocalStorage(scopedSessionKey, saved);
      }
    }
    // 🛡️ If saved user in lospits is foreign "cristian", discard it!
    if (tenantId === "lospits" && saved && String(saved.user || "").toLowerCase().includes("cristian")) {
      try {
        localStorage.removeItem(scopedSessionKey);
        localStorage.removeItem("usuarioActual");
      } catch (e) {}
      return null;
    }
    if (saved && (saved.user || "").toLowerCase().trim() === "armando avila") {
      if (Array.isArray(saved.permissions)) {
        saved.permissions = saved.permissions.filter(p => p !== "finanzas");
      }
    }
    return saved;
  });

  // 🧹 Auto-purge any foreign "cristian" account from Los Pits state and sync clean list to Supabase
  useEffect(() => {
    if (tenantId === "lospits" && Array.isArray(usuarios)) {
      const hasCristian = usuarios.some(u => String(u?.user || "").toLowerCase().includes("cristian"));
      if (hasCristian) {
        const cleaned = usuarios.filter(u => !String(u?.user || "").toLowerCase().includes("cristian"));
        setUsuarios(cleaned);
        setTenantLocalStorage("usuarios", cleaned, "lospits");
        syncToCloud("usuarios", cleaned);
      }
    }
    if (tenantId === "lospits" && usuarioActual && String(usuarioActual?.user || "").toLowerCase().includes("cristian")) {
      setUsuarioActual(null);
      try {
        localStorage.removeItem("lospits_usuarioActual");
        localStorage.removeItem("usuarioActual");
      } catch (e) {}
    }
  }, [tenantId, usuarios, usuarioActual]);

  // 📂 ROUTING TAB STATE
  const [currentTab, setCurrentTab] = useState(() => {
    try {
      const savedTab = sessionStorage.getItem("currentTab");
      if (savedTab) return savedTab;
    } catch (e) {}
    return "dashboard";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 📱 Navegación de celular (barra inferior + menú "Más"). En PC no cambia nada.
  const esMovil = useEsMovil();
  const [menuMasAbierto, setMenuMasAbierto] = useState(false);
  const inicioMovilAplicado = useRef(false);
  useEffect(() => {
    if (esMovil && !inicioMovilAplicado.current) {
      inicioMovilAplicado.current = true;
      if (currentTab === "dashboard") setCurrentTab("inicio");
    }
    if (!esMovil) {
      setMenuMasAbierto(false);
      if (currentTab === "inicio") setCurrentTab("dashboard");
    }
  }, [esMovil]);

  useEffect(() => {
    try {
      if (currentTab) sessionStorage.setItem("currentTab", currentTab);
    } catch (e) {}
  }, [currentTab]);

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

  const [fixedCosts, setFixedCosts] = useState(() => {
    const val = getTenantLocalStorage("fixedCosts", null, tenantId);
    const deletedCosts = getDeletedFixedCosts(tenantId);
    let list = Array.isArray(val) ? val : [];
    return list.filter(item => {
      if (!item) return false;
      const cId = item.id !== undefined && item.id !== null ? String(item.id).toLowerCase().trim() : "";
      const cName = item.name ? String(item.name).toLowerCase().trim() : "";
      return !((cId && deletedCosts.has(cId)) || (cName && deletedCosts.has(cName)));
    });
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

  // 💼 Préstamos, anticipos y bonos/incentivos de colaboradores (módulo de nómina)
  const [nominaMovimientos, setNominaMovimientos] = useState(() => {
    const val = getTenantLocalStorage("nominaMovimientos", [], tenantId);
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
  // Load puntosRecompensas from Supabase on initial mount if not present locally
  useEffect(() => {
    if (puntosRecompensas.length === 0 && getSessionForTenant(tenantId)) {
      (async () => {
        try {
          const activeTenant = (tenantId || getActiveTenantId()).toLowerCase().trim();
          // For pruebas tenant, the key is prefixed; for lospits it's the base key
          const cloudKey = activeTenant === "lospits" ? "puntosRecompensas" : `${activeTenant}_puntosRecompensas`;
          const rows = await cloudGet([cloudKey]);
          const data = rows[0];
          if (data && Array.isArray(data.value) && data.value.length > 0) {
            setPuntosRecompensas(data.value);
            setTenantLocalStorage("puntosRecompensas", data.value, tenantId);
          }
        } catch (e) {
          console.error('Exception while loading puntosRecompensas:', e);
        }
      })();
    }
  }, [tenantId]);

  const [catalogoPremios, setCatalogoPremios] = useState(() => {
    const val = getTenantLocalStorage("catalogoPremios", DEFAULT_CATALOGO_PREMIOS, tenantId);
    return Array.isArray(val) && val.length > 0 ? val : DEFAULT_CATALOGO_PREMIOS;
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
    const val = getTenantLocalStorage("reglasPrograma", defaultReglas, tenantId);
    return Array.isArray(val) && val.length > 0 ? val : defaultReglas;
  });

  const [regalosPasesReferidos, setRegalosPasesReferidos] = useState(() => {
    const val = getTenantLocalStorage("regalosPasesReferidos", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const [citas, setCitas] = useState(() => {
    const val = getTenantLocalStorage("citas", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  const [workshopBranding, setWorkshopBranding] = useState(() => {
    const val = getTenantLocalStorage("workshopBranding", DEFAULT_BRANDING, tenantId);
    return val && typeof val === "object" ? getCleanBranding(val) : DEFAULT_BRANDING;
  });
  // 🎨 Marca activa global: módulos sin la prop workshopBranding (Finanzas, Vehículos en Venta) la leen de aquí
  setActiveBranding(workshopBranding);

  const [activeModules, setActiveModules] = useState(() => {
    const val = getTenantLocalStorage("activeModules", DEFAULT_ACTIVE_MODULES, tenantId);
    if (!Array.isArray(val) || val.length === 0) return DEFAULT_ACTIVE_MODULES;
    // 🛡️ FIX: Detect and repair corrupted activeModules loaded from localStorage
    if (typeof val[0] !== "string") {
      console.warn("[Init] Corrupted activeModules in localStorage — resetting to defaults");
      const repaired = val.map(item => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const numKeys = Object.keys(item).filter(k => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
          if (numKeys.length > 0) return numKeys.map(k => item[k]).join("");
        }
        return null;
      }).filter(Boolean);
      const result = repaired.length > 0 ? repaired : DEFAULT_ACTIVE_MODULES;
      setTenantLocalStorage("activeModules", result, tenantId);
      return result;
    }
    return val;
  });

  const [cotizacionesExpress, setCotizacionesExpress] = useState(() => {
    const val = getTenantLocalStorage("cotizacionesExpress", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  // 📦 Paquetes de servicio (mano de obra + repuestos + insumos recurrentes)
  const [paquetesServicios, setPaquetesServicios] = useState(() => {
    const val = getTenantLocalStorage("paquetesServicios", [], tenantId);
    return Array.isArray(val) ? val : [];
  });

  // 🕒 Setters con marca de tiempo por registro para los módulos (la nube usa los setters crudos)
  const setOrdenesUI = useMemo(() => makeStampedSetter(setOrdenes), []);
  const setCarwashUI = useMemo(() => makeStampedSetter(setCarwash), []);
  const setComprasUI = useMemo(() => makeStampedSetter(setCompras), []);
  const setCuentasPorCobrarUI = useMemo(() => makeStampedSetter(setCuentasPorCobrar), []);
  const setCuentasPorPagarUI = useMemo(() => makeStampedSetter(setCuentasPorPagar), []);
  const setVehiculosVentaUI = useMemo(() => makeStampedSetter(setVehiculosVenta), []);
  const setCitasUI = useMemo(() => makeStampedSetter(setCitas), []);
  const setPayrollHistoryUI = useMemo(() => makeStampedSetter(setPayrollHistory), []);
  const setNominaMovimientosUI = useMemo(() => makeStampedSetter(setNominaMovimientos), []);

  // 🔔 Órdenes con trabajos externos sin costo registrado (pin de notificación)
  const missingExternalCostCount = useMemo(() => {
    try { return getMissingExternalCosts(ordenes).length; } catch (e) { return 0; }
  }, [ordenes]);

  // 🔔 Clientes cuyos Puntos Pits vencen en el próximo mes y aún no han sido avisados
  const puntosPorVencerCount = useMemo(() => {
    try {
      return getPuntosPorVencer(puntosRecompensas, reglasPrograma).filter(p => !yaSeAvisoVencimiento(p)).length;
    } catch (e) { return 0; }
  }, [puntosRecompensas, reglasPrograma]);

  // Note: Master backup seeding for first-visit is handled by getTenantLocalStorage.
  // User data in localStorage is ALWAYS trusted once it exists — never overwritten by static backup.


  // 🏆 LOYALTY REWARDS HELPER: Auto-calculates & awards Puntos Pits for completed services
  const addPuntosLealtad = (clienteKey, clienteNombre, monto, area, tallerLaborMonto = 0) => {
    if (!clienteKey && !clienteNombre) return;

    let puntosGanados = 0;
    const cleanArea = String(area || "").toLowerCase().trim();

    if (cleanArea === "carwash" || cleanArea === "cafeteria" || cleanArea === "detailing" || cleanArea === "tienda" || cleanArea === "parqueo" || cleanArea === "accesorios") {
      puntosGanados = Math.floor(parseFloat(monto) || 0);
    } else if (cleanArea === "taller") {
      const laborMonto = parseFloat(tallerLaborMonto) || parseFloat(monto) || 0;
      puntosGanados = Math.min(1500, Math.floor(laborMonto / 4));
    }
    if (puntosGanados <= 0) return;

    const targetPhone = String(clienteKey || "").replace(/\D/g, "");
    const targetName = String(clienteNombre || clienteKey || "").toLowerCase().trim();
    const activeTenant = (tenantId || getActiveTenantId()).toLowerCase().trim();

    setPuntosRecompensas(prev => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const idx = list.findIndex(p => {
        if (!p) return false;
        const pPhone = String(p.telefono || "").replace(/\D/g, "");
        const pName = String(p.nombre || "").toLowerCase().trim();
        if (targetPhone && pPhone && targetPhone === pPhone) return true;
        if (targetName && pName && targetName === pName) return true;
        return false;
      });
      
      const nowIso = new Date().toISOString();
      let updatedList = [];
      if (idx >= 0) {
        const existing = list[idx];
        updatedList = [...list];
        updatedList[idx] = { 
          ...existing, 
          telefono: existing.telefono || String(clienteKey || "").trim(),
          nombre: existing.nombre || String(clienteNombre || "Cliente").trim(),
          puntos: (parseInt(existing.puntos) || 0) + puntosGanados, 
          ultimaVisita: nowIso 
        };
      } else {
        const newRecord = { 
          id: `pts_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          telefono: String(clienteKey || "").trim(), 
          nombre: String(clienteNombre || "Cliente").trim(), 
          puntos: puntosGanados, 
          fechaRegistro: nowIso, 
          ultimaVisita: nowIso 
        };
        updatedList = [newRecord, ...list];
      }
      setTenantLocalStorage("puntosRecompensas", updatedList, activeTenant);
      syncToCloud("puntosRecompensas", updatedList);
      return updatedList;
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
    const rawId = String(item.id || "").trim();
    const deletedEntry = {
      id: `trash_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tenantId: activeTenant,
      moduloOrigen: modulo,
      itemOriginal: item,
      targetOriginalId: rawId,
      targetScopedId: `${activeTenant}_${rawId}`,
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
    } else if (moduloOrigen === "cuentasPorCobrar") {
      setCuentasPorCobrar(prev => [itemOriginal, ...(Array.isArray(prev) ? prev : [])]);
    } else if (moduloOrigen === "cuentasPorPagar") {
      setCuentasPorPagar(prev => [itemOriginal, ...(Array.isArray(prev) ? prev : [])]);
    } else if (moduloOrigen === "nominaMovimientos") {
      setNominaMovimientos(prev => [itemOriginal, ...(Array.isArray(prev) ? prev : [])]);
    } else if (moduloOrigen === "fixedCosts") {
      setFixedCosts(prev => [itemOriginal, ...(Array.isArray(prev) ? prev : [])]);
      if (itemOriginal?.id !== undefined) removeDeletedFixedCost(itemOriginal.id, tenantId);
      if (itemOriginal?.name) removeDeletedFixedCost(itemOriginal.name, tenantId);
    } else if (moduloOrigen === "usuarios") {
      setUsuarios(prev => [itemOriginal, ...(Array.isArray(prev) ? prev : [])]);
      if (itemOriginal?.user) removeDeletedUsername(itemOriginal.user, tenantId);
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

  // 💾 PERSISTENCE EFFECT — scoped to tenant for strict isolation
  useEffect(() => {
    const scopedSessionKey = `${tenantId}_usuarioActual`;
    setLocalStorage(scopedSessionKey, usuarioActual);
  }, [usuarioActual, tenantId]);

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

  // NOTE: usuarios are now synced exclusively via the tenant-scoped effect further below (syncToCloud + setTenantLocalStorage)

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
  // 🔐 Cambia cada vez que se inicia sesión para disparar la descarga y el canal en tiempo real
  const [sessionVersion, setSessionVersion] = useState(0);
  const sessionExpiredNotified = useRef(false);

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
    globalActiveSetters.puntosRecompensas = setPuntosRecompensas;
    globalActiveSetters.catalogoPremios = setCatalogoPremios;
    globalActiveSetters.historialCanjes = setHistorialCanjes;
    globalActiveSetters.reglasPrograma = setReglasPrograma;
    globalActiveSetters.citas = setCitas;
    globalActiveSetters.workshopBranding = setWorkshopBranding;
    globalActiveSetters.activeModules = setActiveModules;
    globalActiveSetters.cotizacionesExpress = setCotizacionesExpress;
    globalActiveSetters.paquetesServicios = setPaquetesServicios;
    globalActiveSetters.regalosPasesReferidos = setRegalosPasesReferidos;
    globalActiveSetters.cotizacionesRepuestos = setCotizacionesRepuestos;
    globalActiveSetters.payrollHistory = setPayrollHistory;
    globalActiveSetters.nominaMovimientos = setNominaMovimientos;
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
      accesoriosInventory,
      puntosRecompensas,
      catalogoPremios,
      historialCanjes,
      reglasPrograma,
      citas,
      workshopBranding,
      activeModules,
      cotizacionesExpress,
      regalosPasesReferidos,
      cotizacionesRepuestos,
      payrollHistory,
      nominaMovimientos,
      paquetesServicios
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
    accesoriosInventory,
    puntosRecompensas,
    catalogoPremios,
    historialCanjes,
    reglasPrograma,
    citas,
    workshopBranding,
    activeModules,
    cotizacionesExpress,
    regalosPasesReferidos,
    cotizacionesRepuestos,
    payrollHistory,
    nominaMovimientos,
    paquetesServicios
  ]);

  const globalBroadcastChannel = useRef(null);
  const instanceId = useRef(Math.random().toString(36).substring(2, 9));

  const getLatestLocalValue = (k) => {
    const activeTenant = (tenantId || "lospits").toLowerCase().trim();
    const fromStorage = safeParseJSON(getTenantLocalStorage(k, null, activeTenant));
    const fromRef = stateRef.current ? stateRef.current[k] : null;

    if (k === "usuarios") {
      const deletedUsers = getDeletedUsernames(activeTenant);
      const chosen = fromRef !== null && fromRef !== undefined ? fromRef : fromStorage;
      return (Array.isArray(chosen) ? chosen : []).filter(u => {
        const uName = String(u?.user || u?.username || "").toLowerCase().trim();
        return uName && !deletedUsers.has(uName) && !uName.includes("cristian");
      });
    }

    if (k === "fixedCosts") {
      const deletedCosts = getDeletedFixedCosts(activeTenant);
      const chosen = fromRef !== null && fromRef !== undefined ? fromRef : fromStorage;
      return (Array.isArray(chosen) ? chosen : []).filter(c => {
        if (!c) return false;
        const cId = c?.id !== undefined && c?.id !== null ? String(c.id).toLowerCase().trim() : "";
        const cName = c?.name ? String(c.name).toLowerCase().trim() : "";
        return !((cId && deletedCosts.has(cId)) || (cName && deletedCosts.has(cName)));
      });
    }

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

  // ==========================================
  // 🛡️ REGISTRO DE ELIMINACIONES SINCRONIZADO ENTRE DISPOSITIVOS
  // ==========================================
  const TOMB_KINDS = ["usuarios", "fixedCosts"];
  const canonTomb = (m) => {
    const n = normalizeTombMap(m);
    return JSON.stringify(Object.keys(n).sort().map(k => [k, n[k].d, n[k].r]));
  };

  // Fusiona las eliminaciones de la nube con las locales. Devuelve true si cambió algo localmente.
  const absorbCloudTombstones = (kind, cloudRaw, activeTenant) => {
    const local = getTombMap(kind, activeTenant);
    const cloud = normalizeTombMap(safeParseJSON(cloudRaw));
    const merged = mergeTombMaps(local, cloud);
    const mergedC = canonTomb(merged);
    const localChanged = mergedC !== canonTomb(local);
    if (localChanged) saveTombMap(kind, merged, activeTenant, false);
    if (mergedC !== canonTomb(cloud) && Object.keys(merged).length > 0) {
      syncKeyToCloud(`${activeTenant}_deleted_${kind}`, merged);
    }
    return localChanged;
  };

  // Quita del estado actual cualquier usuario / costo fijo marcado como eliminado
  const applyTombstonesToState = (activeTenant) => {
    const deadUsers = getDeletedUsernames(activeTenant);
    setUsuarios(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const f = arr.filter(u => {
        const n = String(u?.user || u?.username || "").toLowerCase().trim();
        return n === "admin" || !deadUsers.has(n);
      });
      return f.length === arr.length ? prev : f;
    });
    const deadCosts = getDeletedFixedCosts(activeTenant);
    setFixedCosts(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const f = arr.filter(c => {
        if (!c) return false;
        const id = c.id !== undefined && c.id !== null ? String(c.id).toLowerCase().trim() : "";
        const nm = c.name ? String(c.name).toLowerCase().trim() : "";
        return !((id && deadCosts.has(id)) || (nm && deadCosts.has(nm)));
      });
      return f.length === arr.length ? prev : f;
    });
  };

  // Fetch a single key from cloud on-demand when notified via WebSocket Broadcast
  const fetchSingleKeyFromCloud = async (targetKey, knownVersion = null) => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      // 🔑 Parse the scoped key to extract the base key (e.g., "lospits_ordenes" → "ordenes")
      // This mirrors the same logic used in the postgres_changes handler
      const activeTenant = (tenantId || "lospits").toLowerCase().trim();
      let baseKey = targetKey;
      if (targetKey.includes("_")) {
        const parts = targetKey.split("_");
        const possibleTenant = parts[0].toLowerCase().trim();
        const restKey = parts.slice(1).join("_");
        if (restKey && (possibleTenant === activeTenant || possibleTenant === "lospits")) {
          baseKey = restKey;
        }
      }

      // 🚀 Si ya tenemos esta versión exacta, no descargar nada
      if (knownVersion && cloudKeyVersions[targetKey] === knownVersion) return;

      const queryPromise = cloudGet([targetKey], 15000).then(rows => ({ data: rows, error: null }));
      
      const { data, error } = await withTimeout(queryPromise, 15000, `Timeout en fetch de ${targetKey}`);
      if (error || !data || data.length === 0) return;

      const fetchedVersion = Date.parse(data[0].updated_at) || 0;
      if (fetchedVersion) cloudKeyVersions[targetKey] = fetchedVersion;

      // 🛡️ Registro de eliminaciones de otro dispositivo
      if (baseKey.startsWith("deleted_")) {
        const kind = baseKey.replace("deleted_", "");
        if (TOMB_KINDS.includes(kind) && absorbCloudTombstones(kind, data[0].value, activeTenant)) {
          applyTombstonesToState(activeTenant);
        }
        return;
      }

      const cloudRaw = data[0].value;
      const cloudValue = safeParseJSON(cloudRaw);
      // Use baseKey for local value lookup (stateRef uses base keys like "ordenes")
      const localValue = getLatestLocalValue(baseKey);

      const papeleraRaw = safeParseJSON(getTenantLocalStorage("papeleraSistema", [], activeTenant));
      // Use baseKey for mergeCollections so ARRAY_KEYS checks and merge logic work correctly
      let mergedValue = mergeCollections(baseKey, localValue, cloudValue, papeleraRaw, activeTenant);

      if (ARRAY_KEYS.includes(baseKey) && !Array.isArray(mergedValue)) {
        if (mergedValue && typeof mergedValue === "object") {
          mergedValue = Object.values(mergedValue);
        } else {
          mergedValue = Array.isArray(cloudValue) ? cloudValue : [];
        }
      }

      const mergedValStr = JSON.stringify(mergedValue);
      
      // 🛡️ Skip state update if data hasn't actually changed — prevents UI flickering
      const currentStateStr = stateRef.current ? JSON.stringify(stateRef.current[baseKey]) : "";
      if (currentStateStr === mergedValStr) {
        globalLastSynced[targetKey] = mergedValStr;
        return; // No change detected, avoid unnecessary re-render
      }

      // Use baseKey for setter lookup (globalActiveSetters uses base keys like "ordenes")
      const activeSetter = globalActiveSetters[baseKey];

      globalLastSynced[targetKey] = mergedValStr;
      if (activeSetter) {
        activeSetter(mergedValue);
        setTenantLocalStorage(baseKey, mergedValue, activeTenant);
      }
    } catch (err) {
      console.warn(`[Sync] Error en fetch rápido de "${targetKey}":`, err.message);
    }
  };

  // 🚀 Debounced broadcast fetch — coalesces rapid-fire broadcasts for the same key
  const debouncedFetchFromBroadcast = (targetKey, knownVersion = null) => {
    if (pendingBroadcastFetches[targetKey]) {
      clearTimeout(pendingBroadcastFetches[targetKey]);
    }
    pendingBroadcastFetches[targetKey] = setTimeout(() => {
      delete pendingBroadcastFetches[targetKey];
      fetchSingleKeyFromCloud(targetKey, knownVersion);
    }, 80); // 80ms debounce — fast enough for instant feel, prevents duplicate fetches
  };

  // Sync a key-value pair to cloud if it has actually changed
  const syncToCloud = async (baseKey, value) => {
    if (!isInitialPullDone || isTenantSwitchingRef.current) return; // Guard: prevent syncing local states before initial setup completes or during tenant switch
    
    const client = getSupabaseClient();
    if (!client) return;

    const activeTenant = (tenantId || "lospits").toLowerCase().trim();
    // 🔒 ALWAYS use tenant-prefixed key in Supabase — strict isolation for ALL tenants
    const cloudKey = `${activeTenant}_${baseKey}`;

    const cleanVal = filterOutMockItems(baseKey, safeParseJSON(value));
    const valueStr = JSON.stringify(cleanVal);
    if (globalLastSynced[cloudKey] === valueStr) {
      return; // Already in sync, avoid loops
    }

    // 🚀 Si ya hay una subida en curso para esta llave, guardar solo el valor más reciente
    // y subirlo al terminar (evita subir varias veces listas grandes como las órdenes)
    if (syncInFlight[cloudKey]) {
      syncPending[cloudKey] = { baseKey, value: cleanVal };
      return;
    }
    syncInFlight[cloudKey] = true;

    try {
      const ok = await syncKeyToCloud(cloudKey, cleanVal);
      if (ok) {
        globalLastSynced[cloudKey] = valueStr;
        // 🚀 Emit instant WebSocket Broadcast event to all active clients
        try {
          if (globalBroadcastChannel.current) {
            globalBroadcastChannel.current.send({
              type: 'broadcast',
              event: 'app_key_changed',
              payload: { key: cloudKey, senderId: instanceId.current, version: cloudKeyVersions[cloudKey] || null }
            });
          }
        } catch (e) {}
      } else {
        console.warn(`[Sync] Falló la sincronización para la llave "${cloudKey}". Se reintentará en la próxima actualización.`);
      }
    } finally {
      syncInFlight[cloudKey] = false;
      const next = syncPending[cloudKey];
      if (next) {
        delete syncPending[cloudKey];
        syncToCloud(next.baseKey, next.value);
      }
    }
  };

  const failedPullCount = useRef(0);

  const forcePullFromCloud = async (isUserInitiated = false) => {
    // 🛡️ Prevent overlapping full pulls — only one can run at a time
    // Safety: auto-reset if stuck for more than 12 seconds to prevent sync deadlocks
    if (globalSyncFlags.isPullRunning && !isUserInitiated) {
      if (globalSyncFlags._pullStartedAt && (Date.now() - globalSyncFlags._pullStartedAt > 30000)) {
        console.warn('[Sync] isPullRunning was stuck for >30s — force-resetting to allow new pull');
        globalSyncFlags.isPullRunning = false;
      } else {
        return false;
      }
    }
    
    const client = getSupabaseClient();
    if (!client || !getSessionForTenant(tenantId)) {
      // 🔐 Sin sesión no se descarga nada: la app muestra el inicio de sesión con los datos locales intactos
      globalSyncFlags.isInitialPullDone = true;
      const activeSetInitialPullDone = globalActiveSetters.setIsInitialPullDone || setIsInitialPullDone;
      const activeSetRealtimeStatus = globalActiveSetters.setRealtimeStatus || setRealtimeStatus;
      if (activeSetInitialPullDone) activeSetInitialPullDone(true);
      if (activeSetRealtimeStatus) activeSetRealtimeStatus("disconnected");
      return false;
    }

    globalSyncFlags.isPullRunning = true;
    globalSyncFlags._pullStartedAt = Date.now();

    try {
      const activeSetRealtimeStatus = globalActiveSetters.setRealtimeStatus || setRealtimeStatus;
      if (isUserInitiated && activeSetRealtimeStatus) {
        activeSetRealtimeStatus("connecting");
      }
      
      const activeTenant = (tenantId || "lospits").toLowerCase().trim();
      // 🔒 ALWAYS use tenant-prefixed keys — strict isolation for ALL tenants
      const getScopedKey = (k) => `${activeTenant}_${k}`;

      const cloudDataMap = new Map();
      const allKeysList = Array.from(new Set([...ARRAY_KEYS, "usuarios", "ordenes", "carwash", "parkingEntries", "parkingHistory", "vehiculosVenta", "workshopInventory", "cafeteriaInventory", "cafeteriaSales", "carwashPresets", "carwashInventory", "carwashConsumption", "tiendaSales", "cuentasPorCobrar", "cuentasPorPagar", "fixedCosts", "clientes", "vehiculos", "compras", "toolsInventory", "accesoriosInventory", "papeleraSistema", "cotizacionesRepuestos", "puntosRecompensas", "catalogoPremios", "historialCanjes", "reglasPrograma", "workshopBranding", "activeModules", "cotizacionesExpress", "paquetesServicios"])).filter(k => k !== "systemSnapshots" && k !== "app_data_backup_snapshot");

      // Build query keys: always scoped. For lospits, also include old unscoped keys for migration
      // (solo en la primera descarga completa; después ya no hace falta bajar esas copias antiguas).
      const isFullPull = isUserInitiated === true || !globalSyncFlags.isInitialPullSucceeded;
      const scopedQueryKeys = allKeysList.map(k => getScopedKey(k));
      if (activeTenant === "lospits" && isFullPull) {
        // 🔄 MIGRATION: Also fetch old unscoped keys to migrate data to new scoped format
        allKeysList.forEach(k => {
          if (!scopedQueryKeys.includes(k)) {
            scopedQueryKeys.push(k);
          }
        });
      }
      // 🛡️ Registro de eliminaciones (usuarios / costos fijos) — también se consulta
      TOMB_KINDS.forEach(kind => scopedQueryKeys.push(getScopedKey(`deleted_${kind}`)));

      // 🚀 SINCRONIZACIÓN INCREMENTAL: primero consultar solo la fecha de modificación de cada llave
      // (unos pocos KB) y descargar únicamente las llaves que cambiaron en la nube.
      let keysToFetch = scopedQueryKeys;
      if (!isFullPull) {
        const metaRes = await withTimeout(
          cloudVersions(scopedQueryKeys, 10000).then(rows => ({ data: rows, error: null })),
          10000,
          'Timeout consultando versiones'
        );
        if (metaRes.error) throw new Error(metaRes.error.message || 'Error consultando versiones');
        const changed = [];
        (metaRes.data || []).forEach(row => {
          const ver = Date.parse(row.updated_at) || 0;
          if (ver && cloudKeyVersions[row.key] !== ver) changed.push(row.key);
        });
        keysToFetch = changed;
      }
      const keysToFetchSet = new Set(keysToFetch);

      // Consultar llaves en paralelo en lotes de 10 con timeout generoso (20s)
      // Large keys like ordenes/carwash can be several MB and need more time
      const chunkSize = 10;
      const batchChunks = [];
      const promises = [];
      for (let i = 0; i < keysToFetch.length; i += chunkSize) {
        const chunk = keysToFetch.slice(i, i + chunkSize);
        batchChunks.push(chunk);
        const queryPromise = cloudGet(chunk, 20000).then(rows => ({ data: rows, error: null }));
        promises.push(withTimeout(queryPromise, 20000, `Timeout en lote`));
      }

      // 🛡️ Track which keys were in FAILED batches to prevent stale local data from overwriting cloud
      const failedBatchKeys = new Set();
      const results = await Promise.allSettled(promises);
      results.forEach((res, batchIdx) => {
        if (res.status === "fulfilled" && res.value && res.value.data && !res.value.error) {
          res.value.data.forEach(item => {
            cloudDataMap.set(item.key, item.value);
            const ver = Date.parse(item.updated_at) || 0;
            if (ver) cloudKeyVersions[item.key] = ver;
          });
        } else {
          // Mark all keys in this failed batch — we must NOT push local data for these keys
          console.warn(`[Sync] Lote ${batchIdx + 1} falló. Protegiendo ${batchChunks[batchIdx]?.length || 0} llaves contra sobreescritura.`);
          if (batchChunks[batchIdx]) {
            batchChunks[batchIdx].forEach(k => failedBatchKeys.add(k));
          }
        }
      });

      // 🛡️ Registro de eliminaciones (usuarios / costos fijos) que cambió en otro dispositivo
      TOMB_KINDS.forEach(kind => {
        const tk = getScopedKey(`deleted_${kind}`);
        if (cloudDataMap.has(tk) && absorbCloudTombstones(kind, cloudDataMap.get(tk), activeTenant)) {
          applyTombstonesToState(activeTenant);
        }
      });

      // 🛡️ Batch state updates: collect all changes first, then apply them together
      // This prevents intermediate renders that cause flickering
      const pendingUpdates = [];

      allKeysList.forEach(baseKey => {
        const activeSetter = globalActiveSetters[baseKey];
        const scopedKey = getScopedKey(baseKey);

        // 🚀 En sincronización incremental, saltar las llaves que no cambiaron en la nube
        if (!isFullPull && !keysToFetchSet.has(scopedKey)) {
          return;
        }

        // 🛡️ If this key was in a FAILED batch, skip entirely — don't touch state or cloud
        if (failedBatchKeys.has(scopedKey)) {
          return; // Protect: don't merge with null cloud data, don't push stale local data
        }

        // 🔒 Read from scoped key first; for lospits, also try old unscoped key for migration
        let cloudRaw = cloudDataMap.get(scopedKey);
        if (cloudRaw === undefined && activeTenant === "lospits") {
          // 🔄 MIGRATION: Try reading from old unscoped key (pre-isolation data)
          cloudRaw = cloudDataMap.get(baseKey);
        }

        const cloudValue = cloudRaw !== undefined ? safeParseJSON(cloudRaw) : null;
        const localValue = getLatestLocalValue(baseKey);

        const papeleraScoped = getScopedKey("papeleraSistema");
        const papeleraRaw = cloudDataMap.has(papeleraScoped) ? cloudDataMap.get(papeleraScoped) : null;
        let mergedValue = mergeCollections(baseKey, localValue, cloudValue, papeleraRaw, activeTenant);

        if (ARRAY_KEYS.includes(baseKey) && !Array.isArray(mergedValue)) {
          if (mergedValue && typeof mergedValue === "object") {
            mergedValue = Object.values(mergedValue);
          } else {
            mergedValue = Array.isArray(cloudValue) ? cloudValue : [];
          }
        }

        // 🛡️ FIX: Sanitize corrupted activeModules — reconstruct strings from character-indexed objects
        if (baseKey === "activeModules" && Array.isArray(mergedValue)) {
          const needsRepair = mergedValue.length > 0 && typeof mergedValue[0] !== "string";
          if (needsRepair) {
            console.warn("[Sync] Detected corrupted activeModules data — repairing...");
            const repaired = mergedValue.map(item => {
              if (typeof item === "string") return item;
              if (item && typeof item === "object") {
                // Reconstruct string from {"0":"d","1":"a","2":"s",...} format
                const numKeys = Object.keys(item).filter(k => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
                if (numKeys.length > 0) {
                  return numKeys.map(k => item[k]).join("");
                }
              }
              return null;
            }).filter(Boolean);
            mergedValue = repaired.length > 0 ? repaired : DEFAULT_ACTIVE_MODULES;
          }
        }

        const mergedValStr = JSON.stringify(mergedValue);
        const cloudValStr = JSON.stringify(cloudValue);

        // 🛡️ Skip state update if data is identical — prevents unnecessary re-renders (flickering)
        const currentStateStr = stateRef.current ? JSON.stringify(stateRef.current[baseKey]) : "";
        const dataChanged = currentStateStr !== mergedValStr;

        globalLastSynced[scopedKey] = mergedValStr;
        
        if (dataChanged && activeSetter) {
          pendingUpdates.push({ setter: activeSetter, value: mergedValue, baseKey });
        }
        // Always persist to localStorage even if state hasn't changed
        setTenantLocalStorage(baseKey, mergedValue, activeTenant);

        // 🔄 Two-way synchronization: If local had items not yet in cloud, push merged dataset to cloud
        if (mergedValStr !== cloudValStr && (Array.isArray(mergedValue) ? mergedValue.length >= (Array.isArray(cloudValue) ? cloudValue.length : 0) : true)) {
          syncKeyToCloud(scopedKey, mergedValue);
        }
      });

      // 🚀 Apply all state updates in a single microtask batch to minimize re-renders
      if (pendingUpdates.length > 0) {
        pendingUpdates.forEach(({ setter, value }) => setter(value));
      }

      // 🛡️ En una descarga completa, la fusión local + nube ya subió los cambios de este equipo.
      // Se quitan de la cola offline esas llaves para que una copia vieja no sobrescriba la fusión.
      if (isFullPull) {
        allKeysList.forEach(baseKey => {
          const sk = getScopedKey(baseKey);
          if (!failedBatchKeys.has(sk)) {
            removeFromOfflineQueue(sk);
            if (activeTenant === "lospits") removeFromOfflineQueue(baseKey);
          }
        });
      }

      // Procesar cualquier operación pendiente en la cola offline
      processOfflineQueue();

      failedPullCount.current = 0;
      globalSyncFlags.isInitialPullSucceeded = true;
      globalSyncFlags.isInitialPullDone = true;
      globalSyncFlags.isPullRunning = false;
      if (activeSetRealtimeStatus) activeSetRealtimeStatus("connected");
      const activeSetInitialPullDone = globalActiveSetters.setIsInitialPullDone || setIsInitialPullDone;
      if (activeSetInitialPullDone) activeSetInitialPullDone(true);
      return true;
    } catch (err) {
      console.warn("[Sync] Falló o expiró la respuesta del servidor:", err.message);
      failedPullCount.current += 1;
      globalSyncFlags.isPullRunning = false;
      const activeSetRealtimeStatus = globalActiveSetters.setRealtimeStatus || setRealtimeStatus;
      
      if (activeSetRealtimeStatus) activeSetRealtimeStatus("disconnected");

      const activeSetInitialPullDone = globalActiveSetters.setIsInitialPullDone || setIsInitialPullDone;
      if (activeSetInitialPullDone) activeSetInitialPullDone(true);
      return false;
    }
  };

  // Initial Sync from Cloud on mount + Background & Focus Sync
  useEffect(() => {
    purgeStorageBloat();
    forcePullFromCloud(true);

    const handleSyncEvent = () => {
      if (navigator.onLine && !document.hidden) {
        forcePullFromCloud(false);
      }
    };

    window.addEventListener("online", handleSyncEvent);
    window.addEventListener("focus", handleSyncEvent);
    document.addEventListener("visibilitychange", handleSyncEvent);

    // Reset failedPullCount periodically so sync can recover from transient failures
    const resetInterval = setInterval(() => {
      if (failedPullCount.current > 0) {
        failedPullCount.current = Math.max(0, failedPullCount.current - 1);
      }
    }, 60000);

    // ⏰ Background polling: cada 5s se consultan SOLO las fechas de modificación (consulta liviana)
    // y se descargan únicamente las llaves que cambiaron. Realtime da la notificación instantánea.
    // NOTE: No document.hidden check — sync must work even when tab is in background
    // (PWAs and mobile browsers may not fire visibility events reliably)
    const interval = setInterval(() => {
      if (navigator.onLine && failedPullCount.current < 5) {
        forcePullFromCloud(false);
      }
    }, 5000);

    return () => {
      window.removeEventListener("online", handleSyncEvent);
      window.removeEventListener("focus", handleSyncEvent);
      document.removeEventListener("visibilitychange", handleSyncEvent);
      clearInterval(interval);
      clearInterval(resetInterval);
    };
  }, []);

  // 🔐 Después de iniciar sesión: descarga completa y fusión con los datos locales
  useEffect(() => {
    if (sessionVersion > 0) {
      globalSyncFlags.isPullRunning = false;
      forcePullFromCloud(true);
    }
  }, [sessionVersion]);

  // 🔐 Sesión vencida, revocada o taller suspendido: volver al inicio de sesión (sin borrar datos)
  useEffect(() => {
    const onExpired = (ev) => {
      const code = ev?.detail?.code;
      clearSession();
      try {
        localStorage.removeItem(`${tenantId}_usuarioActual`);
        localStorage.removeItem("usuarioActual");
      } catch (e) {}
      setUsuarioActual(null);
      if (!sessionExpiredNotified.current) {
        sessionExpiredNotified.current = true;
        setTimeout(() => {
          alert(code === "TALLER_SUSPENDIDO"
            ? "El acceso de este taller está suspendido. Comunícate con soporte de Los Pits App."
            : "Tu sesión venció o fue cerrada. Vuelve a iniciar sesión. Tus datos están a salvo.");
        }, 50);
      }
    };
    window.addEventListener("pits-sesion-expirada", onExpired);
    return () => window.removeEventListener("pits-sesion-expirada", onExpired);
  }, [tenantId]);

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
    const syncSession = getSessionForTenant(tenantId);
    if (!client || !isInitialPullDone || !syncSession) return;

    const activeTenant = (tenantId || "lospits").toLowerCase().trim();
    // 🔐 Canal exclusivo del taller (incluye un código secreto entregado al iniciar sesión)
    const channelName = `sync-${activeTenant}-${syncSession.canal || "general"}`;

    const channel = client
      .channel(channelName)
      // 🔐 Ya no se escucha la tabla directamente (está cerrada al acceso público).
      // Los cambios llegan por el aviso 'app_key_changed' de este canal privado y por el sondeo cada 5 s.
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
            // 🚀 Use debounced fetch to prevent rapid-fire duplicate fetches
            debouncedFetchFromBroadcast(targetKey, payload.payload.version || null);
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`[Realtime Sync] Status changed: ${status}`, err || '');
        const activeSetRealtimeStatus = globalActiveSetters.setRealtimeStatus || setRealtimeStatus;
        if (status === 'SUBSCRIBED' || globalSyncFlags.isInitialPullSucceeded) {
          activeSetRealtimeStatus('connected');
        }
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          activeSetRealtimeStatus('disconnected');
          setTimeout(() => {
            try {
              if (channel) {
                channel.subscribe((resubStatus) => {
                  if (resubStatus === 'SUBSCRIBED') {
                    const activeSetStatus2 = globalActiveSetters.setRealtimeStatus || setRealtimeStatus;
                    activeSetStatus2('connected');
                    // Catch up on any changes missed during the disconnect
                    forcePullFromCloud(false);
                  }
                });
              }
            } catch (e) {}
          }, 2000);
        }
      });

    globalBroadcastChannel.current = channel;

    return () => {
      client.removeChannel(channel);
    };
  }, [isInitialPullDone, tenantId, sessionVersion]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("ordenes", ordenes, tenantId);
    syncToCloud("ordenes", ordenes);
  }, [ordenes, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("carwash", carwash, tenantId);
    syncToCloud("carwash", carwash);
  }, [carwash, isInitialPullDone]);

  // 🔄 Auto-reconcile completed workshop carwashes to return to Taller as "Listo para entrega"
  useEffect(() => {
    if (!Array.isArray(ordenes) || !Array.isArray(carwash)) return;

    let ordersChanged = false;
    let carwashChanged = false;

    const newOrdenes = ordenes.map(o => {
      if (o.estado === "En proceso de lavado") {
        const linkedWash = carwash.find(c => String(c.tallerOrderId) === String(o.id));
        if (linkedWash && (linkedWash.estado === "Entregado" || linkedWash.estado === "Listo para entrega")) {
          ordersChanged = true;
          return { ...o, estado: "Listo para entrega", updatedAt: new Date().toISOString() };
        }
      }
      return o;
    });

    const newCarwash = carwash.map(c => {
      if (c.tallerOrderId && c.estado === "Listo para entrega") {
        carwashChanged = true;
        return {
          ...c,
          estado: "Entregado",
          formaPagoDesc: "Lavado de Taller (Listo para entrega)",
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });

    if (ordersChanged) {
      setOrdenes(newOrdenes);
    }
    if (carwashChanged) {
      setCarwash(newCarwash);
    }
  }, [ordenes, carwash]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("parkingEntries", parkingEntries, tenantId);
    syncToCloud("parkingEntries", parkingEntries);
  }, [parkingEntries, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("parkingRate", parkingRate, tenantId);
    syncToCloud("parkingRate", parkingRate);
  }, [parkingRate, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("parkingHistory", parkingHistory, tenantId);
    syncToCloud("parkingHistory", parkingHistory);
  }, [parkingHistory, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("vehiculosVenta", vehiculosVenta, tenantId);
    syncToCloud("vehiculosVenta", vehiculosVenta);
  }, [vehiculosVenta, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("payrollHistory", payrollHistory, tenantId);
    syncToCloud("payrollHistory", payrollHistory);
  }, [payrollHistory, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("nominaMovimientos", nominaMovimientos, tenantId);
    syncToCloud("nominaMovimientos", nominaMovimientos);
  }, [nominaMovimientos, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("paquetesServicios", paquetesServicios, tenantId);
    syncToCloud("paquetesServicios", paquetesServicios);
  }, [paquetesServicios, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("workshopInventory", workshopInventory, tenantId);
    syncToCloud("workshopInventory", workshopInventory);
  }, [workshopInventory, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("cafeteriaInventory", cafeteriaInventory, tenantId);
    syncToCloud("cafeteriaInventory", cafeteriaInventory);
  }, [cafeteriaInventory, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("cafeteriaSales", cafeteriaSales, tenantId);
    syncToCloud("cafeteriaSales", cafeteriaSales);
  }, [cafeteriaSales, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("comisionMecanico", comisionMecanico, tenantId);
    syncToCloud("comisionMecanico", comisionMecanico);
  }, [comisionMecanico, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("dashboardPeriod", dashboardPeriod, tenantId);
    syncToCloud("dashboardPeriod", dashboardPeriod);
  }, [dashboardPeriod, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("customStartDate", customStartDate, tenantId);
    syncToCloud("customStartDate", customStartDate);
  }, [customStartDate, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("customEndDate", customEndDate, tenantId);
    syncToCloud("customEndDate", customEndDate);
  }, [customEndDate, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    const clean = (carwashPresets || []).filter((p, idx, self) => 
      p && p.tipo && idx === self.findIndex(t => t && t.tipo && t.tipo.toLowerCase().trim() === p.tipo.toLowerCase().trim())
    );
    if (clean.length !== (carwashPresets || []).length) {
      setCarwashPresets(clean);
    } else {
      setTenantLocalStorage("carwashPresets", clean, tenantId);
      syncToCloud("carwashPresets", clean);
    }
  }, [carwashPresets, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("carwashInventory", carwashInventory, tenantId);
    syncToCloud("carwashInventory", carwashInventory);
  }, [carwashInventory, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("carwashConsumption", carwashConsumption, tenantId);
    syncToCloud("carwashConsumption", carwashConsumption);
  }, [carwashConsumption, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("fixedCosts", fixedCosts, tenantId);
    syncToCloud("fixedCosts", fixedCosts);
  }, [fixedCosts, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    const cleanUsers = deduplicateUsers(usuarios);
    setTenantLocalStorage("usuarios", cleanUsers, tenantId);
    syncToCloud("usuarios", cleanUsers);
  }, [usuarios, isInitialPullDone]);

  useEffect(() => {
    if (!isInitialPullDone) return;
    setTenantLocalStorage("regalosPasesReferidos", regalosPasesReferidos, tenantId);
    syncToCloud("regalosPasesReferidos", regalosPasesReferidos);
  }, [regalosPasesReferidos, isInitialPullDone]);

  // Auto-recover missing clients and vehicles from orders/carwash/parking history deterministically
  // 🛡️ This runs ONCE after initial cloud pull — NOT on every order/carwash change.
  // Running on every change caused edited vehicle plates to be reverted because old plates
  // in order history would re-create the vehicle with old data.
  const hasRunAutoRecoveryRef = useRef(false);
  useEffect(() => {
    if (!isInitialPullDone) return;
    if (hasRunAutoRecoveryRef.current) return; // Only run once after initial pull
    hasRunAutoRecoveryRef.current = true;

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
  }, [isInitialPullDone]);

  useEffect(() => {
    setTenantLocalStorage("clientes", clientes, tenantId);
    syncToCloud("clientes", clientes);
  }, [clientes]);

  useEffect(() => {
    setTenantLocalStorage("vehiculos", vehiculos, tenantId);
    syncToCloud("vehiculos", vehiculos);
  }, [vehiculos]);

  useEffect(() => {
    setTenantLocalStorage("tiendaSales", tiendaSales, tenantId);
    syncToCloud("tiendaSales", tiendaSales);
  }, [tiendaSales]);

  useEffect(() => {
    setTenantLocalStorage("cuentasPorCobrar", cuentasPorCobrar, tenantId);
    syncToCloud("cuentasPorCobrar", cuentasPorCobrar);
  }, [cuentasPorCobrar]);

  useEffect(() => {
    setTenantLocalStorage("cuentasPorPagar", cuentasPorPagar, tenantId);
    syncToCloud("cuentasPorPagar", cuentasPorPagar);
  }, [cuentasPorPagar]);

  useEffect(() => {
    setTenantLocalStorage("compras", compras, tenantId);
    syncToCloud("compras", compras);
  }, [compras]);

  useEffect(() => {
    setTenantLocalStorage("toolsInventory", toolsInventory, tenantId);
    syncToCloud("toolsInventory", toolsInventory);
  }, [toolsInventory]);

  useEffect(() => {
    setTenantLocalStorage("accesoriosInventory", accesoriosInventory, tenantId);
    syncToCloud("accesoriosInventory", accesoriosInventory);
  }, [accesoriosInventory]);

  useEffect(() => {
    setTenantLocalStorage("cotizacionesRepuestos", cotizacionesRepuestos, tenantId);
    syncToCloud("cotizacionesRepuestos", cotizacionesRepuestos);
  }, [cotizacionesRepuestos]);

  useEffect(() => {
    setTenantLocalStorage("papeleraSistema", papeleraSistema, tenantId);
    syncToCloud("papeleraSistema", papeleraSistema);
  }, [papeleraSistema]);

  useEffect(() => {
    // 🛡️ Do NOT save heavy full database snapshots to mobile localStorage — sync directly to Supabase cloud
    syncToCloud("systemSnapshots", systemSnapshots);
  }, [systemSnapshots]);

  useEffect(() => {
    setTenantLocalStorage("puntosRecompensas", puntosRecompensas, tenantId);
    syncToCloud("puntosRecompensas", puntosRecompensas);
  }, [puntosRecompensas]);

  useEffect(() => {
    setTenantLocalStorage("catalogoPremios", catalogoPremios, tenantId);
    syncToCloud("catalogoPremios", catalogoPremios);
  }, [catalogoPremios]);

  useEffect(() => {
    setTenantLocalStorage("historialCanjes", historialCanjes, tenantId);
    syncToCloud("historialCanjes", historialCanjes);
  }, [historialCanjes]);

  useEffect(() => {
    setTenantLocalStorage("reglasPrograma", reglasPrograma, tenantId);
    syncToCloud("reglasPrograma", reglasPrograma);
  }, [reglasPrograma, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("citas", citas, tenantId);
    syncToCloud("citas", citas);
  }, [citas, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("workshopBranding", workshopBranding, tenantId);
    syncToCloud("workshopBranding", workshopBranding);
  }, [workshopBranding, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("activeModules", activeModules, tenantId);
    syncToCloud("activeModules", activeModules);
  }, [activeModules, tenantId]);

  useEffect(() => {
    setTenantLocalStorage("cotizacionesExpress", cotizacionesExpress, tenantId);
    syncToCloud("cotizacionesExpress", cotizacionesExpress);
  }, [cotizacionesExpress, tenantId]);

  // If the active module is disabled by the workshop, seamlessly route back to Dashboard
  useEffect(() => {
    if (currentTab && currentTab !== "dashboard" && currentTab !== "inicio" && currentTab !== "configuracion" && currentTab !== "saasAdmin" && currentTab !== "pantalla" && currentTab !== "portal") {
      if (!isModuleActive(currentTab, activeModules)) {
        setCurrentTab("dashboard");
      }
    }
  }, [activeModules, currentTab]);

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

  // Auth Operations (Login.jsx ya validó usuario y contraseña en el servidor)
  const handleLogin = (userObj) => {
    sessionExpiredNotified.current = false;
    let cleanUserObj = userObj;
    if (userObj && (userObj.user || "").toLowerCase().trim() === "armando avila") {
      if (Array.isArray(userObj.permissions)) {
        cleanUserObj = { ...userObj, permissions: userObj.permissions.filter(p => p !== "finanzas") };
      }
    }
    setUsuarioActual(cleanUserObj);
    // 🔒 Save session scoped to tenant
    const scopedSessionKey = `${tenantId}_usuarioActual`;
    setLocalStorage(scopedSessionKey, cleanUserObj);

    if (cleanUserObj) {
      if (cleanUserObj.rol === "mecanico") {
        setCurrentTab("taller");
      } else if (cleanUserObj.rol === "lavador") {
        setCurrentTab("carwash");
      } else {
        setCurrentTab(esMovil ? "inicio" : "dashboard");
      }
    }
    // 🔐 Descargar y fusionar los datos del taller con la nueva sesión
    setSessionVersion(v => v + 1);
  };

  const handleLogout = () => {
    // 🔐 Cierra la sesión en el servidor. Los datos guardados en el equipo NO se borran.
    logoutRemoto();
    setUsuarioActual(null);
    // 🔒 Clear tenant-scoped session key
    const scopedSessionKey = `${tenantId}_usuarioActual`;
    localStorage.removeItem(scopedSessionKey);
    localStorage.removeItem("usuarioActual"); // also clear legacy unscoped key
    try {
      sessionStorage.removeItem("currentTab");
    } catch (e) {}
    setCurrentTab("dashboard");
  };

  // 🌐 PUBLIC CLIENT PORTAL VIEW (Direct access for clients via WhatsApp / QR / Portal links)
  const isPublicPortalView = (() => {
    if (typeof window === "undefined") return false;
    try {
      const params = new URLSearchParams(window.location.search);
      return params.has("portal") || params.has("cliente") || params.has("telefono") || params.has("placa") || params.has("qr") || window.location.pathname.includes("/portal");
    } catch (e) {
      return false;
    }
  })();

  if (isPublicPortalView) {
    // 🔐 El portal público NO recibe los datos del taller: consulta al servidor solo el cliente buscado
    return (
      <CustomerPortal 
        modoPublico={true}
        tallerPublico={(() => {
          try {
            const p = new URLSearchParams(window.location.search);
            const t = (p.get("taller") || p.get("tenant") || tenantId || "lospits").toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
            return t || "lospits";
          } catch (e) {
            return "lospits";
          }
        })()}
        onClose={null}
      />
    );
  }

  // Render Login page if not authenticated
  if (!usuarioActual) {
    return (
      <Login 
        onLogin={handleLogin} 
        activeTenantId={tenantId}
      />
    );
  }

  return (
    <div style={styles.appContainer} className={`app-container${esMovil ? " con-barra-movil" : ""}`}>
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
        activeTenantId={tenantId}
        onTenantChange={isSuperAdminSession() ? handleSwitchTenant : null}
        activeModules={activeModules}
        badges={{ taller: missingExternalCostCount, recompensas: userHasPermission(usuarioActivo, "recompensas") ? puntosPorVencerCount : 0 }}
      />

      {/* Floating Menu Button for mobile */}
      {!esMovil && (
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="mobile-fab-menu"
        title="Menú"
      >
        ☰
        {(missingExternalCostCount + (userHasPermission(usuarioActivo, "recompensas") ? puntosPorVencerCount : 0)) > 0 && (
          <span className="notif-pin notif-pin-floating">{missingExternalCostCount + (userHasPermission(usuarioActivo, "recompensas") ? puntosPorVencerCount : 0)}</span>
        )}
      </button>
      )}

      {/* 📱 Barra inferior y menú "Más" (solo celular) */}
      {esMovil && (() => {
        const puede = (id) => userHasPermission(usuarioActivo, id);
        const permitidos = modulosPermitidos(puede, activeModules);
        const badgesMovil = { taller: missingExternalCostCount, recompensas: puede("recompensas") ? puntosPorVencerCount : 0 };
        const navegar = (id) => {
          setMenuMasAbierto(false);
          setIsSidebarOpen(false);
          setCurrentTab(id);
        };
        return (
          <>
            <BarraInferiorMovil
              currentTab={currentTab}
              onNavegar={navegar}
              onAbrirMas={() => setMenuMasAbierto(v => !v)}
              menuAbierto={menuMasAbierto}
              permitidos={permitidos}
              badges={badgesMovil}
            />
            {menuMasAbierto && (
              <MenuMasMovil
                permitidos={permitidos}
                currentTab={currentTab}
                onNavegar={navegar}
                onCerrar={() => setMenuMasAbierto(false)}
                usuario={usuarioActivo}
                onLogout={() => { setMenuMasAbierto(false); handleLogout(); }}
                realtimeStatus={realtimeStatus}
                onSincronizar={() => { setMenuMasAbierto(false); forcePullFromCloud(true); }}
                badges={badgesMovil}
                nombreTaller={workshopBranding?.nombreEmpresa}
              />
            )}
          </>
        );
      })()}

      {/* 2. DYNAMIC CONTENT AREA */}
      <main style={styles.mainContent} className="app-main">
        {currentTab === "inicio" && (
          <InicioMovil
            ordenes={ordenes}
            carwash={carwash}
            citas={citas}
            clientes={clientes}
            vehiculos={vehiculos}
            usuario={usuarioActivo}
            puede={(id) => userHasPermission(usuarioActivo, id) && (id === "dashboard" || isModuleActive(id, activeModules))}
            onNavegar={(id) => { setMenuMasAbierto(false); setCurrentTab(id); }}
            verMontos={(() => {
              const r = String(usuarioActivo?.rol || "").toLowerCase();
              return String(usuarioActivo?.user || "").toLowerCase().trim() === "admin" || /admin|cajer|gerente|jefe/.test(r);
            })()}
            nombreTaller={workshopBranding?.nombreEmpresa}
          />
        )}
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
            isInitialPullDone={isInitialPullDone}
            realtimeStatus={realtimeStatus}
          />
        )}

        {currentTab === "citas" && userHasPermission(usuarioActivo, "citas") && (
          <Citas 
            citas={citas}
            setCitas={setCitasUI}
            clientes={clientes}
            setClientes={setClientes}
            vehiculos={vehiculos}
            setVehiculos={setVehiculos}
            mecanicos={mecanicos}
            lavadores={lavadores}
            ordenes={ordenes}
            setOrdenes={setOrdenesUI}
            carwash={carwash}
            setCarwash={setCarwashUI}
            usuarioActual={usuarioActivo}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            workshopBranding={workshopBranding}
          />
        )}

        {currentTab === "taller" && userHasPermission(usuarioActivo, "taller") && (
          <Taller 
            ordenes={ordenes} 
            setOrdenes={setOrdenesUI} 
            usuarioActual={usuarioActivo} 
            mecanicos={mecanicos} 
            carwash={carwash}
            setCarwash={setCarwashUI}
            lavadores={lavadores}
            workshopInventory={workshopInventory}
            setWorkshopInventory={setWorkshopInventory}
            accesoriosInventory={accesoriosInventory}
            setAccesoriosInventory={setAccesoriosInventory}
            comisionMecanico={comisionMecanico}
            usuarios={usuarios}
            cuentasPorCobrar={cuentasPorCobrar}
            setCuentasPorCobrar={setCuentasPorCobrarUI}
            cuentasPorPagar={cuentasPorPagar}
            setCuentasPorPagar={setCuentasPorPagarUI}
            clientes={clientes}
            setClientes={setClientes}
            vehiculos={vehiculos}
            setVehiculos={setVehiculos}
            carwashPresets={carwashPresets}
            cotizacionesRepuestos={cotizacionesRepuestos}
            setCotizacionesRepuestos={setCotizacionesRepuestos}
            softDelete={softDelete}
            compras={compras}
            setCompras={setComprasUI}
            tenantId={tenantId}
            addPuntosLealtad={addPuntosLealtad}
            workshopBranding={workshopBranding}
            cotizacionesExpress={cotizacionesExpress}
            setCotizacionesExpress={setCotizacionesExpress}
            paquetesServicios={paquetesServicios}
            setPaquetesServicios={setPaquetesServicios}
          />
        )}

        {currentTab === "carwash" && userHasPermission(usuarioActivo, "carwash") && (
          <Carwash 
            carwash={carwash} 
            setCarwash={setCarwashUI} 
            usuarioActual={usuarioActivo} 
            lavadores={lavadores} 
            ordenes={ordenes}
            setOrdenes={setOrdenesUI}
            carwashPresets={carwashPresets}
            carwashInventory={carwashInventory}
            setCarwashInventory={setCarwashInventory}
            accesoriosInventory={accesoriosInventory}
            setAccesoriosInventory={setAccesoriosInventory}
            carwashConsumption={carwashConsumption}
            setCarwashConsumption={setCarwashConsumption}
            usuarios={usuarios}
            cuentasPorCobrar={cuentasPorCobrar}
            setCuentasPorCobrar={setCuentasPorCobrarUI}
            cuentasPorPagar={cuentasPorPagar}
            setCuentasPorPagar={setCuentasPorPagarUI}
            clientes={clientes}
            setClientes={setClientes}
            vehiculos={vehiculos}
            setVehiculos={setVehiculos}
            tenantId={tenantId}
            addPuntosLealtad={addPuntosLealtad}
            workshopBranding={workshopBranding}
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
            setCuentasPorCobrar={setCuentasPorCobrarUI}
            clientes={clientes}
            setClientes={setClientes}
            vehiculos={vehiculos}
            setVehiculos={setVehiculos}
            ordenes={ordenes}
            carwash={carwash}
            addPuntosLealtad={addPuntosLealtad}
            workshopBranding={workshopBranding}
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
            setCuentasPorPagar={setCuentasPorPagarUI}
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
            setCuentasPorCobrar={setCuentasPorCobrarUI}
            clientes={clientes}
            setClientes={setClientes}
            addPuntosLealtad={addPuntosLealtad}
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
            setCuentasPorCobrar={setCuentasPorCobrarUI}
            cuentasPorPagar={cuentasPorPagar}
            setCuentasPorPagar={setCuentasPorPagarUI}
            usuarioActual={usuarioActivo}
            clientes={clientes}
            setClientes={setClientes}
            addPuntosLealtad={addPuntosLealtad}
          />
        )}

        {currentTab === "accesorios" && userHasPermission(usuarioActivo, "accesorios") && (
          <Accesorios 
            accesoriosInventory={accesoriosInventory}
            setAccesoriosInventory={setAccesoriosInventory}
            usuarioActual={usuarioActivo}
            cuentasPorPagar={cuentasPorPagar}
            setCuentasPorPagar={setCuentasPorPagarUI}
          />
        )}

        {currentTab === "cuentas" && userHasPermission(usuarioActivo, "cuentas") && (
          <Cuentas 
            cuentasPorCobrar={cuentasPorCobrar}
            setCuentasPorCobrar={setCuentasPorCobrarUI}
            cuentasPorPagar={cuentasPorPagar}
            setCuentasPorPagar={setCuentasPorPagarUI}
            usuarioActual={usuarioActivo}
            clientes={clientes}
            setClientes={setClientes}
            softDelete={softDelete}
            ordenes={ordenes}
            setOrdenes={setOrdenesUI}
            setCompras={setComprasUI}
          />
        )}

        {currentTab === "repuestosFaltantes" && userHasPermission(usuarioActivo, "repuestosFaltantes") && (
          <RepuestosFaltantes 
            ordenes={ordenes}
            setOrdenes={setOrdenesUI}
            workshopInventory={workshopInventory}
            setWorkshopInventory={setWorkshopInventory}
            cuentasPorPagar={cuentasPorPagar}
            setCuentasPorPagar={setCuentasPorPagarUI}
            usuarios={usuarios}
            comisionMecanico={comisionMecanico}
          />
        )}

        {currentTab === "historial" && userHasPermission(usuarioActivo, "historial") && (
          <VehicleHistory 
            ordenes={ordenes}
            setOrdenes={setOrdenesUI}
            carwash={carwash}
            setCarwash={setCarwashUI}
            workshopInventory={workshopInventory}
            mecanicos={mecanicos}
            usuarioActual={usuarioActivo}
            compras={compras}
            setCompras={setComprasUI}
            cuentasPorCobrar={cuentasPorCobrar}
            setCuentasPorCobrar={setCuentasPorCobrarUI}
            cuentasPorPagar={cuentasPorPagar}
            setCuentasPorPagar={setCuentasPorPagarUI}
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
            regalosPasesReferidos={regalosPasesReferidos}
            setRegalosPasesReferidos={setRegalosPasesReferidos}
            onUpdatePuntos={setPuntosRecompensas}
            onCanjearPremio={handleCanjearPremio}
            onUpdateCatalogo={setCatalogoPremios}
            onUpdateReglas={setReglasPrograma}
            usuarioActual={usuarioActivo}
          />
        )}

        {currentTab === "portal" && (
          <CustomerPortal 
            puntosRecompensas={puntosRecompensas}
            setPuntosRecompensas={setPuntosRecompensas}
            ordenes={ordenes}
            carwash={carwash}
            clientes={clientes}
            vehiculos={vehiculos}
            catalogoPremios={catalogoPremios}
            regalosPasesReferidos={regalosPasesReferidos}
            setRegalosPasesReferidos={setRegalosPasesReferidos}
            onClose={() => setCurrentTab("dashboard")}
          />
        )}

        {currentTab === "finanzas" && userHasPermission(usuarioActivo, "finanzas") && (
          <Finance 
            usuarioActual={usuarioActivo}
            ordenes={ordenes} 
            setOrdenes={setOrdenesUI}
            carwash={carwash} 
            setCarwash={setCarwashUI}
            mecanicos={mecanicos} 
            lavadores={lavadores} 
            parkingHistory={parkingHistory}
            cafeteriaSales={cafeteriaSales}
            tiendaSales={tiendaSales}
            usuarios={usuarios}
            fixedCosts={fixedCosts}
            vehiculosVenta={vehiculosVenta}
            setVehiculosVenta={setVehiculosVentaUI}
            cuentasPorCobrar={cuentasPorCobrar}
            cuentasPorPagar={cuentasPorPagar}
            carwashConsumption={carwashConsumption}
            compras={compras}
            setCompras={setComprasUI}
            payrollHistory={payrollHistory}
            setPayrollHistory={setPayrollHistoryUI}
            nominaMovimientos={nominaMovimientos}
            setNominaMovimientos={setNominaMovimientosUI}
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
            workshopBranding={workshopBranding}
            setWorkshopBranding={setWorkshopBranding}
            activeModules={activeModules}
            setActiveModules={setActiveModules}
            restoreMasterBackup={restoreMasterBackup}
            tenantId={tenantId}
          />
        )}

        {currentTab === "compras" && userHasPermission(usuarioActivo, "compras") && (
          <Compras 
            compras={compras}
            setCompras={setComprasUI}
            toolsInventory={toolsInventory}
            setToolsInventory={setToolsInventory}
            workshopInventory={workshopInventory}
            setWorkshopInventory={setWorkshopInventory}
            carwashInventory={carwashInventory}
            setCarwashInventory={setCarwashInventory}
            cafeteriaInventory={cafeteriaInventory}
            setCafeteriaInventory={setCafeteriaInventory}
            cuentasPorPagar={cuentasPorPagar}
            setCuentasPorPagar={setCuentasPorPagarUI}
            usuarioActual={usuarioActivo}
          />
        )}

        {currentTab === "vehiculosVenta" && userHasPermission(usuarioActivo, "vehiculosVenta") && (
          <VehiculosVenta 
            vehiculosVenta={vehiculosVenta}
            setVehiculosVenta={setVehiculosVentaUI}
            usuarioActual={usuarioActivo}
            cuentasPorCobrar={cuentasPorCobrar}
            setCuentasPorCobrar={setCuentasPorCobrarUI}
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
            setOrdenes={setOrdenesUI}
            setCarwash={setCarwashUI}
            setCuentasPorCobrar={setCuentasPorCobrarUI}
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

        {currentTab === "saasAdmin" && isSuperAdminSession() && (
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