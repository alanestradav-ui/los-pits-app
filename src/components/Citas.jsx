import React, { useState, useMemo } from "react";
import { 
  Calendar, 
  CalendarCheck, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  MessageSquare, 
  Share2, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Wrench, 
  Car, 
  Sparkles, 
  User, 
  Phone, 
  CalendarClock, 
  ChevronRight, 
  Send, 
  Bell, 
  Check, 
  X, 
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { formatMoney } from "../utils/storage";
import { findVehiclesForClient } from "../utils/vehicleHelpers";
import ClientVehiclesModal from "./ClientVehiclesModal";

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

export default function Citas({
  citas = [],
  setCitas,
  clientes = [],
  setClientes,
  vehiculos = [],
  setVehiculos,
  mecanicos = [],
  lavadores = [],
  ordenes = [],
  setOrdenes,
  carwash = [],
  setCarwash,
  usuarioActual,
  onNavigateTab
}) {
  // Tabs & Filters
  const [activeTab, setActiveTab] = useState("lista"); // 'lista', 'recordatorios'
  const [filterModulo, setFilterModulo] = useState("todos"); // 'todos', 'taller', 'carwash', 'detailing'
  const [filterEstado, setFilterEstado] = useState("todos"); // 'todos', 'pendiente', 'confirmada', 'ingresada', 'cancelada'
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("todas"); // 'todas', 'hoy', 'manana', 'semana', 'futuras'

  // Modal States
  const [isNewCitaOpen, setIsNewCitaOpen] = useState(false);
  const [editingCita, setEditingCita] = useState(null);
  const [reminderModalCita, setReminderModalCita] = useState(null);
  const [clientVehiclesModalData, setClientVehiclesModalData] = useState({
    isOpen: false,
    clienteNombre: "",
    vehicles: []
  });

  // Form State for New / Edit Cita
  const [formData, setFormData] = useState({
    clienteNombre: "",
    clienteTelefono: "",
    clienteNit: "CF",
    platePrefix: "P",
    plateNumber: "",
    vehiculoPlaca: "",
    vehiculoMarca: "",
    vehiculoLinea: "",
    vehiculoColor: "",
    vehiculoModelo: "",
    fechaCita: "", // YYYY-MM-DD
    horaCita: "09:00",
    moduloDestino: "taller", // 'taller', 'carwash', 'detailing', 'general'
    servicio: "",
    precioEstimado: "",
    responsable: "",
    notas: "",
    estado: "pendiente" // 'pendiente', 'confirmada', 'ingresada', 'cancelada'
  });

  // Autocomplete Suggestions State
  const [clienteSuggestions, setClienteSuggestions] = useState([]);
  const [vehiculoSuggestions, setVehiculoSuggestions] = useState([]);

  // Default reminder templates helper
  const generateDefaultReminders = (citaData) => {
    const fechaObj = citaData.fechaCita ? new Date(`${citaData.fechaCita}T${citaData.horaCita || '09:00'}`) : new Date();
    
    // Fecha día previo (24h antes a las 18:00 o 9:00)
    const prevDate = new Date(fechaObj);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split("T")[0];

    // Fecha mismo día (2 horas antes)
    const sameDateStr = citaData.fechaCita;

    const fechaFormateada = citaData.fechaCita ? new Date(citaData.fechaCita + "T00:00:00").toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : "la fecha acordada";

    const msgConfirmacion = `🚗 *¡Hola ${citaData.clienteNombre || 'Estimado Cliente'}!* Te confirmamos tu cita en *Los Pits Taller & Carwash*:\n\n📅 *Fecha:* ${fechaFormateada}\n⏰ *Hora:* ${citaData.horaCita || '09:00 hrs'}\n🔧 *Servicio:* ${citaData.servicio || 'Servicio Automotriz'}\n🚘 *Vehículo:* ${citaData.vehiculoMarca || ''} ${citaData.vehiculoLinea || ''} (${citaData.vehiculoPlaca || 'Placa registrada'})\n📍 *Ubicación:* Los Pits Taller & Carwash\n\n¡Te esperamos con gusto para consentir tu vehículo!`;

    const msgDiaPrevio = `⏰ *Recordatorio de Cita - Los Pits*\n\nHola *${citaData.clienteNombre || 'Estimado Cliente'}*, te recordamos que *mañana* tienes cita programada con nosotros:\n\n📅 *Mañana a las:* ${citaData.horaCita || '09:00 hrs'}\n🔧 *Servicio:* ${citaData.servicio || 'Servicio Agendado'}\n🚘 *Vehículo:* ${citaData.vehiculoPlaca || ''}\n\nPor favor confírmanos si todo sigue en pie respondiendo a este mensaje. ¡Feliz día!`;

    const msgMismoDia = `🏁 *¡Tu espacio está listo en Los Pits!*\n\nHola *${citaData.clienteNombre || 'Estimado Cliente'}*, te esperamos hoy a las *${citaData.horaCita || '09:00 hrs'}* para tu servicio de *${citaData.servicio || 'mantenimiento'}*.\n\n📍 Ya tenemos lista tu bahía de atención. ¡Te esperamos pronto!`;

    return {
      confirmacion: {
        tipo: "confirmacion",
        titulo: "Notificación de Agendamiento",
        mensaje: msgConfirmacion,
        enviado: false,
        fechaEnvio: new Date().toISOString()
      },
      diaPrevio: {
        tipo: "dia_previo",
        titulo: "Recordatorio Día Previo (24 hrs antes)",
        fechaProgramada: prevDateStr,
        horaProgramada: "10:00",
        mensaje: msgDiaPrevio,
        enviado: false
      },
      mismoDia: {
        tipo: "mismo_dia",
        titulo: "Recordatorio Momentos Antes (Mismo Día)",
        fechaProgramada: sameDateStr,
        horaProgramada: citaData.horaCita ? `${Math.max(7, parseInt(citaData.horaCita.split(":")[0]) - 2).toString().padStart(2, '0')}:00` : "08:00",
        mensaje: msgMismoDia,
        enviado: false
      }
    };
  };

  // Helper: Open WhatsApp with encoded message
  const sendWhatsAppMessage = (phone, text, citaId, reminderKey) => {
    if (!phone) {
      alert("Por favor ingresa un número de teléfono válido para enviar WhatsApp.");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone.length === 8 ? '502' + cleanPhone : cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");

    // Mark reminder as sent if applicable
    if (citaId && reminderKey && setCitas) {
      setCitas(prev => (prev || []).map(c => {
        if (c.id === citaId) {
          const updatedReminders = { ...(c.recordatorios || {}) };
          if (updatedReminders[reminderKey]) {
            updatedReminders[reminderKey] = {
              ...updatedReminders[reminderKey],
              enviado: true,
              fechaUltimoEnvio: new Date().toISOString()
            };
          }
          return { ...c, recordatorios: updatedReminders };
        }
        return c;
      }));
    }
  };

  // Search & Filter Citas
  const filteredCitas = useMemo(() => {
    const list = Array.isArray(citas) ? citas : [];
    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    return list.filter(c => {
      // Modulo filter
      if (filterModulo !== "todos" && c.moduloDestino !== filterModulo) return false;
      // Estado filter
      if (filterEstado !== "todos" && c.estado !== filterEstado) return false;

      // Date filter
      if (dateFilter === "hoy" && c.fechaCita !== todayStr) return false;
      if (dateFilter === "manana" && c.fechaCita !== tomorrowStr) return false;
      if (dateFilter === "futuras" && c.fechaCita < todayStr) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const cliente = String(c.clienteNombre || "").toLowerCase();
        const tel = String(c.clienteTelefono || "").toLowerCase();
        const placa = String(c.vehiculoPlaca || "").toLowerCase();
        const serv = String(c.servicio || "").toLowerCase();
        const marca = String(c.vehiculoMarca || "").toLowerCase();
        return cliente.includes(q) || tel.includes(q) || placa.includes(q) || serv.includes(q) || marca.includes(q);
      }

      return true;
    }).sort((a, b) => {
      const dateA = `${a.fechaCita || '9999-99-99'}T${a.horaCita || '00:00'}`;
      const dateB = `${b.fechaCita || '9999-99-99'}T${b.horaCita || '00:00'}`;
      return dateA.localeCompare(dateB);
    });
  }, [citas, filterModulo, filterEstado, dateFilter, searchTerm]);

  // Pending Reminders for Today / Tomorrow
  const pendingRemindersList = useMemo(() => {
    const list = Array.isArray(citas) ? citas : [];
    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const reminders = [];

    list.forEach(c => {
      if (c.estado === "cancelada" || c.estado === "ingresada") return;
      const recs = c.recordatorios || {};

      // 1. Recordatorio Día Previo
      if (recs.diaPrevio && !recs.diaPrevio.enviado) {
        if (c.fechaCita === tomorrowStr || recs.diaPrevio.fechaProgramada === todayStr) {
          reminders.push({
            cita: c,
            key: "diaPrevio",
            reminder: recs.diaPrevio,
            badge: "Víspera (24h antes)",
            badgeColor: "#3b82f6"
          });
        }
      }

      // 2. Recordatorio Mismo Día
      if (recs.mismoDia && !recs.mismoDia.enviado) {
        if (c.fechaCita === todayStr) {
          reminders.push({
            cita: c,
            key: "mismoDia",
            reminder: recs.mismoDia,
            badge: "Hoy (Momentos antes)",
            badgeColor: "#eab308"
          });
        }
      }
    });

    return reminders;
  }, [citas]);

  // Handle open modal for new appointment
  const handleOpenNewCita = () => {
    const today = new Date().toISOString().split("T")[0];
    setEditingCita(null);
    setFormData({
      clienteNombre: "",
      clienteTelefono: "",
      clienteNit: "CF",
      platePrefix: "P",
      plateNumber: "",
      vehiculoPlaca: "",
      vehiculoMarca: "",
      vehiculoLinea: "",
      vehiculoColor: "",
      vehiculoModelo: "",
      fechaCita: today,
      horaCita: "09:00",
      moduloDestino: "taller",
      servicio: "",
      precioEstimado: "",
      responsable: "",
      notas: "",
      estado: "pendiente"
    });
    setVehiculoSuggestions([]);
    setClienteSuggestions([]);
    setIsNewCitaOpen(true);
  };

  // Handle edit appointment
  const handleOpenEditCita = (cita) => {
    setEditingCita(cita);
    const parsed = parsePlate(cita.vehiculoPlaca || "");
    setFormData({
      clienteNombre: cita.clienteNombre || "",
      clienteTelefono: cita.clienteTelefono || "",
      clienteNit: cita.clienteNit || "CF",
      platePrefix: parsed.prefix || "P",
      plateNumber: parsed.number || "",
      vehiculoPlaca: cita.vehiculoPlaca || "",
      vehiculoMarca: cita.vehiculoMarca || "",
      vehiculoLinea: cita.vehiculoLinea || "",
      vehiculoColor: cita.vehiculoColor || "",
      vehiculoModelo: cita.vehiculoModelo || "",
      fechaCita: cita.fechaCita || "",
      horaCita: cita.horaCita || "09:00",
      moduloDestino: cita.moduloDestino || "taller",
      servicio: cita.servicio || "",
      precioEstimado: cita.precioEstimado !== undefined ? cita.precioEstimado : "",
      responsable: cita.responsable || "",
      notas: cita.notas || "",
      estado: cita.estado || "pendiente"
    });
    setVehiculoSuggestions([]);
    setClienteSuggestions([]);
    setIsNewCitaOpen(true);
  };

  // Autocomplete handlers
  const handleClienteChange = (val) => {
    setFormData(prev => ({ ...prev, clienteNombre: val }));
    if (!val || val.length < 2) {
      setClienteSuggestions([]);
      return;
    }
    const matches = (clientes || []).filter(c => 
      (c.nombre && c.nombre.toLowerCase().includes(val.toLowerCase())) ||
      (c.telefono && c.telefono.includes(val))
    ).slice(0, 5);
    setClienteSuggestions(matches);
  };

  const handleSelectClienteSuggestion = (c) => {
    const cVehicles = findVehiclesForClient({
      clienteNombre: c.nombre,
      clienteTelefono: c.telefono,
      clienteId: c.id,
      vehiculos,
      ordenes,
      carwash
    });

    if (cVehicles.length === 1) {
      const v = cVehicles[0];
      const parsed = parsePlate(v.placa || "");
      setFormData(prev => ({
        ...prev,
        clienteNombre: c.nombre || prev.clienteNombre,
        clienteTelefono: c.telefono || prev.clienteTelefono,
        clienteNit: c.nit || prev.clienteNit || "CF",
        platePrefix: parsed.prefix,
        plateNumber: parsed.number,
        vehiculoPlaca: v.placa || prev.vehiculoPlaca,
        vehiculoMarca: v.marca || prev.vehiculoMarca,
        vehiculoLinea: v.linea || prev.vehiculoLinea,
        vehiculoColor: v.color || prev.vehiculoColor,
        vehiculoModelo: v.modelo || prev.vehiculoModelo
      }));
    } else if (cVehicles.length > 1) {
      setFormData(prev => ({
        ...prev,
        clienteNombre: c.nombre || prev.clienteNombre,
        clienteTelefono: c.telefono || prev.clienteTelefono,
        clienteNit: c.nit || prev.clienteNit || "CF"
      }));
      setClientVehiclesModalData({
        isOpen: true,
        clienteNombre: c.nombre,
        vehicles: cVehicles
      });
    } else {
      setFormData(prev => ({
        ...prev,
        clienteNombre: c.nombre || prev.clienteNombre,
        clienteTelefono: c.telefono || prev.clienteTelefono,
        clienteNit: c.nit || prev.clienteNit || "CF"
      }));
    }
    setClienteSuggestions([]);
  };

  const handleVehicleModalSelect = (v) => {
    const parsed = parsePlate(v.placa || "");
    setFormData(prev => ({
      ...prev,
      platePrefix: parsed.prefix,
      plateNumber: parsed.number,
      vehiculoPlaca: v.placa || prev.vehiculoPlaca,
      vehiculoMarca: v.marca || prev.vehiculoMarca,
      vehiculoLinea: v.linea || prev.vehiculoLinea,
      vehiculoColor: v.color || prev.vehiculoColor,
      vehiculoModelo: v.modelo || prev.vehiculoModelo
    }));
    setClientVehiclesModalData({ isOpen: false, clienteNombre: "", vehicles: [] });
  };

  const handlePlateNumberChange = (val) => {
    const upper = val.toUpperCase();
    const currentPrefix = formData.platePrefix || "P";
    const fullPlc = currentPrefix === "Extranjera" ? upper : (upper ? `${currentPrefix}-${upper}` : "");
    setFormData(prev => ({
      ...prev,
      plateNumber: upper,
      vehiculoPlaca: fullPlc
    }));
    if (!upper || upper.length < 2) {
      setVehiculoSuggestions([]);
      return;
    }
    const matches = (vehiculos || []).filter(v => 
      v.placa && (v.placa.toUpperCase().includes(fullPlc) || v.placa.toUpperCase().includes(upper))
    ).slice(0, 5);
    setVehiculoSuggestions(matches);
  };

  const handleSelectVehiculoSuggestion = (v) => {
    const parsed = parsePlate(v.placa || "");
    setFormData(prev => ({
      ...prev,
      platePrefix: parsed.prefix,
      plateNumber: parsed.number,
      vehiculoPlaca: v.placa || prev.vehiculoPlaca,
      vehiculoMarca: v.marca || prev.vehiculoMarca,
      vehiculoLinea: v.linea || prev.vehiculoLinea,
      vehiculoColor: v.color || prev.vehiculoColor,
      vehiculoModelo: v.modelo || prev.vehiculoModelo,
      clienteNombre: (!prev.clienteNombre.trim() && v.propietario) ? v.propietario : prev.clienteNombre
    }));
    setVehiculoSuggestions([]);
  };

  // Save Cita (Create or Update)
  const handleSaveCita = (e) => {
    e.preventDefault();
    if (!formData.clienteNombre.trim()) {
      alert("Por favor ingresa el nombre del cliente.");
      return;
    }
    if (!formData.fechaCita) {
      alert("Por favor selecciona una fecha válida para la cita.");
      return;
    }
    if (!formData.servicio.trim()) {
      alert("Por favor describe el servicio solicitado.");
      return;
    }

    const finalPlaca = (formData.plateNumber || "").trim()
      ? (formData.platePrefix === "Extranjera" ? formData.plateNumber.trim() : `${formData.platePrefix}-${formData.plateNumber.trim()}`)
      : (formData.vehiculoPlaca || "");

    const dataToSave = {
      ...formData,
      vehiculoPlaca: finalPlaca
    };

    const newRecordatorios = generateDefaultReminders(dataToSave);

    if (editingCita) {
      // Update existing
      setCitas(prev => (prev || []).map(c => {
        if (c.id === editingCita.id) {
          return {
            ...c,
            ...dataToSave,
            recordatorios: {
              confirmacion: {
                ...newRecordatorios.confirmacion,
                ...(c.recordatorios?.confirmacion || {}),
                mensaje: c.recordatorios?.confirmacion?.mensaje || newRecordatorios.confirmacion.mensaje
              },
              diaPrevio: {
                ...newRecordatorios.diaPrevio,
                ...(c.recordatorios?.diaPrevio || {})
              },
              mismoDia: {
                ...newRecordatorios.mismoDia,
                ...(c.recordatorios?.mismoDia || {})
              }
            },
            fechaModificacion: new Date().toISOString()
          };
        }
        return c;
      }));
    } else {
      // Create new
      const newCita = {
        id: `cita_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        ...dataToSave,
        recordatorios: newRecordatorios,
        fechaCreacion: new Date().toISOString(),
        creadoPor: usuarioActual?.user || "Admin"
      };

      setCitas(prev => [newCita, ...(Array.isArray(prev) ? prev : [])]);

      // Prompt to send immediate WhatsApp confirmation
      if (formData.clienteTelefono) {
        if (window.confirm("¿Deseas enviar la confirmación de la cita por WhatsApp al cliente ahora mismo?")) {
          sendWhatsAppMessage(formData.clienteTelefono, newRecordatorios.confirmacion.mensaje, newCita.id, "confirmacion");
        }
      }
    }

    // Auto-register vehicle/client if not exists
    if (formData.clienteNombre.trim() && setClientes) {
      setClientes(prev => {
        const list = Array.isArray(prev) ? [...prev] : [];
        const exists = list.some(cl => cl.nombre?.toLowerCase().trim() === formData.clienteNombre.toLowerCase().trim() || (formData.clienteTelefono && cl.telefono === formData.clienteTelefono));
        if (!exists) {
          list.push({
            id: `c_${Date.now()}`,
            nombre: formData.clienteNombre.trim(),
            telefono: formData.clienteTelefono.trim(),
            nit: formData.clienteNit.trim() || "CF",
            creadoEn: new Date().toISOString()
          });
        }
        return list;
      });
    }

    if (finalPlaca.trim() && setVehiculos) {
      setVehiculos(prev => {
        const list = Array.isArray(prev) ? [...prev] : [];
        const exists = list.some(vh => vh.placa?.toUpperCase().trim() === finalPlaca.toUpperCase().trim());
        if (!exists) {
          list.push({
            id: `v_${Date.now()}`,
            placa: finalPlaca.toUpperCase().trim(),
            marca: formData.vehiculoMarca.trim(),
            linea: formData.vehiculoLinea.trim(),
            color: formData.vehiculoColor.trim(),
            modelo: formData.vehiculoModelo.trim(),
            propietario: formData.clienteNombre.trim(),
            clienteTelefono: formData.clienteTelefono.trim()
          });
        }
        return list;
      });
    }

    setIsNewCitaOpen(false);
  };

  // Delete Cita
  const handleDeleteCita = (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta cita agendada?")) {
      setCitas(prev => (prev || []).filter(c => c.id !== id));
    }
  };

  // Change Estado
  const handleUpdateEstado = (id, nuevoEstado) => {
    setCitas(prev => (prev || []).map(c => {
      if (c.id === id) {
        return { ...c, estado: nuevoEstado, fechaModificacion: new Date().toISOString() };
      }
      return c;
    }));
  };

  // Convert Appointment to Live Order (Taller or Carwash)
  const handleDispatchCita = (cita) => {
    if (cita.moduloDestino === "carwash") {
      // Create Carwash Order
      const newWash = {
        id: `cw_${Date.now()}`,
        cliente: cita.clienteNombre,
        telefono: cita.clienteTelefono,
        vehiculo: {
          marca: cita.vehiculoMarca || "General",
          linea: cita.vehiculoLinea || "",
          placa: cita.vehiculoPlaca || "P-000000",
          color: cita.vehiculoColor || ""
        },
        tipo: cita.servicio || "Lavado Completo",
        precio: parseFloat(cita.precioEstimado) || 60,
        estado: "En proceso",
        lavador: cita.responsable || (lavadores[0] || "Asignado"),
        horaIngreso: new Date().toISOString(),
        metodoPago: "Efectivo",
        origenCitaId: cita.id
      };

      if (setCarwash) {
        setCarwash(prev => [newWash, ...(Array.isArray(prev) ? prev : [])]);
      }
      handleUpdateEstado(cita.id, "ingresada");
      alert(`✅ ¡Vehículo ingresado al Carwash con éxito! Orden generada.`);
      if (typeof onNavigateTab === "function") onNavigateTab("carwash");

    } else {
      // Create Workshop / Taller Order
      const newOrder = {
        id: Date.now(),
        cliente: cita.clienteNombre,
        telefono: cita.clienteTelefono,
        nit: cita.clienteNit || "CF",
        vehiculo: `${cita.vehiculoMarca || ''} ${cita.vehiculoLinea || ''} (${cita.vehiculoPlaca || 'S/P'})`.trim(),
        mecanico: cita.responsable || (mecanicos[0] || "Juan"),
        trabajo: cita.servicio + (cita.notas ? ` - Notas: ${cita.notas}` : ""),
        fotos: [],
        estado: "En Proceso",
        total: parseFloat(cita.precioEstimado) || 0,
        comision: 0,
        fecha: new Date().toISOString(),
        origenCitaId: cita.id
      };

      if (setOrdenes) {
        setOrdenes(prev => [newOrder, ...(Array.isArray(prev) ? prev : [])]);
      }
      handleUpdateEstado(cita.id, "ingresada");
      alert(`✅ ¡Vehículo ingresado al Taller Mecánico con éxito! Orden técnica #${newOrder.id} generada.`);
      if (typeof onNavigateTab === "function") onNavigateTab("taller");
    }
  };

  return (
    <div style={styles.container}>
      {/* 1. TOP HEADER & METRICS BAR */}
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <div style={styles.iconCircle}>
            <CalendarClock size={28} color="#eab308" />
          </div>
          <div>
            <h2 style={styles.mainTitle}>Módulo de Citas & Agenda Inteligente</h2>
            <p style={styles.subTitle}>Programa recepciones futuras, gestiona recordatorios por WhatsApp y convierte citas en órdenes de servicio con 1 clic.</p>
          </div>
        </div>

        <div style={styles.headerActions}>
          <button 
            onClick={handleOpenNewCita} 
            className="btn btn-primary" 
            style={styles.newCitaBtn}
          >
            <Plus size={18} /> Nueva Cita
          </button>
        </div>
      </div>

      {/* 2. STATS & REMINDER ALERT BANNER */}
      {pendingRemindersList.length > 0 && (
        <div style={styles.reminderAlertCard}>
          <div style={styles.reminderAlertLeft}>
            <div style={styles.bellPulse}>
              <Bell size={20} color="#f59e0b" />
            </div>
            <div>
              <h4 style={styles.alertTitle}>¡Tienes {pendingRemindersList.length} recordatorio{pendingRemindersList.length > 1 ? 's' : ''} pendiente{pendingRemindersList.length > 1 ? 's' : ''} de enviar hoy!</h4>
              <p style={styles.alertSub}>Clientes con citas agendadas para hoy o mañana listos para recibir su recordatorio por WhatsApp.</p>
            </div>
          </div>

          <button 
            onClick={() => setActiveTab("recordatorios")} 
            className="btn btn-primary" 
            style={{ fontSize: "0.85rem", padding: "8px 16px", backgroundColor: "#f59e0b", color: "#111827", fontWeight: "700" }}
          >
            Ver Recordatorios Pendientes <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* 3. TABS & SEARCH / FILTER ROW */}
      <div style={styles.filterBar}>
        <div style={styles.tabGroup}>
          <button 
            onClick={() => setActiveTab("lista")} 
            style={{ ...styles.tabBtn, ...(activeTab === "lista" ? styles.activeTabBtn : {}) }}
          >
            <CalendarCheck size={16} /> Todas las Citas ({citas.length})
          </button>
          <button 
            onClick={() => setActiveTab("recordatorios")} 
            style={{ ...styles.tabBtn, ...(activeTab === "recordatorios" ? styles.activeTabBtn : {}) }}
          >
            <MessageSquare size={16} /> Recordatorios WhatsApp
            {pendingRemindersList.length > 0 && (
              <span style={styles.badgeCount}>{pendingRemindersList.length}</span>
            )}
          </button>
        </div>

        <div style={styles.searchFilterControls}>
          <div style={styles.searchWrapper}>
            <Search size={16} color="#9ca3af" />
            <input 
              type="text"
              placeholder="Buscar por cliente, placa o servicio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <select 
            value={filterModulo} 
            onChange={(e) => setFilterModulo(e.target.value)}
            style={styles.selectFilter}
          >
            <option value="todos">Todos los Módulos</option>
            <option value="taller">🔧 Taller Mecánico</option>
            <option value="carwash">🧼 Carwash</option>
            <option value="detailing">✨ Detailing</option>
            <option value="general">🚗 General</option>
          </select>

          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            style={styles.selectFilter}
          >
            <option value="todas">Todas las Fechas</option>
            <option value="hoy">📅 Citas de Hoy</option>
            <option value="manana">⏰ Citas de Mañana</option>
            <option value="futuras">🚀 Próximas Citas</option>
          </select>

          <select 
            value={filterEstado} 
            onChange={(e) => setFilterEstado(e.target.value)}
            style={styles.selectFilter}
          >
            <option value="todos">Todos los Estados</option>
            <option value="pendiente">🟡 Pendientes</option>
            <option value="confirmada">🟢 Confirmadas</option>
            <option value="ingresada">🔵 Ingresadas / En Proceso</option>
            <option value="cancelada">🔴 Canceladas</option>
          </select>
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      {activeTab === "lista" && (
        <div style={styles.contentGrid}>
          {filteredCitas.length === 0 ? (
            <div style={styles.emptyCard}>
              <Calendar size={48} color="#9ca3af" />
              <h3 style={{ marginTop: "12px", color: "#fff" }}>No hay citas encontradas</h3>
              <p style={{ color: "#9ca3af", maxWidth: "400px" }}>
                {searchTerm || filterModulo !== "todos" || dateFilter !== "todas"
                  ? "No hay resultados que coincidan con los filtros aplicados."
                  : "Empieza agendando la primera cita para tu taller o carwash con el botón 'Nueva Cita'."}
              </p>
              <button onClick={handleOpenNewCita} className="btn btn-primary" style={{ marginTop: "16px" }}>
                <Plus size={16} /> Agendar Cita Ahora
              </button>
            </div>
          ) : (
            <div style={styles.citasListGrid}>
              {filteredCitas.map(cita => {
                const isToday = cita.fechaCita === new Date().toISOString().split("T")[0];
                const isPast = cita.fechaCita < new Date().toISOString().split("T")[0];

                return (
                  <div key={cita.id} style={{ 
                    ...styles.citaCard, 
                    borderLeft: `4px solid ${
                      cita.estado === 'confirmada' ? '#10b981' : 
                      cita.estado === 'ingresada' ? '#3b82f6' : 
                      cita.estado === 'cancelada' ? '#ef4444' : '#eab308'
                    }` 
                  }}>
                    {/* CARD HEADER */}
                    <div style={styles.cardHeader}>
                      <div style={styles.cardModuloBadge}>
                        {cita.moduloDestino === "carwash" ? "🧼 CARWASH" : 
                         cita.moduloDestino === "detailing" ? "✨ DETAILING" : "🔧 TALLER AUTOMOTRIZ"}
                      </div>
                      
                      <div style={styles.cardDateBadge}>
                        <Clock size={13} />
                        <span>{cita.fechaCita} a las {cita.horaCita} hrs</span>
                        {isToday && <span style={styles.todayPill}>HOY</span>}
                      </div>
                    </div>

                    {/* CLIENT & VEHICLE INFO */}
                    <div style={styles.cardBody}>
                      <div style={styles.cardClientRow}>
                        <div style={styles.cardAvatar}>
                          <User size={18} color="#eab308" />
                        </div>
                        <div>
                          <h4 style={styles.cardClientName}>{cita.clienteNombre}</h4>
                          <span style={styles.cardClientPhone}>
                            <Phone size={12} /> {cita.clienteTelefono || "Sin teléfono"}
                          </span>
                        </div>
                      </div>

                      <div style={styles.cardVehicleBox}>
                        <div style={styles.cardVehicleRow}>
                          <Car size={16} color="#9ca3af" />
                          <span style={styles.cardVehicleText}>
                            <strong>{cita.vehiculoPlaca || 'S/P'}</strong> {cita.vehiculoMarca} {cita.vehiculoLinea} {cita.vehiculoColor}
                          </span>
                        </div>
                        <div style={styles.cardServiceRow}>
                          <Wrench size={16} color="#eab308" />
                          <span style={styles.cardServiceText}>{cita.servicio}</span>
                        </div>
                      </div>

                      {cita.notas && (
                        <p style={styles.cardNotes}><strong>Nota:</strong> {cita.notas}</p>
                      )}

                      <div style={styles.cardMetaRow}>
                        <span>Asignado: <strong>{cita.responsable || 'Por asignar'}</strong></span>
                        {cita.precioEstimado > 0 && (
                          <span style={styles.priceEstimateTag}>Estimado: {formatMoney(cita.precioEstimado)}</span>
                        )}
                      </div>
                    </div>

                    {/* CARD FOOTER & ACTIONS */}
                    <div style={styles.cardFooter}>
                      {/* Estado Selector */}
                      <select 
                        value={cita.estado} 
                        onChange={(e) => handleUpdateEstado(cita.id, e.target.value)}
                        style={{
                          ...styles.estadoSelect,
                          backgroundColor: cita.estado === 'confirmada' ? 'rgba(16, 185, 129, 0.2)' : 
                                           cita.estado === 'ingresada' ? 'rgba(59, 130, 246, 0.2)' : 
                                           cita.estado === 'cancelada' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                          color: cita.estado === 'confirmada' ? '#10b981' : 
                                 cita.estado === 'ingresada' ? '#60a5fa' : 
                                 cita.estado === 'cancelada' ? '#f87171' : '#fbbf24'
                        }}
                      >
                        <option value="pendiente">🟡 Pendiente</option>
                        <option value="confirmada">🟢 Confirmada</option>
                        <option value="ingresada">🔵 Ingresada</option>
                        <option value="cancelada">🔴 Cancelada</option>
                      </select>

                      <div style={styles.cardActionBtns}>
                        {/* WhatsApp Reminder Button */}
                        <button 
                          onClick={() => setReminderModalCita(cita)} 
                          title="Gestionar y Enviar Recordatorios por WhatsApp"
                          style={styles.wspActionBtn}
                        >
                          <MessageSquare size={16} /> Recordatorios
                        </button>

                        {/* Convert to Live Order Button */}
                        {cita.estado !== "ingresada" && cita.estado !== "cancelada" && (
                          <button 
                            onClick={() => handleDispatchCita(cita)} 
                            title="Ingresar vehículo e iniciar orden en Taller o Carwash"
                            className="btn btn-primary"
                            style={styles.dispatchBtn}
                          >
                            <ArrowRight size={14} /> Ingresar
                          </button>
                        )}

                        {/* Edit Button */}
                        <button 
                          onClick={() => handleOpenEditCita(cita)} 
                          style={styles.iconBtn}
                          title="Editar Cita"
                        >
                          <Edit3 size={15} />
                        </button>

                        {/* Delete Button */}
                        <button 
                          onClick={() => handleDeleteCita(cita.id)} 
                          style={{ ...styles.iconBtn, color: "#ef4444" }}
                          title="Eliminar Cita"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 2: REMINDERS MANAGEMENT TAB */}
      {activeTab === "recordatorios" && (
        <div style={styles.remindersTabContainer}>
          <div style={styles.remindersTabHeader}>
            <div>
              <h3 style={{ color: "#fff", margin: 0, fontSize: "1.2rem" }}>Bandeja de Recordatorios de WhatsApp</h3>
              <p style={{ color: "#9ca3af", margin: "4px 0 0 0", fontSize: "0.85rem" }}>
                Envía recordatorios del día previo o momentos antes de la cita. Puedes editar el texto a discreción antes de enviar.
              </p>
            </div>
          </div>

          {pendingRemindersList.length === 0 ? (
            <div style={styles.emptyCard}>
              <CheckCircle2 size={48} color="#10b981" />
              <h4 style={{ marginTop: "12px", color: "#fff" }}>¡Todo al día!</h4>
              <p style={{ color: "#9ca3af" }}>No hay recordatorios pendientes de envío para hoy ni mañana.</p>
            </div>
          ) : (
            <div style={styles.remindersList}>
              {pendingRemindersList.map((item, idx) => {
                const { cita, key, reminder, badge, badgeColor } = item;
                return (
                  <div key={`${cita.id}_${key}_${idx}`} style={styles.reminderCardItem}>
                    <div style={styles.reminderCardHeader}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ ...styles.reminderBadgePill, backgroundColor: badgeColor }}>
                          {badge}
                        </span>
                        <span style={{ color: "#fff", fontWeight: "600", fontSize: "0.95rem" }}>
                          {cita.clienteNombre} ({cita.clienteTelefono})
                        </span>
                      </div>
                      <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
                        Cita: <strong>{cita.fechaCita} a las {cita.horaCita} hrs</strong>
                      </span>
                    </div>

                    <div style={styles.reminderMessageBox}>
                      <p style={styles.reminderMessageText}>{reminder.mensaje}</p>
                    </div>

                    <div style={styles.reminderActionsRow}>
                      <button 
                        onClick={() => setReminderModalCita(cita)} 
                        className="btn btn-ghost" 
                        style={{ fontSize: "0.8rem" }}
                      >
                        <Edit3 size={14} /> Personalizar Mensaje u Horario
                      </button>

                      <button 
                        onClick={() => sendWhatsAppMessage(cita.clienteTelefono, reminder.mensaje, cita.id, key)} 
                        className="btn btn-primary"
                        style={{ backgroundColor: "#25D366", color: "#fff", border: "none", fontWeight: "700" }}
                      >
                        <Share2 size={16} /> Enviar Recordatorio por WhatsApp
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. MODAL: NEW / EDIT CITA */}
      {isNewCitaOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CalendarClock size={22} color="#eab308" />
                <h3 style={styles.modalTitle}>{editingCita ? "Editar Cita Agendada" : "Registrar Nueva Cita"}</h3>
              </div>
              <button onClick={() => setIsNewCitaOpen(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCita} style={styles.modalBody}>
              {/* ROW 1: CLIENTE */}
              <div style={styles.formSectionTitle}>👤 Información del Cliente</div>
              <div style={styles.formGrid2}>
                <div style={{ position: "relative" }}>
                  <label style={styles.formLabel}>Nombre del Cliente *</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Juan Pérez"
                    value={formData.clienteNombre}
                    onChange={(e) => handleClienteChange(e.target.value)}
                    required
                    style={styles.formInput}
                  />
                  {clienteSuggestions.length > 0 && (
                    <div style={styles.suggestionsDropdown}>
                      {clienteSuggestions.map((c, i) => (
                        <div 
                          key={i} 
                          onClick={() => handleSelectClienteSuggestion(c)}
                          style={styles.suggestionItem}
                        >
                          <strong>{c.nombre}</strong> <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>({c.telefono})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={styles.formLabel}>Teléfono / WhatsApp *</label>
                  <input 
                    type="text" 
                    placeholder="Ej. 55443322"
                    value={formData.clienteTelefono}
                    onChange={(e) => setFormData({ ...formData, clienteTelefono: e.target.value })}
                    required
                    style={styles.formInput}
                  />
                </div>
              </div>

              {/* ROW 2: VEHICULO */}
              <div style={{ ...styles.formSectionTitle, marginTop: "16px" }}>🚘 Información del Vehículo</div>
              <div style={styles.formGrid3}>
                <div style={{ position: "relative" }}>
                  <label style={styles.formLabel}>Placa *</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select
                      className="input-field"
                      value={formData.platePrefix || "P"}
                      onChange={(e) => {
                        const newPref = e.target.value;
                        const num = (formData.plateNumber || "").trim();
                        const newFull = newPref === "Extranjera" ? num : (num ? `${newPref}-${num}` : "");
                        setFormData(prev => ({ ...prev, platePrefix: newPref, vehiculoPlaca: newFull }));
                      }}
                      style={{ 
                        width: "100px", 
                        padding: "8px", 
                        cursor: "pointer", 
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        color: "#fff"
                      }}
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
                      value={formData.plateNumber || ""}
                      onChange={(e) => handlePlateNumberChange(e.target.value)}
                      style={{ ...styles.formInput, flex: 1, textTransform: "uppercase" }}
                    />
                  </div>
                  {vehiculoSuggestions.length > 0 && (
                    <div style={styles.suggestionsDropdown}>
                      {vehiculoSuggestions.map((v, i) => (
                        <div 
                          key={i} 
                          onClick={() => handleSelectVehiculoSuggestion(v)}
                          style={styles.suggestionItem}
                        >
                          <strong>{v.placa}</strong> <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>{v.marca} {v.linea} ({v.propietario})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={styles.formLabel}>Marca</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Toyota"
                    value={formData.vehiculoMarca}
                    onChange={(e) => setFormData({ ...formData, vehiculoMarca: e.target.value })}
                    style={styles.formInput}
                  />
                </div>

                <div>
                  <label style={styles.formLabel}>Línea / Modelo</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Hilux 2020"
                    value={formData.vehiculoLinea}
                    onChange={(e) => setFormData({ ...formData, vehiculoLinea: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
              </div>

              {/* ROW 3: FECHA, HORA Y DESTINO */}
              <div style={{ ...styles.formSectionTitle, marginTop: "16px" }}>📅 Programación del Servicio</div>
              <div style={styles.formGrid3}>
                <div>
                  <label style={styles.formLabel}>Fecha de la Cita *</label>
                  <input 
                    type="date" 
                    value={formData.fechaCita}
                    onChange={(e) => setFormData({ ...formData, fechaCita: e.target.value })}
                    required
                    style={styles.formInput}
                  />
                </div>

                <div>
                  <label style={styles.formLabel}>Hora *</label>
                  <input 
                    type="time" 
                    value={formData.horaCita}
                    onChange={(e) => setFormData({ ...formData, horaCita: e.target.value })}
                    required
                    style={styles.formInput}
                  />
                </div>

                <div>
                  <label style={styles.formLabel}>Módulo Destino *</label>
                  <select 
                    value={formData.moduloDestino}
                    onChange={(e) => setFormData({ ...formData, moduloDestino: e.target.value })}
                    style={styles.formInput}
                  >
                    <option value="taller">🔧 Taller Mecánico</option>
                    <option value="carwash">🧼 Carwash</option>
                    <option value="detailing">✨ Detailing / Estética</option>
                    <option value="general">🚗 General</option>
                  </select>
                </div>
              </div>

              {/* ROW 4: SERVICIO Y PRECIO */}
              <div style={styles.formGrid2}>
                <div>
                  <label style={styles.formLabel}>Servicio a Realizar *</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Cambio de Aceite, Alineación, Lavado Oro..."
                    value={formData.servicio}
                    onChange={(e) => setFormData({ ...formData, servicio: e.target.value })}
                    required
                    style={styles.formInput}
                  />
                </div>

                <div>
                  <label style={styles.formLabel}>Precio / Cotización Estimada (Q)</label>
                  <input 
                    type="number" 
                    placeholder="Ej. 350.00"
                    value={formData.precioEstimado}
                    onChange={(e) => setFormData({ ...formData, precioEstimado: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
              </div>

              {/* ROW 5: RESPONSABLE Y NOTAS */}
              <div style={styles.formGrid2}>
                <div>
                  <label style={styles.formLabel}>Técnico / Lavador Asignado (Opcional)</label>
                  <select 
                    value={formData.responsable}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    style={styles.formInput}
                  >
                    <option value="">-- Sin Asignar (Por Definir) --</option>
                    {formData.moduloDestino === "carwash" ? (
                      (lavadores || []).map((l, i) => <option key={i} value={l}>{l} (Lavador)</option>)
                    ) : (
                      (mecanicos || []).map((m, i) => <option key={i} value={m}>{m} (Mecánico)</option>)
                    )}
                  </select>
                </div>

                <div>
                  <label style={styles.formLabel}>Estado Inicial</label>
                  <select 
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    style={styles.formInput}
                  >
                    <option value="pendiente">🟡 Pendiente de Confirmación</option>
                    <option value="confirmada">🟢 Confirmada por el Cliente</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={styles.formLabel}>Notas Especiales / Observaciones</label>
                <textarea 
                  placeholder="Ej. Cliente solicita revisar ruidos en suspensión delantera..."
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  style={{ ...styles.formInput, minHeight: "60px" }}
                />
              </div>

              {/* MODAL ACTIONS */}
              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setIsNewCitaOpen(false)} className="btn btn-ghost">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={18} /> {editingCita ? "Guardar Cambios" : "Guardar y Agendar Cita"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: EDIT & SEND RECORDATORIOS */}
      {reminderModalCita && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: "700px" }}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <MessageSquare size={22} color="#25D366" />
                <h3 style={styles.modalTitle}>Configurar Recordatorios WhatsApp</h3>
              </div>
              <button onClick={() => setReminderModalCita(null)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.reminderTargetInfo}>
                <strong>Cliente:</strong> {reminderModalCita.clienteNombre} | <strong>Teléfono:</strong> {reminderModalCita.clienteTelefono} | <strong>Fecha:</strong> {reminderModalCita.fechaCita} a las {reminderModalCita.horaCita}
              </div>

              {/* 1. NOTIFICACIÓN DE CONFIRMACIÓN */}
              <div style={styles.reminderBlock}>
                <div style={styles.reminderBlockHeader}>
                  <h4 style={styles.reminderBlockTitle}>1. Confirmación de Cita (Envío Inmediato)</h4>
                  <button 
                    onClick={() => sendWhatsAppMessage(reminderModalCita.clienteTelefono, reminderModalCita.recordatorios?.confirmacion?.mensaje, reminderModalCita.id, "confirmacion")}
                    style={styles.sendWspSmallBtn}
                  >
                    <Share2 size={14} /> Enviar Ahora
                  </button>
                </div>
                <textarea 
                  value={reminderModalCita.recordatorios?.confirmacion?.mensaje || ""}
                  onChange={(e) => {
                    const newMsg = e.target.value;
                    setCitas(prev => (prev || []).map(c => {
                      if (c.id === reminderModalCita.id) {
                        return {
                          ...c,
                          recordatorios: {
                            ...(c.recordatorios || {}),
                            confirmacion: { ...(c.recordatorios?.confirmacion || {}), mensaje: newMsg }
                          }
                        };
                      }
                      return c;
                    }));
                    setReminderModalCita(prev => ({
                      ...prev,
                      recordatorios: {
                        ...(prev.recordatorios || {}),
                        confirmacion: { ...(prev.recordatorios?.confirmacion || {}), mensaje: newMsg }
                      }
                    }));
                  }}
                  style={styles.reminderTextArea}
                />
              </div>

              {/* 2. RECORDATORIO DÍA PREVIO */}
              <div style={styles.reminderBlock}>
                <div style={styles.reminderBlockHeader}>
                  <div>
                    <h4 style={styles.reminderBlockTitle}>2. Recordatorio Día Previo (24 hrs antes)</h4>
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                      Programado para: {reminderModalCita.recordatorios?.diaPrevio?.fechaProgramada || 'Víspera'} a las {reminderModalCita.recordatorios?.diaPrevio?.horaProgramada || '10:00'} hrs
                    </span>
                  </div>
                  <button 
                    onClick={() => sendWhatsAppMessage(reminderModalCita.clienteTelefono, reminderModalCita.recordatorios?.diaPrevio?.mensaje, reminderModalCita.id, "diaPrevio")}
                    style={styles.sendWspSmallBtn}
                  >
                    <Share2 size={14} /> Enviar WhatsApp
                  </button>
                </div>

                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <input 
                    type="date"
                    value={reminderModalCita.recordatorios?.diaPrevio?.fechaProgramada || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCitas(prev => (prev || []).map(c => {
                        if (c.id === reminderModalCita.id) {
                          return {
                            ...c,
                            recordatorios: {
                              ...(c.recordatorios || {}),
                              diaPrevio: { ...(c.recordatorios?.diaPrevio || {}), fechaProgramada: val }
                            }
                          };
                        }
                        return c;
                      }));
                    }}
                    style={{ ...styles.formInput, padding: "4px 8px", fontSize: "0.8rem" }}
                  />
                  <input 
                    type="time"
                    value={reminderModalCita.recordatorios?.diaPrevio?.horaProgramada || "10:00"}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCitas(prev => (prev || []).map(c => {
                        if (c.id === reminderModalCita.id) {
                          return {
                            ...c,
                            recordatorios: {
                              ...(c.recordatorios || {}),
                              diaPrevio: { ...(c.recordatorios?.diaPrevio || {}), horaProgramada: val }
                            }
                          };
                        }
                        return c;
                      }));
                    }}
                    style={{ ...styles.formInput, padding: "4px 8px", fontSize: "0.8rem", width: "120px" }}
                  />
                </div>

                <textarea 
                  value={reminderModalCita.recordatorios?.diaPrevio?.mensaje || ""}
                  onChange={(e) => {
                    const newMsg = e.target.value;
                    setCitas(prev => (prev || []).map(c => {
                      if (c.id === reminderModalCita.id) {
                        return {
                          ...c,
                          recordatorios: {
                            ...(c.recordatorios || {}),
                            diaPrevio: { ...(c.recordatorios?.diaPrevio || {}), mensaje: newMsg }
                          }
                        };
                      }
                      return c;
                    }));
                    setReminderModalCita(prev => ({
                      ...prev,
                      recordatorios: {
                        ...(prev.recordatorios || {}),
                        diaPrevio: { ...(prev.recordatorios?.diaPrevio || {}), mensaje: newMsg }
                      }
                    }));
                  }}
                  style={styles.reminderTextArea}
                />
              </div>

              {/* 3. RECORDATORIO MISMO DÍA */}
              <div style={styles.reminderBlock}>
                <div style={styles.reminderBlockHeader}>
                  <div>
                    <h4 style={styles.reminderBlockTitle}>3. Recordatorio Momentos Antes (Mismo Día)</h4>
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                      Programado para el día de la cita a las {reminderModalCita.recordatorios?.mismoDia?.horaProgramada || '08:00'} hrs
                    </span>
                  </div>
                  <button 
                    onClick={() => sendWhatsAppMessage(reminderModalCita.clienteTelefono, reminderModalCita.recordatorios?.mismoDia?.mensaje, reminderModalCita.id, "mismoDia")}
                    style={styles.sendWspSmallBtn}
                  >
                    <Share2 size={14} /> Enviar WhatsApp
                  </button>
                </div>
                <textarea 
                  value={reminderModalCita.recordatorios?.mismoDia?.mensaje || ""}
                  onChange={(e) => {
                    const newMsg = e.target.value;
                    setCitas(prev => (prev || []).map(c => {
                      if (c.id === reminderModalCita.id) {
                        return {
                          ...c,
                          recordatorios: {
                            ...(c.recordatorios || {}),
                            mismoDia: { ...(c.recordatorios?.mismoDia || {}), mensaje: newMsg }
                          }
                        };
                      }
                      return c;
                    }));
                    setReminderModalCita(prev => ({
                      ...prev,
                      recordatorios: {
                        ...(prev.recordatorios || {}),
                        mismoDia: { ...(prev.recordatorios?.mismoDia || {}), mensaje: newMsg }
                      }
                    }));
                  }}
                  style={styles.reminderTextArea}
                />
              </div>

              <div style={styles.modalFooter}>
                <button onClick={() => setReminderModalCita(null)} className="btn btn-primary" style={{ width: "100%" }}>
                  Listo / Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. CLIENT MULTI-VEHICLE SELECTION MODAL */}
      <ClientVehiclesModal 
        isOpen={clientVehiclesModalData.isOpen}
        clienteNombre={clientVehiclesModalData.clienteNombre}
        vehicles={clientVehiclesModalData.vehicles}
        onSelectVehicle={handleVehicleModalSelect}
        onClose={() => setClientVehiclesModalData({ isOpen: false, clienteNombre: "", vehicles: [] })}
      />
    </div>
  );
}

// STYLES
const styles = {
  container: {
    padding: "24px",
    maxWidth: "1400px",
    margin: "0 auto"
  },
  headerCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "var(--bg-card, #1e222d)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "14px",
    padding: "20px 24px",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "16px"
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px"
  },
  iconCircle: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  mainTitle: {
    margin: 0,
    fontSize: "1.35rem",
    fontWeight: "700",
    color: "#fff"
  },
  subTitle: {
    margin: "4px 0 0 0",
    fontSize: "0.85rem",
    color: "#9ca3af"
  },
  headerActions: {
    display: "flex",
    gap: "12px"
  },
  newCitaBtn: {
    padding: "10px 20px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  reminderAlertCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    border: "1px solid rgba(245, 158, 11, 0.35)",
    borderRadius: "12px",
    padding: "14px 20px",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "12px"
  },
  reminderAlertLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px"
  },
  bellPulse: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  alertTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: "700",
    color: "#f59e0b"
  },
  alertSub: {
    margin: "2px 0 0 0",
    fontSize: "0.8rem",
    color: "#d1d5db"
  },
  filterBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "20px",
    flexWrap: "wrap"
  },
  tabGroup: {
    display: "flex",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: "4px",
    borderRadius: "10px",
    gap: "4px"
  },
  tabBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "8px",
    color: "#9ca3af",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  activeTabBtn: {
    backgroundColor: "var(--color-primary, #eab308)",
    color: "#111827",
    fontWeight: "700"
  },
  badgeCount: {
    backgroundColor: "#ef4444",
    color: "#fff",
    fontSize: "0.7rem",
    padding: "2px 6px",
    borderRadius: "10px",
    fontWeight: "700"
  },
  searchFilterControls: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },
  searchWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "8px",
    padding: "6px 12px",
    minWidth: "260px"
  },
  searchInput: {
    background: "transparent",
    border: "none",
    color: "#fff",
    outline: "none",
    width: "100%",
    fontSize: "0.85rem"
  },
  selectFilter: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "8px",
    padding: "6px 12px",
    color: "#fff",
    fontSize: "0.85rem",
    outline: "none",
    cursor: "pointer"
  },
  contentGrid: {
    width: "100%"
  },
  citasListGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: "18px"
  },
  citaCard: {
    backgroundColor: "var(--bg-card, #1e222d)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px"
  },
  cardModuloBadge: {
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "var(--color-primary, #eab308)"
  },
  cardDateBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.78rem",
    color: "#d1d5db",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    padding: "4px 8px",
    borderRadius: "6px"
  },
  todayPill: {
    backgroundColor: "#ef4444",
    color: "#fff",
    fontSize: "0.65rem",
    fontWeight: "800",
    padding: "1px 5px",
    borderRadius: "4px"
  },
  cardBody: {
    flex: 1
  },
  cardClientRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px"
  },
  cardAvatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  cardClientName: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: "700",
    color: "#fff"
  },
  cardClientPhone: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.78rem",
    color: "#9ca3af"
  },
  cardVehicleBox: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    borderRadius: "8px",
    padding: "10px",
    marginBottom: "10px"
  },
  cardVehicleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.82rem",
    color: "#e5e7eb",
    marginBottom: "6px"
  },
  cardVehicleText: {
    lineHeight: "1.2"
  },
  cardServiceRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.82rem",
    color: "#fbbf24"
  },
  cardServiceText: {
    fontWeight: "600"
  },
  cardNotes: {
    fontSize: "0.78rem",
    color: "#9ca3af",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    padding: "6px 8px",
    borderRadius: "6px",
    margin: "0 0 10px 0"
  },
  cardMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.75rem",
    color: "#9ca3af",
    marginBottom: "12px"
  },
  priceEstimateTag: {
    fontWeight: "700",
    color: "#10b981",
    fontSize: "0.8rem"
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
    paddingTop: "12px",
    marginTop: "auto",
    gap: "8px"
  },
  estadoSelect: {
    border: "none",
    borderRadius: "6px",
    padding: "5px 8px",
    fontSize: "0.78rem",
    fontWeight: "700",
    cursor: "pointer",
    outline: "none"
  },
  cardActionBtns: {
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  wspActionBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "rgba(37, 211, 102, 0.15)",
    border: "1px solid rgba(37, 211, 102, 0.35)",
    color: "#25D366",
    fontSize: "0.75rem",
    fontWeight: "700",
    padding: "5px 8px",
    borderRadius: "6px",
    cursor: "pointer"
  },
  dispatchBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.75rem",
    padding: "5px 8px"
  },
  iconBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    border: "none",
    borderRadius: "6px",
    padding: "6px",
    color: "#d1d5db",
    cursor: "pointer"
  },
  emptyCard: {
    padding: "60px 20px",
    textAlign: "center",
    backgroundColor: "var(--bg-card, #1e222d)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },
  remindersTabContainer: {
    width: "100%"
  },
  remindersTabHeader: {
    marginBottom: "16px"
  },
  remindersList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px"
  },
  reminderCardItem: {
    backgroundColor: "var(--bg-card, #1e222d)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "12px",
    padding: "16px"
  },
  reminderCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    flexWrap: "wrap",
    gap: "8px"
  },
  reminderBadgePill: {
    fontSize: "0.7rem",
    fontWeight: "800",
    color: "#fff",
    padding: "3px 8px",
    borderRadius: "6px"
  },
  reminderMessageBox: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "12px"
  },
  reminderMessageText: {
    margin: 0,
    fontSize: "0.85rem",
    color: "#e5e7eb",
    whiteSpace: "pre-wrap",
    lineHeight: "1.4"
  },
  reminderActionsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px"
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "16px"
  },
  modalContent: {
    backgroundColor: "#1e222d",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "640px",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)"
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 24px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
  },
  modalTitle: {
    margin: 0,
    fontSize: "1.15rem",
    fontWeight: "700",
    color: "#fff"
  },
  closeBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#9ca3af",
    cursor: "pointer"
  },
  modalBody: {
    padding: "20px 24px"
  },
  formSectionTitle: {
    fontSize: "0.85rem",
    fontWeight: "700",
    color: "var(--color-primary, #eab308)",
    marginBottom: "10px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
    paddingBottom: "4px"
  },
  formGrid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "12px"
  },
  formGrid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "12px",
    marginBottom: "12px"
  },
  formLabel: {
    display: "block",
    fontSize: "0.78rem",
    color: "#9ca3af",
    marginBottom: "4px",
    fontWeight: "600"
  },
  formInput: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "8px",
    padding: "8px 12px",
    color: "#fff",
    fontSize: "0.85rem",
    outline: "none",
    boxSizing: "border-box"
  },
  suggestionsDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#181b22",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "8px",
    zIndex: 100,
    marginTop: "2px",
    boxShadow: "0 8px 16px rgba(0, 0, 0, 0.5)",
    overflow: "hidden"
  },
  suggestionItem: {
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "0.82rem",
    color: "#fff",
    borderBottom: "1px solid rgba(255, 255, 255, 0.04)"
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    paddingTop: "16px"
  },
  reminderTargetInfo: {
    backgroundColor: "rgba(234, 179, 8, 0.1)",
    border: "1px solid rgba(234, 179, 8, 0.25)",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "0.82rem",
    color: "#d1d5db",
    marginBottom: "16px"
  },
  reminderBlock: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "14px"
  },
  reminderBlockHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px"
  },
  reminderBlockTitle: {
    margin: 0,
    fontSize: "0.88rem",
    fontWeight: "700",
    color: "#fff"
  },
  sendWspSmallBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "#25D366",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "4px 10px",
    fontSize: "0.75rem",
    fontWeight: "700",
    cursor: "pointer"
  },
  reminderTextArea: {
    width: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "6px",
    padding: "8px 10px",
    color: "#fff",
    fontSize: "0.8rem",
    minHeight: "75px",
    resize: "vertical",
    boxSizing: "border-box"
  }
};
