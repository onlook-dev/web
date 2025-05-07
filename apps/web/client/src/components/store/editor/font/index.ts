import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '..';
import {
    createStringLiteralWithFont,
    createTemplateLiteralWithFont,
    extractExistingFontImport,
    extractFontImport,
    findFontClass,
    removeFontsFromClassName,
    updateFileWithImport,
} from '@onlook/fonts';
import type { Font } from '@onlook/models/assets';
import type { ProjectManager } from '@/components/store/project';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { generate } from '@babel/generator';
import { camelCase } from 'lodash';
import { DefaultSettings } from '@onlook/constants';
import * as pathModule from 'path';
import type { ParseResult } from '@babel/parser';
import { normalizePath } from '../sandbox/helpers';
import * as t from '@babel/types';
import { FontSearchManager } from './FontSearchManager';
import { FontStateManager } from './FontStateManager';
import { FontConfigManager } from './FontConfigManager';
import { FontFileManager } from './FontFileManager';
type TraverseCallback = (
    classNameAttr: t.JSXAttribute,
    ast: ParseResult<t.File>,
) => void | Promise<void>;

interface FontFile {
    file: { name: string; buffer: number[] };
    name: string;
    weight: string;
    style: string;
}

interface RawFont {
    id: string;
    family: string;
    subsets: string[];
    weights: string[];
    styles: string[];
    defSubset: string;
    variable: boolean;
    lastModified: string;
    category: string;
    type: string;
}

interface SearchDocument {
    id: string;
    family: string;
    subsets: string[];
    variable: boolean;
    weights: string[];
    styles: string[];
}

type DocumentData = {
    id: string;
    content: string;
};

type SearchResult = {
    field: string;
    result: Array<{
        doc: DocumentData;
        score: number;
    }>;
};

interface CodeDiff {
    original: string;
    generated: string;
    path: string;
}

export class FontManager {
    private fontSearchManager: FontSearchManager;
    private fontStateManager: FontStateManager;
    private fontConfigManager: FontConfigManager;
    private fontFileManager: FontFileManager;
    private disposers: Array<() => void> = [];

