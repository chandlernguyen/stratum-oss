#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseLocales(argv) {
  const locales = [];
  const trees = [];
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--locale') {
      const locale = argv[i + 1];
      if (!locale) {
        throw new Error('Missing value for --locale');
      }
      locales.push(locale);
      i += 1;
      continue;
    }
    if (arg.startsWith('--locale=')) {
      locales.push(arg.slice('--locale='.length));
      continue;
    }
    if (arg === '--tree') {
      const tree = argv[i + 1];
      if (!tree) {
        throw new Error('Missing value for --tree');
      }
      trees.push(tree);
      i += 1;
      continue;
    }
    if (arg.startsWith('--tree=')) {
      trees.push(arg.slice('--tree='.length));
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (locales.length === 0) {
    throw new Error('Provide at least one locale via --locale=<code>');
  }

  return { locales, trees };
}

function listJsonFiles(dir, relativeRoot = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(relativeRoot, entry.name);
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsonFiles(absolutePath, relativePath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(relativePath);
    }
  }
  return files.sort();
}

function compareLocaleTree(baseDir, locale) {
  const englishDir = path.join(baseDir, 'en');
  const localeDir = path.join(baseDir, locale);

  if (!fs.existsSync(localeDir)) {
    throw new Error(`Locale directory not found: ${localeDir}`);
  }

  const files = listJsonFiles(englishDir);
  const identical = [];

  for (const file of files) {
    const englishPath = path.join(englishDir, file);
    const localePath = path.join(localeDir, file);
    if (!fs.existsSync(localePath)) {
      throw new Error(`Missing file for locale ${locale}: ${localePath}`);
    }

    const english = fs.readFileSync(englishPath, 'utf8');
    const translated = fs.readFileSync(localePath, 'utf8');
    if (english === translated) {
      identical.push(file);
    }
  }

  return identical;
}

function main() {
  const { locales, trees: requestedTrees } = parseLocales(process.argv);
  const availableTrees = [
    { label: 'web', dir: path.join(process.cwd(), 'apps/web/public/locales') },
    { label: 'api', dir: path.join(process.cwd(), 'apps/api/locales') },
  ];
  const trees =
    requestedTrees.length === 0
      ? availableTrees
      : availableTrees.filter((tree) => requestedTrees.includes(tree.label));

  if (trees.length === 0) {
    throw new Error(`No valid trees selected. Supported values: ${availableTrees.map((tree) => tree.label).join(', ')}`);
  }

  let hasFailures = false;

  for (const locale of locales) {
    for (const tree of trees) {
      const identical = compareLocaleTree(tree.dir, locale);
      if (identical.length === 0) {
        console.log(`[ok] ${tree.label}:${locale} has no English-identical JSON files`);
        continue;
      }

      hasFailures = true;
      console.error(`[fail] ${tree.label}:${locale} still matches English in ${identical.length} file(s):`);
      for (const file of identical) {
        console.error(`  - ${file}`);
      }
    }
  }

  if (hasFailures) {
    process.exitCode = 1;
  }
}

main();
