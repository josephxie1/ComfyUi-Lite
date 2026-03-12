/**
 * ComfyUI Lite: Sentry stub - no-op implementation.
 * Replaces @sentry/electron dependency.
 */
import log from 'electron-log/main';

export function captureSentryException(error: unknown, eventName: string): string {
  log.debug(`[Sentry stub] Captured exception for ${eventName}:`, error);
  return '';
}

class SentryLogging {
  getBasePath?: () => string | undefined;

  init() {
    log.debug('[Sentry stub] init called - no-op');
  }

  async setSentryGpuContext(): Promise<void> {
    log.debug('[Sentry stub] setSentryGpuContext called - no-op');
  }
}

export default new SentryLogging();
