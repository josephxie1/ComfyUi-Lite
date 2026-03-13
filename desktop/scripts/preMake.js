import fs from 'fs-extra';
import { spawnSync } from 'node:child_process';
import * as os from 'node:os';
import process from 'node:process';

/** @param {{ appOutDir, packager, outDir }} arg0 */
const preMake = () => {
  const firstInstallOnToDesktopServers = process.env.TODESKTOP_CI && process.env.TODESKTOP_INITIAL_INSTALL_PHASE;
  // Do NOT run on CI
  if (process.env.CI || firstInstallOnToDesktopServers) return;

  const isNvidia = process.argv.at(-1) === '--nvidia';

  console.log(`<BUILDING COMFYCLI ON ${os.platform()} ${isNvidia && 'Nvidia Ver'}>`);

  // Always re-sync ComfyUI source to pick up code changes
  if (fs.existsSync('./assets/ComfyUI')) {
    console.log('>REMOVING OLD COMFYUI ASSETS<');
    fs.removeSync('./assets/ComfyUI');
  }

  if (os.platform() === 'darwin') {
    spawnSync('yarn run make:assets', [''], { shell: true, stdio: 'inherit' });
  }

  if (os.platform() === 'win32') {
    const result = spawnSync(
      `python -c "import os,sysconfig;print(sysconfig.get_path(""scripts"",f""{os.name}_user""))"`,
      [''],
      { shell: true, stdio: 'pipe' }
    ).stdout.toString();
    const localPythonModulePath = `PATH=${result.replaceAll('\\', '\\\\').trim()};%PATH%`;
    spawnSync(`set ${localPythonModulePath} && yarn run make:assets`, [''], {
      shell: true,
      stdio: 'inherit',
    });
  }
  console.log('>PREMAKE FINISH<');
};
export default preMake;
