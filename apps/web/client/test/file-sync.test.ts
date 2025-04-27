import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { FileSyncManager } from '../src/components/store/editor/engine/sandbox/file-sync';

describe('FileSyncManager', () => {
    let fileSyncManager: FileSyncManager;
    let mockSession: any;
    let mockLocalforage: any

    beforeEach(async () => {
        // Create mock session
        mockSession = {
            fs: {
                readTextFile: mock(async (path: string) => {
                    // Return mock content based on file path
                    if (path === 'file1.tsx') {
                        return '<div>Test Component</div>';
                    } else if (path === 'file2.tsx') {
                        return '<div>Another Component</div>';
                    }
                    return '';
                }),
                writeTextFile: mock(async (path: string, content: string) => {
                    // Mock file write operation
                    return;
                })
            }
        };

        // Create mock localforage  
        mockLocalforage = {
            getItem: mock(async () => null),
            setItem: mock(async () => undefined),
            removeItem: mock(async () => undefined)
        };

        // Create FileSyncManager instance
        fileSyncManager = new FileSyncManager(mockSession, mockLocalforage);

        // Wait for initialization to complete
        await new Promise(resolve => setTimeout(resolve, 10));
    });

    afterEach(async () => {
        await fileSyncManager.clear();
    });

    test('should check if file exists in cache', async () => {
        // Initially cache is empty
        expect(fileSyncManager.has('file1.tsx')).toBe(false);

        // Add a file to cache
        await fileSyncManager.updateCache('file1.tsx', '<div>Test Component</div>');

        // Now it should exist
        expect(fileSyncManager.has('file1.tsx')).toBe(true);
    });

    test('should read from cache if available', async () => {
        // Seed the cache
        await fileSyncManager.updateCache('file1.tsx', '<div>Cached Content</div>');

        // Read should return cached content without calling fs.readTextFile
        const content = await fileSyncManager.readOrFetch('file1.tsx');

        expect(content).toBe('<div>Cached Content</div>');
        expect(mockSession.fs.readTextFile).not.toHaveBeenCalled();
    });

    test('should fetch from filesystem if not in cache', async () => {
        // Read file that is not in cache
        const content = await fileSyncManager.readOrFetch('file1.tsx');

        expect(content).toBe('<div>Test Component</div>');
        expect(mockSession.fs.readTextFile).toHaveBeenCalledWith('file1.tsx');
    });

    test('should write file to filesystem and update cache', async () => {
        const newContent = '<div>New Content</div>';

        await fileSyncManager.write('file1.tsx', newContent);

        // Verify file was written to filesystem
        expect(mockSession.fs.writeTextFile).toHaveBeenCalledWith('file1.tsx', newContent);

        // Verify cache was updated
        expect(fileSyncManager.has('file1.tsx')).toBe(true);
        expect(await fileSyncManager.readOrFetch('file1.tsx')).toBe(newContent);
    });

    test('should update cache without writing to filesystem', async () => {
        const content = '<div>Updated Cache</div>';

        await fileSyncManager.updateCache('file1.tsx', content);

        // Verify cache was updated
        expect(fileSyncManager.has('file1.tsx')).toBe(true);
        expect(await fileSyncManager.readOrFetch('file1.tsx')).toBe(content);

        // Verify filesystem was not written to
        expect(mockSession.fs.writeTextFile).not.toHaveBeenCalled();
    });

    test('should delete file from cache', async () => {
        // Seed the cache
        await fileSyncManager.updateCache('file1.tsx', '<div>Test Content</div>');

        // Verify file is in cache
        expect(fileSyncManager.has('file1.tsx')).toBe(true);

        // Delete file from cache
        await fileSyncManager.delete('file1.tsx');

        // Verify file is no longer in cache
        expect(fileSyncManager.has('file1.tsx')).toBe(false);
    });

    test('should list all files in cache', async () => {
        // Seed the cache with multiple files
        await fileSyncManager.updateCache('file1.tsx', '<div>Content 1</div>');
        await fileSyncManager.updateCache('file2.tsx', '<div>Content 2</div>');
        await fileSyncManager.updateCache('file3.tsx', '<div>Content 3</div>');

        // Get list of files
        const files = fileSyncManager.listFiles();

        // Verify all files are listed
        expect(files).toContain('file1.tsx');
        expect(files).toContain('file2.tsx');
        expect(files).toContain('file3.tsx');
        expect(files.length).toBe(3);
    });

    test('should clear all files from cache', async () => {
        // Seed the cache with multiple files
        await fileSyncManager.updateCache('file1.tsx', '<div>Content 1</div>');
        await fileSyncManager.updateCache('file2.tsx', '<div>Content 2</div>');

        // Verify files are in cache
        expect(fileSyncManager.listFiles().length).toBe(2);

        // Clear cache
        await fileSyncManager.clear();

        // Verify cache is empty
        expect(fileSyncManager.listFiles().length).toBe(0);
        expect(mockLocalforage.removeItem).toHaveBeenCalledWith('file-sync-cache');
    });

    test('should save to localforage when cache is updated', async () => {
        // Update cache with new file
        await fileSyncManager.updateCache('file1.tsx', '<div>Test Content</div>');

        // Verify localforage.setItem was called with correct parameters
        expect(mockLocalforage.setItem).toHaveBeenCalledTimes(1);
        const callArgs = mockLocalforage.setItem.mock.calls[0];
        expect(callArgs[0]).toBe('file-sync-cache');
        expect(callArgs[1]).toEqual({ 'file1.tsx': '<div>Test Content</div>' });
    });

    test('should save to localforage when writing a file', async () => {
        // Write a new file
        await fileSyncManager.write('file2.tsx', '<div>New Content</div>');

        // Verify localforage.setItem was called
        expect(mockLocalforage.setItem).toHaveBeenCalledTimes(1);
        const callArgs = mockLocalforage.setItem.mock.calls[0];
        expect(callArgs[0]).toBe('file-sync-cache');
        expect(callArgs[1]).toEqual({ 'file2.tsx': '<div>New Content</div>' });
    });

    test('should save to localforage when reading new file', async () => {
        // Read a file not in cache
        await fileSyncManager.readOrFetch('file1.tsx');

        // Verify localforage.setItem was called
        expect(mockLocalforage.setItem).toHaveBeenCalledTimes(1);
        const callArgs = mockLocalforage.setItem.mock.calls[0];
        expect(callArgs[0]).toBe('file-sync-cache');
        expect(callArgs[1]).toEqual({ 'file1.tsx': '<div>Test Component</div>' });
    });

    test('should update localforage when deleting a file', async () => {
        // Add file to cache first
        await fileSyncManager.updateCache('file1.tsx', '<div>Test Content</div>');

        // Reset the mock to clear call history
        mockLocalforage.setItem.mockClear();

        // Delete the file
        await fileSyncManager.delete('file1.tsx');

        // Verify localforage.setItem was called with empty object
        expect(mockLocalforage.setItem).toHaveBeenCalledTimes(1);
        const callArgs = mockLocalforage.setItem.mock.calls[0];
        expect(callArgs[0]).toBe('file-sync-cache');
        expect(callArgs[1]).toEqual({});
    });

    test('should call localforage.removeItem when clearing cache', async () => {
        await fileSyncManager.clear();

        expect(mockLocalforage.removeItem).toHaveBeenCalledTimes(1);
        expect(mockLocalforage.removeItem).toHaveBeenCalledWith('file-sync-cache');
    });

    test('should handle errors when localforage fails to save', async () => {
        // Mock console.error to capture error messages
        const originalConsoleError = console.error;
        let errorMessage = '';
        console.error = mock((...args: any[]) => {
            errorMessage = args.join(' ');
        });

        try {
            // Create localforage that throws an error on setItem
            const errorLocalforage = {
                getItem: mock(async () => null),
                setItem: mock(async () => { throw new Error('Storage error'); }),
                removeItem: mock(async () => undefined)
            };

            const errorManager = new FileSyncManager(mockSession, errorLocalforage as any);
            // Wait for initialization to complete
            await new Promise(resolve => setTimeout(resolve, 10));

            // Attempt operations that would use localforage
            await errorManager.updateCache('file1.tsx', '<div>Test</div>');

            // Verify error was logged
            expect(errorMessage).toContain('Error saving to localForage');
        } finally {
            // Restore original console.error
            console.error = originalConsoleError;
        }
    });

    test('should handle errors when localforage fails to restore', async () => {
        // Mock console.error to capture error messages
        const originalConsoleError = console.error;
        let errorMessage = '';
        console.error = mock((...args: any[]) => {
            errorMessage = args.join(' ');
        });

        try {
            // Create localforage that throws an error on getItem
            const errorLocalforage = {
                getItem: mock(async () => { throw new Error('Storage read error'); }),
                setItem: mock(async () => undefined),
                removeItem: mock(async () => undefined)
            };

            // Create new FileSyncManager with the error-throwing localforage
            new FileSyncManager(mockSession, errorLocalforage as any);

            // Wait for the constructor's async operations to complete
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify error was logged
            expect(errorMessage).toContain('Error restoring from localForage');
        } finally {
            // Restore original console.error
            console.error = originalConsoleError;
        }
    });

    test('should restore cache from localforage on initialization', async () => {
        // Create a mock localforage that returns cached data
        const cachedData = {
            'cached1.tsx': '<div>Cached Content 1</div>',
            'cached2.tsx': '<div>Cached Content 2</div>'
        };

        const localforageWithCache = {
            getItem: mock(async () => cachedData),
            setItem: mock(async () => undefined),
            removeItem: mock(async () => undefined)
        };

        // Create new FileSyncManager with the populated localforage
        const newManager = new FileSyncManager(mockSession, localforageWithCache as any);

        // Wait for the constructor's async operations to complete
        await new Promise(resolve => setTimeout(resolve, 10));

        // Verify cache was populated from localforage
        expect(newManager.has('cached1.tsx')).toBe(true);
        expect(newManager.has('cached2.tsx')).toBe(true);
        expect(await newManager.readOrFetch('cached1.tsx')).toBe('<div>Cached Content 1</div>');
    });

    test('should handle error when session is broken', async () => {
        // Create a session with broken file system methods
        const brokenSession: any = {
            fs: {
                readTextFile: mock(async () => {
                    throw new Error('Failed to read file');
                }),
                writeTextFile: mock(async () => {
                    throw new Error('Failed to write file');
                })
            }
        };

        // Create mock localforage
        mockLocalforage = {
            getItem: mock(async () => null),
            setItem: mock(async () => undefined),
            removeItem: mock(async () => undefined)
        };

        const errorManager = new FileSyncManager(brokenSession, mockLocalforage);
        // Wait for initialization to complete
        await new Promise(resolve => setTimeout(resolve, 10));

        // Attempt to read a file that will cause an error
        try {
            await errorManager.readOrFetch('errorFile.tsx');
            // If we reach here, the test should fail
            expect(true).toBe(false);
        } catch (error) {
            // Expect an error to be thrown
            expect(error).toBeTruthy();
        }

        // Attempt to write a file that will cause an error
        try {
            await errorManager.write('errorFile.tsx', '<div>Error Content</div>');
            // If we reach here, the test should fail
            expect(true).toBe(false);
        } catch (error) {
            // Expect an error to be thrown
            expect(error).toBeTruthy();
        }
    });
}); 