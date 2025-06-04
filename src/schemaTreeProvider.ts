import * as vscode from 'vscode';
import { SchemaParser, ShopifySchema, Setting, Block, Preset, Option } from './schemaParser';
import { SchemaValidator, ValidationResult } from './schemaValidator';

export interface JsonParsingError {
    message: string;
    line: number | null | undefined;
    friendlyMessage: string;
    suggestion: string | null | undefined;
    context: string | null | undefined;
}

export class SchemaTreeDataProvider implements vscode.TreeDataProvider<SchemaTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SchemaTreeItem | undefined | null | void> = new vscode.EventEmitter<SchemaTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SchemaTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private currentSchema: ShopifySchema | null = null;
    private currentDocument: vscode.TextDocument | null = null;
    private validationResult: ValidationResult | null = null;
    private schemaValidator: SchemaValidator;
    private parsingError: JsonParsingError | null = null;
    private schemaLineMap: Map<string, number> = new Map(); // Track line numbers for schema elements

    constructor(private schemaParser: SchemaParser) {
        this.schemaValidator = new SchemaValidator();
    }

    refresh(): void {
        if (this.currentDocument) {
            this.updateSchema(this.currentDocument);
        }
        this._onDidChangeTreeData.fire();
    }

    updateSchema(document: vscode.TextDocument): void {
        this.currentDocument = document;
        this.parsingError = null;
        this.schemaLineMap.clear();
        
        try {
            this.currentSchema = this.schemaParser.parseDocument(document);
            
            // Build line map for navigation
            if (this.currentSchema) {
                this.buildSchemaLineMap(document);
                this.validationResult = this.schemaValidator.validateSchema(this.currentSchema);
            } else {
                this.validationResult = null;
            }
        } catch (error) {
            // Handle JSON parsing error
            this.currentSchema = null;
            this.validationResult = null;
            this.parsingError = this.analyzeJsonError(document, error);
        }
        
        this._onDidChangeTreeData.fire();
    }

    private buildSchemaLineMap(document: vscode.TextDocument): void {
        const text = document.getText();
        const schemaMatch = text.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/i);
        
        if (!schemaMatch) {
            return;
        }

        const schemaContent = schemaMatch[1].trim();
        const schemaStartIndex = text.indexOf(schemaMatch[0]) + schemaMatch[0].indexOf(schemaMatch[1]);
        const schemaStartPosition = document.positionAt(schemaStartIndex);
        const lines = schemaContent.split('\n');

        // Track current section context
        let currentSection = '';
        let settingIndex = 0;
        let blockIndex = 0;
        let presetIndex = 0;
        let inSettingsArray = false;
        let inBlocksArray = false;
        let inPresetsArray = false;
        let braceDepth = 0;

        // Track line numbers for different schema elements
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const absoluteLineNumber = schemaStartPosition.line + i + 1; // +1 for 1-based line numbers
            
            // Track brace depth to understand structure
            const openBraces = (line.match(/{/g) || []).length;
            const closeBraces = (line.match(/}/g) || []).length;
            braceDepth += openBraces - closeBraces;
            
            // Track main sections
            if (line.includes('"settings"')) {
                this.schemaLineMap.set('schema:settings', absoluteLineNumber);
                currentSection = 'settings';
                inSettingsArray = true;
                settingIndex = 0;
            } else if (line.includes('"blocks"')) {
                this.schemaLineMap.set('schema:blocks', absoluteLineNumber);
                currentSection = 'blocks';
                inBlocksArray = true;
                blockIndex = 0;
            } else if (line.includes('"presets"')) {
                this.schemaLineMap.set('schema:presets', absoluteLineNumber);
                currentSection = 'presets';
                inPresetsArray = true;
                presetIndex = 0;
            }
            
            // Check if we're exiting an array
            if (line.includes(']') && braceDepth === 1) {
                if (inSettingsArray && currentSection === 'settings') {
                    inSettingsArray = false;
                } else if (inBlocksArray && currentSection === 'blocks') {
                    inBlocksArray = false;
                } else if (inPresetsArray && currentSection === 'presets') {
                    inPresetsArray = false;
                }
            }
            
            // Track setting IDs and positions
            if (inSettingsArray && line.includes('"type"')) {
                // This is likely the start of a new setting
                this.schemaLineMap.set(`setting:index:${settingIndex}`, absoluteLineNumber);
                settingIndex++;
            }
            
            const settingIdMatch = line.match(/"id":\s*"([^"]+)"/);
            if (settingIdMatch && inSettingsArray) {
                this.schemaLineMap.set(`setting:${settingIdMatch[1]}`, absoluteLineNumber);
            }
            
            // Track block positions and names
            if (inBlocksArray && (line.includes('"type"') || line.includes('{'))) {
                // This might be the start of a new block
                if (line.includes('"type"')) {
                    this.schemaLineMap.set(`block:index:${blockIndex}`, absoluteLineNumber);
                    
                    // Extract block type for @app/@theme tracking
                    const blockTypeMatch = line.match(/"type":\s*"([^"]+)"/);
                    if (blockTypeMatch) {
                        const blockType = blockTypeMatch[1];
                        if (blockType === '@app' || blockType === '@theme') {
                            this.schemaLineMap.set(`block:${blockType}:${blockIndex}`, absoluteLineNumber);
                        }
                    }
                    blockIndex++;
                }
            }
            
            // Track block names
            const blockNameMatch = line.match(/"name":\s*"([^"]+)"/);
            if (blockNameMatch && inBlocksArray) {
                this.schemaLineMap.set(`block:${blockNameMatch[1]}`, absoluteLineNumber);
            }
            
            // Track preset positions and names
            if (inPresetsArray && line.includes('"name"')) {
                const presetNameMatch = line.match(/"name":\s*"([^"]+)"/);
                if (presetNameMatch) {
                    this.schemaLineMap.set(`preset:${presetNameMatch[1]}`, absoluteLineNumber);
                    this.schemaLineMap.set(`preset:index:${presetIndex}`, absoluteLineNumber);
                    presetIndex++;
                }
            }
            
            // Track section name (schema level)
            const sectionNameMatch = line.match(/"name":\s*"([^"]+)"/);
            if (sectionNameMatch && i < 5 && !inSettingsArray && !inBlocksArray && !inPresetsArray) { 
                // Likely the main section name if near the top and not in arrays
                this.schemaLineMap.set('section:name', absoluteLineNumber);
            }
            
            // Track limits
            if (line.includes('"min_blocks"') || line.includes('"max_blocks"') || line.includes('"limit"')) {
                this.schemaLineMap.set('schema:limits', absoluteLineNumber);
            }
        }
    }

    // Helper method to determine if we're in the presets section
    private isInPresetsSection(lines: string[], currentIndex: number): boolean {
        let presetsStart = -1;
        let presetsEnd = -1;
        let braceCount = 0;
        
        // Find the presets section boundaries
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('"presets"')) {
                presetsStart = i;
                break;
            }
        }
        
        if (presetsStart === -1) {
            return false;
        }
        
        // Find the end of the presets section by tracking braces
        for (let i = presetsStart; i < lines.length; i++) {
            const line = lines[i];
            braceCount += (line.match(/\[/g) || []).length;
            braceCount -= (line.match(/\]/g) || []).length;
            
            if (i > presetsStart && braceCount === 0) {
                presetsEnd = i;
                break;
            }
        }
        
        return currentIndex >= presetsStart && (presetsEnd === -1 || currentIndex <= presetsEnd);
    }

    private analyzeJsonError(document: vscode.TextDocument, error: any): JsonParsingError {
        const text = document.getText();
        const schemaMatch = text.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/i);
        
        if (!schemaMatch) {
            return {
                message: 'No schema block found',
                line: undefined,
                friendlyMessage: 'No schema block found',
                suggestion: 'Add a {% schema %} block to your liquid file',
                context: undefined
            };
        }

        const schemaContent = schemaMatch[1].trim();
        const errorMessage = error instanceof Error ? error.message : 'Invalid JSON';
        
        let line: number | null = null;
        let suggestion: string | null = null;
        let context: string | null = null;
        let friendlyMessage = errorMessage;
        
        // Extract position from error message
        const positionMatch = errorMessage.match(/at position (\d+)/);
        if (positionMatch) {
            const position = parseInt(positionMatch[1]);
            const beforeError = schemaContent.substring(0, position);
            const lines = beforeError.split('\n');
            line = lines.length;
            
            // Get context around the error
            const allLines = schemaContent.split('\n');
            const startLine = Math.max(0, line - 3);
            const endLine = Math.min(allLines.length - 1, line + 2);
            const contextLines = allLines.slice(startLine, endLine + 1);
            const contextWithNumbers = contextLines.map((l, i) => {
                const lineNum = startLine + i + 1;
                const marker = lineNum === line ? '>>>' : '   ';
                return `${marker} ${lineNum.toString().padStart(3, ' ')}: ${l}`;
            });
            context = contextWithNumbers.join('\n');
        }
        
        // Analyze common JSON errors and provide helpful messages
        if (errorMessage.includes('Unexpected token \']\'')) {
            friendlyMessage = 'Trailing comma before closing bracket';
            suggestion = 'Remove the comma before the closing bracket `]`. The last item in an array should not have a trailing comma.';
        } else if (errorMessage.includes('Unexpected token \'}\'')) {
            friendlyMessage = 'Trailing comma before closing brace';
            suggestion = 'Remove the comma before the closing brace `}`. The last property in an object should not have a trailing comma.';
        } else if (errorMessage.includes('Unexpected token \',\'')) {
            friendlyMessage = 'Extra comma found';
            suggestion = 'Remove the extra comma. Check for double commas or commas after closing brackets/braces.';
        } else if (errorMessage.includes('Unexpected string')) {
            friendlyMessage = 'Missing comma between items';
            suggestion = 'Add a comma between JSON items (objects, arrays, or properties).';
        } else if (errorMessage.includes('Unexpected token')) {
            const tokenMatch = errorMessage.match(/Unexpected token (.+?) in JSON/);
            if (tokenMatch) {
                const token = tokenMatch[1];
                friendlyMessage = `Unexpected character: ${token}`;
                suggestion = `Check for invalid characters or syntax around this location. Common issues include unescaped quotes or invalid characters.`;
            }
        } else if (errorMessage.includes('Unterminated string')) {
            friendlyMessage = 'Unterminated string';
            suggestion = 'Check for missing closing quotes on strings. All strings must be wrapped in double quotes.';
        } else if (errorMessage.includes('Expected property name')) {
            friendlyMessage = 'Invalid property name';
            suggestion = 'Object property names must be strings wrapped in double quotes.';
        }
        
        return {
            message: errorMessage,
            line,
            friendlyMessage,
            suggestion,
            context
        };
    }

    getTreeItem(element: SchemaTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SchemaTreeItem): Thenable<SchemaTreeItem[]> {
        // If there's a parsing error, show error information
        if (this.parsingError) {
            if (!element) {
                // Root level - show main error
                return Promise.resolve([
                    new SchemaTreeItem(
                        '❌ JSON Parsing Error',
                        this.parsingError.friendlyMessage,
                        vscode.TreeItemCollapsibleState.Expanded,
                        'json-error',
                        '$(error)',
                        undefined,
                        this.parsingError.line || undefined
                    )
                ]);
            } else if (element.contextValue === 'json-error') {
                // Show error details
                return Promise.resolve(this.getJsonErrorDetails());
            }
        }

        if (!this.currentSchema) {
            return Promise.resolve([
                new SchemaTreeItem(
                    'No Schema Found',
                    'No {% schema %} block found in this liquid file',
                    vscode.TreeItemCollapsibleState.None,
                    'warning',
                    '$(warning)',
                    undefined,
                    undefined
                )
            ]);
        }

        if (!element) {
            // Root level items
            return Promise.resolve(this.getRootItems());
        }

        // Child items based on element type
        return Promise.resolve(this.getChildItems(element));
    }

    private getJsonErrorDetails(): SchemaTreeItem[] {
        const error = this.parsingError!;
        const items: SchemaTreeItem[] = [];

        // Error location
        if (error.line) {
            items.push(new SchemaTreeItem(
                `📍 Line ${error.line}`,
                `Error occurs at line ${error.line}`,
                vscode.TreeItemCollapsibleState.None,
                'error-location',
                '$(location)',
                undefined,
                error.line
            ));
        }

        // Friendly error message
        items.push(new SchemaTreeItem(
            `🔍 ${error.friendlyMessage}`,
            error.message,
            vscode.TreeItemCollapsibleState.None,
            'error-message',
            '$(info)',
            undefined,
            undefined
        ));

        // Suggestion
        if (error.suggestion) {
            items.push(new SchemaTreeItem(
                '💡 Suggestion',
                error.suggestion,
                vscode.TreeItemCollapsibleState.Expanded,
                'error-suggestion',
                '$(lightbulb)',
                undefined,
                undefined
            ));
        }

        // Context
        if (error.context) {
            items.push(new SchemaTreeItem(
                '📝 Context',
                'Code context around the error',
                vscode.TreeItemCollapsibleState.Expanded,
                'error-context',
                '$(code)',
                undefined,
                undefined
            ));
        }

        // Common fixes
        items.push(new SchemaTreeItem(
            '🔧 Common JSON Fixes',
            'General tips for fixing JSON syntax errors',
            vscode.TreeItemCollapsibleState.Expanded,
            'common-fixes',
            '$(tools)',
            undefined,
            undefined
        ));

        return items;
    }

    private getRootItems(): SchemaTreeItem[] {
        const items: SchemaTreeItem[] = [];
        const schema = this.currentSchema!;
        const stats = this.schemaParser.getSchemaStats(schema);

        // Validation status
        if (this.validationResult) {
            const hasErrors = this.validationResult.errors.length > 0;
            const hasWarnings = this.validationResult.warnings.length > 0;
            
            if (hasErrors || hasWarnings) {
                const errorCount = this.validationResult.errors.length;
                const warningCount = this.validationResult.warnings.length;
                let statusText = '';
                
                if (hasErrors) {
                    statusText += `${errorCount} error${errorCount !== 1 ? 's' : ''}`;
                }
                if (hasWarnings) {
                    if (hasErrors) statusText += ', ';
                    statusText += `${warningCount} warning${warningCount !== 1 ? 's' : ''}`;
                }
                
                items.push(new SchemaTreeItem(
                    `Validation: ${statusText}`,
                    'Click to see validation details',
                    vscode.TreeItemCollapsibleState.Expanded,
                    'validation',
                    hasErrors ? '$(error)' : '$(warning)',
                    undefined,
                    undefined
                ));
            } else {
                items.push(new SchemaTreeItem(
                    'Validation: All good ✓',
                    'No validation errors or warnings',
                    vscode.TreeItemCollapsibleState.None,
                    'validation-success',
                    '$(check)',
                    undefined,
                    undefined
                ));
            }
        }

        // Schema name and basic info - this will contain settings, blocks, presets as children
        const sectionName = schema.name || 'Unnamed Section';
        const sectionDescription = this.getSectionDescription(schema, stats);
        const fileTypeIcon = schema._fileType === 'block' ? '$(symbol-module)' : '$(symbol-class)';
        
        items.push(new SchemaTreeItem(
            sectionName,
            sectionDescription,
            vscode.TreeItemCollapsibleState.Expanded,
            'section-info',
            fileTypeIcon,
            undefined,
            undefined
        ));

        return items;
    }

    private getSectionDescription(schema: ShopifySchema, stats: any): string {
        const parts = [];
        
        // Add file type as first item
        if (schema._fileType) {
            parts.push(`${schema._fileType === 'block' ? 'Theme Block' : 'Section'}`);
        }
        
        if (stats.settingsCount > 0) {
            parts.push(`${stats.settingsCount} settings`);
        }
        
        if (stats.blocksCount > 0) {
            parts.push(`${stats.blocksCount} blocks`);
        }
        
        if (stats.presetsCount > 0) {
            parts.push(`${stats.presetsCount} presets`);
        }
        
        if (schema.tag && schema.tag !== 'section') {
            parts.push(`tag: ${schema.tag}`);
        }
        
        return parts.length > 0 ? parts.join(' • ') : 'Schema';
    }

    private getChildItems(element: SchemaTreeItem): SchemaTreeItem[] {
        const schema = this.currentSchema!;

        switch (element.contextValue) {
            case 'validation':
                return this.getValidationItems();
            
            case 'section-info':
                return this.getSectionChildItems(schema);
            
            case 'settings':
                return this.getSettingsItems(schema.settings || []);
            
            case 'blocks':
                return this.getBlocksItems(schema.blocks || []);
            
            case 'presets':
                return this.getPresetsItems(schema.presets || []);
            
            case 'limits':
                return this.getLimitsItems(schema);
            
            case 'setting':
            case 'block-setting':
                // Show setting details
                const settingData = element.data as Setting;
                return this.getSettingDetails(settingData);
            
            case 'setting-options':
                // Show setting options
                const options = element.data as Option[];
                return this.getOptionItems(options);
            
            case 'block':
                // Show block settings
                const blockData = element.data as Block;
                return this.getSettingsItems(blockData.settings || [], 'block-setting');
            
            // Error detail handlers
            case 'error-suggestion':
                return this.getSuggestionDetails();
            
            case 'error-context':
                return this.getContextDetails();
            
            case 'common-fixes':
                return this.getCommonFixesItems();
            
            default:
                return [];
        }
    }

    private getSuggestionDetails(): SchemaTreeItem[] {
        const error = this.parsingError!;
        if (!error.suggestion) return [];

        const lines = error.suggestion.split('\n');
        return lines.map((line, index) => new SchemaTreeItem(
            line.trim(),
            line.trim(),
            vscode.TreeItemCollapsibleState.None,
            'suggestion-line',
            '$(arrow-right)',
            undefined,
            undefined
        ));
    }

    private getContextDetails(): SchemaTreeItem[] {
        const error = this.parsingError!;
        if (!error.context) return [];

        const lines = error.context.split('\n');
        return lines.map((line, index) => {
            const isErrorLine = line.startsWith('>>>');
            return new SchemaTreeItem(
                line,
                line,
                vscode.TreeItemCollapsibleState.None,
                'context-line',
                isErrorLine ? '$(arrow-right)' : '$(blank)',
                undefined,
                undefined
            );
        });
    }

    private getCommonFixesItems(): SchemaTreeItem[] {
        return [
            new SchemaTreeItem(
                'Remove trailing commas after the last item in arrays/objects',
                'JSON does not allow trailing commas after the last element',
                vscode.TreeItemCollapsibleState.None,
                'fix-tip',
                '$(check)',
                undefined,
                undefined
            ),
            new SchemaTreeItem(
                'Ensure all strings are wrapped in double quotes',
                'All JSON strings must use double quotes, not single quotes',
                vscode.TreeItemCollapsibleState.None,
                'fix-tip',
                '$(check)',
                undefined,
                undefined
            ),
            new SchemaTreeItem(
                'Check for missing commas between items',
                'All JSON items (objects, arrays, properties) need commas between them',
                vscode.TreeItemCollapsibleState.None,
                'fix-tip',
                '$(check)',
                undefined,
                undefined
            ),
            new SchemaTreeItem(
                'Verify all brackets and braces are properly closed',
                'Make sure every opening bracket [ or brace { has a corresponding closing bracket ] or brace }',
                vscode.TreeItemCollapsibleState.None,
                'fix-tip',
                '$(check)',
                undefined,
                undefined
            ),
            new SchemaTreeItem(
                'Use VS Code formatting (Shift+Alt+F) to check structure',
                'VS Code can help identify structural issues with JSON formatting',
                vscode.TreeItemCollapsibleState.None,
                'fix-tip',
                '$(check)',
                undefined,
                undefined
            )
        ];
    }

    private getSectionChildItems(schema: ShopifySchema): SchemaTreeItem[] {
        const items: SchemaTreeItem[] = [];
        const stats = this.schemaParser.getSchemaStats(schema);

        // File type information
        if (schema._fileType) {
            const fileTypeLabel = schema._fileType === 'block' ? 'Theme Block' : 'Section';
            const fileTypeDescription = schema._fileType === 'block' 
                ? 'Reusable block component stored in /blocks folder'
                : 'Section component stored in /sections folder';
            const fileTypeIcon = schema._fileType === 'block' ? '$(symbol-module)' : '$(file-text)';
            
            items.push(new SchemaTreeItem(
                `Type: ${fileTypeLabel}`,
                fileTypeDescription,
                vscode.TreeItemCollapsibleState.None,
                'file-type',
                fileTypeIcon,
                undefined,
                undefined
            ));
        }

        // Settings
        if (schema.settings && schema.settings.length > 0) {
            items.push(new SchemaTreeItem(
                `Settings (${stats.settingsCount})`,
                'Schema settings configuration',
                vscode.TreeItemCollapsibleState.Expanded,
                'settings',
                '$(settings-gear)',
                undefined,
                undefined
            ));
        }

        // Blocks (only for sections, theme blocks don't typically contain other blocks)
        if (schema.blocks && schema.blocks.length > 0) {
            const blocksDescription = schema._fileType === 'block' 
                ? 'Nested blocks within this theme block'
                : 'Available blocks for this section';
            
            items.push(new SchemaTreeItem(
                `Blocks (${stats.blocksCount})`,
                blocksDescription,
                vscode.TreeItemCollapsibleState.Expanded,
                'blocks',
                '$(symbol-array)',
                undefined,
                undefined
            ));
        }

        // Presets
        if (schema.presets && schema.presets.length > 0) {
            items.push(new SchemaTreeItem(
                `Presets (${stats.presetsCount})`,
                'Default configurations',
                vscode.TreeItemCollapsibleState.Collapsed,
                'presets',
                '$(symbol-snippet)',
                undefined,
                undefined
            ));
        }

        // Limits and constraints
        if (stats.hasLimits) {
            items.push(new SchemaTreeItem(
                'Limits & Constraints',
                'Block limits and other constraints',
                vscode.TreeItemCollapsibleState.Collapsed,
                'limits',
                '$(symbol-ruler)',
                undefined,
                undefined
            ));
        }

        return items;
    }

    private getValidationItems(): SchemaTreeItem[] {
        if (!this.validationResult) {
            return [];
        }

        const items: SchemaTreeItem[] = [];

        // Add errors
        this.validationResult.errors.forEach((error, index) => {
            const lineNumber = this.getLineNumberFromValidationPath(error.path);
            items.push(new SchemaTreeItem(
                error.message,
                `Path: ${error.path || 'root'}`,
                vscode.TreeItemCollapsibleState.None,
                'validation-error',
                '$(error)',
                error,
                lineNumber
            ));
        });

        // Add warnings
        this.validationResult.warnings.forEach((warning, index) => {
            const tooltip = warning.suggestion ? 
                `${warning.message}\n\nSuggestion: ${warning.suggestion}` : 
                warning.message;
            
            const lineNumber = this.getLineNumberFromValidationPath(warning.path);
            items.push(new SchemaTreeItem(
                warning.message,
                tooltip,
                vscode.TreeItemCollapsibleState.None,
                'validation-warning',
                '$(warning)',
                warning,
                lineNumber
            ));
        });

        return items;
    }

    private getLineNumberFromValidationPath(path?: string): number | undefined {
        if (!path || !this.currentSchema) {
            return undefined;
        }

        // Handle different path formats:
        // "settings[0]" -> find first setting
        // "blocks[1]" -> find second block  
        // "presets[0]" -> find first preset
        // "presets[0].blocks[1]" -> block reference in preset
        // etc.

        if (path.startsWith('settings[')) {
            const indexMatch = path.match(/settings\[(\d+)\]/);
            if (indexMatch && this.currentSchema.settings) {
                const index = parseInt(indexMatch[1]);
                
                // First try to find by setting index
                let lineNumber = this.schemaLineMap.get(`setting:index:${index}`);
                if (lineNumber) {
                    return lineNumber;
                }
                
                // Then try to find by setting ID
                const setting = this.currentSchema.settings[index];
                if (setting?.id) {
                    lineNumber = this.schemaLineMap.get(`setting:${setting.id}`);
                    if (lineNumber) {
                        return lineNumber;
                    }
                }
                
                // Fallback: try to find the approximate line based on settings order
                return this.getApproximateSettingLine(index);
            }
        } else if (path.startsWith('blocks[')) {
            const indexMatch = path.match(/blocks\[(\d+)\]/);
            if (indexMatch && this.currentSchema.blocks) {
                const index = parseInt(indexMatch[1]);
                
                // First try to find by block index
                let lineNumber = this.schemaLineMap.get(`block:index:${index}`);
                if (lineNumber) {
                    return lineNumber;
                }
                
                const block = this.currentSchema.blocks[index];
                
                // For @app/@theme blocks, try specific tracking
                if (block?.type === '@app' || block?.type === '@theme') {
                    lineNumber = this.schemaLineMap.get(`block:${block.type}:${index}`);
                    if (lineNumber) {
                        return lineNumber;
                    }
                    return this.getApproximateBlockLine(index);
                }
                
                // Try to find by block name
                if (block?.name) {
                    lineNumber = this.schemaLineMap.get(`block:${block.name}`);
                    if (lineNumber) {
                        return lineNumber;
                    }
                }
                
                // Fallback: try to find the approximate line based on blocks order
                return this.getApproximateBlockLine(index);
            }
        } else if (path.startsWith('presets[')) {
            // Handle preset paths like "presets[0]" or "presets[0].blocks[1]"
            const presetIndexMatch = path.match(/presets\[(\d+)\]/);
            if (presetIndexMatch && this.currentSchema.presets) {
                const presetIndex = parseInt(presetIndexMatch[1]);
                
                // Check if it's a nested preset block reference
                const blockIndexMatch = path.match(/presets\[\d+\]\.blocks\[(\d+)\]/);
                if (blockIndexMatch) {
                    // This is a preset block reference error - point to the preset
                    return this.getApproximatePresetLine(presetIndex);
                }
                
                // First try to find by preset index
                let lineNumber = this.schemaLineMap.get(`preset:index:${presetIndex}`);
                if (lineNumber) {
                    return lineNumber;
                }
                
                // Then try to find by preset name
                const preset = this.currentSchema.presets[presetIndex];
                if (preset?.name) {
                    lineNumber = this.schemaLineMap.get(`preset:${preset.name}`);
                    if (lineNumber) {
                        return lineNumber;
                    }
                }
                
                // Fallback: try to find the approximate line based on presets order
                return this.getApproximatePresetLine(presetIndex);
            }
        } else if (path === 'limits') {
            // Map to general limits section or main schema
            return this.schemaLineMap.get('schema:limits') || this.schemaLineMap.get('schema:settings');
        }

        // Fallback: try to map to general schema sections
        if (path.includes('settings')) {
            return this.schemaLineMap.get('schema:settings');
        } else if (path.includes('blocks')) {
            return this.schemaLineMap.get('schema:blocks');
        } else if (path.includes('presets')) {
            return this.schemaLineMap.get('schema:presets');
        }

        return undefined;
    }

    // Helper method to approximate setting line based on index
    private getApproximateSettingLine(index: number): number | undefined {
        const settingsStart = this.schemaLineMap.get('schema:settings');
        if (!settingsStart || !this.currentSchema?.settings) {
            return undefined;
        }
        
        // Try to find any setting that has a mapped line number
        for (let i = index; i >= 0; i--) {
            const setting = this.currentSchema.settings[i];
            if (setting?.id) {
                const lineNumber = this.schemaLineMap.get(`setting:${setting.id}`);
                if (lineNumber) {
                    return lineNumber;
                }
            }
        }
        
        // Fallback to settings array start
        return settingsStart;
    }

    // Helper method to approximate block line based on index
    private getApproximateBlockLine(index: number): number | undefined {
        const blocksStart = this.schemaLineMap.get('schema:blocks');
        if (!blocksStart || !this.currentSchema?.blocks) {
            return undefined;
        }
        
        // For @app/@theme blocks or blocks without names, estimate based on position
        // Each block typically takes 3-5 lines, so approximate
        const estimatedOffset = (index + 1) * 4; // Rough estimate
        return blocksStart + estimatedOffset;
    }

    // Helper method to approximate preset line based on index
    private getApproximatePresetLine(index: number): number | undefined {
        const presetsStart = this.schemaLineMap.get('schema:presets');
        if (!presetsStart || !this.currentSchema?.presets) {
            return undefined;
        }
        
        // Try to find any preset that has a mapped line number
        for (let i = index; i >= 0; i--) {
            const preset = this.currentSchema.presets[i];
            if (preset?.name) {
                const lineNumber = this.schemaLineMap.get(`preset:${preset.name}`);
                if (lineNumber) {
                    return lineNumber;
                }
            }
        }
        
        // Fallback to presets array start
        return presetsStart;
    }

    private getSettingsItems(settings: Setting[], contextPrefix: string = 'setting'): SchemaTreeItem[] {
        return settings.map(setting => {
            const description = this.getSettingDescription(setting);
            const icon = this.schemaParser.getSettingTypeIcon(setting.type);
            
            // For header type, use content as the display name
            let displayName: string;
            if (setting.type === 'header') {
                displayName = setting.content || 'Header';
            } else {
                displayName = setting.label || setting.id || 'Unnamed Setting';
            }
            
            return new SchemaTreeItem(
                displayName,
                description,
                vscode.TreeItemCollapsibleState.Collapsed,
                contextPrefix,
                icon,
                setting,
                this.schemaLineMap.get(`setting:${setting.id}`)
            );
        });
    }

    private getBlocksItems(blocks: Block[]): SchemaTreeItem[] {
        return blocks.map(block => {
            const settingsCount = block.settings?.length || 0;
            const description = `Type: ${block.type}${settingsCount > 0 ? ` • ${settingsCount} settings` : ''}${block.limit ? ` • Limit: ${block.limit}` : ''}`;
            
            return new SchemaTreeItem(
                block.name,
                description,
                settingsCount > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                'block',
                '$(symbol-module)',
                block,
                this.schemaLineMap.get(`block:${block.name}`)
            );
        });
    }

    private getPresetsItems(presets: Preset[]): SchemaTreeItem[] {
        return presets.map((preset, index) => {
            const blocksCount = preset.blocks?.length || 0;
            const settingsCount = Object.keys(preset.settings || {}).length;
            const description = `${blocksCount} blocks • ${settingsCount} settings`;
            
            return new SchemaTreeItem(
                preset.name,
                description,
                vscode.TreeItemCollapsibleState.None,
                'preset',
                '$(symbol-snippet)',
                preset,
                this.schemaLineMap.get(`preset:${preset.name}`)
            );
        });
    }

    private getLimitsItems(schema: ShopifySchema): SchemaTreeItem[] {
        const items: SchemaTreeItem[] = [];
        
        if (schema.max_blocks !== undefined) {
            items.push(new SchemaTreeItem(
                `Max blocks: ${schema.max_blocks}`,
                'Maximum number of blocks allowed',
                vscode.TreeItemCollapsibleState.None,
                'limit',
                '$(arrow-up)',
                undefined,
                this.schemaLineMap.get('limit')
            ));
        }
        
        if (schema.min_blocks !== undefined) {
            items.push(new SchemaTreeItem(
                `Min blocks: ${schema.min_blocks}`,
                'Minimum number of blocks required',
                vscode.TreeItemCollapsibleState.None,
                'limit',
                '$(arrow-down)',
                undefined,
                this.schemaLineMap.get('limit')
            ));
        }
        
        if (schema.limit !== undefined) {
            items.push(new SchemaTreeItem(
                `Section limit: ${schema.limit}`,
                'Maximum instances of this section',
                vscode.TreeItemCollapsibleState.None,
                'limit',
                '$(symbol-number)',
                undefined,
                this.schemaLineMap.get('limit')
            ));
        }

        return items;
    }

    private getSettingDescription(setting: Setting): string {
        let description = `${setting.type}`;
        
        if (setting.id) {
            description += ` • ID: ${setting.id}`;
        }
        
        if (setting.default !== undefined) {
            const defaultStr = typeof setting.default === 'string' ? 
                `"${setting.default}"` : 
                setting.default.toString();
            
            description += ` • Default: ${defaultStr}`;
        }
        
        if (setting.visible_if) {
            description += ` • Conditional`;
        }
        
        return description;
    }

    private getSettingDetails(setting: Setting): SchemaTreeItem[] {
        const items: SchemaTreeItem[] = [];
        
        // ID (skip for header types as they don't typically have IDs)
        if (setting.id && setting.type !== 'header') {
            items.push(new SchemaTreeItem(
                `ID: ${setting.id}`,
                'Setting identifier used in liquid templates',
                vscode.TreeItemCollapsibleState.None,
                'setting-detail',
                '$(symbol-key)',
                setting,
                this.schemaLineMap.get(`setting:${setting.id}`)
            ));
        }
        
        // Type
        items.push(new SchemaTreeItem(
            `Type: ${setting.type}`,
            'Setting input type',
            vscode.TreeItemCollapsibleState.None,
            'setting-detail',
            '$(symbol-class)',
            setting,
            this.schemaLineMap.get(`setting:${setting.id}`)
        ));
        
        // Content (for header and paragraph types)
        if (setting.content) {
            items.push(new SchemaTreeItem(
                `Content: "${setting.content}"`,
                'Display content for this element',
                vscode.TreeItemCollapsibleState.None,
                'setting-detail',
                '$(symbol-text)',
                setting,
                this.schemaLineMap.get(`setting:${setting.id}`)
            ));
        }
        
        // Default value
        if (setting.default !== undefined) {
            const defaultStr = typeof setting.default === 'string' ? 
                `"${setting.default}"` : 
                String(setting.default);
            items.push(new SchemaTreeItem(
                `Default: ${defaultStr}`,
                'Default value for this setting',
                vscode.TreeItemCollapsibleState.None,
                'setting-detail',
                '$(symbol-misc)',
                setting,
                this.schemaLineMap.get(`setting:${setting.id}`)
            ));
        }
        
        // Info
        if (setting.info) {
            items.push(new SchemaTreeItem(
                `Info: "${setting.info}"`,
                'Help text shown to users',
                vscode.TreeItemCollapsibleState.None,
                'setting-detail',
                '$(info)',
                setting,
                this.schemaLineMap.get(`setting:${setting.id}`)
            ));
        }
        
        // Visible If (conditional visibility)
        if (setting.visible_if) {
            items.push(new SchemaTreeItem(
                `Visible If: ${setting.visible_if}`,
                'Conditional visibility using Liquid code',
                vscode.TreeItemCollapsibleState.None,
                'setting-detail',
                '$(eye)',
                setting,
                this.schemaLineMap.get(`setting:${setting.id}`)
            ));
        }
        
        return items;
    }

    private getOptionItems(options: Option[]): SchemaTreeItem[] {
        return options.map(option => {
            const description = `Value: ${option.value}`;
            
            return new SchemaTreeItem(
                option.label,
                description,
                vscode.TreeItemCollapsibleState.None,
                'setting-option',
                '$(symbol-enum)',
                option,
                this.schemaLineMap.get(`setting-option:${option.value}`)
            );
        });
    }
}

export class SchemaTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly tooltip: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        iconPath?: string,
        public readonly data?: any,
        public readonly lineNumber?: number
    ) {
        super(label, collapsibleState);
        this.tooltip = tooltip;
        this.contextValue = contextValue;
        
        if (iconPath) {
            this.iconPath = new vscode.ThemeIcon(iconPath.replace('$(', '').replace(')', ''));
        }
        
        // Add click command to navigate to source line
        if (lineNumber !== undefined) {
            this.command = {
                command: 'shopifySchemaHelper.navigateToLine',
                title: 'Navigate to source',
                arguments: [lineNumber]
            };
            
            // Add line number to tooltip
            this.tooltip = `${tooltip}\n\n📍 Click to go to line ${lineNumber}`;
        }
    }
}