import * as vscode from 'vscode';

export interface ShopifySchema {
    name?: string;
    tag?: string;
    class?: string;
    limit?: number;
    settings?: Setting[];
    blocks?: Block[];
    presets?: Preset[];
    max_blocks?: number;
    min_blocks?: number;
    enabled_on?: EnabledOn;
    disabled_on?: DisabledOn;
    locales?: string[];
    // Extension-specific metadata
    _fileType?: 'section' | 'block';
    _filePath?: string;
    _jsonIssues?: JsonIssue[];  // Track JSON syntax issues that were auto-fixed
}

export interface Setting {
    type: string;
    id?: string;
    label?: string;
    content?: string;
    default?: any;
    placeholder?: string;
    info?: string;
    options?: Option[];
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    visible_if?: string;
    // Additional attributes for specific setting types
    limit?: number;  // For collection_list, product_list
    metaobject_type?: string;  // For metaobject
    accept?: string[];  // For video_url
}

export interface Block {
    type: string;
    name: string;
    limit?: number;
    settings?: Setting[];
}

export interface Preset {
    name: string;
    settings?: { [key: string]: any };
    blocks?: PresetBlock[];
}

export interface PresetBlock {
    type: string;
    settings?: { [key: string]: any };
}

export interface Option {
    value: string;
    label: string;
}

export interface EnabledOn {
    templates?: string[];
    groups?: string[];
}

export interface DisabledOn {
    templates?: string[];
    groups?: string[];
}

export interface JsonIssue {
    type: 'trailing-comma' | 'missing-comma' | 'unescaped-quote' | 'bracket-mismatch' | 'other';
    line: number;
    column: number;
    message: string;
    suggestion: string;
    fixed: boolean;
}

export interface ParseResult {
    schema: ShopifySchema | null;
    issues: JsonIssue[];
    originalError: string | null;
}

export class SchemaParser {

    public parseDocument(document: vscode.TextDocument): ParseResult {
        const text = document.getText();
        const schemaMatch = text.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/i);
        
        if (!schemaMatch) {
            return {
                schema: null,
                issues: [],
                originalError: 'No schema block found'
            };
        }

        const schemaContent = schemaMatch[1].trim();
        const result = this.parseJsonWithRecovery(schemaContent);
        
        if (result.schema) {
            // Add file type metadata based on file path
            result.schema._filePath = document.fileName;
            result.schema._fileType = this.detectFileType(document.fileName);
            result.schema._jsonIssues = result.issues;
            
            // Clean and validate the schema
            result.schema = this.validateAndCleanSchema(result.schema);
        }
        
