/**
 * 🚗 Vehicle Helper Utilities for Los Pits
 * Finds and aggregates registered vehicles for a given customer across databases.
 */

export const findVehiclesForClient = ({
  clienteNombre = "",
  clienteTelefono = "",
  clienteId = "",
  vehiculos = [],
  ordenes = [],
  carwash = []
}) => {
  const normName = String(clienteNombre || "").toLowerCase().trim();
  const normPhone = String(clienteTelefono || "").replace(/[^0-9]/g, "");

  if (!normName && !normPhone && !clienteId) return [];

  const foundVehicles = new Map();

  // 1. Search in vehiculos catalog
  (vehiculos || []).forEach(v => {
    if (!v) return;
    const vOwner = String(v.propietario || v.clienteNombre || "").toLowerCase().trim();
    const vPhone = String(v.telefono || v.clienteTelefono || v.propietarioTelefono || "").replace(/[^0-9]/g, "");
    const vId = v.clienteId;

    let isMatch = false;
    if (clienteId && vId && String(vId) === String(clienteId)) isMatch = true;
    if (normPhone && vPhone && (vPhone.includes(normPhone) || normPhone.includes(vPhone))) isMatch = true;
    if (normName && vOwner && (vOwner === normName || vOwner.includes(normName) || normName.includes(vOwner))) isMatch = true;

    if (isMatch && v.placa) {
      const pKey = v.placa.toUpperCase().trim();
      if (!foundVehicles.has(pKey)) {
        foundVehicles.set(pKey, {
          placa: v.placa.toUpperCase().trim(),
          marca: v.marca || "",
          linea: v.linea || "",
          color: v.color || "",
          modelo: v.modelo || v.anio || "",
          anio: v.anio || v.modelo || "",
          chasis: v.chasis || "",
          propietario: v.propietario || clienteNombre,
          clienteTelefono: v.telefono || clienteTelefono
        });
      }
    }
  });

  // 2. Search in previous ordenes (Workshop history)
  (ordenes || []).forEach(o => {
    if (!o) return;
    const oClient = String(o.cliente || "").toLowerCase().trim();
    const oPhone = String(o.telefono || "").replace(/[^0-9]/g, "");

    let isMatch = false;
    if (normPhone && oPhone && (oPhone.includes(normPhone) || normPhone.includes(oPhone))) isMatch = true;
    if (normName && oClient && (oClient === normName || oClient.includes(normName))) isMatch = true;

    if (isMatch && o.vehiculo) {
      const str = String(o.vehiculo);
      const plateMatch = str.match(/\(([^)]+)\)/);
      const placa = plateMatch ? plateMatch[1] : (o.placa || "");
      if (placa) {
        const pKey = placa.toUpperCase().trim();
        if (!foundVehicles.has(pKey)) {
          foundVehicles.set(pKey, {
            placa: pKey,
            marca: o.marca || str.split(" ")[0] || "",
            linea: o.linea || "",
            color: o.color || "",
            modelo: o.modelo || o.anio || "",
            anio: o.anio || "",
            chasis: o.chasis || "",
            propietario: o.cliente || clienteNombre,
            clienteTelefono: o.telefono || clienteTelefono
          });
        }
      }
    }
  });

  // 3. Search in carwash history
  (carwash || []).forEach(cw => {
    if (!cw) return;
    const cwClient = String(cw.cliente || "").toLowerCase().trim();
    const cwPhone = String(cw.telefono || "").replace(/[^0-9]/g, "");

    let isMatch = false;
    if (normPhone && cwPhone && (cwPhone.includes(normPhone) || normPhone.includes(cwPhone))) isMatch = true;
    if (normName && cwClient && (cwClient === normName || cwClient.includes(normName))) isMatch = true;

    if (isMatch && cw.vehiculo) {
      const v = cw.vehiculo;
      const placa = v.placa || (typeof v === "string" ? v : "");
      if (placa) {
        const pKey = placa.toUpperCase().trim();
        if (!foundVehicles.has(pKey)) {
          foundVehicles.set(pKey, {
            placa: pKey,
            marca: v.marca || "",
            linea: v.linea || "",
            color: v.color || "",
            modelo: v.modelo || v.anio || "",
            anio: v.anio || "",
            chasis: v.chasis || "",
            propietario: cw.cliente || clienteNombre,
            clienteTelefono: cw.telefono || clienteTelefono
          });
        }
      }
    }
  });

  return Array.from(foundVehicles.values());
};
