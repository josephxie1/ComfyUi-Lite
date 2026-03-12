/**
 * ComfyUI Lite: Telemetry stub - no-op implementation.
 * Replaces Mixpanel dependency.
 */
import log from 'electron-log/main';

import { strictIpcMain as ipcMain } from '@/infrastructure/ipcChannels';

import { IPC_CHANNELS } from '../constants';
import { AppWindow } from '../main-process/appWindow';
import type { DesktopConfig } from '../store/desktopConfig';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface PropertyDict {
  [key: string]: unknown;
}

export interface ITelemetry {
  hasConsent: boolean;
  loadGenerationCount(config: DesktopConfig): void;
  track(eventName: string, properties?: PropertyDict): void;
  flush(): void;
  registerHandlers(): void;
}

class NoopTelemetry implements ITelemetry {
  public hasConsent: boolean = false;

  loadGenerationCount(_config: DesktopConfig): void {
    // no-op
  }

  track(eventName: string, _properties?: PropertyDict): void {
    log.debug(`[Telemetry stub] track: ${eventName}`);
  }

  flush(): void {
    // no-op
  }

  registerHandlers(): void {
    // Still register IPC handlers so the frontend doesn't error
    ipcMain.on(IPC_CHANNELS.TRACK_EVENT, () => {});
    ipcMain.on(IPC_CHANNELS.INCREMENT_USER_PROPERTY, () => {});
  }
}

let instance: ITelemetry | null = null;

export function getTelemetry(): ITelemetry {
  if (!instance) {
    instance = new NoopTelemetry();
  }
  return instance;
}

export interface HasTelemetry {
  telemetry: ITelemetry;
}

/**
 * No-op decorator - preserves interface but does nothing extra.
 */
export function trackEvent<T extends HasTelemetry>(_eventName: string) {
  type DecoratedMethod = (this: T, ...args: never[]) => Promise<void>;
  type MethodDescriptor = TypedPropertyDescriptor<DecoratedMethod>;

  return (_target: T, _propertyKey: string, descriptor: MethodDescriptor) => {
    return descriptor;
  };
}

/** @returns Whether the user has consented to sending metrics. Always true for Lite. */
export async function promptMetricsConsent(_store: DesktopConfig, _appWindow: AppWindow): Promise<boolean> {
  return false;
}
