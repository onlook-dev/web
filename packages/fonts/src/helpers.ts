import { parse, type ParseResult } from '@babel/parser';
import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';
import type { Font } from '@onlook/models';
import {
    createFontFamilyProperty,
    isPropertyWithName,
    isThemeProperty,
    removeFontsFromClassName,
} from './utils';
import { generate } from '@babel/generator';
import { camelCase } from 'lodash';

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

export function removeFontFromConfigAST(font: Font, content: string) {
    const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    const fontIdToRemove = font.id;
    const importToRemove = font.family.replace(/\s+/g, '_');
    let removedFont = false;
    const fontFilesToDelete: string[] = [];
    // Track if any localFont declarations remain after removal
    let hasRemainingLocalFonts = false;

    traverse(ast, {
        ImportDeclaration(path) {
            if (path.node.source.value === 'next/font/google') {
                const importSpecifiers = path.node.specifiers.filter((specifier) => {
                    if (t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported)) {
                        return specifier.imported.name !== importToRemove;
                    }
                    return true;
                });
                if (importSpecifiers.length === 0) {
                    path.remove();
                } else if (importSpecifiers.length !== path.node.specifiers.length) {
                    path.node.specifiers = importSpecifiers;
                }
            }
        },

        ExportNamedDeclaration(path) {
            if (t.isVariableDeclaration(path.node.declaration)) {
                const declarations = path.node.declaration.declarations;

                for (let i = 0; i < declarations.length; i++) {
                    const declaration = declarations[i];

                    // Check if this is a localFont declaration (not the one being removed)
                    if (
                        declaration &&
                        t.isIdentifier(declaration.id) &&
                        declaration.id.name !== fontIdToRemove &&
                        t.isCallExpression(declaration.init) &&
                        t.isIdentifier(declaration.init.callee) &&
                        declaration.init.callee.name === 'localFont'
                    ) {
                        hasRemainingLocalFonts = true;
                    }

                    if (
                        declaration &&
                        t.isIdentifier(declaration.id) &&
                        declaration.id.name === fontIdToRemove
                    ) {
                        // Extract font file paths from the local font configuration
                        if (
                            t.isCallExpression(declaration.init) &&
                            t.isIdentifier(declaration.init.callee) &&
                            declaration.init.callee.name === 'localFont' &&
                            declaration.init.arguments.length > 0 &&
                            t.isObjectExpression(declaration.init.arguments[0])
                        ) {
                            const fontConfig = declaration.init.arguments[0];
                            const srcProp = fontConfig.properties.find(
                                (prop) =>
                                    t.isObjectProperty(prop) &&
                                    t.isIdentifier(prop.key) &&
                                    prop.key.name === 'src',
                            );

                            if (
                                srcProp &&
                                t.isObjectProperty(srcProp) &&
                                t.isArrayExpression(srcProp.value)
                            ) {
                                // Loop through the src array to find font file paths
                                srcProp.value.elements.forEach((element) => {
                                    if (t.isObjectExpression(element)) {
                                        const pathProp = element.properties.find(
                                            (prop) =>
                                                t.isObjectProperty(prop) &&
                                                t.isIdentifier(prop.key) &&
                                                prop.key.name === 'path',
                                        );

                                        if (
                                            pathProp &&
                                            t.isObjectProperty(pathProp) &&
                                            t.isStringLiteral(pathProp.value)
                                        ) {
                                            // Get the path value
                                            let fontFilePath = pathProp.value.value;
                                            if (fontFilePath.startsWith('../')) {
                                                fontFilePath = fontFilePath.substring(3); // Remove '../' prefix
                                            }
                                            fontFilesToDelete.push(fontFilePath);
                                        }
                                    }
                                });
                            }
                        }

                        if (declarations.length === 1) {
                            path.remove();
                        } else {
                            declarations.splice(i, 1);
                        }
                        removedFont = true;
                        break;
                    }
                }
            }
        },
    });

    return { removedFont, hasRemainingLocalFonts, fontFilesToDelete, ast };
}

export function removeFontFromThemeAST(fontId: string, content: string) {
    const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    let themeFound = false;
    let fontFamilyFound = false;

    // Find the theme.fontFamily property and remove the font
    traverse(ast, {
        ObjectProperty(path) {
            if (isThemeProperty(path)) {
                themeFound = true;

                // Look for fontFamily within theme
                if (t.isObjectExpression(path.node.value)) {
                    path.node.value.properties.forEach((prop, index) => {
                        if (isPropertyWithName(prop, 'fontFamily')) {
                            fontFamilyFound = true;

                            // Remove the font from fontFamily
                            if (t.isObjectProperty(prop) && t.isObjectExpression(prop.value)) {
                                prop.value.properties = prop.value.properties.filter((fontProp) => {
                                    if (
                                        t.isObjectProperty(fontProp) &&
                                        t.isIdentifier(fontProp.key)
                                    ) {
                                        return fontProp.key.name !== camelCase(fontId);
                                    }
                                    return true;
                                });
                            }
                        }
                    });
                }
            }
        },
    });

    if (themeFound && fontFamilyFound) {
        return ast;
    }

    return null;
}

