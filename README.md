# 🛠️ Shopify Schema Helper

A powerful VS Code extension that helps you visualize, validate, and create Shopify section and theme block schemas with ease.

## ✨ Features

### 🔍 **Real-time Schema Visualization**
- Tree view of your schema structure
- Instant parsing of Shopify section and block schemas
- Visual representation of settings, blocks, and presets
- Support for both section and theme block schemas

### ✅ **Advanced Schema Validation**
- Real-time validation with detailed error messages
- Smart validation for @app and @theme dynamic blocks
- Click-to-navigate validation errors to source code
- Comprehensive checks for Shopify schema best practices

### 🎯 **Click-to-Navigate**
- Click any tree item to jump to the corresponding source line
- Surgical precision error navigation
- Smart line mapping for all schema elements

<!-- 
### 🎛️ **Visual Schema Builder** (Coming Soon)
- Drag-and-drop schema creation
- Form-based setting configuration  
- Live preview with instant validation
- Export to standard Shopify liquid format
-->

## 🗂️ **Supported File Types**

### **Sections** (`/sections` folder)
- Section schema files that define page sections
- Support for all section-specific features like `enabled_on`, `disabled_on`
- Block definitions and limits

### **Theme Blocks** (`/blocks` folder)  
- Reusable block components as described in [Shopify's theme blocks documentation](https://shopify.dev/docs/storefronts/themes/architecture/blocks)
- Same schema structure as sections but stored in `/blocks` folder
- Can be used across multiple sections
- Support for nested blocks and settings

## 📋 **Supported Schema Elements**

### **Settings Types**
- **Text Inputs**: `text`, `textarea`, `richtext`, `html`, `liquid`
- **Numeric**: `number`, `range`  
- **Selection**: `checkbox`, `select`, `radio`
- **Media**: `image_picker`, `video`, `video_url`
- **Resources**: `collection`, `product`, `blog`, `page`, `article`, `link_list`
- **Other**: `color`, `font_picker`, `url`
- **UI Elements**: `header`, `paragraph`

### **Advanced Features**
- **Blocks**: Nested block definitions with their own settings
- **Presets**: Default configurations with settings and blocks
- **Limits**: `max_blocks`, `min_blocks`, section limits
- **Constraints**: `enabled_on`, `disabled_on` templates and groups
- **Conditional Visibility**: `visible_if` property with Liquid code for dynamic field display

## 🚀 **Getting Started**

1. **Install the Extension** (when published)
2. **Open a Shopify theme project** in VS Code
3. **Open any `.liquid` file** with a schema (section or theme block)
4. **Look for the "Shopify Schema" panel** in the Explorer sidebar

### **Example Files Included**
The extension comes with example files to help you get started:

#### **Sections** (`examples/sections/`)
- `sample-section.liquid` - Complex section with all setting types
- `validation-test.liquid` - File with intentional errors for testing
- `conditional-section.liquid` - Demonstrates `visible_if` conditional visibility

#### **Theme Blocks** (`examples/blocks/`)
- `button.liquid` - Simple button block with text, URL, and style options  
- `image-text.liquid` - Image and text combination block with headers

## 🎯 **Usage**

### **Tree View Navigation**
```
SHOPIFY SCHEMA
├── 🔍 Validation: All good ✓
└── 📄 Conditional Section (Section • 9 settings)
    ├── 📝 Type: Section
    ├── ⚙️ Settings (9)
    │   ├── 📝 Basic Settings
    │   ├── ☑️ Show Heading ▼
    │   ├── 📝 Heading Text (Conditional) ▼
    │   │   ├── 🔑 ID: heading_text
    │   │   ├── 📋 Type: text
    │   │   ├── 💡 Default: "Welcome to Our Store"
    │   │   └── 👁️ Visible If: {{ section.settings.show_heading == true }}
    │   ├── 🎨 Heading Color (Conditional) ▼
    │   └── ...
    └── 📦 Presets (1)
```

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