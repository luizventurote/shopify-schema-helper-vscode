# Development Notes

## Current Status

### ✅ Completed Features
- **Schema Tree Visualization**: Complete with real-time updates
- **Advanced Validation**: Full validation engine with smart @app/@theme support
- **Click-to-Navigate**: Surgical precision line mapping for all validation errors
- **Header/Paragraph Support**: Proper validation for Shopify special setting types
- **Dynamic Block Support**: Intelligent validation when @app/@theme blocks are present

### 🚧 Disabled Features (For Future Development)
- **Schema Builder**: Visual drag-and-drop schema creation tool
  - Files: `src/schemaBuilderPanel.ts` (exists but disabled in extension.ts)
  - Commands: Commented out in package.json and extension.ts
  - UI: Webview panel implementation ready but not activated
  - Status: Ready for future development when needed

### 🎯 Current Focus
The extension currently focuses on schema visualization, validation, and navigation. The schema builder feature has been temporarily disabled to allow focus on core functionality improvements.

### 🔧 How to Re-enable Schema Builder
When ready to continue schema builder development:

1. Uncomment schema builder import in `src/extension.ts`
2. Uncomment command registration in `src/extension.ts`
3. Uncomment webview serializer in `src/extension.ts` 
4. Add back command definitions in `package.json`
5. Add back menu items in `package.json`
6. Update README.md to document the feature

### 🧪 Test Files
- `examples/dynamic-blocks-test.liquid` - Tests @app/@theme dynamic block validation
- `examples/strict-blocks-test.liquid` - Tests strict validation without dynamic blocks
- `examples/header-validation-test.liquid` - Tests header/paragraph setting validation
- `examples/banner-test.liquid` - Real-world banner schema test
- `examples/banner-corrected.liquid` - Corrected version showing best practices 