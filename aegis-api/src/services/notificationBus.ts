import logger from '../utils/logger';
import env from '../config/env';

/**
 * Notification bus — emits auth events via HTTP POST to the notification service.
 * Agent 6 consumes these events and handles delivery (push, email, SMS).
 * Auth never sends notifications directly.
 */

export const EVENTS = Object.freeze({
  ACCOUNT_LOCKED: 'account_locked',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',
  LOGIN_NEW_DEVICE: 'login_new_device',
});

/**
 * Emit an event to the notification bus.
 * Fire-and-forget — failures are logged but never block auth flows.
 */
export async function emit(
  event: string,
  userId: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const body = {
    event,
    user_id: userId,
    timestamp: new Date().toISOString(),
    payload,
  };

  try {
    const url = `${env.NOTIFICATION_SERVICE_URL}/notifications/internal/emit`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-secret': env.INTERNAL_SERVICE_SECRET,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      logger.warn('Notification bus emit failed', { event, status: res.status });
    }
  } catch (err: unknown) {
    // Non-fatal — notification service may not be running in dev
    const error = err as Error;
    logger.warn('Notification bus unreachable', { event, error: error.message });
  }
}

export default { emit, EVENTS };
