#!/bin/bash

echo "Fixing TypeScript and ESLint errors..."

# Fix unescaped apostrophes in JSX
echo "Fixing unescaped apostrophes in JSX..."

# admin/loans/page.tsx line 282
sed -i "282s/n'ont/n\&apos;ont/" app/\(dashboard\)/admin/loans/page.tsx

# admin/settings/page.tsx line 329
sed -i "329s/l'ajout/l\&apos;ajout/" app/\(dashboard\)/admin/settings/page.tsx

# committee/loans/page.tsx line 398
sed -i "398s/n'a/n\&apos;a/" app/\(dashboard\)/committee/loans/page.tsx

# dashboard/guarantors/page.tsx lines 222, 287, 345
sed -i "222s/l'emprunteur/l\&apos;emprunteur/" app/\(dashboard\)/guarantors/page.tsx
sed -i "287s/l'emprunteur/l\&apos;emprunteur/" app/\(dashboard\)/guarantors/page.tsx
sed -i "345s/l'emprunteur/l\&apos;emprunteur/" app/\(dashboard\)/guarantors/page.tsx

# guarantees/guarantee-manager.tsx lines 233, 343
sed -i "233s/l'emprunteur/l\&apos;emprunteur/g" components/guarantees/guarantee-manager.tsx
sed -i "343s/n'a/n\&apos;a/" components/guarantees/guarantee-manager.tsx

echo "All fixes applied!"