import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

const adminRoot = join(process.cwd(), 'app/api/admin');
function routeFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? routeFiles(path) : entry.name === 'route.ts' ? [path] : [];
  });
}

test('privileged admin route handlers use persisted-role authorization', () => {
  const files = routeFiles(adminRoot);
  assert.equal(files.length, 39);

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const route = relative(adminRoot, file);
    const handlerCount = source.match(/export async function (?:GET|POST|PUT|PATCH|DELETE)/g)?.length ?? 0;
    const authorizationCount = source.match(/await getAuthorizedAdminSession\(\)/g)?.length ?? 0;

    assert.doesNotMatch(source, /getSession\(|session\.role\s*[!=]==?\s*["']admin["']/);
    assert.equal(
      authorizationCount,
      handlerCount,
      `${route} must authorize every privileged handler from persisted state`,
    );
  }
});
