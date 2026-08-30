// Mocha --require hook: point ts-node at test/tsconfig.json (which maps the "vscode" module to
// our hand-rolled mock) *before* ts-node itself is loaded, then enable tsconfig-paths so that
// mapping is actually honored at require() time. Order matters - see test/tsconfig.json for the
// path mapping and test/mocks/vscode.ts for the mock implementation.
//
// Node >=22.6 ships experimental native TypeScript type-stripping that is on by default and
// intercepts .ts files in its ESM loader before ts-node's CommonJS require() hook ever runs,
// which breaks __dirname/paths-based resolution here. .mocharc.cjs disables it (where supported)
// via `node-option: no-experimental-strip-types` so ts-node (registered below) stays in control.
const path = require('path');

process.env.TS_NODE_PROJECT = path.join(__dirname, 'tsconfig.json');

require('ts-node/register');
require('tsconfig-paths/register');
