import { makeAutoObservable } from 'mobx';
import type { Font } from '@onlook/models/assets';

export class FontStateManager {
    private _fonts: Font[] = [];
    private _systemFonts: Font[] = [];
    private _searchResults: Font[] = [];
    private _fontFamilies: Font[] = [];
    private _defaultFont: string | null = null;
    private _lastDefaultFont: string | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    setFonts(fonts: Font[]) {
        this._fonts = fonts;
    }

    setSystemFonts(fonts: Font[]) {
        this._systemFonts = fonts;
    }

    setSearchResults(fonts: Font[]) {
        this._searchResults = fonts;
    }

    setFontFamilies(fonts: Font[]) {
        this._fontFamilies = fonts;
    }

    setDefaultFont(fontId: string | null) {
        this._lastDefaultFont = this._defaultFont;
        this._defaultFont = fontId;
    }

    clear() {
        this._fonts = [];
        this._fontFamilies = [];
        this._systemFonts = [];
        this._searchResults = [];
        this._defaultFont = null;
        this._lastDefaultFont = null;
    }

    get fonts() {
        return this._fonts;
    }

    get fontFamilies() {
        return this._fontFamilies;
    }

    get systemFonts() {
        return this._systemFonts.filter(
            (fontFamily) => !this._fonts.some((font) => font.family === fontFamily.family),
        );
    }

    get defaultFont() {
        return this._defaultFont;
    }

    get lastDefaultFont() {
        return this._lastDefaultFont;
    }

    get searchResults() {
        return this._searchResults.filter(
            (fontFamily) => !this._fonts.some((font) => font.family === fontFamily.family),
        );
    }
} 