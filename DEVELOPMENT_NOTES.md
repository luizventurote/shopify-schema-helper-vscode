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

## Publishing to VS Code Marketplace

### Prerequisites
1. Install vsce (Visual Studio Code Extension Manager):
   ```bash
   npm install -g vsce
   ```

2. Login to Azure DevOps with your publisher token:
   ```bash
   vsce login luizventurote
   ```

### Publishing Process

#### Quick Publish (Recommended)
```bash
npm run publish
```

#### Manual Publishing Steps
1. **Compile the extension:**
   ```bash
   npm run compile
   ```

2. **Package the extension (optional - for testing):**
   ```bash
   vsce package
   ```

3. **Publish to marketplace:**
   ```bash
   vsce publish
   ```

#### Version Management
- Update version in `package.json` before publishing
- Follow semantic versioning (major.minor.patch)
- Current version: 0.2.0 ✅ PUBLISHED
- Last successful publish: June 5, 2025

### Publisher Information
- Publisher: `luizventurote`
- Extension Name: `shopify-schema-helper`
- Marketplace URL: https://marketplace.visualstudio.com/items?itemName=luizventurote.shopify-schema-helper

### Important Files for Publishing
- `package.json` - Extension manifest and metadata
- `README.md` - Extension description and documentation
- `CHANGELOG.md` - Version history and changes
- `media/` - Icons, demo images, and assets

### Development Workflow
1. Make changes to source code
2. Update version in `package.json`
3. Update `CHANGELOG.md` with new features/fixes
4. Test the extension locally (`F5` in VS Code)
5. Compile: `npm run compile`
6. Publish: `npm run publish`

### Troubleshooting
- If login issues occur, regenerate personal access token in Azure DevOps
- Ensure all required fields in `package.json` are filled
- Check that icon and demo files exist in `media/` folder
- Verify repository URL is accessible

### Extension Structure
```
shopify-schema-helper/
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── schemaTreeProvider.ts # Tree view provider
│   ├── translationManager.ts # Translation system
│   └── schemaValidator.ts    # Schema validation
├── media/                    # Icons and demo assets
├── out/                      # Compiled JavaScript
├── package.json              # Extension manifest
├── README.md                 # Documentation
├── CHANGELOG.md              # Version history
└── DEVELOPMENT_NOTES.md      # This file
```

### Key Features Implemented
- Complete Shopify setting type support
- Translation system with locales file integration
- Schema validation and navigation
- Flexible UI placement (sidebar + explorer)
- Live file watching and reloading
- Comprehensive error handling
- Fallback translation system 