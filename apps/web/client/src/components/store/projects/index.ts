import { api } from '@/trpc/client';
import type { Project } from '@onlook/models';

export class ProjectsManager {
    readonly projects: Project[];

    constructor() {
        this.projects = [];
    }

    async createProject(prompt: string) {
        console.log('createProject', prompt);
        const result = await api.project.test.mutate({
            name: 'Untitled',
        });
        console.log('result', result);
    }
}
