# Click-to-Navigate Feature - Shopify Schema Helper

## Overview

The Shopify Schema Helper extension now includes **click-to-navigate** functionality that allows you to seamlessly jump between the tree view and the corresponding lines in your source code. Simply click on any schema element in the tree view to automatically scroll to that line in your liquid file.

## Features

### 🎯 **Instant Navigation**
- **Single click** to jump to any schema element
- **Automatic scrolling** to the exact line in your source file
- **Smart positioning** - places the target line in the center of your editor
- **Editor focus** - automatically focuses the source file for immediate editing

### 📍 **Supported Elements**

#### Settings
- **Setting definitions** - Click any setting to go to its JSON definition
- **Setting properties** - Navigate to specific setting attributes (ID, type, default values)
- **Conditional settings** - Jump to `visible_if` conditions

#### Blocks
- **Block definitions** - Navigate to block type and name declarations
- **Block settings** - Jump to settings within specific blocks

#### **✨ NEW: Validation Errors/Warnings**
- **JSON parsing errors** - Click to go directly to problematic lines
- **Schema validation errors** - Navigate to elements with missing required properties
- **Setting validation issues** - Jump to settings missing IDs, labels, or with invalid configurations
- **Block validation problems** - Navigate to blocks missing names or types
- **Preset validation warnings** - Jump to presets with configuration issues
- **Schema warnings** - Navigate to elements that need attention

#### Schema Structure
- **Section name** - Navigate to the main section declaration
- **Settings array** - Jump to the main settings block
- **Blocks array** - Go to the blocks definition
- **Presets array** - Navigate to presets configuration

### 🖱️ **Visual Indicators**

Each clickable tree item shows:
- **Enhanced tooltips** with line numbers: `"📍 Click to go to line 23"`
- **Consistent iconography** indicating navigable elements
- **Clear visual hierarchy** showing which items are clickable

### 📋 **Example Tree View**

```
📁 SHOPIFY SCHEMA
├── ❌ Validation: 4 errors, 6 warnings        ← Click validation items to navigate!
│   ├── ❌ Setting id is required              ← Click to go to line 22
│   ├── ❌ Setting id is required              ← Click to go to line 26  
│   ├── ❌ Block name is required              ← Click to go to line 44
│   ├── ❌ Preset name is required             ← Click to go to line 58
│   ├── ⚠️ Setting label is missing            ← Click to go to line 22
│   ├── ⚠️ select settings require options     ← Click to go to line 22
│   ├── ⚠️ Range settings should have min/max  ← Click to go to line 26
│   └── ⚠️ Duplicate setting ID: "duplicate_id" ← Click to go to line 34
└── 📄 Validation Navigation Test
    ├── ⚙️ Settings (5)                        ← Click to go to line 12
    │   ├── 📝 Section Title                   ← Click to go to line 14
    │   │   ├── 🔑 ID: title                  ← Click to go to line 15  
    │   │   ├── 📋 Type: text                 ← Click to go to line 14
    │   │   └── 📌 Default: "Test Section"    ← Click to go to line 17
    │   ├── 📝 text_style                     ← Click to go to line 20
    │   ├── 📄 Font Size                      ← Click to go to line 24
    │   ├── 🎨 Background Color               ← Click to go to line 28
    │   └── 📝 Text Color                     ← Click to go to line 33
    ├── 🧩 Blocks (2)                         ← Click to go to line 38
    │   ├── 📄 text_block                     ← Click to go to line 40
    │   └── 📄 Image Block                    ← Click to go to line 50
    └── 📋 Presets (1)                        ← Click to go to line 61
        └── 📄 Unnamed Preset                 ← Click to go to line 63
```

### ⚡ **Smart Validation Navigation**

The extension intelligently maps validation errors to source lines by:
- **Parsing validation paths** like `"settings[0]"`, `"blocks[1]"`, `"presets[0]"`
- **Matching array indices** to actual schema elements (settings, blocks, presets)
- **Finding element identifiers** (setting IDs, block names, preset names)
- **Using the schema line map** to locate exact source line numbers
- **Fallback navigation** to general schema sections when specific elements aren't found

#### Validation Path Mapping Examples
```typescript
// Validation paths mapped to source lines:
"settings[0]"     → Line where first setting is defined
"settings[1]"     → Line where second setting is defined  
"blocks[0]"       → Line where first block is defined
"blocks[1]"       → Line where second block is defined
"presets[0]"      → Line where first preset is defined
"limits"          → Line where min_blocks/max_blocks are defined
```

