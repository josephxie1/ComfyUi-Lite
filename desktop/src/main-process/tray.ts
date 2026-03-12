import { app, Menu, nativeImage, Tray } from 'electron';
import log from 'electron-log/main';
import path from 'node:path';

let tray: Tray | null = null;

/**
 * Create a macOS menu bar tray icon with restart/quit actions.
 * @param onRestart Callback to restart the ComfyUI server.
 */
export function createTray(onRestart?: () => Promise<void>): Tray {
  // Resolve tray icon path (in assets/UI/ at runtime, extraResources at packaged)
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'UI', 'trayIcon.png')
    : path.join(__dirname, '..', '..', 'assets', 'UI', 'trayIcon.png');

  const icon = nativeImage.createFromPath(iconPath);
  // macOS: mark as template so it adapts to light/dark menu bar
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip('ComfyUI Lite');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'ComfyUI Lite',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '重启服务',
      click: async () => {
        log.info('Tray: Restart requested');
        if (onRestart) {
          await onRestart();
        } else {
          app.relaunch();
          app.quit();
        }
      },
    },
    {
      label: '打开窗口',
      click: () => {
        // Focus the main window
        const windows = require('electron').BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          windows[0].show();
          windows[0].focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        log.info('Tray: Quit requested');
        app.quit();
        // Force exit after 3 seconds if quit is blocked
        setTimeout(() => {
          log.warn('Tray: Force exiting after timeout');
          app.exit(0);
        }, 3000);
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // macOS: clicking the tray icon shows the context menu by default
  tray.on('click', () => {
    tray?.popUpContextMenu();
  });

  log.info('Tray icon created');
  return tray;
}
