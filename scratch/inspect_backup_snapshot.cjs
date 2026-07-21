const https = require('https');

const url = 'https://mrpdkjhmzioyygictjua.supabase.co/rest/v1/app_data?select=*';
const key = 'sb_publishable_0kZjBWa7tBuHTCXIzEYKTA_3QusIMTf';

const safeParseJSON = (val) => {
  if (val === null || val === undefined) return val;
  let result = val;
  let attempts = 0;
  while (typeof result === 'string' && attempts < 5) {
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

const options = {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
};

https.get(url, options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error("HTTP error:", body);
      return;
    }
    const rows = JSON.parse(body);
    const backupRow = rows.find(r => r.key === 'app_data_backup_snapshot');
    if (!backupRow) {
      console.log("No backup snapshot row found.");
      return;
    }
    const snapshot = safeParseJSON(backupRow.value);
    console.log("Backup snapshot keys:", Object.keys(snapshot));
    for (const [k, v] of Object.entries(snapshot)) {
      if (Array.isArray(v)) {
        console.log(`Snapshot key "${k}": ${v.length} items`);
      }
    }
  });
}).on('error', (err) => console.error(err));
