import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';

/**
 * ComfyUI Lite: Instead of downloading from GitHub releases,
 * extract the frontend from the local releases/ wheel file.
 */

const releasesDir = path.resolve(import.meta.dirname, '..', '..', 'releases');
const extractPath = 'assets/ComfyUI/web_custom_versions/desktop_app';

async function extractFrontendFromWheel() {
  // Find the frontend wheel in releases/
  const files = await fs.readdir(releasesDir);
  const wheelFile = files.find(f => f.startsWith('comfyui_lite_frontend') && f.endsWith('.whl'));

  if (!wheelFile) {
    console.error('ERROR: No comfyui_lite_frontend wheel found in releases/ directory.');
    console.error('Run the frontend build first: cd ComfyUI_frontend/pip_package && python -m build --wheel');
    process.exit(1);
  }

  const wheelPath = path.join(releasesDir, wheelFile);
  console.log(`Extracting frontend from ${wheelFile}...`);

  // Create target directory
  await fs.mkdir(extractPath, { recursive: true });

  // Extract the static files from the wheel (it's just a zip)
  // The frontend static files are at comfyui_frontend_package/static/ inside the wheel
  const tmpDir = 'temp_frontend_extract';
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    execSync(`unzip -o -q "${wheelPath}" "comfyui_frontend_package/static/*" -d "${tmpDir}"`, {
      encoding: 'utf8'
    });

    // Move static files to the target path
    const staticSrc = path.join(tmpDir, 'comfyui_frontend_package', 'static');
    const srcFiles = await fs.readdir(staticSrc);

    for (const file of srcFiles) {
      await fs.cp(
        path.join(staticSrc, file),
        path.join(extractPath, file),
        { recursive: true }
      );
    }

    console.log(`Frontend extracted to ${extractPath} (${srcFiles.length} items)`);
  } finally {
    // Cleanup
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

// Also copy desktop-ui if available
async function copyDesktopUI() {
  const desktopUiSource = 'node_modules/@comfyorg/desktop-ui/dist';
  const desktopUiTarget = 'assets/desktop-ui';

  try {
    await fs.access(desktopUiSource);
    await fs.mkdir(desktopUiTarget, { recursive: true });
    await fs.cp(desktopUiSource, desktopUiTarget, { recursive: true });
    console.log('Desktop UI copied successfully!');
  } catch {
    console.warn('Desktop UI package not found, skipping...');
  }
}

await extractFrontendFromWheel();
await copyDesktopUI();
