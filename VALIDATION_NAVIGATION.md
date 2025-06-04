# Validation Navigation Feature - Shopify Schema Helper

## Overview
The **Validation Navigation** feature enables you to click on any validation error or warning in the tree view and instantly jump to the exact line in your source code where the issue occurs. This makes debugging schema validation issues fast and efficient.

## What This Solves
Previously, when validation errors appeared in the tree view, you could see the error message but had to manually search through your schema to find the problematic code. Now, a single click takes you directly to the source of the issue.

## Key Features

### 🎯 **Direct Error Navigation**
- Click any validation error → Jump to the exact problematic line
- Click any validation warning → Navigate to the element that needs attention
- Smart path mapping from validation results to source code
- Works with all validation types (settings, blocks, presets, limits)

### 📍 **Supported Validation Types**

#### Setting Validation
- **Missing ID errors** → Navigate to setting without `"id"` property
- **Missing label warnings** → Jump to setting without `"label"` property  
- **Duplicate ID errors** → Navigate to conflicting setting definitions
- **Invalid type errors** → Jump to setting with unknown type
- **Missing options errors** → Navigate to select/radio without options array
- **Range validation warnings** → Jump to range settings missing min/max

#### Block Validation  
- **Missing name errors** → Navigate to block without `"name"` property
- **Missing type errors** → Jump to block without `"type"` property
- **Duplicate type warnings** → Navigate to blocks with conflicting types
- **Invalid type format warnings** → Jump to blocks with poorly formatted types
- **✨ NEW: Special @app/@theme validation** → Smart handling of Shopify's reserved block types

#### Preset Validation
- **Missing name errors** → Navigate to preset without `"name"` property
- **Invalid setting references** → Jump to presets referencing non-existent settings
- **Invalid block references** → Navigate to presets using undefined block types

#### Schema Structure
- **Limits validation** → Navigate to min_blocks/max_blocks configuration
- **General structure warnings** → Jump to schema-level issues

### 🧩 **Special Block Types: @app and @theme**

The validator now correctly handles Shopify's special reserved block types:

#### ✅ **@app Blocks**
- **Purpose**: Dynamically loads blocks from installed apps in the store
- **Valid usage**: `{ "type": "@app" }` (no name or settings required)
- **Validation**: Warns if name or settings are provided

#### ✅ **@theme Blocks**  
- **Purpose**: Dynamically loads blocks from the theme's `/blocks` folder
- **Valid usage**: `{ "type": "@theme" }` (no name or settings required)
- **Validation**: Warns if name or settings are provided

#### ❌ **Invalid @ Usage**
- Any other block type starting with `@` (e.g., `@custom`, `@invalid`) will trigger validation warnings
- Only `@app` and `@theme` are valid reserved block types

### 🗺️ **Path Mapping System**

The extension uses a sophisticated path mapping system:

```typescript
// Validation Error Paths → Source Lines
"settings[0]"     → First setting definition (line 15)
"settings[1]"     → Second setting definition (line 22)  
"settings[2]"     → Third setting definition (line 28)
"blocks[0]"       → First block definition (line 40)
"blocks[1]"       → Second block definition (line 50)
"presets[0]"      → First preset definition (line 63)
"limits"          → Schema limits section (line 67)
```

### 💡 **Smart Fallback Navigation**

When specific elements can't be mapped:
- **Settings errors** → Navigate to main `"settings"` array  
- **Blocks errors** → Jump to main `"blocks"` array
- **Presets errors** → Navigate to main `"presets"` array
- **General errors** → Jump to beginning of schema block

## Example Usage

### Test File: `theme-blocks-test.liquid` (Valid Usage)

```liquid
{% schema %}
{
  "name": "Theme Blocks Test Section",
  "blocks": [
    {
      "type": "@app"          ← ✅ Valid: Dynamic app blocks
    },
    {
      "type": "@theme"        ← ✅ Valid: Dynamic theme blocks  
    },
    {
      "type": "custom_block", ← ✅ Valid: Regular block with name
      "name": "Custom Block",
      "settings": [...]
    }
  ]
}
{% endschema %}
```

### Test File: `invalid-theme-blocks-test.liquid` (Invalid Usage)

```liquid
{% schema %}
{
  "name": "Invalid Theme Blocks Test",
  "blocks": [
    {
      "type": "@app",
      "name": "App Block",     ← ⚠️ Warning: @app shouldn't have name
      "settings": [...]        ← ⚠️ Warning: @app shouldn't have settings
    },
    {
      "type": "@theme",
      "name": "Theme Block",   ← ⚠️ Warning: @theme shouldn't have name
      "settings": [...]        ← ⚠️ Warning: @theme shouldn't have settings
    },
    {
      "type": "invalid@block", ← ⚠️ Warning: Invalid @ usage
      "name": "Invalid Block"
    }
  ]
}
{% endschema %}
```

### Resulting Tree View with Navigation

```
📁 SHOPIFY SCHEMA
├── ⚠️ Validation: 0 errors, 4 warnings
│   ├── ⚠️ Block type "@app" should not have a name property     ← Click → Line 15
│   ├── ⚠️ Block type "@app" should not have settings           ← Click → Line 15  
│   ├── ⚠️ Block type "@theme" should not have a name property  ← Click → Line 22
│   ├── ⚠️ Block type "@theme" should not have settings         ← Click → Line 22
│   └── ⚠️ Block type "invalid@block" should use snake_case     ← Click → Line 29
└── 📄 Invalid Theme Blocks Test
    └── ... (rest of schema tree)
```