### 🎨 **User Experience**

#### Click Behavior
1. **Single click** on any navigable tree item (including validation errors)
2. **Source file activates** and scrolls to the target line
3. **Cursor positioned** at the beginning of the target line
4. **Line highlighted** briefly to show the destination
5. **Editor receives focus** for immediate editing

#### Enhanced Validation Tooltips
```
❌ Setting id is required
Path: settings[1]

📍 Click to go to line 22
```

```
⚠️ Duplicate setting ID: "duplicate_id"  
Path: settings[3]
Suggestion: Use unique IDs for all settings

📍 Click to go to line 28
```

#### Error Navigation Workflow
1. **Open liquid file** with schema validation issues
2. **View validation panel** - shows all errors and warnings
3. **Click any validation item** - instantly jump to problematic code
4. **Fix the issue** - edit directly at the highlighted line
5. **Tree auto-refreshes** - validation updates in real-time

## Technical Implementation

### Enhanced Navigation Command
```typescript
// Registered command for line navigation (unchanged)
'shopifySchemaHelper.navigateToLine'

// Enhanced validation item creation with line numbers
private getLineNumberFromValidationPath(path?: string): number | undefined {
    // Maps validation paths to actual source line numbers
    // Supports: settings[n], blocks[n], presets[n], limits
}
```

### Validation Path Resolution Algorithm
1. **Parse validation path** - Extract element type and index
2. **Find schema element** - Locate the actual setting/block/preset
3. **Get element identifier** - Extract ID, name, or other unique identifier
4. **Lookup line number** - Use existing schema line map
5. **Return navigation target** - Provide exact line number for jumping

### Smart Line Mapping
```typescript
// Enhanced line mapping for validation support
private buildSchemaLineMap(document: vscode.TextDocument): void {
    // Maps setting IDs: "setting:title" → line 15
    // Maps block names: "block:text_block" → line 40  
    // Maps preset names: "preset:Default" → line 63
    // Maps schema sections: "schema:settings" → line 12
    // Maps limits: "schema:limits" → line 67
}
```

## Benefits

### For Debugging
- **Instant error location** - No more hunting through large schema files
- **Context-aware navigation** - Jump directly to the problematic element
- **Efficient troubleshooting** - Fix issues immediately at their source
- **Real-time feedback** - See validation updates as you make changes

### For Development Workflow
- **Faster schema development** - Quick navigation between tree view and source
- **Reduced cognitive load** - Visual connection between validation and source
- **Better error understanding** - See exactly where each issue occurs
- **Streamlined editing** - Fix multiple validation issues efficiently

### For Large Schemas
- **Quick error resolution** in files with 50+ settings
- **Instant location** of specific problematic elements
- **Efficient validation cleanup** across complex block structures
- **Rapid schema refinement** and validation

### For Learning
- **Visual validation education** - See how errors map to source code
- **Pattern recognition** - Understand common validation issues
- **Immediate feedback** - Connect validation messages to actual code
- **Schema best practices** - Learn proper structure through validation

## Compatibility

### Supported Validation Types
- ✅ **Setting validation errors** (missing ID, type, label)
- ✅ **Block validation errors** (missing name, type)
- ✅ **Preset validation errors** (missing name, invalid references)
- ✅ **Schema structure warnings** (limits, deprecated features)
- ✅ **Setting type validation** (range min/max, select options)
- ✅ **Duplicate validation** (duplicate IDs, block types)

### Enhanced File Support
- ✅ **Shopify Sections** (`.liquid` files in `/sections/`)
- ✅ **Theme Blocks** (`.liquid` files in `/blocks/`)
- ✅ **Any liquid file** with valid `{% schema %}` blocks
- ✅ **Large schema files** (100+ settings with complex validation)

## Usage Tips

### Validation Navigation Best Practices
1. **Fix errors first** - Address validation errors before warnings
2. **Use meaningful IDs** - Easier to track and navigate to issues
3. **Organize by priority** - Fix structural issues (missing names/IDs) first
4. **Test incrementally** - Make small changes and check validation
5. **Use tree refresh** - Refresh after major schema changes

### Troubleshooting Navigation
- **Validation not clickable?** - Check that the schema has line mapping
- **Wrong line navigation?** - Try refreshing the tree view
- **Missing validation items?** - Ensure the schema is valid JSON
- **Line numbers off?** - Re-open the file to rebuild line mapping

---

This enhanced click-to-navigate feature makes validation error resolution fast and intuitive, turning the Shopify Schema Helper into a powerful debugging tool! 🚀🔧 