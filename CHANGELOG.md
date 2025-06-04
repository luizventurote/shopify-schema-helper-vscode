# Changelog

All notable changes to the Shopify Schema Helper extension will be documented in this file.

## [0.1.0] - Initial Release

### ✨ New Features

#### Phase 1: Schema Visualization
- **Schema Detection**: Automatically detects and parses `{% schema %}` blocks in `.liquid` files
- **File Type Recognition**: Distinguishes between sections (`/sections`) and theme blocks (`/blocks`)
- **Tree View Visualization**: Beautiful sidebar panel showing schema structure with collapsible sections
- **Setting Type Recognition**: Visual icons for all Shopify setting types (text, number, color, etc.)
- **Block Support**: Displays blocks and their nested settings
- **Preset Information**: Shows configured presets with counts
- **Constraints Display**: Shows limits like max_blocks, min_blocks, and section limits
- **Conditional Visibility**: Full support for `visible_if` property with Liquid code validation
- **Real-time Updates**: Updates automatically as you edit liquid files with debounced changes

#### Schema Validation
- **Comprehensive Validation**: Checks for common schema errors and best practices
- **Error Detection**: Identifies required fields, duplicate IDs, invalid types, and structural issues
- **Warning System**: Provides helpful suggestions for improvements
- **Visual Indicators**: Shows validation status with error/warning icons in the tree view
- **Detailed Messages**: Contextual error messages with suggestions for fixes

#### Commands & Actions
- **Refresh Schema**: Manual refresh of schema visualization
- **Validate Schema**: Explicit validation with detailed feedback
- **Export Schema**: Export parsed schema as clean JSON
- **Context Menus**: Right-click actions in liquid files
- **Command Palette**: Access all features via command palette

#### Phase 2 Foundation: Visual Schema Builder
- **Webview Panel**: Modern, VS Code-themed interface for schema building
- **Basic Info Editor**: Edit section name, tag, and CSS class
- **Tabbed Interface**: Organized sections for different schema components
- **Live Preview**: Real-time JSON preview of schema changes
- **Export Functionality**: Generate liquid schema blocks from visual builder

### 🛠️ Technical Features
- **TypeScript**: Fully typed codebase for better maintainability
- **Error Handling**: Robust error handling and user feedback
- **Performance**: Debounced updates and efficient parsing
- **Extensibility**: Modular architecture for easy feature additions

### 📝 Documentation
- **Comprehensive README**: Detailed usage instructions and feature overview
- **Getting Started Guide**: Step-by-step setup and usage guide
- **Code Examples**: Sample liquid files with complex schemas
- **Type Definitions**: Complete TypeScript interfaces for all schema elements

### 🔧 Developer Experience
- **Development Setup**: Complete VS Code debugging configuration
- **Build System**: TypeScript compilation with watch mode
- **Testing Files**: Sample schemas including validation test cases
- **Extension Host**: Proper VS Code extension development workflow

### 📋 Supported Schema Elements

#### Settings Types
- `text`, `textarea` - Text inputs
- `number`, `range` - Numeric inputs
- `checkbox` - Boolean toggles
- `select`, `radio` - Choice inputs
- `color` - Color picker
- `font_picker` - Font selection
- `collection`, `product`, `blog`, `page`, `article` - Resource pickers
- `link_list` - Navigation menu picker
- `url` - URL input
- `richtext`, `html`, `liquid` - Content editors
- `image_picker`, `video`, `video_url` - Media inputs
- `header`, `paragraph` - UI elements

#### Block Features
- Block type and name display
- Nested block settings
- Block limits and constraints
- Setting counts and summaries

#### Preset Features
- Preset name and configuration
- Settings and blocks counts
- Reference validation

#### Validation Rules
- Required field validation
- Duplicate ID detection
- Setting type validation
- Range and option validation
- Block and preset reference checking
- Naming convention suggestions
- Performance warnings

### 🎯 What's Coming Next

#### Phase 2: Enhanced Visual Builder
- Drag-and-drop setting creation
- Visual form builder for all setting types
- Block designer with nested settings
- Template library for common patterns
- Advanced validation with inline fixes
- Schema diff and merge capabilities

#### Phase 3: Advanced Features
- Schema generator from existing sections
- Shopify CLI integration
- Team collaboration features
- Custom setting type definitions
- Documentation generation
- Schema migration tools

### 🐛 Known Issues
- None currently reported

### 🤝 Contributing
This is an open-source project. Contributions, bug reports, and feature requests are welcome!

---

## Future Releases

Stay tuned for updates as we continue to enhance the Shopify development experience! 