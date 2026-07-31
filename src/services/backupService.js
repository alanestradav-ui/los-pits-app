// src/services/backupService.js
import { getAppSnapshot, restoreAppSnapshot } from './dataService';
import { getLocalStorage, setLocalStorage } from '../utils/storage';
import { syncKeyToCloud } from '../utils/supabase';

const BACKUP_KEY = "systemSnapshots";
const HOURLY_INTERVAL_MS = 60 * 60 * 1000; // 1 Hora

/**
 * Obtiene la lista actual de respaldos almacenados
 */
export const getBackupsList = () => {
  return getLocalStorage(BACKUP_KEY, []);
};

/**
 * Aplica la política de retención rotativa a la lista de respaldos:
 * - Mantener horarios (últimas 24h)
 * - Mantener 1 por día (últimos 7 días)
 * - Mantener 1 por semana (últimos 30 días)
 */
export const applyRetentionPolicy = (backups) => {
  if (!Array.isArray(backups) || backups.length === 0) return [];

  const now = new Date().getTime();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS = 7 * ONE_DAY;
  const THIRTY_DAYS = 30 * ONE_DAY;

  // Ordenar de más reciente a más antiguo
  const sorted = [...backups].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const retained = [];
  const daysSeen = new Set();
  const weeksSeen = new Set();

  sorted.forEach(bk => {
    const age = now - new Date(bk.timestamp).getTime();
    const dateObj = new Date(bk.timestamp);
    const dayKey = dateObj.toISOString().split('T')[0];
    const weekKey = `${dateObj.getFullYear()}-W${Math.ceil((dateObj.getDate() + dateObj.getDay()) / 7)}`;

    if (age <= ONE_DAY) {
      // Retener todos los respaldos dentro de las últimas 24 horas (máximo 24)
      retained.push(bk);
    } else if (age <= SEVEN_DAYS) {
      // Retener el primero (más reciente) de cada día
      if (!daysSeen.has(dayKey)) {
        daysSeen.add(dayKey);
        retained.push(bk);
      }
    } else if (age <= THIRTY_DAYS) {
      // Retener el primero (más reciente) de cada semana
      if (!weeksSeen.has(weekKey)) {
        weeksSeen.add(weekKey);
        retained.push(bk);
      }
    }
  });

  return retained;
};

/**
 * Crea un respaldo (Snapshot) del sistema completo
 */
export const createBackup = async (type = 'auto', note = '') => {
  try {
    const snapshot = getAppSnapshot();
    const backupEntry = {
      id: `bk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      type, // 'auto', 'manual', 'pre_restore'
      note: note || (type === 'auto' ? 'Respaldo Horario Automático' : 'Respaldo Manual'),
      snapshot
    };

    const currentList = getBackupsList();
    const updatedList = [backupEntry, ...currentList];
    const prunedList = applyRetentionPolicy(updatedList);

    setLocalStorage(BACKUP_KEY, prunedList);
    await syncKeyToCloud(BACKUP_KEY, prunedList);

    console.log(`[BackupService] Respaldo de tipo "${type}" creado exitosamente. Total almacenados: ${prunedList.length}`);
    return backupEntry;
  } catch (error) {
    console.error("[BackupService] Error al crear respaldo:", error);
    throw error;
  }
};

/**
 * Revisa el tiempo transcurrido desde el último respaldo automático y genera uno si pasó >= 1 hora
 */
export const checkAndCreateHourlyBackup = async () => {
  try {
    const backups = getBackupsList();
    const autoBackups = backups.filter(b => b.type === 'auto');
    
    if (autoBackups.length > 0) {
      const lastBackup = autoBackups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      const elapsed = Date.now() - new Date(lastBackup.timestamp).getTime();

      if (elapsed < HOURLY_INTERVAL_MS) {
        // Aún no ha pasado 1 hora
        return null;
      }
    }

    return await createBackup('auto', 'Respaldo Horario Automático');
  } catch (err) {
    console.error("[BackupService] Error comprobando respaldo horario:", err);
    return null;
  }
};

/**
 * Inicializa el Scheduler Horario que verifica cada 5 minutos si corresponde hacer un respaldo de 1 hora
 */
let backupIntervalId = null;

export const initHourlyBackupScheduler = () => {
  if (backupIntervalId) clearInterval(backupIntervalId);

  // Ejecutar verificación inicial inmediata
  checkAndCreateHourlyBackup();

  // Verificar periódicamente cada 5 minutos
  backupIntervalId = setInterval(() => {
    checkAndCreateHourlyBackup();
  }, 5 * 60 * 1000);

  return () => {
    if (backupIntervalId) clearInterval(backupIntervalId);
  };
};

/**
 * Descarga una copia de seguridad como archivo JSON
 */
export const exportBackupToFile = (backupEntry) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupEntry, null, 2));
  const downloadAnchor = document.createElement('a');
  const filename = `LosPits_Backup_${new Date(backupEntry.timestamp).toISOString().replace(/[:.]/g, '-')}.json`;
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

/**
 * Restaura el sistema desde un objeto de respaldo
 */
export const restoreFromBackup = async (backupEntry) => {
  if (!backupEntry || !backupEntry.snapshot) {
    throw new Error("El respaldo no contiene un snapshot válido.");
  }

  // Crear un respaldo de seguridad pre-restauración
  await createBackup('pre_restore', 'Snapshot de seguridad antes de restauración');

  // Restaurar datos
  await restoreAppSnapshot(backupEntry.snapshot, true);
  return true;
};
