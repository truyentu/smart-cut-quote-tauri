/**
 * Convert TTF font to base64 for jsPDF
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fontPath = path.join(__dirname, '../src/assets/fonts/Roboto-Regular.ttf');
const outputPath = path.join(__dirname, '../src/assets/fonts/roboto-font.ts');

try {
  // Read font file as buffer
  const fontBuffer = fs.readFileSync(fontPath);

  // Convert to base64
  const base64Font = fontBuffer.toString('base64');

  // Generate TypeScript file
  // Split base64 into chunks to avoid editor issues, but it's one string
  const tsContent = `/**
 * Roboto Font for jsPDF - Vietnamese Support
 * Auto-generated from Roboto-Regular.ttf
 */

export const robotoFont = '${base64Font}';

export const fontName = 'Roboto-Regular';
export const fontStyle = 'normal';
`;

  // Write to file
  fs.writeFileSync(outputPath, tsContent, 'utf8');

  console.log('✅ Font converted successfully!');
  console.log(`📁 Output: ${outputPath}`);
  console.log(`📊 Font size: ${(base64Font.length / 1024).toFixed(2)} KB (base64)`);
} catch (error) {
  console.error('❌ Error converting font:', error);
  process.exit(1);
}