export function addFontToConfigAST(font: Font, content: string) {
    const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    let themeFound = false;
    let fontFamilyFound = false;
    const fontId = camelCase(font.id);
    const fontVariable = font.variable;
    const fontFamilyProperty = createFontFamilyProperty(font);

    // Find or create the theme.fontFamily property
    traverse(ast, {
        ObjectProperty(path) {
            if (isThemeProperty(path)) {
                themeFound = true;

                // Look for fontFamily within theme
                if (t.isObjectExpression(path.node.value)) {
                    let fontFamilyProperty = null;

                    for (const prop of path.node.value.properties) {
                        if (isPropertyWithName(prop, 'fontFamily')) {
                            fontFamilyProperty = prop;
                            fontFamilyFound = true;
                            break;
                        }
                    }

                    // If fontFamily exists, add the new font
                    if (
                        fontFamilyFound &&
                        fontFamilyProperty &&
                        t.isObjectProperty(fontFamilyProperty) &&
                        t.isObjectExpression(fontFamilyProperty.value)
                    ) {
                        // Check if font already exists
                        const fontExists = fontFamilyProperty.value.properties.some((prop) =>
                            isPropertyWithName(prop, fontId),
                        );

                        if (!fontExists) {
                            // Add the new font
                            fontFamilyProperty.value.properties.push(
                                t.objectProperty(
                                    t.identifier(fontId),
                                    t.arrayExpression([
                                        t.stringLiteral(`var(${fontVariable})`),
                                        t.stringLiteral('sans-serif'),
                                    ]),
                                ),
                            );
                        }
                    }
                    // If fontFamily doesn't exist, create it
                    else if (!fontFamilyFound) {
                        path.node.value.properties.push(fontFamilyProperty as t.ObjectProperty);
                    }
                }
            }
        },
    });

    // If theme doesn't exist, create it
    if (!themeFound) {
        traverse(ast, {
            ObjectExpression(path) {
                if (
                    path.parent.type === 'VariableDeclarator' ||
                    path.parent.type === 'ReturnStatement'
                ) {
                    path.node.properties.push(
                        t.objectProperty(
                            t.identifier('theme'),
                            t.objectExpression([fontFamilyProperty]),
                        ),
                    );
                }
            },
        });
    }

    return ast;
}

export function updateFileWithImport(
    fontImportPath: string,
    content: string,
    ast: ParseResult<t.File>,
    fontName: string,
): string {
    const { code } = generate(ast);
    const importRegex = new RegExp(`import\\s*{([^}]*)}\\s*from\\s*['"]${fontImportPath}['"]`);

    const importMatch = content.match(importRegex);

    let newContent = code;

    if (importMatch?.[1]) {
        const currentImports = importMatch[1];
        if (!currentImports.includes(fontName)) {
            const newImports = currentImports.trim() + `, ${fontName}`;
            newContent = newContent.replace(
                importRegex,
                `import { ${newImports} } from '${fontImportPath}'`,
            );
        }
    } else {
        const fontImport = `import { ${fontName} } from '${fontImportPath}';`;
        newContent = fontImport + '\n' + newContent;
    }

    return newContent;
}

export function createFontConfigAst(font: Font) {
    return t.objectExpression([
        t.objectProperty(
            t.identifier('subsets'),
            t.arrayExpression(font.subsets.map((s) => t.stringLiteral(s))),
        ),
        t.objectProperty(
            t.identifier('weight'),
            t.arrayExpression((font.weight ?? []).map((w) => t.stringLiteral(w))),
        ),
        t.objectProperty(
            t.identifier('style'),
            t.arrayExpression((font.styles ?? []).map((s) => t.stringLiteral(s))),
        ),
        t.objectProperty(t.identifier('variable'), t.stringLiteral(font.variable)),
        t.objectProperty(t.identifier('display'), t.stringLiteral('swap')),
    ]);
}

export function createFontExportAst(font: Font) {
    const fontConfigObject = createFontConfigAst(font);
    const importName = font.family.replace(/\s+/g, '_');
    const fontName = camelCase(font.id);

    const fontDeclaration = t.variableDeclaration('const', [
        t.variableDeclarator(
            t.identifier(fontName),
            t.callExpression(t.identifier(importName), [fontConfigObject]),
        ),
    ]);

    return t.exportNamedDeclaration(fontDeclaration, []);
}

export function createGoogleFontImportAst(font: Font) {
    const importName = font.family.replace(/\s+/g, '_');
    return t.importDeclaration(
        [t.importSpecifier(t.identifier(importName), t.identifier(importName))],
        t.stringLiteral('next/font/google'),
    );
}

export function updateGoogleFontImportAst(font: Font, ast: ParseResult<t.File>) {
    const importName = font.family.replace(/\s+/g, '_');
    traverse(ast, {
        ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
            if (path.node.source.value === 'next/font/google') {
                const newSpecifiers = [...path.node.specifiers];
                newSpecifiers.push(
                    t.importSpecifier(t.identifier(importName), t.identifier(importName)),
                );
            }
        },
    });
    return ast;
}

export function isFontExists(fontName: string, content: string) {
    const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    let existingFontNode: t.ExportNamedDeclaration | null = null;

    traverse(ast, {
        ExportNamedDeclaration(path) {
            if (
                path.node.declaration &&
                t.isVariableDeclaration(path.node.declaration) &&
                path.node.declaration.declarations.some(
                    (declaration) =>
                        t.isIdentifier(declaration.id) && declaration.id.name === fontName,
                )
            ) {
                existingFontNode = path.node;
            }
        },
    });

    return { existingFontNode };
}
