import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';

// ─── File Logger: one file per session ───
const logDir = path.join(os.homedir(), 'Library', 'Logs', 'ComfyUI Lite');
fs.mkdirSync(logDir, { recursive: true });
const sessionTime = new Date().toISOString().replace(/[T:]/g, '_').replace(/\..+/, '');
const logFilePath = path.join(logDir, `comfyui-lite_${sessionTime}.log`);
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

function fileLog(...args: any[]): void {
  const timestamp = new Date().toISOString();
  const msg = `[${timestamp}] ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}`;
  logStream.write(msg + '\n');
  console.log(...args);
}

// Clean up logs older than 7 days
try {
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  for (const f of fs.readdirSync(logDir)) {
    if (f.startsWith('comfyui-lite_') && f.endsWith('.log') && f !== path.basename(logFilePath)) {
      const filePath = path.join(logDir, f);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAge) fs.unlinkSync(filePath);
    }
  }
} catch {}

// ─── Paths ───
const isDev = !app.isPackaged;
const resourcesPath = isDev
  ? path.resolve(__dirname, '..', '..')  // .vite/build/ → desktopmac/ root
  : process.resourcesPath;

const comfyUIPath = isDev
  ? path.resolve(__dirname, '..', '..', '..') // .vite/build/ → desktopmac/ → ComfyUI/
  : path.join(resourcesPath, 'ComfyUI');

const uvPath = isDev
  ? path.join(resourcesPath, 'assets', 'uv', process.platform === 'darwin' ? 'macos' : 'windows', 'uv')
  : path.join(resourcesPath, 'uv', process.platform === 'darwin' ? 'macos' : 'windows', 'uv');
const requirementsCompiledPath = isDev
  ? path.join(resourcesPath, 'assets', 'requirements', 'macos.compiled')
  : path.join(resourcesPath, 'requirements', 'macos.compiled');
const installHtmlPath = path.join(__dirname, 'install.html');

const COMFY_PORT = 8088;

// ─── Startup diagnostics ───
fileLog('[main] isDev:', isDev);
fileLog('[main] resourcesPath:', resourcesPath);
fileLog('[main] comfyUIPath:', comfyUIPath);
fileLog('[main] uvPath:', uvPath);
fileLog('[main] requirementsCompiledPath:', requirementsCompiledPath);
fileLog('[main] installHtmlPath:', installHtmlPath);

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

// ─── Window ───
function createWindow(): BrowserWindow {
  const { width: screenW, height: screenH } = require('electron').screen.getPrimaryDisplay().workAreaSize;
  const winWidth = Math.min(Math.max(Math.round(screenW * 0.75), 1024), 1920);
  const winHeight = Math.min(Math.max(Math.round(screenH * 0.75), 680), 1200);

  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    // Use native macOS title bar (same as official ComfyUI Desktop)
    backgroundColor: '#0a0a0a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
    // Open DevTools in dev mode
    if (!app.isPackaged) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Allow OAuth login popups (Comfy.org uses popup-based authentication)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://dreamboothy.firebaseapp.com/') ||
        url.startsWith('https://checkout.comfy.org/') ||
        url.includes('comfy.org')) {
      return { action: 'allow' };
    }
    // Open other external URLs in system browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadFile(installHtmlPath);
  return win;
}

// ─── Helpers ───
function getBasePath(): string {
  const stored = getStoredBasePath();
  if (stored) return stored;
  return path.join(app.getPath('home'), 'Documents', 'ComfyUILite');
}

function getStoredBasePath(): string | null {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return data.basePath ?? null;
  } catch {
    return null;
  }
}

function saveBasePath(basePath: string): void {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({ basePath }, null, 2));
}

function getVenvPath(basePath: string): string {
  return path.join(basePath, '.venv');
}

function getPythonPath(basePath: string): string {
  const venv = getVenvPath(basePath);
  return process.platform === 'win32'
    ? path.join(venv, 'Scripts', 'python.exe')
    : path.join(venv, 'bin', 'python');
}

