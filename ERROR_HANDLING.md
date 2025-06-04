# Enhanced JSON Error Handling - Shopify Schema Helper

## Overview

The Shopify Schema Helper extension provides comprehensive JSON parsing error handling directly in the **Shopify Schema panel** with **precise error location detection**. When JSON syntax errors are detected, the extension pinpoints the exact problematic character and displays detailed error information in the tree view for a seamless debugging experience.

## Features

### 1. Precise Error Location Detection
- **Character-level precision** - highlights only the problematic character (e.g., a single trailing comma)
- **Smart pattern recognition** - detects common JSON syntax issues automatically
- **Line-specific highlighting** - no more red squiggles across entire schema blocks
- **Real-time validation** as you type (with 500ms debounce)

### 2. Visual Error Indicators
- **Tree view error display** with expandable details
- **Precise red underlines** highlighting only the problematic character
- **Error indicators** in the Problems panel with exact line numbers
- **Status bar notifications** for quick awareness
- **Minimal visual noise** - only the actual error is highlighted

### 3. Tree View Error Display
When a JSON parsing error occurs, the Shopify Schema panel shows:

```
📁 SHOPIFY SCHEMA
└── ❌ JSON Parsing Error
    ├── 📍 Line 42, Character 15
    ├── 🔍 Trailing comma before closing bracket
    ├── 💡 Suggestion
    │   └── Remove this comma - it's not allowed before closing brackets
    ├── 📝 Context
    │   ├──    40:       "label": "White"
    │   ├──    41:     },
    │   ├── >>> 42:   ],    ← Comma highlighted here
    │   ├──    43:   "default": "text-white"
    │   └──    44: }
    └── 🔧 Common JSON Fixes
        ├── ✓ Remove trailing commas after the last item in arrays/objects
        ├── ✓ Ensure all strings are wrapped in double quotes
        ├── ✓ Check for missing commas between items
        ├── ✓ Verify all brackets and braces are properly closed
        └── ✓ Use VS Code formatting (Shift+Alt+F) to check structure
```

### 4. Intelligent Error Analysis
The extension provides context-aware error messages for common JSON issues:

#### Trailing Comma Errors
- **Detection**: `Unexpected token ']'` or `Unexpected token '}'`
- **Precision**: Highlights only the trailing comma character
- **Tree display**: "🔍 Trailing comma before closing bracket/brace"
- **Suggestion**: "Remove this comma - it's not allowed before closing brackets"

#### Extra Comma Issues
- **Detection**: `Unexpected token ','`
- **Precision**: Highlights the specific extra comma
- **Tree display**: "🔍 Extra comma found"
- **Suggestion**: "Remove this duplicate comma"

#### Missing Commas
- **Detection**: `Unexpected string`
- **Precision**: Highlights the location where comma should be added
- **Tree display**: "🔍 Missing comma between items"
- **Suggestion**: "Add a comma between JSON items"

#### String Termination Issues
- **Detection**: `Unterminated string`
- **Precision**: Highlights the unterminated string location
- **Tree display**: "🔍 Unterminated string"
- **Suggestion**: "Check for missing closing quotes on strings"

### 5. Advanced Pattern Recognition
The extension uses sophisticated pattern matching to detect:
- **Trailing commas** before closing brackets `],` or braces `},`
- **Comma followed by whitespace** then closing bracket `, ]` or brace `, }`
- **Double commas** `,,` indicating duplicate separators
- **Bracket/brace mismatches** with precise location reporting

### 6. Developer-Friendly Experience
- **No intrusive popups** - all error information contained within the tree view
- **Consistent location** for all schema-related information
- **Non-blocking workflow** - no modal dialogs interrupting your work
- **Always accessible** - error details remain visible while editing
- **Precise targeting** - only the actual error is highlighted, not entire blocks

## Example Error Scenarios

### Scenario 1: Trailing Comma in Settings Array
```json
{
  "settings": [
    {
      "type": "text",
      "id": "title",
      "label": "Title"
    }, // ← This trailing comma will be detected
  ],
  "blocks": []
}
```

**Result**: Red underline on the comma with message: "Trailing comma before closing bracket"

### Scenario 2: Missing Comma Between Objects
```json
{
  "settings": [
    {
      "type": "text",
      "id": "title"
    } // ← Missing comma here
    {
      "type": "color",
      "id": "bg_color"
    }
  ]
}
```

**Result**: Red underline with message: "Missing comma between items"

### Scenario 3: Extra Comma After Closing Bracket
```json
{
  "settings": [
    {
      "type": "text",
      "id": "title"
    }
  ], // ← Extra comma after array
  "blocks": []
}
```

**Result**: Red underline with message: "Extra comma found"

## Development Benefits

### For Theme Developers
- **Faster debugging** of schema issues
- **Clear guidance** on fixing JSON syntax
- **Real-time validation** prevents errors from accumulating
- **Learning tool** for proper JSON syntax

### For Extension Users
- **No more cryptic error messages**
- **Precise error location** identification
- **Actionable suggestions** for fixes
- **Comprehensive error documentation**

## Technical Implementation

### Error Detection Pipeline
1. **Document change** triggers validation (debounced)
2. **Schema extraction** from liquid file
3. **JSON parsing** attempt with try/catch
4. **Syntax validation** using custom validator
5. **Error analysis** and user-friendly message generation
6. **Diagnostic creation** with precise location
7. **Visual feedback** in editor and problems panel

### Error Recovery
- **Graceful failure** when parsing fails
- **Partial validation** for malformed schemas
- **Continued functionality** even with errors
- **Clear indication** of what's working vs. broken

## Commands and Features

### Available Commands
- `Shopify Schema: Refresh Schema` - Re-validates current document
- `Shopify Schema: Validate Schema` - Manual validation trigger
- Built-in validation on file open, edit, and save

### Integration Points
- **Problems Panel** - All schema errors appear here
- **Status Bar** - Quick error notifications
- **Editor Diagnostics** - Direct inline error display
- **Tree View** - Shows whether schema is valid

## Future Enhancements

Planned improvements include:
- **Auto-fix suggestions** with code actions
- **JSON schema validation** against Shopify specifications
- **Setting type validation** (e.g., color format, URL validation)
- **Quick fix commands** for common issues
- **Error history and analytics**

---

This enhanced error handling transforms the debugging experience from frustrating trial-and-error to guided, educational problem-solving. 