// src/utils/supabase.js
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://mrpdkjhmzioyygictjua.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_0kZjBWa7tBuHTCXIzEYKTA_3QusIMTf';

let supabaseInstance = null;

/**
 * Obtiene la instancia activa del cliente Supabase con credenciales por defecto de respaldo
 */
export const getSupabaseClient = () => {
  if (supabaseInstance) return supabaseInstance;

  let url = (localStorage.getItem('supabase_url') || '').trim();
  let key = (localStorage.getItem('supabase_key') || '').trim();

  if (!url) {
    url = DEFAULT_SUPABASE_URL;
    localStorage.setItem('supabase_url', url);
  }
  if (!key) {
    key = DEFAULT_SUPABASE_KEY;
    localStorage.setItem('supabase_key', key);
  }

  try {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false
      }
    });
  } catch (error) {
    console.error("[Supabase] Error al crear instancia del cliente:", error);
  }

  return supabaseInstance;
};

/**
 * Restablece la instancia de Supabase si cambian las credenciales
 */
export const resetSupabaseClient = () => {
  supabaseInstance = null;
};

/**
 * Wrapper de timeout para evitar promesas colgadas por más de N milisegundos
 */
export const withTimeout = (promise, timeoutMs = 8000, errorMessage = 'Tiempo de espera agotado al conectar con el servidor.') => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  return Promise.race([
    promise,
    timeoutPromise
  ]).finally(() => {
    clearTimeout(timeoutId);
  });
};

export const safeParseJSON = (val) => {
  if (val === null || val === undefined) return val;
  let result = val;
  let attempts = 0;
  while (typeof result === "string" && attempts < 5) {
    try {
      const parsed = JSON.parse(result);
      if (parsed === result) break;
      result = parsed;
      attempts++;
    } catch (e) {
      break;
    }
  }
  return result;
};

// Queue Manager para operaciones Offline
const QUEUE_KEY = "sync_queue";

export const getOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const addToOfflineQueue = (key, value) => {
  const queue = getOfflineQueue();
  const filtered = queue.filter(q => q.key !== key);
  filtered.push({ key, value, timestamp: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
};

export const removeFromOfflineQueue = (key) => {
  const queue = getOfflineQueue();
  const filtered = queue.filter(q => q.key !== key);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
};

/**
 * Prueba la conectividad con Supabase garantizando un timeout estricto de 6 segundos
 */
export const testSupabaseConnection = async () => {
  const client = getSupabaseClient();
  if (!client) return { ok: false, message: "No se han configurado credenciales de Supabase." };
  try {
    const start = Date.now();
    const queryPromise = client.from('app_data').select('key').limit(1);
    const { error } = await withTimeout(queryPromise, 6000, "El servidor Supabase no respondió dentro de 6 segundos.");
    const latency = Date.now() - start;

    if (error) {
      return { ok: false, message: `Error de respuesta del servidor (${error.message}).` };
    }
    return { ok: true, latency, message: `Conexión exitosa con Supabase (${latency}ms).` };
  } catch (err) {
    return { ok: false, message: `Error de conexión: ${err.message || 'El servidor puede estar pausado o fuera de línea.'}` };
  }
};

/**
 * Sincroniza una clave con Supabase envolviendo la petición en un timeout seguro de 8 segundos
 */
export const syncKeyToCloud = async (key, value) => {
  const client = getSupabaseClient();
  const cleanVal = safeParseJSON(value);

  if (!client) {
    addToOfflineQueue(key, cleanVal);
    return false;
  }

  const sanitizePayload = (data, stripImages = false) => {
    const parsed = safeParseJSON(data);
    if (!stripImages) return parsed;
    
    if (Array.isArray(parsed)) {
      return parsed.map(item => {
        if (!item || typeof item !== "object") return item;
        const newItem = { ...item };
        if (Array.isArray(newItem.fotos)) {
          newItem.fotos = newItem.fotos.map(f => (typeof f === "string" && f.length > 500) ? "" : f).filter(Boolean);
        }
        return newItem;
      });
    }
    return parsed;
  };

  try {
    let cleanValue = sanitizePayload(value, false);
    const upsertPromise = client
      .from('app_data')
      .upsert({ key, value: cleanValue, updated_at: new Date().toISOString() });

    let { error } = await withTimeout(upsertPromise, 8000, `Timeout al sincronizar ${key}`);
    
    if (error) {
      console.warn(`[Sync] Direct sync for key "${key}" failed (${error.message}). Retrying with optimized payload...`);
      cleanValue = sanitizePayload(value, true);
      const retryPromise = client
        .from('app_data')
        .upsert({ key, value: cleanValue, updated_at: new Date().toISOString() });
      
      const retryResult = await withTimeout(retryPromise, 8000, `Timeout en reintento de ${key}`);
      
      if (retryResult.error) {
        console.error(`[Sync] Retry sync for key "${key}" failed:`, retryResult.error.message);
        addToOfflineQueue(key, cleanVal);
        return false;
      }
    }

    // SERVER CONFIRMED RECEIPT
    removeFromOfflineQueue(key);
    return true;
  } catch (err) {
    console.error(`[Sync] Error o timeout sincronizando "${key}" a Supabase:`, err.message);
    addToOfflineQueue(key, cleanVal);
    return false;
  }
};
