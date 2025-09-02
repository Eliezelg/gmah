#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

const LOCALES = ['fr', 'en', 'he'];
const MESSAGES_DIR = path.join(__dirname, '..', 'messages');

async function loadTranslationModule(locale, moduleName) {
  const modulePath = path.join(MESSAGES_DIR, locale, `${moduleName}.json`);
  try {
    const content = await fs.readFile(modulePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Warning: Missing ${moduleName} for ${locale}`);
    return {};
  }
}

async function buildTranslations() {
  console.log('Building translation files...');

  const modules = [
    'common',
    'auth',
    'navigation',
    'loan',
    'dashboard',
    'loanRequest',
    'guarantees',
    'payment',
    'committee',
    'treasury',
    'reports',
    'settings',
    'errors',
    'calendar',
    'sidebar',
    'languageSelector'
  ];

  for (const locale of LOCALES) {
    console.log(`Building ${locale}.json...`);
    
    const translations = {
      _locale: locale
    };

    // Load all modules for this locale
    for (const module of modules) {
      const moduleContent = await loadTranslationModule(locale, module);
      translations[module] = moduleContent;
    }

    // Write the combined file
    const outputPath = path.join(MESSAGES_DIR, `${locale}.json`);
    await fs.writeFile(
      outputPath,
      JSON.stringify(translations, null, 2),
      'utf8'
    );

    console.log(`✓ ${locale}.json built successfully`);
  }

  console.log('All translation files built successfully!');
}

// Run the build
buildTranslations().catch(console.error);