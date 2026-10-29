// src/utils/supabase.js
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://mrpdkjhmzioyygictjua.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_0kZjBWa7tBuHTCXIzEYKTA_3QusIMTf';

let supabaseInstance = null;

/**
 * 🚀 Versiones conocidas por llave (updated_at). Permite que el polling descargue
 * SOLO las llaves que realmente cambiaron en la nube, en lugar de todo el dataset.
 */
export const cloudKeyVersions = {};

/**
 * Obtiene la instancia activa del cliente Supabase con credenciales por defecto de respaldo
 */
export const getSupabaseClient = () => {
  // 🔒 ALWAYS force correct credentials - override ANY stale cached values
  const url = DEFAULT_SUPABASE_URL;
  const key = DEFAULT_SUPABASE_KEY;
  try {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
  } catch (e) {
    // Quota exceeded or private browsing - safe to ignore, client still initializes with in-memory constants
  }

  if (supabaseInstance) return supabaseInstance;

  try {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        },
        heartbeatIntervalMs: 15000,
        reconnectAfterMs: (tries) => Math.min(1000 * Math.pow(2, tries), 10000),
        timeout: 20000
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

// ==========================================
// 🔐 SESIÓN SEGURA (token emitido por el servidor)
// La app ya no accede a la tabla app_data directamente: todo pasa por
// funciones del servidor que validan el token y el taller.
// ==========================================
const SESSION_KEY = "pits_sesion";

const readActiveTenant = () => {
  try {
    const stored = localStorage.getItem("current_tenant_id");
    return stored ? stored.toLowerCase().trim().replace(/"/g, "") : "lospits";
  } catch (e) {
    return "lospits";
  }
};

export const getSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.token) return null;
    return s;
  } catch (e) {
    return null;
  }
};

/** Sesión válida para el taller indicado (el superadmin puede operar cualquier taller) */
export const getSessionForTenant = (tenantId = null) => {
  const s = getSession();
  if (!s) return null;
  const t = (tenantId || readActiveTenantSafe()).toLowerCase().trim();
  if (s.taller === t || s.superadmin) return s;
  return null;
};

const readActiveTenantSafe = () => readActiveTenant();

export const setSession = (s) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch (e) {}
};

export const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {}
};

export const isSuperAdminSession = () => !!getSession()?.superadmin;

const AUTH_ERRORS = ["SESION_INVALIDA", "TALLER_SUSPENDIDO"];
const DROP_ERRORS = ["SIN_PERMISO", "LLAVE_NO_PERMITIDA"];

const errorCode = (error) => {
  const msg = String(error?.message || error || "");
  return [...AUTH_ERRORS, ...DROP_ERRORS].find(c => msg.includes(c)) || null;
};

const notifySessionExpired = (code) => {
  try {
    window.dispatchEvent(new CustomEvent("pits-sesion-expirada", { detail: { code } }));
  } catch (e) {}
};

/**
 * Llama una función del servidor con timeout. Lanza Error con el código del servidor.
 */
export const callRpc = async (fn, args = {}, timeoutMs = 15000) => {
  const client = getSupabaseClient();
  if (!client) throw new Error("SIN_CONEXION");
  const { data, error } = await withTimeout(client.rpc(fn, args), timeoutMs, `Tiempo de espera agotado (${fn})`);
  if (error) {
    const code = errorCode(error);
    if (code && AUTH_ERRORS.includes(code)) notifySessionExpired(code);
    const e = new Error(code || error.message || "Error del servidor");
    e.code = code;
    throw e;
  }
  return data;
};

const requireToken = () => {
  const s = getSessionForTenant();
  if (!s) {
    const e = new Error("SIN_SESION");
    e.code = "SIN_SESION";
    throw e;
  }
  return s.token;
};

/** Inicia sesión en el servidor. Devuelve { ok, error?, ...sesion } */
export const loginRemoto = async (taller, usuario, clave) => {
  const data = await callRpc("app_login", {
    p_taller: taller,
    p_usuario: usuario,
    p_clave: clave,
    p_agente: typeof navigator !== "undefined" ? navigator.userAgent : ""
  }, 20000);
  if (data && data.ok) {
    setSession({
      token: data.token,
      taller: data.taller,
      tallerNombre: data.tallerNombre || "",
      canal: data.canal || "",
      superadmin: !!data.superadmin,
      admin: !!data.admin,
      usuario: data.usuario,
      creada: new Date().toISOString()
    });
  }
  return data || { ok: false, error: "SIN_RESPUESTA" };
};

export const logoutRemoto = async () => {
  const s = getSession();
  clearSession();
  if (s?.token) {
    try { await callRpc("app_logout", { p_token: s.token }, 5000); } catch (e) {}
  }
};

/** Lee llaves: [{ key, value, updated_at }] */
export const cloudGet = async (keys, timeoutMs = 20000) => {
  if (!keys || keys.length === 0) return [];
  const data = await callRpc("app_get", { p_token: requireToken(), p_keys: keys }, timeoutMs);
  return Array.isArray(data) ? data : [];
};

/** Fechas de modificación: [{ key, updated_at }] */
export const cloudVersions = async (keys, timeoutMs = 10000) => {
  if (!keys || keys.length === 0) return [];
  const data = await callRpc("app_versions", { p_token: requireToken(), p_keys: keys }, timeoutMs);
  return Array.isArray(data) ? data : [];
};

/** Guarda una llave. Devuelve la fecha del servidor */
export const cloudPut = async (key, value, timeoutMs = 15000) => {
  return callRpc("app_put", { p_token: requireToken(), p_key: key, p_value: value }, timeoutMs);
};

