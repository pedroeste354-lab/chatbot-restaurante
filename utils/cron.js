import cron from 'node-cron';
import { sendDailyReport } from './daily-report.js';
import { getConfig } from './config.js';

export function startCron() {
  // Runs every minute, checks if it matches the configured send hour
  cron.schedule('* * * * *', async () => {
    const config = getConfig();
    const hora = config.report_hora || '08:00';
    const [hh, mm] = hora.split(':');
    const now = new Date();
    if (String(now.getHours()).padStart(2,'0') === hh &&
        String(now.getMinutes()).padStart(2,'0') === mm) {
      try { await sendDailyReport(); }
      catch (e) { console.error('[cron] Error enviando informe:', e.message); }
    }
  });
  console.log('[cron] Informe diario programado');
}
