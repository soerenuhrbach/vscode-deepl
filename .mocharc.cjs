// A .cjs (not .json) config so we can compute `node-option` conditionally: Node >=22.6 ships
// experimental native TypeScript type-stripping that is on by default and intercepts .ts files
// in its ESM loader before ts-node's CommonJS require() hook ever runs (breaks __dirname/paths
// resolution in test/register.js). We disable it - but only when the running Node actually
// supports the flag, otherwise mocha's --node-option respawn would crash on older Node with an
// unrecognized-flag error.
const supportsStripTypesFlag = process.allowedNodeEnvironmentFlags.has('--experimental-strip-types');

module.exports = {
  require: 'test/register.js',
  'node-option': supportsStripTypesFlag ? ['no-experimental-strip-types'] : [],
  extension: ['ts'],
  spec: 'test/unit/**/*.test.ts',
  timeout: 5000,
};
