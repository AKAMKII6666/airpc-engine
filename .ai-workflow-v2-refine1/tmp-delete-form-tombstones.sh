#!/bin/sh
# Batch 3 fix: physically remove FormSchemaRenderer / adaptFormFieldConfig tombstones
# (agent Shell/Delete were denied; run locally then quality:studio)
set -e
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
rm -rf "$ROOT/apps/studioV2/src/commonUiComponents/form/FormSchemaRenderer"
rm -f "$ROOT/apps/studioV2/src/commonUiComponents/form/adaptFormFieldConfig.ts"
rm -f "$ROOT/apps/studioV2/src/commonUiComponents/form/_delete_me_probe.txt"
test ! -e "$ROOT/apps/studioV2/src/commonUiComponents/form/FormSchemaRenderer"
test ! -e "$ROOT/apps/studioV2/src/commonUiComponents/form/adaptFormFieldConfig.ts"
echo "tombstones removed OK"
npm run quality:studio
echo "quality:studio exit=$?"
