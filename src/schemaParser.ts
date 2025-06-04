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

export class SchemaParser {

    public parseDocument(document: vscode.TextDocument): ShopifySchema | null {
        const text = document.getText();
        const schemaMatch = text.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/i);
        
        if (!schemaMatch) {
            return null;
        }

        const schemaContent = schemaMatch[1].trim();
        
        // Parse the JSON - let errors bubble up to the tree provider
        const schema = JSON.parse(schemaContent) as ShopifySchema;
        const cleanedSchema = this.validateAndCleanSchema(schema);
        
        // Add file type metadata based on file path
        cleanedSchema._filePath = document.fileName;
        cleanedSchema._fileType = this.detectFileType(document.fileName);
        
        return cleanedSchema;
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
    } {
        return {
            settingsCount: schema.settings?.length || 0,
            blocksCount: schema.blocks?.length || 0,
            presetsCount: schema.presets?.length || 0,
            hasLimits: !!(schema.max_blocks || schema.min_blocks || schema.limit)
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
            'font_picker': '$(symbol-type-parameter)',
            'collection': '$(symbol-array)',
            'product': '$(symbol-object)',
            'blog': '$(symbol-object)',
            'page': '$(symbol-object)',
            'link_list': '$(symbol-array)',
            'url': '$(link)',
            'richtext': '$(symbol-text)',
            'html': '$(code)',
            'liquid': '$(code)',
            'image_picker': '$(file-media)',
            'video': '$(device-camera-video)',
            'video_url': '$(link)',
            'article': '$(symbol-object)',
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