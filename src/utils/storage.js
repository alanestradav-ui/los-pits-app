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

export const setLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
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
    if (masterBackupData && masterBackupData[key] !== undefined) {
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
