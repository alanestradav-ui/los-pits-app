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
  if (storedScoped !== null) {
    try {
      const parsed = JSON.parse(storedScoped);
      // Auto-recovery for lospits if key is missing items that exist in master backup
      if (activeTenant === "lospits" && masterBackupData && Array.isArray(masterBackupData[key]) && masterBackupData[key].length > 0) {
        if (!Array.isArray(parsed) || parsed.length < masterBackupData[key].length) {
          localStorage.setItem(scopedKey, JSON.stringify(masterBackupData[key]));
          return masterBackupData[key];
        }
      }
      return parsed;
    } catch (e) {
      return defaultValue;
    }
  }

  // 🔄 ONE-TIME MIGRATION / RECOVERY for "lospits" tenant:
  if (activeTenant === "lospits") {
    const storedBase = localStorage.getItem(key);
    if (storedBase !== null) {
      try {
        const parsed = JSON.parse(storedBase);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localStorage.setItem(scopedKey, storedBase);
          return parsed;
        }
      } catch (e) {}
    }

    // 🛡️ RECOVERY FROM MASTER BACKUP DATASET:
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
