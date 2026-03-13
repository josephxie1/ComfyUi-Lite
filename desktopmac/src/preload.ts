import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktopAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getState: () => ipcRenderer.invoke('get-state'),
  startInstall: (path: string) => ipcRenderer.invoke('start-install', path),
  startServer: () => ipcRenderer.invoke('start-server'),
  repairEnvironment: () => ipcRenderer.invoke('repair-environment'),
  checkPath: (p: string) => ipcRenderer.invoke('check-path', p),
  openLogFile: () => ipcRenderer.invoke('open-log-file'),
  onLog: (callback: (msg: string) => void) => {
    ipcRenderer.on('log', (_event, msg) => callback(msg));
  },
  onStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('status', (_event, status) => callback(status));
  },
});
