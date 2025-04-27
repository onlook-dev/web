import type { SandboxSession } from "@codesandbox/sdk";

export class FileSyncManager {
    private session: SandboxSession;
    private cache: Map<string, string>;
    private storageKey = 'file-sync-cache';

    constructor(session: SandboxSession, private localforage: LocalForage) {
        this.cache = new Map();
        this.session = session;
        this.restoreFromLocalStorage();
    }

    private async restoreFromLocalStorage() {
        try {
            const storedCache = await this.localforage.getItem<Record<string, string>>(this.storageKey);
            if (storedCache) {
                Object.entries(storedCache).forEach(([key, value]) => {
                    this.cache.set(key, value);
                });
            }
        } catch (error) {
            console.error('Error restoring from localForage:', error);
        }
    }

    private async saveToLocalStorage() {
        try {
            const cacheObject = Object.fromEntries(this.cache.entries());
            await this.localforage.setItem(this.storageKey, cacheObject);
        } catch (error) {
            console.error('Error saving to localForage:', error);
        }
    }

    has(filePath: string) {
        return this.cache.has(filePath);
    }

    async readOrFetch(filePath: string): Promise<string | null> {
        if (this.has(filePath)) {
            return this.cache.get(filePath) || null;
        }

        const content = await this.session.fs.readTextFile(filePath);
        this.cache.set(filePath, content);
        await this.saveToLocalStorage();
        return content;
    }

    async write(filePath: string, content: string): Promise<void> {
        if (!this.session) {
            console.error('No session found');
            return;
        }

        await this.session.fs.writeTextFile(filePath, content);
        this.cache.set(filePath, content);
        await this.saveToLocalStorage();
    }

    async updateCache(filePath: string, content: string): Promise<void> {
        this.cache.set(filePath, content);
        await this.saveToLocalStorage();
    }

    async delete(filePath: string) {
        this.cache.delete(filePath);
        await this.saveToLocalStorage();
    }

    listFiles() {
        return Array.from(this.cache.keys());
    }

    async clear() {
        this.cache.clear();
        await this.localforage.removeItem(this.storageKey);
    }
}
