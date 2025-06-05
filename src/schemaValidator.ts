import { ShopifySchema, Setting, Block } from './schemaParser';

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    type: 'error';
    message: string;
    path?: string;
    line?: number;
}

export interface ValidationWarning {
    type: 'warning';
    message: string;
    path?: string;
    suggestion?: string;
}

export class SchemaValidator {
    
    public validateSchema(schema: ShopifySchema): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // Validate basic schema structure
        this.validateBasicStructure(schema, errors, warnings);
        
        // Validate settings
        if (schema.settings) {
            this.validateSettings(schema.settings, errors, warnings);
        }
        
        // Validate blocks
        if (schema.blocks) {
            this.validateBlocks(schema.blocks, errors, warnings);
        }
        
        // Validate presets
        if (schema.presets) {
            this.validatePresets(schema, errors, warnings);
        }

        // Validate limits
        this.validateLimits(schema, errors, warnings);

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    private validateBasicStructure(schema: ShopifySchema, errors: ValidationError[], warnings: ValidationWarning[]) {
        // Check for required fields
        if (!schema.name || schema.name.trim() === '') {
            warnings.push({
                type: 'warning',
                message: 'Section name is empty or missing',
                suggestion: 'Add a descriptive name for your section'
            });
        }

        // Check name length
        if (schema.name && schema.name.length > 50) {
            warnings.push({
                type: 'warning',
                message: 'Section name is very long (over 50 characters)',
                suggestion: 'Consider using a shorter, more concise name'
            });
        }

        // Check for deprecated properties
        if (schema.tag && schema.tag !== 'section') {
            warnings.push({
                type: 'warning',
                message: `Tag "${schema.tag}" is unusual for sections`,
                suggestion: 'Most sections use "section" or omit this property'
            });
        }
    }

    private validateSettings(settings: Setting[], errors: ValidationError[], warnings: ValidationWarning[]) {
        const settingIds = new Set<string>();
        
        settings.forEach((setting, index) => {
            const path = `settings[${index}]`;
            
            // Check required fields
            if (!setting.type) {
                errors.push({
                    type: 'error',
                    message: 'Setting type is required',
                    path
                });
            }
            
            // Header settings don't need id or label - they use content instead
            const isHeaderType = setting.type === 'header' || setting.type === 'paragraph';
            
            if (!setting.id && !isHeaderType) {
                errors.push({
                    type: 'error',
                    message: 'Setting id is required',
                    path
                });
            }
            
            if (!setting.label && !isHeaderType) {
                warnings.push({
                    type: 'warning',
                    message: 'Setting label is missing',
                    path,
                    suggestion: 'Add a user-friendly label for this setting'
                });
            }
            
            // For header/paragraph types, check if content is provided
            if (isHeaderType && !setting.content) {
                warnings.push({
                    type: 'warning',
                    message: `${setting.type} setting should have content property`,
                    path,
                    suggestion: 'Add a content property to display text for this header/paragraph'
                });
            }

            // Check for duplicate IDs (only for settings that should have IDs)
            if (setting.id && !isHeaderType) {
                if (settingIds.has(setting.id)) {
                    errors.push({
                        type: 'error',
                        message: `Duplicate setting ID: "${setting.id}"`,
                        path
                    });
                } else {
                    settingIds.add(setting.id);
                }

                // Check ID format
                if (!/^[a-z][a-z0-9_]*$/.test(setting.id)) {
                    warnings.push({
                        type: 'warning',
                        message: `Setting ID "${setting.id}" should use lowercase letters, numbers, and underscores only`,
                        path,
                        suggestion: 'Use snake_case format for IDs'
                    });
                }
            }
            
            // Warn if header/paragraph types have id or label (they shouldn't)
            if (isHeaderType) {
                if (setting.id) {
                    warnings.push({
                        type: 'warning',
                        message: `${setting.type} settings should not have an ID property`,
                        path,
                        suggestion: `Remove the ID property for ${setting.type} elements - they use content instead`
                    });
                }
                if (setting.label) {
                    warnings.push({
                        type: 'warning',
                        message: `${setting.type} settings should not have a label property`,
                        path,
                        suggestion: `Remove the label property for ${setting.type} elements - they use content instead`
                    });
                }
            }

            // Validate setting type specific rules
            this.validateSettingType(setting, path, errors, warnings);
        });
    }

