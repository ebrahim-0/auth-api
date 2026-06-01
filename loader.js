// loader.js
require('ts-node').register({
  project: './tsconfig.json',
  transpileOnly: true   // faster — skips type checking at runtime
});
require('./src/server.ts');