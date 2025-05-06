'use client';

import { api } from "@/trpc/react";
import type { Canvas as DbCanvas, Frame as DbFrame, Project as DbProject } from "@onlook/db";
import type { Canvas, FrameType, Project, WebFrame } from "@onlook/models";
import { useEffect, useState } from "react";

export function useProjects(userId: string) {
    const { data: fetchedProjects, isLoading: isLoadingProjects } = api.project.getByUserId.useQuery({ id: userId });
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => {
        if (fetchedProjects) {
            setProjects(fetchedProjects.map(proj => dbProjectToProject(proj.project)));
        }
    }, [fetchedProjects]);

    const dbProjectToProject = (dbProject: DbProject & { canvas: DbCanvas & { frames: DbFrame[] } }): Project => {
        return {
            id: dbProject.id,
            name: dbProject.name,
            sandbox: {
                id: dbProject.sandboxId,
                url: dbProject.sandboxUrl,
            },
            metadata: {
                createdAt: dbProject.createdAt?.toISOString() ?? '',
                updatedAt: dbProject.updatedAt?.toISOString() ?? '',
                previewImg: dbProject.previewImg,
            },
            canvas: dbCanvasToCanvas(dbProject.canvas),
            domains: {
                base: null,
                custom: null,
            },
        };
    };

    const dbCanvasToCanvas = (dbCanvas: DbCanvas & { frames: DbFrame[] }): Canvas => {
        return {
            id: dbCanvas.id,
            scale: Number(dbCanvas.scale),
            frames: dbCanvas.frames.map(dbFrameToFrame),
            position: dbCanvas.position,
        };
    };

    const dbFrameToFrame = (dbFrame: DbFrame): WebFrame => {
        return {
            id: dbFrame.id,
            url: dbFrame.url,
            type: dbFrame.type as FrameType,
            position: {
                x: Number(dbFrame.x),
                y: Number(dbFrame.y),
            },
            dimension: {
                width: Number(dbFrame.width),
                height: Number(dbFrame.height),
            },
        };
    };

    return {
        projects,
        isLoadingProjects,
    };
} 