    constructor(
        private editorEngine: EditorEngine,
        private projectManager: ProjectManager,
    ) {
        makeAutoObservable(this);

        this.fontSearchManager = new FontSearchManager();
        this.fontStateManager = new FontStateManager();
        this.fontConfigManager = new FontConfigManager(editorEngine);
        this.fontFileManager = new FontFileManager(editorEngine);

        this.loadInitialFonts();

        const fontConfigDisposer = reaction(
            () => this.editorEngine.sandbox.readFile(this.fontConfigPath),
            (content) => {
                this.syncFontsWithConfigs();
            },
            { fireImmediately: true },
        );

        const defaultFontDisposer = reaction(
            () => this.fontStateManager.fonts.length,
            async (fontsCount) => {
                if (fontsCount > 0 && this.editorEngine.sandbox) {
                    try {
                        const defaultFontId = await this.getDefaultFont();
                        if (defaultFontId) {
                            const fontObj = this.fontStateManager.fonts.find(
                                (f: Font) => f.id === defaultFontId,
                            );
                            if (fontObj) {
                                const codeDiff = await this.setProjectDefaultFont(fontObj);
                                if (codeDiff) {
                                    await this.editorEngine.history.push({
                                        type: 'write-code',
                                        diffs: [codeDiff],
                                    });
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error setting default font:', error);
                    }
                }
            },
            { fireImmediately: true },
        );

        this.disposers.push(fontConfigDisposer, defaultFontDisposer);
    }

    private fontConfigPath = normalizePath(DefaultSettings.FONT_CONFIG);
    private fontImportPath = normalizePath('app/fonts.ts');
    private layoutPath = normalizePath('app/layout.tsx');

    private async loadInitialFonts() {
        const { fonts, hasMore } = await this.fontSearchManager.fetchNextFontBatch();
        this.fontStateManager.setSystemFonts(fonts);
    }

    async scanFonts() {
        if (!this.checkingProjectConfig()) {
            return [];
        }

        try {
            let existedFonts: Font[] | undefined = [];
            try {
                existedFonts = await this.scanExistingFonts();
                if (existedFonts && existedFonts.length > 0) {
                    await this.addFonts(existedFonts);
                }
            } catch (existingFontsError) {
                console.error('Error scanning existing fonts:', existingFontsError);
            }

            const content = (await this.editorEngine.sandbox?.readFile(this.fontConfigPath)) ?? '';
            if (!content) {
                this.fontStateManager.setFonts([]);
                return [];
            }

            try {
                const fonts = extractFontImport(content);
                this.fontStateManager.setFonts(fonts);
                return fonts;
            } catch (parseError) {
                console.error('Error parsing font file:', parseError);
                return [];
            }
        } catch (error) {
            console.error('Error scanning fonts:', error);
            return [];
        }
    }

    private async scanExistingFonts(): Promise<Font[] | undefined> {
        if (!this.checkingProjectConfig()) {
            return [];
        }

        try {
            const content = await this.editorEngine.sandbox.readFile(this.layoutPath);
            if (!content) {
                console.log(`Layout file is empty or doesn't exist: ${this.layoutPath}`);
                return [];
            }

            const { fonts, code } = extractExistingFontImport(content);
            if (code) {
                await this.editorEngine.sandbox.writeFile(this.layoutPath, code);
            }
            return fonts;
        } catch (error) {
            console.error('Error scanning existing fonts:', error);
            return [];
        }
    }

    async addFont(font: Font): Promise<boolean> {
        const success = await this.fontConfigManager.addFont(font);
        if (success) {
            await this.scanFonts();
            await this.fontSearchManager.loadFontBatch([font]);
        }
        return success;
    }

    async addFonts(fonts: Font[]) {
        for (const font of fonts) {
            await this.addFont(font);
        }
    }

    async removeFont(font: Font): Promise<boolean> {
        const success = await this.fontConfigManager.removeFont(font);
        if (success) {
            await this.scanFonts();
            if (font.id === this.fontStateManager.defaultFont) {
                this.fontStateManager.setDefaultFont(null);
            }
        }
        return success;
    }

    async setDefaultFont(font: Font) {
        if (!this.checkingProjectConfig()) {
            return false;
        }

        try {
            const prevDefaultFont = this.fontStateManager.defaultFont;
            this.fontStateManager.setDefaultFont(font.id);

            const codeDiff = await this.setProjectDefaultFont(font);

            if (codeDiff) {
                await this.editorEngine.sandbox.writeFile(codeDiff.path, codeDiff.generated);
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Error setting default font:', error);
            return false;
        }
    }

    async uploadFonts(fontFiles: FontFile[]) {
        const success = await this.fontFileManager.uploadFonts(fontFiles);
        if (success) {
            await this.scanFonts();
        }
        return success;
    }

    async searchFonts(query: string): Promise<Font[]> {
        const fonts = await this.fontSearchManager.searchFonts(query);
        this.fontStateManager.setSearchResults(fonts);
        return fonts;
    }

    async fetchNextFontBatch(): Promise<{ fonts: Font[]; hasMore: boolean }> {
        const result = await this.fontSearchManager.fetchNextFontBatch();
        this.fontStateManager.setSystemFonts([
            ...this.fontStateManager.systemFonts,
            ...result.fonts,
        ]);
        return result;
    }

    resetFontFetching() {
        this.fontSearchManager.resetFontFetching();
    }

    private checkingProjectConfig(): boolean {
        if (!this.projectManager.project) {
            console.error('No project provided');
            return false;
        }

        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return false;
        }

        return true;
    }

    private async syncFontsWithConfigs() {
        if (!this.checkingProjectConfig()) {
            return;
        }

        try {
            const currentFonts = await this.scanFonts();

            const removedFonts = this.fontStateManager.fonts.filter(
                (prevFont) => !currentFonts.some((currFont) => currFont.id === prevFont.id),
            );

            const addedFonts = currentFonts.filter(
                (currFont) =>
                    !this.fontStateManager.fonts.some((prevFont) => currFont.id === prevFont.id),
            );

            for (const font of removedFonts) {
                await this.fontConfigManager.removeFontFromTailwindConfig(font);
                await this.removeFontVariableFromLayout(font.id);
            }

            if (addedFonts.length > 0) {
                for (const font of addedFonts) {
                    await this.addFontVariableToLayout(font.id);
                    await this.fontConfigManager.updateTailwindFontConfig(font);
                }
            }

            if (removedFonts.length > 0 || addedFonts.length > 0) {
                this.fontStateManager.setFonts(currentFonts);
            }
        } catch (error) {
            console.error('Error syncing fonts:', error);
        }
    }

    // Getters
    get fonts() {
        return this.fontStateManager.fonts;
    }

    get fontFamilies() {
        return this.fontStateManager.fontFamilies;
    }

    get systemFonts() {
        return this.fontStateManager.systemFonts;
    }

    get defaultFont() {
        return this.fontStateManager.defaultFont;
    }

    get searchResults() {
        return this.fontStateManager.searchResults;
    }

    get isFetching() {
        return this.fontSearchManager.isFetching;
    }

    get currentFontIndex() {
        return this.fontSearchManager.currentFontIndex;
    }

    get hasMoreFonts() {
        return this.fontSearchManager.hasMoreFonts;
    }

    clear() {
        this.fontStateManager.clear();
        this.fontSearchManager.resetFontFetching();

        // Clean up all reactions
        this.disposers.forEach((disposer) => disposer());
        this.disposers = [];
    }

    /**
     * Adds a font variable to specified target elements in a file
     */
    private async addFontVariableToElement(
        filePath: string,
        fontName: string,
        targetElements: string[],
    ): Promise<void> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            return;
        }
        const normalizedFilePath = normalizePath(filePath);

        try {
            const content = await sandbox.readFile(normalizedFilePath);
            if (!content) {
                console.error(`Failed to read file: ${filePath}`);
                return;
            }
            let updatedAst = false;
            let targetElementFound = false;

            await this.traverseClassName(
                normalizedFilePath,
                targetElements,
                async (classNameAttr, ast) => {
                    targetElementFound = true;
                    const fontVarExpr = t.memberExpression(
                        t.identifier(fontName),
                        t.identifier('variable'),
                    );

                    if (t.isStringLiteral(classNameAttr.value)) {
                        if (classNameAttr.value.value === '') {
                            const quasis = [
                                t.templateElement({ raw: '', cooked: '' }, false),
                                t.templateElement({ raw: '', cooked: '' }, true),
                            ];
                            classNameAttr.value = t.jsxExpressionContainer(
                                t.templateLiteral(quasis, [fontVarExpr]),
                            );
                        } else {
                            classNameAttr.value = t.jsxExpressionContainer(
                                createTemplateLiteralWithFont(
                                    fontVarExpr,
                                    t.stringLiteral(classNameAttr.value.value),
                                ),
                            );
                        }
                        updatedAst = true;
                    } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
                        const expr = classNameAttr.value.expression;

                        if (t.isTemplateLiteral(expr)) {
                            const hasFont = expr.expressions.some(
                                (e) =>
                                    t.isMemberExpression(e) &&
                                    t.isIdentifier(e.object) &&
                                    e.object.name === fontName &&
                                    t.isIdentifier(e.property) &&
                                    e.property.name === 'variable',
                            );

                            if (!hasFont) {
                                if (expr.expressions.length > 0) {
                                    const lastQuasi = expr.quasis[expr.quasis.length - 1];
                                    if (lastQuasi) {
                                        lastQuasi.value.raw = lastQuasi.value.raw + ' ';
                                        lastQuasi.value.cooked = lastQuasi.value.cooked + ' ';
                                    }
                                }
                                expr.expressions.push(fontVarExpr);
                                if (expr.quasis.length <= expr.expressions.length) {
                                    expr.quasis.push(
                                        t.templateElement({ raw: '', cooked: '' }, true),
                                    );
                                }
                                updatedAst = true;
                            }
                        } else if (t.isIdentifier(expr) || t.isMemberExpression(expr)) {
                            classNameAttr.value = t.jsxExpressionContainer(
                                createTemplateLiteralWithFont(fontVarExpr, expr),
                            );
                            updatedAst = true;
                        }
                    }

                    if (updatedAst) {
                        const newContent = updateFileWithImport(
                            this.fontImportPath,
                            content,
                            ast,
                            fontName,
                        );
                        await sandbox.writeFile(normalizedFilePath, newContent);
                    }
                },
            );

            if (!targetElementFound) {
                console.log(
                    `Could not find target elements (${targetElements.join(', ')}) in ${normalizedFilePath}`,
                );
            }
        } catch (error) {
            console.error(`Error adding font variable to ${normalizedFilePath}:`, error);
        }
    }

