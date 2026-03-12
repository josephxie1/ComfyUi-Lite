import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * ComfyUI Lite: Instead of cloning from GitHub, copy the local ComfyUI Lite source.
 * The source is expected to be at ../  (parent directory of desktop/).
 */

const comfyLiteSource = path.resolve(import.meta.dirname, '..', '..');
const assetsComfyPath = path.join('assets', 'ComfyUI');

console.log(`Copying ComfyUI Lite from ${comfyLiteSource} to ${assetsComfyPath}...`);

// Ensure target directory exists
fs.mkdirSync(assetsComfyPath, { recursive: true });

// Use rsync to copy, excluding unnecessary directories
const excludes = [
  '.git',
  '.gitignore',
  '.github',
  'node_modules',
  'desktop',
  'comfy_lite',
  '__pycache__',
  '*.pyc',
  '.venv',
  // Frontend source not needed (built frontend is extracted from wheel separately)
  'ComfyUI_frontend',
  // Workflow templates source not needed (installed via pip packages at runtime)
  'workflow_templates',
  // Pre-built wheel files not needed inside the app
  'releases',
  // User data directories
  'output',
  'input',
  // Test files
  'tests',
  'tests-unit',
  // Other unnecessary files
  'web_custom_versions',
  '*.egg-info',
  '.gemini',
].map(e => `--exclude=${e}`).join(' ');

execAndLog(`rsync -a ${excludes} ${comfyLiteSource}/ ${assetsComfyPath}/`);

// Copy wheel files from releases/ so they can be pip-installed at runtime
const releasesSource = path.join(comfyLiteSource, 'releases');
const releasesDest = path.join(assetsComfyPath, 'releases');
if (fs.existsSync(releasesSource)) {
  fs.mkdirSync(releasesDest, { recursive: true });
  const wheels = fs.readdirSync(releasesSource).filter(f => f.endsWith('.whl'));
  for (const whl of wheels) {
    fs.copyFileSync(path.join(releasesSource, whl), path.join(releasesDest, whl));
    console.log(`Copied wheel: ${whl}`);
  }
  console.log(`${wheels.length} wheel(s) copied to ${releasesDest}`);

  // Patch requirements.txt to reference local wheel packages by name==version
  // (NOT by file path, because uv dry-run runs from basePath which doesn't have ./releases/)
  const reqPath = path.join(assetsComfyPath, 'requirements.txt');
  if (fs.existsSync(reqPath)) {
    let reqContent = fs.readFileSync(reqPath, 'utf8');
    const originalReq = reqContent;

    // Build a map of wheel package names to name==version
    // Wheel filenames follow: {name}-{version}-{python}-{abi}-{platform}.whl
    for (const whl of wheels) {
      const parts = whl.split('-');
      const pkgName = parts[0].replace(/_/g, '-').toLowerCase();
      const pkgVersion = parts[1];
      const pinned = `${pkgName}==${pkgVersion}`;
      // Replace any line that starts with the package name (with version specifier)
      const regex = new RegExp(`^${pkgName}[=<>!~].*$`, 'gmi');
      if (regex.test(reqContent)) {
        reqContent = reqContent.replace(regex, pinned);
        console.log(`  requirements.txt: pinned ${pkgName} → ${pinned}`);
      } else {
        // Skip — wheel packages not already in requirements.txt are installed via compiled file
        console.log(`  requirements.txt: skipped ${pkgName} (installed via compiled file)`);
      }
    }

    if (reqContent !== originalReq) {
      fs.writeFileSync(reqPath, reqContent);
      console.log('requirements.txt patched for local wheel packages');
    }
  }
} else {
  console.warn('Warning: releases/ directory not found, no wheels to copy');
}

