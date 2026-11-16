import fs from 'fs';
import path from 'path';

import { isDefined } from 'twenty-shared/utils';

import { SECRET_ENCRYPTION_ROTATION_SITE_ENTRIES } from 'src/database/commands/secret-encryption-rotation/constants/secret-encryption-rotation-site-entries.constant';

const SERVER_SOURCE_ROOT = path.resolve(__dirname, '../../../../..');

// Matches `"column" LIKE 'enc:v2:%'` in a CHECK constraint. JSON-path checks
// such as `("connectionParameters"->'IMAP'->>'password') LIKE ...` do not
// match and are covered by their dedicated handler.
const ENCRYPTED_COLUMN_CHECK_PATTERN = /"(\w+)" LIKE 'enc:v2:%'/g;

const ENTITY_CLASS_PATTERN = /export class (\w+Entity)\b/;

const listEntityFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : listEntityFiles(entryPath);
    }

    return entry.name.endsWith('.entity.ts') ? [entryPath] : [];
  });

const findEncryptedColumns = (): { entityName: string; column: string }[] =>
  listEntityFiles(SERVER_SOURCE_ROOT).flatMap((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const entityName = source.match(ENTITY_CLASS_PATTERN)?.[1];

    if (!isDefined(entityName)) {
      return [];
    }

    const columns = new Set(
      [...source.matchAll(ENCRYPTED_COLUMN_CHECK_PATTERN)].map(
        (match) => match[1],
      ),
    );

    return [...columns].map((column) => ({ entityName, column }));
  });

describe('SECRET_ENCRYPTION_ROTATION_SITE_ENTRIES', () => {
  it('finds encrypted columns to check', () => {
    expect(findEncryptedColumns().length).toBeGreaterThan(0);
  });

  // A column guarded by an enc:v2 CHECK but missing here keeps the old key
  // forever, and rotation then retires a key it still needs.
  it('registers every column guarded by an enc:v2 CHECK constraint', () => {
    const registry: Record<
      string,
      { columnSiteNames: Record<string, unknown> } | undefined
    > = SECRET_ENCRYPTION_ROTATION_SITE_ENTRIES;

    const missing = findEncryptedColumns()
      .filter(
        ({ entityName, column }) =>
          !isDefined(registry[entityName]?.columnSiteNames[column]),
      )
      .map(({ entityName, column }) => `${entityName}.${column}`);

    expect(missing).toEqual([]);
  });

  it('uses unique site names', () => {
    const siteNames = Object.values(SECRET_ENCRYPTION_ROTATION_SITE_ENTRIES)
      .flatMap((entry) => Object.values(entry.columnSiteNames))
      .map((metadata) => metadata.siteName);

    expect(new Set(siteNames).size).toBe(siteNames.length);
  });
});
