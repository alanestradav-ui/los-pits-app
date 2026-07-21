const https = require('https');
const fs = require('fs');

const url = 'https://mrpdkjhmzioyygictjua.supabase.co/rest/v1/app_data?select=*';
const key = 'sb_publishable_0kZjBWa7tBuHTCXIzEYKTA_3QusIMTf';

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
    try {
      if (res.statusCode === 200) {
        const rows = JSON.parse(body);
        const dump = {};
        rows.forEach(r => {
          let val = r.value;
          // Parse stringified JSON if needed
          while (typeof val === 'string') {
            try {
              val = JSON.parse(val);
            } catch (e) {
              break;
            }
          }
          dump[r.key] = val;
        });
        fs.writeFileSync('scratch/supabase_full_dump.json', JSON.stringify(dump, null, 2), 'utf-8');
        console.log(`Successfully dumped ${Object.keys(dump).length} keys to scratch/supabase_full_dump.json`);
      } else {
        console.error(`Status code: ${res.statusCode}`, body);
      }
    } catch (e) {
      console.error("Error processing dump:", e);
    }
  });
}).on('error', (err) => {
  console.error("HTTP error:", err);
});