        return result;
    }

    /**
     * Enhanced JSON parser that attempts to recover from common syntax errors
     */
    private parseJsonWithRecovery(content: string): ParseResult {
        const issues: JsonIssue[] = [];
        let workingContent = content;
        let originalError: string | null = null;

        // First, try to parse as-is
        try {
            const schema = JSON.parse(workingContent) as ShopifySchema;
            return {
                schema: this.validateAndCleanSchema(schema),
                issues: [],
                originalError: null
            };
        } catch (error) {
            originalError = error instanceof Error ? error.message : 'Unknown JSON error';
        }

        // Try to fix common issues
        workingContent = this.fixTrailingCommas(workingContent, issues);
        workingContent = this.fixMissingCommas(workingContent, issues);
        workingContent = this.fixUnescapedQuotes(workingContent, issues);

        // Try parsing again after fixes
        try {
            const schema = JSON.parse(workingContent) as ShopifySchema;
            return {
                schema: this.validateAndCleanSchema(schema),
                issues,
                originalError
            };
        } catch (error) {
            // Still couldn't parse - return null with all detected issues
            const finalError = error instanceof Error ? error.message : 'Unknown JSON error';
            
            // Add a general parsing issue if we couldn't fix it
            const errorLine = this.extractLineFromError(finalError, workingContent);
            issues.push({
                type: 'other',
                line: errorLine,
                column: 0,
                message: finalError,
                suggestion: 'Check the JSON syntax. Common issues include missing quotes, brackets, or commas.',
                fixed: false
            });

            return {
                schema: null,
                issues,
                originalError: finalError
            };
        }
    }

    /**
     * Fix trailing commas before closing brackets/braces
     */
    private fixTrailingCommas(content: string, issues: JsonIssue[]): string {
        const lines = content.split('\n');
        let modified = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            // Check for trailing commas before closing brackets/braces
            if (trimmed.endsWith(',]') || trimmed.endsWith(',}') || trimmed.endsWith(',')) {
                // Check if the next non-empty line starts with ] or }
                let nextLineIndex = i + 1;
                while (nextLineIndex < lines.length && lines[nextLineIndex].trim() === '') {
                    nextLineIndex++;
                }
                
                if (nextLineIndex < lines.length) {
                    const nextTrimmed = lines[nextLineIndex].trim();
                    if (nextTrimmed.startsWith(']') || nextTrimmed.startsWith('}')) {
                        lines[i] = line.replace(/,(\s*)$/, '$1');
                        
                        issues.push({
                            type: 'trailing-comma',
                            line: i + 1,
                            column: line.lastIndexOf(',') + 1,
                            message: 'Trailing comma before closing bracket/brace',
                            suggestion: 'Remove the comma before the closing bracket or brace',
                            fixed: true
                        });
                        
                        modified = true;
                    }
                }
            }
        }

        return modified ? lines.join('\n') : content;
    }

    /**
     * Detect and suggest fixes for missing commas
     */
    private fixMissingCommas(content: string, issues: JsonIssue[]): string {
        const lines = content.split('\n');
        let modified = false;

        for (let i = 0; i < lines.length - 1; i++) {
            const currentLine = lines[i].trim();
            const nextLine = lines[i + 1].trim();
            
            // Check if current line ends with } or ] and next line starts with { or "
            if ((currentLine.endsWith('}') || currentLine.endsWith(']') || currentLine.endsWith('"')) && 
                (nextLine.startsWith('{') || nextLine.startsWith('"') || nextLine.match(/^\w/))) {
                
                // Skip if next line is a closing bracket/brace
                if (nextLine.startsWith('}') || nextLine.startsWith(']')) {
                    continue;
                }
                
                // Add comma to current line if it doesn't already have one
                if (!currentLine.endsWith(',')) {
                    lines[i] = lines[i].replace(/(\s*)$/, ',$1');
                    
                    issues.push({
                        type: 'missing-comma',
                        line: i + 1,
                        column: lines[i].length,
                        message: 'Missing comma between JSON elements',
                        suggestion: 'Add a comma after this line to separate JSON elements',
                        fixed: true
                    });
                    
                    modified = true;
                }
            }
        }

        return modified ? lines.join('\n') : content;
    }

    /**
     * Basic fix for unescaped quotes in strings
     */
    private fixUnescapedQuotes(content: string, issues: JsonIssue[]): string {
        // Improved detection to avoid false positives
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip lines that are not likely to contain string values
            if (!line.includes(':') || !line.includes('"')) {
                continue;
            }
            
            // Look for potential issues with string termination
            // Match string values after colons: "key": "value"
            const stringValueMatches = line.match(/:\s*"([^"]*)"/g);
            if (stringValueMatches) {
                for (const match of stringValueMatches) {
                    const stringContent = match.substring(match.indexOf('"') + 1, match.lastIndexOf('"'));
                    
                    // Only flag if there are actual problematic characters
                    // Check for unterminated strings or strings with unescaped quotes that would break JSON
                    if (stringContent.includes('"') && !stringContent.includes('\\"')) {
                        // But skip common valid cases like liquid template strings
                        if (!stringContent.includes('{{') && !stringContent.includes('}}')) {
                            issues.push({
                                type: 'unescaped-quote',
                                line: i + 1,
                                column: line.indexOf(match) + 1,
                                message: 'Possible unescaped quote in string',
                                suggestion: 'Escape quotes inside strings with \\" or check for proper string termination',
                                fixed: false
                            });
                        }
                    }
                }
            }
        }

        return content; // Don't auto-fix this one as it's complex
    }

    /**
     * Extract line number from JSON error message
     */
    private extractLineFromError(errorMessage: string, content: string): number {
        const positionMatch = errorMessage.match(/at position (\d+)/);
        if (positionMatch) {
            const position = parseInt(positionMatch[1]);
            const beforeError = content.substring(0, position);
            const lines = beforeError.split('\n');
            return lines.length;
        }
        return 1;
    }

    private validateAndCleanSchema(schema: ShopifySchema): ShopifySchema {
        // Basic validation and cleaning
        if (!schema.name) {
            schema.name = 'Unnamed Section';
        }

        // Ensure arrays exist
        schema.settings = schema.settings || [];
        schema.blocks = schema.blocks || [];
        schema.presets = schema.presets || [];

        return schema;
    }

    public getSchemaStats(schema: ShopifySchema): {
        settingsCount: number;
        blocksCount: number;
        presetsCount: number;
        hasLimits: boolean;
        hasJsonIssues: boolean;
    } {
        return {
            settingsCount: schema.settings?.length || 0,
            blocksCount: schema.blocks?.length || 0,
            presetsCount: schema.presets?.length || 0,
            hasLimits: !!(schema.max_blocks || schema.min_blocks || schema.limit),
            hasJsonIssues: !!(schema._jsonIssues && schema._jsonIssues.length > 0)
        };
    }

    public getSettingTypeIcon(type: string): string {
        const iconMap: { [key: string]: string } = {
            'text': '$(symbol-string)',
            'textarea': '$(symbol-text)',
            'number': '$(symbol-number)',
            'range': '$(symbol-numeric)',
            'checkbox': '$(symbol-boolean)',
            'select': '$(symbol-enum)',
            'radio': '$(symbol-enum)',
            'color': '$(symbol-color)',
            'color_background': '$(symbol-color)',
            'color_scheme': '$(symbol-color)',
            'color_scheme_group': '$(symbol-color)',
            'font_picker': '$(symbol-type-parameter)',
            'collection': '$(symbol-object)',
            'collection_list': '$(symbol-array)',
            'product': '$(symbol-object)',
            'product_list': '$(symbol-array)',
            'blog': '$(symbol-object)',
            'page': '$(symbol-object)',
            'link_list': '$(symbol-array)',
            'url': '$(link)',
            'richtext': '$(symbol-text)',
            'inline_richtext': '$(symbol-text)',
            'html': '$(code)',
            'liquid': '$(code)',
            'image_picker': '$(file-media)',
            'video': '$(device-camera-video)',
            'video_url': '$(link)',
            'article': '$(symbol-object)',
            'metaobject': '$(symbol-object)',
            'metaobject_list': '$(symbol-array)',
            'text_alignment': '$(symbol-enum)',
            'header': '$(symbol-class)',
            'paragraph': '$(symbol-text)'
        };

        return iconMap[type] || '$(symbol-misc)';
    }

    private detectFileType(filePath: string): 'section' | 'block' {
        // Normalize path separators
        const normalizedPath = filePath.replace(/\\/g, '/');
        
        if (normalizedPath.includes('/blocks/')) {
            return 'block';
        } else if (normalizedPath.includes('/sections/')) {
            return 'section';
        } else {
            // Default fallback - try to detect from file location
            const pathParts = normalizedPath.split('/');
            const parentFolder = pathParts[pathParts.length - 2];
            
            if (parentFolder === 'blocks') {
                return 'block';
            } else if (parentFolder === 'sections') {
                return 'section';
            }
            
            // Ultimate fallback - assume section
            return 'section';
        }
    }

    /**
     * Validates if JSON content has common syntax issues before parsing
     */
    public validateJsonSyntax(content: string): { isValid: boolean; issues: string[] } {
        const issues: string[] = [];
        const lines = content.split('\n');
        
        // Check for trailing commas
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (trimmed.endsWith(',]') || trimmed.endsWith(',}')) {
                issues.push(`Line ${index + 1}: Trailing comma before closing bracket/brace`);
            }
        });
        
        // Check bracket/brace balance
        let braceCount = 0;
        let bracketCount = 0;
        let inString = false;
        let escapeNext = false;
        
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            
            if (char === '\\') {
                escapeNext = true;
                continue;
            }
            
            if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
            }
            
            if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
                if (char === '[') bracketCount++;
                if (char === ']') bracketCount--;
            }
        }
        
        if (braceCount !== 0) {
            issues.push(`Mismatched braces: ${braceCount > 0 ? 'missing closing' : 'extra closing'} brace(s)`);
        }
        
        if (bracketCount !== 0) {
            issues.push(`Mismatched brackets: ${bracketCount > 0 ? 'missing closing' : 'extra closing'} bracket(s)`);
        }
        
        return {
            isValid: issues.length === 0,
            issues
        };
    }
} 