#!/usr/bin/env node
/**
 * Add New Language Script
 *
 * Creates the directory structure and copies English translations as a starting point
 * for a new language.
 *
 * Usage:
 *   node scripts/i18n/add-language.js <locale-code>
 *
 * Example:
 *   node scripts/i18n/add-language.js ja    # Add Japanese
 *   node scripts/i18n/add-language.js ko    # Add Korean
 *   node scripts/i18n/add-language.js zh    # Add Chinese
 */

const fs = require('fs');
const path = require('path');

// Common language codes and their display names
const LANGUAGE_NAMES = {
  vi: 'Tiếng Việt',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  'zh-CN': '简体中文',
  'zh-HK': '繁體中文',
  th: 'ไทย',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
  'pt-BR': 'Português (Brasil)',
  it: 'Italiano',
  ru: 'Русский',
  ar: 'العربية',
  hi: 'हिन्दी',
};

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

// Get locale from command line
const locale = process.argv[2];

if (!locale) {
  console.error('❌ Error: Please provide a locale code');
  console.log('\nUsage: node scripts/i18n/add-language.js <locale-code>');
  console.log('\nExamples:');
  console.log('  node scripts/i18n/add-language.js ja    # Japanese');
  console.log('  node scripts/i18n/add-language.js ko    # Korean');
  console.log('  node scripts/i18n/add-language.js zh-CN # Chinese (Simplified)');
  console.log('\nSupported language codes:');
  Object.entries(LANGUAGE_NAMES).forEach(([code, name]) => {
    console.log(`  ${code.padEnd(6)} - ${name}`);
  });
  process.exit(1);
}

// Validate locale format
if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(locale)) {
  console.error('❌ Error: Invalid locale format. Use ISO format like "ja", "ko", "zh-TW"');
  process.exit(1);
}

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️  Source directory not found: ${src}`);
    return 0;
  }

  fs.mkdirSync(dest, { recursive: true });
  let fileCount = 0;

  const items = fs.readdirSync(src);
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);

    if (fs.statSync(srcPath).isDirectory()) {
      fileCount += copyDir(srcPath, destPath);
    } else if (item.endsWith('.json')) {
      // Read and re-write JSON to ensure proper formatting
      const content = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
      fs.writeFileSync(destPath, JSON.stringify(content, null, 2) + '\n', 'utf8');
      fileCount++;
    }
  }

  return fileCount;
}

/**
 * Add TODO markers to translation values
 */
function addTodoMarkers(obj, prefix = '') {
  const result = {};
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      result[key] = addTodoMarkers(obj[key], `${prefix}${key}.`);
    } else if (typeof obj[key] === 'string') {
      // Keep the English text but it will need translation
      result[key] = obj[key];
    } else {
      result[key] = obj[key];
    }
  }
  return result;
}

console.log('╔════════════════════════════════════════════════╗');
console.log('║      STRAŦUM - Add New Language                ║');
console.log('╚════════════════════════════════════════════════╝\n');

const languageName = LANGUAGE_NAMES[locale] || locale;
console.log(`Adding language: ${locale} (${languageName})\n`);

// Check if locale already exists
const frontendLocaleDir = path.join(CONFIG.frontend.baseDir, locale);
const backendLocaleDir = path.join(CONFIG.backend.baseDir, locale);

if (fs.existsSync(frontendLocaleDir) || fs.existsSync(backendLocaleDir)) {
  console.error(`❌ Error: Locale "${locale}" already exists!`);
  console.log(`   Frontend: ${fs.existsSync(frontendLocaleDir) ? '✓ exists' : '✗ not found'}`);
  console.log(`   Backend:  ${fs.existsSync(backendLocaleDir) ? '✓ exists' : '✗ not found'}`);
  process.exit(1);
}

// Copy frontend translations
console.log('📁 Creating frontend translations...');
const frontendEnDir = path.join(CONFIG.frontend.baseDir, 'en');
const frontendFileCount = copyDir(frontendEnDir, frontendLocaleDir);
console.log(`   ✅ Created ${frontendFileCount} files in ${frontendLocaleDir}`);

// Copy backend translations
console.log('\n📁 Creating backend translations...');
const backendEnDir = path.join(CONFIG.backend.baseDir, 'en');
const backendFileCount = copyDir(backendEnDir, backendLocaleDir);
console.log(`   ✅ Created ${backendFileCount} files in ${backendLocaleDir}`);

// Summary
console.log('\n' + '═'.repeat(50));
console.log(`✅ Language "${locale}" (${languageName}) added successfully!`);
console.log('═'.repeat(50));
console.log('\nNext steps:');
console.log(`  1. Translate files in ${frontendLocaleDir}/`);
console.log(`  2. Translate files in ${backendLocaleDir}/`);
console.log('  3. Run validation: node scripts/i18n/validate-translations.js');
console.log('  4. Update LanguageSwitcher component if needed');
console.log('  5. Test the new language in the app');
console.log('\nTip: Use AI translation services for initial drafts,');
console.log('     then review for cultural adaptation.\n');
