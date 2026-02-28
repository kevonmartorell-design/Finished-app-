import cron from 'node-cron';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import env from '../config/env';

/**
 * Auto-logout after 30 days of inactivity.
 * Runs daily at 02:00 UTC. Deletes all refresh_token rows where
 * last_active_at is older than REFRESH_TOKEN_INACTIVITY_DAYS days.
 */

export async function expireInactiveSessions(): Promise<void> {
  const cutoff = new Date(
    Date.now() - env.REFRESH_TOKEN_INACTIVITY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  logger.info('Running inactivity session cleanup', { cutoff });

  const { data, error } = await supabase
    .from('refresh_tokens')
    .delete()
    .lt('last_active_at', cutoff)
    .select('id');

  if (error) {
    logger.error('Inactivity job failed', { error: error.message });
    return;
  }

  const count = data?.length || 0;
  if (count > 0) {
    logger.info('Expired inactive sessions', { count });
  }
}

export function startInactivityJob(): void {
  cron.schedule('0 2 * * *', async () => {
    await expireInactiveSessions();
  });

  logger.info('Inactivity session cleanup job scheduled (daily at 02:00 UTC)');
}
