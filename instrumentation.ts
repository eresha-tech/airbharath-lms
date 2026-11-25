export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { vercelPreviewRequested } = await import('./lib/runtime/vercel-staging-core.mjs');
    if (!vercelPreviewRequested()) return;
    const { verifyVercelStagingDatabase } = await import('./lib/runtime/vercel-staging');
    await verifyVercelStagingDatabase();
  }
}
