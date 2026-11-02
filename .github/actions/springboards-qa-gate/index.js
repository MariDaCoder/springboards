import { execSync, spawn } from 'child_process';

const baseUrl = process.env.INPUT_BASE_URL || process.env.QA_BASE_URL || 'http://127.0.0.1:3000';

console.log(`[Springboards Node24 Action] Running on Node ${process.version} (${process.platform}/${process.arch})`);

try {
  console.log('[1/3] Running production asset build (npm run build)...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('[2/3] Running syntax & module lint check (npm run lint)...');
  execSync('npm run lint', { stdio: 'inherit' });

  console.log(`[3/3] Starting server and executing 6-phase Functional QA suite against ${baseUrl}...`);
  const serverProc = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
    stdio: 'ignore'
  });

  const cleanup = () => {
    try {
      serverProc.kill('SIGTERM');
    } catch {
      // ignore
    }
  };
  process.on('exit', cleanup);

  execSync('node -e "setTimeout(() => {}, 2000)"');
  execSync('npm run qa', {
    stdio: 'inherit',
    env: { ...process.env, QA_BASE_URL: baseUrl }
  });

  cleanup();
  console.log('[Springboards Node24 Action] All build, lint, and QA gates passed.');
} catch (error) {
  console.error('[Springboards Node24 Action] Verification gate failed:', error.message);
  process.exit(1);
}
