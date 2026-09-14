#!/usr/bin/env node
/**
 * Translation Validation Script
 *
 * Validates that all translation keys exist in both English and target locales.
 * Run from project root: node scripts/i18n/validate-translations.js
 *
 * Usage:
 *   node scripts/i18n/validate-translations.js              # Validate all
 *   node scripts/i18n/validate-translations.js --frontend   # Frontend only
 *   node scripts/i18n/validate-translations.js --backend    # Backend only
 *   node scripts/i18n/validate-translations.js --locale=vi  # Specific locale
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  frontend: {
    baseDir: 'apps/web/public/locales',
    defaultLocale: 'en',
  },
  backend: {
    baseDir: 'apps/api/locales',
    defaultLocale: 'en',
  },
};

// Parse command line arguments
const args = process.argv.slice(2);
const frontendOnly = args.includes('--frontend');
const backendOnly = args.includes('--backend');
const localeArg = args.find(a => a.startsWith('--locale='));
const targetLocale = localeArg ? localeArg.split('=')[1] : null;

/**
 * Recursively get all keys from a JSON object
 */
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Get all JSON files recursively from a directory
 */
function getAllFiles(dir, prefix = '') {
  let files = [];
  if (!fs.existsSync(dir)) return files;

  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = prefix ? `${prefix}/${item}` : item;
    if (fs.statSync(fullPath).isDirectory()) {
      files = files.concat(getAllFiles(fullPath, relativePath));
    } else if (item.endsWith('.json')) {
      files.push(relativePath);
    }
  }
  return files;
}

/**
 * Check for empty or null values in translations
 */
function checkEmptyValues(obj, prefix = '', file = '') {
  let issues = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      issues = issues.concat(checkEmptyValues(obj[key], fullKey, file));
    } else if (obj[key] === '' || obj[key] === null) {
      issues.push({ file, key: fullKey, type: 'empty' });
    }
  }
  return issues;
}

/**
 * Validate translations for a given base directory
 */
function validateTranslations(baseDir, name) {
  const results = {
    name,
    passed: true,
    fileCount: 0,
    keyCount: 0,
    issues: [],
    locales: [],
  };

  if (!fs.existsSync(baseDir)) {
    results.issues.push({ type: 'error', message: `Directory not found: ${baseDir}` });
    results.passed = false;
    return results;
  }

  // Get all locales (skip __pycache__, hidden dirs, and non-locale directories)
  const locales = fs.readdirSync(baseDir).filter(f => {
    if (f.startsWith('_') || f.startsWith('.')) return false;
    const fullPath = path.join(baseDir, f);
    return fs.statSync(fullPath).isDirectory() && f !== CONFIG.frontend.defaultLocale;
  });

  // Filter to specific locale if requested
  const targetLocales = targetLocale ? locales.filter(l => l === targetLocale) : locales;

  if (targetLocales.length === 0) {
    results.issues.push({ type: 'warning', message: `No target locales found in ${baseDir}` });
    return results;
  }

  results.locales = targetLocales;
  const enDir = path.join(baseDir, 'en');
  const enFiles = getAllFiles(enDir);

  for (const locale of targetLocales) {
    const localeDir = path.join(baseDir, locale);
    const localeFiles = getAllFiles(localeDir);

    // Check for missing files
    const missingFiles = enFiles.filter(f => !localeFiles.includes(f));
    const extraFiles = localeFiles.filter(f => !enFiles.includes(f));

    for (const f of missingFiles) {
      results.issues.push({ type: 'error', locale, message: `Missing file: ${f}` });
      results.passed = false;
    }

    for (const f of extraFiles) {
      results.issues.push({ type: 'warning', locale, message: `Extra file (not in en/): ${f}` });
    }

    // Check key parity for each file
    for (const file of enFiles) {
      if (!localeFiles.includes(file)) continue;

      const enContent = JSON.parse(fs.readFileSync(path.join(enDir, file), 'utf8'));
      const localeContent = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8'));

      const enKeys = getAllKeys(enContent).sort();
      const localeKeys = getAllKeys(localeContent).sort();

      results.fileCount++;
      results.keyCount += enKeys.length;

      const missingKeys = enKeys.filter(k => !localeKeys.includes(k));
      const extraKeys = localeKeys.filter(k => !enKeys.includes(k));

      for (const k of missingKeys) {
        results.issues.push({ type: 'error', locale, file, message: `Missing key: ${k}` });
        results.passed = false;
      }

      for (const k of extraKeys) {
        results.issues.push({ type: 'warning', locale, file, message: `Extra key: ${k}` });
      }

      // Check for empty values
      const emptyValues = checkEmptyValues(localeContent, '', file);
      for (const ev of emptyValues) {
        results.issues.push({ type: 'warning', locale, file: ev.file, message: `Empty value: ${ev.key}` });
      }
    }
  }

  return results;
}

/**
 * Print validation results
 */
function printResults(results) {
  const icon = results.passed ? '✅' : '❌';
  console.log(`\n${icon} ${results.name.toUpperCase()} TRANSLATIONS`);
  console.log('─'.repeat(50));

  if (results.locales.length > 0) {
    console.log(`Locales checked: ${results.locales.join(', ')}`);
    console.log(`Files: ${results.fileCount} | Keys: ${results.keyCount}`);
  }

  const errors = results.issues.filter(i => i.type === 'error');
  const warnings = results.issues.filter(i => i.type === 'warning');

  if (errors.length > 0) {
    console.log(`\n🚨 Errors (${errors.length}):`);
    errors.slice(0, 20).forEach(e => {
      const location = [e.locale, e.file].filter(Boolean).join('/');
      console.log(`   ${location ? `[${location}] ` : ''}${e.message}`);
    });
    if (errors.length > 20) {
      console.log(`   ... and ${errors.length - 20} more errors`);
    }
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`);
    warnings.slice(0, 10).forEach(w => {
      const location = [w.locale, w.file].filter(Boolean).join('/');
      console.log(`   ${location ? `[${location}] ` : ''}${w.message}`);
    });
    if (warnings.length > 10) {
      console.log(`   ... and ${warnings.length - 10} more warnings`);
    }
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✨ All translations are valid!');
  }

  return results.passed;
}

// Main execution
console.log('╔════════════════════════════════════════════════╗');
console.log('║      STRAŦUM Translation Validation            ║');
console.log('╚════════════════════════════════════════════════╝');

let allPassed = true;

if (!backendOnly) {
  const frontendResults = validateTranslations(CONFIG.frontend.baseDir, 'Frontend');
  if (!printResults(frontendResults)) allPassed = false;
}

if (!frontendOnly) {
  const backendResults = validateTranslations(CONFIG.backend.baseDir, 'Backend');
  if (!printResults(backendResults)) allPassed = false;
}

console.log('\n' + '═'.repeat(50));
console.log(allPassed ? '✅ ALL VALIDATIONS PASSED' : '❌ VALIDATION FAILED');
console.log('═'.repeat(50) + '\n');

process.exit(allPassed ? 0 : 1);
