# Changelog

All notable changes to the Shopify Schema Helper extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2024-12-XX

### 🎉 Major Feature Release

### Added
- **Complete Shopify Setting Type Support** - Added support for all official Shopify setting types:
  - `metaobject` - Select metaobject entries with required `metaobject_type` property
  - `collection_list` - Multi-select collections with configurable limit (1-50)
  - `product_list` - Multi-select products with configurable limit (1-50)
  - `metaobject_list` - Multi-select metaobject entries
  - `text_alignment` - Visual alignment selector (left, center, right)
  - `color_background` - Advanced color/gradient picker
  - `color_scheme`, `color_scheme_group` - Theme color scheme selectors
  - `inline_richtext` - Inline rich text formatting
  - Full support for all basic and specialized input types from Shopify documentation

- **Enhanced Type-Specific Validation**:
  - `metaobject` settings require `metaobject_type` property validation
  - `collection_list`/`product_list` validate limit ranges (1-50) according to Shopify limits
  - `text_alignment` validates alignment values (left, center, right only)
  - `video_url` validates accepted providers (youtube, vimeo only)
  - `range` settings require both min/max properties and validate step values
  - Comprehensive error messages with specific suggestions for each setting type

- **Advanced Setting Details Display**:
  - Type-specific attributes shown in tree view (metaobject_type, limit, min/max, step, unit, accept)
  - Enhanced setting descriptions with inline attribute preview
  - Expandable options display for select/radio settings
  - Smart placeholder and default value presentation

- **Flexible Interface Options**:
  - Extension now has its own dedicated icon in the VS Code sidebar
  - Also available in the Explorer panel for traditional workflow
  - Users can choose their preferred interface location
  - Both views share the same functionality and sync automatically

### Fixed
- **Accurate Line Navigation** - Fixed critical off-by-one error in JSON issue line number reporting
  - Line numbers now precisely match the actual issue location
  - Clicking JSON issues navigates to the exact problematic line
  - Consistent line number calculation across all navigation features
- **Reduced False Positive Warnings** - Improved unescaped quote detection to avoid flagging valid Liquid template syntax
  - No longer flags valid Liquid template strings like `{{ block.settings.field }}`
  - More precise detection of actual JSON syntax issues

### Changed
- **Added dual interface placement** - Extension now available in both dedicated sidebar AND Explorer panel
- Updated validation engine to recognize all new setting types (no more "Unknown setting type" errors)
- Enhanced setting type icon mapping for better visual distinction
- Improved error messages and suggestions for better developer experience

## [0.1.7] - 2024-12-XX

### Added
- **Robust JSON Parsing** - Revolutionary error handling that transforms the extension from brittle to resilient:
  - Auto-fix for common JSON syntax errors (trailing commas, missing commas)
  - Graceful error recovery that shows warnings instead of complete failures
  - Detailed issue reporting with line numbers and fix suggestions
  - Smart recovery attempts to parse schema even with syntax errors
  - Built-in "Common JSON Fixes" guide with practical examples

- **JSON Issues Section** in tree view showing:
  - Auto-fixed issues with ✅ indicators
  - Manual-fix-needed issues with ⚠️ warnings
  - Click-to-navigate to problematic lines
  - Specific suggestions for each issue type

### Changed
- Enhanced error handling philosophy: Show warnings, don't break the experience
- Improved developer productivity by allowing schema visualization even with minor syntax issues

## [0.1.6] - 2024-12-XX

### Added
- **Shopify Translation Support**:
  - Automatic translation loading from `locales/en.default.schema.json`
  - Real-time updates when locales file changes
  - Smart fallbacks for missing translations
  - Support for `t:` translation keys
  - Live translation of setting labels, block names, section names, and option values

### Fixed
- Translation key resolution and fallback handling
- Locales file parsing and error handling

## [0.1.5] - 2024-12-XX

