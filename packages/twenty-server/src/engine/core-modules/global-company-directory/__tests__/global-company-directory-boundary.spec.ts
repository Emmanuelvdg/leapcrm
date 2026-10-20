import fs from 'fs';
import path from 'path';

const SERVER_SOURCE_ROOT = path.resolve(__dirname, '../../../..');
const DIRECTORY_MODULE_ROOT = path.resolve(__dirname, '..');

// The directory must stay invisible to tenants: only these places may use
// it, and none of them is a tenant-facing API. Adding an importer here is a
// product and legal decision, not a refactor.
const ALLOWED_IMPORTER_ROOTS = [
  DIRECTORY_MODULE_ROOT,
  path.join(SERVER_SOURCE_ROOT, 'modules', 'prospecting'),
].map((allowedRoot) => `${allowedRoot}${path.sep}`);

const TENANT_FACING_MARKERS = [
  '@Resolver(',
  '@MetadataResolver(',
  '@CoreResolver(',
  '@Controller(',
  '@ObjectType(',
  '@Field(',
];

const listSourceFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : listSourceFiles(entryPath);
    }

    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')
      ? [entryPath]
      : [];
  });

describe('global company directory boundary', () => {
  const sourceFiles = listSourceFiles(SERVER_SOURCE_ROOT);

  it('is only used by prospecting and the directory module itself', () => {
    const importers = sourceFiles.filter((filePath) =>
      fs
        .readFileSync(filePath, 'utf8')
        .includes('engine/core-modules/global-company-directory/'),
    );

    const unexpectedImporters = importers
      .filter(
        (filePath) =>
          !ALLOWED_IMPORTER_ROOTS.some((allowedRoot) =>
            filePath.startsWith(allowedRoot),
          ),
      )
      .map((filePath) => path.relative(SERVER_SOURCE_ROOT, filePath));

    expect(unexpectedImporters).toEqual([]);
  });

  it('exposes no resolver, controller or GraphQL type', () => {
    const exposingFiles = listSourceFiles(DIRECTORY_MODULE_ROOT)
      .filter((filePath) => {
        const content = fs.readFileSync(filePath, 'utf8');

        return TENANT_FACING_MARKERS.some((marker) => content.includes(marker));
      })
      .map((filePath) => path.relative(SERVER_SOURCE_ROOT, filePath));

    expect(exposingFiles).toEqual([]);
  });
});
