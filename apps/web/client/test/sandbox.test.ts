import { IGNORED_DIRECTORIES, JSX_FILE_EXTENSIONS } from '@onlook/constants';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { SandboxManager } from '../src/components/store/editor/engine/sandbox';

// Setup mocks before imports
// Mock localforage before importing anything that uses it
const mockGetItem = mock<(key: string) => Promise<any>>(async () => null);
const mockSetItem = mock<(key: string, value: any) => Promise<any>>(async () => undefined);
const mockRemoveItem = mock<(key: string) => Promise<any>>(async () => undefined);



// Now import the SandboxManager which imports localforage

describe('SandboxManager', () => {
    let sandboxManager: SandboxManager;
    let mockSession: any;
    let mockWatcher: any;

    beforeEach(() => {
        mockGetItem.mockClear();
        mockSetItem.mockClear();
        mockRemoveItem.mockClear();

        mock.module('localforage', () => ({
            getItem: mockGetItem,
            setItem: mockSetItem,
            removeItem: mockRemoveItem,
            createInstance: () => ({
                getItem: mockGetItem,
                setItem: mockSetItem,
                removeItem: mockRemoveItem
            }),
            config: () => { return; },
            ready: () => Promise.resolve(),
            setDriver: () => Promise.resolve(),
            driver: () => 'memoryDriver',
            INDEXEDDB: 'asyncStorage',
            WEBSQL: 'webSQLStorage',
            LOCALSTORAGE: 'localStorageWrapper',
            clear: () => Promise.resolve(),
            length: () => Promise.resolve(0),
            key: () => Promise.resolve(null),
            keys: () => Promise.resolve([]),
            iterate: () => Promise.resolve(null),
            dropInstance: () => Promise.resolve()
        }));

        mock.module('@onlook/parser', () => ({
            getAstFromContent: (content: string) => content,
            getContentFromAst: (ast: any) => ast,
            addOidsToAst: (ast: any) => ({
                ast: ast, // Return the ast unchanged but in correct structure
                modified: false
            }),
            createTemplateNodeMap: () => new Map()
        }));

        const mockEntries = [
            { name: 'file1.tsx', type: 'file' },
            { name: 'file2.tsx', type: 'file' },
            { name: 'node_modules', type: 'directory' },
            { name: 'src', type: 'directory' }
        ];

        const mockSrcEntries = [
            { name: 'component.tsx', type: 'file' },
            { name: 'utils.ts', type: 'file' }
        ];

        mockWatcher = {
            onEvent: mock((callback: any) => {
                mockWatcher.callback = callback;
            }),
            dispose: mock(() => { }),
            callback: null
        };

        mockSession = {
            fs: {
                readTextFile: mock(async (path: string) => {
                    if (path.endsWith('.tsx')) {
                        return '<div>Test Component</div>';
                    }
                    return '';
                }),
                writeTextFile: mock(async (path: string, content: string) => {
                    return true;
                }),
                readdir: mock(async (dir: string) => {
                    if (dir === './') {
                        return mockEntries;
                    } else if (dir === './src') {
                        return mockSrcEntries;
                    }
                    return [];
                }),
                watch: mock(async () => mockWatcher)
            }
        };

        sandboxManager = new SandboxManager();
        sandboxManager.init(mockSession);
    });

    afterEach(() => {
        sandboxManager.clear();
    });

    test('should list files recursively', async () => {
        const testMockSession: any = {
            fs: {
                readdir: mock(async (dir: string) => {
                    if (dir === './') {
                        return [
                            { name: 'file1.tsx', type: 'file' },
                            { name: 'file2.tsx', type: 'file' },
                            { name: 'node_modules', type: 'directory' },
                            { name: 'src', type: 'directory' }
                        ];
                    } else if (dir === 'src') {
                        return [
                            { name: 'component.tsx', type: 'file' }
                        ];
                    }
                    return [];
                }),
                readTextFile: mock(async () => ''),
                writeTextFile: mock(async () => true),
                watch: mock(async () => mockWatcher)
            }
        };

        const testManager = new SandboxManager();
        testManager.init(testMockSession);

        const files = await testManager.listFilesRecursively('./', IGNORED_DIRECTORIES, JSX_FILE_EXTENSIONS);

        expect(testMockSession.fs.readdir.mock.calls.length).toBeGreaterThan(0);
        expect(testMockSession.fs.readdir.mock.calls.some(call => call[0] === './')).toBe(true);
        expect(testMockSession.fs.readdir.mock.calls.some(call => call[0] === 'src')).toBe(true);

        expect(files).toEqual(['file1.tsx', 'file2.tsx', 'src/component.tsx']);
    });

    test('should read file content', async () => {
        const content = await sandboxManager.readFile('file1.tsx');
        expect(content).toBe('<div>Test Component</div>');
    });

    test('should write file content', async () => {
        const result = await sandboxManager.writeFile('file1.tsx', '<div id="123">Modified Component</div>');
        expect(result).toBe(true);
        expect(mockSession.fs.writeTextFile).toHaveBeenCalledWith(
            'file1.tsx',
            '<div id="123">Modified Component</div>'
        );
    });

    test('should read from localforage cache when reading files multiple times', async () => {
        await sandboxManager.readFile('file1.tsx');

        const originalReadTextFile = mockSession.fs.readTextFile;
        let called = false;
        mockSession.fs.readTextFile = mock(async (path: string) => {
            called = true;
            return '<div>Changed Content</div>';
        });

        const content2 = await sandboxManager.readFile('file1.tsx');
        expect(content2).toBe('<div>Test Component</div>');

        expect(called).toBe(false);
    });

    test('FileSyncManager should handle file operations', async () => {
        const { FileSyncManager } = require('../src/components/store/editor/engine/sandbox/file-sync');

        const testGetItem = mock<(key: string) => Promise<any>>(async () => null);
        const testSetItem = mock<(key: string, value: any) => Promise<any>>(async () => undefined);
        const testRemoveItem = mock<(key: string) => Promise<any>>(async () => undefined);

        testGetItem.mockImplementation(async (key) => {
            if (key === 'file-sync-cache') {
                return { 'cached.tsx': '<div>Cached</div>' };
            }
            return null;
        });

        const testSession = {
            fs: {
                readTextFile: mock(async (path: string) => {
                    return '<div>From Filesystem</div>';
                }),
                writeTextFile: mock(async (path: string, content: string) => {
                    return true;
                })
            }
        };

        const fileSync = new FileSyncManager(testSession, {
            getItem: testGetItem,
            setItem: testSetItem,
            removeItem: testRemoveItem
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        const cachedContent = await fileSync.readOrFetch('cached.tsx');
        expect(cachedContent).toBe('<div>Cached</div>');
        expect(testSession.fs.readTextFile).not.toHaveBeenCalled();

        const uncachedContent = await fileSync.readOrFetch('uncached.tsx');
        expect(uncachedContent).toBe('<div>From Filesystem</div>');
        expect(testSession.fs.readTextFile).toHaveBeenCalledWith('uncached.tsx');

        testSetItem.mockClear();
        await fileSync.write('test.tsx', '<div>Test Content</div>');
        expect(testSetItem).toHaveBeenCalled();

        testRemoveItem.mockClear();
        await fileSync.clear();
        expect(testRemoveItem).toHaveBeenCalled();
    });
});
