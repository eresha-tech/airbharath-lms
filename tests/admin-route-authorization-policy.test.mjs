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
  assert.equal(files.length, 51);

  const operationsGuard = readFileSync(join(process.cwd(), 'lib/workspace/operations/http.ts'), 'utf8');
  assert.match(operationsGuard, /admin\?await getAuthorizedAdminSession\(\):await getWorkspaceUser\(\)/);
  assert.match(operationsGuard, /if\(!user\)throw new OperationsError/);
  assert.match(operationsGuard, /const user=await operationActor\(request,admin\)/);

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const route = relative(adminRoot, file);
    const handlerCount = source.match(/export async function (?:GET|POST|PUT|PATCH|DELETE)/g)?.length ?? 0;
    const authorizationCount = source.match(/await getAuthorizedAdminSession\(\)/g)?.length ?? 0;

    assert.doesNotMatch(source, /getSession\(|session\.role\s*[!=]==?\s*["']admin["']/);
    if (route === 'workspace/sponsorships/route.ts') {
      assert.match(source, /export const GET=\(request:Request\)=>sponsorshipHttp\(request,true\)/);
      assert.match(source, /export const POST=\(request:Request\)=>sponsorshipHttp\(request,true\)/);
      const commercialGuard=readFileSync(join(process.cwd(),'lib/workspace/sponsorship/http.ts'),'utf8');
      assert.match(commercialGuard,/admin\?await getAuthorizedAdminSession\(\):await getSession\(\)/);
      assert.match(commercialGuard,/if\(!actor\)return privateJson/);
      continue;
    }
    if (route === 'workspace/support/[id]/route.ts') {
      assert.match(source, /export const GET=async\(r:Request,c:Context\)=>supportHttp\(r,\(await c.params\).id,true\)/);
      assert.match(source, /export const POST=async\(r:Request,c:Context\)=>supportHttp\(r,\(await c.params\).id,true\)/);
      continue;
    }
    if (route === 'workspace/operations/media/[id]/route.ts') {
      assert.equal(handlerCount, 1);
      assert.match(source, /const u=await operationActor\(r,true\)/);
      continue;
    }
    assert.equal(
      authorizationCount,
      handlerCount,
      `${route} must authorize every privileged handler from persisted state`,
    );
  }
});
