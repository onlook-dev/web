'use client';

import { useProjectsContext } from '@/components/hooks/use-projects';
import type { Project } from '@onlook/models';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Carousel } from './carousel';
import { ProjectInfo } from './info';

export const SelectProject = observer(() => {
    const { projects, isLoadingProjects } = useProjectsContext();
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    const sortProjects = (unsortedProjects: Project[]) => {
        return unsortedProjects.sort(
            (a, b) =>
                new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime(),
        );
    };

    const sortedProjects = sortProjects(projects);

    const handleProjectChange: (index: number) => void = (index: number) => {
        if (currentProjectIndex === index) {
            return;
        }
        setDirection(index > currentProjectIndex ? 1 : -1);
        setCurrentProjectIndex(index);
    };

    if (isLoadingProjects) {
        return <div>Loading projects...</div>;
    }

    return (
        <div className="flex flex-row w-full">
            <div className="w-3/5 h-full">
                <Carousel slides={sortedProjects} onSlideChange={handleProjectChange} />
            </div>
            <div className="w-2/5 flex flex-col justify-center items-start p-4 mr-10 gap-6">
                {projects[currentProjectIndex] && (
                    <ProjectInfo project={projects[currentProjectIndex]} direction={direction} />
                )}
            </div>
        </div>
    );
});

const mockProjects: Project[] = [{
    id: '1',
    name: 'Project 1',
    canvas: {
        id: '1',
        scale: 1,
        frames: [],
        position: {
            x: 0,
            y: 0,
        },
    },
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
        previewImg: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    },
},
{
    id: '2',
    name: 'Project 2',
    canvas: {
        id: '2',
        scale: 1,
        frames: [],
        position: {
            x: 0,
            y: 0,
        },
    },
    domains: {
        base: null,
        custom: null,
    },
    sandbox: {
        id: '2',
        url: 'http://localhost:8084',
    },
    metadata: {
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        previewImg: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80',
    },
}];