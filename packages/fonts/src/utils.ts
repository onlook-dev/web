import { parse } from '@babel/parser';
import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';
import type { Font } from '@onlook/models';
import { removeFontsFromClassName } from './helper';
import { generate } from '@babel/generator';

export const extractFontImport = (content: string): Font[] => {
    const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    const fontImports: Record<string, string> = {};
    const fonts: Font[] = [];

    traverse(ast, {
        // Extract font imports from 'next/font/google' and 'next/font/local'
        ImportDeclaration(path) {
            const source = path.node.source.value;
            if (source === 'next/font/google') {
                path.node.specifiers.forEach((specifier) => {
                    if (t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported)) {
                        fontImports[specifier.imported.name] = specifier.imported.name;
                    }
                });
            } else if (source === 'next/font/local') {
                path.node.specifiers.forEach((specifier) => {
                    if (t.isImportDefaultSpecifier(specifier) && t.isIdentifier(specifier.local)) {
                        fontImports[specifier.local.name] = 'localFont';
                    }
                });
            }
        },

        VariableDeclaration(path) {
            const parentNode = path.parent;
            if (!t.isExportNamedDeclaration(parentNode)) {
                return;
            }

            path.node.declarations.forEach((declarator) => {
                if (!t.isIdentifier(declarator.id) || !declarator.init) {
                    return;
                }

                const fontId = declarator.id.name;

                if (t.isCallExpression(declarator.init)) {
                    const callee = declarator.init.callee;

                    let fontType = '';
                    if (t.isIdentifier(callee) && fontImports[callee.name]) {
                        fontType = fontImports[callee.name] ?? '';
                    }

                    const configArg = declarator.init.arguments[0];
                    if (t.isObjectExpression(configArg)) {
                        const fontConfig = extractFontConfig(fontId, fontType, configArg);
                        fonts.push(fontConfig);
                    }
                }
            });
        },
    });

    return fonts;
};

export function extractFontConfig(
    fontId: string,
    fontType: string,
    configArg: t.ObjectExpression,
): Font {
    const fontConfig: Record<string, any> = {
        id: fontId,
        family: fontType === 'localFont' ? fontId : fontType.replace(/_/g, ' '),
        type: fontType === 'localFont' ? 'local' : 'google',
        subsets: [],
        weight: [],
        styles: [],
        variable: '',
    };

    configArg.properties.forEach((prop) => {
        if (!t.isObjectProperty(prop) || !t.isIdentifier(prop.key)) {
            return;
        }

        const propName = prop.key.name;

        if (propName === 'variable' && t.isStringLiteral(prop.value)) {
            fontConfig.variable = prop.value.value;
        }

        if (propName === 'subsets' && t.isArrayExpression(prop.value)) {
            fontConfig.subsets = prop.value.elements
                .filter((element): element is t.StringLiteral => t.isStringLiteral(element))
                .map((element) => element.value);
        }

        if ((propName === 'weight' || propName === 'weights') && t.isArrayExpression(prop.value)) {
            fontConfig.weight = prop.value.elements
                .map((element) => {
                    if (t.isStringLiteral(element)) {
                        return element.value;
                    } else if (t.isNumericLiteral(element)) {
                        return element.value.toString();
                    }
                    return null;
                })
                .filter((weight): weight is string => weight !== null && !isNaN(Number(weight)));
        }

        if ((propName === 'style' || propName === 'styles') && t.isArrayExpression(prop.value)) {
            fontConfig.styles = prop.value.elements
                .filter((element): element is t.StringLiteral => t.isStringLiteral(element))
                .map((element) => element.value);
        }

        // Handle local font src property
        if (propName === 'src' && t.isArrayExpression(prop.value) && fontType === 'localFont') {
            const srcConfigs = prop.value.elements
                .filter((element): element is t.ObjectExpression => t.isObjectExpression(element))
                .map((element) => {
                    const srcConfig: Record<string, string> = {};
                    element.properties.forEach((srcProp) => {
                        if (t.isObjectProperty(srcProp) && t.isIdentifier(srcProp.key)) {
                            const srcPropName = srcProp.key.name;
                            if (t.isStringLiteral(srcProp.value)) {
                                srcConfig[srcPropName] = srcProp.value.value;
                            }
                        }
                    });
                    return srcConfig;
                });

            fontConfig.weight = [...new Set(srcConfigs.map((config) => config.weight))];
            fontConfig.styles = [...new Set(srcConfigs.map((config) => config.style))];
        }
    });

    return fontConfig as Font;
}

