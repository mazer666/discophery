#!/bin/bash

# Load NVM and project environment
export NVM_DIR="$HOME/.nvm"

# Try to source nvm from standard locations
if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
elif [ -s "/usr/local/opt/nvm/nvm.sh" ]; then
    . "/usr/local/opt/nvm/nvm.sh"
fi

# Fallback: manually add known node version to PATH if npm is still missing
if ! command -v npm &> /dev/null; then
    export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
fi

# Final check
if ! command -v npm &> /dev/null; then
    echo "Fehler: npm konnte nicht gefunden werden. Bitte stelle sicher, dass Node.js installiert ist."
    exit 1
fi

echo "Starte Dev-Server auf Port 5173..."
npm run dev -- --port 5173 --strictPort