    private validateSettingType(setting: Setting, path: string, errors: ValidationError[], warnings: ValidationWarning[]) {
        const validTypes = [
            // Basic input settings
            'text', 'textarea', 'number', 'range', 'checkbox', 'select', 'radio',
            // Specialized input settings  
            'article', 'blog', 'collection', 'collection_list', 'color', 'color_background',
            'color_scheme', 'color_scheme_group', 'font_picker', 'html', 'image_picker',
            'inline_richtext', 'link_list', 'liquid', 'metaobject', 'metaobject_list',
            'page', 'product', 'product_list', 'richtext', 'text_alignment', 'url',
            'video', 'video_url',
            // Informational settings
            'header', 'paragraph'
        ];

        if (!validTypes.includes(setting.type)) {
            errors.push({
                type: 'error',
                message: `Unknown setting type: "${setting.type}"`,
                path
            });
        }

        // Type-specific validations
        switch (setting.type) {
            case 'range':
                if (setting.min === undefined || setting.max === undefined) {
                    errors.push({
                        type: 'error',
                        message: 'Range settings require both min and max properties',
                        path
                    });
                } else {
                    if (setting.min >= setting.max) {
                        errors.push({
                            type: 'error',
                            message: 'Range min value must be less than max value',
                            path
                        });
                    }
                }
                if (setting.step !== undefined && setting.step <= 0) {
                    errors.push({
                        type: 'error',
                        message: 'Range step must be greater than 0',
                        path
                    });
                }
                break;
                
            case 'select':
            case 'radio':
                if (!setting.options || setting.options.length === 0) {
                    errors.push({
                        type: 'error',
                        message: `${setting.type} settings require options array`,
                        path
                    });
                }
                break;
                
            case 'header':
                // Header settings use content instead of id/label
                if (!setting.content) {
                    warnings.push({
                        type: 'warning',
                        message: 'Header settings should have content property',
                        path,
                        suggestion: 'Add content property to display text for this header'
                    });
                }
                break;
                
            case 'paragraph':
                // Paragraph settings also use content instead of id/label
                if (!setting.content) {
                    warnings.push({
                        type: 'warning',
                        message: 'Paragraph settings should have content property',
                        path,
                        suggestion: 'Add content property to display text for this paragraph'
                    });
                }
                break;
                
            case 'text_alignment':
                if (setting.default && !['left', 'center', 'right'].includes(setting.default)) {
                    errors.push({
                        type: 'error',
                        message: 'text_alignment default must be "left", "center", or "right"',
                        path
                    });
                }
                break;
                
            case 'metaobject':
                if (!setting.metaobject_type) {
                    errors.push({
                        type: 'error',
                        message: 'metaobject settings require metaobject_type property',
                        path
                    });
                }
                break;
                
            case 'collection_list':
            case 'product_list':
                if (setting.limit !== undefined) {
                    if (setting.limit < 1 || setting.limit > 50) {
                        errors.push({
                            type: 'error',
                            message: `${setting.type} limit must be between 1 and 50`,
                            path
                        });
                    }
                }
                break;
                
            case 'video_url':
                if (setting.accept && Array.isArray(setting.accept)) {
                    const validProviders = ['youtube', 'vimeo'];
                    setting.accept.forEach(provider => {
                        if (!validProviders.includes(provider)) {
                            errors.push({
                                type: 'error',
                                message: `Invalid video provider: "${provider}". Valid options are: ${validProviders.join(', ')}`,
                                path
                            });
                        }
                    });
                } else if (setting.accept) {
                    errors.push({
                        type: 'error',
                        message: 'video_url accept property must be an array',
                        path
                    });
                }
                break;
        }
        
        // Validate visible_if property
        if (setting.visible_if) {
            this.validateVisibleIf(setting.visible_if, path, errors, warnings);
        }
    }

    private validateVisibleIf(visibleIf: string, path: string, errors: ValidationError[], warnings: ValidationWarning[]) {
        // Check if it contains Liquid syntax
        if (!visibleIf.includes('{{') || !visibleIf.includes('}}')) {
            warnings.push({
                type: 'warning',
                message: 'visible_if should contain Liquid code wrapped in {{ }}',
                path: `${path}.visible_if`,
                suggestion: 'Use Liquid syntax like {{ section.settings.field_name == true }}'
            });
        }
        
        // Check for common patterns
        if (visibleIf.includes('section.settings.') || visibleIf.includes('block.settings.')) {
            // Looks good - contains proper setting reference
        } else {
            warnings.push({
                type: 'warning',
                message: 'visible_if should reference settings using section.settings.* or block.settings.*',
                path: `${path}.visible_if`,
                suggestion: 'Reference other settings like {{ section.settings.enable_feature == true }}'
            });
        }
        
        // Check for balanced braces
        const openBraces = (visibleIf.match(/{{/g) || []).length;
        const closeBraces = (visibleIf.match(/}}/g) || []).length;
        
        if (openBraces !== closeBraces) {
            errors.push({
                type: 'error',
                message: 'Unbalanced Liquid braces in visible_if',
                path: `${path}.visible_if`
            });
        }
    }

