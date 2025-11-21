# DXF Healing Editor - User Guide

**Version:** 1.0
**Last Updated:** 2025-01-21

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [User Interface](#user-interface)
4. [Tools & Features](#tools--features)
5. [Keyboard Shortcuts](#keyboard-shortcuts)
6. [Common Workflows](#common-workflows)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Overview

The DXF Healing Editor is a powerful tool for fixing common issues in DXF files before laser cutting. It provides:

- **Visual Editing:** Interactive 2D canvas with Three.js rendering
- **Validation:** Automatic detection of errors (open contours, duplicates, zero-length lines)
- **Auto-Fix:** One-click solutions for common problems
- **Layer Management:** Show/hide layers for focused editing
- **Undo/Redo:** Full history support

---

## Getting Started

### Opening a DXF File

1. **From File Upload Page:**
   - Click "Upload DXF" button
   - Select your DXF file
   - System automatically validates the file

2. **From Nesting Page:**
   - Click "Edit" button next to any DXF file
   - Editor opens in full-screen dialog

### Understanding Validation Status

The editor shows a **validation banner** at the top:

- 🟢 **Green (Success):** No issues found - file is ready for cutting
- 🟡 **Yellow (Warning):** Minor issues detected - file may work but should be reviewed
- 🔴 **Red (Error):** Critical issues detected - file must be fixed before cutting

**Example Messages:**
```
✓ Validation passed • 15 entities • No issues
⚠ 3 open contours detected • File may not cut correctly
✗ 5 duplicate lines, 2 zero-length entities • File requires fixing
```

---

## User Interface

### Layout

```
┌────────────────────────────────────────────────────┐
│  Validation Banner (top)                           │
├────────────────────────────────────────────────────┤
│  Toolbar (tools, undo/redo, auto-fix)              │
├──────────────────────────┬─────────────────────────┤
│                          │  Sidebar               │
│      Canvas              │  - Layers              │
│   (Main editing area)    │  - Entities            │
│                          │  - Properties          │
└──────────────────────────┴─────────────────────────┘
│  Status Bar (bottom)                               │
└────────────────────────────────────────────────────┘
```

### Canvas

- **Grid:** 2000mm × 2000mm with 50mm divisions
- **Colors:**
  - Blue: Normal entities
  - Red: Open contours (errors)
  - Yellow: Selected entities
  - Red circles: Open endpoints

### Toolbar

**Tool Selection:**
- 🖱️ **Select (S):** Select and move entities
- 🗑️ **Delete (D):** Click to delete entities
- 🔗 **Merge (M):** Merge endpoints to close contours

**Actions:**
- ↩️ **Undo (Ctrl+Z):** Undo last action
- ↪️ **Redo (Ctrl+Y):** Redo undone action
- 🔧 **Auto-Fix:** Dropdown menu with auto-fix options
  - Fix Duplicates
  - Remove Zero-Length

### Sidebar

**Layers Panel:**
- Checkbox to show/hide each layer
- Entity count per layer
- Click anywhere on layer row to toggle

**Entities Panel:**
- List of all visible entities
- Red border indicates entities with issues
- Click to select entity
- Shows: Type, Layer, Status, Length

**Properties Panel:**
- Appears when entity is selected
- Shows: Type, Layer, Vertices, Length, Area, Closed status

### Status Bar

- Shows current tool instructions
- Examples:
  - "Click to select entity • Ctrl+Click for multi-select • Drag to select area"
  - "Click endpoints to merge (within 0.1mm tolerance)"
  - "15 entity(ies) selected • Press Delete to remove"

---

## Tools & Features

### 1. SELECT Tool (S)

**Purpose:** Select entities for editing

**How to Use:**
1. Activate: Click mouse icon or press **S**
2. Click entity to select (turns yellow)
3. Ctrl+Click to add to selection (multi-select)
4. Drag to create selection box
5. Press Delete to remove selected entities

**Tips:**
- Drag distance < 5px = click (single select)
- Drag distance > 5px = box select (multi-select)
- Selected entities show in yellow
- Count appears in toolbar (e.g., "3 selected")

---

### 2. DELETE Tool (D)

**Purpose:** Quick delete mode

**How to Use:**
1. Activate: Click trash icon or press **D**
2. Click any entity to delete immediately
3. No selection needed

**Tips:**
- Faster than SELECT + Delete for multiple deletions
- Each click deletes one entity
- Use Undo (Ctrl+Z) to restore if needed

---

### 3. MERGE Tool (M)

**Purpose:** Close open contours by merging endpoints

**How to Use:**
1. Activate: Click merge icon or press **M**
2. Hover near endpoint (green snap circle appears)
3. Click first endpoint (yellow ring appears)
4. Hover near second endpoint
5. Click second endpoint to merge

**Merge Requirements:**
- Both points must be endpoints (first or last vertex)
- Distance must be within **0.1mm tolerance** (default)
- Cannot merge entity to itself

**Visual Feedback:**
- Green circle: Snap indicator (hovering)
- Yellow ring: First endpoint selected
- Merge creates midpoint between two endpoints

**Tips:**
- Works best for contours with small gaps (<0.1mm)
- Merge multiple times to close complex shapes
- Use Undo if merge creates unwanted result

---

### 4. Layer Visibility

**Purpose:** Show/hide entities by layer to focus on specific parts

**How to Use:**
1. Open Layers panel in sidebar
2. Click checkbox next to layer name to toggle visibility
3. Hidden entities disappear from canvas and entity list
4. Entity count shows "visible / total" (e.g., "15 / 20")

**Common Layers:**
- **CUTTING:** Main cutting lines
- **BEND:** Bend lines
- **IGNORE:** Reference geometry

**Tips:**
- Hidden entities still exist in file (non-destructive)
- Validation runs on ALL entities (including hidden)
- Use to reduce visual clutter when editing

---

### 5. Auto-Fix Features

**Purpose:** Automatically fix common DXF issues with one click

#### Fix Duplicates

**What it fixes:** Removes duplicate entities (same vertices within 1 micron)

**How to Use:**
1. Click **Auto-Fix** button in toolbar
2. Select **Fix Duplicates**
3. Toast notification shows: "✓ Fixed 3 duplicate entities"

**Algorithm:**
- Compares all entities pairwise
- Checks if all vertices match (within 0.001mm tolerance)
- Keeps first occurrence, removes subsequent duplicates

**When to Use:**
- DXF imported from multiple sources
- Copy/paste operations created duplicates
- Overlapping lines causing cutting issues

#### Remove Zero-Length

**What it fixes:** Removes entities shorter than 0.001mm

**How to Use:**
1. Click **Auto-Fix** button in toolbar
2. Select **Remove Zero-Length**
3. Toast notification shows: "✓ Removed 2 zero-length entities"

**When to Use:**
- After importing from external CAD software
- Point entities created by accident
- Entities too small for laser cutter resolution

**Tips:**
- Auto-fix pushes to history (can undo)
- Validation re-runs automatically after fix
- Issue counts update in menu (red numbers)

---

### 6. Undo/Redo

**Purpose:** Revert or reapply changes

**How to Use:**
- **Undo:** Click ↩️ button or press **Ctrl+Z**
- **Redo:** Click ↪️ button or press **Ctrl+Y**

**Supported Actions:**
- Entity deletion
- Merge endpoints
- Layer changes
- Auto-fix operations

**History Limits:**
- Maximum 50 undo steps
- History clears on dialog close

**Tips:**
- Buttons disabled when no more undo/redo available
- Safe to experiment - can always undo
- Redo clears after new action

---

### 7. Drag-to-Select

**Purpose:** Select multiple entities at once

**How to Use:**
1. Activate SELECT tool (S)
2. Click and drag to create blue selection box
3. Release to select all entities within box
4. Selection count appears in toolbar

**Selection Logic:**
- Any entity with at least one vertex inside box is selected
- Partially overlapping entities also selected
- Add to existing selection with Ctrl+Drag

**Visual Feedback:**
- Blue dashed border while dragging
- Semi-transparent blue fill
- Selected entities turn yellow

---

## Keyboard Shortcuts

### Tools

| Key | Action |
|-----|--------|
| **S** | Activate SELECT tool |
| **D** | Activate DELETE tool |
| **M** | Activate MERGE tool |

### Editing

| Key | Action |
|-----|--------|
| **Delete** | Delete selected entities |
| **Backspace** | Delete selected entities |
| **Ctrl+Z** | Undo last action |
| **Ctrl+Y** | Redo undone action |
| **Ctrl+Shift+Z** | Redo (alternative) |
| **Escape** | Clear selection |

### View

| Key | Action |
|-----|--------|
| **Space** | Temporary pan mode (hold) |
| **Mouse Wheel** | Zoom in/out |
| **Middle Mouse Drag** | Pan view |
| **Right Mouse Drag** | Pan view |

### Notes

- Shortcuts disabled when typing in input fields
- Mac users: Cmd instead of Ctrl
- Case-insensitive (S or s both work)

---

## Common Workflows

### Workflow 1: Fix Open Contours

**Problem:** DXF has open contours that won't cut correctly

**Solution:**
1. Check validation banner for open contour count
2. Open Layers panel, ensure CUTTING layer visible
3. Look for red lines with red endpoint circles
4. Activate MERGE tool (M)
5. Merge endpoints to close contours:
   - Click first endpoint (yellow ring appears)
   - Click second endpoint to merge
6. Repeat until all contours closed
7. Validation banner turns green

**Tips:**
- Use zoom (mouse wheel) to see small gaps
- Hide other layers to focus on CUTTING layer
- Tolerance is 0.1mm - gaps larger than this need manual adjustment

---

### Workflow 2: Remove Duplicate Lines

**Problem:** DXF has overlapping duplicate lines

**Solution:**
1. Check validation banner: "X duplicate lines"
2. Click **Auto-Fix** button
3. Select **Fix Duplicates**
4. Toast shows: "✓ Fixed X duplicate entities"
5. Validation re-runs automatically
6. Verify result on canvas

**Tips:**
- Duplicates often created during CAD export
- Auto-fix keeps first occurrence
- Use Undo if wrong entities removed

---

### Workflow 3: Clean Up Small Artifacts

**Problem:** DXF has tiny lines/points (zero-length entities)

**Solution:**
1. Check validation banner: "X zero-length entities"
2. Click **Auto-Fix** button
3. Select **Remove Zero-Length**
4. Toast shows: "✓ Removed X zero-length entities"
5. Validation re-runs automatically

**Tips:**
- Zero-length = length < 0.001mm
- Often created by CAD software rounding errors
- Safe to remove (no visual impact)

---

### Workflow 4: Focus on Specific Layer

**Problem:** Too many entities on screen, hard to see what needs fixing

**Solution:**
1. Open Layers panel in sidebar
2. Uncheck layers you don't need to edit (e.g., BEND, IGNORE)
3. Only CUTTING layer visible
4. Entity list shows fewer items (e.g., "15 / 30 entities")
5. Edit with less visual clutter
6. Re-enable layers when done

**Tips:**
- Hidden entities still validated
- Hidden entities not selectable
- Layer state resets on dialog close

---

### Workflow 5: Batch Delete Multiple Entities

**Problem:** Need to delete many entities quickly

**Solution:**

**Method 1: Drag-to-Select**
1. Activate SELECT tool (S)
2. Drag box around entities to select
3. Press Delete to remove all selected

**Method 2: DELETE Tool**
1. Activate DELETE tool (D)
2. Click each entity to delete immediately

**Tips:**
- Drag-to-select faster for grouped entities
- DELETE tool faster for scattered entities
- Use Undo if you delete too much

---

## Troubleshooting

### Issue: Validation shows errors but I can't see them

**Possible Causes:**
- Entities on hidden layer
- Zoom level too far out
- Entities outside visible area

**Solutions:**
1. Check Layers panel - enable all layers
2. Click "Fit to View" (auto-zooms to show all entities)
3. Check Entity list in sidebar - problematic entities have red border

---

### Issue: Merge tool not working

**Possible Causes:**
- Points too far apart (>0.1mm)
- Points are not endpoints
- Trying to merge entity to itself

**Solutions:**
1. Check snap indicator appears (green circle)
2. Ensure both points are endpoints (first/last vertex)
3. Use zoom to verify gap size
4. Adjust tolerance in settings if needed

---

### Issue: Auto-fix shows "No issues found"

**Possible Causes:**
- No duplicates/zero-length entities exist
- Entities on hidden layers (still processed)
- Already fixed

**Solutions:**
1. Check validation banner for current status
2. Re-open Auto-Fix menu to see updated counts
3. If validation shows errors but auto-fix doesn't, issue requires manual fixing

---

### Issue: Undo not working

**Possible Causes:**
- No actions to undo
- History limit reached (50 steps)
- Action was save/close (not undoable)

**Solutions:**
1. Check if Undo button is enabled
2. Recent actions should be undoable
3. Save/close clears history

---

### Issue: Canvas is blank

**Possible Causes:**
- DXF file empty
- All layers hidden
- Zoom level incorrect

**Solutions:**
1. Check entity count in sidebar
2. Enable all layers in Layers panel
3. Press Ctrl+F to fit view to entities
4. Re-open file if issue persists

---

## Best Practices

### Before Editing

1. **Check Validation First**
   - Read validation banner carefully
   - Note number and type of issues
   - Plan fix strategy

2. **Understand Layer Structure**
   - Review all layers in Layers panel
   - Identify which layers need editing
   - Hide unnecessary layers

3. **Save Original File**
   - Keep backup of original DXF
   - Editor auto-saves on "Save & Close"
   - Can't undo after dialog close

---

### During Editing

1. **Use Tools Efficiently**
   - Learn keyboard shortcuts (S, D, M)
   - Use Auto-Fix for batch operations
   - Use drag-to-select for multiple entities

2. **Verify Changes**
   - Check validation banner after each fix
   - Zoom in to verify merge operations
   - Use Undo if unsure

3. **Work Systematically**
   - Fix one issue type at a time (e.g., all duplicates first)
   - Focus on one layer at a time
   - Use Entity list to track problematic entities

---

### After Editing

1. **Final Validation**
   - Ensure validation banner shows green (✓)
   - Review entity count (should match expectations)
   - Spot-check a few entities on canvas

2. **Save Changes**
   - Click "Save & Close" button
   - System writes updated DXF to disk
   - Original file overwritten (ensure backup exists)

3. **Test Cut**
   - Generate quote to verify pricing
   - Review nesting layout
   - Test on scrap material if possible

---

## Validation Rules

### Open Contour

**Definition:** Polyline where first and last vertices don't match

**Threshold:** >0.001mm distance between endpoints

**Fix:** Use MERGE tool to close gap

**Impact:** Laser won't close shape, creates incomplete cuts

---

### Duplicate Line

**Definition:** Two entities with identical vertices

**Threshold:** All vertices match within 0.001mm

**Fix:** Use Auto-Fix > Fix Duplicates

**Impact:** Double-cuts same line, wastes time/material

---

### Zero-Length Entity

**Definition:** Entity with total length <0.001mm

**Threshold:** Length <0.001mm

**Fix:** Use Auto-Fix > Remove Zero-Length

**Impact:** No visual impact, but creates DXF bloat

---

## Advanced Tips

### Precision Editing

- Use zoom (mouse wheel) to see details
- Merge tolerance: 0.1mm (adjustable in settings)
- Vertex precision: 0.001mm (1 micron)

### Performance

- Files >1000 entities may slow down
- Hide unused layers to improve rendering
- Auto-fix duplicates is O(n²) - may take seconds for large files

### Layer Management

- Common layers: CUTTING, BEND, IGNORE
- Create custom layers in CAD software
- All layers exported to final DXF

---

## Keyboard Shortcuts Reference Card

```
┌─────────────────────────────────────────────┐
│  DXF Healing Editor - Keyboard Shortcuts    │
├─────────────────────────────────────────────┤
│  TOOLS                                      │
│  S           Select tool                    │
│  D           Delete tool                    │
│  M           Merge tool                     │
│                                             │
│  EDITING                                    │
│  Delete      Delete selected                │
│  Ctrl+Z      Undo                           │
│  Ctrl+Y      Redo                           │
│  Escape      Clear selection                │
│                                             │
│  VIEW                                       │
│  Space       Pan mode (hold)                │
│  Wheel       Zoom in/out                    │
│  Middle Drag Pan view                       │
└─────────────────────────────────────────────┘
```

---

## Getting Help

### Support

- **Documentation:** Check this user guide
- **Issues:** Report bugs on GitHub
- **Email:** support@smartcut.com

### Additional Resources

- [DXF Healing Phase Documentation](./DXF_HEALING_PHASE1_VALIDATION.md)
- [Technical Architecture](./DXF_HEALING_PHASE2_EDITOR_CORE.md)
- [Auto-Fix Features](./DXF_HEALING_PHASE3_AUTO_FIX.md)

---

**Version History:**
- 1.0 (2025-01-21): Initial release with full feature set
