const { spawnSync } = require('node:child_process');
const path = require('node:path');

const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: isWindows,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

run(isWindows ? 'npx.cmd' : 'npx', ['expo', 'prebuild', '--platform', 'android', '--no-install'], projectRoot);
run(isWindows ? 'gradlew.bat' : './gradlew', ['assembleDebug'], path.join(projectRoot, 'android'));
