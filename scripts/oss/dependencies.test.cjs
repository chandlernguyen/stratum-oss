const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const lock = require('../../package-lock.json');

test('the locked dependency graph excludes the reported vulnerable releases', () => {
  for (const [name, pkg] of Object.entries(lock.packages)) {
    assert.ok(!name.endsWith('/toml'), `obsolete TOML parser: ${name}`);
    if (name.endsWith('/i18next-http-backend')) {
      assert.ok(require('semver').satisfies(pkg.version, '>=4.0.4'));
    }
    if (name.endsWith('/minimatch')) {
      assert.ok(!require('semver').satisfies(pkg.version, '>=7 <11.0.1'),
        `vulnerable minimatch: ${name}@${pkg.version}`);
    }
  }
});

test('TypeScript ESLint still permits only matching default-project files', () => {
  const parser = require('@typescript-eslint/parser');
  const options = {
    tsconfigRootDir: path.resolve(__dirname, '../../apps/web'),
    projectService: {
      allowDefaultProject: ['*.js'],
      defaultProject: 'tsconfig.node.json',
    },
  };
  const result = parser.parseForESLint('const answer = 42;', {
    ...options, filePath: path.join(options.tsconfigRootDir, 'eslint.config.js'),
  });
  assert.ok(result.services.program);
  assert.throws(() => parser.parseForESLint('const answer = 42;', {
    ...options, filePath: path.join(options.tsconfigRootDir, 'src/not-allowed.js'),
  }), /not.*(found|allowDefaultProject)/i);
});

test('the override preserves the minimatch call used by TypeScript ESLint', () => {
  const consumerRequire = createRequire(require.resolve('@typescript-eslint/typescript-estree'));
  const { minimatch } = consumerRequire('minimatch');
  assert.equal(minimatch('.config.js', '*.js', { dot: true }), true);
  assert.equal(minimatch('src/config.js', '*.js', { dot: true }), false);
});
