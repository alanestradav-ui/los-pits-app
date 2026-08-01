import React, { useState } from "react";
import { 
  Users, 
  Car, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  X, 
  Phone, 
  FileText, 
  UserCheck, 
  Hash, 
  Tag, 
  Calendar, 
  Palette,
  Mail,
  MapPin,
  Layers,
  RefreshCw,
  Link2,
  Link2Off,
  ArrowRightLeft,
  UserPlus,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

const prefixesList = ["P", "A", "MI", "CD", "C", "M", "DIS"];

const parsePlate = (plateStr) => {
  if (!plateStr) return { prefix: "P", number: "" };
  for (const pref of prefixesList) {
    if (plateStr.startsWith(`${pref}-`)) {
      return { prefix: pref, number: plateStr.slice(pref.length + 1) };
    }
  }
  return { prefix: "Extranjera", number: plateStr };
};

export default function ClientesVehiculos({
  clientes: rawClientes = [],
  setClientes,
  vehiculos: rawVehiculos = [],
  setVehiculos,
  usuarioActual,
  setOrdenes,
  setCarwash,
  setCuentasPorCobrar,
  onForceSyncCloud,
  puntosRecompensas = []
}) {
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  const getPuntos = (tel, nombre) => {
    if (!puntosRecompensas || puntosRecompensas.length === 0) return 0;
    const t = String(tel || "").toLowerCase().trim();
    const n = String(nombre || "").toLowerCase().trim();
    const match = puntosRecompensas.find(p => 
      (t && String(p.telefono || "").toLowerCase().trim() === t) ||
      (n && String(p.nombre || "").toLowerCase().trim() === n)
    );
    return match ? (parseInt(match.puntos) || 0) : 0;
  };

  const handleForceSync = async () => {
    if (onForceSyncCloud) {
      setIsSyncingCloud(true);
      const success = await onForceSyncCloud();
      setIsSyncingCloud(false);
      if (success) {
        alert("¡Sincronización completada! Se han recargado todos los clientes y vehículos de la nube.");
      } else {
        alert("No se pudo conectar a la nube en este momento. Intenta de nuevo.");
      }
    }
  };
  const clientes = rawClientes || [];
  const vehiculos = rawVehiculos || [];
  const [activeSubTab, setActiveSubTab] = useState("clientes");
  
  // Search states
  const [searchClient, setSearchClient] = useState("");
  const [searchVehicle, setSearchVehicle] = useState("");
  
  // Client form states
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  
  const [cNombre, setCNombre] = useState("");
  const [cTelefono, setCTelefono] = useState("");
  const [cNit, setCNit] = useState("");
  const [cNombreFacturacion, setCNombreFacturacion] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cDireccion, setCDireccion] = useState("");
  
  // Vehicle form states
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  
  const [vPlatePrefix, setVPlatePrefix] = useState("P");
  const [vPlateNumber, setVPlateNumber] = useState("");
  const [vChasis, setVChasis] = useState("");
  const [vMarca, setVMarca] = useState("");
  const [vLinea, setVLinea] = useState("");
  const [vAnio, setVAnio] = useState("");
  const [vColor, setVColor] = useState("");
  const [vClienteTelefono, setVClienteTelefono] = useState("");

  const isManager = usuarioActual?.rol === "admin" || usuarioActual?.rol === "cajero";

  // Assignment and Linking Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetVehicleForAssign, setTargetVehicleForAssign] = useState(null);
  const [targetClientForAssign, setTargetClientForAssign] = useState(null);
  const [selectedNewOwnerPhone, setSelectedNewOwnerPhone] = useState("");
  const [selectedVehicleToLink, setSelectedVehicleToLink] = useState("");

  // Helper to get vehicles linked to a client
  const getClientVehicles = (clientPhone) => {
    if (!clientPhone) return [];
    return (vehiculos || []).filter(v => v && v.clienteTelefono === clientPhone);
  };

  // Unlink a vehicle from its current client (Desvincular)
  const handleUnlinkVehicle = (vehicle) => {
    const vName = `${vehicle.placa || vehicle.chasis || "Vehículo"} (${vehicle.marca} ${vehicle.linea})`;
    const currentOwner = (clientes || []).find(c => c.telefono === vehicle.clienteTelefono);
    const ownerName = currentOwner ? currentOwner.nombre : vehicle.clienteTelefono;

    if (window.confirm(`¿Deseas desvincular el vehículo ${vName} del cliente "${ownerName}"?\n\nEl vehículo permanecerá registrado en el sistema pero sin propietario asignado.`)) {
      const updated = (vehiculos || []).map(v => {
        const isTarget = (vehicle.placa && v.placa === vehicle.placa) ||
                         (vehicle.chasis && v.chasis === vehicle.chasis);
        return isTarget ? { ...v, clienteTelefono: "" } : v;
      });
      setVehiculos(updated);
    }
  };

  // Open Reassign Modal for a vehicle
  const handleOpenReassignModal = (vehicle, client = null) => {
    setTargetVehicleForAssign(vehicle);
    setTargetClientForAssign(client);
    setSelectedNewOwnerPhone(vehicle ? (vehicle.clienteTelefono || "") : "");
    setSelectedVehicleToLink("");
    setShowAssignModal(true);
  };

  // Open Link Vehicle Modal for a client
  const handleOpenLinkForClientModal = (client) => {
    setTargetClientForAssign(client);
    setTargetVehicleForAssign(null);
    setSelectedVehicleToLink("");
    setSelectedNewOwnerPhone(client.telefono);
    setShowAssignModal(true);
  };

  // Execute Link or Reassignment
  const handleSaveAssignment = (e) => {
    e.preventDefault();
    if (targetVehicleForAssign) {
      const vehicle = targetVehicleForAssign;
      const prevOwnerPhone = vehicle.clienteTelefono;
      const newOwnerPhone = selectedNewOwnerPhone;

      if (prevOwnerPhone === newOwnerPhone) {
        setShowAssignModal(false);
        return;
      }

      const prevOwner = (clientes || []).find(c => c.telefono === prevOwnerPhone);
      const newOwner = (clientes || []).find(c => c.telefono === newOwnerPhone);

      let msg = "";
      if (newOwnerPhone === "") {
        msg = `¿Confirmas desvincular el vehículo ${vehicle.placa || vehicle.marca} del cliente actual?`;
      } else if (prevOwnerPhone) {
        msg = `¿Confirmas transferir la propiedad del vehículo ${vehicle.placa || vehicle.marca} de "${prevOwner ? prevOwner.nombre : prevOwnerPhone}" a "${newOwner ? newOwner.nombre : newOwnerPhone}" por venta/traspaso?`;
      } else {
        msg = `¿Confirmas asignar el vehículo ${vehicle.placa || vehicle.marca} a "${newOwner ? newOwner.nombre : newOwnerPhone}"?`;
      }

      if (window.confirm(msg)) {
        const updated = (vehiculos || []).map(v => {
          const isTarget = (vehicle.placa && v.placa === vehicle.placa) ||
                           (vehicle.chasis && v.chasis === vehicle.chasis);
          return isTarget ? { ...v, clienteTelefono: newOwnerPhone } : v;
        });
        setVehiculos(updated);
        setShowAssignModal(false);
      }
    } else if (targetClientForAssign) {
      if (!selectedVehicleToLink) {
        alert("Por favor selecciona un vehículo de la lista.");
        return;
      }

      const client = targetClientForAssign;
      const vehicleToLink = (vehiculos || []).find(v => (v.placa && v.placa === selectedVehicleToLink) || (v.chasis && v.chasis === selectedVehicleToLink));

      if (!vehicleToLink) return;

      const prevOwnerPhone = vehicleToLink.clienteTelefono;
      const prevOwner = (clientes || []).find(c => c.telefono === prevOwnerPhone);

      if (prevOwnerPhone && prevOwnerPhone !== client.telefono) {
        if (!window.confirm(`Este vehículo pertenece actualmente a "${prevOwner ? prevOwner.nombre : prevOwnerPhone}". ¿Deseas transferir la propiedad a "${client.nombre}"?`)) {
          return;
        }
      }

      const updated = (vehiculos || []).map(v => {
        const isTarget = (vehicleToLink.placa && v.placa === vehicleToLink.placa) ||
                         (vehicleToLink.chasis && v.chasis === vehicleToLink.chasis);
        return isTarget ? { ...v, clienteTelefono: client.telefono } : v;
      });
      setVehiculos(updated);
      setShowAssignModal(false);
    }
  };

  // Handlers
  const handleOpenClientModal = (client = null) => {
    if (client) {
      setEditingClient(client);
      setCNombre(client.nombre || "");
      setCTelefono(client.telefono || "");
      setCNit(client.nit || "");
      setCNombreFacturacion(client.nombreFacturacion || "");
      setCEmail(client.email || "");
      setCDireccion(client.direccion || "");
    } else {
      setEditingClient(null);
      setCNombre("");
      setCTelefono("");
      setCNit("");
      setCNombreFacturacion("");
      setCEmail("");
      setCDireccion("");
    }
    setShowClientModal(true);
  };
  
  const handleSaveClient = (e) => {
    e.preventDefault();
    const telClean = cTelefono.trim();
    const nombreClean = cNombre.trim();
    
    if (!telClean || !nombreClean) {
      alert("Nombre y Teléfono son obligatorios.");
      return;
    }
    
    if (editingClient) {
      // If phone changed, verify no conflict
      if (editingClient.telefono !== telClean) {
        const phoneExists = clientes.some(c => c.telefono === telClean);
        if (phoneExists) {
          alert("Ya existe un cliente registrado con ese número de teléfono.");
          return;
        }
      }
      
      const updated = clientes.map(c => c.telefono === editingClient.telefono ? {
        ...c,
        telefono: telClean,
        nombre: nombreClean,
        nit: cNit.trim() || "C/F",
        nombreFacturacion: cNombreFacturacion.trim() || nombreClean,
        email: cEmail.trim(),
        direccion: cDireccion.trim()
      } : c);
      
      // Update vehicle owner links, orders, carwash, and credits
      if (editingClient.telefono !== telClean) {
        const updatedVehicles = vehiculos.map(v => v.clienteTelefono === editingClient.telefono ? {
          ...v,
          clienteTelefono: telClean
        } : v);
        setVehiculos(updatedVehicles);

        if (setOrdenes) {
          setOrdenes(prev => (prev || []).map(o => o.telefono === editingClient.telefono ? { ...o, telefono: telClean } : o));
        }
        if (setCarwash) {
          setCarwash(prev => (prev || []).map(c => c.telefono === editingClient.telefono ? { ...c, telefono: telClean } : c));
        }
        if (setCuentasPorCobrar) {
          setCuentasPorCobrar(prev => (prev || []).map(cta => cta.telefono === editingClient.telefono ? { ...cta, telefono: telClean } : cta));
        }
      }
      
      setClientes(updated);
    } else {
      const phoneExists = clientes.some(c => c.telefono === telClean);
      if (phoneExists) {
        alert("Ya existe un cliente registrado con ese número de teléfono.");
        return;
      }
      
      const newClient = {
        telefono: telClean,
        nombre: nombreClean,
        nit: cNit.trim() || "C/F",
        nombreFacturacion: cNombreFacturacion.trim() || nombreClean,
        email: cEmail.trim(),
        direccion: cDireccion.trim(),
        fechaRegistro: new Date().toISOString()
      };
      setClientes([...clientes, newClient]);
    }
    
    setShowClientModal(false);
  };
  
  const handleDeleteClient = (telefono) => {
    if (window.confirm("¿Seguro que deseas eliminar este cliente? Los vehículos asignados a él no se borrarán, pero quedarán sin propietario asignado.")) {
      setClientes(clientes.filter(c => c.telefono !== telefono));
      setVehiculos(vehiculos.map(v => v.clienteTelefono === telefono ? { ...v, clienteTelefono: "" } : v));
    }
  };
  
  const handleOpenVehicleModal = (vehicle = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      if (vehicle.placa) {
        const p = parsePlate(vehicle.placa);
        setVPlatePrefix(p.prefix);
        setVPlateNumber(p.number);
      } else {
        setVPlatePrefix("P");
        setVPlateNumber("");
      }
      setVChasis(vehicle.chasis || "");
      setVMarca(vehicle.marca || "");
      setVLinea(vehicle.linea || "");
      setVAnio(vehicle.anio || "");
      setVColor(vehicle.color || "");
      setVClienteTelefono(vehicle.clienteTelefono || "");
    } else {
      setEditingVehicle(null);
      setVPlatePrefix("P");
      setVPlateNumber("");
      setVChasis("");
      setVMarca("");
      setVLinea("");
      setVAnio("");
      setVColor("");
      setVClienteTelefono("");
    }
    setShowVehicleModal(true);
  };
  
  const handleSaveVehicle = (e) => {
    e.preventDefault();
    const cleanNum = String(vPlateNumber || '').toUpperCase().trim();
    const plcClean = cleanNum ? (vPlatePrefix === "Extranjera" ? cleanNum : `${vPlatePrefix}-${cleanNum}`) : "";
    const chsClean = String(vChasis || '').toUpperCase().trim();
    const marcaClean = String(vMarca || '').trim();
    const lineaClean = String(vLinea || '').trim();
    
    if (!plcClean && !chsClean) {
      alert("Debes ingresar al menos Placa o Chasis para identificar el vehículo.");
      return;
    }
    
    if (!marcaClean || !lineaClean) {
      alert("Marca y Línea son obligatorias.");
      return;
    }
    
    // Check conflict with existing vehicles
    const conflict = vehiculos.find(v => {
      if (!v) return false;
      if (editingVehicle) {
        const isSelf = (editingVehicle.placa && v.placa === editingVehicle.placa) ||
                       (editingVehicle.chasis && v.chasis === editingVehicle.chasis);
        if (isSelf) return false;
      }
      return (plcClean && v.placa === plcClean) || (chsClean && v.chasis === chsClean);
    });
    
    if (conflict) {
      alert("Ya existe otro vehículo registrado con la misma Placa o Chasis.");
      return;
    }
    
    if (editingVehicle) {
      const updated = vehiculos.map(v => {
        if (!v) return v;
        const isSelf = (editingVehicle.placa && v.placa === editingVehicle.placa) ||
                       (editingVehicle.chasis && v.chasis === editingVehicle.chasis);
        return isSelf ? {
          ...v,
          placa: plcClean,
          chasis: chsClean,
          marca: marcaClean,
          linea: lineaClean,
          anio: String(vAnio || '').trim(),
          color: String(vColor || '').trim(),
          clienteTelefono: vClienteTelefono
        } : v;
      });
      setVehiculos(updated);
    } else {
      const newVehicle = {
        placa: plcClean,
        chasis: chsClean,
        marca: marcaClean,
        linea: lineaClean,
        anio: String(vAnio || '').trim(),
        color: String(vColor || '').trim(),
        clienteTelefono: vClienteTelefono,
        fechaRegistro: new Date().toISOString()
      };
      setVehiculos([...vehiculos, newVehicle]);
    }
    
    setShowVehicleModal(false);
  };
  
  const handleDeleteVehicle = (vehicle) => {
    const identifier = vehicle.placa || vehicle.chasis;
    if (window.confirm(`¿Seguro que deseas eliminar el vehículo identificado por: ${identifier}?`)) {
      setVehiculos(vehiculos.filter(v => v !== vehicle));
    }
  };

  const getOwnerName = (phone) => {
    if (!phone) return "No asignado";
    const found = (clientes || []).find(c => c.telefono === phone);
    return found ? `${found.nombre} (${phone})` : phone;
  };
  
  const filteredClientes = (clientes || [])
    .filter(c => c !== null && c !== undefined)
    .filter(c => 
      c.nombre?.toLowerCase().includes(searchClient.toLowerCase()) ||
      c.telefono?.includes(searchClient) ||
      c.nit?.includes(searchClient)
    );
  
  const filteredVehiculos = (vehiculos || [])
    .filter(v => v !== null && v !== undefined)
    .filter(v => 
      v.placa?.toLowerCase().includes(searchVehicle.toLowerCase()) ||
      v.chasis?.toLowerCase().includes(searchVehicle.toLowerCase()) ||
      v.marca?.toLowerCase().includes(searchVehicle.toLowerCase()) ||
      v.linea?.toLowerCase().includes(searchVehicle.toLowerCase())
    );

  return (
    <div style={styles.container}>
      {/* Header section */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <Users size={28} color="var(--color-primary)" />
          <div style={styles.headerText}>
            <h1 style={styles.pageTitle}>Registro de Clientes y Vehículos</h1>
            <p style={styles.pageSubtitle}>Base de datos unificada del taller e historial de ingreso</p>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {onForceSyncCloud && (
            <button
              onClick={handleForceSync}
              disabled={isSyncingCloud}
              className="action-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "rgba(59, 130, 246, 0.15)",
                color: "#60a5fa",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "0.85rem",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              <RefreshCw size={16} className={isSyncingCloud ? "spin" : ""} />
              {isSyncingCloud ? "Sincronizando..." : "Sincronizar Nube"}
            </button>
          )}

          {/* Tab switcher */}
          <div style={styles.subTabContainer}>
          <button 
            onClick={() => setActiveSubTab("clientes")}
            style={{...styles.subTabButton, ...(activeSubTab === "clientes" ? styles.subTabButtonActive : {})}}
          >
            <Users size={16} style={{marginRight: "6px"}} />
            Clientes ({clientes?.length || 0})
          </button>
          <button 
            onClick={() => setActiveSubTab("vehiculos")}
            style={{...styles.subTabButton, ...(activeSubTab === "vehiculos" ? styles.subTabButtonActive : {})}}
          >
            <Car size={16} style={{marginRight: "6px"}} />
            Vehículos ({vehiculos?.length || 0})
          </button>
        </div>
      </div>
    </div>

      {/* Main Panel */}
      <div className="glass-panel" style={styles.mainPanel}>
        {activeSubTab === "clientes" ? (
          <div>
            {/* Search and Action Row */}
            <div style={styles.searchRow}>
              <div style={styles.searchWrapper}>
                <Search size={18} style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar por nombre, teléfono o NIT..."
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
              {isManager && (
                <button onClick={() => handleOpenClientModal()} className="btn btn-primary" style={styles.addBtn}>
                  <Plus size={18} />
                  Nuevo Cliente
                </button>
              )}
            </div>

            {/* List Table */}
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nombre</th>
                    <th style={styles.th}>Teléfono / Celular</th>
                    <th style={styles.th}>NIT</th>
                    <th style={styles.th}>Nombre Facturación</th>
                    <th style={styles.th}>Vehículos Propios</th>
                    {isManager && <th style={{ ...styles.th, textAlign: "center" }}>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredClientes.length === 0 ? (
                    <tr>
                      <td colSpan={isManager ? 6 : 5} style={styles.emptyCell}>
                        No hay clientes registrados que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredClientes.map((c, i) => (
                      <tr key={c.telefono || i} style={styles.tr}>
                        <td style={styles.td}>
                          <strong>{c.nombre}</strong>
                          {c.email && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{c.email}</div>}
                        </td>
                        <td style={styles.td}>{c.telefono}</td>
                        <td style={styles.td}>{c.nit || "C/F"}</td>
                        <td style={styles.td}>{c.nombreFacturacion || c.nombre}</td>
                        <td style={{ ...styles.td, minWidth: "220px" }}>
                          {(() => {
                            const clientVehicles = getClientVehicles(c.telefono);
                            if (clientVehicles.length === 0) {
                              return (
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>Sin vehículos</span>
                                  {isManager && (
                                    <button
                                      onClick={() => handleOpenLinkForClientModal(c)}
                                      style={{ padding: "2px 8px", fontSize: "0.75rem", borderRadius: "4px", backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.3)", cursor: "pointer" }}
                                      title="Vincular Vehículo a este Cliente"
                                    >
                                      + Vincular
                                    </button>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {clientVehicles.map((v, idx) => (
                                  <div key={idx} style={{ display: "inline-flex", alignItems: "center", justifyContent: "space-between", gap: "6px", backgroundColor: "rgba(255, 255, 255, 0.05)", padding: "4px 8px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.08)", fontSize: "0.8rem" }}>
                                    <span style={{ color: "#fff", fontWeight: "600" }}>🚘 {v.placa || v.chasis} ({v.marca} {v.linea})</span>
                                    {isManager && (
                                      <div style={{ display: "flex", gap: "4px" }}>
                                        <button
                                          onClick={() => handleOpenReassignModal(v, c)}
                                          style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", padding: "2px" }}
                                          title="Reasignar / Transferir propiedad por venta"
                                        >
                                          <ArrowRightLeft size={14} />
                                        </button>
                                        <button
                                          onClick={() => handleUnlinkVehicle(v)}
                                          style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "2px" }}
                                          title="Desvincular vehículo de este cliente"
                                        >
                                          <Link2Off size={14} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {isManager && (
                                  <button
                                    onClick={() => handleOpenLinkForClientModal(c)}
                                    style={{ alignSelf: "flex-start", padding: "2px 8px", fontSize: "0.75rem", borderRadius: "4px", backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.3)", cursor: "pointer", marginTop: "2px" }}
                                  >
                                    + Vincular otro
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        {isManager && (
                          <td style={styles.tdActions}>
                            <button 
                              onClick={() => handleOpenClientModal(c)}
                              style={{...styles.iconBtn, color: "var(--color-primary)"}}
                              title="Editar Cliente"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteClient(c.telefono)}
                              style={{...styles.iconBtn, color: "var(--color-danger)"}}
                              title="Eliminar Cliente"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            {/* Search and Action Row */}
            <div style={styles.searchRow}>
              <div style={styles.searchWrapper}>
                <Search size={18} style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar por placa, chasis, marca o línea..."
                  value={searchVehicle}
                  onChange={(e) => setSearchVehicle(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
              {isManager && (
                <button onClick={() => handleOpenVehicleModal()} className="btn btn-primary" style={styles.addBtn}>
                  <Plus size={18} />
                  Nuevo Vehículo
                </button>
              )}
            </div>

            {/* List Table */}
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Placa</th>
                    <th style={styles.th}>Chasis / VIN</th>
                    <th style={styles.th}>Marca y Línea</th>
                    <th style={styles.th}>Año</th>
                    <th style={styles.th}>Color</th>
                    <th style={styles.th}>Propietario Asignado</th>
                    {isManager && <th style={{ ...styles.th, textAlign: "center" }}>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredVehiculos.length === 0 ? (
                    <tr>
                      <td colSpan={isManager ? 7 : 6} style={styles.emptyCell}>
                        No hay vehículos registrados que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredVehiculos.map((v, i) => (
                      <tr key={i} style={styles.tr}>
                        <td style={styles.td}>
                          <span style={styles.plateBadge}>{v.placa || "S/P"}</span>
                        </td>
                        <td style={styles.td}>{v.chasis || <span style={styles.mutedText}>—</span>}</td>
                        <td style={styles.td}><strong>{v.marca} {v.linea}</strong></td>
                        <td style={styles.td}>{v.anio || <span style={styles.mutedText}>—</span>}</td>
                        <td style={styles.td}>
                          {v.color ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: getColorHex(v.color), border: "1px solid rgba(255,255,255,0.2)" }} />
                              {v.color}
                            </span>
                          ) : <span style={styles.mutedText}>—</span>}
                        </td>
                        <td style={{ ...styles.td, minWidth: "220px" }}>
                          {(() => {
                            const owner = (clientes || []).find(c => c.telefono === v.clienteTelefono);
                            if (owner) {
                              return (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                  <div>
                                    <div style={{ fontWeight: "700", color: "#fff", fontSize: "0.85rem" }}>👤 {owner.nombre}</div>
                                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{owner.telefono}</div>
                                  </div>
                                  {isManager && (
                                    <div style={{ display: "flex", gap: "4px" }}>
                                      <button
                                        onClick={() => handleOpenReassignModal(v, owner)}
                                        style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", padding: "4px" }}
                                        title="Cambiar / Reasignar propietario (Transferir por Venta)"
                                      >
                                        <ArrowRightLeft size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleUnlinkVehicle(v)}
                                        style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "4px" }}
                                        title="Desvincular propietario"
                                      >
                                        <Link2Off size={16} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                <span style={{ fontSize: "0.8rem", color: "var(--color-warning)", fontStyle: "italic", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <AlertCircle size={14} /> Sin Propietario
                                </span>
                                {isManager && (
                                  <button
                                    onClick={() => handleOpenReassignModal(v)}
                                    style={{ padding: "3px 8px", fontSize: "0.75rem", borderRadius: "4px", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                  >
                                    <UserPlus size={12} /> Asignar Dueño
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        {isManager && (
                          <td style={styles.tdActions}>
                            <button 
                              onClick={() => handleOpenVehicleModal(v)}
                              style={{...styles.iconBtn, color: "var(--color-primary)"}}
                              title="Editar Vehículo"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteVehicle(v)}
                              style={{...styles.iconBtn, color: "var(--color-danger)"}}
                              title="Eliminar Vehículo"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* CLIENT MODAL */}
      {showClientModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingClient ? "Editar Cliente" : "Registrar Nuevo Cliente"}
              </h3>
              <button onClick={() => setShowClientModal(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveClient} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nombre Completo *</label>
                <div style={styles.inputWrapper}>
                  <Users size={16} style={styles.modalInputIcon} />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan José Mendoza"
                    className="input-field"
                    value={cNombre}
                    onChange={(e) => setCNombre(e.target.value)}
                    style={styles.modalInput}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{...styles.inputGroup, flex: 1}}>
                  <label style={styles.label}>Teléfono / Celular *</label>
                  <div style={styles.inputWrapper}>
                    <Phone size={16} style={styles.modalInputIcon} />
                    <input
                      type="text"
                      required
                      placeholder="Ej. 5566-7788"
                      className="input-field"
                      value={cTelefono}
                      onChange={(e) => setCTelefono(e.target.value)}
                      style={styles.modalInput}
                    />
                  </div>
                </div>
                <div style={{...styles.inputGroup, flex: 1}}>
                  <label style={styles.label}>NIT</label>
                  <div style={styles.inputWrapper}>
                    <FileText size={16} style={styles.modalInputIcon} />
                    <input
                      type="text"
                      placeholder="Ej. 1234567-8 o C/F"
                      className="input-field"
                      value={cNit}
                      onChange={(e) => setCNit(e.target.value)}
                      style={styles.modalInput}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Nombre de Facturación</label>
                <div style={styles.inputWrapper}>
                  <UserCheck size={16} style={styles.modalInputIcon} />
                  <input
                    type="text"
                    placeholder="Ej. Juan José Mendoza López"
                    className="input-field"
                    value={cNombreFacturacion}
                    onChange={(e) => setCNombreFacturacion(e.target.value)}
                    style={styles.modalInput}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Email (Opcional)</label>
                <div style={styles.inputWrapper}>
                  <Mail size={16} style={styles.modalInputIcon} />
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    className="input-field"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    style={styles.modalInput}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Dirección (Opcional)</label>
                <div style={styles.inputWrapper}>
                  <MapPin size={16} style={styles.modalInputIcon} />
                  <input
                    type="text"
                    placeholder="Ej. 12 Calle 4-50 Zona 10, Guatemala"
                    className="input-field"
                    value={cDireccion}
                    onChange={(e) => setCDireccion(e.target.value)}
                    style={styles.modalInput}
                  />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setShowClientModal(false)} 
                  className="btn btn-secondary"
                  style={{flex: 1}}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{flex: 1, backgroundColor: "var(--color-primary)", borderColor: "var(--color-primary)"}}
                >
                  {editingClient ? "Actualizar" : "Guardar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VEHICLE MODAL */}
      {showVehicleModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingVehicle ? "Editar Vehículo" : "Registrar Nuevo Vehículo"}
              </h3>
              <button onClick={() => setShowVehicleModal(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveVehicle} style={styles.form}>
              {/* Placa - Dedicated Full Width Row */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Placa (Si aplica)</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <select
                    className="input-field"
                    value={vPlatePrefix}
                    onChange={(e) => setVPlatePrefix(e.target.value)}
                    style={{ width: "110px", padding: "4px 8px", cursor: "pointer", backgroundColor: "rgba(0,0,0,0.2)" }}
                  >
                    <option value="P">P</option>
                    <option value="A">A</option>
                    <option value="MI">MI</option>
                    <option value="CD">CD</option>
                    <option value="C">C</option>
                    <option value="M">M</option>
                    <option value="DIS">DIS</option>
                    <option value="Extranjera">Extranjera</option>
                  </select>
                  <input
                    type="text"
                    placeholder="123XYZ"
                    className="input-field"
                    value={vPlateNumber}
                    onChange={(e) => setVPlateNumber(e.target.value.toUpperCase())}
                    style={{ flex: 1, textTransform: "uppercase" }}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{...styles.inputGroup, flex: 1}}>
                  <label style={styles.label}>Chasis / VIN</label>
                  <div style={styles.inputWrapper}>
                    <Hash size={16} style={styles.modalInputIcon} />
                    <input
                      type="text"
                      placeholder="Ej. 1HGCR2F8..."
                      className="input-field"
                      value={vChasis}
                      onChange={(e) => setVChasis(e.target.value)}
                      style={{ ...styles.modalInput, textTransform: "uppercase" }}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{...styles.inputGroup, flex: 1}}>
                  <label style={styles.label}>Marca *</label>
                  <div style={styles.inputWrapper}>
                    <Tag size={16} style={styles.modalInputIcon} />
                    <input
                      type="text"
                      required
                      placeholder="Ej. Toyota"
                      className="input-field"
                      value={vMarca}
                      onChange={(e) => setVMarca(e.target.value)}
                      style={styles.modalInput}
                    />
                  </div>
                </div>
                <div style={{...styles.inputGroup, flex: 1}}>
                  <label style={styles.label}>Línea *</label>
                  <div style={styles.inputWrapper}>
                    <Layers size={16} style={styles.modalInputIcon} />
                    <input
                      type="text"
                      required
                      placeholder="Ej. Hilux"
                      className="input-field"
                      value={vLinea}
                      onChange={(e) => setVLinea(e.target.value)}
                      style={styles.modalInput}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{...styles.inputGroup, flex: 1}}>
                  <label style={styles.label}>Año</label>
                  <div style={styles.inputWrapper}>
                    <Calendar size={16} style={styles.modalInputIcon} />
                    <input
                      type="number"
                      placeholder="Ej. 2021"
                      className="input-field"
                      value={vAnio}
                      onChange={(e) => setVAnio(e.target.value)}
                      style={styles.modalInput}
                    />
                  </div>
                </div>
                <div style={{...styles.inputGroup, flex: 1}}>
                  <label style={styles.label}>Color</label>
                  <div style={styles.inputWrapper}>
                    <Palette size={16} style={styles.modalInputIcon} />
                    <input
                      type="text"
                      placeholder="Ej. Blanco"
                      className="input-field"
                      value={vColor}
                      onChange={(e) => setVColor(e.target.value)}
                      style={styles.modalInput}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Propietario (Cliente)</label>
                <select
                  className="select-field"
                  value={vClienteTelefono}
                  onChange={(e) => setVClienteTelefono(e.target.value)}
                  style={styles.select}
                >
                  <option value="">-- Seleccionar Propietario (Sin asignar) --</option>
                  {(clientes || []).map((c, i) => (
                    <option key={c.telefono || i} value={c.telefono}>
                      {c.nombre} ({c.telefono})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setShowVehicleModal(false)} 
                  className="btn btn-secondary"
                  style={{flex: 1}}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{flex: 1, backgroundColor: "var(--color-primary)", borderColor: "var(--color-primary)"}}
                >
                  {editingVehicle ? "Actualizar" : "Guardar Vehículo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LINK / REASSIGN VEHICLE MODAL */}
      {showAssignModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={{ ...styles.modalContent, maxWidth: "520px" }}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {targetVehicleForAssign 
                  ? "Transferir / Asignar Propietario" 
                  : `Vincular Vehículo a ${targetClientForAssign?.nombre}`}
              </h3>
              <button onClick={() => setShowAssignModal(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} style={styles.form}>
              {targetVehicleForAssign ? (
                /* Reassigning targetVehicleForAssign */
                <>
                  <div style={{ padding: "14px", borderRadius: "8px", backgroundColor: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)", marginBottom: "16px", textAlign: "left" }}>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "600" }}>Vehículo Seleccionado:</div>
                    <div style={{ fontSize: "1.05rem", fontWeight: "800", color: "#fff", marginTop: "2px" }}>
                      🚘 {targetVehicleForAssign.placa || targetVehicleForAssign.chasis} — {targetVehicleForAssign.marca} {targetVehicleForAssign.linea} ({targetVehicleForAssign.anio || "Año N/A"})
                    </div>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Propietario Asignado (Cliente)</label>
                    <select
                      className="select-field"
                      value={selectedNewOwnerPhone}
                      onChange={(e) => setSelectedNewOwnerPhone(e.target.value)}
                      style={styles.select}
                    >
                      <option value="">-- Sin Propietario (Desvincular) --</option>
                      {(clientes || []).map((c, idx) => (
                        <option key={c.telefono || idx} value={c.telefono}>
                          {c.nombre} ({c.telefono}) {c.nit ? `- NIT: ${c.nit}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {targetVehicleForAssign.clienteTelefono && targetVehicleForAssign.clienteTelefono !== selectedNewOwnerPhone && selectedNewOwnerPhone !== "" && (
                    <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.25)", color: "#fbbf24", fontSize: "0.82rem", display: "flex", gap: "8px", alignItems: "center", textAlign: "left" }}>
                      <AlertCircle size={18} style={{ flexShrink: 0 }} />
                      <span>Al guardar, se actualizará el propietario de este vehículo por venta/traspaso.</span>
                    </div>
                  )}
                </>
              ) : (
                /* Linking vehicle to targetClientForAssign */
                <>
                  <div style={{ padding: "14px", borderRadius: "8px", backgroundColor: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)", marginBottom: "16px", textAlign: "left" }}>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "600" }}>Cliente Destino:</div>
                    <div style={{ fontSize: "1.05rem", fontWeight: "800", color: "#fff", marginTop: "2px" }}>
                      👤 {targetClientForAssign?.nombre} ({targetClientForAssign?.telefono})
                    </div>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Seleccionar Vehículo Registrado a Vincular</label>
                    <select
                      className="select-field"
                      value={selectedVehicleToLink}
                      onChange={(e) => setSelectedVehicleToLink(e.target.value)}
                      style={styles.select}
                      required
                    >
                      <option value="">-- Seleccionar Vehículo --</option>
                      {(vehiculos || []).map((v, idx) => {
                        const owner = (clientes || []).find(c => c.telefono === v.clienteTelefono);
                        const idStr = v.placa || v.chasis;
                        return (
                          <option key={idx} value={idStr}>
                            {idStr} - {v.marca} {v.linea} ({owner ? `Dueño: ${owner.nombre}` : "Sin propietario"})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div style={{ textAlign: "center", margin: "14px 0" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>¿El vehículo aún no está registrado?</span>{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAssignModal(false);
                        handleOpenVehicleModal();
                        setVClienteTelefono(targetClientForAssign?.telefono || "");
                      }}
                      style={{ background: "none", border: "none", color: "var(--color-primary)", textDecoration: "underline", cursor: "pointer", fontSize: "0.82rem", fontWeight: "700" }}
                    >
                      + Registrar Nuevo Vehículo para este cliente
                    </button>
                  </div>
                </>
              )}

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, backgroundColor: "var(--color-primary)", borderColor: "var(--color-primary)" }}
                >
                  Guardar Asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to get hex colors from Spanish common names for small DOT preview
function getColorHex(colorName) {
  if (!colorName) return "transparent";
  const colors = {
    blanco: "#ffffff",
    negro: "#111111",
    gris: "#888888",
    plata: "#d1d5db",
    rojo: "#dc2626",
    azul: "#2563eb",
    verde: "#16a34a",
    amarillo: "#ca8a04",
    naranja: "#ea580c",
    cafe: "#78350f",
    marrón: "#78350f",
    dorado: "#eab308",
  };
  return colors[colorName.toLowerCase().trim()] || "#555555";
}

const styles = {
  container: {
    flex: 1,
    height: "100%",
    padding: "30px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    backgroundColor: "var(--bg-main)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "20px",
  },
  titleSection: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  headerText: {
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
  },
  pageTitle: {
    fontSize: "1.75rem",
    fontWeight: "800",
    color: "#fff",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  pageSubtitle: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    margin: "4px 0 0 0",
  },
  subTabContainer: {
    display: "flex",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    padding: "4px",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  subTabButton: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    background: "transparent",
    color: "var(--text-muted)",
    fontWeight: "700",
    fontSize: "0.85rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s ease",
  },
  subTabButtonActive: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    color: "var(--color-primary)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
  },
  mainPanel: {
    padding: "24px",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
  },
  searchRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  searchWrapper: {
    position: "relative",
    flex: 1,
    minWidth: "250px",
    maxWidth: "500px",
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-muted)",
  },
  searchInput: {
    width: "100%",
    padding: "12px 16px 12px 42px",
    backgroundColor: "rgba(20, 24, 33, 0.5)",
    border: "1px solid var(--border-glass)",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "0.9rem",
    transition: "all 0.3s ease",
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    fontWeight: "700",
    borderRadius: "10px",
    cursor: "pointer",
  },
  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    borderRadius: "10px",
    border: "1px solid var(--border-glass)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "0.9rem",
  },
  th: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    padding: "14px 18px",
    fontWeight: "700",
    color: "var(--text-muted)",
    borderBottom: "1px solid var(--border-glass)",
    fontSize: "0.85rem",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  tr: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
    transition: "background-color 0.2s ease",
    ":hover": {
      backgroundColor: "rgba(255, 255, 255, 0.01)",
    }
  },
  td: {
    padding: "16px 18px",
    color: "#e2e8f0",
    whiteSpace: "nowrap",
  },
  tdActions: {
    padding: "16px 18px",
    display: "flex",
    justifyContent: "center",
    gap: "10px",
  },
  iconBtn: {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    borderRadius: "8px",
    width: "32px",
    height: "32px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
    ":hover": {
      transform: "scale(1.05)",
      background: "rgba(255, 255, 255, 0.08)",
    }
  },
  emptyCell: {
    padding: "40px",
    textAlign: "center",
    color: "var(--text-muted)",
    fontStyle: "italic",
  },
  mutedText: {
    color: "var(--text-muted)",
  },
  plateBadge: {
    backgroundColor: "#1e293b",
    color: "#f8fafc",
    padding: "4px 10px",
    borderRadius: "6px",
    fontFamily: "monospace",
    fontWeight: "700",
    border: "1px solid #475569",
    letterSpacing: "0.5px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    animation: "fadeIn 0.2s ease",
  },
  modalContent: {
    width: "100%",
    maxWidth: "520px",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    position: "relative",
    boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
    paddingBottom: "12px",
  },
  modalTitle: {
    fontSize: "1.25rem",
    fontWeight: "800",
    color: "#fff",
    margin: 0,
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      color: "#fff",
    }
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    textAlign: "left",
  },
  formRow: {
    display: "flex",
    gap: "12px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "0.8rem",
    fontWeight: "700",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  inputWrapper: {
    position: "relative",
    width: "100%",
  },
  modalInputIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-muted)",
  },
  modalInput: {
    width: "100%",
    padding: "10px 14px 10px 36px",
    backgroundColor: "rgba(20, 24, 33, 0.8)",
    border: "1px solid var(--border-glass)",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "0.9rem",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "rgba(20, 24, 33, 0.8)",
    border: "1px solid var(--border-glass)",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  modalActions: {
    display: "flex",
    gap: "12px",
    marginTop: "12px",
  },
};
