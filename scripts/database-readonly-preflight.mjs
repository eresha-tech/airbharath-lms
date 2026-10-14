import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { inspectDatabase, preflightConfiguration, PreflightError } from './database-readonly-preflight-core.mjs';

/** @param {Record<string, string | undefined>} env */
export async function main(env = process.env) {
  try {
    preflightConfiguration(env);
    const { default: postgres } = await import('postgres');
    const report = await inspectDatabase({ env, connect: options => postgres(options) });
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
    // Metadata collected is not migration approval; blockers are intentionally non-success.
    return 2;
  } catch (error) {
    const code = error instanceof PreflightError ? error.code : 'preflight_inspection_failed';
    process.stderr.write(JSON.stringify({ decision:'BLOCKED', code, migrationAuthorized:false })+'\n');
    return 1;
  }
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) process.exitCode = await main();