export function extractExistingFontImport(content: string): { code?: string; fonts: Font[] } {
    try {
        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        const fontImports: Record<string, string> = {};
        const fontVariables: string[] = [];
        const fonts: Font[] = [];
        let updatedAst = false;

        traverse(ast, {
            ImportDeclaration(path) {
                if (!path.node?.source?.value) {
                    return;
                }

                const source = path.node.source.value;
                if (source === 'next/font/google') {
                    if (!path.node.specifiers) {
                        return;
                    }

                    path.node.specifiers.forEach((specifier) => {
                        if (t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported)) {
                            fontImports[specifier.imported.name] = specifier.imported.name;
                            try {
                                path.remove();
                            } catch (removeError) {
                                console.error('Error removing font import:', removeError);
                            }
                        }
                    });
                } else if (source === 'next/font/local') {
                    if (!path.node.specifiers) {
                        return;
                    }

                    path.node.specifiers.forEach((specifier) => {
                        if (
                            t.isImportDefaultSpecifier(specifier) &&
                            t.isIdentifier(specifier.local)
                        ) {
                            fontImports[specifier.local.name] = 'localFont';
                            try {
                                path.remove();
                            } catch (removeError) {
                                console.error('Error removing font import:', removeError);
                            }
                        }
                    });
                }
            },

            VariableDeclaration(path) {
                if (!path.node?.declarations) {
                    return;
                }

                path.node.declarations.forEach((declarator) => {
                    if (!t.isIdentifier(declarator.id) || !declarator.init) {
                        return;
                    }

                    if (t.isCallExpression(declarator.init)) {
                        const callee = declarator.init.callee;
                        if (t.isIdentifier(callee) && fontImports[callee.name]) {
                            const fontType = fontImports[callee.name] ?? '';
                            const configArg = declarator.init.arguments[0];
                            fontVariables.push(declarator.id.name);

                            if (t.isObjectExpression(configArg)) {
                                const fontConfig = extractFontConfig(
                                    declarator.id.name,
                                    fontType,
                                    configArg,
                                );

                                if (!fontConfig.variable) {
                                    fontConfig.variable = `--font-${declarator.id.name}`;
                                }

                                fonts.push(fontConfig);
                            }
                            updatedAst = true;
                            try {
                                path.remove();
                            } catch (removeError) {
                                console.error('Error removing font variable:', removeError);
                            }
                        }
                    }
                });
            },

            JSXOpeningElement(path) {
                if (!path.node || !t.isJSXIdentifier(path.node.name) || !path.node.attributes) {
                    return;
                }

                path.node.attributes.forEach((attr) => {
                    if (
                        t.isJSXAttribute(attr) &&
                        t.isJSXIdentifier(attr.name) &&
                        attr.name.name === 'className'
                    ) {
                        try {
                            if (removeFontsFromClassName(attr, { fontIds: fontVariables })) {
                                updatedAst = true;
                            }
                        } catch (classNameError) {
                            console.error('Error processing className:', classNameError);
                        }
                    }
                });
            },
        });

        if (updatedAst) {
            try {
                const { code } = generate(ast);
                return { code, fonts };
            } catch (generateError) {
                console.error('Error generating code from AST:', generateError);
            }
        }

        return { fonts };
    } catch (error) {
        console.error('Error extracting existing font import:', error);
        return { fonts: [] };
    }
}

export function validateFontImportAndExport(
    content: string,
    importName: string,
    fontName: string,
): { hasGoogleFontImport: boolean; hasImportName: boolean; hasFontExport: boolean } {
    const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });
    let hasGoogleFontImport = false;
    let hasImportName = false;
    let hasFontExport = false;

    traverse(ast, {
        ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
            if (path.node.source.value === 'next/font/google') {
                hasGoogleFontImport = true;
                path.node.specifiers.forEach((specifier) => {
                    if (
                        t.isImportSpecifier(specifier) &&
                        t.isIdentifier(specifier.imported) &&
                        specifier.imported.name === importName
                    ) {
                        hasImportName = true;
                    }
                });
            }
        },
        ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
            if (
                t.isVariableDeclaration(path.node.declaration) &&
                path.node.declaration.declarations.some(
                    (declaration) =>
                        t.isIdentifier(declaration.id) && declaration.id.name === fontName,
                )
            ) {
                hasFontExport = true;
            }
        },
    });

    return { hasGoogleFontImport, hasImportName, hasFontExport };
}
