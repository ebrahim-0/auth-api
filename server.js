// Express/TS app entrypoint wrapper used by IIS/iisnode
// Ensure default port is 5000 unless overridden by CI/IIS
process.env.PORT = process.env.PORT || '5000';

const path = require('path');
const fs = require('fs');

try {
  // Prefer compiled server in dist/
  const distServer = path.join(__dirname, 'dist', 'server.js');
  if (fs.existsSync(distServer)) {
    require(distServer);
  } else {
    // Fallback for development: attempt to run TypeScript source via ts-node if available
    console.warn('dist/server.js not found, attempting to start src/server.ts via ts-node');
    require('ts-node/register');
    require('./src/server.ts');
  }
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}
