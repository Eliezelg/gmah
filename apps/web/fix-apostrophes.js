#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fonction pour corriger les apostrophes dans une chaîne
function fixApostrophes(content) {
  // Patterns à remplacer uniquement dans le texte JSX (pas dans les attributs ou le code JS)
  const patterns = [
    // Dans les balises JSX
    { from: />([^<]*)'([^<]*)</g, to: '>$1&apos;$2<' },
    // Cas spécifiques français
    { from: /\bd'(?=[a-zA-ZÀ-ÿ])/g, to: 'd&apos;' },
    { from: /\bl'(?=[a-zA-ZÀ-ÿ])/g, to: 'l&apos;' },
    { from: /\bs'(?=[a-zA-ZÀ-ÿ])/g, to: 's&apos;' },
    { from: /\bn'(?=[a-zA-ZÀ-ÿ])/g, to: 'n&apos;' },
    { from: /\bc'(?=[a-zA-ZÀ-ÿ])/g, to: 'c&apos;' },
    { from: /\bj'(?=[a-zA-ZÀ-ÿ])/g, to: 'j&apos;' },
    { from: /\bqu'(?=[a-zA-ZÀ-ÿ])/g, to: 'qu&apos;' },
  ];

  let fixed = content;
  
  // Appliquer les corrections ligne par ligne pour éviter de toucher au code JS
  const lines = fixed.split('\n');
  const fixedLines = lines.map(line => {
    // Ne pas toucher aux lignes de code (import, const, etc.)
    if (line.trim().startsWith('import ') || 
        line.trim().startsWith('const ') ||
        line.trim().startsWith('let ') ||
        line.trim().startsWith('var ') ||
        line.trim().startsWith('function ') ||
        line.trim().startsWith('//') ||
        line.includes('{/*')) {
      return line;
    }
    
    // Vérifier si c'est du JSX (contient > et <)
    if (line.includes('>') && line.includes('<')) {
      let fixedLine = line;
      
      // Extraire le texte entre les balises
      const jsxTextRegex = />([^<]+)</g;
      fixedLine = fixedLine.replace(jsxTextRegex, (match, text) => {
        let fixedText = text;
        // Remplacer les apostrophes simples
        fixedText = fixedText.replace(/'/g, '&apos;');
        return `>${fixedText}<`;
      });
      
      return fixedLine;
    }
    
    return line;
  });
  
  return fixedLines.join('\n');
}

// Lire tous les fichiers TSX et JSX
const files = [
  ...glob.sync('app/**/*.tsx'),
  ...glob.sync('app/**/*.jsx'),
  ...glob.sync('components/**/*.tsx'),
  ...glob.sync('components/**/*.jsx'),
];

console.log(`Found ${files.length} files to check...`);

let fixedCount = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Vérifier s'il y a des apostrophes non échappées
  if (content.includes("'") && (content.includes('>') && content.includes('<'))) {
    const fixed = fixApostrophes(content);
    
    if (fixed !== content) {
      fs.writeFileSync(file, fixed, 'utf8');
      console.log(`✓ Fixed: ${file}`);
      fixedCount++;
    }
  }
});

console.log(`\n✅ Fixed ${fixedCount} files with unescaped apostrophes.`);