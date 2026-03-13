import { Configuration } from 'electron-builder';

const config: Configuration = {
  files: ['.vite/**'],
  extraResources: [
    { from: './assets/ComfyUI', to: 'ComfyUI' },
    { from: './assets/uv', to: 'uv' },
    { from: './assets/UI', to: 'UI' },
    { from: './assets/requirements', to: 'requirements' },
  ],
  beforeBuild: './scripts/preMake.js',
  mac: {
    icon: './assets/UI/ComfyUI_Lite.icns',
    target: 'dmg',
    identity: 'dengcheng xie (TS24L3Q4NA)',
    hardenedRuntime: true,
    entitlements: null,
    entitlementsInherit: null,
    notarize: false,
  },
  win: {
    icon: './assets/UI/Comfy_Logo.ico',
    target: 'zip',
  },
  linux: {
    icon: './assets/UI/Comfy_Logo_x256.png',
    target: 'appimage',
  },
};

export default config;
