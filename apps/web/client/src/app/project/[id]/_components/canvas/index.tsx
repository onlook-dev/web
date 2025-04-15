"use client"

import { useEditorEngine } from '@/components/store';
import { EditorMode } from '@onlook/models';
import {
    type Node,
    type NodeChange,
    ReactFlow,
    ReactFlowProvider,
    applyNodeChanges
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useState } from 'react';
import { FrameNode } from './flow/custom-nodes';
import './flow/styles.css';
import { createFrameFromNode, createInitialNodes } from './flow/utils';
import { HotkeysArea } from './hotkeys';
import { Overlay } from './overlay';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

const nodeTypes = {
    frameNode: FrameNode,
};

const FlowCanvas = observer(() => {
    const editorEngine = useEditorEngine();

    const [nodes, setNodes] = useState<Node[]>(
        createInitialNodes(editorEngine.canvas.frames)
    );

    useEffect(() => {
        setNodes(createInitialNodes(editorEngine.canvas.frames));
    }, [editorEngine.canvas.frames]);

    const onViewportChange = useCallback((x: number, y: number, zoom: number) => {
        editorEngine.canvas.scale = zoom;
        editorEngine.canvas.position = { x, y };
    }, [editorEngine.canvas]);

    const onNodesChange = useCallback((changes: NodeChange[]) => {
        setNodes((nds) => {
            const newNodes = applyNodeChanges(changes, nds);

            changes.forEach(change => {
                if (change.type === 'position' && change.position) {
                    const node = newNodes.find(n => n.id === change.id);
                    if (node) {
                        const frame = createFrameFromNode(node);
                        const existingFrame = editorEngine.canvas.getFrame(frame.id);
                        if (existingFrame) {
                            existingFrame.position = frame.position;
                        }
                    }
                }
            });

            return newNodes;
        });
    }, [editorEngine.canvas]);

    const handleCanvasClick = useCallback((event: React.MouseEvent) => {
        editorEngine.clearUI();
    }, [editorEngine]);

    const middleMouseButtonDown = useCallback((e: MouseEvent) => {
        if (e.button === 1) {
            editorEngine.state.editorMode = EditorMode.PAN;
            e.preventDefault();
            e.stopPropagation();
        }
    }, [editorEngine.state.editorMode]);

    const middleMouseButtonUp = useCallback((e: MouseEvent) => {
        if (e.button === 1) {
            editorEngine.state.editorMode = EditorMode.DESIGN;
            e.preventDefault();
            e.stopPropagation();
        }
    }, [editorEngine.state.editorMode]);

    useEffect(() => {
        document.addEventListener('mousedown', middleMouseButtonDown);
        document.addEventListener('mouseup', middleMouseButtonUp);
        return () => {
            document.removeEventListener('mousedown', middleMouseButtonDown);
            document.removeEventListener('mouseup', middleMouseButtonUp);
        };
    }, [middleMouseButtonDown, middleMouseButtonUp]);

    return (
        <HotkeysArea>
            <div className="overflow-hidden bg-background-onlook flex flex-grow relative">
                <ReactFlow
                    nodes={nodes}
                    onNodesChange={onNodesChange}
                    onMove={(e, viewport) => onViewportChange(viewport.x, viewport.y, viewport.zoom)}
                    onInit={(instance) => {
                        instance.setViewport({
                            x: editorEngine.canvas.position.x,
                            y: editorEngine.canvas.position.y,
                            zoom: editorEngine.canvas.scale,
                        });
                    }}
                    nodeTypes={nodeTypes}
                    minZoom={MIN_ZOOM}
                    maxZoom={MAX_ZOOM}
                    fitView={false}
                    snapToGrid={false}
                    onPaneClick={handleCanvasClick}
                    elevateNodesOnSelect={true}
                    panOnScroll={editorEngine.state.editorMode !== EditorMode.PAN}
                    panOnDrag={editorEngine.state.editorMode === EditorMode.PAN}
                    selectionOnDrag={editorEngine.state.editorMode !== EditorMode.PAN}
                    nodesDraggable={true}
                    noDragClassName="nodrag"
                    dragHandleSelector="[data-draghandle]"
                    className="react-flow-canvas"
                >
                </ReactFlow>
                <Overlay />
            </div>
        </HotkeysArea>
    );
});

export const Canvas = observer(() => {
    return (
        <ReactFlowProvider>
            <FlowCanvas />
        </ReactFlowProvider>
    );
});
