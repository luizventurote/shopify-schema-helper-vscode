import * as vscode from 'vscode';
import { SchemaParser, ShopifySchema, Setting, Block, Preset, Option, ParseResult, JsonIssue } from './schemaParser';
import { SchemaValidator, ValidationResult } from './schemaValidator';
import { TranslationManager } from './translationManager';

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
    private parseResult: ParseResult | null = null;
    private schemaLineMap: Map<string, number> = new Map(); // Track line numbers for schema elements

    constructor(private schemaParser: SchemaParser, private translationManager: TranslationManager) {
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
        this.schemaLineMap.clear();
        
        // Parse the document with the new robust parser
        this.parseResult = this.schemaParser.parseDocument(document);
        this.currentSchema = this.parseResult.schema;
        
        // Convert JSON issue line numbers to absolute document line numbers
        if (this.parseResult && this.parseResult.issues.length > 0) {
            this.convertJsonIssueLineNumbers(document);
        }
        
        // Build line map for navigation if we have a schema
        if (this.currentSchema) {
            this.buildSchemaLineMap(document);
            this.validationResult = this.schemaValidator.validateSchema(this.currentSchema);
        } else {
            this.validationResult = null;
        }
        
        this._onDidChangeTreeData.fire();
    }

    /**
     * Convert JSON issue line numbers from schema-relative to document-absolute
     */
    private convertJsonIssueLineNumbers(document: vscode.TextDocument): void {
        if (!this.parseResult || this.parseResult.issues.length === 0) {
            return;
        }

        const text = document.getText();
        const schemaMatch = text.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/i);
        
        if (!schemaMatch) {
            return;
        }

        // Find the start of the schema content (after {% schema %})
        const schemaBlockStart = text.indexOf(schemaMatch[0]);
        const schemaContentStart = schemaBlockStart + schemaMatch[0].indexOf(schemaMatch[1]);
        const schemaStartPosition = document.positionAt(schemaContentStart);
        
        // Update each issue's line number to be absolute in the document
        this.parseResult.issues.forEach(issue => {
            // issue.line is 1-based relative to schema content (line 1, 2, 3...)
            // schemaStartPosition.line is 0-based relative to document  
            // Convert to 1-based document line number
            issue.line = schemaStartPosition.line + issue.line + 1;
        });
    }

    private buildSchemaLineMap(document: vscode.TextDocument): void {
        const text = document.getText();
        const schemaMatch = text.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/i);
        
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



    getTreeItem(element: SchemaTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SchemaTreeItem): Thenable<SchemaTreeItem[]> {
        // If there's a critical parsing error (no schema could be parsed), show error information
        if (this.parseResult && !this.parseResult.schema && this.parseResult.originalError) {
            if (!element) {
                // Root level - show main error
                return Promise.resolve([
                    new SchemaTreeItem(
                        '❌ JSON Parsing Error',
                        this.parseResult.originalError,
                        vscode.TreeItemCollapsibleState.Expanded,
                        'json-error',
                        '$(error)',
                        undefined,
                        this.parseResult.issues.length > 0 ? this.parseResult.issues[0].line : undefined
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
        if (!this.parseResult || this.parseResult.issues.length === 0) {
            return [];
        }

        const items: SchemaTreeItem[] = [];

        // Show original error if no schema was parsed
        if (!this.parseResult.schema && this.parseResult.originalError) {
            items.push(new SchemaTreeItem(
                `🔍 ${this.parseResult.originalError}`,
                'Original JSON parsing error',
                vscode.TreeItemCollapsibleState.None,
                'error-message',
                '$(info)',
                undefined,
                undefined
            ));
        }

        // Show all detected issues
        this.parseResult.issues.forEach((issue, index) => {
            const icon = issue.fixed ? '$(check)' : '$(warning)';
            const status = issue.fixed ? 'Auto-fixed' : 'Needs attention';
            
            items.push(new SchemaTreeItem(
                `${icon} Line ${issue.line}: ${issue.message}`,
                `${status}: ${issue.suggestion}`,
                vscode.TreeItemCollapsibleState.None,
                'json-issue',
                icon,
                issue,
                issue.line
            ));
        });

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

        // JSON Issues (if any were auto-fixed or detected)
        if (this.parseResult && this.parseResult.issues.length > 0) {
            const fixedIssues = this.parseResult.issues.filter(issue => issue.fixed);
            const unfixedIssues = this.parseResult.issues.filter(issue => !issue.fixed);
            
            let statusText = '';
            let icon = '$(check)';
            let tooltip = '';
            
            if (unfixedIssues.length > 0) {
                statusText = `${unfixedIssues.length} JSON issue${unfixedIssues.length !== 1 ? 's' : ''} need attention`;
                icon = '$(warning)';
                tooltip = 'Some JSON syntax issues require manual fixing';
            } else if (fixedIssues.length > 0) {
                statusText = `${fixedIssues.length} JSON issue${fixedIssues.length !== 1 ? 's' : ''} auto-fixed`;
                icon = '$(check)';
                tooltip = 'JSON syntax issues were automatically fixed';
            }
            
            items.push(new SchemaTreeItem(
                `JSON: ${statusText}`,
                tooltip,
                vscode.TreeItemCollapsibleState.Expanded,
                'json-issues',
                icon,
                undefined,
                undefined
            ));
        }

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
        const rawSectionName = schema.name || 'Unnamed Section';
        const sectionName = this.translationManager.translate(rawSectionName, true);
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
            
            case 'json-issues':
                return this.getJsonIssuesItems();
            
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
            case 'common-fixes':
                return this.getCommonFixesItems();
            
            default:
                return [];
        }
    }



    private getCommonFixesItems(): SchemaTreeItem[] {
        return [
            new SchemaTreeItem(
                '🚫 Trailing Commas: Remove commas before }, ]',
                'Example: {"key": "value",} ❌ → {"key": "value"} ✅',
                vscode.TreeItemCollapsibleState.None,
                'fix-tip',
                '$(dash)',
                undefined,
                undefined
            ),
            new SchemaTreeItem(
                '➕ Missing Commas: Add commas between elements',
                'Example: {"a": 1} {"b": 2} ❌ → {"a": 1}, {"b": 2} ✅',
                vscode.TreeItemCollapsibleState.None,
                'fix-tip',
                '$(dash)',
                undefined,
                undefined
            ),
            new SchemaTreeItem(
                '📝 Quotes: Use double quotes for all strings',
                "Example: {'key': 'value'} ❌ → {\"key\": \"value\"} ✅",
                vscode.TreeItemCollapsibleState.None,
                'fix-tip',
                '$(dash)',
                undefined,
                undefined
            ),
            new SchemaTreeItem(
                '🔧 Auto-format: Use Shift+Alt+F (Windows/Linux) or Shift+Option+F (Mac)',
                'VS Code can automatically format and highlight JSON syntax issues',
                vscode.TreeItemCollapsibleState.None,
                'fix-tip',
                '$(dash)',
                undefined,
                undefined
            ),
            new SchemaTreeItem(
                '✅ Validate: Use a JSON validator online',
                'Copy your schema content to jsonlint.com to check for syntax errors',
                vscode.TreeItemCollapsibleState.None,
                'fix-tip',
                '$(dash)',
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

    private getJsonIssuesItems(): SchemaTreeItem[] {
        if (!this.parseResult || this.parseResult.issues.length === 0) {
            return [];
        }

        const items: SchemaTreeItem[] = [];

        // Show all detected issues
        this.parseResult.issues.forEach((issue, index) => {
            const icon = issue.fixed ? '$(check)' : '$(warning)';
            const status = issue.fixed ? 'Auto-fixed' : 'Needs attention';
            
            items.push(new SchemaTreeItem(
                `Line ${issue.line}: ${issue.message}`,
                `${status}: ${issue.suggestion}`,
                vscode.TreeItemCollapsibleState.None,
                'json-issue',
                icon,
                issue,
                issue.line
            ));
        });

        // Add common fixes section
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
                displayName = this.translationManager.translate(setting.content || 'Header', true);
            } else {
                displayName = this.translationManager.translateSettingLabel(setting.label, setting.id);
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
            const translatedBlockName = this.translationManager.translateBlockName(block.name, block.type);
            const description = `Type: ${block.type}${settingsCount > 0 ? ` • ${settingsCount} settings` : ''}${block.limit ? ` • Limit: ${block.limit}` : ''}`;
            
            return new SchemaTreeItem(
                translatedBlockName,
                description,
                settingsCount > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                'block',
                '$(symbol-module)',
                block,
                this.schemaLineMap.get(`block:${block.name || 'unnamed'}`)
            );
        });
    }

    private getPresetsItems(presets: Preset[]): SchemaTreeItem[] {
        return presets.map((preset, index) => {
            const blocksCount = preset.blocks?.length || 0;
            const settingsCount = Object.keys(preset.settings || {}).length;
            const translatedPresetName = this.translationManager.translate(preset.name || 'Unnamed Preset', true);
            const description = `${blocksCount} blocks • ${settingsCount} settings`;
            
            return new SchemaTreeItem(
                translatedPresetName,
                description,
                vscode.TreeItemCollapsibleState.None,
                'preset',
                '$(symbol-snippet)',
                preset,
                this.schemaLineMap.get(`preset:${preset.name || 'unnamed'}`)
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

        // Add type-specific info to description
        if (setting.type === 'metaobject' && setting.metaobject_type) {
            description += ` • Type: ${setting.metaobject_type}`;
        }
        
        if ((setting.type === 'collection_list' || setting.type === 'product_list') && setting.limit) {
            description += ` • Limit: ${setting.limit}`;
        }
        
        if (setting.type === 'range') {
            if (setting.min !== undefined && setting.max !== undefined) {
                description += ` • Range: ${setting.min}-${setting.max}`;
            }
            if (setting.unit) {
                description += ` ${setting.unit}`;
            }
        }

        if ((setting.type === 'select' || setting.type === 'radio') && setting.options) {
            description += ` • ${setting.options.length} options`;
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
            const translatedContent = this.translationManager.translate(setting.content, true);
            items.push(new SchemaTreeItem(
                `Content: "${translatedContent}"`,
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
            const translatedInfo = this.translationManager.translate(setting.info, true);
            items.push(new SchemaTreeItem(
                `Info: "${translatedInfo}"`,
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

        // Type-specific attributes
        this.addTypeSpecificDetails(items, setting);
        
        return items;
    }

    private addTypeSpecificDetails(items: SchemaTreeItem[], setting: Setting): void {
        // Range settings
        if (setting.type === 'range') {
            if (setting.min !== undefined) {
                items.push(new SchemaTreeItem(
                    `Min: ${setting.min}`,
                    'Minimum value for the range slider',
                    vscode.TreeItemCollapsibleState.None,
                    'setting-detail',
                    '$(arrow-down)',
                    setting,
                    this.schemaLineMap.get(`setting:${setting.id}`)
                ));
            }
            if (setting.max !== undefined) {
                items.push(new SchemaTreeItem(
                    `Max: ${setting.max}`,
                    'Maximum value for the range slider',
                    vscode.TreeItemCollapsibleState.None,
                    'setting-detail',
                    '$(arrow-up)',
                    setting,
                    this.schemaLineMap.get(`setting:${setting.id}`)
                ));
            }
            if (setting.step !== undefined) {
                items.push(new SchemaTreeItem(
                    `Step: ${setting.step}`,
                    'Increment size between steps',
                    vscode.TreeItemCollapsibleState.None,
                    'setting-detail',
                    '$(symbol-numeric)',
                    setting,
                    this.schemaLineMap.get(`setting:${setting.id}`)
                ));
            }
            if (setting.unit) {
                items.push(new SchemaTreeItem(
                    `Unit: ${setting.unit}`,
                    'Unit displayed with the value (e.g., px, %, em)',
                    vscode.TreeItemCollapsibleState.None,
                    'setting-detail',
                    '$(symbol-ruler)',
                    setting,
                    this.schemaLineMap.get(`setting:${setting.id}`)
                ));
            }
        }

        // Collection list and product list settings
        if (setting.type === 'collection_list' || setting.type === 'product_list') {
            if (setting.limit !== undefined) {
                const itemType = setting.type === 'collection_list' ? 'collections' : 'products';
                items.push(new SchemaTreeItem(
                    `Limit: ${setting.limit}`,
                    `Maximum number of ${itemType} that can be selected (max 50)`,
                    vscode.TreeItemCollapsibleState.None,
                    'setting-detail',
                    '$(symbol-number)',
                    setting,
                    this.schemaLineMap.get(`setting:${setting.id}`)
                ));
            }
        }

        // Metaobject settings
        if (setting.type === 'metaobject') {
            if (setting.metaobject_type) {
                items.push(new SchemaTreeItem(
                    `Metaobject Type: ${setting.metaobject_type}`,
                    'The metaobject definition type to use for this setting',
                    vscode.TreeItemCollapsibleState.None,
                    'setting-detail',
                    '$(symbol-object)',
                    setting,
                    this.schemaLineMap.get(`setting:${setting.id}`)
                ));
            }
        }

        // Video URL settings
        if (setting.type === 'video_url') {
            if (setting.accept && setting.accept.length > 0) {
                items.push(new SchemaTreeItem(
                    `Accepted Providers: ${setting.accept.join(', ')}`,
                    'Video providers accepted by this setting (youtube, vimeo)',
                    vscode.TreeItemCollapsibleState.None,
                    'setting-detail',
                    '$(device-camera-video)',
                    setting,
                    this.schemaLineMap.get(`setting:${setting.id}`)
                ));
            }
        }

        // Text and number settings
        if ((setting.type === 'text' || setting.type === 'number') && setting.placeholder) {
            items.push(new SchemaTreeItem(
                `Placeholder: "${setting.placeholder}"`,
                'Placeholder text shown in the input field',
                vscode.TreeItemCollapsibleState.None,
                'setting-detail',
                '$(symbol-text)',
                setting,
                this.schemaLineMap.get(`setting:${setting.id}`)
            ));
        }

        // Options for select and radio settings
        if ((setting.type === 'select' || setting.type === 'radio') && setting.options && setting.options.length > 0) {
            items.push(new SchemaTreeItem(
                `Options (${setting.options.length})`,
                `Available options for this ${setting.type} setting`,
                vscode.TreeItemCollapsibleState.Expanded,
                'setting-options',
                '$(symbol-enum)',
                setting.options,
                this.schemaLineMap.get(`setting:${setting.id}`)
            ));
        }
    }

    private getOptionItems(options: Option[]): SchemaTreeItem[] {
        return options.map(option => {
            const description = `Value: ${option.value}`;
            const translatedLabel = this.translationManager.translateOption(option.label);
            
            return new SchemaTreeItem(
                translatedLabel,
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