// ComfyUI Lite: Remove PyTorch from compiled requirements
console.log('Removing PyTorch from compiled requirements...');
const requirementsDir = path.join('assets', 'requirements');
if (fs.existsSync(requirementsDir)) {
  const compiledFiles = fs.readdirSync(requirementsDir).filter(f => f.endsWith('.compiled'));
  for (const file of compiledFiles) {
    const filePath = path.join(requirementsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    // Remove PyTorch index URL
    content = content.replace(/^--extra-index-url https:\/\/download\.pytorch\.org\/.*\n/gm, '');
    // Remove torch, torch-dependent, and unnecessary packages
    content = content.replace(/^(torch|torchvision|torchaudio|torchsde|spandrel|kornia|kornia-rs|comfyui-manager|transformers|tokenizers|huggingface-hub|hf-xet|regex)==[^\n]*\n/gm, '');
    // Remove "from https://download.pytorch.org" comment lines  
    content = content.replace(/^\s+# from https:\/\/download\.pytorch\.org\/.*\n/gm, '');
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`  Stripped torch from: ${file}`);
    }
  }
}

// Download UV (macOS only for now)
execAndLog(`yarn run download:uv`);

// Copy frontend from releases/ wheel
execAndLog(`yarn run make:frontend`);

// Patch desktop-ui brand colors: ComfyUI yellow → iOS blue
console.log('Patching desktop-ui brand colors...');
const desktopUiAssets = path.join('assets', 'desktop-ui', 'assets');
if (fs.existsSync(desktopUiAssets)) {
  const files = fs.readdirSync(desktopUiAssets).filter(f => f.endsWith('.css') || f.endsWith('.js'));
  for (const file of files) {
    const filePath = path.join(desktopUiAssets, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    // Rename CSS variable
    content = content.replace(/brand-yellow/g, 'brand-blue');
    // Replace yellow hex with iOS blue
    content = content.replace(/#f0ff41/gi, '#007AFF');
    content = content.replace(/#F0FF41/g, '#007AFF');
    // Fix button text color: dark text on blue bg → white (multiple patterns)
    content = content.replace(/text-neutral-900 font-inter font-black/g, 'text-white font-inter font-black');
    content = content.replace(/text-neutral-900 font-black/g, 'text-white font-black');

    // === ComfyUI Lite: Patch InstallView ===
    if (file.startsWith('InstallView')) {
      console.log(`  Patching InstallView logic: ${file}`);
      
      // 1. Default autoUpdate to false: M(!0) for s → M(!1)
      //    Pattern in source: s=M(!0),c=M(!0) (s=autoUpdate, c=allowMetrics)
      content = content.replace(/s=M\(!0\),c=M\(!0\)/g, 's=M(!1),c=M(!1)');
      
      // 2. Skip GPU step: start at step "2" instead of "1"
      //    Pattern: p=M("1") → p=M("2")
      content = content.replace(/p=M\("1"\)/g, 'p=M("2")');
      
      // 3. Set default device to "cpu" instead of null
      //    Pattern: t=M(null) → t=M("cpu")  (first ref = device)
      content = content.replace(/t=M\(null\)/g, 't=M("cpu")');
      
      // 4. Set max reached step so step 2 is accessible: v=M(0) → v=M(2)
      content = content.replace(/v=M\(0\)/g, 'v=M(2)');

      // 5. Skip step 3 (settings): patch "Next" to trigger install on step 2
      //    Original: const B=()=>{const k=(parseInt(p.value)+1).toString();p.value=k
      //    Patched:  const B=()=>{if(p.value==="2"){$();return}const k=(parseInt(p.value)+1).toString();p.value=k
      content = content.replace(
        /const B=\(\)=>\{const k=\(parseInt\(p\.value\)\+1\)\.toString\(\);p\.value=k/g,
        'const B=()=>{if(p.value==="2"){$();return}const k=(parseInt(p.value)+1).toString();p.value=k'
      );
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`  Patched: ${file}`);
    }
  }
  // Patch the SVG logo
  const svgPath = path.join(desktopUiAssets, 'images', 'comfy-brand-mark.svg');
  if (fs.existsSync(svgPath)) {
    let svg = fs.readFileSync(svgPath, 'utf8');
    svg = svg.replace(/fill="#F0FF41"/g, 'fill="#007AFF"');
    fs.writeFileSync(svgPath, svg);
    console.log('  Patched: comfy-brand-mark.svg');
  }
  console.log('Brand color patching complete!');
}

console.log('ComfyUI Lite assets prepared successfully!');

/**
 * Run a command and log the output.
 * @param {string} command The command to run.
 */
function execAndLog(command) {
  console.log(`> ${command}`);
  const output = execSync(command, { encoding: 'utf8' });
  if (output) console.log(output);
}
