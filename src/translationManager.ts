import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class TranslationManager {
    private translations: any = {};
    private workspaceRoot: string | undefined;

    constructor(private context: vscode.ExtensionContext) {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        this.loadTranslations();
    }

    private async loadTranslations(): Promise<void> {
        if (!this.workspaceRoot) {
            console.log('No workspace found, translations not loaded');
            return;
        }

        const localesPath = path.join(this.workspaceRoot, 'locales', 'en.default.schema.json');
        
        try {
            if (fs.existsSync(localesPath)) {
                const translationContent = fs.readFileSync(localesPath, 'utf8');
                this.translations = JSON.parse(translationContent);
                console.log('Shopify translations loaded from:', localesPath);
            } else {
                console.log('No Shopify translation file found at:', localesPath);
            }
        } catch (error) {
            console.error('Error loading Shopify translations:', error);
        }
    }

    translate(key: string, useOriginalAsFallback: boolean = false): string {
        // Handle null/undefined keys
        if (!key || typeof key !== 'string') {
            return '';
        }

        if (!key.startsWith('t:')) {
            return key;
        }

        // Remove the 't:' prefix and split the path
        const translationPath = key.substring(2);
        const pathParts = translationPath.split('.');
        
        // Navigate through the translation object
        let current = this.translations;
        for (const part of pathParts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                // Translation not found
                if (useOriginalAsFallback) {
                    return key; // Return the original t: key
                } else {
                    return this.formatFallbackKey(translationPath); // Return cleaned version
                }
            }
        }

        // Return the translation if it's a string, otherwise return fallback
        if (typeof current === 'string') {
            return current;
        } else {
            return useOriginalAsFallback ? key : this.formatFallbackKey(translationPath);
        }
    }

    private formatFallbackKey(key: string): string {
        // Convert dot notation to a more readable format
        // e.g., "sections.collage.settings.heading.label" -> "Heading Label"
        const parts = key.split('.');
        const lastPart = parts[parts.length - 1];
        
        // If it ends with common suffixes, take the previous part too
        if (['label', 'content', 'name', 'default', 'info'].includes(lastPart) && parts.length > 1) {
            const secondLast = parts[parts.length - 2];
            return this.humanizeKey(secondLast);
        }
        
        return this.humanizeKey(lastPart);
    }

    private humanizeKey(key: string): string {
        return key
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Translate a setting label, handling both direct text and translation keys
    translateSettingLabel(label: string | undefined, id?: string): string {
        if (!label) {
            return id ? this.humanizeKey(id) : 'Unnamed Setting';
        }

        return this.translate(label, true); // Use original as fallback
    }

    // Translate block names
    translateBlockName(name: string, blockType?: string): string {
        if (!name || typeof name !== 'string') {
            return blockType || 'Unnamed Block';
        }
        return this.translate(name, true); // Use original as fallback
    }

    // Translate option values in selects
    translateOption(option: string): string {
        if (!option || typeof option !== 'string') {
            return 'Unnamed Option';
        }
        return this.translate(option, true); // Use original as fallback
    }

    // Reload translations (useful when files change)
    async reloadTranslations(): Promise<void> {
        await this.loadTranslations();
    }
} 