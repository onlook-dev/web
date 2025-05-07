import type { EditorEngine } from '..';
import type { Font } from '@onlook/models/assets';
import { DefaultSettings } from '@onlook/constants';
import { normalizePath } from '../sandbox/helpers';
import {
    createFontConfigAst,
    createFontExportAst,
    createGoogleFontImportAst,
    updateGoogleFontImportAst,
    validateFontImportAndExport,
    removeFontFromConfigAST,
    removeFontFromThemeAST,
    addFontToConfigAST,
} from '@onlook/fonts';
import { parse } from '@babel/parser';
import { generate } from '@babel/generator';
import { camelCase } from 'lodash';

export class FontConfigManager {
    private fontConfigPath = normalizePath(DefaultSettings.FONT_CONFIG);
    private tailwindConfigPath = normalizePath(DefaultSettings.TAILWIND_CONFIG);
    private fontImportPath = './fonts';

    constructor(private editorEngine: EditorEngine) {}

    private checkingProjectConfig(): boolean {
        if (!this.editorEngine.sandbox) {
            console.error('No sandbox session found');
            return false;
        }
        return true;
    }

    async addFont(font: Font): Promise<boolean> {
        if (!this.checkingProjectConfig()) {
            return false;
        }

        try {
            const content = (await this.editorEngine.sandbox.readFile(this.fontConfigPath)) ?? '';

            // Convert the font family to the import name format (Pascal case, no spaces)
            const importName = font.family.replace(/\s+/g, '_');
            const fontName = camelCase(font.id);

            // Parse the file content using Babel
            const ast = parse(content, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx'],
            });

            let updatedAst = ast;

            const { hasGoogleFontImport, hasImportName, hasFontExport } =
                validateFontImportAndExport(content, importName, fontName);

            if (hasFontExport) {
                console.log(`Font ${fontName} already exists in font.ts`);
                return false;
            }

            // Add the export declaration to the end of the file
            const exportDeclaration = createFontExportAst(font);
            updatedAst.program.body.push(exportDeclaration);

            // Add or update the import if needed
            if (!hasGoogleFontImport) {
                const importDeclaration = createGoogleFontImportAst(font);
                updatedAst.program.body.unshift(importDeclaration);
            } else if (!hasImportName) {
                updatedAst = updateGoogleFontImportAst(font, ast);
            }

            const { code } = generate(ast);

            const success = await this.editorEngine.sandbox.writeFile(this.fontConfigPath, code);
            if (!success) {
                throw new Error('Failed to write font configuration');
            }

            return true;
        } catch (error) {
            console.error(
                'Error adding font:',
                error instanceof Error ? error.message : String(error),
            );
            return false;
        }
    }

    async removeFont(font: Font): Promise<boolean> {
        if (!this.checkingProjectConfig()) {
            return false;
        }

        try {
            const content = await this.editorEngine.sandbox.readFile(this.fontConfigPath);
            if (!content) {
                return false;
            }

            const { removedFont, hasRemainingLocalFonts, ast } = removeFontFromConfigAST(
                font,
                content,
            );

            if (removedFont) {
                let { code } = generate(ast);

                // Remove localFont import if no localFont declarations remain
                if (!hasRemainingLocalFonts) {
                    const localFontImportRegex =
                        /import\s+localFont\s+from\s+['"]next\/font\/local['"];\n?/g;
                    code = code.replace(localFontImportRegex, '');
                }

                const success = await this.editorEngine.sandbox.writeFile(this.fontConfigPath, code);
                if (!success) {
                    throw new Error('Failed to write font configuration');
                }

                return true;
            } else {
                console.error(`Font ${font.id} not found in font.ts`);
                return false;
            }
        } catch (error) {
            console.error('Error removing font:', error);
            return false;
        }
    }

    async updateTailwindFontConfig(font: Font): Promise<boolean> {
        if (!this.checkingProjectConfig()) {
            return false;
        }

        try {
            if (!this.tailwindConfigPath) {
                return false;
            }

            const content = await this.editorEngine.sandbox.readFile(this.tailwindConfigPath);
            if (!content) {
                return false;
            }

            const ast = addFontToConfigAST(font, content);
            const { code } = generate(ast);
            return await this.editorEngine.sandbox.writeFile(this.tailwindConfigPath, code);
        } catch (error) {
            console.error('Error updating Tailwind font config:', error);
            return false;
        }
    }

    async removeFontFromTailwindConfig(font: Font): Promise<boolean> {
        if (!this.checkingProjectConfig()) {
            return false;
        }

        try {
            if (!this.tailwindConfigPath) {
                return false;
            }

            const content = await this.editorEngine.sandbox.readFile(this.tailwindConfigPath);
            if (!content) {
                return false;
            }

            const ast = removeFontFromThemeAST(font.id, content);
            if (!ast) {
                return false;
            }

            const { code } = generate(ast);
            return await this.editorEngine.sandbox.writeFile(this.tailwindConfigPath, code);
        } catch (error) {
            console.error('Error removing font from Tailwind config:', error);
            return false;
        }
    }
} 