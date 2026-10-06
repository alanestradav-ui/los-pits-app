// LocalStorage utility helpers

export const getLocalStorage = (key, defaultValue) => {
  const stored = localStorage.getItem(key);
  try {
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error(`Error loading localStorage key "${key}":`, error);
    return defaultValue;
  }
};

// Purges heavy, non-critical keys to protect localStorage quota on mobile
export const purgeStorageBloat = () => {
  try {
    const keysToEvict = [
      "app_data_backup_snapshot",
      "lospits_app_data_backup_snapshot",
      "systemSnapshots",
      "lospits_systemSnapshots"
    ];
    keysToEvict.forEach(k => {
      try { localStorage.removeItem(k); } catch (e) {}
    });

    // Also remove duplicate unscoped keys for lospits if scoped versions exist
    const baseKeys = ["ordenes", "carwash", "usuarios", "parkingEntries", "workshopInventory", "cafeteriaInventory", "clientes", "vehiculos"];
    baseKeys.forEach(bk => {
      if (localStorage.getItem(`lospits_${bk}`) !== null) {
        try { localStorage.removeItem(bk); } catch (e) {}
      }
    });

    // 🧼 Purge stale/corrupted carwash cache on mobile devices to resync cleanly with Supabase
    const CW_CLEANUP_FLAG = "lospits_cw_sync_clean_v5";
    if (localStorage.getItem(CW_CLEANUP_FLAG) !== "true") {
      try {
        localStorage.removeItem("carwash");
        localStorage.removeItem("lospits_carwash");
        localStorage.setItem(CW_CLEANUP_FLAG, "true");
        console.log("[Storage] Cache local de Carwash purgado para sincronización limpia.");
      } catch (e) {}
    }

    // Safety eviction for oversized or corrupted carwash local storage
    ["carwash", "lospits_carwash"].forEach(cwKey => {
      const raw = localStorage.getItem(cwKey);
      if (raw) {
        if (raw.length > 150000 || raw.includes("null,null") || raw.includes(",null,")) {
          try { localStorage.removeItem(cwKey); } catch (e) {}
        }
      }
    });

    // Sanitize activeModules in localStorage if corrupted/duplicated
    ["activeModules", "lospits_activeModules"].forEach(modKey => {
      const raw = localStorage.getItem(modKey);
      if (raw && raw.length > 2000) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const deduped = Array.from(new Set(parsed)).filter(x => typeof x === "string" && x.trim() !== "");
            localStorage.setItem(modKey, JSON.stringify(deduped));
          }
        } catch (e) {}
      }
    });
  } catch (err) {
    console.warn("[Storage] Error during storage cleanup:", err);
  }
};

