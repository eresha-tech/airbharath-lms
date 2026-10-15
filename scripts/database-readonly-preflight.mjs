import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { inspectDatabase, preflightConfiguration, preflightFailure } from './database-readonly-preflight-core.mjs';

/** @param {Record<string, string | undefined>} env */
export async function main(env = process.env) {
  let stage = 'configuration';
  try {
    preflightConfiguration(env);
    stage = 'driver_import';
    const { default: postgres } = await import('postgres');
    stage = 'inspection';
    const report = await inspectDatabase({ env, connect: options => postgres(options) });
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
    // Metadata collected is not migration approval; blockers are intentionally non-success.
    return 2;
  } catch (error) {
    process.stderr.write(JSON.stringify({ decision:'BLOCKED', ...preflightFailure(error, stage), migrationAuthorized:false })+'\n');
    return 1;
  }
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) process.exitCode = await main();
