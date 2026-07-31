// src/components/PapeleraModal.jsx
import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, Search, AlertTriangle, X, RefreshCw, Eye, Calendar, User, ShieldAlert } from 'lucide-react';
import { getTrashItems, restoreItem, permanentDelete, emptyTrash, autoPurgeTrash } from '../services/trashService';
import { formatDate } from '../utils/storage';

export default function PapeleraModal({ isOpen, onClose, onDataRestored, currentUser }) {
  const [items, setItems] = useState([]);
  const [filterModule, setFilterModule] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewItem, setPreviewItem] = useState(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTrash();
    }
  }, [isOpen]);

  const loadTrash = async () => {
    setLoading(true);
    try {
      await autoPurgeTrash();
      const currentTrash = getTrashItems();
      setItems(currentTrash);
    } catch (err) {
      console.error("Error cargando papelera:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const showNotification = (msg, isError = false) => {
    setStatusMessage({ text: msg, isError });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleRestore = async (trashId) => {
    try {
      setLoading(true);
      const res = await restoreItem(trashId);
      showNotification(`Registro de ${res.moduleKey} restaurado exitosamente.`);
      await loadTrash();
      if (onDataRestored) onDataRestored();
    } catch (err) {
      showNotification(`Error al restaurar: ${err.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async (trashId) => {
    try {
      setLoading(true);
      await permanentDelete(trashId);
      showNotification("Registro eliminado permanentemente.");
      setConfirmDeleteId(null);
      await loadTrash();
    } catch (err) {
      showNotification(`Error al eliminar: ${err.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      setLoading(true);
      await emptyTrash();
      showNotification("Papelera vaciada correctamente.");
      setConfirmEmpty(false);
      await loadTrash();
    } catch (err) {
      showNotification(`Error al vaciar la papelera: ${err.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  // Nombres descriptivos para los módulos
  const MODULE_NAMES = {
    ordenes: "Taller Mecánico",
    carwash: "Carwash",
    clientes: "Clientes",
    vehiculos: "Vehículos",
    workshopInventory: "Inventario Taller",
    cafeteriaInventory: "Inventario Cafetería",
    cafeteriaSales: "Ventas Cafetería",
    carwashInventory: "Inventario Carwash",
    carwashConsumption: "Consumos Carwash",
    tiendaSales: "Ventas Tienda",
    cuentasPorCobrar: "Cuentas por Cobrar",
    cuentasPorPagar: "Cuentas por Pagar",
    fixedCosts: "Costos Fijos",
    compras: "Compras",
    toolsInventory: "Herramientas",
    accesoriosInventory: "Accesorios",
    vehiculosVenta: "Vehículos en Venta"
  };

  // Filtrado de elementos
  const filteredItems = items.filter(item => {
    const matchesModule = filterModule === 'all' || item.moduleKey === filterModule;
    const searchLower = searchQuery.toLowerCase();
    const itemString = JSON.stringify(item).toLowerCase();
    const matchesSearch = !searchQuery || itemString.includes(searchLower);
    return matchesModule && matchesSearch;
  });

  const availableModules = Array.from(new Set(items.map(i => i.moduleKey)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Papelera Avanzada de Reciclaje</h2>
              <p className="text-sm text-slate-400">
                Registros eliminados. Se eliminarán permanentemente tras 30 días.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={() => setConfirmEmpty(true)}
                className="px-4 py-2 bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600 hover:text-white rounded-xl text-sm font-medium transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Vaciar Papelera
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* NOTIFICACIONES */}
        {statusMessage && (
          <div className={`px-6 py-3 text-sm font-medium flex items-center gap-2 ${
            statusMessage.isError ? 'bg-red-500/20 text-red-300 border-b border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border-b border-emerald-500/30'
          }`}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* FILTROS Y BÚSQUEDA */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Módulos */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            <button
              onClick={() => setFilterModule('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filterModule === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Todos ({items.length})
            </button>
            {availableModules.map(modKey => (
              <button
                key={modKey}
                onClick={() => setFilterModule(modKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  filterModule === modKey ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {MODULE_NAMES[modKey] || modKey} ({items.filter(i => i.moduleKey === modKey).length})
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar en papelera..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* LISTADO DE ITEMS */}
        <div className="flex-1 p-6 overflow-y-auto space-y-3">
          {loading && items.length === 0 ? (
            <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <span>Cargando elementos eliminados...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-3">
              <ShieldAlert className="w-12 h-12 text-slate-700" />
              <span className="text-base font-medium">No se encontraron registros en la papelera.</span>
              <span className="text-xs text-slate-600">Los registros eliminados aparecerán aquí para ser restaurados.</span>
            </div>
          ) : (
            filteredItems.map(item => {
              const data = item.originalData || {};
              const title = data.cliente || data.nombre || data.placa || data.concepto || data.vehiculo || `ID: ${item.originalId}`;
              const subtitle = data.descripcion || data.modelo || data.tipo || data.servicio || `Modulo: ${MODULE_NAMES[item.moduleKey] || item.moduleKey}`;

              return (
                <div
                  key={item.id}
                  className="bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 shrink-0">
                      <Trash2 className="w-5 h-5 text-red-400/80" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {MODULE_NAMES[item.moduleKey] || item.moduleKey}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{subtitle}</p>
                      
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(item.deletedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {item.deletedBy || 'Sistema'}
                        </span>
                        {item.reason && (
                          <span className="italic">Motivo: "{item.reason}"</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                      title="Ver detalle del registro"
                    >
                      <Eye className="w-3.5 h-3.5" /> Detalle
                    </button>
                    <button
                      onClick={() => handleRestore(item.id)}
                      className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(item.id)}
                      className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL DETALLE / PREVIEW */}
        {previewItem && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-400" /> Detalle del Registro Eliminado
                </h3>
                <button onClick={() => setPreviewItem(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl max-h-96 overflow-y-auto text-xs font-mono text-emerald-400/90 whitespace-pre-wrap border border-slate-800">
                {JSON.stringify(previewItem.originalData, null, 2)}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    handleRestore(previewItem.id);
                    setPreviewItem(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-emerald-500"
                >
                  <RotateCcw className="w-4 h-4" /> Restaurar Este Registro
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMACIÓN BORRADO PERMANENTE */}
        {confirmDeleteId && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-bold text-slate-100">¿Eliminar permanentemente?</h3>
              <p className="text-xs text-slate-400">
                Esta acción no se puede deshacer. El registro se borrará de forma definitiva.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => handlePermanentDelete(confirmDeleteId)}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-500"
                >
                  Sí, Eliminar Definitivamente
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMACIÓN VACIAR PAPELERA */}
        {confirmEmpty && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-bold text-slate-100">¿Vaciar toda la papelera?</h3>
              <p className="text-xs text-slate-400">
                Se eliminarán permanentemente los {items.length} registros que están en la papelera.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleEmptyTrash}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-500"
                >
                  Vaciar Todo
                </button>
                <button
                  onClick={() => setConfirmEmpty(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