## Implementation Details

### Enhanced Block Validation
```typescript
// Special handling for @app and @theme blocks
const isSpecialBlock = block.type === '@app' || block.type === '@theme';

// Names not required for special blocks
if (!block.name && !isSpecialBlock) {
    errors.push({
        type: 'error',
        message: 'Block name is required',
        path
    });
}

// Special blocks shouldn't have names
if (block.name && isSpecialBlock) {
    warnings.push({
        type: 'warning',
        message: `Block type "${block.type}" should not have a name property`,
        path,
        suggestion: 'Remove the name property for @app and @theme blocks'
    });
}

// Type format validation with exceptions
if (!isSpecialBlock && !/^[a-z][a-z0-9_]*$/.test(block.type)) {
    warnings.push({
        type: 'warning',
        message: `Block type "${block.type}" should use lowercase letters, numbers, and underscores only`,
        path,
        suggestion: 'Use snake_case format for block types (or use @app/@theme for dynamic blocks)'
    });
}
```

### Path Resolution Algorithm
```typescript
private getLineNumberFromValidationPath(path?: string): number | undefined {
    if (!path || !this.currentSchema) return undefined;

    // Parse "settings[0]" → Find first setting's line
    if (path.startsWith('settings[')) {
        const index = parseInt(path.match(/settings\[(\d+)\]/)?.[1]);
        const setting = this.currentSchema.settings?.[index];
        if (setting?.id) {
            return this.schemaLineMap.get(`setting:${setting.id}`);
        }
    }
    
    // Parse "blocks[1]" → Find second block's line  
    else if (path.startsWith('blocks[')) {
        const index = parseInt(path.match(/blocks\[(\d+)\]/)?.[1]);
        const block = this.currentSchema.blocks?.[index];
        if (block?.name) {
            return this.schemaLineMap.get(`block:${block.name}`);
        }
    }
    
    // Parse "presets[0]" → Find first preset's line
    else if (path.startsWith('presets[')) {
        const index = parseInt(path.match(/presets\[(\d+)\]/)?.[1]);
        const preset = this.currentSchema.presets?.[index];
        if (preset?.name) {
            return this.schemaLineMap.get(`preset:${preset.name}`);
        }
    }
    
    // Fallback to general sections
    return this.schemaLineMap.get('schema:settings') || undefined;
}
```

### Enhanced Line Mapping
```typescript  
private buildSchemaLineMap(document: vscode.TextDocument): void {
    // ... existing mapping for settings, blocks ...
    
    // NEW: Enhanced preset tracking
    if (line.includes('"presets"') || this.isInPresetsSection(lines, i)) {
        const presetNameMatch = line.match(/"name":\s*"([^"]+)"/);
        if (presetNameMatch && this.isInPresetsSection(lines, i)) {
            this.schemaLineMap.set(`preset:${presetNameMatch[1]}`, absoluteLineNumber);
        }
    }
    
    // NEW: Limits tracking
    if (line.includes('"min_blocks"') || line.includes('"max_blocks"')) {
        this.schemaLineMap.set('schema:limits', absoluteLineNumber);
    }
}
```

## User Experience Benefits

### For Debugging
- **Zero hunting** - No more searching through large files for errors
- **Instant context** - See exactly where each validation issue occurs  
- **Efficient workflow** - Fix → Click next error → Fix → Repeat
- **Visual feedback** - Clear connection between tree view and source

### For Development
- **Faster iteration** - Quick validation error resolution
- **Better understanding** - See how validation maps to actual code
- **Reduced frustration** - No more manual error hunting
- **Professional feel** - IDE-quality navigation experience
- **✨ Modern Shopify support** - Proper handling of dynamic block types

### For Learning
- **Educational** - Understand schema structure through validation
- **Pattern recognition** - Learn common validation issues and solutions
- **Immediate feedback** - See results of fixes in real-time
- **Best practices** - Learn proper schema structure and dynamic blocks

## Testing the Feature

1. **Open test file**: `examples/validation-navigation-test.liquid`
2. **View tree panel** - Should show validation errors
3. **Click any error** - Should jump to the corresponding source line
4. **Fix the error** - Edit the code to resolve the issue
5. **Observe refresh** - Tree should update with fewer errors

### Test @app/@theme Support
1. **Open**: `examples/theme-blocks-test.liquid` - Should show no validation errors
2. **Open**: `examples/invalid-theme-blocks-test.liquid` - Should show warnings for misused special blocks
3. **Click warnings** - Should navigate to the problematic @app/@theme usage

### Expected Validation Results

#### `theme-blocks-test.liquid` (Valid)
- ✅ No errors or warnings for properly used `@app` and `@theme` blocks
- ✅ Valid custom blocks with names and settings work normally

#### `invalid-theme-blocks-test.liquid` (Invalid)
- ⚠️ "@app should not have a name property" 
- ⚠️ "@app should not have settings"
- ⚠️ "@theme should not have a name property"
- ⚠️ "@theme should not have settings" 
- ⚠️ "invalid@block should use snake_case format"

## Compatibility
- ✅ Works with all validation error types
- ✅ Supports complex nested schemas
- ✅ Handles missing elements gracefully
- ✅ Integrates with existing navigation system
- ✅ Real-time updates as you edit
- ✅ **NEW: Full support for @app and @theme dynamic blocks**

---

This validation navigation feature transforms debugging from a tedious search process into an efficient point-and-click workflow, now with complete support for modern Shopify dynamic block features! 🎯🔧🧩