# SMART CUT QUOTE - LASER CUTTING QUOTATION MANAGEMENT SYSTEM

## 📋 MỤC LỤC

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc và luồng dữ liệu](#2-kiến-trúc-và-luồng-dữ-liệu)
3. [Stage 0: Dashboard & Quote Management](#3-stage-0-dashboard--quote-management)
4. [Stage 1: Client Selection & Quote Initialization](#4-stage-1-client-selection--quote-initialization)
5. [Stage 2: File Upload](#5-stage-2-file-upload)
6. [Stage 3: File Display & Validation](#6-stage-3-file-display--validation)
7. [Stage 4: File Healing](#7-stage-4-file-healing)
8. [Stage 5: Part Configuration](#8-stage-5-part-configuration)
9. [Stage 6: Nesting](#9-stage-6-nesting)
10. [Stage 7: Summary & Cost Calculation](#10-stage-7-summary--cost-calculation)
11. [Stage 8: PDF Export](#11-stage-8-pdf-export)
12. [Settings & Configuration](#12-settings--configuration)
13. [Data Models](#13-data-models)
14. [Business Logic & Calculations](#14-business-logic--calculations)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Mục đích

**Smart Cut Quote** là hệ thống quản lý báo giá cho dịch vụ cắt laser kim loại, giúp:
- Tự động tính toán chi phí cắt laser dựa trên file DXF/DWG
- Tối ưu hóa sắp xếp chi tiết trên tấm phôi (nesting)
- Quản lý khách hàng và lịch sử báo giá
- Xuất PDF báo giá chuyên nghiệp

### 1.2 Đối tượng sử dụng

- **Sales Team**: Tạo báo giá cho khách hàng
- **Operators**: Xem thông tin sản xuất
- **Manager**: Theo dõi doanh số, thống kê
- **Admin**: Quản lý vật liệu, máy móc, cấu hình hệ thống

### 1.3 Quy trình làm việc tổng quan

```
Khách hàng gửi file DXF → Upload vào hệ thống → Validate & Fix lỗi
    ↓
Chọn vật liệu, số lượng cho từng chi tiết
    ↓
Chạy nesting tự động → Tính toán kích thước phôi thực tế sử dụng
    ↓
Tính giá (vật liệu + cắt + operations + markup)
    ↓
Review tổng kết → Xuất PDF báo giá → Gửi khách hàng
```

### 1.4 Tính năng chính

✅ **Quote Management**
- Tạo, chỉnh sửa, xóa báo giá
- Theo dõi trạng thái (Draft, Sent, Accepted, Rejected)
- Lịch sử báo giá

✅ **DXF/DWG Processing**
- Upload nhiều file cùng lúc (drag & drop)
- Parse và hiển thị geometry
- Auto-detect lỗi (open contours, overlaps)
- Công cụ sửa lỗi thủ công

✅ **Material & Stock Management**
- Quản lý kho vật liệu
- Cấu hình kích thước tấm phôi (user-defined)
- Giá cả theo kg và độ dày

✅ **Intelligent Nesting**
- Sử dụng thuật toán SVGnest (Genetic Algorithm)
- Tối ưu hóa sắp xếp chi tiết
- Tính toán kích thước thực tế sử dụng (không tính full sheet)
- Hiển thị visualization chi tiết

✅ **Smart Pricing**
- Material cost: Chỉ tính theo diện tích thực sử dụng
- Cutting cost: Dựa trên chiều dài đường cắt
- Operations cost: Bending, deburring, welding, etc.
- Markup và tax tùy chỉnh

✅ **Professional PDF Export**
- Template báo giá đẹp mắt
- Bao gồm preview hình ảnh chi tiết
- Chi tiết cost breakdown
- Terms & conditions

---

## 2. KIẾN TRÚC VÀ LUỒNG DỮ LIỆU

### 2.1 Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                       │
│  ┌──────────┬──────────┬──────────┬──────────┐        │
│  │Dashboard │  Quotes  │ Settings │  Client  │        │
│  └──────────┴──────────┴──────────┴──────────┘        │
└─────────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────────┐
│                  APPLICATION LOGIC                      │
│  ┌──────────────────────────────────────────────┐      │
│  │  Quote Workflow  │  DXF Parser  │  Nesting  │      │
│  │  Pricing Engine  │  PDF Gen     │  Validator│      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────────┐
│                      DATABASE                           │
│  ┌──────────────────────────────────────────────┐      │
│  │  Quotes  │  Clients  │  Materials  │  Parts  │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                      │
│  ┌──────────────────────────────────────────────┐      │
│  │  Email Service  │  File Storage  │  PDF Gen │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow - Quote Creation

```
1. User Input
   ├── Client info
   ├── DXF files
   └── Configuration (material, quantity)
        ↓
2. Processing
   ├── Parse DXF → Extract geometry
   ├── Validate → Fix errors
   ├── Configure parts
   └── Run nesting
        ↓
3. Calculation
   ├── Material cost (based on used area)
   ├── Cutting cost (based on cut length)
   ├── Operations cost
   └── Apply markup & tax
        ↓
4. Output
   ├── Save quote to database
   ├── Generate PDF
   └── Send email (optional)
```

### 2.3 State Management

**Global State:**
- User authentication
- Current quote in progress
- Settings & configuration

**Quote State:**
- Client info
- Uploaded files (parsed DXF data)
- Part configurations
- Nesting results
- Pricing breakdown

**UI State:**
- Current step in workflow
- Loading states
- Error messages
- Modal dialogs

---

## 3. STAGE 0: DASHBOARD & QUOTE MANAGEMENT

### 3.1 Mục đích

Dashboard là màn hình chính, cho phép user:
- Xem tổng quan tất cả quotes
- Tạo quote mới
- Xem thống kê doanh số
- Quản lý tasks

### 3.2 Layout

```
┌────────────────────────────────────────────────────────────┐
│  SIDEBAR     │         MAIN CONTENT AREA                   │
│              │                                              │
│  🏠 Home     │  ┌─────────────────────────────────────┐   │
│  ➕ New      │  │   MANAGE QUOTES (Header)            │   │
│  ⚙️ Settings  │  │   [Search...]          [+ New]      │   │
│  ℹ️ Info      │  └─────────────────────────────────────┘   │
│              │                                              │
│              │  ┌─────────────────────────────────────┐   │
│              │  │  QUOTE TABLE                        │   │
│              │  │  Date | Quote No | Company | ...    │   │
│              │  │  ─────────────────────────────────  │   │
│              │  │  3/02 | To30002  | Travis Lee | ... │   │
│              │  │  22/01| To5890   | MP Bodies  | ... │   │
│              │  │  ...                                │   │
│              │  └─────────────────────────────────────┘   │
│              │                                              │
│              │  ┌──────────────┐  ┌──────────────────┐   │
│              │  │ STATISTICS   │  │  TASKS           │   │
│              │  │ [Chart]      │  │  □ My Tasks      │   │
│              │  │              │  │  ✓ Completed     │   │
│              │  └──────────────┘  └──────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

### 3.3 Components

#### A. Sidebar Navigation

**Elements:**
- Logo: "SMART CUT QUOTE"
- Menu items:
  - Home (active by default)
  - New (creates new quote)
  - Settings (system configuration)
  - Info (about, help)

**Behavior:**
- Always visible
- Highlight active page
- Click "New" → Opens quote creation dialog

#### B. Quote Table

**Columns:**
1. **Date**: Quote creation date (sortable)
2. **Quote No**: Auto-generated ID (e.g., NCT5890)
3. **Company**: Client company name (searchable)
4. **Amount**: Total quote value (sortable, formatted as currency)
5. **Status**: Visual badge
   - 🟡 Pending (yellow)
   - 🟢 Accepted (green)
   - 🔴 Rejected (red)
   - ⚪ Draft (gray)
6. **Created By**: User who created the quote

**Features:**
- Pagination (20 quotes per page)
- Search bar (searches quote no, company name)
- Sort by any column (ascending/descending)
- Click row → View quote details
- Right-click row → Context menu:
  - View
  - Edit
  - Duplicate
  - Delete
  - Export PDF
  - Send Email

**Actions:**
- "+ New" button → Create new quote
- "Continue..." button → Resume draft quotes (shows list of drafts)
- "Filter" button → Advanced filters:
  - Date range
  - Status
  - Created by
  - Client
  - Amount range

#### C. Statistics Panel

**Sales Volume Chart:**
- Bar chart by month
- Compare current vs previous months
- Y-axis: Revenue ($)
- X-axis: Months

**Key Metrics Cards:**
- Total Quotes (this month)
- Total Revenue (this month)
- Conversion Rate (%)
- Pending Quotes

**Note:** "Statistics (coming soon)" label indicates future feature

#### D. Tasks Section

**Features:**
- Checkbox list of tasks
- "My Tasks" section (incomplete)
- "Completed Tasks" section (checked items)
- "+ Add task" button
- Tasks can be:
  - General reminders
  - Quote follow-ups
  - Client callbacks

### 3.4 User Interactions

**Viewing Quotes:**
1. User clicks on a quote row
2. System loads quote details
3. Display quote detail page with:
   - Client info
   - Parts list
   - Pricing breakdown
   - Status history

**Creating New Quote:**
1. User clicks "+ New" button
2. Opens Stage 1: Client Selection dialog

**Searching/Filtering:**
1. User types in search box
2. Table filters in real-time
3. Can combine with filters (status, date range)

**Quote Management:**
1. Right-click on quote
2. Select action from context menu
3. System performs action with confirmation

---

## 4. STAGE 1: CLIENT SELECTION & QUOTE INITIALIZATION

### 4.1 Mục đích

Stage này cho phép user:
- Chọn khách hàng từ database hoặc tạo mới
- Thiết lập thông tin cơ bản cho quote
- Cấu hình markup và validity

### 4.2 Dialog: Quote Details

```
┌──────────────────────────────────────────────┐
│  Quote Details                       [X]     │
├──────────────────────────────────────────────┤
│                                              │
│  Company*        [CASH SALES        ▼]      │
│                   ├─ CASH SALES             │
│                   ├─ MP Bodies              │
│                   ├─ VIP Metals             │
│                   ├─ Travis Lee             │
│                   └─ [+ Create new client]  │
│                                              │
│  Quote Prefix    [To                ]       │
│  Reference       [                  ]       │
│  Validity Period [7            ] days       │
│  Price Markup %  [5            ]            │
│  Material Markup%[5            ]            │
│  Contact         [CASH Sales        ▼]      │
│  Phone No.       [+613 8618 6884    ]       │
│                                              │
│  ☐ Quick Quotation                          │
│     (This option does not allow saving      │
│      or printing quotes, only calculations) │
│                                              │
│  ┌────────────┐  ┌────────────┐            │
│  │   Cancel   │  │    Next ▶  │            │
│  └────────────┘  └────────────┘            │
└──────────────────────────────────────────────┘
```

### 4.3 Fields & Validation

#### A. Company Selection

**Type:** Dropdown with search
**Required:** Yes
**Options:**
- List of existing clients from database
- "+ Create new client" option at bottom

**Behavior:**
- Start typing to search/filter
- Select existing → Auto-fills contact and phone
- Select "Create new" → Opens Add Client dialog

#### B. Quote Configuration

**Quote Prefix:**
- Default: "To" (customizable per company)
- Auto-generates full quote number: To5890, NCT5888, etc.

**Reference:**
- Optional text field
- Can be PO number, project code, etc.

**Validity Period:**
- Number input (days)
- Default: 7 days
- Quote valid until: [Current Date + Validity Days]

**Price Markup (%):**
- Applied to final subtotal (after material + cutting + operations)
- Default: 5%
- Can be overridden per client

**Material Markup (%):**
- Additional markup specifically for material cost
- Default: 5%
- Stacks with price markup

#### C. Contact Information

**Contact Dropdown:**
- Shows contacts from selected company
- Multiple contacts can be stored per company
- Auto-fills phone number when selected

**Phone Number:**
- Auto-filled from contact
- Can be edited
- Format: International format (+61...)

#### D. Quick Quotation Mode

**Checkbox:** Quick Quotation
**Description:** "This option does not allow saving or printing quotes, only calculations"

**When enabled:**
- All calculations work normally
- Nesting and pricing run as usual
- CANNOT save to database
- CANNOT export PDF
- Used for quick estimates only

**Use case:** Sales person needs rough estimate on the phone with customer

### 4.4 Add Client Dialog

**Triggered by:** Selecting "+ Create new client" from Company dropdown

```
┌─────────────────────────────────────────────────────────────┐
│  Add Client                                          [X]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  COMPANY                                                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Name*           [                              ]    │    │
│  │ Phone No.       [                              ]    │    │
│  │ Email Id        [                              ]    │    │
│  │ Business No.    [                              ]    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  BILLING ADDRESS                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Address Line 1  [                              ]    │    │
│  │ Address Line 2  [                              ]    │    │
│  │ City            [          ] State [          ]    │    │
│  │ Zip             [          ] Country[          ]   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  SHIPPING ADDRESS                                            │
│  ☑ Same as billing address                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Address Line 1  [                              ]    │    │
│  │ Address Line 2  [                              ]    │    │
│  │ City            [          ] State [          ]    │    │
│  │ Zip             [          ] Country[          ]   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  CONTACTS                                                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Name        Phone          Email               [+]  │    │
│  │ [         ] [           ] [                 ]  [x]  │    │
│  │ [         ] [           ] [                 ]  [x]  │    │
│  │ [         ] [           ] [                 ]  [x]  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  OTHER                                                       │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Additional Price Markup     [40    ] %              │    │
│  │ Additional Material Markup  [25    ] %              │    │
│  │                                                      │    │
│  │ Note: This is an additional material markup that    │    │
│  │ can be applied to a customer. For example, if the   │    │
│  │ normal material markup is 20% and you wish to add   │    │
│  │ 5% for this customer.                               │    │
│  │ The same applies for the price markup for this      │    │
│  │ client.                                             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────┐                                             │
│  │    Add     │                                             │
│  └────────────┘                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 Client Data Fields

#### A. Company Information
- **Name*** (required): Company/individual name
- **Phone No.**: Primary contact phone
- **Email**: Primary email for quotes
- **Business No.**: Tax ID, ABN, etc.

#### B. Addresses
- **Billing Address**: For invoicing
- **Shipping Address**: For delivery
  - Checkbox: "Same as billing address"
  - When checked, shipping fields auto-fill from billing

#### C. Multiple Contacts
- Dynamic list of contacts
- Each row:
  - Name
  - Phone
  - Email
  - Delete button [x]
- [+] Add button to add new row
- Minimum 1 contact required

#### D. Client-specific Pricing
- **Additional Price Markup (%)**: Extra markup for this client only
  - Example: Normal markup 20%, client needs +5% = 25% total
- **Additional Material Markup (%)**: Extra material markup
  - Stacks on top of global material markup

**Use case:** VIP clients get better pricing (negative markup), difficult clients get extra margin (positive markup)

### 4.6 Validation Rules

**Required Fields:**
- Company name
- At least one contact with name

**Optional but recommended:**
- Phone, Email
- Address (at least billing)

**Format Validation:**
- Email: Valid email format
- Phone: International format preferred
- Business No: Alphanumeric

### 4.7 User Flow

```
User clicks "New" from Dashboard
    ↓
Quote Details dialog opens
    ↓
User selects Company:
    ├─ Existing client → Fields auto-fill → Click Next → Go to Stage 2
    │
    └─ Create new client:
        ↓
        Add Client dialog opens
        ↓
        User fills form
        ↓
        Click "Add"
        ↓
        Validation:
        ├─ Success: Client saved, dialog closes, returns to Quote Details
        └─ Error: Show error messages, stay on form
        ↓
        Click "Next" → Go to Stage 2
```

---

## 5. STAGE 2: FILE UPLOAD

### 5.1 Mục đích

Cho phép user upload một hoặc nhiều file DXF/DWG cùng lúc để báo giá.

### 5.2 Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  TOOLBAR: [📁] [🐞] [✂️] [📏] [🔄] [🪄]         [CASH SALES]    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  LEFT PANEL (File List)          RIGHT PANEL (Preview)          │
│  ┌──────────────────────┐        ┌──────────────────────────┐  │
│  │ [Search...         ] │        │                          │  │
│  │                      │        │                          │  │
│  │ [🟢] [🔴] Filters    │        │      DXF VIEWER          │  │
│  │                      │        │                          │  │
│  │ No. File Name   Size │        │    (Canvas Area)         │  │
│  │ ─────────────────────│        │                          │  │
│  │ 1   DXF105   221x22  │        │                          │  │
│  │ 2   DXF101   300x300 │        │                          │  │
│  │ 3   DXF102   727x417 │        │                          │  │
│  │ ...                  │        │                          │  │
│  │                      │        └──────────────────────────┘  │
│  │                      │                                      │
│  │                      │        LAYERS PANEL                 │
│  │                      │        ┌─────────────────────────┐ │
│  │                      │        │ Layer Name   Ent Visible│ │
│  │                      │        │ EDGES        5    ☑️    │ │
│  │                      │        └─────────────────────────┘ │
│  └──────────────────────┘                                      │
│                                                                 │
│  [Open File Browser] OR [Drag & Drop Files Here]              │
└──────────────────────────────────────────────────────────────────┘
```

### 5.3 Components

#### A. Toolbar

**Icons (from left to right):**
1. **📁 Open File** - Browse and select DXF/DWG files
2. **🐞 Bug icon** - Find errors in selected file
3. **✂️ Split** - Split multi-profile files
4. **📏 Measure** - Measurement tool
5. **🔄 Refresh** - Reload files
6. **🪄 Magic wand** - Auto-fix errors

**Right side:**
- Client name badge (e.g., "CASH SALES")
- Indicates current quote client

#### B. File List Panel (Left)

**Header:**
- Search box: Filter files by name
- Status filters:
  - 🟢 Closed (show only valid files)
  - 🔴 Open/Multi Profile (show only error files)

**Table Columns:**
1. **Status Icon:**
   - 🟢 Green = Closed (valid, no errors)
   - 🔴 Red = Open/Multi Profile (has errors)
2. **No.**: Sequential number
3. **File Name**: Name without extension
4. **Size**: Auto-detected bounding box dimensions (W x H)

**Interactions:**
- **Click row**: Select file, show preview in right panel
- **Multi-select**: Ctrl+Click or Shift+Click
- **Right-click menu**:
  - Open in Editor (go to healing stage)
  - Delete
  - Replace (upload new version)
  - Split (if multi-profile)
  - Properties
  - Rename

**Visual Feedback:**
- Selected row highlighted (blue background)
- Hover effect on rows

#### C. File Browser Integration

**Native File Dialog:**
- Opens OS native file picker
- File type filter: "CAD Files (*.dxf, *.dwg)"
- Multi-select enabled
- Shows file details: name, date modified, size

**Buttons:**
- **Open**: Add selected files to list
- **Cancel**: Close dialog
- **Show Preview**: Optional preview in dialog (OS-dependent)

#### D. Drag & Drop Zone

**Visual:**
- Dashed border around drop zone
- Text: "Drag & Drop Files Here"
- Icon: 📁 or cloud upload icon

**Behavior:**
- **Drag enter**: Highlight border (blue/green)
- **Drag leave**: Return to normal state
- **Drop**: Process files
  - Show loading indicator per file
  - Parse each file
  - Update file list
  - Show errors if any

**Supported formats:**
- .dxf (AutoCAD DXF)
- .dwg (AutoCAD DWG) - converted to DXF internally

**File size limits:**
- Individual file: 50MB max
- Total upload: 500MB max
- Show error if exceeded

#### E. DXF Viewer Panel (Right)

**Canvas Area:**
- Background: Dark gray (#2d2d2d) or white (toggle option)
- Grid: Optional reference grid
- Coordinate system: X, Y, Z axes indicator (bottom-left corner)

**Rendering:**
- Lines: Solid, color-coded by layer
- Arcs/Circles: Smooth curves
- Polylines: Connected segments
- Text: Optional (can hide)

**Controls:**
- **Zoom**: Mouse wheel or +/- buttons
- **Pan**: Middle mouse drag or arrow keys
- **Fit to view**: Auto-scale to fit canvas
- **Fullscreen**: Expand to full window

**Overlay Information:**
- Mouse position (X, Y coordinates)
- Selected entity info (if any)
- Scale indicator
- Zoom level (%)

#### F. Layers Panel (Bottom-right)

**Table Columns:**
1. **Layer Name**: DXF layer name (e.g., "EDGES", "0", "DIMENSIONS")
2. **Entities**: Count of entities on this layer
3. **Visible**: Checkbox to show/hide layer

**Features:**
- Toggle visibility per layer
- Color indicator per layer
- Select all/none checkboxes

### 5.4 File Processing Pipeline

```
User uploads file(s)
    ↓
For each file:
    ├─ Read file content
    ├─ Detect format (DXF/DWG)
    ├─ Parse file:
    │   ├─ Extract entities (lines, arcs, circles, polylines)
    │   ├─ Extract layers
    │   ├─ Calculate bounding box
    │   └─ Build geometry tree
    ├─ Validate:
    │   ├─ Check for open contours
    │   ├─ Check for overlaps
    │   ├─ Check for self-intersections
    │   ├─ Check for multiple profiles
    │   └─ Set status (Closed ✅ or Error ❌)
    ├─ Calculate metadata:
    │   ├─ Cut length (perimeter)
    │   ├─ Pierce count (number of closed contours)
    │   ├─ Area
    │   └─ Dimensions (W x H)
    └─ Add to file list with preview
```

### 5.5 Error Detection

**Types of errors:**

1. **Open Contours** 🔴
   - Definition: Paths that don't form closed shapes
   - Detection: Start point ≠ End point (within tolerance)
   - Visual: Red circle at open endpoints

2. **Self-intersections** 🟠
   - Definition: Lines cross themselves
   - Detection: Line segment intersection algorithm
   - Visual: Orange highlight at intersection points

3. **Overlapping Entities** 🟡
   - Definition: Duplicate or overlapping lines
   - Detection: Distance between entities < tolerance
   - Visual: Yellow highlight

4. **Multi-profile** 🔵
   - Definition: Multiple separate closed shapes in one file
   - Detection: More than one closed contour
   - Visual: Blue badge "Multi-profile (3)" showing count

**Tolerance settings:**
- Gap tolerance: 0.01mm (configurable)
- Overlap tolerance: 0.001mm
- Angle tolerance: 0.1 degrees

### 5.6 Preview Generation

**For each file:**
1. Parse geometry
2. Calculate view bounds
3. Render to SVG/Canvas:
   - Scale to fit preview area
   - Apply proper transforms
   - Color-code by layer
4. Generate thumbnail (150x150px) for table
5. Store full-size preview for viewer panel

**Optimization:**
- Use Web Worker for parsing (don't block UI)
- Lazy load previews (only render visible files)
- Cache rendered previews

### 5.7 User Interactions & Workflows

#### Workflow 1: Upload via File Browser
```
1. User clicks "📁 Open File" button
2. Native file dialog opens
3. User selects one or multiple files
4. Clicks "Open"
5. System processes files (shows progress)
6. Files appear in list with status
7. First file auto-selected and previewed
```

#### Workflow 2: Drag & Drop
```
1. User drags files from desktop
2. Hovers over drop zone
3. Drop zone highlights (blue border)
4. User drops files
5. System processes files (shows progress)
6. Files appear in list with status
7. First file auto-selected and previewed
```

#### Workflow 3: View File Details
```
1. User clicks on a file in list
2. File highlighted
3. Right panel shows:
   - Full DXF preview
   - Layers panel with layer list
   - Zoom/pan controls active
4. User can interact with preview:
   - Zoom in/out
   - Pan around
   - Toggle layers
   - Measure distances
```

#### Workflow 4: Handle Error Files
```
1. File uploaded with errors (status 🔴)
2. User right-clicks on file
3. Selects "Open in Editor"
4. → Go to Stage 4: File Healing
```

### 5.8 Next Step

**Condition to proceed to next stage:**
- At least 1 file uploaded
- Not mandatory for all files to be valid (can fix later)

**Actions:**
- "Next" button at bottom-right
- Click → Go to Stage 3: File Display & Validation

---

## 6. STAGE 3: FILE DISPLAY & VALIDATION

### 6.1 Mục đích

Stage này tập trung vào:
- Hiển thị chi tiết tất cả files đã upload
- Validation status rõ ràng cho từng file
- Preview DXF geometry
- Quick access to fix errors

### 6.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Progress: [✓Upload] → [✓Display] → [Configure] → [Nest]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FILE LIST                          DXF PREVIEW                 │
│  ┌────────────────────┐            ┌───────────────────────┐   │
│  │[Search...        ] │            │                       │   │
│  │                    │            │   ┌─────────────┐     │   │
│  │Status   Filters:   │            │   │             │     │   │
│  │[🟢 Closed]         │            │   │   PREVIEW   │     │   │
│  │[🔴 Open/Error]     │            │   │             │     │   │
│  │                    │            │   │   (Canvas)  │     │   │
│  │┌──────────────────┐│            │   │             │     │   │
│  ││#  Name    Size  S││            │   └─────────────┘     │   │
│  ││──────────────────││            │                       │   │
│  ││1  DXF105  221x22│││            │  Zoom: 100%          │   │
│  ││   ✓ Closed    🟢││            │  Position: 0, 0       │   │
│  ││                  ││            │                       │   │
│  ││2  DXF101  300x30│││            │  [Zoom In][Zoom Out] │   │
│  ││   ✓ Closed    🟢││            │  [Fit View][Fullscr]  │   │
│  ││                  ││            └───────────────────────┘   │
│  ││3  DXF102  727x41│││                                        │
│  ││   ✓ Closed    🟢││            LAYERS & INFO               │
│  ││                  ││            ┌──────────────────────┐   │
│  ││4  DXF103  70x25 │││            │Layer     Ent  Vis   │   │
│  ││   ✗ Open      🔴││            │EDGES     5    ☑️     │   │
│  ││                  ││            │                      │   │
│  │└──────────────────┘│            │Dimensions: 221x22mm  │   │
│  │                    │            │Cut Length: 486mm     │   │
│  │                    │            │Pierces: 1            │   │
│  │                    │            │Area: 0.00486 m²     │   │
│  └────────────────────┘            └──────────────────────┘   │
│                                                                │
│  [< Back]                                      [Next >]        │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Components

#### A. Progress Stepper (Top)

Shows current position in workflow:
```
[✓ Upload] → [✓ Display] → [○ Configure] → [○ Nest] → [○ Summary]
```

- **Completed stages**: Green checkmark ✓
- **Current stage**: Highlighted/Bold
- **Upcoming stages**: Gray circle ○

#### B. File List Panel (Left)

**Enhanced from Stage 2 with more details:**

**Search & Filters:**
- Search box: Real-time filter by name
- Status filter buttons:
  - [🟢 Closed] - Show only valid files
  - [🔴 Open/Error] - Show only error files
  - [All] - Show everything

**Table with expanded info:**
```
┌────┬─────────┬──────────┬────────────┬────────┐
│ #  │ Name    │ Size     │ Status     │ Action │
├────┼─────────┼──────────┼────────────┼────────┤
│ 1  │ DXF105  │ 221 x 22 │ ✓ Closed🟢│ [Edit] │
│ 2  │ DXF101  │ 300 x 300│ ✓ Closed🟢│ [Edit] │
│ 3  │ DXF103  │ 70 x 25  │ ✗ Open  🔴│ [Fix!] │
└────┴─────────┴──────────┴────────────┴────────┘
```

**Status indicators:**
- 🟢 **Closed**: Green circle, checkmark ✓
  - Tooltip: "No errors detected. Ready for nesting."
- 🔴 **Open/Multi**: Red circle, X mark ✗
  - Tooltip: "Errors found. Click 'Fix' to repair."
  - Shows error count badge (e.g., "3 errors")

**Row Actions:**
- **[Edit]** button for valid files
  - Opens file healing window for manual review
- **[Fix!]** button for error files (highlighted red)
  - Opens file healing window focused on errors

**Context Menu (Right-click):**
- View Properties
- Open in Editor
- Replace File
- Duplicate
- Delete
- Export as SVG

#### C. DXF Preview Panel (Right-Top)

**Large Canvas Area:**
- Size: 800x600px (responsive)
- Background: Configurable (dark/light)
- Border: Subtle gray border

**Preview Features:**
- **High-quality rendering**: Anti-aliased lines
- **Color-coded layers**: Each layer different color
- **Error highlights**:
  - 🔴 Red circles: Open endpoints
  - 🟡 Yellow highlights: Overlaps
  - 🟠 Orange markers: Self-intersections

**Interactive Controls:**
- **Mouse controls**:
  - Scroll wheel: Zoom in/out
  - Middle mouse drag: Pan
  - Right-click: Context menu
- **Button controls**:
  - [+] Zoom In
  - [-] Zoom Out
  - [⛶] Fit to View
  - [↔] Fullscreen toggle

**Overlay Info:**
- Current zoom level (%)
- Mouse cursor position (X, Y)
- Selected entity info (if clicked)

#### D. Layers & Info Panel (Right-Bottom)

**Layers Table:**
```
┌─────────────┬──────┬─────────┐
│ Layer Name  │ Ent  │ Visible │
├─────────────┼──────┼─────────┤
│ EDGES       │  5   │   ☑️    │
│ HOLES       │  2   │   ☑️    │
│ DIMENSIONS  │  10  │   ☐     │
└─────────────┴──────┴─────────┘
```

**Features:**
- Toggle visibility per layer (checkbox)
- Entity count per layer
- Layer color indicator (colored square/circle)

**File Metadata Display:**
- **Dimensions**: Width x Height (mm)
- **Cut Length**: Total perimeter length (mm)
- **Pierce Count**: Number of holes/cutouts
- **Area**: Enclosed area (m²)
- **Bounding Box**: Min/Max X/Y coordinates

**Validation Results:**
If file has errors, show detailed error list:
```
⚠️ Errors Found (3):
├─ Open contour at (125.5, 45.2)
├─ Self-intersection at (200.0, 100.0)
└─ Overlap detected on layer EDGES
```

### 6.4 File Validation Details

**Validation runs automatically after upload, checking:**

1. **Geometric Validity:**
   - All contours closed (start point = end point)
   - No self-intersections
   - No overlapping duplicate lines
   - Valid coordinates (no NaN, Infinity)

2. **Structural Checks:**
   - At least one closed contour (cuttable shape)
   - Contours properly oriented (CCW for outer, CW for holes)
   - No zero-length entities
   - No degenerate shapes (points, zero-area polygons)

3. **Practical Checks:**
   - Part size within machine limits
   - Part size reasonable (not too small: <5mm, not too large: >10000mm)
   - Complexity reasonable (entity count < 10000)

**Validation levels:**
- ✅ **Valid**: Pass all checks
- ⚠️ **Warning**: Minor issues, can nest but may have problems
- ❌ **Error**: Critical issues, cannot nest until fixed

### 6.5 Error Highlighting

**Visual feedback in preview:**

**Open Contours:**
- Red circle (5px radius) at each open endpoint
- Red dashed line connecting endpoints if gap < 1mm
- Tooltip on hover: "Open contour - gap: 0.5mm"

**Self-intersections:**
- Orange cross marker (X) at intersection point
- Orange highlight on intersecting segments
- Tooltip: "Self-intersection detected"

**Overlaps:**
- Yellow highlight on overlapping entities
- Tooltip: "Duplicate/overlapping line"

**Multi-profile:**
- Blue bounding box around each separate profile
- Label: "Profile 1", "Profile 2", etc.
- Suggestion: "Consider splitting into separate files"

### 6.6 User Interactions

#### Interaction 1: Browse Files
```
1. User sees list of all uploaded files
2. Clicks on a file row
3. File highlights (blue background)
4. Right panel updates:
   - Preview shows file geometry
   - Layers panel shows layers
   - Info panel shows metadata
5. User can navigate through files using arrow keys
```

#### Interaction 2: Check for Errors
```
1. User looks at status column
2. Sees 🔴 red indicator on DXF103
3. Clicks on DXF103
4. Preview shows:
   - Geometry
   - Red circles highlighting open endpoints
   - Error list in info panel: "Open contour at (70.5, 25.2)"
5. User decides to fix:
   - Clicks [Fix!] button
   - → Opens Stage 4: File Healing
```

#### Interaction 3: Verify Valid Files
```
1. User clicks on file with 🟢 status
2. Preview shows clean geometry (no error markers)
3. Info panel shows:
   - "✓ No errors detected"
   - All validation checks passed
   - Metadata (dimensions, cut length, etc.)
4. User confirms file is ready for nesting
```

#### Interaction 4: Toggle Layers
```
1. User clicks on a file
2. Sees multiple layers in layers panel
3. Unchecks "DIMENSIONS" layer
4. Preview updates immediately (dimensions hidden)
5. Can focus on actual cutting geometry only
```

#### Interaction 5: Zoom & Inspect
```
1. User zooms in on specific area
2. Uses mouse wheel or zoom buttons
3. Pans to area of interest
4. Inspects fine details or errors
5. Clicks "Fit View" to reset
```

### 6.7 Bulk Operations

**Select multiple files:**
- Ctrl+Click: Add to selection
- Shift+Click: Range select
- Ctrl+A: Select all

**Actions on multiple files:**
- Right-click selected files
- Context menu:
  - Delete selected
  - Fix all (batch healing)
  - Export selected
  - Mark as reviewed

### 6.8 Navigation

**Bottom buttons:**
- **[< Back]**: Return to Stage 2 (File Upload)
  - Can add more files or remove files
- **[Next >]**: Proceed to Stage 5 (Part Configuration)
  - Condition: At least 1 valid file (🟢 status)
  - If errors exist, show warning:
    ```
    ⚠️ Warning: 2 files have errors
    You can proceed, but these files won't be nested.
    [Fix Errors] [Continue Anyway]
    ```

---

## 7. STAGE 4: FILE HEALING

### 7.1 Mục đích

Window sửa lỗi cho phép user:
- Xem chi tiết các lỗi trong file
- Sửa lỗi tự động (auto-fix)
- Sửa lỗi thủ công (manual editing)
- Validate sau khi sửa

### 7.2 Window Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  File: DXF103.dxf                          [Minimize][Maximize][X] │
├─────────────────────────────────────────────────────────────────────┤
│  TOOLBAR                                                            │
│  [📁Open] [💾Save] [🐞Find] [✂️Split] [📏Measure] [🔄Undo] [🪄Fix]  │
├─────────────────────────────────────────────────────────────────────┤
│  LEFT: Tools    │         CENTER: Canvas          │  RIGHT: Errors │
│  ┌────────────┐ │  ┌──────────────────────────┐  │ ┌────────────┐ │
│  │            │ │  │                          │  │ │            │ │
│  │ SELECT ●   │ │  │                          │  │ │ ERRORS (3) │ │
│  │ PAN   ✋   │ │  │       GEOMETRY           │  │ │            │ │
│  │ ZOOM  🔍   │ │  │                          │  │ │ 🔴 Open    │ │
│  │ ------     │ │  │      (Canvas area)       │  │ │   at X,Y   │ │
│  │ LINE  ─    │ │  │                          │  │ │   [Fix]    │ │
│  │ ARC   ⌒    │ │  │                          │  │ │            │ │
│  │ CIRCLE ○   │ │  │                          │  │ │ 🟡 Overlap │ │
│  │ DELETE 🗑️  │ │  │                          │  │ │   layer 0  │ │
│  │ CLOSE  ⌇   │ │  │                          │  │ │   [Remove] │ │
│  │ TRIM   ✂️   │ │  │                          │  │ │            │ │
│  │ EXTEND ↔️  │ │  │                          │  │ │ 🟠 Intersec│ │
│  │            │ │  │                          │  │ │   at X,Y   │ │
│  └────────────┘ │  └──────────────────────────┘  │ │   [Split]  │ │
│                 │                                 │ │            │ │
│                 │  PROPERTIES PANEL               │ │ [Auto Fix] │ │
│                 │  ┌─────────────────────────┐   │ └────────────┘ │
│                 │  │ Selected: LINE          │   │                │
│                 │  │ Layer: EDGES            │   │                │
│                 │  │ Start: (0, 0)           │   │                │
│                 │  │ End: (100, 50)          │   │                │
│                 │  │ Length: 111.80mm        │   │                │
│                 │  └─────────────────────────┘   │                │
├─────────────────────────────────────────────────────────────────────┤
│  Status: 3 errors found | Cursor: (125.5, 45.2) | Zoom: 150%      │
│                                         [Cancel] [Apply & Close]    │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.3 Components

#### A. Toolbar (Top)

**File Operations:**
- 📁 **Open**: Load different file
- 💾 **Save**: Save changes (disabled if no changes)
- 📤 **Export**: Export as DXF/SVG

**Editing Tools:**
- 🐞 **Find Errors**: Re-run validation, highlight errors
- ✂️ **Split**: Break lines at intersection
- 📏 **Measure**: Measure distances/angles
- 🔄 **Undo/Redo**: 20-step history
- 🪄 **Auto Fix**: Attempt automatic repair

**View Tools:**
- 🔍 **Zoom In/Out**
- ⛶ **Fit to View**
- 👁️ **Show/Hide**: Layers, grid, snap points

#### B. Tools Panel (Left)

**Selection & Navigation:**
- **Select** (S key): Default tool, click to select entities
- **Pan** (spacebar): Drag to pan view
- **Zoom** (Z key): Click to zoom in, Shift+Click to zoom out

**Drawing Tools:** (for manual fixing)
- **Line** (L key): Draw straight line
- **Arc** (A key): Draw arc
- **Circle** (C key): Draw circle

**Editing Tools:**
- **Delete** (Delete key): Remove selected entities
- **Close Contour**: Connect endpoints to close shape
- **Trim**: Cut entity at intersection
- **Extend**: Extend entity to meet another
- **Offset**: Create parallel offset
- **Merge**: Combine overlapping entities

**Smart Tools:**
- **Snap**: Snap to endpoints, midpoints, intersections
- **Ortho**: Constrain to horizontal/vertical
- **Grid Snap**: Snap to grid points

#### C. Canvas Area (Center)

**Large drawing area** (80% of window)

**Visual Elements:**
- **Grid**: Optional reference grid (1mm, 5mm, 10mm spacing)
- **Origin**: X/Y axes indicator
- **Geometry**: All DXF entities rendered
- **Error Highlights**: Red/Yellow/Orange markers
- **Selection**: Selected entities highlighted in blue
- **Snap Points**: Small circles at snap locations

**Mouse Interactions:**
- **Left-click**: Select entity or use active tool
- **Right-click**: Context menu
- **Middle-drag**: Pan
- **Scroll wheel**: Zoom in/out
- **Hover**: Highlight entity under cursor, show tooltip

**Keyboard Shortcuts:**
- S: Select tool
- L: Line tool
- Delete: Delete selected
- Ctrl+Z: Undo
- Ctrl+Y: Redo
- Esc: Cancel current operation
- F: Fit to view

#### D. Errors Panel (Right)

**Error List:**

Each error displayed as card:
```
┌──────────────────────────────┐
│ 🔴 OPEN CONTOUR              │
│ Location: (125.5, 45.2)      │
│ Gap: 0.5mm                   │
│                              │
│ [Zoom To] [Auto Fix]         │
└──────────────────────────────┘
```

**Error Types:**

1. **🔴 Open Contour**
   - Description: "Endpoints not connected"
   - Info: Gap distance, endpoint coordinates
   - Actions:
     - [Zoom To]: Pan/zoom to error location
     - [Auto Fix]: Snap endpoints together (if gap < 1mm)
     - [Close Manually]: Activate close tool

2. **🟡 Overlap**
   - Description: "Duplicate or overlapping entities"
   - Info: Layer, entity IDs
   - Actions:
     - [Zoom To]: Navigate to overlap
     - [Remove Duplicate]: Delete one entity
     - [Keep Both]: Ignore (if intentional)

3. **🟠 Self-intersection**
   - Description: "Lines cross each other"
   - Info: Intersection point
   - Actions:
     - [Zoom To]: Show intersection
     - [Split]: Break at intersection
     - [Ignore]: Continue (some designs need this)

**Summary:**
- Total errors count
- Errors by type breakdown
- **[Auto Fix All]** button - attempts to fix all errors automatically
- **[Ignore All]** button - mark file as "reviewed, intentional"

#### E. Properties Panel (Bottom-Center)

Shows properties of selected entity:

**Line:**
- Type: LINE
- Layer: EDGES
- Start point: (x1, y1)
- End point: (x2, y2)
- Length: calculated
- Angle: degrees from horizontal

**Arc:**
- Type: ARC
- Layer: EDGES
- Center: (x, y)
- Radius: value
- Start angle: degrees
- End angle: degrees
- Length: arc length

**Circle:**
- Type: CIRCLE
- Layer: EDGES
- Center: (x, y)
- Radius: value
- Circumference: calculated

**Actions:**
- [Delete]: Remove entity
- [Properties]: Edit properties (layer, color)
- [Duplicate]: Create copy

#### F. Status Bar (Bottom)

**Left side:**
- Current status: "3 errors found" / "No errors detected"
- File modified indicator: "*" if unsaved changes

**Center:**
- Cursor position: "(X, Y)" live coordinates
- Snap indicator: "SNAP: Endpoint" when snap active

**Right side:**
- Zoom level: "150%"
- Units: "mm"
- Grid spacing: "1mm"

### 7.4 Error Detection & Auto-Fix Logic

#### Auto-Fix Algorithm:

```
For each error:
    If (error type == OPEN CONTOUR):
        If (gap < tolerance):
            → Snap endpoints together
        Else if (gap < 5mm):
            → Add connecting line
        Else:
            → Cannot auto-fix, mark for manual review
    
    If (error type == OVERLAP):
        If (entities identical):
            → Delete duplicate
        Else if (entities very close):
            → Merge into single entity
        Else:
            → Cannot auto-fix, mark for manual review
    
    If (error type == SELF-INTERSECTION):
        → Split entity at intersection point
        → Create separate segments
```

**Tolerance settings** (configurable in settings):
- Gap tolerance: 0.01mm - 1.0mm (default: 0.1mm)
- Overlap tolerance: 0.001mm - 0.1mm (default: 0.01mm)
- Angle tolerance: 0.1° - 5° (default: 1°)

#### Auto-Fix Success Rate:

- **Open contours** (small gaps): ~90% success
- **Overlaps**: ~95% success
- **Self-intersections**: ~70% success (depends on complexity)

**Results:**
- Show success count: "Fixed 2 of 3 errors"
- Remaining errors require manual fixing

### 7.5 Manual Editing Tools

#### Tool 1: Close Contour

**Purpose:** Connect two endpoints to close an open contour

**Usage:**
1. Click "Close Contour" tool
2. Click first endpoint
3. Click second endpoint
4. System draws connecting line
5. Validates closed shape

**Options:**
- Straight line (default)
- Arc (prompts for radius/direction)
- Smart close (finds shortest path avoiding other geometry)

#### Tool 2: Trim

**Purpose:** Cut a line at intersection or specified point

**Usage:**
1. Click "Trim" tool
2. Click cutting edge (reference)
3. Click portion to remove
4. Entity trimmed at intersection

#### Tool 3: Extend

**Purpose:** Extend a line to meet another entity

**Usage:**
1. Click "Extend" tool
2. Click boundary edge
3. Click line to extend
4. Line extends to meet boundary

#### Tool 4: Delete

**Purpose:** Remove unwanted entities

**Usage:**
1. Select entity/entities
2. Press Delete key or click Delete button
3. Confirm deletion
4. Entities removed

#### Tool 5: Merge

**Purpose:** Combine collinear or overlapping lines

**Usage:**
1. Select multiple entities
2. Click "Merge" button
3. System detects mergeable entities
4. Merges into single entity

### 7.6 Validation After Editing

**Real-time validation:**
- After each edit operation, system re-validates affected geometry
- Updates error list dynamically
- Updates error count badge

**Final validation:**
- Click [Apply & Close]
- System runs full validation
- If errors remain:
  ```
  ⚠️ Warning: 1 error still exists
  
  The file still has errors. You can:
  - [Continue Fixing]: Stay in editor
  - [Save Anyway]: Save as-is (may cause issues in nesting)
  - [Cancel]: Discard changes
  ```
- If no errors:
  ```
  ✅ Success: All errors fixed!
  
  File is now valid and ready for nesting.
  [Close]
  ```

### 7.7 User Workflows

#### Workflow 1: Auto-fix Simple Errors
```
1. User opens file with errors in healing window
2. Sees error list: "3 errors"
3. Clicks [Auto Fix All] button
4. System attempts automatic repairs:
   - Closed 2 open contours ✓
   - Removed 1 duplicate line ✓
5. Success message: "Fixed 3 of 3 errors"
6. Error list now empty
7. User clicks [Apply & Close]
8. File status updated to 🟢 Closed
```

#### Workflow 2: Manual Fix Complex Error
```
1. User opens file with self-intersection error
2. Auto-fix fails (too complex)
3. User clicks [Zoom To] on error
4. Canvas zooms to intersection point
5. User selects "Split" tool
6. Clicks on intersection point
7. Entity splits into 2 separate segments
8. User deletes unwanted segment
9. User selects "Close Contour" tool
10. Clicks endpoints to close shape
11. Error clears from list
12. User clicks [Apply & Close]
```

#### Workflow 3: Review and Ignore Errors
```
1. User opens file with "multi-profile" warning
2. Reviews geometry - multiple separate shapes are intentional
3. User clicks [Ignore All]
4. System marks errors as "reviewed"
5. File status remains valid, but keeps flag
6. Can proceed to nesting (will treat as multiple parts)
```

### 7.8 Save & Exit

**[Apply & Close] button:**
- Saves all changes to file
- Updates file status in main list
- Closes healing window
- Returns to Stage 3 (File Display)

**[Cancel] button:**
- Prompts if changes exist:
  ```
  Discard changes?
  You have unsaved changes.
  [Save & Close] [Discard] [Cancel]
  ```
- If no changes: Closes immediately

**Auto-save:**
- Optional: Auto-save every 2 minutes
- Saved to temp location
- Can recover if crash

---

## 8. STAGE 5: PART CONFIGURATION

### 8.1 Mục đích

Stage này cho phép user:
- Cấu hình material, thickness cho từng part
- Thiết lập quantity cần sản xuất
- Chọn machine và operations
- Preview part details và pricing
- Select/deselect parts để báo giá

### 8.2 Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Progress: [✓Upload] [✓Display] → [●Configure] → [Nest] → [Summary]    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  PARTS LIBRARY TABLE                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Count: 13 parts                                         [✓Select All] │
│  │                                                                   │    │
│  │ ☑ Name    Assembly  Preview  Qty  MultiQty Grain Machine Material Op│
│  │ ─────────────────────────────────────────────────────────────────│    │
│  │ ☑ DXF105  -         [img]    10   -        Both  NCTOOLS SS304   [..]│
│  │                                               221x22    0.9mm     45  │
│  │                                                                   │    │
│  │ ☑ DXF101  -         [img]    10   -        Both  NCTOOLS SS304   [..]│
│  │                                               300x300   0.9mm     45  │
│  │                                                                   │    │
│  │ ☑ DXF102  -         [img]    10   -        Both  NCTOOLS SS304   [..]│
│  │                                               727x417   0.9mm     45  │
│  │                                                                   │    │
│  │ ... (more rows)                                                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  EDIT PANEL (appears on right when clicking edit or selecting part)      │
│  ┌─────────────────────────────┐                                         │
│  │ EDIT PART: DXF105           │                                         │
│  │                             │                                         │
│  │ Machine    [NCTOOLS    ▼]   │                                         │
│  │ Material   [Stainless Steel▼]                                         │
│  │ Grade      [304         ▼]  │                                         │
│  │ Thickness  [0.9mm       ▼]  │                                         │
│  │                             │                                         │
│  │ Price Markup% [45      ]    │                                         │
│  │ Quantity     [1        ]    │                                         │
│  │ Grain Dir    [Both     ▼]   │                                         │
│  │                             │                                         │
│  │ Operations:                 │                                         │
│  │ ☑ Cutting (included)        │                                         │
│  │ ☐ Bending       $2.50/unit  │                                         │
│  │ ☐ Deburring     $1.00/unit  │                                         │
│  │ ☐ Painting      $5.00/unit  │                                         │
│  │                             │                                         │
│  │ [Apply] [Cancel]            │                                         │
│  └─────────────────────────────┘                                         │
│                                                                           │
│  [< Back]                                      [Next: Nesting >]          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Components

#### A. Parts Library Table

**Table structure với columns:**

1. **☑ Checkbox**
   - Select/deselect part for quote
   - Select all checkbox in header
   - Only selected parts will be nested

2. **Name**
   - DXF file name without extension
   - Click to select row
   - Double-click to open edit panel

3. **Assembly Name** (optional)
   - Group parts into assemblies
   - Example: "Frame Assembly", "Door Panel"
   - Empty by default
   - Can assign via right-click menu

4. **Preview**
   - Thumbnail image (100x100px)
   - Shows part geometry
   - Click to open larger preview dialog

5. **Quantity**
   - Number input
   - Default: 1
   - Can edit inline (click to edit)
   - Affects total cost calculation

6. **Multi Quantity** (optional)
   - For multiple batch sizes
   - Example: "10, 20, 50" means 3 separate batches
   - Used for quantity breaks in pricing

7. **Grain Direction**
   - Dropdown: Both / Horizontal / Vertical
   - Both: Can rotate freely
   - Horizontal: Keep horizontal only (0° or 180°)
   - Vertical: Keep vertical only (90° or 270°)
   - Affects nesting optimization

8. **Machine**
   - Dropdown of available machines
   - Example: NCTOOLS, LaserCut500, etc.
   - Each machine has different hourly rate

9. **Material**
   - Hierarchical display:
     - Line 1: Material + Grade
     - Line 2: Dimensions (from part)
     - Line 3: Thickness
   - Example:
     ```
     Stainless Steel 304
     221.1 x 22
     0.9mm
     ```
   - Click to edit (opens material selector)

10. **Operations**
    - Shows active operations as badges
    - Click [...] button to open operations menu
    - Each operation adds to cost

11. **Price Markup %**
    - Shown in small text below material
    - Example: "Material Markup = 45"
    - Indicates markup applied to this part

12. **Unit Cost** (calculated, read-only)
    - Cost per single piece
    - Calculated from:
      - Material cost
      - Cutting cost
      - Operations cost
      - Markup
    - Format: $XX.XX

13. **Total Cost** (calculated, read-only)
    - Unit Cost × Quantity
    - Format: $XXX.XX
    - Sum shown at bottom of table

**Table Features:**
- **Inline editing**: Click cell to edit directly
- **Bulk edit**: Select multiple rows, right-click, choose "Edit selected"
- **Row colors**: Alternating gray/white for readability
- **Hover effect**: Row highlights on mouse over
- **Sticky header**: Header stays visible when scrolling
- **Auto-save**: Changes saved immediately to quote state

#### B. Table Toolbar (Above table)

**Left side:**
- **Count indicator**: "Count: 13 parts"
- **Selected count**: "(5 selected)" if any selected

**Right side:**
- **[✓ Select All]** button: Toggle select all parts
- **[Edit Selected]** button: Bulk edit (appears when multiple selected)
- **[Delete Selected]** button: Remove parts from quote

#### C. Context Menu (Right-click on row)

**Single part selected:**
- Edit
- Duplicate
- Delete
- View Preview (large)
- Merge selection to this (if others selected)
- Properties
- ---
- Add material part
- Removes material cost
- Actual area
- Bounding box area
- Remove minimum cost

**Multiple parts selected:**
- Edit All (opens bulk edit panel)
- Delete All
- Assign to Assembly
- Copy Properties From... (select source part)

#### D. Edit Panel (Right side or Modal)

**Opens when:**
- User clicks "Edit" button
- User double-clicks row
- User right-clicks and selects "Edit"

**Panel layout:**

```
┌───────────────────────────────────┐
│  EDIT PART: DXF105        [X]     │
├───────────────────────────────────┤
│                                   │
│  MACHINE & MATERIAL               │
│  ┌─────────────────────────────┐ │
│  │ Machine    [NCTOOLS    ▼]   │ │
│  │ Material   [SS         ▼]   │ │
│  │ Grade      [304        ▼]   │ │
│  │ Thickness  [0.9        ▼]   │ │
│  └─────────────────────────────┘ │
│                                   │
│  QUANTITY & OPTIONS               │
│  ┌─────────────────────────────┐ │
│  │ Quantity        [1      ]   │ │
│  │ Grain Direction [Both  ▼]   │ │
│  │ Price Markup %  [45     ]   │ │
│  └─────────────────────────────┘ │
│                                   │
│  OPERATIONS                       │
│  ┌─────────────────────────────┐ │
│  │ ☑ Cutting (always included) │ │
│  │ ☐ Bending      $2.50/unit   │ │
│  │ ☐ Deburring    $1.00/unit   │ │
│  │ ☐ Drilling     $0.50/hole   │ │
│  │ ☐ Welding      $15.00/joint │ │
│  │ ☐ Painting     $5.00/unit   │ │
│  └─────────────────────────────┘ │
│                                   │
│  PREVIEW                          │
│  ┌─────────────────────────────┐ │
│  │                             │ │
│  │      [Part Preview]         │ │
│  │                             │ │
│  │  Area: 0.00486 m²           │ │
│  │  Perimeter: 486mm           │ │
│  │  Pierces: 0                 │ │
│  └─────────────────────────────┘ │
│                                   │
│  ┌────────────┐  ┌─────────────┐ │
│  │  Cancel    │  │   Apply     │ │
│  └────────────┘  └─────────────┘ │
└───────────────────────────────────┘
```

### 8.4 Material Selection Logic

**Material dropdown structure:**

```
Material (Top level):
├── Stainless Steel
│   ├── 304
│   │   ├── 0.9mm (1500 x 6000)  $5.50/kg
│   │   └── 1.2mm (1500 x 6000)  $5.50/kg
│   └── 316
│       └── 0.9mm (1500 x 6000)  $6.20/kg
├── Mild Steel
│   └── A36
│       └── 3.0mm (2500 x 12000) $0.80/kg
└── Aluminum
    └── 6061
        └── 3.0mm (1250 x 2500)  $4.20/kg
```

**Selection flow:**
1. User clicks Material dropdown
2. Sees list of materials from stock
3. Expands material to see grades
4. Expands grade to see thicknesses
5. Each option shows:
   - Name + Grade + Thickness
   - Sheet size
   - Price per kg
6. User selects option
7. All fields update in table

**Validation:**
- If selected material not compatible with part size:
  - Show warning: "Part dimensions (727 x 417) exceed sheet size (1250 x 2500)"
  - Cannot select (grayed out)

### 8.5 Operations Configuration

**Available operations** (from settings):

1. **Cutting** (always included)
   - Cost: Based on cut length and machine rate
   - Cannot disable

2. **Bending**
   - Cost per unit or per bend
   - Input: Number of bends (optional)

3. **Deburring**
   - Cost per unit or per area
   - Option: By Area (auto-calculate from part area)

4. **Drilling**
   - Cost per hole
   - Input: Number of holes (manual entry)

5. **Welding**
   - Cost per joint or per length
   - Input: Number of welds or weld length

6. **Painting**
   - Cost per unit or per area
   - Options: Color, finish type

7. **Assembly**
   - Cost per unit
   - Time-based: minutes × hourly rate

8. **Sub-contracting** (outsourced work)
   - Fixed cost per unit
   - Input: Custom cost

**Operations panel:**
```
☑ Cutting        (included)
☐ Bending        $2.50/unit      [↓ Details]
☐ Deburring      $1.00/unit
☐ Drilling       $0.50/hole       [# Holes: 4  ]
☐ Welding        $15.00/joint     [# Joints: 2 ]
☐ Painting       $5.00/unit       [Color: RAL9005▼]
☐ Assembly       30 min @ $45/hr
☐ Custom Op 1    $10.00/unit      [Edit]
```

**When checkbox clicked:**
- Operation enabled
- Cost added to unit cost
- Some operations show additional inputs (e.g., number of holes)

### 8.6 Preview Dialog

**Triggered by:**
- Clicking preview thumbnail in table
- Clicking "Preview" in edit panel

**Dialog content:**

```
┌─────────────────────────────────────────────────────┐
│  Part Preview: DXF105                        [X]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Tabs: [Preview] [Part Detail] [Cost Detail]       │
│                                                     │
│  PREVIEW TAB (Active):                              │
│  ┌───────────────────────────────────────────────┐ │
│  │                                               │ │
│  │                                               │ │
│  │          [Large Part Preview]                │ │
│  │                                               │ │
│  │                                               │ │
│  │         (Interactive canvas)                 │ │
│  │                                               │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  Info:                                              │
│  ├─ Area: 0.00486 m²                                │
│  ├─ Perimeter: 486mm                                │
│  ├─ Dimensions: 221.1 x 22 mm                       │
│  └─ Pierces: 0                                      │
│                                                     │
│  Notes:                                             │
│  [Text area for notes]                              │
│                                                     │
│  ☐ Add to report                                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Part Detail Tab:**
```
Material:
├─ Type: Stainless Steel 304
├─ Thickness: 0.9mm
├─ Sheet size: 1500 x 6000mm
└─ Price: $5.50/kg

Part Specs:
├─ Dimensions: 221.1 x 22 mm
├─ Area: 0.00486 m²
├─ Weight: 0.035 kg
└─ Cut length: 486mm

Machine:
├─ Name: NCTOOLS
├─ Hour rate: $75/hr
└─ Cutting speed: 3000 mm/min
```

**Cost Detail Tab:**
```
Cost Breakdown:
├─ Material: $0.19
│   └─ (0.035kg × $5.50/kg)
├─ Cutting: $1.22
│   ├─ Time: 0.162 min (486mm ÷ 3000mm/min)
│   └─ Cost: (0.162÷60) × $75/hr
├─ Piercing: $0.15
│   └─ (1 pierce × $0.15)
├─ Operations: $0.00
│   └─ (none selected)
├─ Subtotal: $1.56
├─ Markup (45%): $0.70
└─ Unit Cost: $2.26

Quantity: 10
Total: $22.60
```

### 8.7 Bulk Edit Features

**When multiple parts selected:**

**Bulk Edit Panel:**
```
┌───────────────────────────────────┐
│  EDIT 5 PARTS               [X]   │
├───────────────────────────────────┤
│                                   │
│  Apply to all selected:           │
│                                   │
│  ☐ Machine    [NCTOOLS    ▼]     │
│  ☐ Material   [SS 304 0.9 ▼]     │
│  ☐ Quantity   [10         ]       │
│  ☐ Grain Dir  [Both       ▼]     │
│  ☐ Markup %   [45         ]       │
│                                   │
│  Operations:                      │
│  ☐ Enable Bending for all         │
│  ☐ Enable Deburring for all       │
│                                   │
│  Note: Only checked fields        │
│  will be updated                  │
│                                   │
│  [Cancel]  [Apply to Selected]    │
└───────────────────────────────────┘
```

**Checkbox behavior:**
- Only checked fields will be updated
- Unchecked fields remain as-is for each part
- Allows partial bulk updates

### 8.8 Validation & Warnings

**Before proceeding to nesting:**

**Checks:**
1. At least 1 part selected (checkbox)
2. All selected parts have material assigned
3. All selected parts have quantity > 0
4. Material sheet size larger than part dimensions

**Warnings (non-blocking):**
- "Part DXF105: Dimensions close to sheet size. Nesting may be inefficient."
- "3 parts have high markup (>50%). Review pricing?"

**Errors (blocking):**
- "Error: Part DXF102 has no material selected."
- "Error: Part DXF103 exceeds sheet dimensions (727x417 > 300x200)."

**Dialog if errors:**
```
⚠️ Cannot Proceed
The following issues must be fixed:
├─ DXF102: No material selected
└─ DXF103: Exceeds sheet size

[Fix Issues] [Cancel]
```

### 8.9 Auto-calculate Features

**Material Markup display:**
- Shows "Material Markup = X" below each part
- Calculated from:
  - Global material markup (from quote settings)
  - Client-specific material markup (if any)
  - Part-specific override (if set)

**Unit Cost auto-calculation:**
- Updates in real-time when any input changes:
  - Material changed → Recalculate material cost
  - Quantity changed → Recalculate total
  - Operations toggled → Add/remove operation cost
  - Markup changed → Recalculate final price

**Total Cost summary:**
- Shown at bottom of table
- Sum of all selected parts' total costs
- Updates dynamically

### 8.10 Navigation

**Bottom buttons:**
- **[< Back]**: Return to Stage 3 (File Display)
  - Can review files again or add more
- **[Next: Nesting >]**: Proceed to Stage 6 (Nesting)
  - Validates all parts first
  - If validation fails, shows errors
  - If validation passes, proceeds to nesting

**Progress saved:**
- All configurations auto-saved to quote state
- Can exit and resume later
- Changes persist across sessions

---

## 9. STAGE 6: NESTING

### 9.1 Mục đích

Stage quan trọng nhất: Sắp xếp tối ưu các parts lên tấm phôi để:
- Tối thiểu hóa waste (phần thừa không dùng)
- Giảm số lượng tấm phôi cần dùng
- Tính toán chính xác kích thước phôi sử dụng (KHÔNG tính theo full sheet)
- Visualize kết quả nesting

### 9.2 Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  Progress: [✓Upload][✓Display][✓Config] → [●Nesting] → [Summary] │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  LEFT: Config Panel     │     RIGHT: Nesting Canvas               │
│  ┌───────────────────┐  │  ┌─────────────────────────────────┐   │
│  │ GROUP             │  │  │                                 │   │
│  │ Material: SS304   │  │  │                                 │   │
│  │ Grade: 304        │  │  │      [Original Sheet]           │   │
│  │ Thickness: 0.9    │  │  │      (dashed outline)           │   │
│  │                   │  │  │                                 │   │
│  │ SHEET             │  │  │   ┌─────────────────────┐       │   │
│  │ [2500x1250  ▼]    │  │  │   │  [Used Area]        │       │   │
│  │                   │  │  │   │  (solid blue)       │       │   │
│  │ Sheet Margin: 10  │  │  │   │                     │       │   │
│  │ Sheet Cost: 1994  │  │  │   │  [Parts arranged]   │       │   │
│  │ Part Spacing: 15  │  │  │   │                     │       │   │
│  │                   │  │  │   └─────────────────────┘       │   │
│  │ ADVANCED          │  │  │                                 │   │
│  │ Rotations: [4 ▼]  │  │  │   [Waste area]                  │   │
│  │ Population: 10    │  │  │   (red hatched)                │   │
│  │ Generations: 100  │  │  │                                 │   │
│  │ Mutation: 10%     │  │  │                                 │   │
│  │                   │  │  └─────────────────────────────────┘   │
│  │ [Start Nesting]   │  │                                        │
│  │     (big button)  │  │  CONTROLS                              │
│  └───────────────────┘  │  [Zoom][Pan][Fit][Fullscreen]         │
│                         │                                        │
│  RESULTS (after nest):  │  RESULTS INFO                          │
│  ┌───────────────────┐  │  ┌─────────────────────────────────┐ │
│  │ Total Sheets: 2   │  │  │ Sheet 1:                        │ │
│  │ Utilization: 8.7% │  │  │ ├─ Original: 1500 x 6000mm      │ │
│  │                   │  │  │ ├─ Used: 1500 x 450mm           │ │
│  │ Sheet 1:          │  │  │ ├─ Parts: 10                    │ │
│  │ ├─ Used: 1500x450 │  │  │ ├─ Utilization: 7.5%            │ │
│  │ ├─ Parts: 10      │  │  │ └─ Cost: $24.79                 │ │
│  │ └─ Cost: $24.79   │  │  │                                 │ │
│  │                   │  │  │ Sheet 2:                        │ │
│  │ Sheet 2:          │  │  │ ├─ Original: 1500 x 6000mm      │ │
│  │ ├─ Used: 1500x285 │  │  │ ├─ Used: 1500 x 285mm           │ │
│  │ ├─ Parts: 8       │  │  │ ├─ Parts: 8                     │ │
│  │ └─ Cost: $15.70   │  │  │ ├─ Utilization: 4.75%           │ │
│  │                   │  │  │ └─ Cost: $15.70                 │ │
│  │ TOTAL: $40.49     │  │  └─────────────────────────────────┘ │
│  └───────────────────┘  │                                        │
│                         │                                        │
│  [< Back]               │                      [Next: Summary >] │
└────────────────────────────────────────────────────────────────────┘
```

### 9.3 Components

#### A. Configuration Panel (Left)

**Group Selection:**
```
Material:    [Stainless Steel    ▼]
Grade:       [304                ▼]
Thickness:   [0.9mm              ▼]
```

**Purpose:** Group parts by material/thickness for nesting
- Only parts with same material can be nested together
- Automatically groups parts from Part Configuration stage
- Shows count: "13 parts to nest"

**Sheet Configuration:**
```
Sheet Size:     [2500 x 1250      ▼]
                 ├─ 2500 x 1250
                 ├─ 2438 x 915
                 ├─ 2438 x 1219
                 ├─ 3048 x 1219
                 ├─ 3000 x 1500
                 ├─ 2440 x 1220
                 └─ 2500 x 1250

Sheet Margin:   [10      ] mm
Sheet Cost:     [1994.10 ] $ (calculated)
Part Spacing:   [15      ] mm
```

**Fields explained:**

**Sheet Size:**
- Dropdown populated from Material Stock settings
- Shows available sheet dimensions for selected material
- Format: Width x Max_Length
- Example: 1500 x 6000mm means:
  - Fixed width: 1500mm
  - Maximum length: 6000mm
  - Actual used length calculated after nesting

**Sheet Margin:**
- Distance from edge of sheet (mm)
- Parts must be placed at least this distance from edge
- Default: 10mm
- Accounts for clamping area on machine

**Sheet Cost:**
- Cost of ONE FULL sheet (width x max_length)
- Auto-calculated from:
  - Sheet area × thickness × density × price per kg
- For reference only (actual cost based on used dimensions)
- Format: $XXXX.XX

**Part Spacing:**
- Minimum gap between parts (mm)
- Default: 15mm
- Accounts for:
  - Laser kerf (cut width)
  - Heat-affected zone
  - Safety margin for handling

**Advanced Settings (Collapsible):**
```
▼ Advanced Options

Rotations:        [4        ▼]
                   ├─ 1 (0° only)
                   ├─ 2 (0°, 180°)
                   ├─ 4 (0°, 90°, 180°, 270°)
                   └─ 8 (every 45°)

Population Size:  [10       ]
Generations:      [100      ]
Mutation Rate:    [10       ] %

Optimize For:     
  ● Minimize Length (default)
  ○ Minimize Sheets

☐ Use Holes (place small parts in large part holes)
☐ Explore Concave (utilize concave areas)
```

**Advanced fields:**

**Rotations:**
- Number of rotation angles to try per part
- More rotations = better packing but slower
- Grain direction from Part Config restricts this
  - If grain = "Horizontal" → Only 0° and 180° (override to 2)
  - If grain = "Vertical" → Only 90° and 270° (override to 2)

**Population Size:**
- Number of solutions in genetic algorithm population
- Range: 5-50
- Default: 10
- Higher = better results but slower

**Generations:**
- Number of GA iterations
- Range: 10-500
- Default: 100
- More generations = better optimization but longer time

**Mutation Rate:**
- Probability of mutation in GA (%)
- Range: 1-50
- Default: 10
- Higher = more exploration but less stable

**Optimize For:**
- **Minimize Length**: Find arrangement with shortest total length
  - Best for coil material (pay for length used)
  - Default option
- **Minimize Sheets**: Reduce number of sheets needed
  - Best for fixed sheet material
  - May result in longer sheets but fewer total

**Use Holes:**
- Attempt to place small parts inside holes of larger parts
- Complex calculation, may be slow
- Can significantly improve utilization for parts with large holes

**Explore Concave:**
- Utilize concave areas (indentations) in parts
- More thorough search, slower
- Better for complex geometries

#### B. Start Nesting Button

**Large, prominent button:**
```
┌───────────────────────────┐
│    [▶ START NESTING]      │
│     (primary action)      │
└───────────────────────────┘
```

**States:**
- **Ready**: Blue, clickable
- **Running**: Gray, disabled, shows "Running... 15%"
- **Complete**: Green, shows "✓ Complete"

**Behavior:**
- Click → Starts nesting process
- Shows progress indicator
- Disables all config fields during nesting
- Can click "Stop" to abort (rare)

#### C. Nesting Canvas (Right-Top)

**Large visualization area** (800px × 600px)

**Before nesting:**
- Shows empty sheet outline (dashed)
- Sheet dimensions labeled
- Coordinate system (X, Y axes)

**During nesting:**
- Progress indicator overlay
- "Calculating NFPs..." → "Generation 15/100..." → "Finalizing..."
- Animated progress bar

**After nesting:**
- Shows complete nesting result
- Visual elements:

**1. Original Sheet Boundary** (gray dashed line)
```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│  Max: 1500 x 6000mm            │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

**2. Used Area Boundary** (blue solid line)
```
┌───────────────────┐
│ Used: 1500 x 450mm│
│                   │
│  [Parts arranged] │
│                   │
└───────────────────┘
```

**3. Parts** (filled shapes, different colors)
- Each part rendered with its geometry
- Color-coded by part name or rotation
- Part labels (small text with part name)
- Spacing visible between parts

**4. Waste Area** (red hatched pattern)
```
└───────────────────┘ ← Used area ends here
  ╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱  ← Waste area (red hatched)
```

**5. Dimension Lines**
- Width dimension line at bottom
- Length dimension line on right
- Labels: "1500mm", "450mm"

**Interactive features:**
- **Hover over part**: Highlight part, show tooltip with part name
- **Click part**: Select part, show details in side panel
- **Zoom**: Mouse wheel or buttons
- **Pan**: Middle mouse drag
- **Fullscreen**: Button to expand canvas

**Controls bar below canvas:**
```
[🔍+] [🔍-] [⛶ Fit] [↔ Fullscreen] | Sheet: [1 ▼] of 2
```

**Sheet selector:**
- If multiple sheets, dropdown to switch between sheets
- Each sheet has its own nesting visualization

#### D. Results Panel (Left-Bottom)

**Summary card:**
```
┌─────────────────────────────┐
│ NESTING RESULTS             │
├─────────────────────────────┤
│ Total Sheets:     2         │
│ Avg Utilization:  6.1%      │
│ Total Parts:      18        │
│ Unplaced Parts:   0         │
├─────────────────────────────┤
│ Total Material Cost:        │
│      $40.49                 │
└─────────────────────────────┘
```

**Per-sheet breakdown:**
```
Sheet 1:
├─ Original: 1500 x 6000mm
├─ Used: 1500 x 450mm
├─ Utilization: 7.5%
├─ Parts placed: 10
├─ Waste: 5550mm length
└─ Cost: $24.79

Sheet 2:
├─ Original: 1500 x 6000mm
├─ Used: 1500 x 285mm
├─ Utilization: 4.75%
├─ Parts placed: 8
├─ Waste: 5715mm length
└─ Cost: $15.70
```

**Visual indicators:**
- Utilization bar graph per sheet
- Green if utilization > 75%
- Yellow if utilization 50-75%
- Red if utilization < 50%

#### E. Results Info Panel (Right-Bottom)

**Detailed sheet information:**

**Expandable/collapsible per sheet:**
```
▼ Sheet 1 of 2

Dimensions:
├─ Original sheet: 1500 x 6000mm (9 m²)
├─ Used area: 1500 x 450mm (0.675 m²)
└─ Waste: 8.325 m²

Parts Placed (10):
├─ DXF105 (x2) at positions [(100,50), (350,50)]
├─ DXF101 (x3) at positions [...]
└─ DXF102 (x5) at positions [...]

Material Cost:
├─ Sheet cost (full): $123.75
├─ Used cost (actual): $24.79
└─ Savings: $98.96 (80%)

Cutting Info:
├─ Total cut length: 4860mm
├─ Total pierces: 10
└─ Estimated time: 2.43 min
```

### 9.4 Nesting Algorithm Process

**Step-by-step flow:**

```
User clicks [Start Nesting]
    ↓
1. Preparation
   ├─ Gather all parts for selected material group
   ├─ Convert DXF geometry to polygons
   ├─ Apply spacing (offset polygons)
   └─ Validate parts fit in sheet width
    ↓
2. NFP Calculation (No-Fit Polygon)
   ├─ For each pair of parts:
   │   ├─ Calculate NFP (orbital path)
   │   ├─ Cache result (key: partA_partB_rotationA_rotationB)
   │   └─ Progress: 1-40%
   └─ Calculate IFP (Inner-Fit Polygon) with sheet
    ↓
3. Genetic Algorithm
   ├─ Initialize population:
   │   ├─ Random insertion orders
   │   └─ Random rotation angles
   ├─ For each generation (0-100):
   │   ├─ Evaluate fitness:
   │   │   ├─ Place parts on sheets
   │   │   ├─ Calculate used dimensions
   │   │   └─ Score: minimize length/sheets
   │   ├─ Selection (tournament)
   │   ├─ Crossover (breed)
   │   ├─ Mutation
   │   └─ Progress: 40-95%
   └─ Select best solution
    ↓
4. Finalization
   ├─ Calculate exact bounding boxes per sheet
   ├─ Determine used dimensions
   ├─ Calculate costs
   ├─ Generate visualization data
   └─ Progress: 95-100%
    ↓
Display Results
```

**Performance estimates:**
- Small job (5 parts): 5-10 seconds
- Medium job (20 parts): 15-30 seconds
- Large job (50 parts): 1-2 minutes

**Optimizations:**
- Run in Web Worker (don't block UI)
- Use cached NFPs (no recalculation)
- Early termination if good solution found
- Progressive rendering (show intermediate results)

### 9.5 Nesting Result Calculation

**Critical logic - Used Dimensions:**

```typescript
For each sheet:
    ├─ Gather all placed parts
    ├─ Calculate bounding box:
    │   ├─ minX = min of all part minX
    │   ├─ maxX = max of all part maxX
    │   ├─ minY = min of all part minY
    │   └─ maxY = max of all part maxY
    ├─ Used dimensions:
    │   ├─ width = maxX - minX (usually = sheet width)
    │   └─ length = maxY - minY (actual length used)
    └─ Material cost = (width × length × thickness × density × price_per_kg)
                       NOT (width × max_length × ...)
```

**Example:**
```
Sheet: 1500mm (width) x 6000mm (max length)
Parts arranged occupy: 1500mm x 450mm (bounding box)

Material cost calculation:
├─ Area = 1500 × 450 = 675,000 mm² = 0.675 m²
├─ Volume = 0.675 × 0.0009 = 0.0006075 m³
├─ Weight = 0.0006075 × 8000 = 4.86 kg
└─ Cost = 4.86 × $5.50 = $26.73

NOT:
├─ Area = 1500 × 6000 = 9,000,000 mm² = 9 m²
└─ Cost = 9 × 0.0009 × 8000 × 5.50 = $356.40

Savings: $356.40 - $26.73 = $329.67 (92.5%)
```

### 9.6 Error Handling

**Possible errors:**

**1. Parts don't fit:**
```
❌ Error: Nesting Failed

Some parts cannot fit in selected sheet size:
├─ DXF102 (727 x 417mm) exceeds sheet width (1500mm) ✓
└─ DXF110 (1600 x 200mm) exceeds sheet width (1500mm) ✗

Suggestions:
├─ Increase sheet size
├─ Enable rotation (if grain allows)
└─ Remove oversized parts

[Change Sheet Size] [Remove Parts] [Cancel]
```

**2. Timeout:**
```
⚠️ Nesting Timeout

Nesting is taking longer than expected (>5 minutes).

Current progress: 73%
Parts placed: 15 of 20

Options:
├─ Continue waiting (may take 10+ more minutes)
├─ Stop and use current result (5 parts unplaced)
└─ Cancel and adjust settings (reduce population/generations)

[Wait] [Use Current] [Cancel]
```

**3. Poor utilization:**
```
⚠️ Low Utilization Warning

Nesting completed but utilization is very low:
├─ Sheet 1: 3.2%
└─ Sheet 2: 2.8%

This means high material waste. Consider:
├─ Reduce sheet max length (if using coil)
├─ Increase part spacing (may improve packing)
└─ Enable advanced options (holes, concave)

[Re-run with Suggestions] [Accept Result] [Cancel]
```

### 9.7 User Interactions

#### Interaction 1: Run Nesting
```
1. User configures sheet size and settings
2. Clicks [Start Nesting]
3. Progress bar appears:
   - "Calculating NFPs... 15%"
   - "Running GA - Gen 25/100... 55%"
   - "Finalizing results... 95%"
4. Nesting completes (20 seconds)
5. Canvas updates with nesting visualization
6. Results panel shows stats
7. User reviews result
```

#### Interaction 2: Adjust Settings and Re-run
```
1. Nesting completes with poor utilization (2.5%)
2. User sees "Low Utilization Warning"
3. User changes settings:
   - Increases rotations from 4 to 8
   - Enables "Use Holes"
   - Increases generations to 200
4. Clicks [Start Nesting] again
5. New nesting runs (slower, 45 seconds)
6. Better result: Utilization 8.2%
7. User satisfied, proceeds to Summary
```

#### Interaction 3: View Different Sheets
```
1. Nesting results in 3 sheets
2. Canvas shows Sheet 1 by default
3. User clicks sheet selector: [2 ▼]
4. Canvas updates to show Sheet 2 layout
5. User can inspect each sheet individually
6. Can zoom/pan on each sheet
```

#### Interaction 4: Inspect Individual Part
```
1. User hovers over a part in canvas
2. Part highlights (outline glows)
3. Tooltip shows: "DXF105 - Rotated 90°"
4. User clicks part
5. Part details show in side panel:
   - Part name
   - Position (X, Y)
   - Rotation angle
   - Preview
```

### 9.8 Navigation

**Bottom buttons:**
- **[< Back]**: Return to Stage 5 (Part Configuration)
  - Warning: "Re-running nesting will discard current results"
  - Confirm before going back
- **[Next: Summary >]**: Proceed to Stage 7 (Summary)
  - Nesting must be complete before proceeding
  - If nesting not run yet, button disabled

---

## 10. STAGE 7: SUMMARY & COST CALCULATION

### 10.1 Mục đích

Stage tổng kết, cho phép user:
- Xem overview toàn bộ quote
- Review chi phí chi tiết
- Edit material costs, operations
- Apply discounts, adjust markup
- Add notes and terms
- Finalize quote trước khi export PDF

### 10.2 Layout

```
┌───────────────────────────────────────────────────────────────────────┐
│  Progress: [✓Upload][✓Display][✓Config][✓Nest] → [●Summary]         │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  LEFT: Quote Details     CENTER: Summary      RIGHT: Cost Details    │
│  ┌────────────────────┐  ┌──────────────────┐ ┌───────────────────┐ │
│  │ QUOTE DETAILS      │  │ Quote #: [Auto]  │ │ COST DETAILS      │ │
│  │                    │  │                  │ │                   │ │
│  │ Company:           │  │ File Count: 13   │ │ Material: 4000.00 │ │
│  │ [CASH SALES   ▼]   │  │ Total Qty: 130   │ │ Sub Total:16859.13│ │
│  │                    │  │ Total Area: 3.86 │ │ Total Disc: 0.00  │ │
│  │ Validity: [7] days │  │ Weight: 225.65kg │ │                   │ │
│  │ Phone: +613 8618.. │  │                  │ │ INVOICE AMOUNT    │ │
│  │ Created By: NS     │  │ ┌──────────────┐ │ │                   │ │
│  │                    │  │ │PARTS TABLE   │ │ │  R17,702.09       │ │
│  │ OTHER COST         │  │ │#  Name   ...│ │ │                   │ │
│  │ ☑ Tax (5%)         │  │ │1  DXF105  ..│ │ │ ┌───────────────┐ │ │
│  │ ☐ Deburring        │  │ │2  DXF101  ..│ │ │ │Material Table │ │ │
│  │ ☐ Drilling         │  │ │...          │ │ │ │Material|Qty|$ │ │ │
│  │ ☐ Packaging        │  │ └──────────────┘ │ │ │SS304  |10|512│ │ │
│  │ ☐ Welding          │  │                  │ │ │...          │ │ │
│  │ ☐ Assembly         │  │                  │ │ └───────────────┘ │ │
│  │ ☐ Bending          │  │                  │ │                   │ │
│  │ ☐ Painting         │  │                  │ │                   │ │
│  │ ☐ Spot Welding     │  │                  │ │                   │ │
│  │ ☐ Sub Contracting  │  │                  │ │                   │ │
│  │ ☐ Discount %       │  │                  │ │                   │ │
│  │ ☐ Additional Cost  │  │                  │ │                   │ │
│  │ ☐ Hidden Disc %    │  │                  │ │                   │ │
│  │ ☑ Edit Material    │  │                  │ │                   │ │
│  │                    │  │                  │ │                   │ │
│  │ NOTE               │  │                  │ │                   │ │
│  │ [This sale is...] │  │                  │ │                   │ │
│  │                    │  │                  │ │                   │ │
│  │ REFERENCE          │  │                  │ │                   │ │
│  │ [Support@xyz.com] │  │                  │ │                   │ │
│  │                    │  │                  │ │                   │ │
│  │ [💾 Save]          │  │                  │ │                   │ │
│  │ [📧 Send Email]    │  │                  │ │                   │ │
│  └────────────────────┘  └──────────────────┘ └───────────────────┘ │
│                                                                        │
│  [< Back]                                      [Export PDF >]          │
└───────────────────────────────────────────────────────────────────────┘
```

### 10.3 Components

#### A. Quote Details Panel (Left)

**Company & Contact Info:**
```
Company:        [CASH SALES          ▼]
Validity Period: [7                  ] days
Phone No.:      [+613 8618 6884     ]
Created By:     [NS                  ]
```

- Can still change company (updates pricing if client-specific markup)
- Validity period affects "Valid Until" date on PDF
- Phone auto-filled from client, can edit
- Created By: Current user (read-only)

**Other Cost Section:**

Checkboxes to enable additional costs/operations:

```
☑ Tax (%):              [5     ] %
☐ Deburring:            [35    ] $
☐ Drilling:             [35    ] $
☐ Packaging:            [0     ] $
☐ Welding:              [35    ] $
☐ Assembly:             [35    ] $
☐ Bending:              [8     ] $
☐ Painting:             [10    ] $
☐ Spot Welding:         [35    ] $
☐ Sub Contracting:      [35    ] $
☐ Discount %:           [0     ] %
☐ Additional Cost:      [35    ] $
☐ Hidden Discount %:    [0     ] %
☑ Edit Material Cost    (button)
```

**Operation types:**

**Per-order operations** (apply once to entire order):
- Packaging: Flat fee for packaging entire order
- Additional Cost: Custom charges (setup fee, rush fee, etc.)

**Per-unit operations** (already configured in Part Config):
- These are already factored into unit costs
- Can enable additional ones here if forgot

**Discounts:**
- **Discount %**: Visible discount, shown on PDF
  - Applied to subtotal: `discounted = subtotal × (1 - discount%)`
- **Hidden Discount %**: Internal discount, NOT shown on PDF
  - Applied same way but customer doesn't see it
  - Used for internal approvals, manager discretion

**Tax:**
- Applied AFTER discounts
- Typically 5-10% depending on region
- `tax = (subtotal - discount) × tax%`

**Edit Material Cost:**
- Checkbox/button
- When clicked, opens detailed material cost breakdown dialog

**Note Section:**
```
[Text Area]
Default text:
"This sale is subject to terms and conditions displayed on www...
Quote is valid for 7 days.
Accepted By"
```

- Multi-line text field
- Can edit terms and conditions
- Appears on PDF

**Reference Section:**
```
[Text Area]
Default: "Support@xyz.com"
```

- Optional reference info
- Can be PO number, project code, contact email
- Appears on PDF

**Action Buttons:**
```
[💾 Save]        - Save quote to database
[📧 Send Email]  - Email quote to client
```

#### B. Summary Details Panel (Center)

**Quote Header:**
```
Quote # [Auto-generated]  (e.g., NCT5890)
```
- Auto-generated based on prefix from client settings
- Cannot edit
- Used as unique identifier

**Summary Stats:**
```
File Count:      13
Total Quantity:  130
Total Area (Sq.M): 3.86
Total Weight (Kgs): 225.65
```

- Aggregated from all parts
- Read-only
- Visual at-a-glance info

**Parts Table:**

Full breakdown of all parts:

```
┌────┬─────────┬─────────┬──────────┬──────────┬──────────┬────────────┬────────────┐
│ #  │ Name    │ Preview │ Size     │ Material │ Quantity │ Unit Cost  │ Total Cost │
├────┼─────────┼─────────┼──────────┼──────────┼──────────┼────────────┼────────────┤
│ 1  │ DXF105  │ [thumb] │ 221.1x22 │ SS 304   │    10    │   $48.43   │  $484.31   │
│    │         │         │          │ 0.9mm    │          │            │            │
├────┼─────────┼─────────┼──────────┼──────────┼──────────┼────────────┼────────────┤
│ 2  │ DXF101  │ [thumb] │ 300.5x   │ SS 304   │    10    │   $36.46   │  $364.63   │
│    │         │         │ 300.5    │ 0.9mm    │          │            │            │
├────┼─────────┼─────────┼──────────┼──────────┼──────────┼────────────┼────────────┤
│ 3  │ DXF102  │ [thumb] │ 727.21x  │ SS 304   │    10    │  $122.76   │ $1,227.62  │
│    │         │         │ 417.78   │ 0.9mm    │          │            │            │
├────┼─────────┼─────────┼──────────┼──────────┼──────────┼────────────┼────────────┤
│ ...│         │         │          │          │          │            │            │
└────┴─────────┴─────────┴──────────┴──────────┴──────────┴────────────┴────────────┘
```

**Features:**
- Scrollable if many parts
- Preview thumbnails (small)
- Click row to expand details (optional)
- All costs are final (including markup, operations)

**Expanded row (optional):**
```
▼ DXF105 - Stainless Steel 304 0.9mm
  Operations: Cutting, Bending
  Grain Direction: Both
  
  Cost Breakdown:
  ├─ Material:    $0.19
  ├─ Cutting:     $1.22
  ├─ Piercing:    $0.15
  ├─ Bending:     $2.50
  ├─ Subtotal:    $4.06
  ├─ Markup (45%):$1.83
  └─ Unit Cost:   $5.89
  
  × Quantity 10 = $58.90 Total
```

#### C. Cost Details Panel (Right)

**Top section - Summary:**
```
┌─────────────────────────┐
│ Material Cost: R4,000.00│
│ Sub Total:    R16,859.13│
│ Total Discount:   R0.00 │
├─────────────────────────┤
│                         │
│   INVOICE AMOUNT        │
│                         │
│    R17,702.09           │
│   (large, bold)         │
│                         │
└─────────────────────────┘
```

**Material Cost:**
- Sum of all material costs (based on nesting used area)
- Does NOT include cutting, operations, markup

**Sub Total:**
- Material + Cutting + Operations + Markup
- Before discount and tax

**Total Discount:**
- If discount applied, shows amount
- (Subtotal × Discount %)

**Invoice Amount:**
- Final amount customer pays
- `(Subtotal - Discount) × (1 + Tax%)`

**Material Breakdown Table:**

```
┌────────────────────────────────────────┐
│ Material      │ Quantity │ Unit│ Total │
├────────────────────────────────────────┤
│ Stainless     │    10    │51.21│512.10 │
│ Steel 304     │          │     │       │
│ 0.9mm         │          │     │       │
├────────────────────────────────────────┤
│ Stainless     │    10    │87.99│879.90 │
│ Steel 304     │          │     │       │
│ 0.9mm         │          │     │       │
├────────────────────────────────────────┤
│ ...           │          │     │       │
└────────────────────────────────────────┘
```

- Groups parts by material
- Shows quantity of each material/thickness combo
- Unit cost per part for that material
- Total for that material group

### 10.4 Edit Material Cost Dialog

**Triggered by:** Clicking [☑ Edit Material Cost] checkbox/button

**Dialog appears:**

```
┌───────────────────────────────────────────────────────┐
│  Material Cost Breakdown                       [X]    │
├───────────────────────────────────────────────────────┤
│                                                        │
│  Total Additional Cost: $3155.77                      │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │ [Accept] button                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  MATERIAL BREAKDOWN                                   │
│  ┌────────────────────────────────────────────────┐  │
│  │ Name                        │ Material Cost     │  │
│  ├────────────────────────────────────────────────┤  │
│  │ Stainless Steel _304_0.9    │                   │  │
│  │ /Per sheet cost 361.9       │                   │  │
│  │ Sheets Required: 10         │                   │  │
│  │ Sheet Utilization: 8.72     │                   │  │
│  │ Utilized Sheet Cost:-3155.77│                   │  │
│  ├────────────────────────────────────────────────┤  │
│  │ DXF105                      │        3.92       │  │
│  │ DXF101                      │       72.74       │  │
│  │ DXF102                      │      244.74       │  │
│  │ DXF103                      │        1.46       │  │
│  │ DXF104                      │        2.17       │  │
│  │ DXF106                      │        0.04       │  │
│  │ DXF107_1                    │       24.73       │  │
│  │ DXF107_2                    │       28.68       │  │
│  │ DXF108                      │        7.86       │  │
│  │ DXF109                      │      201.38       │  │
│  │ DXF110                      │     1685.74       │  │
│  │ DXF111                      │      831.72       │  │
│  │ y12                         │        2.03       │  │
│  ├────────────────────────────────────────────────┤  │
│  │ Total Material Cost         │    25893.50       │  │
│  │ New Material Cost           │     3155.77       │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
└───────────────────────────────────────────────────────┘
```

**Purpose:** Show transparent breakdown of material costing

**Header Info:**
```
Stainless Steel 304 0.9mm
├─ Per sheet cost (full): $361.9
│   (1500mm × 6000mm × 0.9mm × 8000 kg/m³ × $5.5/kg)
├─ Sheets required: 10
├─ Sheet utilization: 8.72%
└─ Utilized sheet cost: $3155.77
```

**Calculation explanation:**
- **Full sheet cost**: Cost of ONE complete sheet (width × max_length)
- **Sheets required**: Number of sheets used in nesting
- **Utilization**: Average % of sheet area actually used
  - Example: 8.72% means only using 1500 × 523mm average per sheet (not 1500 × 6000)
- **Utilized sheet cost**: Actual cost charged
  - NOT (full sheet cost × sheets required)
  - = (used area per sheet × sheets × material price)

**Per-part material cost:**
- Lists each part
- Shows material cost allocated to each part
- Based on part's actual area and quantity

**Totals:**
- **Total Material Cost**: Sum of all parts' material costs
- **New Material Cost**: After applying material markup
  - If material markup = 25%: New = Total × 1.25

**[Accept] button:**
- Closes dialog
- Applies new material cost to quote
- Updates invoice amount

### 10.5 Cost Calculation Logic

**Complete formula:**

```
For each part:
    ├─ Material Cost = (used area from nesting) × thickness × density × price_per_kg
    ├─ Cutting Cost = (cut length / cutting speed) × machine hour rate
    │                + (pierce count × pierce cost)
    ├─ Operations Cost = Σ(enabled operations costs)
    └─ Part Subtotal = (Material + Cutting + Operations) × (1 + part markup%)

Quote Subtotal = Σ(Part Subtotal × Quantity)

Discounts:
├─ Visible Discount = Quote Subtotal × discount%
└─ Hidden Discount = Quote Subtotal × hidden_discount%

After Discounts = Quote Subtotal - Visible Discount - Hidden Discount

Tax = After Discounts × tax%

Invoice Total = After Discounts + Tax
```

**Example calculation:**

```
Part: DXF105 (Stainless Steel 304 0.9mm)
Quantity: 10

1. Material Cost (from nesting):
   ├─ Used area: 0.00486 m²
   ├─ Volume: 0.00486 × 0.0009 = 0.000004374 m³
   ├─ Weight: 0.000004374 × 8000 = 0.03499 kg
   └─ Cost: 0.03499 × $5.50 = $0.19

2. Cutting Cost:
   ├─ Cut length: 486mm
   ├─ Cutting time: 486 / 3000 = 0.162 min = 0.0027 hr
   ├─ Cutting cost: 0.0027 × $75/hr = $0.20
   ├─ Pierce cost: 1 × $0.15 = $0.15
   └─ Total cutting: $0.35

3. Operations:
   ├─ Bending: $2.50/unit
   └─ Total operations: $2.50

4. Subtotal: $0.19 + $0.35 + $2.50 = $3.04

5. Markup (45%): $3.04 × 0.45 = $1.37

6. Unit Cost: $3.04 + $1.37 = $4.41

7. Total (qty 10): $4.41 × 10 = $44.10
```

**Quote totals:**

```
All parts subtotal: $16,859.13
Material markup applied: Already in unit costs
Visible discount (5%): -$842.96
After discount: $16,016.17
Tax (10%): +$1,601.62
───────────────────────────
Invoice Total: $17,617.79
```

### 10.6 User Interactions

#### Interaction 1: Review and Adjust Costs
```
1. User lands on Summary stage
2. Reviews parts table, costs look good
3. Notices no tax applied
4. Checks [☑ Tax (%)] checkbox, enters 10%
5. Invoice amount updates from $16,859 to $18,545
6. User satisfied with pricing
```

#### Interaction 2: Apply Discount
```
1. Customer requests 10% discount
2. User checks [☐ Discount %]
3. Enters 10 in field
4. Subtotal: $16,859.13
5. Discount: -$1,685.91
6. After discount: $15,173.22
7. Tax (10%): +$1,517.32
8. New total: $16,690.54
9. Customer approves
```

#### Interaction 3: Edit Material Costs
```
1. User wants to verify material costs
2. Clicks [☑ Edit Material Cost]
3. Dialog opens showing detailed breakdown
4. User sees:
   - Sheet cost: $361.9 per full sheet
   - Sheets required: 10
   - Utilization: 8.72%
   - Actual cost: $3,155.77 (not $3,619!)
5. User satisfied with transparency
6. Clicks [Accept]
7. Returns to summary
```

#### Interaction 4: Add Notes
```
1. User wants to add custom terms
2. Clicks in Note text area
3. Adds:
   "Payment terms: 50% deposit, 50% on delivery.
   Lead time: 5 business days.
   Delivery: Customer pickup."
4. Text saves automatically
5. Will appear on PDF
```

#### Interaction 5: Save Quote
```
1. User finalizes all details
2. Clicks [💾 Save] button
3. System:
   - Validates all data
   - Generates quote number (NCT5890)
   - Saves to database
   - Sets status to "Draft"
4. Success message: "Quote saved successfully!"
5. [Export PDF] button becomes enabled
```

### 10.7 Validation

**Before allowing save/export:**

**Required fields:**
- ✅ Company selected
- ✅ At least 1 part in quote
- ✅ All parts have valid material and quantity
- ✅ Nesting completed
- ✅ All costs calculated

**Warnings (non-blocking):**
- ⚠️ "No tax applied. Confirm this is correct?"
- ⚠️ "High discount (>20%). Manager approval required?"
- ⚠️ "Material markup seems low (<10%). Verify pricing?"

**Errors (blocking):**
- ❌ "Cannot save: Company not selected"
- ❌ "Cannot save: Nesting not completed"
- ❌ "Cannot save: Invalid material cost (negative value)"

### 10.8 Navigation

**Bottom buttons:**
- **[< Back]**: Return to Stage 6 (Nesting)
  - Confirm: "Changes to nesting will reset costs. Continue?"
- **[Export PDF >]**: Proceed to Stage 8 (PDF Export)
  - Saves quote first (if not saved)
  - Generates and displays PDF
  - OR directly saves PDF to file system

---

## 11. STAGE 8: PDF EXPORT

### 11.1 Mục đích

Final stage: Generate professional PDF quote document

### 11.2 PDF Structure

```
┌─────────────────────────────────────────────────┐
│                  HEADER                         │
│  ┌─────────────┐         QUOTE INFO            │
│  │   LOGO      │         Date: 04-02-2025      │
│  │ NC TOOLS    │         Valid: 11-02-2025     │
│  └─────────────┘         Created: NS           │
│                                                 │
│  Company Info (left)    Quote # (right)        │
├─────────────────────────────────────────────────┤
│              BILL TO & SHIP TO                  │
│  ┌───────────────────┐  ┌──────────────────┐  │
│  │ Bill To:          │  │ Ship To:         │  │
│  │ CASH SALES        │  │ Same as billing  │  │
│  │ Suite 16...       │  │                  │  │
│  └───────────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────┤
│                 ITEMS TABLE                     │
│  # │ Name   │ Preview │ Material│ Qty │ $ │ Tot│
│ ───┼────────┼─────────┼─────────┼─────┼───┼────│
│  1 │DXF105  │ [img]   │ SS 304  │ 10  │..│... │
│    │221x22  │         │ 0.9mm   │     │  │    │
│    │Operations: Cutting, Bending, Grain: Both │
│ ───┼────────┼─────────┼─────────┼─────┼───┼────│
│  2 │DXF101  │ [img]   │ SS 304  │ 10  │..│... │
│    │...     │         │         │     │  │    │
│ ───┴────────┴─────────┴─────────┴─────┴───┴────│
│                             Subtotal:   $xxx.xx│
│                          Discount (5%): -$xx.xx│
│                               Tax (10%): +$xx.xx│
│                             ─────────────────────│
│                         TOTAL:   $17,702.09     │
├─────────────────────────────────────────────────┤
│                TERMS & CONDITIONS               │
│  This sale is subject to...                     │
│  Quote valid for 7 days.                        │
│                                                 │
│  Reference: Support@xyz.com                     │
├─────────────────────────────────────────────────┤
│                  FOOTER                         │
│  Thank you for your business!                   │
│  Page 1 of 2                                    │
└─────────────────────────────────────────────────┘
```

### 11.3 PDF Generation Features

**Content:**
- ✅ Company logo and branding
- ✅ Quote number, dates, client info
- ✅ Parts table with thumbnails
- ✅ Material details per part
- ✅ Operations listed per part
- ✅ Cost breakdown (subtotal, discounts, tax)
- ✅ Terms and conditions
- ✅ Page numbers (if multiple pages)

**Styling:**
- Professional layout
- Color scheme matching company branding
- Clear typography
- Borders and spacing for readability

**Actions after generation:**
```
PDF Generated Successfully!

Options:
├─ [📥 Download] - Save to local filesystem
├─ [📧 Email] - Send to client
├─ [🖨️ Print] - Print directly
├─ [👁️ Preview] - Open in PDF viewer
└─ [< Back to Summary] - Return to edit
```

### 11.4 Email Integration (Optional)

**If user clicks [📧 Send Email]:**

```
┌────────────────────────────────────┐
│  Send Quote via Email       [X]   │
├────────────────────────────────────┤
│                                   │
│  To: [client@company.com     ]   │
│  CC: [                       ]   │
│  BCC:[                       ]   │
│                                   │
│  Subject:                         │
│  [Quote NCT5890 - CASH SALES ]   │
│                                   │
│  Message:                         │
│  ┌───────────────────────────┐   │
│  │ Dear Customer,            │   │
│  │                           │   │
│  │ Please find attached our  │   │
│  │ quote for your review.    │   │
│  │                           │   │
│  │ Best regards,             │   │
│  │ [Your Company]            │   │
│  └───────────────────────────┘   │
│                                   │
│  Attachment: Quote_NCT5890.pdf   │
│                                   │
│  [Cancel]      [Send Email]       │
└────────────────────────────────────┘
```

---

## 12. SETTINGS & CONFIGURATION

### 12.1 Settings Overview

**Settings categories:**
1. Material Stock Management
2. Machine Configuration
3. Operations Library
4. Pricing Configuration
5. Company Information
6. User Management (optional)

### 12.2 Material Stock Management

**Purpose:** Manage materials available for quotes

**UI:**
```
Settings → Material Stock

[+ Add New Material]    [Import from CSV]

┌────────────────────────────────────────────────────────────┐
│ Material                                            Actions │
├────────────────────────────────────────────────────────────┤
│ Stainless Steel 304 - 0.9mm                               │
│ Sheet: 1500 x 6000mm                                      │
│ Price: $5.50/kg | Density: 8000 kg/m³                     │
│ Stock: 25 sheets | Min: 10 sheets                         │
│                                          [Edit] [Delete]   │
├────────────────────────────────────────────────────────────┤
│ Stainless Steel 304 - 1.2mm                               │
│ ...                                                        │
└────────────────────────────────────────────────────────────┘
```

**Add/Edit Material Dialog:**
```
┌─────────────────────────────────────┐
│  Add Material Stock          [X]   │
├─────────────────────────────────────┤
│                                    │
│  Material Name: [Stainless Steel]  │
│  Grade:         [304            ]  │
│  Thickness:     [0.9            ]mm│
│                                    │
│  Sheet Dimensions:                 │
│  Width:         [1500           ]mm│
│  Max Length:    [6000           ]mm│
│                                    │
│  Pricing:                          │
│  Price per Kg:  [5.50           ]$ │
│  Density:       [8000           ]kg│
│                                    │
│  Stock:                            │
│  Quantity:      [25             ]sh│
│  Min Quantity:  [10             ]sh│
│                                    │
│  Cutting Parameters:               │
│  Speed:         [3000           ]mm│
│  Pierce Time:   [0.5            ]s │
│  Pierce Cost:   [0.15           ]$ │
│                                    │
│  [Cancel]              [Save]      │
└─────────────────────────────────────┘
```

### 12.3 Machine Configuration

**Machines list:**
```
Settings → Machines

[+ Add Machine]

┌────────────────────────────────────────────┐
│ Machine Name         Hour Rate    Actions │
├────────────────────────────────────────────┤
│ NCTOOLS              $75/hr    [Edit] [Del]│
│ Max sheet: 1500 x 6000mm                  │
│ Power: 4000W                              │
├────────────────────────────────────────────┤
│ LaserCut 500         $65/hr    [Edit] [Del]│
│ ...                                        │
└────────────────────────────────────────────┘
```

### 12.4 Operations Library

**Operations management:**
```
Settings → Operations

[+ Add Operation]

┌─────────────────────────────────────────────────────┐
│ Operation      Type          Cost        Actions   │
├─────────────────────────────────────────────────────┤
│ Bending        Per Unit      $2.50   [Edit] [Del]  │
│ Deburring      Per Unit      $1.00   [Edit] [Del]  │
│ Drilling       Per Hole      $0.50   [Edit] [Del]  │
│ Welding        Per Joint     $15.00  [Edit] [Del]  │
│ Painting       Per Unit      $5.00   [Edit] [Del]  │
│ Assembly       Time-based    30min   [Edit] [Del]  │
└─────────────────────────────────────────────────────┘
```

**Add Operation:**
```
Operation Name:  [Custom Operation]
Cost Type:       [Per Unit ▼]
                  ├─ Per Unit (flat fee)
                  ├─ Per Area ($/m²)
                  ├─ Per Length ($/m)
                  ├─ Per Count ($/piece)
                  └─ Time-based (min × hourly rate)
Cost:            [10.00] $
Description:     [Optional description...]
```

### 12.5 Pricing Configuration

**Global pricing settings:**
```
Settings → Pricing

Default Markup:
├─ Price Markup (%):     [45    ]
└─ Material Markup (%):  [25    ]

Tax:
└─ Tax Rate (%):         [10    ]

Minimum Order:
└─ Minimum Amount ($):   [100   ]

Pricing Strategy:
  ● Hybrid (recommended)
  ○ Sheet-based (always full sheet)
  ○ Utilization-based (only used area)

If Hybrid:
├─ Min Utilization Threshold: [75 ]%
└─ Scrap Value:               [40 ]%
```

### 12.6 Company Information

**Company details for PDF:**
```
Settings → Company

Company Name:    [NC Tools Pty Ltd        ]
Business No:     [ABN123456789            ]
Address Line 1:  [Suite 16, 31 South Corp...]
Address Line 2:  [                         ]
City:            [Rowville    ] State: [VIC]
Zip:             [3178        ]
Country:         [Australia   ]

Contact:
Phone:           [+61386186884            ]
Email:           [sales@nctools.com.au    ]
Website:         [www.nctools.com.au      ]

Logo:            [Upload Logo] [current.png]
```

---

## 13. DATA MODELS

### 13.1 Database Schema

**Core tables:**

```sql
-- Clients
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  company_name TEXT NOT NULL,
  contacts JSONB, -- [{name, phone, email}]
  billing_address JSONB,
  shipping_address JSONB,
  additional_price_markup DECIMAL,
  additional_material_markup DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Material Stock
CREATE TABLE material_stock (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  thickness DECIMAL NOT NULL,
  sheet_width DECIMAL NOT NULL,
  sheet_max_length DECIMAL NOT NULL,
  price_per_kg DECIMAL NOT NULL,
  density DECIMAL NOT NULL,
  quantity_in_stock INTEGER DEFAULT 0,
  cutting_speed DECIMAL,
  pierce_time DECIMAL,
  pierce_cost DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Quotes
CREATE TABLE quotes (
  id UUID PRIMARY KEY,
  quote_number TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id),
  status TEXT DEFAULT 'draft', -- draft, sent, accepted, rejected
  
  -- Quote config
  validity_days INTEGER DEFAULT 7,
  price_markup DECIMAL,
  material_markup DECIMAL,
  tax_rate DECIMAL,
  discount DECIMAL DEFAULT 0,
  hidden_discount DECIMAL DEFAULT 0,
  
  -- Quote data (full JSON)
  data JSONB NOT NULL,
  -- {
  --   parts: [...],
  --   nesting_results: {...},
  --   pricing: {...},
  --   notes: "...",
  --   reference: "..."
  -- }
  
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Machines
CREATE TABLE machines (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  hourly_rate DECIMAL NOT NULL,
  max_sheet_width DECIMAL,
  max_sheet_length DECIMAL,
  power_kw DECIMAL,
  is_active BOOLEAN DEFAULT TRUE
);

-- Operations
CREATE TABLE operations (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  cost_type TEXT, -- per_unit, per_area, per_length, time_based
  cost DECIMAL,
  time_minutes DECIMAL, -- if time_based
  description TEXT
);

-- Settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
```

### 13.2 Quote Data Structure (JSONB)

```typescript
interface QuoteData {
  client: {
    id: string;
    name: string;
    phone: string;
    contact: string;
  };
  
  files: Array<{
    id: string;
    name: string;
    dxf_data: {
      entities: any[];
      layers: any[];
      metadata: {
        cut_length: number;
        pierce_count: number;
        dimensions: { width: number; height: number };
        area: number;
      };
    };
  }>;
  
  parts: Array<{
    id: string;
    file_id: string;
    name: string;
    quantity: number;
    material: {
      stock_id: string;
      name: string;
      grade: string;
      thickness: number;
    };
    machine: string;
    grain_direction: 'both' | 'horizontal' | 'vertical';
    operations: string[];
    price_markup: number;
    costs: {
      material: number;
      cutting: number;
      operations: number;
      unit_cost: number;
      total_cost: number;
    };
  }>;
  
  nesting_results: {
    sheets: Array<{
      id: string;
      original_dimensions: { width: number; max_length: number };
      used_dimensions: { width: number; length: number };
      utilization: number;
      parts: Array<{
        part_id: string;
        x: number;
        y: number;
        rotation: number;
      }>;
      cost: number;
    }>;
    summary: {
      total_sheets: number;
      average_utilization: number;
      total_material_cost: number;
    };
  };
  
  pricing: {
    subtotal: number;
    discount: number;
    hidden_discount: number;
    tax: number;
    total: number;
  };
  
  notes: string;
  reference: string;
}
```

---

## 14. BUSINESS LOGIC & CALCULATIONS

### 14.1 Material Cost Calculation

```typescript
function calculateMaterialCost(
  part: Part,
  nestingResult: NestingResult,
  material: MaterialStock
): number {
  // Find which sheet this part is on
  const sheet = findSheetForPart(part.id, nestingResult);
  
  // Calculate material cost based on used dimensions
  const usedArea = (sheet.used_dimensions.width * sheet.used_dimensions.length) / 1_000_000; // m²
  const volume = usedArea * (material.thickness / 1000); // m³
  const weight = volume * material.density; // kg
  const sheetCost = weight * material.price_per_kg; // $
  
  // Allocate cost to this part proportionally
  const partArea = part.metadata.area; // m²
  const totalPartsArea = sumPartsAreaOnSheet(sheet);
  const partProportion = partArea / totalPartsArea;
  
  const partMaterialCost = sheetCost * partProportion * part.quantity;
  
  return partMaterialCost;
}
```

### 14.2 Cutting Cost Calculation

```typescript
function calculateCuttingCost(
  part: Part,
  material: MaterialStock,
  machine: Machine
): number {
  // Cutting time
  const cuttingSpeed = material.cutting_speed; // mm/min
  const cutLength = part.metadata.cut_length; // mm
  const cuttingTimeMin = cutLength / cuttingSpeed; // minutes
  const cuttingTimeHr = cuttingTimeMin / 60; // hours
  const cuttingCost = cuttingTimeHr * machine.hourly_rate; // $
  
  // Piercing cost
  const pierceCount = part.metadata.pierce_count;
  const pierceCost = pierceCount * material.pierce_cost; // $
  
  // Total per unit
  const unitCuttingCost = cuttingCost + pierceCost;
  
  // Total for quantity
  return unitCuttingCost * part.quantity;
}
```

### 14.3 Operations Cost Calculation

```typescript
function calculateOperationsCost(
  part: Part,
  operations: Operation[]
): number {
  let totalCost = 0;
  
  operations.forEach(op => {
    if (!part.operations.includes(op.name)) return;
    
    switch (op.cost_type) {
      case 'per_unit':
        totalCost += op.cost * part.quantity;
        break;
      
      case 'per_area':
        totalCost += op.cost * part.metadata.area * part.quantity;
        break;
      
      case 'per_length':
        totalCost += op.cost * (part.metadata.cut_length / 1000) * part.quantity;
        break;
      
      case 'time_based':
        const hours = op.time_minutes / 60;
        const machineCost = hours * machine.hourly_rate;
        totalCost += machineCost * part.quantity;
        break;
    }
  });
  
  return totalCost;
}
```

### 14.4 Total Quote Calculation

```typescript
function calculateQuoteTotal(quote: Quote): QuotePricing {
  let subtotal = 0;
  
  // Sum all parts
  quote.parts.forEach(part => {
    const materialCost = calculateMaterialCost(part, quote.nesting_results, material);
    const cuttingCost = calculateCuttingCost(part, material, machine);
    const operationsCost = calculateOperationsCost(part, operations);
    
    const partSubtotal = materialCost + cuttingCost + operationsCost;
    const partWithMarkup = partSubtotal * (1 + part.price_markup / 100);
    
    subtotal += partWithMarkup;
  });
  
  // Apply discounts
  const visibleDiscount = subtotal * (quote.discount / 100);
  const hiddenDiscount = subtotal * (quote.hidden_discount / 100);
  const afterDiscounts = subtotal - visibleDiscount - hiddenDiscount;
  
  // Apply tax
  const tax = afterDiscounts * (quote.tax_rate / 100);
  
  const total = afterDiscounts + tax;
  
  return {
    subtotal,
    discount: visibleDiscount,
    hidden_discount: hiddenDiscount,
    tax,
    total
  };
}
```

---

## 15. SUMMARY

**Smart Cut Quote** là hệ thống quản lý báo giá laser cutting toàn diện với các đặc điểm nổi bật:

✅ **User-friendly workflow** - 8 stages rõ ràng từ upload đến export PDF
✅ **Smart nesting** - Sử dụng SVGnest algorithm với genetic optimization
✅ **Transparent pricing** - Tính giá dựa trên kích thước thực tế sử dụng, không tính full sheet
✅ **Flexible configuration** - Material stock, machines, operations đều có thể cấu hình
✅ **Professional output** - PDF quotes với branding và breakdown chi tiết

**Next steps:** Phân tích tech stack phù hợp để implement hệ thống này.

---

**Document này mô tả đầy đủ workflow, tính năng, UI components và business logic của Smart Cut Quote system. Sử dụng document này làm foundation để:**
1. Chọn tech stack phù hợp
2. Design database schema chi tiết
3. Plan implementation phases
4. Develop features systematically