/**
 * Download pre-converted Roboto font for jsPDF from CDN
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use NotoSans font which has excellent Unicode/Vietnamese support
// and is available pre-converted for jsPDF
const fontUrl = 'https://cdn.jsdelivr.net/npm/jspdf-font-noto-sans@1.0.0/dist/NotoSans-Regular-normal.js';
const outputPath = path.join(__dirname, '../src/assets/fonts/noto-sans-font.js');

console.log('📥 Downloading NotoSans font for jsPDF...');

https.get(fontUrl, (response) => {
  if (response.statusCode !== 200) {
    console.error(`❌ Failed to download: HTTP ${response.statusCode}`);
    process.exit(1);
  }

  let data = '';
  response.on('data', (chunk) => {
    data += chunk;
  });

  response.on('end', () => {
    try {
      // Wrap the font code as an ES module export
      const moduleContent = `// NotoSans Font for jsPDF with Vietnamese Support
// Downloaded from: ${fontUrl}

${data}

export default {};
`;

      fs.writeFileSync(outputPath, moduleContent, 'utf8');
      console.log('✅ Font downloaded successfully!');
      console.log(`📁 Output: ${outputPath}`);
      console.log(`📊 Font size: ${(data.length / 1024).toFixed(2)} KB`);
    } catch (error) {
      console.error('❌ Error saving font:', error);
      process.exit(1);
    }
  });
}).on('error', (error) => {
  console.error('❌ Download error:', error);
  process.exit(1);
});
