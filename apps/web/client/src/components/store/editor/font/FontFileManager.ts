import type { EditorEngine } from '..';
import type { Font } from '@onlook/models/assets';
import { parse } from '@babel/parser';
import { generate } from '@babel/generator';
import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';
import { getFontFileName } from '@onlook/utility';
import * as pathModule from 'path';
import { DefaultSettings } from '@onlook/constants';
import { normalizePath } from '../sandbox/helpers';
import { camelCase } from 'lodash';
import { isFontExists, isValidLocalFontDeclaration, isPropertyWithName } from '@onlook/fonts';

interface FontFile {
    file: { name: string; buffer: number[] };
    name: string;
    weight: string;
    style: string;
}

export class FontFileManager {
    private fontConfigPath = normalizePath(DefaultSettings.FONT_CONFIG);

    constructor(private editorEngine: EditorEngine) {}

    private checkingProjectConfig(): boolean {
        if (!this.editorEngine.sandbox) {
            console.error('No sandbox session found');
            return false;
        }
        return true;
    }

    async uploadFonts(
        fontFiles: FontFile[],
    ): Promise<boolean> {
        if (!this.checkingProjectConfig()) {
            return false;
        }

        try {
            // Read the current font configuration file
            const content = (await this.editorEngine.sandbox.readFile(this.fontConfigPath)) ?? '';

            // Parse the file content using Babel
            const ast = parse(content, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx'],
            });

            // Check if the localFont import already exists
            let hasLocalFontImport = false;
            traverse(ast, {
                ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
                    if (path.node.source.value === 'next/font/local') {
                        hasLocalFontImport = true;
                    }
                },
            });

            // Extract the base font name from the first file
            const baseFontName = fontFiles[0]?.name.split('.')[0] ?? 'customFont';
            const fontName = camelCase(`custom-${baseFontName}`);

            // Check if this font name already exists
            const { existingFontNode } = isFontExists(fontName, content);

            // Make sure the fonts directory exists (this is handled by sandbox in our case)
            const fontsDir = 'fonts';

            // Save font files and prepare font configuration
            const fontConfigs = await Promise.all(
                fontFiles.map(async (fontFile) => {
                    const weight = fontFile.weight;
                    const style = fontFile.style.toLowerCase();
                    const fileName = getFontFileName(baseFontName, weight, style);
                    const filePath = pathModule.join(
                        fontsDir,
                        `${fileName}.${fontFile.file.name.split('.').pop()}`,
                    );

                    // Save the file as binary data
                    const buffer = Buffer.from(fontFile.file.buffer);
                    await this.editorEngine.sandbox.writeBinaryFile(filePath, buffer);

                    return {
                        path: filePath,
                        weight,
                        style,
                    };
                }),
            );

            // Create array elements for the src property
            const srcArrayElements = fontConfigs.map((config) =>
                t.objectExpression([
                    t.objectProperty(t.identifier('path'), t.stringLiteral(`../${config.path}`)),
                    t.objectProperty(t.identifier('weight'), t.stringLiteral(config.weight)),
                    t.objectProperty(t.identifier('style'), t.stringLiteral(config.style)),
                ]),
            );

            if (existingFontNode) {
                // Merge new font configurations with existing ones
                traverse(ast, {
                    ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
                        if (path.node === existingFontNode && path.node.declaration) {
                            const declaration = path.node.declaration;
                            if (
                                t.isVariableDeclaration(declaration) &&
                                declaration.declarations.length > 0
                            ) {
                                const declarator = declaration.declarations[0];
                                if (
                                    declarator &&
                                    isValidLocalFontDeclaration(declarator, fontName)
                                ) {
                                    const configObject = declarator.init
                                        ?.arguments[0] as t.ObjectExpression;
                                    const srcProp = configObject.properties.find((prop) =>
                                        isPropertyWithName(prop, 'src'),
                                    );

                                    if (
                                        srcProp &&
                                        t.isObjectProperty(srcProp) &&
                                        t.isArrayExpression(srcProp.value)
                                    ) {
                                        srcProp.value.elements.push(...srcArrayElements);
                                    }
                                }
                            }
                        }
                    },
                });
            } else {
                // Create a new font configuration
                const fontConfigObject = t.objectExpression([
                    t.objectProperty(t.identifier('src'), t.arrayExpression(srcArrayElements)),
                    t.objectProperty(
                        t.identifier('variable'),
                        t.stringLiteral(
                            `--font-${fontName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`,
                        ),
                    ),
                    t.objectProperty(t.identifier('display'), t.stringLiteral('swap')),
                    t.objectProperty(
                        t.identifier('fallback'),
                        t.arrayExpression([
                            t.stringLiteral('system-ui'),
                            t.stringLiteral('sans-serif'),
                        ]),
                    ),
                    t.objectProperty(t.identifier('preload'), t.booleanLiteral(true)),
                ]);

                const fontDeclaration = t.variableDeclaration('const', [
                    t.variableDeclarator(
                        t.identifier(fontName),
                        t.callExpression(t.identifier('localFont'), [fontConfigObject]),
                    ),
                ]);

                const exportDeclaration = t.exportNamedDeclaration(fontDeclaration, []);

                ast.program.body.push(exportDeclaration);

                if (!hasLocalFontImport) {
                    const importDeclaration = t.importDeclaration(
                        [t.importDefaultSpecifier(t.identifier('localFont'))],
                        t.stringLiteral('next/font/local'),
                    );
                    ast.program.body.unshift(importDeclaration);
                }
            }

            // Generate and write the updated code back to the file
            const { code } = generate(ast);
            await this.editorEngine.sandbox.writeFile(this.fontConfigPath, code);

            return true;
        } catch (error) {
            console.error('Error uploading fonts:', error);
            return false;
        }
    }
} 