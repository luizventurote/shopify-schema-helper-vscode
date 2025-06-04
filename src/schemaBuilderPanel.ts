import * as vscode from 'vscode';
import { ShopifySchema } from './schemaParser';

export class SchemaBuilderPanel {
    public static currentPanel: SchemaBuilderPanel | undefined;
    public static readonly viewType = 'shopifySchemaBuilder';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, currentSchema?: ShopifySchema) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (SchemaBuilderPanel.currentPanel) {
            SchemaBuilderPanel.currentPanel._panel.reveal(column);
            if (currentSchema) {
                SchemaBuilderPanel.currentPanel.updateSchema(currentSchema);
            }
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            SchemaBuilderPanel.viewType,
            'Shopify Schema Builder',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        SchemaBuilderPanel.currentPanel = new SchemaBuilderPanel(panel, extensionUri, currentSchema);
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        SchemaBuilderPanel.currentPanel = new SchemaBuilderPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, initialSchema?: ShopifySchema) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update(initialSchema);

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                    case 'schemaUpdated':
                        this.handleSchemaUpdate(message.schema);
                        return;
                    case 'exportSchema':
                        this.exportSchema(message.schema);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public updateSchema(schema: ShopifySchema) {
        this._panel.webview.postMessage({
            command: 'updateSchema',
            schema: schema
        });
    }

    private handleSchemaUpdate(schema: ShopifySchema) {
        // Handle schema updates from the webview
        // This could update the active liquid file
        vscode.window.showInformationMessage('Schema updated in builder!');
    }

    private async exportSchema(schema: ShopifySchema) {
        const schemaJson = JSON.stringify(schema, null, 2);
        const document = await vscode.workspace.openTextDocument({
            content: `{% schema %}\n${schemaJson}\n{% endschema %}`,
            language: 'liquid'
        });
        await vscode.window.showTextDocument(document);
    }

    public dispose() {
        SchemaBuilderPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update(initialSchema?: ShopifySchema) {
        const webview = this._panel.webview;
        this._panel.title = 'Shopify Schema Builder';
        this._panel.webview.html = this._getHtmlForWebview(webview, initialSchema);
    }

    private _getHtmlForWebview(webview: vscode.Webview, initialSchema?: ShopifySchema) {
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        const initialSchemaJson = initialSchema ? JSON.stringify(initialSchema, null, 2) : JSON.stringify({
            name: "New Section",
            settings: [],
            blocks: [],
            presets: []
        }, null, 2);

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
            <title>Shopify Schema Builder</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    line-height: 1.6;
                }
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .header {
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .section {
                    background-color: var(--vscode-panel-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                }
                .section h3 {
                    margin-top: 0;
                    color: var(--vscode-textLink-foreground);
                }
                .form-group {
                    margin-bottom: 15px;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: bold;
                }
                .form-control {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border-radius: 4px;
                    font-family: inherit;
                    font-size: inherit;
                }
                .btn {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-right: 10px;
                    font-family: inherit;
                }
                .btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .btn-secondary {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                .btn-secondary:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                .preview {
                    background-color: var(--vscode-textCodeBlock-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    padding: 15px;
                    font-family: var(--vscode-editor-font-family);
                    font-size: var(--vscode-editor-font-size);
                    white-space: pre-wrap;
                    overflow-x: auto;
                    max-height: 400px;
                    overflow-y: auto;
                }
                .tabs {
                    border-bottom: 1px solid var(--vscode-panel-border);
                    margin-bottom: 20px;
                }
                .tab {
                    display: inline-block;
                    padding: 10px 20px;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                }
                .tab.active {
                    border-bottom-color: var(--vscode-textLink-foreground);
                    color: var(--vscode-textLink-foreground);
                }
                .tab-content {
                    display: none;
                }
                .tab-content.active {
                    display: block;
                }
                .coming-soon {
                    text-align: center;
                    padding: 40px;
                    color: var(--vscode-descriptionForeground);
                }
                .feature-list {
                    list-style: none;
                    padding: 0;
                }
                .feature-list li {
                    padding: 8px 0;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                .feature-list li:last-child {
                    border-bottom: none;
                }
                .feature-list li::before {
                    content: "⚡ ";
                    color: var(--vscode-textLink-foreground);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🛠️ Shopify Schema Builder</h1>
                    <p>Visual interface for creating and editing Shopify section schemas</p>
                </div>

                <div class="tabs">
                    <div class="tab active" onclick="switchTab('basic')">Basic Info</div>
                    <div class="tab" onclick="switchTab('settings')">Settings</div>
                    <div class="tab" onclick="switchTab('blocks')">Blocks</div>
                    <div class="tab" onclick="switchTab('preview')">Preview</div>
                </div>

                <div id="basic" class="tab-content active">
                    <div class="section">
                        <h3>Section Information</h3>
                        <div class="form-group">
                            <label for="sectionName">Section Name</label>
                            <input type="text" id="sectionName" class="form-control" placeholder="Enter section name" value="New Section">
                        </div>
                        <div class="form-group">
                            <label for="sectionTag">Tag</label>
                            <input type="text" id="sectionTag" class="form-control" placeholder="section" value="section">
                        </div>
                        <div class="form-group">
                            <label for="sectionClass">CSS Class</label>
                            <input type="text" id="sectionClass" class="form-control" placeholder="Optional CSS class">
                        </div>
                    </div>
                </div>

                <div id="settings" class="tab-content">
                    <div class="coming-soon">
                        <h3>Settings Builder</h3>
                        <p>🚧 Coming in Phase 2!</p>
                        <ul class="feature-list">
                            <li>Drag-and-drop setting creation</li>
                            <li>Visual form builder</li>
                            <li>Setting type templates</li>
                            <li>Live validation</li>
                        </ul>
                    </div>
                </div>

                <div id="blocks" class="tab-content">
                    <div class="coming-soon">
                        <h3>Blocks Builder</h3>
                        <p>🚧 Coming in Phase 2!</p>
                        <ul class="feature-list">
                            <li>Visual block designer</li>
                            <li>Block setting configuration</li>
                            <li>Block limits and constraints</li>
                            <li>Preview with sample content</li>
                        </ul>
                    </div>
                </div>

                <div id="preview" class="tab-content">
                    <div class="section">
                        <h3>Schema Preview</h3>
                        <div style="margin-bottom: 15px;">
                            <button class="btn" onclick="updatePreview()">Update Preview</button>
                            <button class="btn btn-secondary" onclick="exportSchema()">Export Schema</button>
                        </div>
                        <div id="schemaPreview" class="preview">${initialSchemaJson}</div>
                    </div>
                </div>
            </div>

            <script nonce="${nonce}">
                const vscode = acquireVsCodeApi();
                let currentSchema = ${initialSchemaJson};

                function switchTab(tabName) {
                    // Hide all tab contents
                    document.querySelectorAll('.tab-content').forEach(content => {
                        content.classList.remove('active');
                    });
                    
                    // Remove active class from all tabs
                    document.querySelectorAll('.tab').forEach(tab => {
                        tab.classList.remove('active');
                    });
                    
                    // Show selected tab content
                    document.getElementById(tabName).classList.add('active');
                    
                    // Add active class to selected tab
                    event.target.classList.add('active');
                }

                function updatePreview() {
                    const schema = {
                        name: document.getElementById('sectionName').value || 'New Section',
                        tag: document.getElementById('sectionTag').value || 'section',
                        class: document.getElementById('sectionClass').value || undefined,
                        settings: currentSchema.settings || [],
                        blocks: currentSchema.blocks || [],
                        presets: currentSchema.presets || []
                    };

                    // Remove undefined values
                    Object.keys(schema).forEach(key => {
                        if (schema[key] === undefined || schema[key] === '') {
                            delete schema[key];
                        }
                    });

                    currentSchema = schema;
                    document.getElementById('schemaPreview').textContent = JSON.stringify(schema, null, 2);
                    
                    vscode.postMessage({
                        command: 'schemaUpdated',
                        schema: schema
                    });
                }

                function exportSchema() {
                    updatePreview();
                    vscode.postMessage({
                        command: 'exportSchema',
                        schema: currentSchema
                    });
                }

                // Initialize
                updatePreview();

                // Listen for messages from the extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'updateSchema':
                            currentSchema = message.schema;
                            document.getElementById('sectionName').value = currentSchema.name || '';
                            document.getElementById('sectionTag').value = currentSchema.tag || 'section';
                            document.getElementById('sectionClass').value = currentSchema.class || '';
                            updatePreview();
                            break;
                    }
                });
            </script>
        </body>
        </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
} 