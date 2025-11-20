# Refactor Instructions
I want to migrate this logic from a CLI Node.js tool to a pure TypeScript module for a React Application.

**Goal:** Create a `useDxfConverter` hook or a generic function `convertDxfToNestingJson(dxfContent: string): NestingInput`.

**Constraints:**
1. REMOVE all dependencies on `fs` (File System) or Node.js specific APIs.
2. KEEP `src/core/contourBuilder.js` logic exactly as is (it handles complex geometry healing).
3. Instead of reading files from disk, the input will be a raw string (file content).
4. Ensure the output format matches exactly what `sparrowTransformer.js` produces.
5. Use TypeScript types for inputs and outputs.