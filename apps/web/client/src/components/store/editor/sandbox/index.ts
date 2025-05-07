import type { SandboxSession, Watcher, WatchEvent } from '@codesandbox/sdk';
import { IGNORED_DIRECTORIES, JS_FILE_EXTENSIONS, JSX_FILE_EXTENSIONS, type FileNode } from '@onlook/constants';
import type { TemplateNode } from '@onlook/models';
import { getContentFromTemplateNode } from '@onlook/parser';
import localforage from 'localforage';
import { makeAutoObservable, reaction } from 'mobx';
import { FileSyncManager } from './file-sync';
import { isSubdirectory, normalizePath } from './helpers';
import { TemplateNodeMapper } from './mapping';
import { SessionManager } from './session';

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

export class SandboxManager {
    readonly session: SessionManager = new SessionManager();

    private watcher: Watcher | null = null;
    private fileSync: FileSyncManager = new FileSyncManager();
    private templateNodeMap: TemplateNodeMapper = new TemplateNodeMapper(localforage);
    private eventBus = FileEventBus.getInstance();

    constructor() {
        makeAutoObservable(this);

        reaction(
            () => this.session.session,
            (session) => {
                if (session) {
                    this.index();
                }
            },
        );
    }

    async index() {
        if (!this.session.session) {
            console.error('No session found');
            return;
        }
        
        const files = await this.listFilesRecursively('./', IGNORED_DIRECTORIES, [
            ...JSX_FILE_EXTENSIONS,
            ...JS_FILE_EXTENSIONS,
            'css',
        ]);
        for (const file of files) {
            const normalizedPath = normalizePath(file);
            const content = await this.readFile(normalizedPath);
            if (!content) {
                console.error(`Failed to read file ${normalizedPath}`);
                continue;
            }

            await this.processFileForMapping(normalizedPath);
        }

        await this.watchFiles();
    }

    private async readRemoteFile(filePath: string): Promise<string | null> {
        if (!this.session.session) {
            console.error('No session found for remote read');
            return null;
        }

        try {
            return await this.session.session.fs.readTextFile(filePath);
        } catch (error) {
            console.error(`Error reading remote file ${filePath}:`, error);
            return null;
        }
    }

    private async readRemoteBinaryFile(filePath: string): Promise<Uint8Array | null> {
        if (!this.session.session) {
            console.error('No session found for remote binary read');
            return null;
        }

        try {
            return await this.session.session.fs.readFile(filePath);
        } catch (error) {
            console.error(`Error reading remote binary file ${filePath}:`, error);
            return null;
        }
    }

    private async writeRemoteFile(filePath: string, fileContent: string): Promise<boolean> {
        if (!this.session.session) {
            console.error('No session found for remote write');
            return false;
        }

        try {
            await this.session.session.fs.writeTextFile(filePath, fileContent);
            return true;
        } catch (error) {
            console.error(`Error writing remote file ${filePath}:`, error);
            return false;
        }
    }

    private async writeRemoteBinaryFile(
        filePath: string,
        fileContent: Buffer | Uint8Array,
    ): Promise<boolean> {
        if (!this.session.session) {
            console.error('No session found for remote binary write');
            return false;
        }

        try {
            await this.session.session.fs.writeFile(filePath, fileContent);
            return true;
        } catch (error) {
            console.error(`Error writing remote binary file ${filePath}:`, error);
            return false;
        }
    }

    async readFile(path: string): Promise<string | null> {
        const normalizedPath = normalizePath(path);
        return this.fileSync.readOrFetch(normalizedPath, this.readRemoteFile.bind(this));
    }

    async readFiles(paths: string[]): Promise<Record<string, string>> {
        const results: Record<string, string> = {};
        for (const path of paths) {
            const content = await this.readFile(path);
            if (!content) {
                console.error(`Failed to read file ${path}`);
                continue;
            }
            results[path] = content;
        }
        return results;
    }
    async readBinaryFile(path: string): Promise<Uint8Array | null> {
        const normalizedPath = normalizePath(path);
        try {
            return await this.readRemoteBinaryFile(normalizedPath);
        } catch (error) {
            console.error(`Error reading binary file ${normalizedPath}:`, error);
            return null;
        }
    }

