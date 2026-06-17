import React, { useState } from "react";
import { 
  Settings, 
  Coins, 
  Percent, 
  Wrench, 
  Coffee, 
  Car, 
  Save, 
  Calendar, 
  CircleParking,
  Plus,
  Trash2,
  TrendingUp,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Users,
  Edit
} from "lucide-react";
import { formatMoney } from "../utils/storage";
import { getSupabaseClient, resetSupabaseClient, syncKeyToCloud } from "../utils/supabase";

export default function SettingsComponent({
  comisionMecanico,
  setComisionMecanico,
  parkingRate,
  setParkingRate,
  dashboardPeriod,
  setDashboardPeriod,
  carwashPresets,
  setCarwashPresets,
  workshopInventory,
  setWorkshopInventory,
  cafeteriaInventory,
  setCafeteriaInventory,
  carwashInventory,
  setCarwashInventory,
  fixedCosts,
  setFixedCosts,
  ordenes,
  carwash,
  cafeteriaSales,
  carwashConsumption,
  usuarios = [],
  setUsuarios,
  usuarioActual,
  parkingEntries = [],
  parkingHistory = [],
  vehiculosVenta = [],
  tiendaSales = [],
  cuentasPorCobrar = [],
  cuentasPorPagar = [],
  clientes = [],
  setClientes,
  vehiculos = [],
  setVehiculos
}) {
  const [activeTab, setActiveTab] = useState("general");

  // Local state for User Management
  const [uUser, setUUser] = useState("");
  const [uPass, setUPass] = useState("");
  const [uRol, setURol] = useState("mecanico");
  const [uRolCustom, setURolCustom] = useState("");
  const [showCustomRolInput, setShowCustomRolInput] = useState(false);
  const [uPermissions, setUPermissions] = useState(["taller"]);
  const [uSalarioBase, setUSalarioBase] = useState("0");
  const [uComisionTaller, setUComisionTaller] = useState("10");
  const [uComisionCarwash, setUComisionCarwash] = useState("7");
  const [uComisionarLabor, setUComisionarLabor] = useState(true);
  const [uComisionarRepuestos, setUComisionarRepuestos] = useState(false);
  const [uComisionarCarwash, setUComisionarCarwash] = useState(false);
  const [uComisionRepuestos, setUComisionRepuestos] = useState("5");

  // Collaborator specific states
  const [uNombreCompleto, setUNombreCompleto] = useState("");
  const [uDpi, setUDpi] = useState("");
  const [uNit, setUNit] = useState("");
  const [uTelefono, setUTelefono] = useState("");
  const [uDireccion, setUDireccion] = useState("");
  const [uFechaIngreso, setUFechaIngreso] = useState("");
  const [uFechaNacimiento, setUFechaNacimiento] = useState("");

  // Edit User states
  const [editingUser, setEditingUser] = useState(null);
  const [editPass, setEditPass] = useState("");
  const [editRol, setEditRol] = useState("");
  const [editRolCustom, setEditRolCustom] = useState("");
  const [showCustomEditRolInput, setShowCustomEditRolInput] = useState(false);
  const [editPermissions, setEditPermissions] = useState([]);
  const [editSalarioBase, setEditSalarioBase] = useState("");
  const [editComisionTaller, setEditComisionTaller] = useState("");
  const [editComisionCarwash, setEditComisionCarwash] = useState("");
  const [editComisionarLabor, setEditComisionarLabor] = useState(true);
  const [editComisionarRepuestos, setEditComisionarRepuestos] = useState(false);
  const [editComisionarCarwash, setEditComisionarCarwash] = useState(false);
  const [editComisionRepuestos, setEditComisionRepuestos] = useState("5");
  const [editNombreCompleto, setEditNombreCompleto] = useState("");
  const [editDpi, setEditDpi] = useState("");
  const [editNit, setEditNit] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editDireccion, setEditDireccion] = useState("");
  const [editFechaIngreso, setEditFechaIngreso] = useState("");
  const [editFechaNacimiento, setEditFechaNacimiento] = useState("");

  // Local state for General Settings inputs
  const [localComisionMecanico, setLocalComisionMecanico] = useState((comisionMecanico * 100).toString());
  const [localParkingRate, setLocalParkingRate] = useState(parkingRate.toString());
  const [localDashboardPeriod, setLocalDashboardPeriod] = useState(dashboardPeriod);

  // Local state for Cloud Sync Settings
  const [supabaseUrl, setSupabaseUrl] = useState(() => localStorage.getItem("supabase_url") || "");
  const [supabaseKey, setSupabaseKey] = useState(() => localStorage.getItem("supabase_key") || "");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(() => {
    return (localStorage.getItem("supabase_url") && localStorage.getItem("supabase_key")) ? "connected" : "disconnected";
  });

  // Local state for Carwash Presets CRUD
  const [presetTipo, setPresetTipo] = useState("");
  const [presetPrecio, setPresetPrecio] = useState("");
  const [presetComision, setPresetComision] = useState("");

  // Local state for adding Workshop parts
  const [wsCode, setWsCode] = useState("");
  const [wsName, setWsName] = useState("");
  const [wsBrand, setWsBrand] = useState("");
  const [wsPresentation, setWsPresentation] = useState("");
  const [wsQuantity, setWsQuantity] = useState("");
  const [wsPurchasePrice, setWsPurchasePrice] = useState("");
  const [wsSalePrice, setWsSalePrice] = useState("");

  // Local state for adding Cafeteria products
  const [cafName, setCafName] = useState("");
  const [cafPresentation, setCafPresentation] = useState("");
  const [cafQuantity, setCafQuantity] = useState("");
  const [cafPurchasePrice, setCafPurchasePrice] = useState("");
  const [cafSalePrice, setCafSalePrice] = useState("");

  // Local state for adding Carwash supplies
  const [cwName, setCwName] = useState("");
  const [cwPresentation, setCwPresentation] = useState("");
  const [cwQuantity, setCwQuantity] = useState("");
  const [cwPurchasePrice, setCwPurchasePrice] = useState("");

  // Local state for adding Fixed costs
  const [fcName, setFcName] = useState("");
  const [fcAmount, setFcAmount] = useState("");
  const [editingFixedCostId, setEditingFixedCostId] = useState(null);

  // 1. General and Presets saving
  const handleSaveGeneral = (e) => {
    e.preventDefault();
    const com = parseFloat(localComisionMecanico);
    const park = parseFloat(localParkingRate);

    if (isNaN(com) || com < 0 || com > 100) {
      alert("La comisión del taller debe estar entre 0% y 100%");
      return;
    }
    if (isNaN(park) || park < 0) {
      alert("La tarifa de parqueo debe ser un número positivo");
      return;
    }

    setComisionMecanico(com / 100);
    setParkingRate(park);
    setDashboardPeriod(localDashboardPeriod);
    alert("Parámetros globales actualizados correctamente.");
  };

  // Add a new Carwash preset
  const handleAddPreset = (e) => {
    e.preventDefault();
    if (!presetTipo.trim() || !presetPrecio || !presetComision) {
      alert("Completa todos los campos del nuevo servicio.");
      return;
    }
    const price = parseFloat(presetPrecio);
    const com = parseFloat(presetComision);
    if (isNaN(price) || price < 0 || isNaN(com) || com < 0) {
      alert("Precio y comisión deben ser números positivos.");
      return;
    }

    const exists = carwashPresets.some(p => p.tipo.toLowerCase().trim() === presetTipo.toLowerCase().trim());
    if (exists) {
      alert("Ya existe un servicio con este nombre.");
      return;
    }

    setCarwashPresets([...carwashPresets, { tipo: presetTipo.trim(), precio: price, comision: com }]);
    setPresetTipo("");
    setPresetPrecio("");
    setPresetComision("");
    alert("Nuevo servicio de carwash agregado.");
  };

  // Remove a Carwash preset
  const handleRemovePreset = (tipo) => {
    if (window.confirm(`¿Seguro que deseas eliminar el servicio "${tipo}"?`)) {
      setCarwashPresets(carwashPresets.filter(p => p.tipo !== tipo));
    }
  };

  // 2. Add Workshop Part
  const handleAddWorkshopItem = (e) => {
    e.preventDefault();
    if (!wsCode.trim() || !wsName.trim() || !wsQuantity || !wsPurchasePrice || !wsSalePrice) {
      alert("Completa todos los campos obligatorios del repuesto.");
      return;
    }
    const qty = parseInt(wsQuantity);
    const cost = parseFloat(wsPurchasePrice);
    const sale = parseFloat(wsSalePrice);

    if (isNaN(qty) || qty < 0 || isNaN(cost) || cost < 0 || isNaN(sale) || sale < 0) {
      alert("Valores numéricos inválidos.");
      return;
    }

    const exists = workshopInventory.some(item => item.code.toUpperCase().trim() === wsCode.toUpperCase().trim());
    if (exists) {
      alert("Ya existe un repuesto con ese código en bodega.");
      return;
    }

    const nuevo = {
      id: Date.now(),
      code: wsCode.toUpperCase().trim(),
      name: wsName.trim(),
      brand: wsBrand.trim(),
      presentation: wsPresentation.trim(),
      quantity: qty,
      purchasePrice: cost,
      salePrice: sale
    };

    setWorkshopInventory([nuevo, ...workshopInventory]);
    setWsCode("");
    setWsName("");
    setWsBrand("");
    setWsPresentation("");
    setWsQuantity("");
    setWsPurchasePrice("");
    setWsSalePrice("");
    alert("Repuesto registrado en bodega.");
  };

  const handleRemoveWorkshopItem = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este repuesto de la bodega?")) {
      setWorkshopInventory(workshopInventory.filter(item => item.id !== id));
    }
  };

  // 3. Add Cafeteria Product
  const handleAddCafeteriaItem = (e) => {
    e.preventDefault();
    if (!cafName.trim() || !cafQuantity || !cafPurchasePrice || !cafSalePrice) {
      alert("Completa todos los campos obligatorios.");
      return;
    }
    const qty = parseInt(cafQuantity);
    const cost = parseFloat(cafPurchasePrice);
    const sale = parseFloat(cafSalePrice);

    if (isNaN(qty) || qty < 0 || isNaN(cost) || cost < 0 || isNaN(sale) || sale < 0) {
      alert("Valores numéricos inválidos.");
      return;
    }

    const exists = cafeteriaInventory.some(item => item.name.toLowerCase().trim() === cafName.toLowerCase().trim());
    if (exists) {
      alert("Ya existe un producto con este nombre.");
      return;
    }

    const nuevo = {
      id: Date.now(),
      name: cafName.trim(),
      presentation: cafPresentation.trim(),
      quantity: qty,
      purchasePrice: cost,
      salePrice: sale
    };

    setCafeteriaInventory([nuevo, ...cafeteriaInventory]);
    setCafName("");
    setCafPresentation("");
    setCafQuantity("");
    setCafPurchasePrice("");
    setCafSalePrice("");
    alert("Producto registrado en cafetería.");
  };

  const handleRemoveCafeteriaItem = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este producto de la cafetería?")) {
      setCafeteriaInventory(cafeteriaInventory.filter(item => item.id !== id));
    }
  };

  // 4. Add Carwash supply
  const handleAddCarwashSupply = (e) => {
    e.preventDefault();
    if (!cwName.trim() || !cwQuantity || !cwPurchasePrice) {
      alert("Completa los campos obligatorios.");
      return;
    }
    const qty = parseInt(cwQuantity);
    const cost = parseFloat(cwPurchasePrice);

    if (isNaN(qty) || qty < 0 || isNaN(cost) || cost < 0) {
      alert("Valores numéricos inválidos.");
      return;
    }

    const exists = carwashInventory.some(item => item.name.toLowerCase().trim() === cwName.toLowerCase().trim());
    if (exists) {
      alert("Ya existe un insumo con este nombre.");
      return;
    }

    const nuevo = {
      id: Date.now(),
      name: cwName.trim(),
      presentation: cwPresentation.trim(),
      quantity: qty,
      purchasePrice: cost
    };

    setCarwashInventory([nuevo, ...carwashInventory]);
    setCwName("");
    setCwPresentation("");
    setCwQuantity("");
    setCwPurchasePrice("");
    alert("Insumo de carwash registrado.");
  };

  const handleRemoveCarwashSupply = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este insumo de carwash?")) {
      setCarwashInventory(carwashInventory.filter(item => item.id !== id));
    }
  };

  // 5. Add / Edit Fixed Cost
  const handleAddFixedCost = (e) => {
    e.preventDefault();
    if (!fcName.trim() || !fcAmount) {
      alert("Completa los campos obligatorios.");
      return;
    }
    const amt = parseFloat(fcAmount);
    if (isNaN(amt) || amt < 0) {
      alert("Monto inválido.");
      return;
    }

    if (editingFixedCostId) {
      // Edit
      setFixedCosts(
        fixedCosts.map(item =>
          item.id === editingFixedCostId
            ? { ...item, name: fcName.trim(), amount: amt }
            : item
        )
      );
      setEditingFixedCostId(null);
      alert("Costo fijo actualizado.");
    } else {
      // Add
      const nuevo = {
        id: Date.now(),
        name: fcName.trim(),
        amount: amt
      };
      setFixedCosts([...fixedCosts, nuevo]);
      alert("Costo fijo registrado.");
    }

    setFcName("");
    setFcAmount("");
  };

  const iniciarEdicionFixedCost = (cost) => {
    setEditingFixedCostId(cost.id);
    setFcName(cost.name);
    setFcAmount(cost.amount.toString());
  };

  const cancelarEdicionFixedCost = () => {
    setEditingFixedCostId(null);
    setFcName("");
    setFcAmount("");
  };

  const handleRemoveFixedCost = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este costo fijo?")) {
      setFixedCosts(fixedCosts.filter(item => item.id !== id));
      if (editingFixedCostId === id) {
        cancelarEdicionFixedCost();
      }
    }
  };

  // Helper to get default permissions based on role
  const getDefaultPermissionsForRole = (role) => {
    switch (role) {
      case "admin":
        return ["dashboard", "taller", "carwash", "parqueo", "bodega", "cafeteria", "finanzas", "repuestosFaltantes", "configuracion", "historial", "tienda", "cuentas"];
      case "cajero":
        return ["dashboard", "taller", "carwash", "parqueo", "bodega", "cafeteria", "finanzas", "configuracion", "historial", "tienda", "cuentas"];
      case "mecanico":
        return ["taller", "historial"];
      case "lavador":
        return ["carwash"];
      case "jefe de taller":
        return ["dashboard", "taller", "repuestosFaltantes", "historial"];
      default:
        return [];
    }
  };

  // Handler for role changes (auto-update permissions checkboxes)
  const handleRoleChange = (role) => {
    setURol(role);
    setUPermissions(getDefaultPermissionsForRole(role));
    setShowCustomRolInput(role === "custom");
    if (role !== "custom") {
      setURolCustom("");
    }
  };

  // Add a new user
  const handleAddUser = (e) => {
    e.preventDefault();
    if (!uUser.trim() || !uPass.trim()) {
      alert("Por favor ingresa usuario y contraseña.");
      return;
    }

    const finalRole = uRol === "custom" ? uRolCustom.trim().toLowerCase() : uRol;
    if (!finalRole) {
      alert("Por favor ingresa el nombre del rol personalizado.");
      return;
    }

    const usernameClean = uUser.toLowerCase().trim();
    const exists = usuarios.some(u => u.user.toLowerCase().trim() === usernameClean);
    if (exists) {
      alert("Ya existe un usuario con este nombre.");
      return;
    }

    const nuevoUsuario = {
      user: usernameClean,
      pass: uPass.trim(),
      rol: finalRole,
      permissions: uPermissions,
      salarioBase: parseFloat(uSalarioBase) || 0,
      comisionTaller: parseFloat(uComisionTaller) || 0,
      comisionCarwash: parseFloat(uComisionCarwash) || 0,
      comisionRepuestos: parseFloat(uComisionRepuestos) || 0,
      comisionarLabor: uComisionarLabor,
      comisionarRepuestos: uComisionarRepuestos,
      comisionarCarwash: uComisionarCarwash,
      nombreCompleto: uNombreCompleto.trim(),
      dpi: uDpi.trim(),
      nit: uNit.trim(),
      telefono: uTelefono.trim(),
      direccion: uDireccion.trim(),
      fechaIngreso: uFechaIngreso,
      fechaNacimiento: uFechaNacimiento
    };

    setUsuarios([...usuarios, nuevoUsuario]);
    setUUser("");
    setUPass("");
    setURol("mecanico");
    setURolCustom("");
    setShowCustomRolInput(false);
    setUPermissions(["taller", "historial"]);
    setUSalarioBase("0");
    setUComisionTaller("10");
    setUComisionCarwash("7");
    setUComisionarLabor(true);
    setUComisionarRepuestos(false);
    setUComisionarCarwash(false);
    setUComisionRepuestos("5");
    setUNombreCompleto("");
    setUDpi("");
    setUNit("");
    setUTelefono("");
    setUDireccion("");
    setUFechaIngreso("");
    setUFechaNacimiento("");
    alert(`Usuario "${usernameClean}" registrado con éxito.`);
  };

  // Edit User handlers
  const handleEditUserClick = (userObj) => {
    setEditingUser(userObj);
    setEditPass(userObj.pass || "");
    
    const predefinedRoles = ["admin", "cajero", "mecanico", "lavador", "jefe de taller"];
    const isPredefined = predefinedRoles.includes(userObj.rol);
    
    if (isPredefined) {
      setEditRol(userObj.rol);
      setEditRolCustom("");
      setShowCustomEditRolInput(false);
    } else {
      setEditRol("custom");
      setEditRolCustom(userObj.rol || "");
      setShowCustomEditRolInput(true);
    }

    setEditPermissions(userObj.permissions || []);
    setEditSalarioBase((userObj.salarioBase || 0).toString());
    setEditComisionTaller((userObj.comisionTaller || 0).toString());
    setEditComisionCarwash((userObj.comisionCarwash || 0).toString());
    setEditComisionRepuestos((userObj.comisionRepuestos || 0).toString());
    setEditComisionarLabor(userObj.comisionarLabor !== undefined ? userObj.comisionarLabor : true);
    setEditComisionarRepuestos(userObj.comisionarRepuestos !== undefined ? userObj.comisionarRepuestos : false);
    setEditComisionarCarwash(userObj.comisionarCarwash !== undefined ? userObj.comisionarCarwash : false);
    setEditNombreCompleto(userObj.nombreCompleto || "");
    setEditDpi(userObj.dpi || "");
    setEditNit(userObj.nit || "");
    setEditTelefono(userObj.telefono || "");
    setEditDireccion(userObj.direccion || "");
    setEditFechaIngreso(userObj.fechaIngreso || "");
    setEditFechaNacimiento(userObj.fechaNacimiento || "");
  };

  const handleSaveEditUser = (e) => {
    e.preventDefault();
    const finalRole = editRol === "custom" ? editRolCustom.trim().toLowerCase() : editRol;
    if (!finalRole) {
      alert("Por favor ingresa el nombre del rol personalizado.");
      return;
    }
    setUsuarios(
      usuarios.map((u) => {
        if (u.user.toLowerCase().trim() === editingUser.user.toLowerCase().trim()) {
          return {
            ...u,
            pass: editPass.trim(),
            rol: finalRole,
            permissions: editPermissions,
            salarioBase: parseFloat(editSalarioBase) || 0,
            comisionTaller: parseFloat(editComisionTaller) || 0,
            comisionCarwash: parseFloat(editComisionCarwash) || 0,
            comisionRepuestos: parseFloat(editComisionRepuestos) || 0,
            comisionarLabor: editComisionarLabor,
            comisionarRepuestos: editComisionarRepuestos,
            comisionarCarwash: editComisionarCarwash,
            nombreCompleto: editNombreCompleto.trim(),
            dpi: editDpi.trim(),
            nit: editNit.trim(),
            telefono: editTelefono.trim(),
            direccion: editDireccion.trim(),
            fechaIngreso: editFechaIngreso,
            fechaNacimiento: editFechaNacimiento
          };
        }
        return u;
      })
    );
    setEditingUser(null);
    setEditRolCustom("");
    setShowCustomEditRolInput(false);
    alert("Usuario modificado con éxito.");
  };

  // Remove a user
  const handleRemoveUser = (username) => {
    if (username.toLowerCase().trim() === usuarioActual?.user?.toLowerCase()?.trim()) {
      alert("No puedes eliminar tu propio usuario actual con el que tienes sesión iniciada.");
      return;
    }
    if (username.toLowerCase().trim() === "admin") {
      alert("El usuario administrador principal ('admin') no se puede eliminar por motivos de seguridad.");
      return;
    }

    if (window.confirm(`¿Seguro que deseas eliminar al usuario "${username}"?`)) {
      setUsuarios(usuarios.filter(u => u.user.toLowerCase().trim() !== username.toLowerCase().trim()));
    }
  };

  // Toggle individual permissions checkbox
  const handlePermissionToggle = (permId) => {
    if (uPermissions.includes(permId)) {
      setUPermissions(uPermissions.filter(p => p !== permId));
    } else {
      setUPermissions([...uPermissions, permId]);
    }
  };

  // --- CLOUD SYNC HANDLERS ---
  const handleConnectCloud = async (e) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      alert("Por favor ingresa la URL y la Anon Key de tu proyecto de Supabase.");
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus("testing");

    // Temporarily save to local storage to initialize the client test
    localStorage.setItem("supabase_url", supabaseUrl.trim());
    localStorage.setItem("supabase_key", supabaseKey.trim());
    resetSupabaseClient();

    const client = getSupabaseClient();
    if (!client) {
      alert("No se pudo inicializar el cliente de Supabase. Revisa las credenciales.");
      localStorage.removeItem("supabase_url");
      localStorage.removeItem("supabase_key");
      resetSupabaseClient();
      setConnectionStatus("disconnected");
      setIsTestingConnection(false);
      return;
    }

    try {
      // Attempt a test query
      const { error } = await client.from('app_data').select('*').limit(1);
      if (error) throw error;

      setConnectionStatus("connected");
      alert("¡Conexión establecida con éxito con Supabase! La página se recargará para iniciar la sincronización.");
      window.location.reload();
    } catch (err) {
      console.error("Supabase test error:", err);
      alert("Error de conexión: No se pudo acceder a la tabla 'app_data'. Asegúrate de haber ejecutado el script SQL en la consola de Supabase o que las credenciales sean correctas.\n\nDetalle: " + err.message);
      localStorage.removeItem("supabase_url");
      localStorage.removeItem("supabase_key");
      resetSupabaseClient();
      setConnectionStatus("disconnected");
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleDisconnectCloud = () => {
    if (window.confirm("¿Seguro que deseas desactivar la sincronización en la nube? Volverás a usar únicamente el almacenamiento local de este dispositivo.")) {
      localStorage.removeItem("supabase_url");
      localStorage.removeItem("supabase_key");
      resetSupabaseClient();
      setSupabaseUrl("");
      setSupabaseKey("");
      setConnectionStatus("disconnected");
      alert("Sincronización en la nube desactivada. La página se recargará.");
      window.location.reload();
    }
  };

  const handleUploadLocalDataToCloud = async () => {
    const client = getSupabaseClient();
    if (!client) {
      alert("Primero debes conectar y guardar las credenciales de Supabase.");
      return;
    }

    if (window.confirm("¿Seguro que deseas subir todos los datos de este equipo a la nube? Esto sobrescribirá cualquier dato existente en la base de datos de Supabase.")) {
      setIsUploadingToCloud(true);
      try {
        const collections = {
          usuarios: usuarios,
          ordenes: ordenes,
          carwash: carwash,
          parkingEntries: parkingEntries,
          parkingRate: parkingRate,
          parkingHistory: parkingHistory,
          vehiculosVenta: vehiculosVenta,
          workshopInventory: workshopInventory,
          cafeteriaInventory: cafeteriaInventory,
          cafeteriaSales: cafeteriaSales,
          comisionMecanico: comisionMecanico,
          dashboardPeriod: dashboardPeriod,
          carwashPresets: carwashPresets,
          carwashInventory: carwashInventory,
          carwashConsumption: carwashConsumption,
          fixedCosts: fixedCosts,
          tiendaSales: tiendaSales,
          cuentasPorCobrar: cuentasPorCobrar,
          cuentasPorPagar: cuentasPorPagar,
          clientes: clientes,
          vehiculos: vehiculos,
        };

        for (const [key, value] of Object.entries(collections)) {
          await syncKeyToCloud(key, value);
        }

        alert("¡Todos tus datos locales se subieron con éxito a la nube! Los demás dispositivos ya pueden conectarse y verlos en tiempo real.");
      } catch (err) {
         console.error("Error uploading to cloud:", err);
         alert("Ocurrió un error al subir los datos: " + err.message);
      } finally {
        setIsUploadingToCloud(false);
      }
    }
  };

  // Quick Price edits
  const handleWorkshopPriceChange = (id, field, value) => {
    const val = parseFloat(value) || 0;
    setWorkshopInventory(
      workshopInventory.map((item) =>
        item.id === id ? { ...item, [field]: val } : item
      )
    );
  };

  const handleCafeteriaPriceChange = (id, field, value) => {
    const val = parseFloat(value) || 0;
    setCafeteriaInventory(
      cafeteriaInventory.map((item) =>
        item.id === id ? { ...item, [field]: val } : item
      )
    );
  };

  const handleCarwashPriceChange = (id, field, value) => {
    const val = parseFloat(value) || 0;
    setCarwashInventory(
      carwashInventory.map((item) =>
        item.id === id ? { ...item, [field]: val } : item
      )
    );
  };

  // --- FINANCIAL BREAK-EVEN CALCULATIONS ---
  const totalSalaries = (usuarios || []).reduce((sum, u) => sum + (parseFloat(u.salarioBase) || 0), 0);
  const totalFixedCosts = (fixedCosts || []).reduce((sum, item) => sum + item.amount, 0) + totalSalaries;

  // Delivered workshop orders sales & variable costs
  const deliveredOrders = (ordenes || []).filter(o => o.estado === "Entregado");
  const wsSalesRevenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
  const wsCommissions = deliveredOrders.reduce((sum, o) => sum + o.comision, 0);
  const wsPartsCost = deliveredOrders.reduce((sum, o) => 
    sum + (o.presupuesto?.parts || []).reduce((sub, p) => sub + (p.qty * (p.purchasePrice || 0)), 0)
  , 0);

  // Delivered carwash sales & variable costs
  const deliveredCarwash = (carwash || []).filter(c => c.estado === "Entregado");
  const cwSalesRevenue = deliveredCarwash.reduce((sum, c) => sum + c.precio, 0);
  const cwCommissions = deliveredCarwash.reduce((sum, c) => sum + c.comision, 0);
  const cwSuppliesCost = (carwashConsumption || []).reduce((sum, c) => sum + c.cost, 0);

  // Cafeteria sales & variable costs
  const cafSalesRevenue = (cafeteriaSales || []).reduce((sum, s) => sum + s.total, 0);
  const cafItemsCost = (cafeteriaSales || []).reduce((sum, s) => 
    sum + (s.items || []).reduce((sub, item) => sub + (item.qty * (item.purchasePrice || 0)), 0)
  , 0);

  // Totals
  const totalSalesRevenue = wsSalesRevenue + cwSalesRevenue + cafSalesRevenue;
  const totalVariableCosts = wsCommissions + wsPartsCost + cwCommissions + cwSuppliesCost + cafItemsCost;

  // Margin ratio (gross contribution)
  const marginRatio = totalSalesRevenue > 0 ? (totalSalesRevenue - totalVariableCosts) / totalSalesRevenue : 0.65;
  const breakEvenPoint = marginRatio > 0 ? totalFixedCosts / marginRatio : 0;
  const isBreakEvenMet = totalSalesRevenue >= breakEvenPoint;
  const progressPercent = breakEvenPoint > 0 ? Math.min((totalSalesRevenue / breakEvenPoint) * 100, 100) : 0;

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Configuración del Sistema</h1>
          <p>Administra tarifas, comisiones, catálogos de bodega, costos fijos y analiza el punto de equilibrio.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.subTabs}>
        <button 
          onClick={() => setActiveTab("general")}
          style={{ ...styles.subTabBtn, ...(activeTab === "general" ? styles.subTabActive : {}) }}
        >
          <Settings size={16} /> Tarifas y Comisión General
        </button>
        <button 
          onClick={() => setActiveTab("workshop")}
          style={{ ...styles.subTabBtn, ...(activeTab === "workshop" ? styles.subTabActive : {}) }}
        >
          <Wrench size={16} /> Bodega Taller
        </button>
        <button 
          onClick={() => setActiveTab("cafeteria")}
          style={{ ...styles.subTabBtn, ...(activeTab === "cafeteria" ? styles.subTabActive : {}) }}
        >
          <Coffee size={16} /> Bodega Cafetería
        </button>
        <button 
          onClick={() => setActiveTab("carwash")}
          style={{ ...styles.subTabBtn, ...(activeTab === "carwash" ? styles.subTabActive : {}) }}
        >
          <Car size={16} /> Bodega Carwash
        </button>
        <button 
          onClick={() => setActiveTab("fixedCosts")}
          style={{ ...styles.subTabBtn, ...(activeTab === "fixedCosts" ? styles.subTabActive : {}) }}
        >
          <TrendingUp size={16} /> Costos Fijos & Punto de Equilibrio
        </button>
        <button 
          onClick={() => setActiveTab("usuarios")}
          style={{ ...styles.subTabBtn, ...(activeTab === "usuarios" ? styles.subTabActive : {}) }}
        >
          <Users size={16} /> Gestión de Usuarios
        </button>
        <button 
          onClick={() => setActiveTab("cloud")}
          style={{ ...styles.subTabBtn, ...(activeTab === "cloud" ? styles.subTabActive : {}) }}
        >
          ☁️ Sincronización en la Nube
        </button>
      </div>

      {/* Content Area */}
      <div style={{ width: "100%" }}>
        
        {/* Tab 1: General Settings & Presets CRUD */}
        {activeTab === "general" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
            <form onSubmit={handleSaveGeneral} className="glass-panel" style={styles.formCard}>
              <h3 style={styles.sectionTitle}>Ajustes de Parámetros Globales</h3>
              <p style={styles.sectionSubtitle}>Define comisiones fijas, periodos y cobros por hora.</p>
              
              <div style={styles.formGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    <Percent size={14} style={{ marginRight: "6px" }} />
                    Comisión Mecánicos Taller (%) *
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={localComisionMecanico}
                    onChange={(e) => setLocalComisionMecanico(e.target.value)}
                    min="0"
                    max="100"
                    step="any"
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    <CircleParking size={14} style={{ marginRight: "6px" }} />
                    Tarifa de Parqueo por Hora (Q) *
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={localParkingRate}
                    onChange={(e) => setLocalParkingRate(e.target.value)}
                    min="0"
                    step="any"
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    <Calendar size={14} style={{ marginRight: "6px" }} />
                    Periodo por Defecto Caja en Dashboard
                  </label>
                  <select
                    className="input-field"
                    value={localDashboardPeriod}
                    onChange={(e) => setLocalDashboardPeriod(e.target.value)}
                    style={styles.select}
                  >
                    <option value="dia">Día (Últimas 24 Horas)</option>
                    <option value="semana">Semana (Últimos 7 Días)</option>
                    <option value="quincena">Quincena (Últimos 15 Días)</option>
                    <option value="mes">Mes (Últimos 30 Días)</option>
                    <option value="trimestre">Trimestre (Últimos 90 Días)</option>
                    <option value="semestre">Semestre (Últimos 180 Días)</option>
                    <option value="ano">Año (Últimos 365 Días)</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ ...styles.saveBtn, marginTop: "20px" }}>
                <Save size={18} /> Guardar Parámetros
              </button>
            </form>

            {/* Database Reset Section */}
            <div className="glass-panel" style={{ padding: "24px", borderRadius: "16px", border: "1px solid rgba(239, 68, 68, 0.25)", display: "flex", flexDirection: "column", gap: "12px", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={20} color="#f87171" />
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#f87171", margin: 0 }}>Puesta en Marcha / Limpieza de Datos</h3>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0" }}>
                Utiliza esta sección para eliminar todos los registros de prueba antes de comenzar el uso real del sistema. 
                Se borrarán todas las órdenes de taller, lavados, parqueos, ventas, cuentas e historial. <strong>Los usuarios registrados e inventario de bodega se conservarán.</strong>
              </p>
              <div>
                <button 
                  type="button" 
                  onClick={() => {
                    if (window.confirm("¿Seguro que deseas eliminar todos los registros de prueba? Se borrarán órdenes de taller, lavados, parqueos, ventas de tienda/cafetería, cuentas y vehículos en venta. Esta acción es definitiva.")) {
                      localStorage.removeItem("ordenes");
                      localStorage.removeItem("carwash");
                      localStorage.removeItem("parkingEntries");
                      localStorage.removeItem("parkingHistory");
                      localStorage.removeItem("vehiculosVenta");
                      localStorage.removeItem("cafeteriaSales");
                      localStorage.removeItem("tiendaSales");
                      localStorage.removeItem("cuentasPorCobrar");
                      localStorage.removeItem("cuentasPorPagar");
                      localStorage.removeItem("clientes");
                      localStorage.removeItem("vehiculos");
                      alert("Datos de prueba eliminados. La aplicación se recargará ahora.");
                      window.location.reload();
                    }
                  }}
                  className="btn" 
                  style={{ backgroundColor: "#dc2626", borderColor: "#dc2626", color: "#fff", display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", fontWeight: "700", width: "fit-content" }}
                >
                  🗑️ Limpiar Base de Datos de Prueba
                </button>
              </div>
            </div>

            {/* Presets CRUD */}
            <div style={styles.managerGrid}>
              {/* Add Preset Form */}
              <div className="glass-panel" style={styles.formCard}>
                <div style={styles.formHeader}>
                  <Plus size={20} color="var(--color-secondary)" />
                  <h3 style={styles.formTitle}>Agregar Nuevo Servicio Carwash</h3>
                </div>
                <form onSubmit={handleAddPreset} style={styles.form}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Nombre/Tipo de Servicio *</label>
                    <input
                      placeholder="Ej. Pulido de Faros, Lavado Motor"
                      className="input-field"
                      value={presetTipo}
                      onChange={(e) => setPresetTipo(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Precio Venta (Q) *</label>
                      <input
                        type="number"
                        placeholder="150"
                        className="input-field"
                        value={presetPrecio}
                        onChange={(e) => setPresetPrecio(e.target.value)}
                        min="0"
                        step="any"
                        required
                      />
                    </div>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Comisión Lavador (Q) *</label>
                      <input
                        type="number"
                        placeholder="25"
                        className="input-field"
                        value={presetComision}
                        onChange={(e) => setPresetComision(e.target.value)}
                        min="0"
                        step="any"
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-secondary" style={{ marginTop: "10px" }}>
                    <Plus size={16} /> Registrar Servicio
                  </button>
                </form>
              </div>

              {/* Presets List */}
              <div className="glass-panel" style={{ padding: "24px" }}>
                <h3 style={styles.sectionTitle}>Servicios de Carwash Registrados</h3>
                <p style={styles.sectionSubtitle}>Listado de tarifas cargadas en el módulo de Carwash.</p>
                
                <div style={styles.tableResponsive}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Tipo/Servicio</th>
                        <th style={styles.th}>Precio Venta</th>
                        <th style={styles.th}>Comisión Fija</th>
                        <th style={styles.th} style={{ textAlign: "right" }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carwashPresets.map((preset, index) => (
                        <tr key={index} style={styles.tr}>
                          <td style={{ ...styles.td, fontWeight: "bold", color: "#fff" }}>{preset.tipo}</td>
                          <td style={styles.td}>{formatMoney(preset.precio)}</td>
                          <td style={styles.td}>{formatMoney(preset.comision)}</td>
                          <td style={{ ...styles.td, textAlign: "right" }}>
                            <button
                              onClick={() => handleRemovePreset(preset.tipo)}
                              style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer" }}
                              title="Eliminar Servicio"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Workshop Inventory (Add & Edit & Delete) */}
        {activeTab === "workshop" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
            <div style={styles.managerGrid}>
              {/* Form to Add Item */}
              <div className="glass-panel" style={styles.formCard}>
                <div style={styles.formHeader}>
                  <Plus size={20} color="var(--color-primary)" />
                  <h3 style={styles.formTitle}>Registrar Nuevo Repuesto</h3>
                </div>
                <form onSubmit={handleAddWorkshopItem} style={styles.form}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Código *</label>
                      <input
                        placeholder="Ej. PA-02"
                        className="input-field"
                        value={wsCode}
                        onChange={(e) => setWsCode(e.target.value)}
                        style={{ textTransform: "uppercase" }}
                        required
                      />
                    </div>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Marca</label>
                      <input
                        placeholder="Ej. Bosch"
                        className="input-field"
                        value={wsBrand}
                        onChange={(e) => setWsBrand(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ ...styles.inputGroup, flex: 2 }}>
                      <label style={styles.label}>Descripción *</label>
                      <input
                        placeholder="Nombre del Repuesto / Insumo"
                        className="input-field"
                        value={wsName}
                        onChange={(e) => setWsName(e.target.value)}
                        required
                      />
                    </div>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Presentación</label>
                      <input
                        placeholder="Juego, Galón"
                        className="input-field"
                        value={wsPresentation}
                        onChange={(e) => setWsPresentation(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Stock *</label>
                      <input
                        type="number"
                        placeholder="Stock inicial"
                        className="input-field"
                        value={wsQuantity}
                        onChange={(e) => setWsQuantity(e.target.value)}
                        min="0"
                        required
                      />
                    </div>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Precio Compra *</label>
                      <input
                        type="number"
                        placeholder="Costo Q"
                        className="input-field"
                        value={wsPurchasePrice}
                        onChange={(e) => setWsPurchasePrice(e.target.value)}
                        min="0"
                        step="any"
                        required
                      />
                    </div>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Precio Venta *</label>
                      <input
                        type="number"
                        placeholder="Venta Q"
                        className="input-field"
                        value={wsSalePrice}
                        onChange={(e) => setWsSalePrice(e.target.value)}
                        min="0"
                        step="any"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ marginTop: "10px" }}>
                    <Plus size={16} /> Registrar Repuesto
                  </button>
                </form>
              </div>

              {/* Table of items with quick price edits and delete buttons */}
              <div className="glass-panel" style={{ padding: "24px" }}>
                <h3 style={styles.sectionTitle}>Edición de Precios y Catálogo Bodega</h3>
                <p style={styles.sectionSubtitle}>Modifica los precios directamente en la tabla o elimina ítems.</p>
                
                {workshopInventory.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No hay repuestos registrados en bodega.</p>
                ) : (
                  <div style={styles.tableResponsive}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Código</th>
                          <th style={styles.th}>Descripción</th>
                          <th style={styles.th}>P. Compra (Q)</th>
                          <th style={styles.th}>P. Venta (Q)</th>
                          <th style={styles.th} style={{ textAlign: "right" }}>Eliminar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workshopInventory.map((item) => (
                          <tr key={item.id} style={styles.tr}>
                            <td style={{ ...styles.td, fontWeight: "bold", color: "var(--color-primary)" }}>{item.code}</td>
                            <td style={styles.td}>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ color: "#fff", fontWeight: "600" }}>{item.name}</span>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                  {item.brand ? `🏷️ ${item.brand}` : ""} {item.presentation ? `• 📦 ${item.presentation}` : ""} • Stock: {item.quantity}
                                </span>
                              </div>
                            </td>
                            <td style={styles.td}>
                              <input
                                type="number"
                                className="input-field"
                                style={styles.tableInput}
                                value={item.purchasePrice}
                                onChange={(e) => handleWorkshopPriceChange(item.id, "purchasePrice", e.target.value)}
                                min="0"
                                step="any"
                              />
                            </td>
                            <td style={styles.td}>
                              <input
                                type="number"
                                className="input-field"
                                style={styles.tableInput}
                                value={item.salePrice}
                                onChange={(e) => handleWorkshopPriceChange(item.id, "salePrice", e.target.value)}
                                min="0"
                                step="any"
                              />
                            </td>
                            <td style={{ ...styles.td, textAlign: "right" }}>
                              <button
                                onClick={() => handleRemoveWorkshopItem(item.id)}
                                style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer" }}
                                title="Eliminar Ítem"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Cafeteria Inventory (Add & Edit & Delete) */}
        {activeTab === "cafeteria" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
            <div style={styles.managerGrid}>
              {/* Form to Add Item */}
              <div className="glass-panel" style={styles.formCard}>
                <div style={styles.formHeader}>
                  <Plus size={20} color="var(--color-secondary)" />
                  <h3 style={styles.formTitle}>Registrar Producto Cafetería</h3>
                </div>
                <form onSubmit={handleAddCafeteriaItem} style={styles.form}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ ...styles.inputGroup, flex: 2 }}>
                      <label style={styles.label}>Nombre del Producto *</label>
                      <input
                        placeholder="Ej. Coca Cola, Sandwich"
                        className="input-field"
                        value={cafName}
                        onChange={(e) => setCafName(e.target.value)}
                        required
                      />
                    </div>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Presentación</label>
                      <input
                        placeholder="Ej. 350ml, Unidad"
                        className="input-field"
                        value={cafPresentation}
                        onChange={(e) => setCafPresentation(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Stock *</label>
                      <input
                        type="number"
                        placeholder="Cantidad"
                        className="input-field"
                        value={cafQuantity}
                        onChange={(e) => setCafQuantity(e.target.value)}
                        min="0"
                        required
                      />
                    </div>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Precio Compra *</label>
                      <input
                        type="number"
                        placeholder="Costo Q"
                        className="input-field"
                        value={cafPurchasePrice}
                        onChange={(e) => setCafPurchasePrice(e.target.value)}
                        min="0"
                        step="any"
                        required
                      />
                    </div>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Precio Venta *</label>
                      <input
                        type="number"
                        placeholder="Venta Q"
                        className="input-field"
                        value={cafSalePrice}
                        onChange={(e) => setCafSalePrice(e.target.value)}
                        min="0"
                        step="any"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-secondary" style={{ marginTop: "10px" }}>
                    <Plus size={16} /> Registrar Producto
                  </button>
                </form>
              </div>

              {/* List and Quick Price edits and Delete */}
              <div className="glass-panel" style={{ padding: "24px" }}>
                <h3 style={styles.sectionTitle}>Edición de Catálogo Cafetería</h3>
                <p style={styles.sectionSubtitle}>Modifica precios o elimina productos del inventario de cafetería.</p>
                
                {cafeteriaInventory.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No hay productos registrados en cafetería.</p>
                ) : (
                  <div style={styles.tableResponsive}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Producto</th>
                          <th style={styles.th}>Presentación</th>
                          <th style={styles.th}>P. Compra (Q)</th>
                          <th style={styles.th}>P. Venta (Q)</th>
                          <th style={styles.th} style={{ textAlign: "right" }}>Eliminar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cafeteriaInventory.map((item) => (
                          <tr key={item.id} style={styles.tr}>
                            <td style={{ ...styles.td, fontWeight: "bold", color: "#fff" }}>{item.name}</td>
                            <td style={styles.td}>{item.presentation || "-"}</td>
                            <td style={styles.td}>
                              <input
                                type="number"
                                className="input-field"
                                style={styles.tableInput}
                                value={item.purchasePrice}
                                onChange={(e) => handleCafeteriaPriceChange(item.id, "purchasePrice", e.target.value)}
                                min="0"
                                step="any"
                              />
                            </td>
                            <td style={styles.td}>
                              <input
                                type="number"
                                className="input-field"
                                style={styles.tableInput}
                                value={item.salePrice}
                                onChange={(e) => handleCafeteriaPriceChange(item.id, "salePrice", e.target.value)}
                                min="0"
                                step="any"
                              />
                            </td>
                            <td style={{ ...styles.td, textAlign: "right" }}>
                              <button
                                onClick={() => handleRemoveCafeteriaItem(item.id)}
                                style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer" }}
                                title="Eliminar Producto"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Carwash Inventory (Add & Edit & Delete) */}
        {activeTab === "carwash" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
            <div style={styles.managerGrid}>
              {/* Form to Add Item */}
              <div className="glass-panel" style={styles.formCard}>
                <div style={styles.formHeader}>
                  <Plus size={20} color="var(--color-secondary)" />
                  <h3 style={styles.formTitle}>Registrar Insumo Carwash</h3>
                </div>
                <form onSubmit={handleAddCarwashSupply} style={styles.form}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ ...styles.inputGroup, flex: 2 }}>
                      <label style={styles.label}>Nombre del Insumo *</label>
                      <input
                        placeholder="Ej. Cera abrillantadora, Champú"
                        className="input-field"
                        value={cwName}
                        onChange={(e) => setCwName(e.target.value)}
                        required
                      />
                    </div>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Presentación</label>
                      <input
                        placeholder="Ej. Galón, Litro"
                        className="input-field"
                        value={cwPresentation}
                        onChange={(e) => setCwPresentation(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Stock *</label>
                      <input
                        type="number"
                        placeholder="Stock inicial"
                        className="input-field"
                        value={cwQuantity}
                        onChange={(e) => setCwQuantity(e.target.value)}
                        min="0"
                        required
                      />
                    </div>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Costo Unitario (Q) *</label>
                      <input
                        type="number"
                        placeholder="Costo"
                        className="input-field"
                        value={cwPurchasePrice}
                        onChange={(e) => setCwPurchasePrice(e.target.value)}
                        min="0"
                        step="any"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-secondary" style={{ marginTop: "10px" }}>
                    <Plus size={16} /> Registrar Insumo
                  </button>
                </form>
              </div>

              {/* Table of items and Delete */}
              <div className="glass-panel" style={{ padding: "24px" }}>
                <h3 style={styles.sectionTitle}>Edición de Insumos Carwash</h3>
                <p style={styles.sectionSubtitle}>Modifica los costos o elimina insumos cargados en carwash.</p>
                
                {carwashInventory.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No hay insumos registrados en Carwash.</p>
                ) : (
                  <div style={styles.tableResponsive}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Insumo</th>
                          <th style={styles.th}>Presentación</th>
                          <th style={styles.th}>Costo Unitario (Q)</th>
                          <th style={styles.th} style={{ textAlign: "right" }}>Eliminar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {carwashInventory.map((item) => (
                          <tr key={item.id} style={styles.tr}>
                            <td style={{ ...styles.td, fontWeight: "bold", color: "#fff" }}>{item.name}</td>
                            <td style={styles.td}>{item.presentation || "-"}</td>
                            <td style={styles.td}>
                              <input
                                type="number"
                                className="input-field"
                                style={styles.tableInput}
                                value={item.purchasePrice}
                                onChange={(e) => handleCarwashPriceChange(item.id, "purchasePrice", e.target.value)}
                                min="0"
                                step="any"
                              />
                            </td>
                            <td style={{ ...styles.td, textAlign: "right" }}>
                              <button
                                onClick={() => handleRemoveCarwashSupply(item.id)}
                                style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer" }}
                                title="Eliminar Insumo"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Fixed Costs and Break-Even Point */}
        {activeTab === "fixedCosts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
            
            {/* Financial Analysis dashboard panels */}
            <div style={styles.metricsRow}>
              <div className="glass-panel" style={styles.metricCard}>
                <div style={{ ...styles.iconBg, backgroundColor: "var(--color-warning-glow)" }}>
                  <TrendingDown size={20} color="var(--color-warning)" />
                </div>
                <div style={styles.metricInfo}>
                  <span style={styles.metricLabel}>Costos Fijos Totales (CF)</span>
                  <span style={{ ...styles.metricValue, color: "var(--color-warning)" }}>{formatMoney(totalFixedCosts)}</span>
                </div>
              </div>

              <div className="glass-panel" style={styles.metricCard}>
                <div style={{ ...styles.iconBg, backgroundColor: "rgba(16, 185, 129, 0.15)" }}>
                  <TrendingUp size={20} color="#10b981" />
                </div>
                <div style={styles.metricInfo}>
                  <span style={styles.metricLabel}>Margen Contribución Promedio (M)</span>
                  <span style={{ ...styles.metricValue, color: "#10b981" }}>{(marginRatio * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div className="glass-panel" style={styles.metricCard}>
                <div style={{ ...styles.iconBg, backgroundColor: "var(--color-primary-glow)" }}>
                  <Coins size={20} color="var(--color-primary)" />
                </div>
                <div style={styles.metricInfo}>
                  <span style={styles.metricLabel}>Punto de Equilibrio (PE)</span>
                  <span style={{ ...styles.metricValue, color: "var(--color-primary)" }}>{formatMoney(breakEvenPoint)}</span>
                </div>
              </div>

              <div className="glass-panel" style={styles.metricCard}>
                <div style={{ ...styles.iconBg, backgroundColor: isBreakEvenMet ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)" }}>
                  <DollarSign size={20} color={isBreakEvenMet ? "#10b981" : "var(--color-danger)"} />
                </div>
                <div style={styles.metricInfo}>
                  <span style={styles.metricLabel}>Estado Financiero</span>
                  <span style={{ ...styles.metricValue, color: isBreakEvenMet ? "#10b981" : "var(--color-danger)" }}>
                    {isBreakEvenMet ? "Rentable ✅" : "Pérdida ❌"}
                  </span>
                </div>
              </div>
            </div>

            {/* Break-Even Progress bar */}
            <div className="glass-panel" style={{ padding: "24px", textAlign: "left" }}>
              <h4 style={{ fontWeight: "bold", fontSize: "1rem", marginBottom: "10px" }}>
                Progreso del Punto de Equilibrio mensual (CF / M)
              </h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "15px" }}>
                Ventas Totales Actuales: <strong>{formatMoney(totalSalesRevenue)}</strong> de un punto de equilibrio requerido de <strong>{formatMoney(breakEvenPoint)}</strong>.
              </p>
              <div style={styles.progressBarBg}>
                <div style={{ 
                  ...styles.progressBarFill, 
                  backgroundColor: isBreakEvenMet ? "var(--color-success)" : "var(--color-primary)", 
                  width: `${progressPercent}%` 
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
                <span>0%</span>
                <span>{progressPercent.toFixed(1)}% Alcanzado</span>
                <span>100% (Q{breakEvenPoint.toFixed(2)})</span>
              </div>

              {/* Status Alert Box */}
              <div style={{ 
                marginTop: "20px", 
                padding: "16px", 
                borderRadius: "8px", 
                border: "1px solid",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: isBreakEvenMet ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)",
                borderColor: isBreakEvenMet ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                color: isBreakEvenMet ? "#10b981" : "var(--color-danger)"
              }}>
                <AlertTriangle size={20} />
                <span style={{ fontSize: "0.88rem", fontWeight: "600" }}>
                  {isBreakEvenMet 
                    ? `¡El negocio es rentable en este periodo! Las utilidades netas estimadas sobre el punto de equilibrio son de ${formatMoney(totalSalesRevenue - breakEvenPoint)}.`
                    : `Faltan registrar ${formatMoney(breakEvenPoint - totalSalesRevenue)} en facturaciones para alcanzar el punto de equilibrio y comenzar a generar ganancias.`
                  }
                </span>
              </div>
            </div>

            {/* CRUD Grid */}
            <div style={styles.managerGrid}>
              
              {/* Form cost add / edit */}
              <div className="glass-panel" style={styles.formCard}>
                <div style={styles.formHeader}>
                  {editingFixedCostId ? <Edit size={20} color="var(--color-primary)" /> : <Plus size={20} color="var(--color-warning)" />}
                  <h3 style={styles.formTitle}>
                    {editingFixedCostId ? "Editar Costo Fijo Mensual" : "Agregar Costo Fijo Mensual"}
                  </h3>
                </div>
                <form onSubmit={handleAddFixedCost} style={styles.form}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Descripción del Costo *</label>
                    <input
                      placeholder="Ej. Alquiler del Local, Salarios"
                      className="input-field"
                      value={fcName}
                      onChange={(e) => setFcName(e.target.value)}
                      required
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Monto Mensual (Q) *</label>
                    <input
                      type="number"
                      placeholder="Monto"
                      className="input-field"
                      value={fcAmount}
                      onChange={(e) => setFcAmount(e.target.value)}
                      min="0"
                      step="any"
                      required
                    />
                  </div>
                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    {editingFixedCostId && (
                      <button type="button" className="btn btn-ghost" onClick={cancelarEdicionFixedCost} style={{ flex: 1 }}>
                        Cancelar
                      </button>
                    )}
                    <button type="submit" className={editingFixedCostId ? "btn btn-primary" : "btn btn-warning-glow"} style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                      {editingFixedCostId ? <Edit size={16} /> : <Plus size={16} />}
                      {editingFixedCostId ? "Actualizar Gasto" : "Registrar Gasto"}
                    </button>
                  </div>
                </form>
              </div>

              {/* List Fixed Costs */}
              <div className="glass-panel" style={{ padding: "24px" }}>
                <h3 style={styles.sectionTitle}>Costos Fijos Registrados</h3>
                <p style={styles.sectionSubtitle}>Listado detallado de egresos fijos mensuales de la empresa.</p>

                {fixedCosts.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No se han registrado costos fijos.</p>
                ) : (
                  <div style={styles.tableResponsive}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Descripción</th>
                          <th style={styles.th}>Monto Mensual</th>
                          <th style={{ ...styles.th, textAlign: "right" }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {totalSalaries > 0 && (
                          <tr style={{ ...styles.tr, backgroundColor: "rgba(168, 85, 247, 0.03)" }}>
                            <td style={{ ...styles.td, fontWeight: "bold", color: "var(--color-secondary)" }}>
                              📋 Planilla Fija de Colaboradores (Salarios Base de Usuarios)
                            </td>
                            <td style={{ ...styles.td, color: "var(--color-secondary)", fontWeight: "bold" }}>
                              {formatMoney(totalSalaries)}
                            </td>
                            <td style={{ ...styles.td, textAlign: "right", fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                              Automático
                            </td>
                          </tr>
                        )}
                        {fixedCosts.map((cost) => (
                          <tr key={cost.id} style={styles.tr}>
                            <td style={{ ...styles.td, fontWeight: "bold", color: "#fff" }}>{cost.name}</td>
                            <td style={styles.td}>{formatMoney(cost.amount)}</td>
                            <td style={{ ...styles.td, textAlign: "right" }}>
                              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                                <button
                                  onClick={() => iniciarEdicionFixedCost(cost)}
                                  style={{ background: "none", border: "none", color: "var(--color-primary)", cursor: "pointer" }}
                                  title="Editar Costo"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleRemoveFixedCost(cost.id)}
                                  style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer" }}
                                  title="Eliminar Costo"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* Tab 6: User Management */}
        {activeTab === "usuarios" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
            <div style={styles.managerGrid}>
              
              {/* Form to Add User */}
              <div className="glass-panel" style={styles.formCard}>
                <div style={styles.formHeader}>
                  <Plus size={20} color="var(--color-primary)" />
                  <h3 style={styles.formTitle}>Registrar Nuevo Usuario</h3>
                </div>
                
                <form onSubmit={handleAddUser} style={styles.form}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Usuario (Nombre de ingreso) *</label>
                    <input
                      placeholder="Ej. juan_taller"
                      className="input-field"
                      value={uUser}
                      onChange={(e) => setUUser(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Contraseña *</label>
                      <input
                        type="password"
                        placeholder="••••"
                        className="input-field"
                        value={uPass}
                        onChange={(e) => setUPass(e.target.value)}
                        required
                      />
                    </div>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Rol *</label>
                      <select
                        className="input-field"
                        value={uRol}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        style={styles.select}
                      >
                        <option value="admin">Administrador</option>
                        <option value="cajero">Cajero</option>
                        <option value="mecanico">Mecánico</option>
                        <option value="lavador">Lavador</option>
                        <option value="jefe de taller">Jefe de Taller</option>
                        <option value="custom">Otro (Rol personalizado)...</option>
                      </select>
                    </div>
                  </div>

                  {showCustomRolInput && (
                    <div style={{ ...styles.inputGroup, marginTop: "10px" }}>
                      <label style={styles.label}>Nombre del Rol Personalizado *</label>
                      <input
                        placeholder="Ej. secretaria, supervisor, etc."
                        className="input-field"
                        value={uRolCustom}
                        onChange={(e) => setURolCustom(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Salario Base (Q)</label>
                      <input
                        type="number"
                        placeholder="Ej. 3000"
                        className="input-field"
                        value={uSalarioBase}
                        onChange={(e) => setUSalarioBase(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>

                  <div style={{ ...styles.inputGroup, marginTop: "10px" }}>
                    <label style={styles.label}>Sobre qué va a comisionar:</label>
                    <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", margin: "5px 0" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                        <input
                          type="checkbox"
                          checked={uComisionarLabor}
                          onChange={(e) => setUComisionarLabor(e.target.checked)}
                        />
                        Mano de Obra Taller
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                        <input
                          type="checkbox"
                          checked={uComisionarRepuestos}
                          onChange={(e) => setUComisionarRepuestos(e.target.checked)}
                        />
                        Repuestos Taller (sobre utilidad)
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                        <input
                          type="checkbox"
                          checked={uComisionarCarwash}
                          onChange={(e) => setUComisionarCarwash(e.target.checked)}
                        />
                        Carwash
                      </label>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    {uComisionarLabor && (
                      <div style={{ ...styles.inputGroup, flex: 1 }}>
                        <label style={styles.label}>Comisión Labor Taller (%)</label>
                        <input
                          type="number"
                          placeholder="Ej. 10"
                          className="input-field"
                          value={uComisionTaller}
                          onChange={(e) => setUComisionTaller(e.target.value)}
                          min="0"
                          max="100"
                        />
                      </div>
                    )}
                    {uComisionarRepuestos && (
                      <div style={{ ...styles.inputGroup, flex: 1 }}>
                        <label style={styles.label}>Comisión Repuestos Taller (%)</label>
                        <input
                          type="number"
                          placeholder="Ej. 5"
                          className="input-field"
                          value={uComisionRepuestos}
                          onChange={(e) => setUComisionRepuestos(e.target.value)}
                          min="0"
                          max="100"
                        />
                      </div>
                    )}
                    {uComisionarCarwash && (
                      <div style={{ ...styles.inputGroup, flex: 1 }}>
                        <label style={styles.label}>Comisión Carwash (Q Fijo)</label>
                        <input
                          type="number"
                          placeholder="Ej. 7"
                          className="input-field"
                          value={uComisionCarwash}
                          onChange={(e) => setUComisionCarwash(e.target.value)}
                          min="0"
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)", margin: "15px 0", paddingTop: "15px" }}>
                    <h4 style={{ ...styles.label, fontSize: "0.85rem", color: "var(--color-primary)", marginBottom: "10px" }}>Datos Personales del Colaborador (Opcionales)</h4>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Nombre Completo</label>
                      <input
                        placeholder="Ej. Juan Carlos López Díaz"
                        className="input-field"
                        value={uNombreCompleto}
                        onChange={(e) => setUNombreCompleto(e.target.value)}
                      />
                    </div>
                    
                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                      <div style={{ ...styles.inputGroup, flex: 1 }}>
                        <label style={styles.label}>Número de DPI</label>
                        <input
                          placeholder="Ej. 1234 56789 0101"
                          className="input-field"
                          value={uDpi}
                          onChange={(e) => setUDpi(e.target.value)}
                        />
                      </div>
                      <div style={{ ...styles.inputGroup, flex: 1 }}>
                        <label style={styles.label}>Número de NIT</label>
                        <input
                          placeholder="Ej. 1234567-8"
                          className="input-field"
                          value={uNit}
                          onChange={(e) => setUNit(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                      <div style={{ ...styles.inputGroup, flex: 1 }}>
                        <label style={styles.label}>Teléfono</label>
                        <input
                          placeholder="Ej. 5566-7788"
                          className="input-field"
                          value={uTelefono}
                          onChange={(e) => setUTelefono(e.target.value)}
                        />
                      </div>
                      <div style={{ ...styles.inputGroup, flex: 2 }}>
                        <label style={styles.label}>Dirección</label>
                        <input
                          placeholder="Ej. 12 Calle 4-56 Zona 10, Guatemala"
                          className="input-field"
                          value={uDireccion}
                          onChange={(e) => setUDireccion(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginTop: "10px", marginBottom: "15px" }}>
                      <div style={{ ...styles.inputGroup, flex: 1 }}>
                        <label style={styles.label}>Fecha de Ingreso</label>
                        <input
                          type="date"
                          className="input-field"
                          value={uFechaIngreso}
                          onChange={(e) => setUFechaIngreso(e.target.value)}
                        />
                      </div>
                      <div style={{ ...styles.inputGroup, flex: 1 }}>
                        <label style={styles.label}>Fecha de Nacimiento</label>
                        <input
                          type="date"
                          className="input-field"
                          value={uFechaNacimiento}
                          onChange={(e) => setUFechaNacimiento(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Permissions Selection Grid */}
                  <div style={styles.inputGroup}>
                    <label style={{ ...styles.label, marginBottom: "8px" }}>Permisos de Acceso / Pestañas Habilitadas *</label>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: "10px",
                      backgroundColor: "rgba(255, 255, 255, 0.02)",
                      padding: "15px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.05)"
                    }}>
                      {[
                        { id: "dashboard", label: "📊 Dashboard" },
                        { id: "taller", label: "🔧 Taller Mecánico" },
                        { id: "carwash", label: "🧼 Carwash" },
                        { id: "parqueo", label: "🚗 Parqueo" },
                        { id: "bodega", label: "📦 Bodega Taller" },
                        { id: "cafeteria", label: "☕ Cafetería" },
                        { id: "repuestosFaltantes", label: "🛒 Repuestos Faltantes" },
                        { id: "tienda", label: "🛒 Tienda POS" },
                        { id: "cuentas", label: "📋 Cuentas Pagar/Cobrar" },
                        { id: "historial", label: "⏳ Historial Vehículos" },
                        { id: "finanzas", label: "📈 Finanzas" },
                        { id: "configuracion", label: "⚙️ Configuración" }
                      ].map((perm) => {
                        const isChecked = uPermissions.includes(perm.id);
                        return (
                          <label key={perm.id} style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            color: isChecked ? "#fff" : "var(--text-muted)",
                            fontWeight: isChecked ? "bold" : "normal"
                          }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handlePermissionToggle(perm.id)}
                              style={{ cursor: "pointer" }}
                            />
                            {perm.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ marginTop: "10px" }}>
                    <Plus size={16} /> Registrar Usuario
                  </button>
                </form>
              </div>

              {/* Registered Users list */}
              <div className="glass-panel" style={{ padding: "24px" }}>
                <h3 style={styles.sectionTitle}>Usuarios del Sistema</h3>
                <p style={styles.sectionSubtitle}>Listado de accesos registrados y sus roles correspondientes.</p>
                
                {usuarios.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No hay usuarios registrados.</p>
                ) : (
                  <div style={styles.tableResponsive}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Usuario</th>
                          <th style={styles.th}>Rol</th>
                          <th style={styles.th}>Salario Base</th>
                          <th style={styles.th}>Comisiones</th>
                          <th style={styles.th}>Pestañas Permitidas</th>
                          <th style={{ ...styles.th, textAlign: "right" }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usuarios.map((userObj) => {
                          const isCurrentUser = userObj.user.toLowerCase().trim() === usuarioActual?.user?.toLowerCase()?.trim();
                          const isMainAdmin = userObj.user.toLowerCase().trim() === "admin";
                          
                          // Helper to get role badges color style
                          const getBadgeColor = (roleStr) => {
                            switch (roleStr) {
                              case "admin": return { color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)", bg: "rgba(239, 68, 68, 0.1)" };
                              case "cajero": return { color: "#22d3ee", border: "1px solid rgba(6, 182, 212, 0.3)", bg: "rgba(6, 182, 212, 0.1)" };
                              case "mecanico": return { color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.3)", bg: "rgba(245, 158, 11, 0.1)" };
                              case "lavador": return { color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.3)", bg: "rgba(168, 85, 247, 0.1)" };
                              case "jefe de taller": return { color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)", bg: "rgba(16, 185, 129, 0.1)" };
                              default: return { color: "#9ca3af", border: "1px solid rgba(156, 163, 175, 0.3)", bg: "rgba(156, 163, 175, 0.1)" };
                            }
                          };
                          const badge = getBadgeColor(userObj.rol);
                          
                          return (
                            <tr key={userObj.user} style={styles.tr}>
                              <td style={styles.td}>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  <span style={{ color: "#fff", fontWeight: "bold" }}>{userObj.user}</span>
                                  {isCurrentUser && <span style={{ fontSize: "0.7rem", color: "var(--color-primary)", fontWeight: "bold" }}>(Sesión activa)</span>}
                                </div>
                              </td>
                              <td style={styles.td}>
                                <span style={{
                                  fontSize: "0.75rem",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  fontWeight: "700",
                                  color: badge.color,
                                  border: badge.border,
                                  backgroundColor: badge.bg
                                }}>
                                  {userObj.rol.toUpperCase()}
                                </span>
                              </td>
                              <td style={styles.td}>
                                <span style={{ color: "#fff", fontWeight: "700" }}>
                                  {formatMoney(userObj.salarioBase || 0)}
                                </span>
                              </td>
                              <td style={styles.td}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  {userObj.comisionarLabor !== false && (
                                    <span style={{ fontSize: "0.78rem", color: "var(--color-primary)", fontWeight: "600" }}>
                                      🔧 Mano Obra: {userObj.comisionTaller || 0}%
                                    </span>
                                  )}
                                  {userObj.comisionarRepuestos && (
                                    <span style={{ fontSize: "0.78rem", color: "var(--color-warning)", fontWeight: "600" }}>
                                      📦 Repuestos: {userObj.comisionRepuestos || 0}%
                                    </span>
                                  )}
                                  {userObj.comisionarCarwash && (
                                    <span style={{ fontSize: "0.78rem", color: "var(--color-secondary)", fontWeight: "600" }}>
                                      🧼 Wash: {formatMoney(userObj.comisionCarwash || 0)}
                                    </span>
                                  )}
                                  {!userObj.comisionarLabor && !userObj.comisionarRepuestos && !userObj.comisionarCarwash && (
                                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                      Sin comisiones
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={styles.td}>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "250px" }}>
                                  {userObj.permissions && userObj.permissions.length > 0 ? (
                                    userObj.permissions.map(p => (
                                      <span key={p} style={{
                                        fontSize: "0.7rem",
                                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                                        color: "#e5e7eb",
                                        padding: "1px 5px",
                                        borderRadius: "4px"
                                      }}>
                                        {p}
                                      </span>
                                    ))
                                  ) : (
                                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic" }}>Ninguno</span>
                                  )}
                                </div>
                              </td>
                              <td style={{ ...styles.td }}>
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                  <button
                                    onClick={() => handleEditUserClick(userObj)}
                                    style={{ background: "none", border: "none", color: "var(--color-primary)", cursor: "pointer" }}
                                    title="Modificar Usuario"
                                    type="button"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  {(!isCurrentUser && !isMainAdmin) ? (
                                    <button
                                      onClick={() => handleRemoveUser(userObj.user)}
                                      style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer" }}
                                      title="Eliminar Usuario"
                                      type="button"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic", alignSelf: "center" }}>Protegido</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Tab 7: Cloud Sync Settings */}
        {activeTab === "cloud" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "30px" }} className="animate-fade-in">
            <div style={styles.managerGrid}>
              
              {/* Form to Connect Supabase */}
              <form onSubmit={handleConnectCloud} className="glass-panel" style={styles.formCard}>
                <div style={styles.formHeader}>
                  <Save size={20} color="var(--color-primary)" />
                  <h3 style={styles.formTitle}>Conectar Base de Datos en la Nube</h3>
                </div>
                
                <p style={{ ...styles.sectionSubtitle, marginBottom: "15px" }}>
                  Vincula una cuenta de **Supabase** gratuita para sincronizar todas las computadoras y celulares del taller en tiempo real.
                </p>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Supabase Project URL *</label>
                  <input
                    type="url"
                    placeholder="Ej. https://xxxxxx.supabase.co"
                    className="input-field"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    required
                    disabled={connectionStatus === "connected"}
                  />
                </div>

                <div style={{ ...styles.inputGroup, marginTop: "10px" }}>
                  <label style={styles.label}>Supabase Public Anon Key *</label>
                  <input
                    type="password"
                    placeholder="Ingresa la Anon Key de tu proyecto..."
                    className="input-field"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    required
                    disabled={connectionStatus === "connected"}
                  />
                </div>

                <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
                  {connectionStatus !== "connected" ? (
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isTestingConnection}
                      style={{ flex: 1 }}
                    >
                      {isTestingConnection ? "Conectando y Probando..." : "🔗 Guardar y Activar Sincronización"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDisconnectCloud}
                      className="btn btn-danger"
                      style={{ flex: 1 }}
                    >
                      🔌 Desconectar Base de Datos
                    </button>
                  )}
                </div>
              </form>

              {/* Database Actions & Setup Instructions */}
              <div className="glass-panel" style={{ padding: "24px" }}>
                <h3 style={styles.sectionTitle}>Estado e Inicialización</h3>
                
                {/* Connection Status Badge */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "15px 0" }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: "bold" }}>Estado del Enlace:</span>
                  {connectionStatus === "connected" ? (
                    <span className="badge" style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981", borderColor: "rgba(16, 185, 129, 0.3)", fontWeight: "800" }}>
                      🟢 CONECTADO Y SINCRONIZANDO
                    </span>
                  ) : (
                    <span className="badge" style={{ backgroundColor: "rgba(156, 163, 175, 0.15)", color: "#9ca3af", borderColor: "rgba(156, 163, 175, 0.3)", fontWeight: "800" }}>
                      ⚪ SIN CONEXIÓN A LA NUBE
                    </span>
                  )}
                </div>

                {connectionStatus === "connected" && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "15px", marginTop: "15px" }}>
                    <h4 style={{ ...styles.label, color: "#fff", marginBottom: "10px" }}>Cargar Datos de la PC a la Nube (Solo la primera vez)</h4>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "12px" }}>
                      Si ya tienes órdenes de taller, clientes e inventario en este navegador de PC, súbelos a Supabase para que los celulares y otras computadoras puedan cargarlos automáticamente al abrir el sistema.
                    </p>
                    <button
                      type="button"
                      onClick={handleUploadLocalDataToCloud}
                      disabled={isUploadingToCloud}
                      className="btn btn-secondary"
                      style={{ width: "100%", fontWeight: "700" }}
                    >
                      {isUploadingToCloud ? "Subiendo Información..." : "⬆️ Subir Datos de esta PC a la Nube"}
                    </button>
                  </div>
                )}

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "15px", marginTop: "15px" }}>
                  <h4 style={{ ...styles.label, color: "#fff", marginBottom: "8px" }}>Instrucciones en Supabase:</h4>
                  <ol style={{ fontSize: "0.82rem", color: "var(--text-muted)", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <li>Crea una cuenta gratis en supabase.com y crea un nuevo proyecto.</li>
                    <li>Ve a la sección **SQL Editor** de tu proyecto y pega este código para crear la tabla:</li>
                  </ol>
                  <pre style={{
                    backgroundColor: "rgba(0,0,0,0.3)",
                    padding: "10px",
                    borderRadius: "6px",
                    fontSize: "0.72rem",
                    color: "#a7f3d0",
                    overflowX: "auto",
                    marginTop: "8px",
                    border: "1px solid rgba(255,255,255,0.05)"
                  }}>
{`CREATE TABLE IF NOT EXISTS public.app_data (
  key text PRIMARY KEY,
  value jsonb,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.app_data REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_data;`}
                  </pre>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "8px" }}>
                    3. Ve a **Project Settings ➔ API** y copia la **Project URL** y la **anon key** para pegarlas aquí.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* 🔐 EDIT USER MODAL */}
      {editingUser && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          backdropFilter: "blur(10px)",
          padding: "20px"
        }}>
          <div className="glass-panel" style={{
            width: "100%",
            maxWidth: "650px",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "30px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            textAlign: "left"
          }}>
            <h3 style={{ ...styles.formTitle, marginBottom: "20px", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Edit size={20} /> Modificar Usuario: {editingUser.user}
            </h3>

            <form onSubmit={handleSaveEditUser} style={styles.form}>
              
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Contraseña *</label>
                  <input
                    type="password"
                    placeholder="••••"
                    className="input-field"
                    value={editPass}
                    onChange={(e) => setEditPass(e.target.value)}
                    required
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Rol *</label>
                  <select
                    className="input-field"
                    value={editRol}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditRol(val);
                      setEditPermissions(getDefaultPermissionsForRole(val));
                      setShowCustomEditRolInput(val === "custom");
                      if (val !== "custom") {
                        setEditRolCustom("");
                      }
                    }}
                    style={styles.select}
                  >
                    <option value="admin">Administrador</option>
                    <option value="cajero">Cajero</option>
                    <option value="mecanico">Mecánico</option>
                    <option value="lavador">Lavador</option>
                    <option value="jefe de taller">Jefe de Taller</option>
                    <option value="custom">Otro (Rol personalizado)...</option>
                  </select>
                </div>
              </div>

              {showCustomEditRolInput && (
                <div style={{ ...styles.inputGroup, marginTop: "10px" }}>
                  <label style={styles.label}>Nombre del Rol Personalizado *</label>
                  <input
                    placeholder="Ej. secretaria, supervisor, etc."
                    className="input-field"
                    value={editRolCustom}
                    onChange={(e) => setEditRolCustom(e.target.value)}
                    required
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Salario Base (Q)</label>
                  <input
                    type="number"
                    placeholder="Ej. 3000"
                    className="input-field"
                    value={editSalarioBase}
                    onChange={(e) => setEditSalarioBase(e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              <div style={{ ...styles.inputGroup, marginTop: "10px", textAlign: "left" }}>
                <label style={styles.label}>Sobre qué va a comisionar:</label>
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", margin: "5px 0" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem", color: "#fff" }}>
                    <input
                      type="checkbox"
                      checked={editComisionarLabor}
                      onChange={(e) => setEditComisionarLabor(e.target.checked)}
                    />
                    Mano de Obra Taller
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem", color: "#fff" }}>
                    <input
                      type="checkbox"
                      checked={editComisionarRepuestos}
                      onChange={(e) => setEditComisionarRepuestos(e.target.checked)}
                    />
                    Repuestos Taller (sobre utilidad)
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem", color: "#fff" }}>
                    <input
                      type="checkbox"
                      checked={editComisionarCarwash}
                      onChange={(e) => setEditComisionarCarwash(e.target.checked)}
                    />
                    Carwash
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                {editComisionarLabor && (
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>Comisión Labor Taller (%)</label>
                    <input
                      type="number"
                      placeholder="Ej. 10"
                      className="input-field"
                      value={editComisionTaller}
                      onChange={(e) => setEditComisionTaller(e.target.value)}
                      min="0"
                      max="100"
                    />
                  </div>
                )}
                {editComisionarRepuestos && (
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>Comisión Repuestos Taller (%)</label>
                    <input
                      type="number"
                      placeholder="Ej. 5"
                      className="input-field"
                      value={editComisionRepuestos}
                      onChange={(e) => setEditComisionRepuestos(e.target.value)}
                      min="0"
                      max="100"
                    />
                  </div>
                )}
                {editComisionarCarwash && (
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>Comisión Carwash (Q Fijo)</label>
                    <input
                      type="number"
                      placeholder="Ej. 7"
                      className="input-field"
                      value={editComisionCarwash}
                      onChange={(e) => setEditComisionCarwash(e.target.value)}
                      min="0"
                    />
                  </div>
                )}
              </div>

              {/* Collaborator details */}
              <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)", margin: "15px 0", paddingTop: "15px" }}>
                <h4 style={{ ...styles.label, fontSize: "0.85rem", color: "var(--color-primary)", marginBottom: "10px" }}>Datos Personales del Colaborador (Opcionales)</h4>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nombre Completo</label>
                  <input
                    placeholder="Ej. Juan Carlos López Díaz"
                    className="input-field"
                    value={editNombreCompleto}
                    onChange={(e) => setEditNombreCompleto(e.target.value)}
                  />
                </div>
                
                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>Número de DPI</label>
                    <input
                      placeholder="Ej. 1234 56789 0101"
                      className="input-field"
                      value={editDpi}
                      onChange={(e) => setEditDpi(e.target.value)}
                    />
                  </div>
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>Número de NIT</label>
                    <input
                      placeholder="Ej. 1234567-8"
                      className="input-field"
                      value={editNit}
                      onChange={(e) => setEditNit(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>Teléfono</label>
                    <input
                      placeholder="Ej. 5566-7788"
                      className="input-field"
                      value={editTelefono}
                      onChange={(e) => setEditTelefono(e.target.value)}
                    />
                  </div>
                  <div style={{ ...styles.inputGroup, flex: 2 }}>
                    <label style={styles.label}>Dirección</label>
                    <input
                      placeholder="Ej. 12 Calle 4-56 Zona 10, Guatemala"
                      className="input-field"
                      value={editDireccion}
                      onChange={(e) => setEditDireccion(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "10px", marginBottom: "15px" }}>
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>Fecha de Ingreso</label>
                    <input
                      type="date"
                      className="input-field"
                      value={editFechaIngreso}
                      onChange={(e) => setEditFechaIngreso(e.target.value)}
                    />
                  </div>
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>Fecha de Nacimiento</label>
                    <input
                      type="date"
                      className="input-field"
                      value={editFechaNacimiento}
                      onChange={(e) => setEditFechaNacimiento(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div style={styles.inputGroup}>
                <label style={{ ...styles.label, marginBottom: "8px" }}>Permisos de Acceso / Pestañas Habilitadas *</label>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "10px",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  padding: "15px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.05)"
                }}>
                  {[
                    { id: "dashboard", label: "📊 Dashboard" },
                    { id: "taller", label: "🔧 Taller" },
                    { id: "carwash", label: "🧼 Carwash" },
                    { id: "parqueo", label: "🚗 Parqueo" },
                    { id: "bodega", label: "📦 Bodega Taller" },
                    { id: "cafeteria", label: "☕ Cafetería" },
                    { id: "repuestosFaltantes", label: "🛒 Repuestos Faltantes" },
                    { id: "tienda", label: "🛒 Tienda POS" },
                    { id: "cuentas", label: "📋 Cuentas Pagar/Cobrar" },
                    { id: "historial", label: "⏳ Historial Vehículos" },
                    { id: "finanzas", label: "📈 Finanzas" },
                    { id: "configuracion", label: "⚙️ Configuración" }
                  ].map((perm) => {
                    const isChecked = editPermissions.includes(perm.id);
                    return (
                      <label key={perm.id} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        color: isChecked ? "#fff" : "var(--text-muted)",
                        fontWeight: isChecked ? "bold" : "normal"
                      }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (editPermissions.includes(perm.id)) {
                              setEditPermissions(editPermissions.filter(p => p !== perm.id));
                            } else {
                              setEditPermissions([...editPermissions, perm.id]);
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        />
                        {perm.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Cambios
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "30px",
    display: "flex",
    flexDirection: "column",
    gap: "30px",
    width: "100%",
    overflowY: "auto",
    height: "100vh",
  },
  header: {
    textAlign: "left",
  },
  title: {
    fontSize: "2.2rem",
    fontWeight: "800",
    marginBottom: "5px",
    background: "linear-gradient(135deg, #fff 60%, var(--color-primary) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subTabs: {
    display: "flex",
    gap: "10px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    paddingBottom: "10px",
    flexWrap: "wrap"
  },
  subTabBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    background: "transparent",
    border: "none",
    borderRadius: "8px",
    color: "var(--text-muted)",
    fontWeight: "600",
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "var(--transition-smooth)",
  },
  subTabActive: {
    color: "#fff",
    background: "rgba(255, 255, 255, 0.05)",
  },
  formCard: {
    padding: "30px",
    textAlign: "left",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  tableCard: {
    padding: "30px",
    textAlign: "left",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  sectionTitle: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#fff",
    marginBottom: "6px",
  },
  sectionSubtitle: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    marginBottom: "24px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    display: "flex",
    alignItems: "center",
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "var(--text-muted)",
  },
  select: {
    cursor: "pointer",
  },
  presetsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
    marginTop: "15px",
  },
  presetSettingCard: {
    padding: "20px",
    border: "1px solid rgba(255, 255, 255, 0.03)",
  },
  saveBtn: {
    padding: "12px 28px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: "700",
    borderRadius: "10px",
    cursor: "pointer",
  },
  tableResponsive: {
    width: "100%",
    overflowX: "auto",
    marginTop: "15px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    padding: "12px 16px",
    fontSize: "0.8rem",
    fontWeight: "700",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    borderBottom: "2px solid rgba(255, 255, 255, 0.08)",
  },
  tr: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  },
  td: {
    padding: "14px 16px",
    fontSize: "0.9rem",
    color: "var(--text-main)",
  },
  tableInput: {
    width: "100px",
    padding: "8px 12px",
    fontSize: "0.9rem",
  },
  managerGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1.3fr",
    gap: "30px",
    alignItems: "start",
  },
  formHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "20px",
  },
  formTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  progressBarBg: {
    width: "100%",
    height: "12px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: "6px",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: "6px",
    transition: "width 0.5s ease-out",
  },
  metricsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    width: "100%",
  },
  metricCard: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "20px",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  iconBg: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  metricInfo: {
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
  },
  metricLabel: {
    fontSize: "0.75rem",
    fontWeight: "600",
    color: "var(--text-muted)",
  },
  metricValue: {
    fontSize: "1.25rem",
    fontWeight: "800",
    color: "#fff",
    marginTop: "2px",
  },
};