/** Borra llaves del propio taller (quedan en la papelera del servidor) */
export const cloudDelete = async (keys) => {
  return callRpc("app_delete", { p_token: requireToken(), p_keys: keys });
};

/**
 * Asegura que la llave lleve el prefijo del taller activo.
 * Evita que un taller escriba en las llaves de otro o en las llaves antiguas sin prefijo.
 */
export const scopeCloudKey = (key) => {
  const k = String(key || "");
  if (!k) return k;
  const tenant = readActiveTenant();
  if (k.startsWith(`${tenant}_`) || k.startsWith("saas_")) return k;
  return `${tenant}_${k}`;
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
    const queryPromise = client.rpc('app_ping');
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
 * Sincroniza una clave con Supabase con timeout dinámico basado en el tamaño del payload.
 * Fotos base64 de órdenes/carwash ya entregados se eliminan para reducir el tamaño del payload.
 */
export const syncKeyToCloud = async (rawKey, value) => {
  const client = getSupabaseClient();
  const key = scopeCloudKey(rawKey);
  const cleanVal = safeParseJSON(value);

  if (!client) {
    addToOfflineQueue(key, cleanVal);
    return false;
  }

  // 🔐 Sin sesión no se sube nada (ni se encola): evita subir datos viejos al iniciar sesión
  if (!getSessionForTenant()) {
    return false;
  }

  // Detect if this is an ordenes or carwash key (scoped or unscoped)
  const baseKeyLower = key.replace(/^[a-z]+_/, '').toLowerCase();
  const isOrdersKey = baseKeyLower === 'ordenes';
  const isCarwashKey = baseKeyLower === 'carwash';

  const sanitizePayload = (data) => {
    const parsed = safeParseJSON(data);
    if (!parsed) return parsed;
    
    if (Array.isArray(parsed)) {
      return parsed.map(item => {
        // 🛡️ CRITICAL: Leave primitive items (strings, numbers, booleans) untouched.
        // This prevents corrupting arrays like activeModules which contain plain strings.
        if (item === null || item === undefined) return item;
        if (typeof item !== "object" || item instanceof Date) return item;
        const newItem = { ...item };
        
        // 🚀 OPTIMIZATION: Strip base64 photos from DELIVERED orders/carwash to reduce payload
        // Photos are already saved in localStorage; stripping from cloud prevents timeout on large payloads
        const isDelivered = (isOrdersKey || isCarwashKey) && 
          (newItem.estado === "Entregado" || newItem.estado === "Cobrado");

        const sanitizePhotoItem = (f) => {
          if (!f) return null;
          if (typeof f === "string") {
            // Strip large base64 photos from delivered items entirely
            if (isDelivered && f.length > 500 && (f.startsWith("data:image") || f.startsWith("/9j/") || f.startsWith("iVBOR"))) {
              return null; // Remove base64 photo from delivered orders
            }
            // For active orders, keep photos but cap at 500KB per photo
            return f.length <= 500000 ? f : f.substring(0, 500);
          }
          if (typeof f === "object" && f.base64) {
            if (isDelivered) return null; // Strip from delivered
            return {
              ...f,
              base64: typeof f.base64 === "string" && f.base64.length <= 500000 ? f.base64 : ""
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
    
    // 🚀 Dynamic timeout: base 10s + 1s per 100KB of payload (max 30s)
    const payloadSize = JSON.stringify(cleanValue).length;
    const dynamicTimeout = Math.min(30000, 10000 + Math.floor(payloadSize / 100000) * 1000);
    
    let writtenAt = null;
    try {
      writtenAt = await cloudPut(key, cleanValue, dynamicTimeout);
    } catch (firstErr) {
      if (firstErr.code && DROP_ERRORS.includes(firstErr.code)) {
        // El servidor no permite esta escritura (ej. un usuario sin permisos): no reintentar
        console.warn(`[Sync] El servidor rechazó "${key}" (${firstErr.code}).`);
        removeFromOfflineQueue(key);
        return true;
      }
      if (firstErr.code && AUTH_ERRORS.includes(firstErr.code)) {
        addToOfflineQueue(key, cleanVal);
        return false;
      }
      console.warn(`[Sync] Direct sync for key "${key}" failed (${firstErr.message}). Retrying...`);
      try {
        writtenAt = await cloudPut(key, cleanValue, dynamicTimeout);
      } catch (retryErr) {
        console.error(`[Sync] Retry sync for key "${key}" failed:`, retryErr.message);
        addToOfflineQueue(key, cleanVal);
        return false;
      }
    }

    // Registrar la versión escrita para no volver a descargar nuestro propio cambio
    cloudKeyVersions[key] = Date.parse(writtenAt) || Date.now();

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
  if (!getSessionForTenant()) return;
  const queue = getOfflineQueue();
  if (!queue || queue.length === 0) return;
  const tenant = readActiveTenant();
  console.log(`[OfflineQueue] Procesando ${queue.length} ítems acumulados offline...`);
  for (const item of queue) {
    if (item && item.key) {
      // Solo subir llaves del taller activo; las demás esperan a que se use ese taller
      const k = String(item.key);
      const belongsToTenant = k.startsWith(`${tenant}_`) || (tenant === "lospits" && !/^[a-z0-9-]+_/.test(k));
      if (!belongsToTenant) continue;
      const ok = await syncKeyToCloud(item.key, item.value);
      if (ok) {
        removeFromOfflineQueue(item.key);
      }
    }
  }
};

