// src/services/trashService.js
import { getLocalStorage, setLocalStorage } from '../utils/storage';
import { syncKeyToCloud } from '../utils/supabase';

const TRASH_KEY = "papeleraSistema";
const AUTO_PURGE_DAYS = 30;

/**
 * Obtiene los elementos actuales en la papelera
 */
export const getTrashItems = () => {
  return getLocalStorage(TRASH_KEY, []);
};

/**
 * Realiza un borrado suave (Soft Delete) de un elemento de cualquier módulo del sistema
 * @param {string} moduleKey - Nombre de la llave de almacenamiento (ej. "ordenes", "clientes", "workshopInventory")
 * @param {object} itemData - Registro completo a eliminar
 * @param {string} user - Nombre del usuario que realiza la acción
 * @param {string} reason - Motivo opcional de la eliminación
 */
export const softDelete = async (moduleKey, itemData, user = 'Usuario', reason = '') => {
  if (!moduleKey || !itemData) {
    throw new Error("Módulo y datos del registro son requeridos para Soft Delete.");
  }

  const itemId = itemData.id || itemData.codigo || itemData.placa || itemData.uuid;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AUTO_PURGE_DAYS * 24 * 60 * 60 * 1000);

  const trashEntry = {
    id: `trash_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    moduleKey,
    originalId: itemId,
    deletedAt: now.toISOString(),
    deletedBy: user || 'Sistema',
    reason: reason || 'Eliminación manual',
    expiresAt: expiresAt.toISOString(),
    originalData: itemData
  };

  // 1. Agregar a Papelera
  const trashItems = getTrashItems();
  const updatedTrash = [trashEntry, ...trashItems];
  setLocalStorage(TRASH_KEY, updatedTrash);
  await syncKeyToCloud(TRASH_KEY, updatedTrash);

  // 2. Remover del módulo fuente
  const sourceList = getLocalStorage(moduleKey, []);
  if (Array.isArray(sourceList)) {
    const updatedSource = sourceList.filter(item => {
      const id = item.id || item.codigo || item.placa || item.uuid;
      return id !== itemId;
    });
    setLocalStorage(moduleKey, updatedSource);
    await syncKeyToCloud(moduleKey, updatedSource);
  }

  return trashEntry;
};

/**
 * Restaura un ítem de la papelera a su módulo original
 * @param {string} trashId - ID único de la entrada en papelera
 */
export const restoreItem = async (trashId) => {
  const trashItems = getTrashItems();
  const entry = trashItems.find(t => t.id === trashId);

  if (!entry) {
    throw new Error("El elemento especificado no existe en la papelera.");
  }

  const { moduleKey, originalData } = entry;

  // 1. Reinsertar en el módulo de origen
  const sourceList = getLocalStorage(moduleKey, []);
  let updatedSource = [];
  if (Array.isArray(sourceList)) {
    // Evitar duplicados si por alguna razón ya existe
    const itemId = originalData.id || originalData.codigo || originalData.placa || originalData.uuid;
    const exists = sourceList.some(i => (i.id || i.codigo || i.placa || i.uuid) === itemId);
    if (!exists) {
      updatedSource = [originalData, ...sourceList];
    } else {
      updatedSource = sourceList;
    }
  } else {
    updatedSource = [originalData];
  }

  setLocalStorage(moduleKey, updatedSource);
  await syncKeyToCloud(moduleKey, updatedSource);

  // 2. Eliminar de la papelera
  const updatedTrash = trashItems.filter(t => t.id !== trashId);
  setLocalStorage(TRASH_KEY, updatedTrash);
  await syncKeyToCloud(TRASH_KEY, updatedTrash);

  return { moduleKey, restoredData: originalData };
};

/**
 * Elimina definitivamente un ítem de la papelera
 * @param {string} trashId - ID único de la entrada en papelera
 */
export const permanentDelete = async (trashId) => {
  const trashItems = getTrashItems();
  const updatedTrash = trashItems.filter(t => t.id !== trashId);

  setLocalStorage(TRASH_KEY, updatedTrash);
  await syncKeyToCloud(TRASH_KEY, updatedTrash);

  return true;
};

/**
 * Vacía completamente la papelera de reciclaje
 */
export const emptyTrash = async () => {
  setLocalStorage(TRASH_KEY, []);
  await syncKeyToCloud(TRASH_KEY, []);
  return true;
};

/**
 * Purga automáticamente ítems con más de 30 días de antigüedad
 */
export const autoPurgeTrash = async () => {
  const trashItems = getTrashItems();
  const now = new Date().getTime();

  const validItems = trashItems.filter(item => {
    if (!item.expiresAt) return true;
    return new Date(item.expiresAt).getTime() > now;
  });

  if (validItems.length !== trashItems.length) {
    setLocalStorage(TRASH_KEY, validItems);
    await syncKeyToCloud(TRASH_KEY, validItems);
    console.log(`[TrashService] Purga automática completada. Eliminados ${trashItems.length - validItems.length} ítems expirados.`);
  }
};
