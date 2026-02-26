#!/usr/bin/env tsx
/**
 * Generate PWA icons for InterviewBot
 * Creates 5 icon files with professional branding
 */

import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const ICONS_DIR = join(process.cwd(), 'public', 'icons');
const DARK_BG = '#09090b';
const BLUE_ACCENT = '#3b82f6';

interface IconConfig {
  name: string;
  size: number;
  maskable?: boolean;
}

const ICONS: IconConfig[] = [
  { name: 'icon-192x192.png', size: 192, maskable: false },
  { name: 'icon-512x512.png', size: 512, maskable: false },
  { name: 'icon-192x192-maskable.png', size: 192, maskable: true },
  { name: 'icon-512x512-maskable.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
];

/**
 * Generate SVG icon with "IB" text
 */
function generateSVG(size: number, maskable: boolean): string {
  // For maskable icons, add 20% padding (safe zone)
  const padding = maskable ? size * 0.2 : 0;
  const contentSize = size - padding * 2;
  const fontSize = contentSize * 0.45;
  const circleRadius = contentSize * 0.4;

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${size}" height="${size}" fill="${DARK_BG}"/>

      <!-- Blue circle -->
      <circle
        cx="${size / 2}"
        cy="${size / 2}"
        r="${circleRadius}"
        fill="${BLUE_ACCENT}"
      />

      <!-- "IB" text -->
      <text
        x="${size / 2}"
        y="${size / 2}"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="${DARK_BG}"
        text-anchor="middle"
        dominant-baseline="central"
      >IB</text>
    </svg>
  `.trim();
}

/**
 * Generate a single icon
 */
async function generateIcon(config: IconConfig): Promise<void> {
  const { name, size, maskable = false } = config;
  const svg = generateSVG(size, maskable);
  const outputPath = join(ICONS_DIR, name);

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);

  console.log(`✓ Generated ${name} (${size}x${size}${maskable ? ', maskable' : ''})`);
}

/**
 * Main execution
 */
async function main() {
  try {
    // Ensure icons directory exists
    await mkdir(ICONS_DIR, { recursive: true });
    console.log(`📁 Icons directory: ${ICONS_DIR}\n`);

    // Generate all icons
    for (const iconConfig of ICONS) {
      await generateIcon(iconConfig);
    }

    console.log('\n✨ All PWA icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

main();
