import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;

export const getSupabaseClient = () => {
  if (supabaseInstance) return supabaseInstance;
  const url = localStorage.getItem('supabase_url');
  const key = localStorage.getItem('supabase_key');
  if (url && key) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: false
        }
      });
    } catch (error) {
      console.error("Error creating Supabase client:", error);
    }
  }
  return supabaseInstance;
};

// Reset supabase instance if credentials change
export const resetSupabaseClient = () => {
  supabaseInstance = null;
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

// Offline Queue Manager
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

export const testSupabaseConnection = async () => {
  const client = getSupabaseClient();
  if (!client) return { ok: false, message: "No se han configurado credenciales de Supabase." };
  try {
    const start = Date.now();
    const { data, error } = await client.from('app_data').select('key').limit(1);
    const latency = Date.now() - start;
    if (error) {
      return { ok: false, message: `Error de respuesta del servidor (${error.message}).` };
    }
    return { ok: true, latency, message: `Conexión exitosa con Supabase (${latency}ms).` };
  } catch (err) {
    return { ok: false, message: `Error de red o conexión al servidor (${err.message || 'Sin respuesta'}).` };
  }
};

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
    let { error } = await client
      .from('app_data')
      .upsert({ key, value: cleanValue, updated_at: new Date().toISOString() });
    
    if (error) {
      console.warn(`[Sync] Direct sync for key "${key}" failed (${error.message}). Retrying with optimized payload...`);
      cleanValue = sanitizePayload(value, true);
      const retryResult = await client
        .from('app_data')
        .upsert({ key, value: cleanValue, updated_at: new Date().toISOString() });
      
      if (retryResult.error) {
        console.error(`[Sync] Retry sync for key "${key}" failed:`, retryResult.error.message);
        addToOfflineQueue(key, cleanVal);
        return false;
      }
    }

    // SERVER CONFIRMED RECEIPT: Remove from offline queue ONLY upon successful server response!
    removeFromOfflineQueue(key);
    return true;
  } catch (err) {
    console.error(`[Sync] Error syncing key "${key}" to Supabase:`, err);
    addToOfflineQueue(key, cleanVal);
    return false;
  }
};


