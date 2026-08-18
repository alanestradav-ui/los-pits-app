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

export const getTenantLocalStorage = (key, defaultValue, tenantId = null) => {
  const activeTenant = (tenantId || getActiveTenantId()).toLowerCase().trim();
  const scopedKey = `${activeTenant}_${key}`;
  const storedScoped = localStorage.getItem(scopedKey);
  const storedBase = localStorage.getItem(key);

  if (activeTenant === "lospits") {
    if (storedScoped !== null && storedBase !== null) {
      try {
        const parsedScoped = JSON.parse(storedScoped);
        const parsedBase = JSON.parse(storedBase);
        if (Array.isArray(parsedScoped) && Array.isArray(parsedBase)) {
          return parsedScoped.length >= parsedBase.length ? parsedScoped : parsedBase;
        }
        return parsedScoped || parsedBase || defaultValue;
      } catch (e) {}
    }
  }

  if (storedScoped !== null) {
    try {
      return JSON.parse(storedScoped);
    } catch (e) {
      return defaultValue;
    }
  }

  // Fallback for initial load if scoped key has not been written yet
  return getLocalStorage(key, defaultValue);
};

export const setTenantLocalStorage = (key, value, tenantId = null) => {
  const activeTenant = (tenantId || getActiveTenantId()).toLowerCase().trim();
  const scopedKey = `${activeTenant}_${key}`;
  setLocalStorage(scopedKey, value);
  if (activeTenant === "lospits") {
    setLocalStorage(key, value);
  }
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
