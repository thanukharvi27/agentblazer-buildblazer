export default async function handler(req, res) {
  let sqliteStatus = 'unknown';
  try {
    const { DatabaseSync } = await import('node:sqlite');
    sqliteStatus = DatabaseSync ? 'supported' : 'missing';
  } catch (err) {
    sqliteStatus = `failed: ${err.message}`;
  }

  res.status(200).json({
    status: 'ok',
    service: 'AgentBlazer API Health Check',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    env: {
      VERCEL: process.env.VERCEL || 'false',
      NODE_ENV: process.env.NODE_ENV || 'undefined',
    },
    sqlite: sqliteStatus,
  });
}
