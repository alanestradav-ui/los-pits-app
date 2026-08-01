// src/services/dataService.js
import { getLocalStorage, setLocalStorage } from '../utils/storage';
import { syncKeyToCloud, safeParseJSON } from '../utils/supabase';

export const APP_ARRAY_KEYS = [
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

export const APP_VAL_KEYS = [
  "parkingRate",
  "comisionMecanico",
  "dashboardPeriod",
  "customStartDate",
  "customEndDate"
];

export const ALL_APP_KEYS = [...APP_ARRAY_KEYS, ...APP_VAL_KEYS];

/**
 * Genera un snapshot completo del estado actual almacenado en LocalStorage
 */
export const getAppSnapshot = () => {
  const snapshot = {
    timestamp: new Date().toISOString(),
    version: "2.0",
    data: {}
  };

  ALL_APP_KEYS.forEach(key => {
    const defaultVal = APP_ARRAY_KEYS.includes(key) ? [] : "";
    snapshot.data[key] = getLocalStorage(key, defaultVal);
  });

  return snapshot;
};

/**
 * Restaura un snapshot completo en LocalStorage y opcionalmente sincroniza con Supabase
 */
export const restoreAppSnapshot = async (snapshotData, syncToCloud = true) => {
  if (!snapshotData || typeof snapshotData !== 'object') {
    throw new Error("El snapshot proporcionado no es válido.");
  }

  const payload = snapshotData.data || snapshotData;
  const keysToRestore = Object.keys(payload);

  for (const key of keysToRestore) {
    if (ALL_APP_KEYS.includes(key)) {
      const value = payload[key];
      setLocalStorage(key, value);
      if (syncToCloud) {
        try {
          await syncKeyToCloud(key, value);
        } catch (e) {
          console.warn(`[DataService] Error sincronizando ${key} al restaurar snapshot:`, e);
        }
      }
    }
  }

  return true;
};

/**
 * Guarda una clave en LocalStorage y la sincroniza a la nube
 */
export const updateKeyData = async (key, value) => {
  setLocalStorage(key, value);
  try {
    await syncKeyToCloud(key, value);
  } catch (e) {
    console.warn(`[DataService] Error en sync de ${key}:`, e);
  }
};