    private validateBlocks(blocks: Block[], errors: ValidationError[], warnings: ValidationWarning[]) {
        const blockTypes = new Set<string>();
        
        blocks.forEach((block, index) => {
            const path = `blocks[${index}]`;
            
            // Check required fields
            if (!block.type) {
                errors.push({
                    type: 'error',
                    message: 'Block type is required',
                    path
                });
            }
            
            // Special handling for @app and @theme blocks
            const isSpecialBlock = block.type === '@app' || block.type === '@theme';
            
            if (!block.name && !isSpecialBlock) {
                errors.push({
                    type: 'error',
                    message: 'Block name is required',
                    path
                });
            }
            
            // @app and @theme blocks shouldn't have names
            if (block.name && isSpecialBlock) {
                warnings.push({
                    type: 'warning',
                    message: `Block type "${block.type}" should not have a name property`,
                    path,
                    suggestion: 'Remove the name property for @app and @theme blocks'
                });
            }

            // Check for duplicate block types
            if (block.type) {
                if (blockTypes.has(block.type)) {
                    warnings.push({
                        type: 'warning',
                        message: `Duplicate block type: "${block.type}"`,
                        path,
                        suggestion: 'Consider using unique block types or combining similar blocks'
                    });
                } else {
                    blockTypes.add(block.type);
                }

                // Check type format - allow @app and @theme as special exceptions
                if (!isSpecialBlock && !/^[a-z][a-z0-9_]*$/.test(block.type)) {
                    warnings.push({
                        type: 'warning',
                        message: `Block type "${block.type}" should use lowercase letters, numbers, and underscores only`,
                        path,
                        suggestion: 'Use snake_case format for block types (or use @app/@theme for dynamic blocks)'
                    });
                }
                
                // Validate @app and @theme don't have settings
                if (isSpecialBlock && block.settings && block.settings.length > 0) {
                    warnings.push({
                        type: 'warning',
                        message: `Block type "${block.type}" should not have settings`,
                        path,
                        suggestion: '@app and @theme blocks load their settings dynamically'
                    });
                }
            }

            // Validate block settings (only for non-special blocks)
            if (block.settings && !isSpecialBlock) {
                this.validateSettings(block.settings, errors, warnings);
            }
        });
    }

    private validatePresets(schema: ShopifySchema, errors: ValidationError[], warnings: ValidationWarning[]) {
        if (!schema.presets || schema.presets.length === 0) {
            warnings.push({
                type: 'warning',
                message: 'No presets defined',
                suggestion: 'Consider adding at least one preset to help users get started'
            });
            return;
        }

        schema.presets.forEach((preset, index) => {
            const path = `presets[${index}]`;
            
            if (!preset.name) {
                errors.push({
                    type: 'error',
                    message: 'Preset name is required',
                    path
                });
            }

            // Validate preset settings reference existing setting IDs
            if (preset.settings && schema.settings) {
                const validSettingIds = schema.settings.map(s => s.id);
                Object.keys(preset.settings).forEach(settingId => {
                    if (!validSettingIds.includes(settingId)) {
                        warnings.push({
                            type: 'warning',
                            message: `Preset references unknown setting ID: "${settingId}"`,
                            path: `${path}.settings.${settingId}`,
                            suggestion: 'Make sure this setting ID exists in the settings array'
                        });
                    }
                });
            }

            // Validate preset blocks reference existing block types
            if (preset.blocks && schema.blocks) {
                const validBlockTypes = schema.blocks.map(b => b.type);
                
                // Check if @app or @theme blocks are present - they allow any block type
                const hasAppBlocks = schema.blocks.some(b => b.type === '@app');
                const hasThemeBlocks = schema.blocks.some(b => b.type === '@theme');
                const acceptsAnyBlocks = hasAppBlocks || hasThemeBlocks;
                
                preset.blocks.forEach((presetBlock, blockIndex) => {
                    const blockPath = `${path}.blocks[${blockIndex}]`;
                    
                    // If @app or @theme blocks are present, be more lenient
                    if (acceptsAnyBlocks) {
                        // Only warn if the block type is explicitly invalid (not if it's just missing from blocks array)
                        if (!validBlockTypes.includes(presetBlock.type)) {
                            // Don't warn - @app/@theme can accept any block type
                            // This could be a block from an app or theme's /blocks folder
                        }
                    } else {
                        // Strict validation when no @app/@theme blocks are present
                        if (!validBlockTypes.includes(presetBlock.type)) {
                            warnings.push({
                                type: 'warning',
                                message: `Preset block references unknown block type: "${presetBlock.type}"`,
                                path: blockPath,
                                suggestion: 'Make sure this block type exists in the blocks array, or add @app/@theme blocks to accept dynamic blocks'
                            });
                        }
                    }
                });
            }
        });
    }

    private validateLimits(schema: ShopifySchema, errors: ValidationError[], warnings: ValidationWarning[]) {
        // Check min/max blocks consistency
        if (schema.min_blocks !== undefined && schema.max_blocks !== undefined) {
            if (schema.min_blocks > schema.max_blocks) {
                errors.push({
                    type: 'error',
                    message: 'min_blocks cannot be greater than max_blocks',
                    path: 'limits'
                });
            }
        }

        // Check if blocks are defined when limits are set
        if ((schema.min_blocks !== undefined || schema.max_blocks !== undefined) && 
            (!schema.blocks || schema.blocks.length === 0)) {
            warnings.push({
                type: 'warning',
                message: 'Block limits are set but no blocks are defined',
                suggestion: 'Define blocks or remove block limits'
            });
        }

        // Validate reasonable limits
        if (schema.max_blocks !== undefined && schema.max_blocks > 50) {
            warnings.push({
                type: 'warning',
                message: 'Very high max_blocks limit may impact performance',
                suggestion: 'Consider if such a high limit is necessary'
            });
        }
    }
} 