    async writeFile(path: string, content: string): Promise<boolean> {
        const normalizedPath = normalizePath(path);
        return this.fileSync.write(normalizedPath, content, this.writeRemoteFile.bind(this));
    }

    listAllFiles() {
        return this.fileSync.listAllFiles();
    }

    async listFiles(dir: string) {
        return this.session.session?.fs.readdir(dir);
    }

    async writeBinaryFile(path: string, content: Buffer | Uint8Array): Promise<boolean> {
        const normalizedPath = normalizePath(path);
        try {
            // TODO: Implement binary file sync
            return await this.writeRemoteBinaryFile(normalizedPath, content);
        } catch (error) {
            console.error(`Error writing binary file ${normalizedPath}:`, error);
            return false;
        }
    }

    async listFilesRecursively(
        dir: string,
        ignore: string[] = [],
        extensions: string[] = [],
    ): Promise<string[]> {
        if (!this.session.session) {
            console.error('No session found');
            return [];
        }

        const results: string[] = [];
        const entries = await this.session.session.fs.readdir(dir);

        for (const entry of entries) {
            const fullPath = `${dir}/${entry.name}`;
            const normalizedPath = normalizePath(fullPath);
            if (entry.type === 'directory') {
                if (ignore.includes(entry.name)) {
                    continue;
                }
                const subFiles = await this.listFilesRecursively(
                    normalizedPath,
                    ignore,
                    extensions,
                );
                results.push(...subFiles);
            } else {
                if (
                    extensions.length > 0 &&
                    !extensions.includes(entry.name.split('.').pop() ?? '')
                ) {
                    continue;
                }
                results.push(normalizedPath);
            }
        }
        return results;
    }

    async watchFiles() {
        if (!this.session.session) {
            console.error('No session found');
            return;
        }

        // Convert ignored directories to glob patterns with ** wildcard
        const excludePatterns = IGNORED_DIRECTORIES.map((dir) => `${dir}/**`);

        const watcher = await this.session.session.fs.watch('./', {
            recursive: true,
            excludes: excludePatterns,
        });

        watcher.onEvent((event) => this.handleFileEvent(event));

        this.watcher = watcher;
    }

    async handleFileEvent(event: WatchEvent) {
        // Publish the event to all subscribers
        this.eventBus.publish({
            type: event.type,
            paths: event.paths,
            timestamp: Date.now()
        });

        // Handle internal file sync
        for (const path of event.paths) {
            if (isSubdirectory(path, IGNORED_DIRECTORIES)) {
                continue;
            }
            const normalizedPath = normalizePath(path);
            const eventType = event.type;
            if (event.type === 'remove') {
                await this.fileSync.delete(normalizedPath);
            } else if (eventType === 'change' || eventType === 'add') {
                const content = (await this.readRemoteFile(normalizedPath)) ?? '';
                await this.fileSync.updateCache(normalizedPath, content);
                await this.processFileForMapping(normalizedPath);
            }
        }
    }

    async processFileForMapping(file: string) {
        // Only process JSX files
        const extension = file.split('.').pop();
        if (!extension || !JSX_FILE_EXTENSIONS.includes(extension)) {
            return;
        }

        const normalizedPath = normalizePath(file);
        await this.templateNodeMap.processFileForMapping(
            normalizedPath,
            this.readFile.bind(this),
            this.writeFile.bind(this),
        );
    }

    async getTemplateNode(oid: string): Promise<TemplateNode | null> {
        return this.templateNodeMap.getTemplateNode(oid);
    }

    async getCodeBlock(oid: string): Promise<string | null> {
        const templateNode = this.templateNodeMap.getTemplateNode(oid);
        if (!templateNode) {
            console.error(`No template node found for oid ${oid}`);
            return null;
        }

        const content = await this.readFile(templateNode.path);
        if (!content) {
            console.error(`No file found for template node ${oid}`);
            return null;
        }

        const codeBlock = await getContentFromTemplateNode(templateNode, content);
        return codeBlock;
    }

    clear() {
        this.watcher?.dispose();
        this.fileSync.clear();
        this.templateNodeMap.clear();
    }
}
