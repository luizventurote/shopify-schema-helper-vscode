# 🛠️ Shopify Schema Helper

A powerful VS Code extension that makes it easy to visualize and validate Shopify section and theme block schemas.

<img src="media/demo.gif" alt="Shopify Schema Helper Demo" width="500" height="auto">

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

### 🎛️ **Complete Setting Type Support**
- **Basic inputs**: text, textarea, number, range, checkbox, select, radio
- **Specialized inputs**: color, font_picker, image_picker, video, video_url, html, liquid, richtext
- **Resource selectors**: page, product, collection, blog, article, link_list, url
- **Advanced types**: 
  - `metaobject` - Select metaobject entries with specified type
  - `collection_list` - Multi-select collections with limit control (1-50)
  - `product_list` - Multi-select products with limit control (1-50)
  - `metaobject_list` - Multi-select metaobject entries
  - `text_alignment` - Visual alignment selector (left, center, right)
  - `color_background` - Advanced color/gradient picker
  - `color_scheme`, `color_scheme_group` - Theme color scheme selectors
  - `inline_richtext` - Inline rich text formatting
- **Type-specific validation**: 
  - `metaobject` requires `metaobject_type` property
  - `collection_list`/`product_list` validate limit ranges (1-50)
  - `text_alignment` validates alignment values
  - `video_url` validates accepted providers (youtube, vimeo)
  - `range` requires min/max and validates step values
- **Enhanced details**: Each setting type shows relevant attributes, validation, and options in the tree view

### 🔧 **Robust JSON Parsing**
- **Auto-fix common issues**: Automatically handles trailing commas, missing commas, and other common JSON syntax errors
- **Graceful error handling**: Shows warnings instead of breaking the entire experience for minor syntax issues
- **Detailed issue reporting**: Lists all detected JSON issues with specific line numbers and fix suggestions
- **Smart recovery**: Attempts to parse and display your schema even with syntax errors
- **Common fixes guide**: Built-in tips and examples for fixing JSON syntax issues

### 🎯 **Precise Click-to-Navigate**
- Click any tree item to jump to the corresponding source line
- **Accurate line navigation**: Fixed line number precision for JSON issues
- Error navigation with exact line targeting
- Smart line mapping for schema elements

### 🎨 **Flexible Interface Options**
- **Dedicated sidebar icon**: Extension has its own dedicated icon in the VS Code sidebar
- **Explorer panel integration**: Also available in the Explorer panel for traditional workflow
- **Choose your preference**: Use either the dedicated sidebar or Explorer panel
- **Professional integration**: Clean, focused UI optimized for Shopify schema management

### 🌐 **Shopify Translation Support**
- **Automatic translation loading**: Reads translations from your theme's `locales/en.default.schema.json` file
- **Real-time updates**: Automatically reloads when you modify the locales file
- **Smart fallbacks**: Shows original schema values when locales file is missing or translations aren't found
- **Translation key support**: Converts `t:` keys to their English equivalents from your theme
- **What gets translated**: Setting labels, block names, section names, and option values using your theme's translation file

## 🚀 **Getting Started**

1. **Install the Extension**
   - Search for "Shopify Schema Helper" in VS Code Extensions
   - Or install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=luizventurote.shopify-schema-helper)

2. **Open a Shopify theme project** in VS Code

3. **Open any `.liquid` file** with a schema:
   - Section files (in `/sections/` folder)
   - Theme block files (in `/blocks/` folder)

4. **View the schema** using either:
   - **Dedicated sidebar**: Click the Shopify Schema Helper icon in the sidebar
   - **Explorer panel**: Look for "Shopify Schema" section in the Explorer

5. **Start exploring**:
   - Expand settings, blocks, and presets
   - Click any item to navigate to the source code
   - Check the validation section for any issues
   - Review JSON issues for auto-fixes and suggestions

## 🎯 **Usage**

### **Getting Started**
1. **Choose your preferred view**:
   - **Dedicated sidebar**: Click the Shopify Schema Helper icon in the VS Code sidebar (structure symbol)
   - **Explorer panel**: Find "Shopify Schema" section in the Explorer panel
2. **Open any `.liquid` file** with a schema to see it visualized in your chosen panel

### **Available Commands**
- **Validate Schema** - Check current schema for errors and warnings
- **Refresh Tree** - Manually refresh the schema tree view
- **Navigate to Line** - Click any tree item to jump to source (automatic)

### **Robust JSON Parsing**
The extension intelligently handles common JSON syntax issues:
- **Trailing commas**: Automatically removes commas before closing brackets/braces (`},` → `}`)
- **Missing commas**: Detects and suggests where commas should be added between elements
- **Error recovery**: Attempts to parse your schema even with syntax errors
- **Issue tracking**: Shows a "JSON Issues" section with auto-fixed and manual-fix-needed items
- **Helpful suggestions**: Provides specific line numbers and fix recommendations
- **Common fixes guide**: Built-in examples showing correct JSON syntax

### **Translation Support**
The extension automatically reads your Shopify theme's translation file:
- **File location**: `locales/en.default.schema.json` in your workspace root
- **Automatic loading**: Translations load when you open a `.liquid` file
- **Live updates**: Changes to the locales file are detected and applied instantly
- **Smart fallbacks**: If the locales file doesn't exist or a translation is missing, shows original schema values instead of broken keys
- **Example**: `t:sections.collage.name` becomes the actual section name from your translations

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