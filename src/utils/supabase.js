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

export const syncKeyToCloud = async (key, value) => {
  const client = getSupabaseClient();
  if (!client) return false;

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
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error(`[Sync] Error syncing key "${key}" to Supabase:`, err);
    return false;
  }
};