function isInstalled(basePath: string): boolean {
  return fs.existsSync(getPythonPath(basePath));
}

function sendLog(msg: string): void {
  fileLog('[log]', msg);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log', msg);
  }
}

function sendStatus(status: string): void {
  fileLog('[status]', status);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status', status);
  }
}

// ─── Run uv command ───
function runUv(args: string[], basePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      VIRTUAL_ENV: getVenvPath(basePath),
      UV_PYTHON_PREFERENCE: 'managed',
    };

    sendLog(`$ uv ${args.join(' ')}`);
    const proc = spawn(uvPath, args, { env, cwd: basePath });

    proc.stdout?.on('data', (data: Buffer) => {
      data.toString().split('\n').filter(Boolean).forEach(line => sendLog(line));
    });
    proc.stderr?.on('data', (data: Buffer) => {
      data.toString().split('\n').filter(Boolean).forEach(line => sendLog(line));
    });
    proc.on('close', (code) => resolve(code ?? 1));
    proc.on('error', (err) => reject(err));
  });
}

// ─── Install ───
async function install(basePath: string): Promise<boolean> {
  try {
    fs.mkdirSync(basePath, { recursive: true });
    saveBasePath(basePath);

    const venvPath = getVenvPath(basePath);

    // Step 1: Remove existing venv if present (clean install)
    if (fs.existsSync(venvPath)) {
      sendLog('Removing existing virtual environment...');
      fs.rmSync(venvPath, { recursive: true, force: true });
    }

    // Step 2: Create venv with managed python
    sendStatus('creating-venv');
    sendLog('Creating Python virtual environment...');
    const venvCode = await runUv(
      ['venv', venvPath, '--python', '3.12', '--python-preference', 'only-managed'],
      basePath
    );
    if (venvCode !== 0) { sendLog('❌ Failed to create venv'); return false; }
    sendLog('✅ Virtual environment created');

    // Step 3: Install from compiled requirements (only what ComfyUI Lite needs, NO torch)
    sendStatus('installing-requirements');
    sendLog('Installing dependencies...');
    const reqFile = fs.existsSync(requirementsCompiledPath)
      ? requirementsCompiledPath
      : path.join(comfyUIPath, 'requirements.txt');
    sendLog(`Using: ${reqFile}`);
    const installCode = await runUv(['pip', 'install', '-r', reqFile], basePath);
    if (installCode !== 0) { sendLog('❌ Failed to install requirements'); return false; }
    sendLog('✅ Dependencies installed');

    // Step 4: Create output/input/user directories
    for (const dir of ['output', 'input', 'user', 'custom_nodes', 'models']) {
      fs.mkdirSync(path.join(basePath, dir), { recursive: true });
    }
    // Create default user data files to prevent 404s
    // ComfyUI stores user data under user/{user_id}/ — default user is "default"
    const userDir = path.join(basePath, 'user', 'default');
    fs.mkdirSync(userDir, { recursive: true });
    fs.mkdirSync(path.join(userDir, 'workflows'), { recursive: true });
    fs.mkdirSync(path.join(userDir, 'subgraphs'), { recursive: true });
    const defaults: Record<string, string> = {
      'user.css': '/* Custom user styles */\n',
      'comfy.templates.json': '[]',
      'comfy.settings.json': JSON.stringify({
        'Comfy.UseNewMenu': 'Top',
        'Comfy.Locale': 'zh',
      }, null, 2),
      [path.join('workflows', '.covers.json')]: '{}',
    };
    for (const [file, content] of Object.entries(defaults)) {
      const fp = path.join(userDir, file);
      if (!fs.existsSync(fp)) fs.writeFileSync(fp, content);
    }
    sendLog('✅ Directories created');

    sendStatus('installed');
    sendLog('🎉 Installation complete!');
    return true;
  } catch (err: any) {
    sendLog(`❌ Error: ${err.message}`);
    return false;
  }
}

