import type { ProjectDomain } from './domain';
import type { Frame } from './frame';
import type { RectPosition } from './rect';

export interface Project {
    id: string;
    name: string;
    metadata: {
        createdAt: string;
        updatedAt: string;
        previewImg: string | null;
    };
    sandbox: {
        id: string;
        url: string;
    };
    domains: ProjectDomain;
}

export interface ProjectSettings {
    scale: number | null;
    frames: Frame[] | null;
    position: RectPosition | null;
}