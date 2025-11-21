# Vietnamese Font for PDF

## Steps to add Vietnamese font support:

### Option 1: Using online font converter (Recommended)

1. Download Roboto Regular font from Google Fonts:
   https://fonts.google.com/specimen/Roboto

2. Convert TTF to Base64 using jsPDF font converter:
   https://rawgit.com/MrRio/jsPDF/master/fontconverter/fontconverter.html

3. Place the generated `.js` file in this directory

4. Import and use in pdfService.ts

### Option 2: Using pre-made Vietnamese font

The easiest way is to use a pre-converted font that supports Vietnamese.

**Current approach:** We're using Vietnamese without diacritics to avoid font issues.

**To enable full Vietnamese support:**
- Download Roboto font (.ttf file)
- Use the jsPDF font converter tool above
- The converter will generate a .js file with base64 encoded font
- Import that file in pdfService.ts and call `doc.addFileToVFS()` and `doc.addFont()`
