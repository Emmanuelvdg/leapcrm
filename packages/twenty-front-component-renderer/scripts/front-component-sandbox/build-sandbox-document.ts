import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build, type Rollup } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '../..');

const sandboxBootstrapEntryPath = path.resolve(
  projectRoot,
  'src/remote/sandbox/sandbox-bootstrap.ts',
);

const generatedFile = path.resolve(
  projectRoot,
  'src/remote/sandbox/generated/frontComponentSandboxDocument.ts',
);

const replaceProcessEnvReferences = (code: string): string =>
  code
    .replace(/process\.env\.NODE_ENV/g, JSON.stringify('production'))
    .replace(/process\.env/g, '{}');

const escapeClosingScriptTags = (code: string): string =>
  code.replace(/<\/script/gi, '<\\/script');

const RESOLVABLE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

const resolveAtAliasPath = (bareResolvedPath: string): string | null => {
  if (fs.existsSync(bareResolvedPath) && fs.statSync(bareResolvedPath).isFile()) {
    return bareResolvedPath;
  }

  for (const extension of RESOLVABLE_EXTENSIONS) {
    const withExtension = `${bareResolvedPath}${extension}`;
    if (fs.existsSync(withExtension)) {
      return withExtension;
    }
  }

  for (const extension of RESOLVABLE_EXTENSIONS) {
    const indexFile = path.join(bareResolvedPath, `index${extension}`);
    if (fs.existsSync(indexFile)) {
      return indexFile;
    }
  }

  return null;
};

const buildSandboxDocument = async (): Promise<void> => {
  const buildResult = await build({
    configFile: false,
    root: projectRoot,
    resolve: {
      alias: {
        '@/': path.resolve(projectRoot, 'src') + '/',
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      write: false,
      lib: {
        entry: sandboxBootstrapEntryPath,
        formats: ['iife'],
        name: 'frontComponentSandboxBootstrap',
        fileName: () => 'sandbox-bootstrap.js',
      },
      rollupOptions: {
        plugins: [
          {
            name: 'define-process-env',
            transform: replaceProcessEnvReferences,
          },
        ],
      },
    },
    // The inline `?worker&inline` build spawns its own rolldown bundling
    // context, which doesn't inherit the `resolve.alias` above (regression
    // in this Vite version) - resolve the `@/` prefix explicitly for it.
    worker: {
      plugins: () => [
        {
          name: 'resolve-at-alias-for-worker',
          resolveId(source: string) {
            if (source.startsWith('@/')) {
              return resolveAtAliasPath(
                path.resolve(projectRoot, 'src', source.slice('@/'.length)),
              );
            }
            return null;
          },
        },
      ],
    },
    logLevel: 'warn',
  });

  const rollupOutputs = (
    Array.isArray(buildResult) ? buildResult : [buildResult]
  ).filter((item): item is Rollup.RollupOutput => 'output' in item);

  const sandboxBootstrapChunk = rollupOutputs
    .flatMap((result) => result.output)
    .find((item): item is Rollup.OutputChunk => item.type === 'chunk');

  if (sandboxBootstrapChunk === undefined) {
    throw new Error(
      'Failed to build the front component sandbox bootstrap bundle',
    );
  }

  const sandboxBootstrapScriptTag = `<script>${escapeClosingScriptTags(sandboxBootstrapChunk.code)}</script>`;
  const sandboxDocument = `<!doctype html><html><head><meta charset="utf-8" /></head><body>${sandboxBootstrapScriptTag}</body></html>`;

  const generatedSource = `export const FRONT_COMPONENT_SANDBOX_DOCUMENT = ${JSON.stringify(
    sandboxDocument,
  )};\n`;

  fs.mkdirSync(path.dirname(generatedFile), { recursive: true });
  fs.writeFileSync(generatedFile, generatedSource, 'utf8');
};

buildSandboxDocument().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
