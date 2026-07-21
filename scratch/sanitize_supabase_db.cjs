const https = require('https');

const urlBase = 'https://mrpdkjhmzioyygictjua.supabase.co/rest/v1/app_data';
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

const optionsGet = {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
};

https.get(urlBase + '?select=*', optionsGet, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', async () => {
    if (res.statusCode !== 200) {
      console.error("Failed to fetch:", body);
      return;
    }
    const rows = JSON.parse(body);
    console.log(`Analyzing ${rows.length} rows in Supabase app_data table...`);

    for (const r of rows) {
      const parsedVal = safeParseJSON(r.value);
      if (typeof r.value === 'string' && typeof parsedVal !== 'string') {
        console.log(`Key "${r.key}" has stringified JSON. Updating to parsed JSON...`);
        
        const payload = JSON.stringify({
          key: r.key,
          value: parsedVal,
          updated_at: new Date().toISOString()
        });

        const reqOptions = {
          method: 'POST',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          }
        };

        const req = https.request(urlBase, reqOptions, (updateRes) => {
          console.log(`Key "${r.key}" update status: ${updateRes.statusCode}`);
        });
        req.on('error', (err) => console.error(`Error updating "${r.key}":`, err));
        req.write(payload);
        req.end();
      } else {
        console.log(`Key "${r.key}" is already clean format (${typeof r.value}).`);
      }
    }
  });
});
