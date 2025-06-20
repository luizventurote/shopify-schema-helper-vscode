import * as vscode from 'vscode';
import { SchemaTreeDataProvider } from './schemaTreeProvider';
// import { SchemaBuilderPanel } from './schemaBuilderPanel'; // Disabled for now
import { SchemaParser } from './schemaParser';
import { TranslationManager } from './translationManager';

// Diagnostic collection for JSON parsing errors
let schemaDiagnostics: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
    console.log('Shopify Schema Helper is now active!');



    // Create diagnostic collection
    schemaDiagnostics = vscode.languages.createDiagnosticCollection('shopifySchema');
    context.subscriptions.push(schemaDiagnostics);

    // Create schema parser and tree data provider
    const schemaParser = new SchemaParser();
    const translationManager = new TranslationManager(context);
    const schemaTreeProvider = new SchemaTreeDataProvider(schemaParser, translationManager);
    
    // Register tree data providers for both views
    const treeView = vscode.window.createTreeView('shopifySchemaView', {
        treeDataProvider: schemaTreeProvider,
        showCollapseAll: true
    });

    const treeViewExplorer = vscode.window.createTreeView('shopifySchemaViewExplorer', {
        treeDataProvider: schemaTreeProvider,
        showCollapseAll: true
    });

    // Function to validate and show diagnostics for schema
    function validateSchemaAndShowDiagnostics(document: vscode.TextDocument) {
        if (!document.fileName.endsWith('.liquid')) {
            return;
        }

        const diagnostics: vscode.Diagnostic[] = [];
        
        try {
            // Try to parse the schema
            const schema = schemaParser.parseDocument(document);
            
            // If parsing succeeded, clear any existing diagnostics
            if (schema) {
                schemaDiagnostics.set(document.uri, []);
            }
        } catch (error) {
            // Schema parsing failed, create diagnostic
            const jsonDiagnostic = createPreciseJsonDiagnostic(document, error);
            if (jsonDiagnostic) {
                diagnostics.push(jsonDiagnostic);
            }
        }
        
        // Also check for common JSON syntax issues using the parser's validator
        const text = document.getText();
        const schemaMatch = text.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/i);
        
        if (schemaMatch) {
            const schemaContent = schemaMatch[1].trim();
            const syntaxCheck = schemaParser.validateJsonSyntax(schemaContent);
            
            if (!syntaxCheck.isValid) {
                const schemaStartIndex = text.indexOf(schemaMatch[0]) + schemaMatch[0].indexOf(schemaMatch[1]);
                
                syntaxCheck.issues.forEach(issue => {
                    const lineMatch = issue.match(/Line (\d+)/);
                    if (lineMatch) {
                        const lineNumber = parseInt(lineMatch[1]) - 1;
                        const schemaLines = schemaContent.split('\n');
                        
                        if (lineNumber < schemaLines.length) {
                            const absolutePosition = document.positionAt(schemaStartIndex);
                            const errorPosition = new vscode.Position(absolutePosition.line + lineNumber, 0);
                            const errorRange = new vscode.Range(
                                errorPosition,
                                new vscode.Position(errorPosition.line, schemaLines[lineNumber].length)
                            );
                            
                            const diagnostic = new vscode.Diagnostic(
                                errorRange,
                                issue,
                                vscode.DiagnosticSeverity.Error
                            );
                            diagnostic.source = 'Shopify Schema';
                            diagnostics.push(diagnostic);
                        }
                    }
                });
            }
        }
        
        schemaDiagnostics.set(document.uri, diagnostics);
    }

    function createPreciseJsonDiagnostic(document: vscode.TextDocument, error: any): vscode.Diagnostic | null {
        const text = document.getText();
        const schemaMatch = text.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/i);
        
        if (!schemaMatch) {
            return null;
        }
        
        const schemaContent = schemaMatch[1].trim();
        const errorMessage = error instanceof Error ? error.message : 'Invalid JSON';
        
        // Calculate schema start position in the document
        const schemaStartIndex = text.indexOf(schemaMatch[0]) + schemaMatch[0].indexOf(schemaMatch[1]);
        const schemaStartPosition = document.positionAt(schemaStartIndex);
        
        // Find the exact error location using a more sophisticated approach
        const errorLocation = findPreciseErrorLocation(schemaContent, errorMessage);
        
        if (errorLocation) {
            // Convert schema-relative position to document-absolute position
            const absoluteLine = schemaStartPosition.line + errorLocation.line;
            const absoluteChar = errorLocation.line === 0 ? 
                schemaStartPosition.character + errorLocation.character : 
                errorLocation.character;
            
            const startPos = new vscode.Position(absoluteLine, absoluteChar);
            const endPos = new vscode.Position(absoluteLine, absoluteChar + errorLocation.length);
            const errorRange = new vscode.Range(startPos, endPos);
            
            const diagnostic = new vscode.Diagnostic(
                errorRange,
                errorLocation.friendlyMessage,
                vscode.DiagnosticSeverity.Error
            );
            diagnostic.source = 'Shopify Schema';
            diagnostic.code = 'json-syntax-error';
            
            return diagnostic;
        }
        
        return null;
    }

    function findPreciseErrorLocation(content: string, errorMessage: string): {
        line: number;
        character: number;
        length: number;
        friendlyMessage: string;
    } | null {
        const lines = content.split('\n');
        
        // Look for trailing comma patterns
        if (errorMessage.includes('Unexpected token \']\'') || errorMessage.includes('Unexpected token \'}\'')) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmed = line.trim();
                
                // Check for trailing comma before closing bracket/brace
                if (trimmed.endsWith(',]') || trimmed.endsWith(',}')) {
                    const commaIndex = line.lastIndexOf(',');
                    if (commaIndex !== -1) {
                        return {
                            line: i,
                            character: commaIndex,
                            length: 1,
                            friendlyMessage: `Trailing comma before closing ${trimmed.endsWith(',]') ? 'bracket' : 'brace'}. Remove this comma.`
                        };
                    }
                }
                
                // Check for comma followed by whitespace and then closing bracket/brace
                const commaBeforeClosingMatch = line.match(/,(\s*)[}\]]/);
                if (commaBeforeClosingMatch) {
                    const commaIndex = line.indexOf(commaBeforeClosingMatch[0]);
                    return {
                        line: i,
                        character: commaIndex,
                        length: 1,
                        friendlyMessage: `Trailing comma before closing ${commaBeforeClosingMatch[0].includes(']') ? 'bracket' : 'brace'}. Remove this comma.`
                    };
                }
            }
        }
        
        // Look for other common patterns
        if (errorMessage.includes('Unexpected token \',\'')) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Look for double commas
                const doubleCommaIndex = line.indexOf(',,');
                if (doubleCommaIndex !== -1) {
                    return {
                        line: i,
                        character: doubleCommaIndex + 1,
                        length: 1,
                        friendlyMessage: 'Extra comma found. Remove this duplicate comma.'
                    };
                }
            }
        }
        
        // If we can't find a specific pattern, return null to use fallback
        return null;
    }



    // Register commands
    const refreshCommand = vscode.commands.registerCommand('shopifySchemaHelper.refreshTree', () => {
        schemaTreeProvider.refresh();
        
        // Re-validate current document
        if (vscode.window.activeTextEditor) {
            validateSchemaAndShowDiagnostics(vscode.window.activeTextEditor.document);
        }
        
        vscode.window.showInformationMessage('Schema refreshed!');
    });

    // Schema builder command (disabled for now)
    /*
    const openSchemaBuilderCommand = vscode.commands.registerCommand('shopifySchemaHelper.openSchemaBuilder', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            if (document.languageId === 'liquid') {
                const currentSchema = schemaParser.parseDocument(document);
                // SchemaBuilderPanel.createOrShow(context.extensionUri, currentSchema || undefined);
            }
        } else {
            // SchemaBuilderPanel.createOrShow(context.extensionUri, currentSchema || undefined);
        }
    });
    */

    // Command to validate current schema
    const validateSchemaCommand = vscode.commands.registerCommand('shopifySchemaHelper.validateSchema', () => {
        const currentEditor = vscode.window.activeTextEditor;
        
        if (!currentEditor || !currentEditor.document.fileName.endsWith('.liquid')) {
            vscode.window.showWarningMessage('Please open a .liquid file to validate schema');
            return;
        }

        const schema = schemaParser.parseDocument(currentEditor.document);
        if (!schema) {
            vscode.window.showWarningMessage('No schema found in the current file');
            return;
        }

        schemaTreeProvider.refresh(); // This will trigger validation
        vscode.window.showInformationMessage('Schema validation completed. Check the Shopify Schema panel for details.');
    });

    // Command to export schema as JSON
    const exportSchemaCommand = vscode.commands.registerCommand('shopifySchemaHelper.exportSchema', async () => {
        const currentEditor = vscode.window.activeTextEditor;
        
        if (!currentEditor || !currentEditor.document.fileName.endsWith('.liquid')) {
            vscode.window.showWarningMessage('Please open a .liquid file to export schema');
            return;
        }

        const schema = schemaParser.parseDocument(currentEditor.document);
        if (!schema) {
            vscode.window.showWarningMessage('No schema found in the current file');
            return;
        }

        const schemaJson = JSON.stringify(schema, null, 2);
        const document = await vscode.workspace.openTextDocument({
            content: schemaJson,
            language: 'json'
        });
        await vscode.window.showTextDocument(document);
    });

    // Command to navigate to a specific line
    const navigateToLineCommand = vscode.commands.registerCommand('shopifySchemaHelper.navigateToLine', (lineNumber: number) => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return;
        }

        const position = new vscode.Position(lineNumber - 1, 0); // Convert to 0-based
        activeEditor.selection = new vscode.Selection(position, position);
        activeEditor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        
        // Focus the editor
        vscode.window.showTextDocument(activeEditor.document);
    });

    // Listen for active editor changes
    const activeEditorListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editor.document.fileName.endsWith('.liquid')) {
            schemaTreeProvider.updateSchema(editor.document);
            validateSchemaAndShowDiagnostics(editor.document);
        }
    });

    // Listen for document changes (with debounce)
    let changeTimeout: NodeJS.Timeout;
    const documentChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.fileName.endsWith('.liquid')) {
            // Debounce the updates to avoid too many rapid updates
            clearTimeout(changeTimeout);
            changeTimeout = setTimeout(() => {
                schemaTreeProvider.updateSchema(event.document);
                validateSchemaAndShowDiagnostics(event.document);
            }, 500);
        }
    });

    // Listen for document saves
    const documentSaveListener = vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.fileName.endsWith('.liquid')) {
            schemaTreeProvider.updateSchema(document);
            validateSchemaAndShowDiagnostics(document);
        }
    });

    // Monitor changes to the locales file
    const localesPattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders?.[0] || '', 'locales/en.default.schema.json');
    const localesWatcher = vscode.workspace.createFileSystemWatcher(localesPattern);
    
    localesWatcher.onDidChange(async () => {
        console.log('Locales file changed, reloading translations...');
        await translationManager.reloadTranslations();
        schemaTreeProvider.refresh();
        vscode.window.showInformationMessage('Shopify translations reloaded from locales file.');
    });

    localesWatcher.onDidCreate(async () => {
        console.log('Locales file created, loading translations...');
        await translationManager.reloadTranslations();
        schemaTreeProvider.refresh();
        vscode.window.showInformationMessage('Shopify translations loaded from locales file.');
    });

    // Initialize with current active editor if it's a liquid file
    if (vscode.window.activeTextEditor?.document.fileName.endsWith('.liquid')) {
        schemaTreeProvider.updateSchema(vscode.window.activeTextEditor.document);
        validateSchemaAndShowDiagnostics(vscode.window.activeTextEditor.document);
    }

    // Register webview panel serializer (disabled for now)
    /*
    vscode.window.registerWebviewPanelSerializer(SchemaBuilderPanel.viewType, {
        async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
            SchemaBuilderPanel.revive(webviewPanel, context.extensionUri);
        }
    });
    */

    context.subscriptions.push(
        treeView,
        treeViewExplorer,
        refreshCommand,
        validateSchemaCommand,
        exportSchemaCommand,
        navigateToLineCommand,
        activeEditorListener,
        documentChangeListener,
        documentSaveListener,
        localesWatcher
    );

    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
    if (!hasShownWelcome) {
        vscode.window.showInformationMessage(
            'Welcome to Shopify Schema Helper! Open a .liquid file with a schema to get started.'
        );
        context.globalState.update('hasShownWelcome', true);
    }
}

export function deactivate() {
    console.log('Shopify Schema Helper has been deactivated.');
} 