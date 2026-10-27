const esbuild = require('esbuild');
const { execSync } = require('child_process');
const fs = require('fs');
const { dependencies } = require('../package.json');

const common = {
  bundle: true,
  platform: 'node',
  target: 'node22',
  tsconfig: 'tsconfig.json',
  sourcemap: true,
  // esbuild would otherwise pick shibboleth-sp's ESM build (import.meta + its own require banner) for every format.
  alias: { 'shibboleth-sp': require.resolve('shibboleth-sp') },
};

// Inlined CommonJS dependencies require() node builtins, which ESM does not provide.
const esmRequireBanner = { js: "import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);" };

(async () => {
  fs.rmSync('dist', { recursive: true, force: true });

  execSync('tsc -p tsconfig.json --noEmit', { stdio: 'inherit' });

  // shibboleth-sp is a local tarball consumers cannot resolve, so its types are inlined too.
  execSync('dts-bundle-generator --no-check --external-inlines shibboleth-sp -o dist/types/index.d.ts src/index.ts', { stdio: 'inherit' });
  fs.copyFileSync('dist/types/index.d.ts', 'dist/types/index.d.mts');

  // Library: registry dependencies stay external (their types are part of the public API); shibboleth-sp is inlined.
  const library = { ...common, entryPoints: ['src/index.ts'], external: Object.keys(dependencies) };

  await Promise.all([
    esbuild.build({ ...library, format: 'cjs', outdir: 'dist/cjs' }),
    esbuild.build({ ...library, format: 'esm', outdir: 'dist/esm', outExtension: { '.js': '.mjs' }, banner: esmRequireBanner }),
    // Standalone docker/command-line entrypoints: fully self-contained, no node_modules needed at runtime.
    esbuild.build({ ...common, entryPoints: ['src/EntrypointSp.ts', 'src/EntrypointApp.ts'], format: 'cjs', outdir: 'dist/standalone' }),
  ]);
})().catch(err => {
  console.error(err.message ?? err);
  process.exit(1);
});