### Added
- Enhanced validation system with comprehensive schema checks
- Real-time validation with detailed error messages
- Click-to-navigate validation errors
- Support for @app and @theme blocks
- Improved block validation and duplicate detection

## [0.1.4] - 2024-12-XX

### Added
- Section and theme block distinction
- Enhanced tree view with better categorization
- File type detection and display
- Improved preset validation

## [0.1.3] - 2024-12-XX

### Added
- Advanced schema validation engine
- Setting type validation
- Block structure validation
- Preset configuration validation

## [0.1.2] - 2024-12-XX

### Added
- Real-time schema visualization
- Tree view data provider
- Setting, block, and preset display
- Basic click-to-navigate functionality

## [0.1.1] - 2024-12-XX

### Added
- Enhanced schema parsing
- Basic validation
- Tree view improvements

## [0.1.0] - 2024-12-XX

### Added
- Initial release
- Basic Shopify schema parsing
- Tree view visualization
- Core extension structure

### 🔧 **Improvements**
- **Enhanced Block Fallback**: When a block doesn't have a name or translation, now displays the block type (e.g., "image", "text", "video") instead of generic "Unnamed Block"
- **Better Developer Experience**: More descriptive labels for unnamed blocks align with Shopify's block type conventions

## [0.1.5] - 2024-01-17

### 🛡️ **Bug Fixes**
- **Fixed Critical Error**: Resolved "Cannot read properties of undefined (reading 'startsWith')" error
- **Added Null Safety**: Enhanced all translation methods with proper null/undefined checks
- **Robust Error Handling**: Extension now gracefully handles malformed schemas with missing name properties
- **Smart Fallbacks**: Added descriptive fallback names for blocks, presets, and options when data is incomplete

## [0.1.4] - 2024-01-16

### 🌐 **Translation Support - Fallback System**
- **Smart Fallbacks**: When locales file doesn't exist or translations are missing, now shows original schema values instead of broken keys
- **Improved Robustness**: Extension works seamlessly with themes that don't have complete translation files
- **Enhanced UX**: Better experience during incremental theme development
- **Documentation**: Updated README with fallback behavior details

## [0.1.3] - 2024-01-16

### 🌐 **Major Translation System Overhaul**
- **Locales File Integration**: Complete rewrite to read from `locales/en.default.schema.json` instead of hardcoded translations
- **Real-time Translation Updates**: File system watcher monitors locales file changes and reloads automatically
- **Smart Key Parsing**: Converts `t:sections.collage.name` format to readable translations
- **Removed Language Selector**: Simplified to English-only from locales file (removed 11-language hardcoded system)
- **Comprehensive Translation**: Translates section names, setting labels, info text, header content, block names, option labels, and preset names
- **Seamless Shopify Integration**: Perfect integration with Shopify theme development workflow

## [0.1.2] - 2024-01-15

### 🌎 **Internationalization Enhancement**
- **Brazilian Portuguese Added**: Added pt-BR support with Brazil-specific terminology
- **Language Distinction**: Updated language picker to distinguish "Português (Portugal)" and "Português (Brasil)"
- **11 Total Languages**: Now supporting English, Spanish, French, German, Portuguese, Italian, Japanese, Korean, Chinese Simplified/Traditional, and Brazilian Portuguese

## [0.1.1] - 2024-01-15

### 🎨 **Branding & Visual Enhancements**
- **Extension Icon**: Added shopify-schema-helper-logo.png as VS Code extension icon
- **Demo Visualization**: Added demo.gif to README with proper sizing controls
- **Marketplace Ready**: Successfully published to VS Code Marketplace with branding

### 🌐 **Initial Translation Support**
- **10-Language Support**: Added comprehensive internationalization with English, Spanish, French, German, Portuguese, Italian, Japanese, Korean, Chinese Simplified/Traditional
- **Translation Manager**: Implemented with hardcoded translations for common Shopify schema elements
- **Language Switching**: Globe icon in toolbar and Command Palette access for language selection
- **Persistent Settings**: Language preferences stored in VS Code global state

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