export const setLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[Storage] Quota or error setting "${key}", attempting automatic cleanup...`);
    purgeStorageBloat();
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (retryError) {
      console.error(`[Storage] Failed to set "${key}" even after cleanup:`, retryError);
    }
  }
};

export const getActiveTenantId = () => {
  try {
    const stored = localStorage.getItem("current_tenant_id");
    return stored ? stored.toLowerCase().trim().replace(/"/g, "") : "lospits";
  } catch (e) {
    return "lospits";
  }
};

import masterBackupData from '../data/masterBackupData.json';

export const restoreMasterBackup = (tenantId = "lospits") => {
  if (!masterBackupData) return false;
  const activeTenant = (tenantId || "lospits").toLowerCase().trim();
  Object.keys(masterBackupData).forEach(key => {
    if (key === "systemSnapshots" || key === "app_data_backup_snapshot") return;
    const scopedKey = `${activeTenant}_${key}`;
    try {
      localStorage.setItem(scopedKey, JSON.stringify(masterBackupData[key]));
    } catch (e) {}
  });
  return true;
};

export const getTenantLocalStorage = (key, defaultValue, tenantId = null) => {
  const activeTenant = (tenantId || getActiveTenantId()).toLowerCase().trim();
  const scopedKey = `${activeTenant}_${key}`;
  const storedScoped = localStorage.getItem(scopedKey);

  // 🔒 STRICT TENANT ISOLATION: Read from the scoped key.
  // If data exists in localStorage, ALWAYS trust it — never overwrite with static backup.
  if (storedScoped !== null) {
    try {
      return JSON.parse(storedScoped);
    } catch (e) {
      return defaultValue;
    }
  }

  // 🔄 ONE-TIME MIGRATION for "lospits" tenant:
  // If the scoped key doesn't exist yet but old unscoped data does, migrate it.
  if (activeTenant === "lospits") {
    const storedBase = localStorage.getItem(key);
    if (storedBase !== null) {
      try {
        const parsed = JSON.parse(storedBase);
        localStorage.setItem(scopedKey, storedBase);
        return parsed;
      } catch (e) {}
    }

    // 🛡️ FIRST-VISIT SEED: Only restore from master backup when NO data exists at all
    // (neither scoped nor unscoped key found in localStorage).
    // NEVER seed heavy systemSnapshots, backup snapshots, or live admin configs like fixedCosts and usuarios!
    if (key !== "systemSnapshots" && key !== "app_data_backup_snapshot" && key !== "fixedCosts" && key !== "usuarios" && masterBackupData && masterBackupData[key] !== undefined) {
      const backupVal = masterBackupData[key];
      try {
        localStorage.setItem(scopedKey, JSON.stringify(backupVal));
      } catch (e) {}
      return backupVal;
    }
  }

  return defaultValue;
};

export const setTenantLocalStorage = (key, value, tenantId = null) => {
  const activeTenant = (tenantId || getActiveTenantId()).toLowerCase().trim();
  const scopedKey = `${activeTenant}_${key}`;
  // 🔒 ALWAYS write to the scoped key only — strict tenant isolation
  setLocalStorage(scopedKey, value);
};

// ==========================================
// 🛡️ TOMBSTONES REGISTRY: PREVENT DELETED USERS AND FIXED COSTS FROM RESURRECTING
// ==========================================

import { syncKeyToCloud } from './supabase';

export const getDeletedUsernames = (tenantId = null) => {
  const activeTenant = (tenantId || getActiveTenantId()).toLowerCase().trim();
  const scopedKey = `${activeTenant}_deleted_usuarios`;
  const raw = localStorage.getItem(scopedKey);
  let list = [];
  try {
    list = raw ? JSON.parse(raw) : [];
  } catch (e) {
    list = [];
  }
  if (!Array.isArray(list)) list = [];

  // Also check papeleraSistema for any soft-deleted usuarios
  try {
    const trashRaw = localStorage.getItem(`${activeTenant}_papeleraSistema`);
    const trash = trashRaw ? JSON.parse(trashRaw) : [];
    if (Array.isArray(trash)) {
      trash.forEach(entry => {
        if (!entry) return;
        const mod = (entry.moduloOrigen || entry.moduleKey || "").toLowerCase();
        if (mod === "usuarios" && entry.itemOriginal?.user) {
          list.push(String(entry.itemOriginal.user).toLowerCase().trim());
        }
      });
    }
  } catch (e) {}

  return new Set(list.map(u => String(u || "").toLowerCase().trim()).filter(Boolean));
};

export const addDeletedUsername = (username, tenantId = null) => {
  if (!username) return;
  const activeTenant = (tenantId || getActiveTenantId()).toLowerCase().trim();
  const clean = String(username).toLowerCase().trim();
  const scopedKey = `${activeTenant}_deleted_usuarios`;
  const raw = localStorage.getItem(scopedKey);
  let list = [];
  try {
    list = raw ? JSON.parse(raw) : [];
  } catch (e) {}
  if (!Array.isArray(list)) list = [];
  if (!list.includes(clean)) {
    const updated = [...list, clean];
    localStorage.setItem(scopedKey, JSON.stringify(updated));
    syncKeyToCloud(scopedKey, updated).catch(() => {});
  }
};

export const removeDeletedUsername = (username, tenantId = null) => {
  if (!username) return;
  const activeTenant = (tenantId || getActiveTenantId()).toLowerCase().trim();
  const clean = String(username).toLowerCase().trim();
  const scopedKey = `${activeTenant}_deleted_usuarios`;
  const raw = localStorage.getItem(scopedKey);
  let list = [];
  try {
    list = raw ? JSON.parse(raw) : [];
  } catch (e) {}
  if (!Array.isArray(list)) list = [];
  const updated = list.filter(u => String(u).toLowerCase().trim() !== clean);
  localStorage.setItem(scopedKey, JSON.stringify(updated));
  syncKeyToCloud(scopedKey, updated).catch(() => {});
};

export const getDeletedFixedCosts = (tenantId = null) => {
  const activeTenant = (tenantId || getActiveTenantId()).toLowerCase().trim();
  const scopedKey = `${activeTenant}_deleted_fixedCosts`;
  const raw = localStorage.getItem(scopedKey);
  let list = [];
  try {
    list = raw ? JSON.parse(raw) : [];
  } catch (e) {
    list = [];
  }
  if (!Array.isArray(list)) list = [];

  // Also check papeleraSistema for any soft-deleted fixedCosts
  try {
    const trashRaw = localStorage.getItem(`${activeTenant}_papeleraSistema`);
    const trash = trashRaw ? JSON.parse(trashRaw) : [];
    if (Array.isArray(trash)) {
      trash.forEach(entry => {
        if (!entry) return;
        const mod = (entry.moduloOrigen || entry.moduleKey || "").toLowerCase();
        if (mod === "fixedcosts") {
          if (entry.targetOriginalId) list.push(String(entry.targetOriginalId).trim());
          if (entry.itemOriginal?.name) list.push(String(entry.itemOriginal.name).toLowerCase().trim());
          if (entry.itemOriginal?.id !== undefined) list.push(String(entry.itemOriginal.id).trim());
        }
      });
    }
  } catch (e) {}

  return new Set(list.map(c => String(c || "").toLowerCase().trim()).filter(Boolean));
};

export const addDeletedFixedCost = (costItem, tenantId = null) => {
  if (!costItem) return;
  const activeTenant = (tenantId || getActiveTenantId()).toLowerCase().trim();
  const scopedKey = `${activeTenant}_deleted_fixedCosts`;
  const raw = localStorage.getItem(scopedKey);
  let list = [];
  try {
    list = raw ? JSON.parse(raw) : [];
  } catch (e) {}
  if (!Array.isArray(list)) list = [];
  const toAdd = [];
  if (costItem.id !== undefined && costItem.id !== null) {
    toAdd.push(String(costItem.id).toLowerCase().trim());
  }
  if (costItem.name) {
    toAdd.push(String(costItem.name).toLowerCase().trim());
  }
  const updated = Array.from(new Set([...list, ...toAdd])).filter(Boolean);
  localStorage.setItem(scopedKey, JSON.stringify(updated));
  syncKeyToCloud(scopedKey, updated).catch(() => {});
};

export const removeDeletedFixedCost = (costIdentifier, tenantId = null) => {
  if (!costIdentifier) return;
  const activeTenant = (tenantId || getActiveTenantId()).toLowerCase().trim();
  const clean = String(costIdentifier).toLowerCase().trim();
  const scopedKey = `${activeTenant}_deleted_fixedCosts`;
  const raw = localStorage.getItem(scopedKey);
  let list = [];
  try {
    list = raw ? JSON.parse(raw) : [];
  } catch (e) {}
  if (!Array.isArray(list)) list = [];
  const updated = list.filter(c => String(c).toLowerCase().trim() !== clean);
  localStorage.setItem(scopedKey, JSON.stringify(updated));
  syncKeyToCloud(scopedKey, updated).catch(() => {});
};

export const formatMoney = (amount) => {
  const val = parseFloat(amount);
  if (isNaN(val)) return 'Q 0.00';
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2
  }).format(val);
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
