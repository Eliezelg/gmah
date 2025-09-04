#!/bin/bash

# Fix TypeScript errors in API

# 1. Fix UserRole -> Role imports
find apps/api/src -type f -name "*.ts" -exec sed -i 's/UserRole/Role/g' {} \;

# 2. Fix import type for isolatedModules
find apps/api/src -type f -name "*.ts" -exec sed -i "s/import { Response } from 'express'/import type { Response } from 'express'/g" {} \;

# 3. Fix Decimal operations
find apps/api/src -type f -name "*.ts" -exec sed -i 's/\.toNumber()/.toString()/g' {} \;

echo "TypeScript errors fixing script completed"
