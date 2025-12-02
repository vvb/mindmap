#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const png2icons = require('png2icons');

const inputPath = path.join(__dirname, '../build/icon.png');
const outputPath = path.join(__dirname, '../build/icon.ico');

console.log('🎨 Generating Windows .ico file...');

// Read the PNG file
const input = fs.readFileSync(inputPath);

// Convert to ICO with multiple sizes
const output = png2icons.createICO(input, png2icons.BICUBIC, 0, false, true);

// Write the ICO file
fs.writeFileSync(outputPath, output);

console.log('✅ Windows .ico file generated successfully!');
console.log(`📁 Saved to: ${outputPath}`);

// Show file size
const stats = fs.statSync(outputPath);
console.log(`📊 File size: ${(stats.size / 1024).toFixed(1)} KB`);

