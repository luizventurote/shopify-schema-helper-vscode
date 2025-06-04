# Getting Started with Shopify Schema Helper

## 🚀 Quick Start

### 1. Development Setup
```bash
# Clone and setup
git clone https://github.com/yourusername/shopify-schema-helper.git
cd shopify-schema-helper
npm install
npm run compile
```

### 2. Running the Extension
1. Open this project in VS Code
2. Press `F5` to launch a new Extension Development Host window
3. In the new window, open a `.liquid` file with a schema (or use the example in `examples/sample-section.liquid`)
4. You'll see the "Shopify Schema" panel appear in the Explorer sidebar

### 3. Testing with Sample File
1. Open `examples/sample-section.liquid`
2. Check the "Shopify Schema" panel in the sidebar
3. Expand different sections to see the schema visualization

## 📋 Current Features (Phase 1)

### ✅ What Works Now
- **Schema Detection**: Automatically finds `{% schema %}` blocks in liquid files
- **Tree Visualization**: Displays schema structure in a collapsible tree
- **Setting Types**: Shows appropriate icons for different Shopify setting types
- **Block Support**: Displays blocks and their settings
- **Preset Information**: Shows configured presets
- **Constraints**: Displays limits and constraints (max_blocks, min_blocks, etc.)
- **Real-time Updates**: Updates as you edit the liquid file

### 🔍 Schema Elements Displayed
- Section name and basic info
- Settings with types, IDs, and default values
- Blocks with their settings
- Presets with configuration counts
- Limits and constraints

### 🎨 Visual Features
- Contextual icons for each setting type
- Expandable/collapsible tree structure
- Detailed tooltips with information
- Clean, organized display

## 🛠️ Development Workflow

### Building
- `npm run compile` - Compile TypeScript
- `npm run watch` - Watch for changes and recompile automatically

### Debugging
1. Set breakpoints in your TypeScript code
2. Press `F5` to start debugging
3. The extension will launch in a new VS Code window
4. Debug output appears in the original VS Code Debug Console

### Key Files
- `src/extension.ts` - Main extension entry point
- `src/schemaParser.ts` - Schema parsing logic and interfaces
- `src/schemaTreeProvider.ts` - Tree view provider for sidebar

## 📝 Example Usage

### Basic Section Schema
```liquid
{% schema %}
{
  "name": "My Section",
  "settings": [
    {
      "type": "text",
      "id": "title",
      "label": "Title",
      "default": "Hello World"
    }
  ]
}
{% endschema %}
```

### Complex Section with Blocks
```liquid
{% schema %}
{
  "name": "Feature Section",
  "settings": [
    {
      "type": "range",
      "id": "columns",
      "label": "Columns",
      "min": 1,
      "max": 4,
      "default": 3
    }
  ],
  "blocks": [
    {
      "type": "feature",
      "name": "Feature",
      "settings": [
        {
          "type": "image_picker",
          "id": "image",
          "label": "Image"
        },
        {
          "type": "text",
          "id": "title",
          "label": "Title"
        }
      ]
    }
  ],
  "max_blocks": 6
}
{% endschema %}
```

## 🔮 Roadmap

### Phase 2: Visual Schema Builder (Planned)
- Drag-and-drop interface for building schemas
- Visual form for adding settings and blocks
- Live preview of generated JSON
- Schema templates and presets
- Validation and error checking

### Phase 3: Advanced Features (Future)
- Schema export/import
- Integration with Shopify CLI
- Documentation generation
- Custom setting types
- Team collaboration features

## 🐛 Troubleshooting

### Extension Not Loading
- Make sure you compiled the TypeScript: `npm run compile`
- Check the Debug Console for error messages
- Restart the Extension Development Host

### Schema Not Detected
- Ensure your liquid file has a valid `{% schema %}` block
- Check that the JSON inside the schema block is valid
- Look for syntax errors in the schema JSON

### Tree View Not Updating
- Use the refresh button in the Shopify Schema panel
- Check if the file has been saved
- Restart the extension if needed

## 🤝 Contributing

### Adding New Features
1. Create a new branch for your feature
2. Make your changes in the `src/` directory
3. Test thoroughly in the Extension Development Host
4. Submit a pull request

### Reporting Issues
- Use the GitHub issue tracker
- Include sample liquid files that demonstrate the problem
- Provide VS Code version and extension logs

### Suggesting Features
- Open a GitHub issue with the "enhancement" label
- Describe the use case and expected behavior
- Include mockups or examples if helpful

---

## 🎯 Next Steps

1. **Try it out**: Open the sample file and explore the schema visualization
2. **Test with your files**: Use your own Shopify liquid files
3. **Provide feedback**: Let us know what works and what could be improved
4. **Stay tuned**: Phase 2 with the visual builder is coming soon!

Happy coding! 🎉 