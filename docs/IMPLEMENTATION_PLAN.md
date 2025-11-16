# SMART CUT QUOTE - IMPLEMENTATION PLAN
## Kế hoạch thực thi chi tiết cho AI Coder

**Version:** 1.0  
**Date:** 2024-11-16  
**Target IDE:** Visual Studio Code

---

## 📋 MỤC LỤC

1. [Phân tích Tech Stack](#1-phân-tích-tech-stack)
2. [Phương án được chọn](#2-phương-án-được-chọn)
3. [Project Structure](#3-project-structure)
4. [Dependencies & Setup](#4-dependencies--setup)
5. [Implementation Phases](#5-implementation-phases)
6. [Phase 1: Core Infrastructure](#6-phase-1-core-infrastructure)
7. [Phase 2: File Upload & Preview](#7-phase-2-file-upload--preview)
8. [Phase 3: Nesting Integration](#8-phase-3-nesting-integration)
9. [Phase 4: Cost Calculation](#9-phase-4-cost-calculation)
10. [Phase 5: PDF Export](#10-phase-5-pdf-export)
11. [Testing Strategy](#11-testing-strategy)
12. [Deployment](#12-deployment)

---

## 1. PHÂN TÍCH TECH STACK

### ❌ Vấn đề với DevExpress + VSCode

**DevExpress WinForms/WPF KHÔNG tương thích với VSCode vì:**

- ❌ DevExpress controls yêu cầu **Visual Studio designer** (design-time support)
- ❌ VSCode không có WinForms/WPF designer
- ❌ DevExpress licensing và tooling chỉ hoạt động với Visual Studio IDE
- ❌ Drag-drop designer không khả dụng trong VSCode

**Kết luận:** Không thể dùng DevExpress trong VSCode workflow.

---

### ✅ 2 PHƯƠNG ÁN THAY THẾ

#### **Phương án 1: React + Vite + Tauri** ⭐ RECOMMENDED

**Ưu điểm:**
- ✅ **VSCode support xuất sắc** - Native JavaScript/TypeScript tooling
- ✅ **Lightweight desktop app** - Tauri dùng native webview (không phải Chromium như Electron)
- ✅ **Modern UI** - React ecosystem phong phú (Material-UI, Ant Design, Tailwind)
- ✅ **DXF/SVG rendering** - Dễ dàng với Canvas API, SVG, libraries như `dxf-parser`
- ✅ **Cross-platform** - Windows, macOS, Linux
- ✅ **Small bundle size** - Tauri app ~5-10MB (vs Electron ~100MB)
- ✅ **Rust backend** - Gọi subprocess (dxf-converter, sparrow-cli) an toàn

**Nhược điểm:**
- ⚠️ Learning curve nếu chưa quen React
- ⚠️ Cần học Tauri API (nhưng rất đơn giản)

**Tech Stack:**
```
Frontend:  React 18 + TypeScript + Vite
UI:        Material-UI (MUI) hoặc Ant Design
Desktop:   Tauri 2.0 (Rust backend)
DXF View:  react-dxf-viewer hoặc custom Canvas renderer
SVG View:  Native SVG DOM
State:     Zustand hoặc Redux Toolkit
Build:     Vite (fast HMR)
```

---

#### **Phương án 2: .NET + Avalonia UI**

**Ưu điểm:**
- ✅ **Giữ .NET ecosystem** - Dùng C# như kế hoạch ban đầu
- ✅ **Cross-platform** - XAML-based UI, chạy trên Windows/Mac/Linux
- ✅ **VSCode support** - Extension Avalonia for VSCode
- ✅ **Modern UI** - Fluent Design, Material Design styles
- ✅ **SkiaSharp rendering** - Mạnh mẽ cho DXF/SVG

**Nhược điểm:**
- ⚠️ XAML designer trong VSCode không tốt bằng Visual Studio
- ⚠️ Ecosystem nhỏ hơn so với React
- ⚠️ DXF viewer libraries hạn chế

**Tech Stack:**
```
Framework: .NET 8 + Avalonia UI 11
Language:  C# 12
DXF/SVG:   SkiaSharp + Svg.Skia
State:     ReactiveUI (MVVM pattern)
Build:     dotnet CLI
```

---

## 2. PHƯƠNG ÁN ĐƯỢC CHỌN

### 🎯 **RECOMMENDATION: React + Vite + Tauri**

**Lý do:**

1. **VSCode là IDE tốt nhất cho JavaScript/TypeScript** - Không cần Visual Studio
2. **UI development nhanh hơn** - Component-based, hot reload
3. **DXF/SVG rendering dễ dàng** - Web Canvas API, thư viện sẵn có
4. **Small footprint** - Tauri app nhẹ hơn Electron rất nhiều
5. **Subprocess integration** - Tauri command API để gọi dxf-converter và sparrow-cli
6. **Modern tooling** - npm, pnpm, TypeScript, ESLint, Prettier

---

## 3. PROJECT STRUCTURE

```
smart-cut-quote/
├── src/                          # React source code
│   ├── main.tsx                  # App entry point
│   ├── App.tsx                   # Root component
│   ├── components/               # Reusable components
│   │   ├── Layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Stepper.tsx
│   │   ├── FileList/
│   │   │   ├── FileListGrid.tsx
│   │   │   └── FileUploadButton.tsx
│   │   ├── Viewer/
│   │   │   ├── DxfViewer.tsx     # Canvas-based DXF renderer
│   │   │   ├── SvgViewer.tsx     # SVG display component
│   │   │   └── ViewerContainer.tsx
│   │   ├── Nesting/
│   │   │   ├── NestingButton.tsx
│   │   │   ├── NestingProgress.tsx
│   │   │   └── NestingResults.tsx
│   │   └── Summary/
│   │       ├── CostBreakdown.tsx
│   │       └── QuoteSummary.tsx
│   ├── pages/                    # Page components (8 stages)
│   │   ├── Dashboard.tsx         # Stage 0
│   │   ├── ClientSelection.tsx   # Stage 1
│   │   ├── FileUpload.tsx        # Stage 2
│   │   ├── FilePreview.tsx       # Stage 3
│   │   ├── FileHealing.tsx       # Stage 4
│   │   ├── PartConfig.tsx        # Stage 5
│   │   ├── Nesting.tsx           # Stage 6
│   │   ├── Summary.tsx           # Stage 7
│   │   └── PdfExport.tsx         # Stage 8
│   ├── stores/                   # State management (Zustand)
│   │   ├── quoteStore.ts
│   │   ├── fileStore.ts
│   │   └── nestingStore.ts
│   ├── services/                 # Business logic
│   │   ├── dxfService.ts         # DXF parsing/rendering
│   │   ├── nestingService.ts     # Call Tauri commands
│   │   ├── pricingService.ts     # Cost calculations
│   │   └── pdfService.ts         # PDF generation
│   ├── types/                    # TypeScript types
│   │   ├── quote.ts
│   │   ├── dxf.ts
│   │   └── nesting.ts
│   └── utils/                    # Utilities
│       ├── fileUtils.ts
│       └── formatters.ts
├── src-tauri/                    # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs               # Tauri app entry
│   │   ├── commands/             # Tauri commands
│   │   │   ├── dxf_converter.rs  # Call dxf-converter.exe
│   │   │   ├── sparrow_cli.rs    # Call sparrow-cli.exe
│   │   │   └── file_ops.rs       # File operations
│   │   └── lib.rs
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
├── binaries/                     # Native executables
│   ├── dxf-converter.exe         # 3.1 MB
│   └── sparrow-cli.exe           # 1.8 MB
├── public/                       # Static assets
│   └── icons/
├── package.json                  # npm dependencies
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Vite config
└── README.md
```

---

## 4. DEPENDENCIES & SETUP

### 4.1 Prerequisites

```bash
# Install Node.js 18+ (LTS)
https://nodejs.org/

# Install Rust (for Tauri)
https://www.rust-lang.org/tools/install

# Verify installations
node --version    # v18.x or higher
npm --version     # v9.x or higher
rustc --version   # 1.70.0 or higher
```

### 4.2 Initialize Project

```bash
# Create Tauri app with React + TypeScript + Vite
npm create tauri-app@latest smart-cut-quote

# Select options:
# - Package manager: npm (or pnpm)
# - UI template: React
# - TypeScript: Yes
# - Vite: Yes

cd smart-cut-quote
```

### 4.3 Install Dependencies

**package.json:**
```json
{
  "name": "smart-cut-quote",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@mui/material": "^5.14.0",
    "@mui/icons-material": "^5.14.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "zustand": "^4.4.0",
    "react-router-dom": "^6.15.0",
    "dxf-parser": "^1.3.0",
    "canvas": "^2.11.2",
    "jspdf": "^2.5.1",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^4.4.0"
  }
}
```

**Install:**
```bash
npm install
```

### 4.4 Tauri Configuration

**src-tauri/tauri.conf.json:**
```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "Smart Cut Quote",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "execute": true,
        "open": true
      },
      "fs": {
        "all": true,
        "readFile": true,
        "writeFile": true,
        "scope": ["$APPDATA/*", "$RESOURCE/*"]
      },
      "dialog": {
        "all": true
      }
    },
    "windows": [
      {
        "title": "Smart Cut Quote",
        "width": 1400,
        "height": 900,
        "resizable": true,
        "fullscreen": false
      }
    ]
  }
}
```

---

## 5. IMPLEMENTATION PHASES

### Phase 1: Core Infrastructure (Week 1)
- ✅ Setup Tauri + React + TypeScript
- ✅ Create basic layout (Sidebar, Header, Stepper)
- ✅ Setup routing (React Router)
- ✅ Setup state management (Zustand)
- ✅ Create TypeScript types

### Phase 2: File Upload & Preview (Week 2)
- ✅ File upload component (drag & drop)
- ✅ DXF parser integration
- ✅ DXF canvas renderer
- ✅ File list grid
- ✅ File validation

### Phase 3: Nesting Integration (Week 2-3)
- ✅ Tauri commands for subprocess
- ✅ Call dxf-converter.exe
- ✅ Call sparrow-cli.exe
- ✅ SVG viewer
- ✅ Nesting progress UI

### Phase 4: Cost Calculation (Week 3)
- ✅ Material cost calculation
- ✅ Cutting cost calculation
- ✅ Operations cost
- ✅ Summary table
- ✅ Database integration (SQLite)

### Phase 5: PDF Export (Week 4)
- ✅ PDF template design
- ✅ jsPDF integration
- ✅ Embed SVG preview
- ✅ Cost breakdown table

### Phase 6: Polish & Testing (Week 4)
- ✅ Error handling
- ✅ Unit tests
- ✅ E2E tests
- ✅ Build & package

---

## 6. PHASE 1: CORE INFRASTRUCTURE

### 6.1 Create Base Layout

**src/components/Layout/AppLayout.tsx**
```tsx
import React from 'react';
import { Box, Drawer } from '@mui/material';
import Sidebar from './Sidebar';
import Header from './Header';
import Stepper from './Stepper';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box' }
        }}
      >
        <Sidebar />
      </Drawer>

      {/* Main content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        <Stepper />
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
```

### 6.2 Setup State Management

**src/stores/quoteStore.ts**
```typescript
import { create } from 'zustand';

interface QuoteState {
  currentStage: number;
  clientId: string | null;
  files: DxfFile[];
  nestingResult: NestingResult | null;
  
  // Actions
  setStage: (stage: number) => void;
  setClient: (clientId: string) => void;
  addFiles: (files: DxfFile[]) => void;
  removeFile: (fileId: string) => void;
  setNestingResult: (result: NestingResult) => void;
}

export const useQuoteStore = create<QuoteState>((set) => ({
  currentStage: 0,
  clientId: null,
  files: [],
  nestingResult: null,
  
  setStage: (stage) => set({ currentStage: stage }),
  setClient: (clientId) => set({ clientId }),
  addFiles: (files) => set((state) => ({ 
    files: [...state.files, ...files] 
  })),
  removeFile: (fileId) => set((state) => ({
    files: state.files.filter(f => f.id !== fileId)
  })),
  setNestingResult: (result) => set({ nestingResult: result })
}));
```

### 6.3 Define Types

**src/types/quote.ts**
```typescript
export interface DxfFile {
  id: string;
  name: string;
  path: string;
  size: number;
  quantity: number;
  material?: Material;
  machine?: string;
  operations: string[];
  status: 'pending' | 'ok' | 'error';
  preview?: string; // base64 or blob URL
  metadata?: {
    cutLength: number;
    pierceCount: number;
    area: number;
    dimensions: { width: number; height: number };
  };
}

export interface NestingResult {
  stripWidth: number;
  stripHeight: number;
  utilization: number;
  itemsPlaced: number;
  placements: Placement[];
  svgPath: string;
}

export interface Placement {
  itemId: number;
  x: number;
  y: number;
  rotation: number;
}

export interface Material {
  id: string;
  name: string;
  grade: string;
  thickness: number;
  pricePerKg: number;
  density: number;
  cuttingSpeed: number;
  pierceCost: number;
}
```

---

## 7. PHASE 2: FILE UPLOAD & PREVIEW

### 7.1 File Upload Component

**src/components/FileList/FileUploadButton.tsx**
```tsx
import React from 'react';
import { Button } from '@mui/material';
import { open } from '@tauri-apps/api/dialog';
import { useQuoteStore } from '../../stores/quoteStore';

export default function FileUploadButton() {
  const addFiles = useQuoteStore(state => state.addFiles);

  const handleUpload = async () => {
    const selected = await open({
      multiple: true,
      filters: [{
        name: 'DXF Files',
        extensions: ['dxf', 'dwg']
      }]
    });

    if (selected && Array.isArray(selected)) {
      const files = selected.map((path, index) => ({
        id: `file-${Date.now()}-${index}`,
        name: path.split(/[\\/]/).pop() || '',
        path,
        size: 0, // Get from filesystem
        quantity: 1,
        operations: [],
        status: 'pending' as const
      }));
      
      addFiles(files);
    }
  };

  return (
    <Button variant="contained" onClick={handleUpload}>
      Upload DXF Files
    </Button>
  );
}
```

### 7.2 DXF Viewer Component

**src/components/Viewer/DxfViewer.tsx**
```tsx
import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import DxfParser from 'dxf-parser';

interface DxfViewerProps {
  filePath: string;
}

export default function DxfViewer({ filePath }: DxfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadAndRenderDxf(filePath);
  }, [filePath]);

  const loadAndRenderDxf = async (path: string) => {
    try {
      // Read DXF file via Tauri
      const content = await window.__TAURI__.fs.readTextFile(path);
      
      // Parse DXF
      const parser = new DxfParser();
      const dxf = parser.parseSync(content);
      
      // Render to canvas
      renderDxfToCanvas(dxf);
    } catch (error) {
      console.error('Failed to load DXF:', error);
    }
  };

  const renderDxfToCanvas = (dxf: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate bounds
    const bounds = calculateBounds(dxf.entities);
    
    // Setup viewport transform
    const scale = calculateScale(bounds, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, -scale, 50, canvas.height - 50);

    // Draw entities
    dxf.entities.forEach((entity: any) => {
      drawEntity(ctx, entity);
    });
  };

  const drawEntity = (ctx: CanvasRenderingContext2D, entity: any) => {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;

    switch (entity.type) {
      case 'LINE':
        ctx.beginPath();
        ctx.moveTo(entity.vertices[0].x, entity.vertices[0].y);
        ctx.lineTo(entity.vertices[1].x, entity.vertices[1].y);
        ctx.stroke();
        break;
      
      case 'CIRCLE':
        ctx.beginPath();
        ctx.arc(entity.center.x, entity.center.y, entity.radius, 0, Math.PI * 2);
        ctx.stroke();
        break;
      
      case 'ARC':
        ctx.beginPath();
        ctx.arc(
          entity.center.x,
          entity.center.y,
          entity.radius,
          entity.startAngle * Math.PI / 180,
          entity.endAngle * Math.PI / 180
        );
        ctx.stroke();
        break;
      
      // Add more entity types as needed
    }
  };

  const calculateBounds = (entities: any[]) => {
    // Calculate min/max X/Y from all entities
    // Return { minX, maxX, minY, maxY }
    // Implementation details...
    return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
  };

  const calculateScale = (bounds: any, width: number, height: number) => {
    const scaleX = (width - 100) / (bounds.maxX - bounds.minX);
    const scaleY = (height - 100) / (bounds.maxY - bounds.minY);
    return Math.min(scaleX, scaleY);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: '1px solid #ccc' }}
      />
    </Box>
  );
}
```

---

## 8. PHASE 3: NESTING INTEGRATION

### 8.1 Tauri Command - DXF Converter

**src-tauri/src/commands/dxf_converter.rs**
```rust
use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct ConversionOptions {
    pub strip_height: f64,
    pub part_spacing: f64,
    pub arc_segments: u32,
}

#[derive(Serialize)]
pub struct ConversionResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn convert_dxf_to_json(
    input_files: Vec<String>,
    output_path: String,
    options: ConversionOptions,
) -> Result<ConversionResult, String> {
    // Build command
    let mut cmd = Command::new("./binaries/dxf-converter.exe");
    
    // Add input files
    for file in &input_files {
        cmd.arg("--input").arg(file);
    }
    
    // Add output
    cmd.arg("--output").arg(&output_path);
    
    // Add options
    cmd.arg("--height").arg(options.strip_height.to_string());
    cmd.arg("--spacing").arg(options.part_spacing.to_string());
    cmd.arg("--arc-segments").arg(options.arc_segments.to_string());
    
    // Execute
    let output = cmd.output()
        .map_err(|e| format!("Failed to execute converter: {}", e))?;
    
    if output.status.success() {
        Ok(ConversionResult {
            success: true,
            output_path: Some(output_path),
            error: None,
        })
    } else {
        let error = String::from_utf8_lossy(&output.stderr).to_string();
        Ok(ConversionResult {
            success: false,
            output_path: None,
            error: Some(error),
        })
    }
}
```

### 8.2 Tauri Command - Sparrow CLI

**src-tauri/src/commands/sparrow_cli.rs**
```rust
use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct NestingOptions {
    pub timeout: u32,
    pub workers: u32,
}

#[derive(Serialize)]
pub struct NestingResult {
    pub success: bool,
    pub result_json: Option<String>,
    pub result_svg: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn run_nesting(
    input_json: String,
    output_json: String,
    output_svg: String,
    options: NestingOptions,
) -> Result<NestingResult, String> {
    let mut cmd = Command::new("./binaries/sparrow-cli.exe");
    
    cmd.arg("--input").arg(&input_json)
       .arg("--output").arg(&output_json)
       .arg("--output-svg").arg(&output_svg)
       .arg("--timeout").arg(options.timeout.to_string())
       .arg("--workers").arg(options.workers.to_string());
    
    let output = cmd.output()
        .map_err(|e| format!("Failed to execute nesting: {}", e))?;
    
    if output.status.success() {
        Ok(NestingResult {
            success: true,
            result_json: Some(output_json),
            result_svg: Some(output_svg),
            error: None,
        })
    } else {
        let error = String::from_utf8_lossy(&output.stderr).to_string();
        Ok(NestingResult {
            success: false,
            result_json: None,
            result_svg: None,
            error: Some(error),
        })
    }
}
```

### 8.3 Register Commands

**src-tauri/src/main.rs**
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::{dxf_converter, sparrow_cli};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            dxf_converter::convert_dxf_to_json,
            sparrow_cli::run_nesting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 8.4 Frontend Service

**src/services/nestingService.ts**
```typescript
import { invoke } from '@tauri-apps/api/tauri';

interface ConversionOptions {
  stripHeight: number;
  partSpacing: number;
  arcSegments: number;
}

interface NestingOptions {
  timeout: number;
  workers: number;
}

export async function convertDxfToJson(
  inputFiles: string[],
  outputPath: string,
  options: ConversionOptions
) {
  return await invoke('convert_dxf_to_json', {
    inputFiles,
    outputPath,
    options
  });
}

export async function runNesting(
  inputJson: string,
  outputJson: string,
  outputSvg: string,
  options: NestingOptions
) {
  return await invoke('run_nesting', {
    inputJson,
    outputJson,
    outputSvg,
    options
  });
}

// Complete workflow
export async function runNestingWorkflow(files: DxfFile[]) {
  try {
    // Step 1: Convert DXF to JSON
    const inputFiles = files.map(f => f.path);
    const conversionResult = await convertDxfToJson(
      inputFiles,
      './output/nesting.json',
      {
        stripHeight: 6000,
        partSpacing: 5,
        arcSegments: 32
      }
    );

    if (!conversionResult.success) {
      throw new Error(conversionResult.error);
    }

    // Step 2: Run nesting optimization
    const nestingResult = await runNesting(
      './output/nesting.json',
      './output/result.json',
      './output/result.svg',
      {
        timeout: 300,
        workers: 1
      }
    );

    if (!nestingResult.success) {
      throw new Error(nestingResult.error);
    }

    // Step 3: Parse result JSON
    const resultData = await parseNestingResult(nestingResult.result_json);

    return {
      success: true,
      data: resultData,
      svgPath: nestingResult.result_svg
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

### 8.5 Nesting Page Component

**src/pages/Nesting.tsx**
```tsx
import React, { useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useQuoteStore } from '../stores/quoteStore';
import { runNestingWorkflow } from '../services/nestingService';
import SvgViewer from '../components/Viewer/SvgViewer';

export default function Nesting() {
  const files = useQuoteStore(state => state.files);
  const setNestingResult = useQuoteStore(state => state.setNestingResult);
  const [loading, setLoading] = useState(false);
  const [svgPath, setSvgPath] = useState<string | null>(null);

  const handleStartNesting = async () => {
    setLoading(true);
    
    const result = await runNestingWorkflow(files);
    
    setLoading(false);
    
    if (result.success) {
      setNestingResult(result.data);
      setSvgPath(result.svgPath);
    } else {
      alert(`Nesting failed: ${result.error}`);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', gap: 2 }}>
      {/* Left: File list + Button */}
      <Box sx={{ width: 300 }}>
        <Typography variant="h6">Files to Nest</Typography>
        <Box sx={{ mt: 2 }}>
          {files.map(file => (
            <Box key={file.id} sx={{ mb: 1 }}>
              {file.name} (x{file.quantity})
            </Box>
          ))}
        </Box>
        
        <Button
          variant="contained"
          fullWidth
          onClick={handleStartNesting}
          disabled={loading || files.length === 0}
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Start Nesting'}
        </Button>
      </Box>

      {/* Right: SVG viewer */}
      <Box sx={{ flex: 1 }}>
        {svgPath ? (
          <SvgViewer svgPath={svgPath} />
        ) : (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            border: '2px dashed #ccc'
          }}>
            <Typography color="text.secondary">
              Nesting result will appear here
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
```

---

## 9. PHASE 4: COST CALCULATION

### 9.1 Pricing Service

**src/services/pricingService.ts**
```typescript
export function calculateMaterialCost(
  stripWidth: number,
  stripHeight: number,
  material: Material,
  quantity: number
): number {
  // Area in m²
  const usedArea = (stripWidth * stripHeight) / 1_000_000;
  
  // Volume in m³
  const volume = usedArea * (material.thickness / 1000);
  
  // Weight in kg
  const weight = volume * material.density;
  
  // Cost
  return weight * material.pricePerKg * quantity;
}

export function calculateCuttingCost(
  cutLength: number,
  pierceCount: number,
  material: Material,
  machine: Machine,
  quantity: number
): number {
  // Cutting time
  const cuttingTimeMin = cutLength / material.cuttingSpeed;
  const cuttingTimeHr = cuttingTimeMin / 60;
  const cuttingCost = cuttingTimeHr * machine.hourlyRate;
  
  // Piercing cost
  const pierceCost = pierceCount * material.pierceCost;
  
  return (cuttingCost + pierceCost) * quantity;
}

export function calculateTotalCost(
  parts: DxfFile[],
  nestingResult: NestingResult,
  materials: Material[],
  machines: Machine[]
): QuoteSummary {
  let totalMaterialCost = 0;
  let totalCuttingCost = 0;
  let totalOperationsCost = 0;

  parts.forEach(part => {
    const material = materials.find(m => m.id === part.material?.id);
    const machine = machines.find(m => m.name === part.machine);
    
    if (!material || !machine) return;

    // Material cost (based on nesting result)
    const matCost = calculateMaterialCost(
      nestingResult.stripWidth,
      nestingResult.stripHeight,
      material,
      part.quantity
    );
    
    // Cutting cost
    const cutCost = calculateCuttingCost(
      part.metadata.cutLength,
      part.metadata.pierceCount,
      material,
      machine,
      part.quantity
    );
    
    // Operations cost
    const opsCost = part.operations.reduce((sum, op) => {
      // Calculate based on operation type
      return sum + 0; // Implement operation cost logic
    }, 0);

    totalMaterialCost += matCost;
    totalCuttingCost += cutCost;
    totalOperationsCost += opsCost;
  });

  const subtotal = totalMaterialCost + totalCuttingCost + totalOperationsCost;
  const tax = subtotal * 0.05; // 5% tax
  const total = subtotal + tax;

  return {
    materialCost: totalMaterialCost,
    cuttingCost: totalCuttingCost,
    operationsCost: totalOperationsCost,
    subtotal,
    tax,
    total
  };
}
```

---

## 10. PHASE 5: PDF EXPORT

### 10.1 PDF Generator

**src/services/pdfService.ts**
```typescript
import jsPDF from 'jspdf';

export async function generateQuotePdf(
  quote: Quote,
  summary: QuoteSummary,
  svgPath: string
): Promise<Blob> {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('SMART CUT QUOTE', 20, 20);
  
  // Client info
  doc.setFontSize(12);
  doc.text(`Client: ${quote.client.name}`, 20, 40);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 50);
  
  // Parts table
  doc.text('Parts:', 20, 70);
  let yPos = 80;
  quote.files.forEach((file, index) => {
    doc.text(
      `${index + 1}. ${file.name} - Qty: ${file.quantity}`,
      30,
      yPos
    );
    yPos += 10;
  });
  
  // Cost breakdown
  yPos += 10;
  doc.text('Cost Breakdown:', 20, yPos);
  yPos += 10;
  doc.text(`Material: $${summary.materialCost.toFixed(2)}`, 30, yPos);
  yPos += 10;
  doc.text(`Cutting: $${summary.cuttingCost.toFixed(2)}`, 30, yPos);
  yPos += 10;
  doc.text(`Operations: $${summary.operationsCost.toFixed(2)}`, 30, yPos);
  yPos += 10;
  doc.text(`Tax: $${summary.tax.toFixed(2)}`, 30, yPos);
  yPos += 10;
  doc.setFontSize(14);
  doc.text(`Total: $${summary.total.toFixed(2)}`, 30, yPos);
  
  // TODO: Embed SVG preview (requires svg2pdf or similar)
  
  return doc.output('blob');
}
```

---

## 11. TESTING STRATEGY

### 11.1 Unit Tests

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

**Example test:**
```typescript
import { describe, it, expect } from 'vitest';
import { calculateMaterialCost } from '../services/pricingService';

describe('pricingService', () => {
  it('should calculate material cost correctly', () => {
    const cost = calculateMaterialCost(
      2500, // stripWidth
      1250, // stripHeight
      {
        thickness: 3,
        density: 7850,
        pricePerKg: 2.5
      },
      1 // quantity
    );
    
    expect(cost).toBeCloseTo(183.28, 2);
  });
});
```

---

## 12. DEPLOYMENT

### 12.1 Build Application

```bash
# Build for production
npm run tauri build

# Output will be in src-tauri/target/release/bundle/
# - Windows: .msi installer
# - macOS: .app and .dmg
# - Linux: .deb and .AppImage
```

### 12.2 Bundle Executables

Ensure `dxf-converter.exe` and `sparrow-cli.exe` are included:

**src-tauri/tauri.conf.json:**
```json
{
  "tauri": {
    "bundle": {
      "resources": [
        "binaries/dxf-converter.exe",
        "binaries/sparrow-cli.exe"
      ]
    }
  }
}
```

---

## 🎯 NEXT STEPS FOR AI CODER

1. **Setup project:** Follow section 4 to initialize Tauri + React + TypeScript
2. **Implement Phase 1:** Create basic layout and routing
3. **Implement Phase 2:** File upload and DXF viewer
4. **Implement Phase 3:** Nesting integration with subprocess calls
5. **Implement Phase 4:** Cost calculation logic
6. **Implement Phase 5:** PDF generation
7. **Test and polish:** Error handling, loading states, UX improvements
8. **Build and deploy:** Create installer for Windows

---

## 📚 REFERENCES

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [React Documentation](https://react.dev/)
- [Material-UI](https://mui.com/)
- [dxf-parser](https://github.com/gdsestimating/dxf-parser)
- [jsPDF](https://github.com/parallax/jsPDF)

---

**End of Implementation Plan**

*Generated: 2024-11-16*  
*For: Smart Cut Quote Desktop App*  
*Target: Visual Studio Code + React + Tauri*