    /**
     * Adds a font variable to the appropriate layout file
     */
    private async addFontVariableToLayout(fontId: string): Promise<boolean> {
        try {
            const fontName = camelCase(fontId);

            await this.addFontVariableToElement(this.layoutPath, fontName, ['html']);

            return true;
        } catch (error) {
            console.error(`Error adding font variable to layout:`, error);
            return false;
        }
    }

    /**
     * Removes a font variable from the layout file
     */
    private async removeFontVariableFromLayout(fontId: string): Promise<boolean> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            return false;
        }

        try {
            const layoutPath = pathModule.join('app', 'layout.tsx');
            const targetElements = ['html'];

            const normalizedFilePath = normalizePath(layoutPath);

            const content = (await sandbox.readFile(normalizedFilePath)) ?? '';
            if (!content) {
                return false;
            }

            let updatedAst = false;
            let ast: ParseResult<t.File> | null = null;
            const fontName = camelCase(fontId);

            await this.traverseClassName(
                normalizedFilePath,
                targetElements,
                async (classNameAttr, currentAst) => {
                    ast = currentAst;
                    if (
                        removeFontsFromClassName(classNameAttr, {
                            fontIds: [fontName],
                        })
                    ) {
                        updatedAst = true;
                    }
                },
            );

            if (updatedAst && ast) {
                // Remove the font import if it exists
                const importRegex = new RegExp(
                    `import\\s*{([^}]*)}\\s*from\\s*['"]${this.fontImportPath}['"]`,
                );
                const importMatch = content.match(importRegex);

                let newContent = generate(ast).code;

                if (importMatch?.[1]) {
                    const currentImports = importMatch[1];
                    const newImports = currentImports
                        .split(',')
                        .map((imp) => imp.trim())
                        .filter((imp) => {
                            const importName = imp.split(' as ')[0]?.trim();
                            return importName !== fontName;
                        })
                        .join(', ');

                    if (newImports) {
                        newContent = newContent.replace(
                            importRegex,
                            `import { ${newImports} } from '${this.fontImportPath}'`,
                        );
                    } else {
                        // Remove the entire import statement including the semicolon and optional newline
                        newContent = newContent.replace(
                            new RegExp(`${importRegex.source};?\\n?`),
                            '',
                        );
                    }
                }

                return await sandbox.writeFile(normalizedFilePath, newContent);
            }
            return false;
        } catch (error) {
            console.error(`Error removing font variable`, error);
            return false;
        }
    }

    /**
     * Updates the font in a layout file by modifying className attributes
     */
    private async updateFontInLayout(
        filePath: string,
        font: Font,
        targetElements: string[],
    ): Promise<CodeDiff | null> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            return null;
        }

        let updatedAst = false;
        const fontClassName = `font-${font.id}`;
        let result = null;

        const normalizedFilePath = normalizePath(filePath);

        const content = await sandbox.readFile(normalizedFilePath);
        if (!content) {
            console.error(`Failed to read file: ${filePath}`);
            return null;
        }

        await this.traverseClassName(normalizedFilePath, targetElements, (classNameAttr, ast) => {
            if (t.isStringLiteral(classNameAttr.value)) {
                classNameAttr.value = createStringLiteralWithFont(
                    fontClassName,
                    classNameAttr.value.value,
                );
                updatedAst = true;
            } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
                const expr = classNameAttr.value.expression;
                if (t.isTemplateLiteral(expr)) {
                    const newQuasis = [
                        t.templateElement(
                            { raw: fontClassName + ' ', cooked: fontClassName + ' ' },
                            false,
                        ),
                        ...expr.quasis.slice(1),
                    ];

                    expr.quasis = newQuasis;
                    updatedAst = true;
                }
            }
            if (updatedAst) {
                const { code } = generate(ast);
                const codeDiff: CodeDiff = {
                    original: content,
                    generated: code,
                    path: normalizedFilePath,
                };
                result = codeDiff;
            }
        });

        return result;
    }

    /**
     * Detects the current font being used in a layout file
     */
    private async detectCurrentFont(
        filePath: string,
        targetElements: string[],
    ): Promise<string | null> {
        let currentFont: string | null = null;

        const normalizedFilePath = normalizePath(filePath);

        await this.traverseClassName(normalizedFilePath, targetElements, (classNameAttr) => {
            if (t.isStringLiteral(classNameAttr.value)) {
                currentFont = findFontClass(classNameAttr.value.value);
            } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
                const expr = classNameAttr.value.expression;
                if (t.isTemplateLiteral(expr)) {
                    const firstQuasi = expr.quasis[0];
                    if (firstQuasi) {
                        currentFont = findFontClass(firstQuasi.value.raw);
                    }
                }
            }
        });

        return currentFont;
    }

    /**
     * Gets the default font from the project
     */
    private async getDefaultFont(): Promise<string | null> {
        try {
            const layoutPath = pathModule.join('app', 'layout.tsx');
            return await this.detectCurrentFont(normalizePath(layoutPath), ['html']);
        } catch (error) {
            console.error('Error getting current font:', error);
            return null;
        }
    }

    /**
     * Sets the default font for the project
     */
    private async setProjectDefaultFont(font: Font): Promise<CodeDiff | null> {
        try {
            const layoutPath = pathModule.join('app', 'layout.tsx');
            return await this.updateFontInLayout(normalizePath(layoutPath), font, ['html']);
        } catch (error) {
            console.error('Error setting default font:', error);
            return null;
        }
    }

    /**
     * Traverses className attributes in a file and applies a callback
     */
    private async traverseClassName(
        filePath: string,
        targetElements: string[],
        callback: TraverseCallback,
    ): Promise<void> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return;
        }

        try {
            const content = await sandbox.readFile(filePath);
            if (!content) {
                console.error(`Failed to read file: ${filePath}`);
                return;
            }

            const ast = parse(content, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx'],
            });

            traverse(ast, {
                JSXOpeningElement(path) {
                    if (
                        !t.isJSXIdentifier(path.node.name) ||
                        !targetElements.includes(path.node.name.name)
                    ) {
                        return;
                    }

                    const classNameAttr = path.node.attributes.find(
                        (attr): attr is t.JSXAttribute =>
                            t.isJSXAttribute(attr) &&
                            t.isJSXIdentifier(attr.name) &&
                            attr.name.name === 'className',
                    );

                    if (!classNameAttr) {
                        const newClassNameAttr = t.jsxAttribute(
                            t.jsxIdentifier('className'),
                            t.stringLiteral(''),
                        );
                        path.node.attributes.push(newClassNameAttr);
                        callback(newClassNameAttr, ast);
                        return;
                    }
                    callback(classNameAttr, ast);
                },
            });
        } catch (error) {
            console.error(`Error traversing className in ${filePath}:`, error);
        }
    }
}
