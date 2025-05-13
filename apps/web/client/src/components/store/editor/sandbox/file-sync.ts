import localforage from 'localforage';
import { makeAutoObservable } from 'mobx';
export class FileSyncManager {
    private cache: Map<string, string>;
    private storageKey = 'file-sync-cache';

    constructor() {
        this.cache = new Map();
        this.restoreFromLocalStorage();
        makeAutoObservable(this);
    }

    has(filePath: string) {
        return this.cache.has(filePath);
    }

    async readOrFetch(
        filePath: string,
        readFile: (path: string) => Promise<string | null>,
    ): Promise<string | null> {
        if (this.has(filePath)) {
            return this.cache.get(filePath) ?? null;
        }

        try {
            const content = await readFile(filePath);
            if (content) {
                this.cache.set(filePath, content);
                await this.saveToLocalStorage();
            }
            return content;
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return null;
        }
    }

    async write(
        filePath: string,
        content: string,
        writeFile: (path: string, content: string) => Promise<boolean>,
    ): Promise<boolean> {
        try {
            // Write to cache first
            this.cache.set(filePath, content);
            await this.saveToLocalStorage();

            // Then write to remote
            const success = await writeFile(filePath, content);
            if (!success) {
                // If remote write fails, remove from cache
                this.cache.delete(filePath);
                await this.saveToLocalStorage();
            }
            return success;
        } catch (error) {
            // If any error occurs, remove from cache
            this.cache.delete(filePath);
            await this.saveToLocalStorage();
            console.error(`Error writing file ${filePath}:`, error);
            return false;
        }
    }

    async updateCache(filePath: string, content: string): Promise<void> {
        this.cache.set(filePath, content);
        await this.saveToLocalStorage();
    }

    async delete(filePath: string) {
        this.cache.delete(filePath);
        await this.saveToLocalStorage();
    }

    listAllFiles() {
        return Array.from(this.cache.keys());
    }

    private async restoreFromLocalStorage() {
        try {
            const storedCache = await localforage.getItem<Record<string, string>>(this.storageKey);
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
            await localforage.setItem(this.storageKey, cacheObject);
        } catch (error) {
            console.error('Error saving to localForage:', error);
        }
    }

    private async clearLocalStorage() {
        try {
            await localforage.removeItem(this.storageKey);
        } catch (error) {
            console.error('Error clearing localForage:', error);
        }
    }
    async syncFromRemote(
        filePath: string,
        remoteContent: string,
    ): Promise<void> {
        const cachedContent = this.cache.get(filePath);
        if (cachedContent !== remoteContent) {
            // Only update cache if content is different
            await this.updateCache(filePath, remoteContent);
        }
    }

    async clear() {
        this.cache.clear();
        this.cache = new Map();
        await this.clearLocalStorage();
    }
}


export type FileEventType = 'add' | 'change' | 'remove' | '*';

export interface FileEvent {
    type: FileEventType;
    paths: string[];
    timestamp: number;
}

export class FileEventBus {
    private static instance: FileEventBus;
    private subscribers: Map<string, Set<(event: FileEvent) => void>> = new Map();
    private errorHandler: ((error: Error, event: FileEvent) => void) | null = null;

    private constructor() {}

    static getInstance(): FileEventBus {
        if (!FileEventBus.instance) {
            FileEventBus.instance = new FileEventBus();
        }
        return FileEventBus.instance;
    }

    /**
     * Subscribe to file events
     * @param eventType The type of event to subscribe to. Use '*' to subscribe to all events
     * @param callback The callback function to be called when the event occurs
     * @returns A function to unsubscribe from the event
     */
    subscribe(eventType: FileEventType, callback: (event: FileEvent) => void) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }
        this.subscribers.get(eventType)!.add(callback);
        return () => this.unsubscribe(eventType, callback);
    }

    /**
     * Unsubscribe from file events
     * @param eventType The type of event to unsubscribe from
     * @param callback The callback function to remove
     */
    unsubscribe(eventType: FileEventType, callback: (event: FileEvent) => void) {
        this.subscribers.get(eventType)?.delete(callback);
    }

    /**
     * Set a global error handler for all subscribers
     * @param handler The error handler function
     */
    setErrorHandler(handler: (error: Error, event: FileEvent) => void) {
        this.errorHandler = handler;
    }

    /**
     * Publish a file event to all subscribers
     * @param event The event to publish
     */
    publish(event: FileEvent) {
        // Notify specific subscribers
        this.subscribers.get(event.type)?.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                this.handleError(error as Error, event);
            }
        });

        // Notify wildcard subscribers
        this.subscribers.get('*')?.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                this.handleError(error as Error, event);
            }
        });
    }

    private handleError(error: Error, event: FileEvent) {
        if (this.errorHandler) {
            this.errorHandler(error, event);
        } else {
            console.error('Error in file event subscriber:', error);
        }
    }

    /**
     * Clear all subscribers for a specific event type
     * @param eventType The type of event to clear subscribers for
     */
    clearSubscribers(eventType?: FileEventType) {
        if (eventType) {
            this.subscribers.delete(eventType);
        } else {
            this.subscribers.clear();
    }
}
}

export const fileEventBus = FileEventBus.getInstance();
