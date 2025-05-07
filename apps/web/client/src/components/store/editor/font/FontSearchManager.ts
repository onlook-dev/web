import * as FlexSearch from 'flexsearch';
import type { Font } from '@onlook/models/assets';
import * as WebFont from 'webfontloader';
import { FAMILIES } from '@onlook/fonts';

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

export class FontSearchManager {
    private _fontSearchIndex: FlexSearch.Document;
    private _allFontFamilies: RawFont[] = FAMILIES as RawFont[];
    private _currentFontIndex = 0;
    private _batchSize = 20;
    private _isFetching = false;

    constructor() {
        this._fontSearchIndex = new FlexSearch.Document({
            document: {
                id: 'id',
                index: ['family'],
                store: true,
            },
            tokenize: 'forward',
        });

        // Add all font families to the search index
        this._allFontFamilies.forEach((font) => {
            this._fontSearchIndex.add(font.id, {
                id: font.id,
                family: font.family,
                subsets: font.subsets,
                variable: font.variable,
                weights: font.weights,
                styles: font.styles,
            });
        });
    }

    private convertFont(font: RawFont): Font {
        return {
            ...font,
            weight: font.weights,
            styles: font.styles || [],
            variable: `--font-${font.id}`,
        };
    }

    async searchFonts(query: string): Promise<Font[]> {
        if (!query) {
            return [];
        }

        try {
            // Search using FlexSearch
            const searchResults = await this._fontSearchIndex.search(query, {
                limit: 20,
                suggest: true,
                enrich: true,
            });

            const fonts = Object.values(searchResults)
                .flatMap((result) => result.result)
                .map((font) => this.convertFont(font.doc));

            if (fonts.length === 0) {
                return [];
            }

            await this.loadFontBatch(fonts);
            return fonts;
        } catch (error) {
            console.error('Error searching fonts:', error);
            return [];
        }
    }

    async fetchNextFontBatch(): Promise<{ fonts: Font[]; hasMore: boolean }> {
        if (this._isFetching) {
            console.log('Already fetching fonts, please wait...');
            return {
                fonts: [],
                hasMore: this._currentFontIndex < this._allFontFamilies.length,
            };
        }

        this._isFetching = true;

        try {
            const start = this._currentFontIndex;
            const end = Math.min(start + this._batchSize, this._allFontFamilies.length);

            if (start >= this._allFontFamilies.length) {
                return { fonts: [], hasMore: false };
            }

            const batchFonts = this._allFontFamilies
                .slice(start, end)
                .map((font) => this.convertFont(font));

            await this.loadFontBatch(batchFonts);
            this._currentFontIndex = end;

            return {
                fonts: batchFonts,
                hasMore: end < this._allFontFamilies.length,
            };
        } catch (error) {
            console.error('Error fetching font batch:', error);
            throw error;
        } finally {
            this._isFetching = false;
        }
    }

    async loadFontBatch(fonts: Font[]): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            WebFont.load({
                google: {
                    families: fonts.map((font) => font.family),
                },
                active: () => {
                    resolve();
                },
                inactive: () => {
                    console.warn(`Failed to load font batch`);
                    reject(new Error('Font loading failed'));
                },
                timeout: 30000, // 30 second timeout
            });
        });
    }

    resetFontFetching() {
        this._currentFontIndex = 0;
        this._isFetching = false;
    }

    get isFetching() {
        return this._isFetching;
    }

    get currentFontIndex() {
        return this._currentFontIndex;
    }

    get hasMoreFonts() {
        return this._currentFontIndex < this._allFontFamilies.length;
    }
} 