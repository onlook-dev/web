import type { SandboxSession, Watcher } from '@codesandbox/sdk';
import { IGNORED_DIRECTORIES, JSX_FILE_EXTENSIONS } from '@onlook/constants';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
export class SandboxManager {
    private session: SandboxSession | null = null;
    private watcher: Watcher | null = null;
    private selfModified = new Set<string>();
    private fileCache = new Map<string, string>();

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    register(session: SandboxSession) {
        this.session = session;
        this.index();
    }

    /**
     * Needs initial setup to read and index all jsx|tsx files
     * Also needs watch to continue indexing as files change
     */
    async index() {
        if (!this.session) {
            console.error('No session found');
            return;
        }
        const files = await this.listFilesRecursively('./', IGNORED_DIRECTORIES, JSX_FILE_EXTENSIONS);
        console.log('files', files);
        for (const file of files) {
            const content = await this.readFile(file);
            console.log('content', content);
        }
    }

    async readFile(path: string): Promise<string | null> {
        if (!this.session) {
            console.error('No session found');
            return null;
        }

        try {
            if (this.fileCache.has(path)) {
                return this.fileCache.get(path) || null;
            }

            const content = await this.session.fs.readTextFile(path);
            this.fileCache.set(path, content);
            return content;
        } catch (error) {
            console.error(`Error reading file ${path}:`, error);
            return null;
        }
    }

    async writeFile(path: string, content: string): Promise<boolean> {
        if (!this.session) {
            console.error('No session found');
            return false;
        }

        try {
            this.selfModified.add(path);
            await this.session.fs.writeTextFile(path, content);
            this.fileCache.set(path, content);
            return true;
        } catch (error) {
            console.error(`Error writing file ${path}:`, error);
            return false;
        }
    }

    async listFiles(): Promise<string[]> {
        if (!this.session) {
            console.error('No session found');
            return [];
        }
        const files = await this.session.fs.readdir('./');
        return files.map(entry => entry.name);
    }

    async listFilesRecursively(dir: string, ignore: string[] = [], extensions: string[] = []): Promise<string[]> {
        if (!this.session) {
            console.error('No session found');
            return [];
        }

        const results: string[] = [];
        const entries = await this.session.fs.readdir(dir);

        for (const entry of entries) {
            const fullPath = dir === './' ? entry.name : `${dir}/${entry.name}`;
            if (entry.type === 'directory') {
                const dirName = entry.name;
                if (ignore.includes(dirName)) {
                    continue;
                }
                const subFiles = await this.listFilesRecursively(fullPath, ignore, extensions);
                results.push(...subFiles);
            } else {
                if (extensions.length > 0 && !extensions.includes(entry.name.split('.').pop() || '')) {
                    continue;
                }
                results.push(fullPath);
            }
        }

        return results;
    }

    async watchFiles() {
        if (!this.session) {
            console.error('No session found');
            return;
        }
        const watcher = await this.session.fs.watch("./", { recursive: true, excludes: [".git"] });

        watcher.onEvent((event) => {
            for (const path of event.paths) {
                if (this.selfModified.has(path)) {
                    this.selfModified.delete(path);
                    return;
                }
                if (event.type === "change" || event.type === "add") {
                    this.fileCache.delete(path);

                    this.readFile(path).catch(error => {
                        console.error(`Error reading updated file ${path}:`, error);
                    });
                }
            }
        });

        this.watcher = watcher;
    }

    clear() {
        this.watcher?.dispose();
        this.selfModified.clear();
        this.fileCache.clear();
    }
}
