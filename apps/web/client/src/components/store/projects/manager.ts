import { api } from '@/trpc/client';
import { CSB_BLANK_TEMPLATE_ID } from '@onlook/constants';
import type { Project as DbProject } from '@onlook/db';
import type { Project } from '@onlook/models';
import { makeAutoObservable, reaction } from 'mobx';
import { v4 as uuidv4 } from 'uuid';
import type { UserManager } from '../user/manager';

export class ProjectsManager {
    private _projects: Project[] = [];
    private _creationData: Record<string, any> | null = null;
    isFetching = false;

    constructor(private userManager: UserManager) {
        makeAutoObservable(this);

        reaction(
            () => this.userManager.user?.id,
            () => this.fetchProjects(),
        );
    }
    
    setCreationData(projectId: string, data: Record<string, any>) {
        this._creationData = { projectId, ...data };
    }
    
    getCreationData(projectId: string) {
        if (this._creationData && this._creationData.projectId === projectId) {
            return this._creationData;
        }
        return null;
    }
    
    clearCreationData() {
        this._creationData = null;
    }

    async createProject() {
        if (!this.userManager.user?.id) {
            console.error('No user ID found');
            return;
        }
        const { sandboxId, previewUrl } = await this.createSandbox();
        const project = await this.createDefaultProject(sandboxId, previewUrl);
        const newProject = await api.project.create.mutate({
            project,
            userId: this.userManager.user?.id,
        });

        return newProject;
    }

    createDefaultProject(sandboxId: string, previewUrl: string): DbProject {
        const newProject = {
            id: uuidv4(),
            name: 'New project',
            sandboxId,
            sandboxUrl: previewUrl,
            createdAt: new Date(),
            updatedAt: new Date(),
            previewImg: null,
        } satisfies DbProject;
        return newProject;
    }

    async createSandbox() {
        return await api.sandbox.fork.mutate({
            sandboxId: CSB_BLANK_TEMPLATE_ID,
        });
    }

    async fetchProjects() {
        if (!this.userManager.user?.id) {
            console.error('No user ID found');
            return;
        }
        this.isFetching = true;
        this._projects = await api.project.getPreviewProjects.query({
            userId: this.userManager.user.id,
        });
        this.isFetching = false;
    }

    get projects() {
        return this._projects;
    }

    set projects(newProjects: Project[]) {
        this._projects = newProjects;
    }

    deleteProject(project: Project) {
        api.project.delete.mutate({ id: project.id });
    }
}