// ─── Start ComfyUI Server ───
async function startServer(basePath: string): Promise<void> {
  sendStatus('starting');
  sendLog('Starting ComfyUI server...');

  const pythonPath = getPythonPath(basePath);
  const mainPy = path.join(comfyUIPath, 'main.py');

  serverProcess = spawn(pythonPath, [
    mainPy,
    '--listen', '127.0.0.1',
    '--port', String(COMFY_PORT),
    '--base-directory', basePath,
  ], {
    cwd: comfyUIPath,
    env: {
      ...process.env,
      VIRTUAL_ENV: getVenvPath(basePath),
      PATH: `${path.dirname(pythonPath)}:${process.env.PATH}`,
    },
  });

  serverProcess.stdout?.on('data', (data: Buffer) => {
    data.toString().split('\n').filter(Boolean).forEach(line => sendLog(line));
  });
  serverProcess.stderr?.on('data', (data: Buffer) => {
    data.toString().split('\n').filter(Boolean).forEach(line => sendLog(line));
  });
  serverProcess.on('close', (code) => {
    sendLog(`Server exited with code ${code}`);
    sendStatus('stopped');
  });

  // Wait for port to be ready
  sendLog('Waiting for server to be ready...');
  await waitForPort(COMFY_PORT, 60_000);
  sendLog('✅ Server is ready!');
  sendStatus('running');

  // Load ComfyUI in the window
  if (mainWindow && !mainWindow.isDestroyed()) {
    await mainWindow.loadURL(`http://127.0.0.1:${COMFY_PORT}`);

  }
}

function waitForPort(port: number, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    const check = () => {
      const socket = new net.Socket();
      socket.setTimeout(500);
      socket.once('connect', () => { socket.destroy(); resolve(); });
      socket.once('error', () => { socket.destroy(); retry(); });
      socket.once('timeout', () => { socket.destroy(); retry(); });
      socket.connect(port, '127.0.0.1');
    };
    const retry = () => {
      if (Date.now() > deadline) return reject(new Error('Server startup timeout'));
      setTimeout(check, 500);
    };
    check();
  });
}

// ─── IPC Handlers ───
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select ComfyUI Lite Install Location',
    defaultPath: getBasePath(),
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('get-state', () => {
  const basePath = getBasePath();
  return {
    basePath,
    installed: isInstalled(basePath),
  };
});

ipcMain.handle('start-install', async (_event, chosenPath: string) => {
  const success = await install(chosenPath);
  if (success) {
    await startServer(chosenPath);
  }
  return success;
});

ipcMain.handle('start-server', async () => {
  const basePath = getBasePath();
  if (isInstalled(basePath)) {
    await startServer(basePath);
    return true;
  }
  return false;
});

ipcMain.handle('open-log-file', async () => {
  shell.showItemInFolder(logFilePath);
});

ipcMain.handle('check-path', async (_event, p: string) => {
  const homedir = require('os').homedir();
  const resolved = p.startsWith('~') ? path.join(homedir, p.slice(1)) : p;
  return fs.existsSync(resolved);
});

ipcMain.handle('repair-environment', async () => {
  const basePath = getBasePath();
  sendLog('🔧 Starting environment repair...');

  // Kill running server if any
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }

  // Delete venv
  const venvPath = getVenvPath(basePath);
  sendLog(`Removing ${venvPath}...`);
  try { fs.rmSync(venvPath, { recursive: true, force: true }); } catch {}
  sendLog('✅ Old environment removed');

  // Reinstall
  const success = await install(basePath);
  if (success) {
    await startServer(basePath);
  }
  return success;
});

// ─── App Lifecycle ───
let isQuitting = false;

app.whenReady().then(() => {
  mainWindow = createWindow();

  // Force close even if frontend has beforeunload handler
  mainWindow.webContents.on('will-prevent-unload', (event) => {
    event.preventDefault();
  });

  mainWindow.on('close', () => {
    if (!isQuitting) {
      isQuitting = true;
      serverProcess?.kill();
      serverProcess = null;
      app.quit();
    }
  });
});

app.on('window-all-closed', () => {
  serverProcess?.kill();
  serverProcess = null;
  app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
  serverProcess?.kill();
  serverProcess = null;
});
