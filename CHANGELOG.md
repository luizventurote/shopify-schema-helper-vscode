# Changelog

## [0.1.0] - 2024-01-15

### ✨ Initial Release

#### 🔍 **Real-time Schema Visualization**
- Tree view of your schema structure with collapsible sections
- Instant parsing of Shopify section and block schemas  
- Visual representation of settings, blocks, and presets
- Support for both section schemas (`/sections`) and theme block schemas (`/blocks`)
- Automatic file type detection and appropriate icon display

#### ✅ **Advanced Schema Validation**
- Real-time validation with detailed error messages and warnings
- Smart validation for `@app` and `@theme` dynamic blocks
- Comprehensive checks for Shopify schema best practices
- Type-specific validation (range checks, required options, etc.)
- Special handling for `header` and `paragraph` setting types
- Intelligent preset block validation with dynamic block support

#### 🎯 **Click-to-Navigate**
- Click any tree item to jump to the corresponding source line
- Surgical precision error navigation with character-level accuracy
- Smart line mapping for all schema elements including validation errors
- Automatic scrolling and highlighting of target lines

#### 🛠️ **Developer Experience**
- Seamless VS Code integration with native tree view
- Real-time updates as you edit files (debounced for performance)
- Command palette integration for all features
- Context menu options for `.liquid` files
- Export schema as clean JSON functionality

#### 📋 **Comprehensive Schema Support**
- **All Setting Types**: text, textarea, number, range, checkbox, select, radio, color, font_picker, collection, product, blog, page, article, link_list, url, richtext, html, liquid, image_picker, video, video_url, header, paragraph
- **Advanced Features**: blocks, presets, limits, conditional visibility (`visible_if`)
- **Modern Shopify Features**: `@app` and `@theme` dynamic blocks
- **Best Practice Validation**: naming conventions, duplicate detection, performance warnings

### 🎨 **UI/UX Highlights**
- Beautiful tree view with semantic icons for different element types
- Clear visual distinction between sections and theme blocks
- Expandable/collapsible sections for better organization
- Validation status indicators with color coding
- Professional integration with VS Code themes

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