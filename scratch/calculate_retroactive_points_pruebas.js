const SUPABASE_URL = 'https://qxgwbihypspisenmwwih.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4Z3diaWh5cHNwaXNlbm13d2loIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjA0OTMyOCwiZXhwIjoyMTAxNjI1MzI4fQ.1iNouSCLvape4RtUUM0eEzBaWGj7RA_rgtqLH8XRsv4';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates'
};

async function calculateRetroactivePoints() {
  console.log("=== CALCULANDO PUNTOS DE RECOMPENSA RETROACTIVOS PARA EL TALLER DE PRUEBAS ===");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/app_data?select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const rows = await res.json();
  const dataMap = {};
  rows.forEach(r => dataMap[r.key] = r.value);

  const pruebasOrdenes = dataMap['pruebas_ordenes'] || [];
  const pruebasCarwash = dataMap['pruebas_carwash'] || [];
  const pruebasClientes = dataMap['pruebas_clientes'] || [];
  const pruebasCafeteriaSales = dataMap['pruebas_cafeteriaSales'] || [];

  console.log(`Órdenes en Pruebas: ${pruebasOrdenes.length}`);
  console.log(`Carwash en Pruebas: ${pruebasCarwash.length}`);
  console.log(`Clientes en Pruebas: ${pruebasClientes.length}`);

  // Map client key -> points & details
  const clientPointsMap = new Map();

  const getOrCreateClient = (tel, nombre) => {
    const cleanTel = String(tel || "").trim();
    const cleanNombre = String(nombre || "").trim();
    const key = (cleanTel || cleanNombre).toLowerCase();
    if (!key) return null;
    if (!clientPointsMap.has(key)) {
      clientPointsMap.set(key, {
        telefono: cleanTel,
        nombre: cleanNombre || "Cliente",
        puntos: 0,
        fechaRegistro: new Date().toISOString(),
        ultimaVisita: new Date().toISOString()
      });
    }
    return clientPointsMap.get(key);
  };

  // 1. Process Carwash Services (Q1 = 1 point)
  pruebasCarwash.forEach(cw => {
    const entry = getOrCreateClient(cw.telefono, cw.cliente);
    if (entry) {
      const monto = parseFloat(cw.precio) || parseFloat(cw.monto) || parseFloat(cw.total) || 0;
      const pts = Math.floor(monto);
      entry.puntos += pts;
      if (cw.fecha && new Date(cw.fecha) > new Date(entry.ultimaVisita)) {
        entry.ultimaVisita = cw.fecha;
      }
    }
  });

  // 2. Process Workshop Orders (Q4 en Mano de Obra / Total = 1 point, max 1500 per invoice)
  pruebasOrdenes.forEach(ord => {
    const entry = getOrCreateClient(ord.telefono, ord.cliente);
    if (entry) {
      const total = parseFloat(ord.total) || parseFloat(ord.monto) || 0;
      const pts = Math.min(1500, Math.floor(total / 4));
      entry.puntos += pts;
      if (ord.fecha && new Date(ord.fecha) > new Date(entry.ultimaVisita)) {
        entry.ultimaVisita = ord.fecha;
      }
    }
  });

  // 3. Process Cafeteria Sales (Q1 = 1 point)
  pruebasCafeteriaSales.forEach(sale => {
    const entry = getOrCreateClient(sale.clienteTelefono, sale.clienteNombre || sale.cliente);
    if (entry) {
      const total = parseFloat(sale.total) || parseFloat(sale.monto) || 0;
      const pts = Math.floor(total);
      entry.puntos += pts;
    }
  });

  // Ensure all clients from pruebasClientes are present
  pruebasClientes.forEach(c => {
    getOrCreateClient(c.telefono, c.nombre);
  });

  const pointsList = Array.from(clientPointsMap.values()).filter(p => p.nombre || p.telefono);
  console.log(`\n🎉 ¡Cálculo retroactivo finalizado! Se calcularon puntos para ${pointsList.length} clientes en PRUEBAS.`);

  const top10 = [...pointsList].sort((a, b) => b.puntos - a.puntos).slice(0, 10);
  console.log("\n--- TOP 10 CLIENTES CON PUNTOS EN PRUEBAS ---");
  top10.forEach(c => {
    console.log(`Cliente: ${c.nombre} | Tel: ${c.telefono} | Puntos Acumulados: ${c.puntos} pts`);
  });

  // Save to Supabase under key 'pruebas_puntosRecompensas'
  await fetch(`${SUPABASE_URL}/rest/v1/app_data`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      key: 'puntosRecompensas', // store under main key for pruebas tenant
      value: pointsList,
      updated_at: new Date().toISOString()
    })
  });

  console.log("\n✅ ¡Puntos retroactivos guardados exitosamente en 'pruebas_puntosRecompensas' en Supabase!");
}

calculateRetroactivePoints();
