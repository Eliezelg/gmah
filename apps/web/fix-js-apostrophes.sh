#!/bin/bash

# Correction des apostrophes mal placées dans le code JavaScript/TypeScript
# Ne remplace que les &apos; qui sont dans des chaînes JS ou des arguments de fonction

echo "Fixing incorrectly replaced apostrophes in JavaScript code..."

# Patterns à corriger:
# - Dans les arguments de fonction: func(&apos;text&apos;) -> func('text')
# - Dans les objets: { key: &apos;value&apos; } -> { key: 'value' }
# - Dans les attributs JSX avec interpolation

find app components -name "*.tsx" -o -name "*.jsx" | while read file; do
  # Sauvegarder le fichier original
  cp "$file" "$file.bak"
  
  # Corriger les apostrophes dans le code JS (entre parenthèses ou accolades)
  sed -i "s/(\&apos;/('/g" "$file"
  sed -i "s/\&apos;)/\')/g" "$file"
  sed -i "s/{\&apos;/{'/g" "$file"
  sed -i "s/\&apos;}/\'}/g" "$file"
  sed -i "s/\&apos;,/\',/g" "$file"
  sed -i "s/,\&apos;/,'/g" "$file"
  sed -i "s/: \&apos;/: '/g" "$file"
  sed -i "s/\&apos;:/\':/g" "$file"
  sed -i "s/\[\&apos;/['/g" "$file"
  sed -i "s/\&apos;\]/\']/g" "$file"
  
  # Vérifier si le fichier a été modifié
  if ! cmp -s "$file" "$file.bak"; then
    echo "✓ Fixed: $file"
    rm "$file.bak"
  else
    rm "$file.bak"
  fi
done

echo "Done!"