import fs from 'fs-extra';
import { execSync } from 'node:child_process';
import * as path from 'node:path';

/**
 * preMake: Sync ComfyUI Lite source + wheels into assets/ComfyUI before packaging.
 */
const preMake = () => {
  if (process.env.CI) return;

  const comfyLiteSource = path.resolve(import.meta.dirname, '..', '..');
  const assetsComfyPath = path.join('assets', 'ComfyUI');

  // Always re-sync
  if (fs.existsSync(assetsComfyPath)) {
    console.log('Removing old ComfyUI assets...');
    fs.removeSync(assetsComfyPath);
  }

  console.log(`Syncing ComfyUI Lite from ${comfyLiteSource}...`);
  fs.mkdirSync(assetsComfyPath, { recursive: true });

  const excludes = [
    '.git', '.gitignore', '.github', 'node_modules', 'desktop', 'desktopmac',
    'comfy_lite', '__pycache__', '*.pyc', '.venv',
    'ComfyUI_frontend', 'releases',
    'output', 'input', 'tests', 'tests-unit',
    'web_custom_versions', '*.egg-info', '.gemini',
  ].map(e => `--exclude=${e}`).join(' ');

  execSync(`rsync -a ${excludes} ${comfyLiteSource}/ ${assetsComfyPath}/`, { stdio: 'inherit' });

  // Copy wheel files
  const releasesSource = path.join(comfyLiteSource, 'releases');
  const releasesDest = path.join(assetsComfyPath, 'releases');
  if (fs.existsSync(releasesSource)) {
    fs.mkdirSync(releasesDest, { recursive: true });
    const wheels = fs.readdirSync(releasesSource).filter(f => f.endsWith('.whl'));
    for (const whl of wheels) {
      fs.copyFileSync(path.join(releasesSource, whl), path.join(releasesDest, whl));
      console.log(`  Copied: ${whl}`);
    }
  }

  // Copy install.html to build output
  const installHtml = path.join('src', 'install.html');
  const buildDir = path.join('.vite', 'build');
  if (fs.existsSync(installHtml)) {
    fs.mkdirSync(buildDir, { recursive: true });
    fs.copyFileSync(installHtml, path.join(buildDir, 'install.html'));
    console.log('  Copied: install.html → .vite/build/');
  }

  console.log('✅ Assets prepared!');
};

export default preMake;
