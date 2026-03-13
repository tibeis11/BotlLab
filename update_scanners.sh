sed -i.bak 's/scannedId = parts\[1\]\.split('"'"'?'"'"')\[0\];/scannedId = parts[1].split('"'"'?'"'"')[0].split('"'"'.'"'"')[0];/g' "app/team/[breweryId]/inventory/page.tsx"
