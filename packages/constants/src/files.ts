import { CUSTOM_OUTPUT_DIR } from './editor';

export interface FileNode {
    id: string;
    name: string;
    path: string;
    isDirectory: boolean;
    children?: FileNode[];
    extension?: string;
}

export const IGNORED_DIRECTORIES = [
    'node_modules',
    'dist',
    'build',
    'public',
    'static',
    '.git',
    '.next',
    CUSTOM_OUTPUT_DIR,
];

export const JSX_FILE_EXTENSIONS = ['jsx', 'tsx'];

export const JS_FILE_EXTENSIONS = ['js', 'ts'];
