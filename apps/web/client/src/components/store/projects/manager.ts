import { api } from '@/trpc/client';
import type { Project } from '@onlook/models';
import { makeAutoObservable, reaction } from 'mobx';
import type { UserManager } from '../user/manager';

export class ProjectsManager {
    private _projects: Project[] = [];
    isFetchingProjects = false;

    constructor(private userManager: UserManager) {
        makeAutoObservable(this);

        reaction(
            () => this.userManager.user?.id,
            () => this.fetchProjects(),
        );
    }

    async fetchProjects() {
        if (!this.userManager.user?.id) {
            console.error('No user ID found');
            return;
        }
        this.isFetchingProjects = true;
        this._projects = await api.project.getPreviewProjectsByUserId.query({ id: this.userManager.user.id });
        this.isFetchingProjects = false;

        const projects = await api.project.listAll.query();
        console.log(projects);
    }

    createProject(): Project {
        const newProject: Project = {
            id: '1',
            name: 'Project 1',
            domains: {
                base: null,
                custom: null,
            },
            sandbox: {
                id: '1',
                url: 'http://localhost:8084',
            },
            metadata: {
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 12).toISOString(),
                updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 12).toISOString(),
                previewImg:
                    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
            },
        };
        return newProject;
    }

    saveProjects() { }

    deleteProject(project: Project) { }

    get projects() {
        return this._projects;
    }

    set projects(newProjects: Project[]) {
        this._projects = newProjects;
        this.saveProjects();
    }
}