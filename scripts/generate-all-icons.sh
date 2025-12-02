#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "🎨 Generating all icon files from build/icon.png..."
echo ""

# Check if icon.png exists
if [ ! -f "build/icon.png" ]; then
    echo "❌ Error: build/icon.png not found!"
    echo "Please create build/icon.png first (1024x1024 recommended)"
    exit 1
fi

# Generate macOS .icns
echo "📱 Generating macOS .icns..."
mkdir -p /tmp/icon.iconset

sips -z 16 16     build/icon.png --out /tmp/icon.iconset/icon_16x16.png > /dev/null 2>&1
sips -z 32 32     build/icon.png --out /tmp/icon.iconset/icon_16x16@2x.png > /dev/null 2>&1
sips -z 32 32     build/icon.png --out /tmp/icon.iconset/icon_32x32.png > /dev/null 2>&1
sips -z 64 64     build/icon.png --out /tmp/icon.iconset/icon_32x32@2x.png > /dev/null 2>&1
sips -z 128 128   build/icon.png --out /tmp/icon.iconset/icon_128x128.png > /dev/null 2>&1
sips -z 256 256   build/icon.png --out /tmp/icon.iconset/icon_128x128@2x.png > /dev/null 2>&1
sips -z 256 256   build/icon.png --out /tmp/icon.iconset/icon_256x256.png > /dev/null 2>&1
sips -z 512 512   build/icon.png --out /tmp/icon.iconset/icon_256x256@2x.png > /dev/null 2>&1
sips -z 512 512   build/icon.png --out /tmp/icon.iconset/icon_512x512.png > /dev/null 2>&1
sips -z 1024 1024 build/icon.png --out /tmp/icon.iconset/icon_512x512@2x.png > /dev/null 2>&1

iconutil -c icns /tmp/icon.iconset -o build/icon.icns
rm -rf /tmp/icon.iconset

echo "   ✅ build/icon.icns created"

# Generate Windows .ico
echo "🪟 Generating Windows .ico..."
node scripts/generate-ico.js > /dev/null 2>&1
echo "   ✅ build/icon.ico created"

echo ""
echo "✨ All icon files generated successfully!"
echo ""
ls -lh build/icon.*

