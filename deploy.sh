#!/bin/bash
# Build und Deploy für GitHub Pages (Root-Verzeichnis)
set -e

echo "Building..."
npx vite build

echo "Copying build output to root for GitHub Pages..."
# Assets kopieren
mkdir -p assets
cp -f docs/assets/* assets/

# Die gebaute index.html als index.html ins Root kopieren
# (ersetzt die Source-Version für Production)
# WICHTIG: Die Source-Version bleibt in git als index.dev.html
cp -f index.html index.dev.html 2>/dev/null || true
cp -f docs/index.html index.html

echo "Committing..."
git add assets/ index.html index.dev.html
git commit -m "build: deploy to root for GitHub Pages" || echo "Nothing to commit"

echo "Pushing..."
git push origin main

echo "Restoring dev index.html..."
cp -f index.dev.html index.html
rm -f index.dev.html

echo "Done! GitHub Pages will update in ~1 min."
