import type { SandboxSession, Watcher } from '@codesandbox/sdk';
import { IGNORED_DIRECTORIES, JSX_FILE_EXTENSIONS } from '@onlook/constants';
import type { TemplateNode } from '@onlook/models';
import { addOidsToAst, createTemplateNodeMap, getAstFromContent, getContentFromAst } from '@onlook/parser';
import localforage from 'localforage';
import { makeAutoObservable } from 'mobx';
import { FileSyncManager } from './file-sync';

export class SandboxManager {
    private session: SandboxSession | null = null;
    private watcher: Watcher | null = null;
    private fileSync: FileSyncManager | null = null;
    private oidToTemplateNodeMap: Map<string, TemplateNode> = new Map();

    constructor() {
        makeAutoObservable(this);
    }

    init(session: SandboxSession) {
        this.session = session;
        this.fileSync = new FileSyncManager(session, localforage);
        this.index();
    }

    async index() {
        if (!this.session) {
            console.error('No session found');
            return;
        }

        const files = await this.listFilesRecursively('./', IGNORED_DIRECTORIES, JSX_FILE_EXTENSIONS);
        for (const file of files) {
            const content = await this.readFile(file);
            if (!content) {
                console.error(`Failed to read file ${file}`);
                continue;
            }

            await this.processFileForMapping(file);
        }

        console.log(Array.from(this.oidToTemplateNodeMap.entries()));
    }

    async readFile(path: string): Promise<string | null> {
        if (!this.fileSync) {
            console.error('No file cache found');
            return null;
        }

        return this.fileSync.readOrFetch(path);
    }

    async writeFile(path: string, content: string): Promise<boolean> {
        if (!this.fileSync) {
            console.error('No file cache found');
            return false;
        }

        await this.fileSync.write(path, content);
        return true;
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

        const watcher = await this.session.fs.watch("./", { recursive: true, excludes: IGNORED_DIRECTORIES });

        watcher.onEvent((event) => {
            if (!this.fileSync) {
                console.error('No file cache found');
                return;
            }

            for (const path of event.paths) {
                this.fileSync.updateCache(path, event.type);
                this.processFileForMapping(path);
            }
        });

        this.watcher = watcher;
    }

    async processFileForMapping(file: string) {
        const content = await this.readFile(file);
        if (!content) {
            console.error(`Failed to read file ${file}`);
            return;
        }

        const ast = await getAstFromContent(content);
        if (!ast) {
            console.error(`Failed to get ast for file ${file}`);
            return;
        }

        const { ast: astWithIds, modified } = addOidsToAst(ast);
        const templateNodeMap = createTemplateNodeMap(astWithIds, file);
        this.updateMapping(templateNodeMap);

        // Write the file if it has changed
        if (modified) {
            const contentWithIds = await getContentFromAst(astWithIds);
            await this.writeFile(file, contentWithIds);
        }
    }

    updateMapping(newMap: Map<string, TemplateNode>) {
        this.oidToTemplateNodeMap = new Map([...this.oidToTemplateNodeMap, ...newMap]);
    }

    async getTemplateNode(oid: string): Promise<TemplateNode | null> {
        if (!this.oidToTemplateNodeMap) {
            console.error('No file cache found');
            return null;
        }
        return this.oidToTemplateNodeMap.get(oid) || null;
    }

    async getCodeBlock(oid: string): Promise<string | null> {
        if (!this.oidToTemplateNodeMap) {
            console.error('No file cache found');
            return null;
        }

        console.log(Array.from(this.oidToTemplateNodeMap.entries()));

        const templateNode = this.oidToTemplateNodeMap.get(oid);
        if (!templateNode) {
            console.error(`No template node found for oid ${oid}`);
            return null;
        }

        // Get code block from template node
        return 'test';
    }

    clear() {
        this.watcher?.dispose();
        this.fileSync?.clear();
        this.session = null;
    }
}
