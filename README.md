# 🛠️ Shopify Schema Helper

A powerful VS Code extension that makes it easy to visualize and validate Shopify section and theme block schemas.

## ✨ Features

### 🔍 **Real-time Schema Visualization**
- Tree view of your schema structure
- Instant parsing of Shopify section and block schemas
- Visual representation of settings, blocks, and presets
- Support for both section and theme block schemas

### ✅ **Advanced Schema Validation**
- Real-time validation with detailed error messages
- Click-to-navigate validation errors to source code
- Comprehensive checks for Shopify schema best practices

### 🎯 **Click-to-Navigate**
- Click any tree item to jump to the corresponding source line
- Error navigation
- Smart line mapping for schema elements

## 🚀 **Getting Started**

1. **Install the Extension** (when published)
2. **Open a Shopify theme project** in VS Code
3. **Open any `.liquid` file** with a schema (section or theme block)
4. **Look for the "Shopify Schema" panel** in the Explorer sidebar

## 🎯 **Usage**

### **Available Commands**
- **Validate Schema** - Check current schema for errors and warnings
- **Refresh Tree** - Manually refresh the schema tree view
- **Navigate to Line** - Click any tree item to jump to source (automatic)

### **Context Menu Integration**
Right-click any `.liquid` file to access:
- **Validate Schema** - Check for validation issues

## 🔧 **Development**

### **Setup**
```bash
git clone <repository-url>
cd shopify-schema-helper
npm install
npm run compile
```

### **Running**
- Press `F5` in VS Code to launch Extension Development Host
- Or use `npm run watch` for development with auto-compilation

### **Project Structure**
```
src/
├── extension.ts           # Main extension entry point
├── schemaParser.ts        # Schema parsing logic
├── schemaValidator.ts     # Validation engine
├── schemaTreeProvider.ts  # Tree view data provider
└── schemaBuilderPanel.ts  # Visual builder (disabled)
```

## 📚 **Resources**

- [Shopify Theme Blocks Documentation](https://shopify.dev/docs/storefronts/themes/architecture/blocks)
- [Shopify Section Settings Reference](https://shopify.dev/docs/themes/architecture/sections/section-settings)
- [Liquid Template Language](https://shopify.github.io/liquid/)

## 🐛 **Issues & Feedback**

Found a bug or have a feature request? Please open an issue on GitHub!

## 📄 **License**

MIT License - feel free to use in your projects! 