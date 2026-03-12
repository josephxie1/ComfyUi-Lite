import { Configuration } from 'electron-builder';

const debugConfig: Configuration = {
  files: ['node_modules', 'package.json', '.vite/**'],
  extraResources: [
    { from: './assets/ComfyUI', to: 'ComfyUI' },
    { from: './assets/uv', to: 'uv' },
    { from: './assets/UI', to: 'UI' },
    { from: './assets/desktop-ui', to: 'desktop-ui' },
  ],
  beforeBuild: './scripts/preMake.js',
  win: {
    icon: './assets/UI/Comfy_Logo.ico',
    target: 'zip',
    signtoolOptions: null,
  },
  mac: {
    icon: './assets/UI/ComfyUI_Lite.icns',
    target: 'dmg',
    identity: 'dengcheng xie (TS24L3Q4NA)',
    hardenedRuntime: true,
    entitlements: null,
    entitlementsInherit: null,
    notarize: true,
  },
  linux: {
    icon: './assets/UI/Comfy_Logo_x256.png',
    target: 'appimage',
  },
  asarUnpack: ['**/node_modules/node-pty/**/*'],
};

export default debugConfig;
