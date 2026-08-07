// src/utils/supabase.js
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://qxgwbihypspisenmwwih.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4Z3diaWh5cHNwaXNlbm13d2loIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjA0OTMyOCwiZXhwIjoyMTAxNjI1MzI4fQ.1iNouSCLvape4RtUUM0eEzBaWGj7RA_rgtqLH8XRsv4';

let supabaseInstance = null;

/**
 * Obtiene la instancia activa del cliente Supabase con credenciales por defecto de respaldo
 */
export const getSupabaseClient = () => {
  let url = (localStorage.getItem('supabase_url') || '').trim();
  let key = (localStorage.getItem('supabase_key') || '').trim();

  if (!url || url.includes('mrpdkjhmzioyygictjua')) {
    url = DEFAULT_SUPABASE_URL;
    localStorage.setItem('supabase_url', url);
    supabaseInstance = null;
  }
  if (!key || key.includes('0kZjBWa7tBuHTCXIzEYKTA')) {
    key = DEFAULT_SUPABASE_KEY;
    localStorage.setItem('supabase_key', key);
    supabaseInstance = null;
  }

  if (supabaseInstance) return supabaseInstance;

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
  if (!client) return { ok: false, message: "No se han configurado credenciales de Supabase en este dispositivo." };
  try {
    const start = Date.now();
    const queryPromise = client.from('app_data').select('key').limit(1);
    const { error } = await withTimeout(queryPromise, 6000, "El servidor de Supabase no respondió (Tiempo de espera de 6s agotado).");
    const latency = Date.now() - start;

    if (error) {
      return { ok: false, message: `Error de respuesta del servidor (${error.message}).` };
    }
    return { ok: true, latency, message: `🟢 Conexión exitosa con el servidor de Supabase (${latency}ms).` };
  } catch (err) {
    const url = localStorage.getItem('supabase_url') || DEFAULT_SUPABASE_URL;
    return { 
      ok: false, 
      isPaused: true,
      message: `⚠️ No se pudo conectar al servidor de Supabase (${url}).\n\n` +
               `Causa principal: El proyecto de Supabase está PAUSADO debido al tiempo de inactividad del plan gratuito.\n\n` +
               `Pasos para solucionarlo en 1 minuto:\n` +
               `1. Inicia sesión en https://supabase.com/dashboard\n` +
               `2. Selecciona tu proyecto ("mrpdkjhmzioyygictjua")\n` +
               `3. Haz clic en el botón "Restore Project" / "Resume Project"\n` +
               `4. Vuelve a la app y presiona "Reintentar Sincronización".`
    };
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

  const sanitizePayload = (data) => {
    const parsed = safeParseJSON(data);
    if (!parsed) return parsed;
    
    if (Array.isArray(parsed)) {
      return parsed.map(item => {
        if (!item || typeof item !== "object") return item;
        const newItem = { ...item };
        
        const sanitizePhotoItem = (f) => {
          if (!f) return null;
          if (typeof f === "string") {
            // Preserve valid photo Base64 or URL strings up to 2MB characters
            return f.length <= 2000000 ? f : f.substring(0, 500);
          }
          if (typeof f === "object" && f.base64) {
            return {
              ...f,
              base64: typeof f.base64 === "string" && f.base64.length <= 2000000 ? f.base64 : ""
            };
          }
          return f;
        };

        if (Array.isArray(newItem.fotos)) {
          newItem.fotos = newItem.fotos.map(sanitizePhotoItem).filter(Boolean);
        }
        if (Array.isArray(newItem.photos)) {
          newItem.photos = newItem.photos.map(sanitizePhotoItem).filter(Boolean);
        }
        if (Array.isArray(newItem.fotosDiagnostico)) {
          newItem.fotosDiagnostico = newItem.fotosDiagnostico.map(sanitizePhotoItem).filter(Boolean);
        }
        return newItem;
      });
    }
    return parsed;
  };

  try {
    const cleanValue = sanitizePayload(value);
    const upsertPromise = client
      .from('app_data')
      .upsert({ key, value: cleanValue, updated_at: new Date().toISOString() });

    let { error } = await withTimeout(upsertPromise, 8000, `Timeout al sincronizar ${key}`);
    
    if (error) {
      console.warn(`[Sync] Direct sync for key "${key}" failed (${error.message}). Retrying...`);
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

/**
 * Procesar y vaciar la cola offline cuando hay conectividad activa
 */
export const processOfflineQueue = async () => {
  const queue = getOfflineQueue();
  if (!queue || queue.length === 0) return;
  console.log(`[OfflineQueue] Procesando ${queue.length} ítems acumulados offline...`);
  for (const item of queue) {
    if (item && item.key) {
      const ok = await syncKeyToCloud(item.key, item.value);
      if (ok) {
        removeFromOfflineQueue(item.key);
      }
    }
  }
};

