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
  if (!client) return;
  try {
    const cleanValue = safeParseJSON(value);
    const { error } = await client
      .from('app_data')
      .upsert({ key, value: cleanValue, updated_at: new Date().toISOString() });
    
    if (error) {
      console.error(`Error uploading key "${key}" to Supabase:`, error.message);
    }
  } catch (err) {
    console.error(`Error syncing key "${key}" to Supabase:`, err);
  }
};

