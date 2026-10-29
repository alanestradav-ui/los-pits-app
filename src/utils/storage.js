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

// 🔒 SEGURIDAD: el respaldo maestro con datos reales ya NO se incluye en la app publicada.
// Los datos se obtienen únicamente desde la nube con una sesión válida.
export const restoreMasterBackup = () => false;

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
// Formato: { "<llave>": { d: deletedAtMs, r: restoredAtMs } }
// Una llave está eliminada si d > r. Se fusiona entre dispositivos tomando el máximo
// de cada marca de tiempo, así una eliminación en el PC se respeta en el celular y
// volver a crear el mismo usuario/costo después (r más reciente) lo reactiva.
// ==========================================

import { syncKeyToCloud } from './supabase';

const tombScopedKey = (kind, tenantId) => `${(tenantId || getActiveTenantId()).toLowerCase().trim()}_deleted_${kind}`;

export const normalizeTombMap = (raw) => {
  let val = raw;
  for (let i = 0; i < 3 && typeof val === "string"; i++) {
    try { val = JSON.parse(val); } catch (e) { break; }
  }
  const out = {};
  if (Array.isArray(val)) {
    // Formato legado (lista de nombres) → eliminación antigua (d=1)
    val.forEach(k => {
      const key = String(k || "").toLowerCase().trim();
      if (key) out[key] = { d: 1, r: 0 };
    });
  } else if (val && typeof val === "object") {
    Object.keys(val).forEach(k => {
      const key = String(k || "").toLowerCase().trim();
      const e = val[k] || {};
      if (key) out[key] = { d: Number(e.d) || 0, r: Number(e.r) || 0 };
    });
  }
  return out;
};

export const mergeTombMaps = (a, b) => {
  const A = normalizeTombMap(a);
  const B = normalizeTombMap(b);
  const out = { ...A };
  Object.keys(B).forEach(k => {
    const x = out[k] || { d: 0, r: 0 };
    const y = B[k];
    out[k] = { d: Math.max(x.d, y.d), r: Math.max(x.r, y.r) };
  });
  return out;
};

export const getTombMap = (kind, tenantId = null) => {
  try {
    return normalizeTombMap(localStorage.getItem(tombScopedKey(kind, tenantId)));
  } catch (e) {
    return {};
  }
};

export const saveTombMap = (kind, map, tenantId = null, pushToCloud = true) => {
  const scopedKey = tombScopedKey(kind, tenantId);
  const clean = normalizeTombMap(map);
  try { localStorage.setItem(scopedKey, JSON.stringify(clean)); } catch (e) {}
  if (pushToCloud) syncKeyToCloud(scopedKey, clean).catch(() => {});
  return clean;
};

const isDead = (e) => !!e && (e.d || 0) > (e.r || 0);

// Incluir eliminaciones registradas en la papelera (por si se borraron desde otra versión)
const withTrashEntries = (kind, map, tenantId) => {
  const out = { ...map };
  try {
    const activeTenant = (tenantId || getActiveTenantId()).toLowerCase().trim();
    const trashRaw = localStorage.getItem(`${activeTenant}_papeleraSistema`);
    const trash = trashRaw ? JSON.parse(trashRaw) : [];
    if (!Array.isArray(trash)) return out;
    trash.forEach(entry => {
      if (!entry) return;
      if ((entry.tenantId || activeTenant).toLowerCase().trim() !== activeTenant) return;
      const mod = String(entry.moduloOrigen || entry.moduleKey || "").toLowerCase();
      if (mod !== kind.toLowerCase()) return;
      const when = Date.parse(entry.fechaEliminacion || entry.deletedAt || "") || 1;
      const item = entry.itemOriginal || entry.originalData || {};
      const keys = kind === "usuarios"
        ? [item.user]
        : [item.name, item.id, entry.targetOriginalId];
      keys.forEach(k => {
        if (k === undefined || k === null) return;
        const key = String(k).toLowerCase().trim();
        if (!key) return;
        const cur = out[key] || { d: 0, r: 0 };
        out[key] = { d: Math.max(cur.d, when), r: cur.r };
      });
    });
  } catch (e) {}
  return out;
};

const deadSet = (kind, tenantId) => {
  const map = withTrashEntries(kind, getTombMap(kind, tenantId), tenantId);
  return new Set(Object.keys(map).filter(k => isDead(map[k])));
};

export const getDeletedUsernames = (tenantId = null) => deadSet("usuarios", tenantId);
export const getDeletedFixedCosts = (tenantId = null) => deadSet("fixedCosts", tenantId);

const markKeys = (kind, keys, field, tenantId) => {
  const map = getTombMap(kind, tenantId);
  const now = Date.now();
  keys.forEach(k => {
    if (k === undefined || k === null) return;
    const key = String(k).toLowerCase().trim();
    if (!key) return;
    const cur = map[key] || { d: 0, r: 0 };
    map[key] = { ...cur, [field]: now };
  });
  return saveTombMap(kind, map, tenantId, true);
};

export const addDeletedUsername = (username, tenantId = null) => {
  if (!username) return;
  markKeys("usuarios", [username], "d", tenantId);
};

export const removeDeletedUsername = (username, tenantId = null) => {
  if (!username) return;
  const map = getTombMap("usuarios", tenantId);
  if (!map[String(username).toLowerCase().trim()]) return; // nada que reactivar
  markKeys("usuarios", [username], "r", tenantId);
};

export const addDeletedFixedCost = (costItem, tenantId = null) => {
  if (!costItem) return;
  markKeys("fixedCosts", [costItem.id, costItem.name], "d", tenantId);
};

export const removeDeletedFixedCost = (costIdentifier, tenantId = null) => {
  if (costIdentifier === undefined || costIdentifier === null || costIdentifier === "") return;
  const map = getTombMap("fixedCosts", tenantId);
  if (!map[String(costIdentifier).toLowerCase().trim()]) return;
  markKeys("fixedCosts", [costIdentifier], "r", tenantId);
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
