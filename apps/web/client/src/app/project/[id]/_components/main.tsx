'use client';

import { ChatProvider } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { useProjectManager } from '@/components/store/project';
import { api } from '@/trpc/react';
import { TooltipProvider } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useTabActive } from '../_hooks/use-tab-active';
import { BottomBar } from './bottom-bar';
import { Canvas } from './canvas';
import { EditorBar } from './editor-bar';
import { LeftPanel } from './left-panel';
import { RightPanel } from './right-panel';
import { TopBar } from './top-bar';

export const Main = observer(({ projectId }: { projectId: string }) => {
    const editorEngine = useEditorEngine();
    const projectManager = useProjectManager();
    const { tabState } = useTabActive();
    const { data: result, isLoading } = api.project.getFullProjectById.useQuery({ id: projectId });

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="h-screen w-screen flex items-center justify-center">
                <div className="text-xl">Project not found</div>
            </div>
        );
    }

    const { project, canvas, frames } = result;

    useEffect(() => {
        projectManager.project = project;

        if (!project.sandbox?.id) {
            console.error('No sandbox id');
            return;
        }
        editorEngine.sandbox.session.start(project.sandbox.id);
        return () => {
            editorEngine.sandbox.clear();
        };
    }, [project]);

    useEffect(() => {
        editorEngine.canvas.applyCanvas(canvas);
    }, [canvas]);

    useEffect(() => {
        editorEngine.canvas.applyFrames(frames);
    }, [frames]);

    useEffect(() => {
        if (tabState === 'reactivated' && editorEngine.sandbox.session.session) {
            editorEngine.sandbox.session.reconnect();
        }
    }, [tabState]);

    // TODO: Add better loading state
    // if (editorEngine.sandbox.session.isConnecting || isLoading) {
    //     return (
    //         <div className="h-screen w-screen flex items-center justify-center gap-2">
    //             <Icons.Shadow className="h-6 w-6 animate-spin" />
    //             <div className="text-xl">Connecting to sandbox...</div>
    //         </div>
    //     );
    // }

    return (
        <ChatProvider>
            <TooltipProvider>
                <div className="h-screen w-screen flex flex-row select-none relative">
                    <Canvas />

                    <div className="absolute top-0 w-full">
                        <TopBar />
                    </div>

                    <div className="absolute top-10 w-full z-50">
                        <EditorBar />
                    </div>

                    {/* TODO: Remove these */}
                    {/* 
                    <div className="absolute w-screen h-screen flex items-center justify-center z-30">
                        <StagingToggle selectedElement={selectedElement} onElementSelect={setSelectedElement} />
                    </div> 
                    <div className="absolute top-20 left-[80px] z-50 h-[calc(100%-80px)]">
                        <Panels selectedElement={selectedElement} />
                    </div> 
                     */}

                    <div className="absolute top-20 left-0 animate-layer-panel-in h-[calc(100%-80px)] z-1">
                        <LeftPanel />
                    </div>

                    <div className="absolute top-20 right-0 animate-edit-panel-in h-[calc(100%-80px)] z-1">
                        <RightPanel />
                    </div>

                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-toolbar-up ">
                        <BottomBar />
                    </div>
                </div>
            </TooltipProvider>
        </ChatProvider>
    );
});
