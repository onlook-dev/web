"use client"

import { useEditorEngine } from '@/components/store';
import { EditorAttributes } from '@onlook/constants';
import { EditorMode } from '@onlook/models';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  Node,
  NodeChange,
  applyNodeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './flow/styles.css';
import { FrameNode } from './flow/custom-nodes';
import { createFrameFromNode, createInitialEdges, createInitialNodes } from './flow/utils';
import { HotkeysArea } from './hotkeys';
import { Overlay } from './overlay';
import { PanOverlay } from './overlay/pan';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

const nodeTypes = {
  frameNode: FrameNode,
};

const FlowCanvas = observer(() => {
  const editorEngine = useEditorEngine();
  const reactFlowInstance = useReactFlow();
  const [isPanning, setIsPanning] = useState(false);
  
  const [nodes, setNodes] = useState<Node[]>(
    createInitialNodes(editorEngine.canvas.frames)
  );
  
  const [edges, setEdges] = useState(createInitialEdges());
  
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
  
  useEffect(() => {
    if (editorEngine.state.editorMode === EditorMode.PAN) {
      setIsPanning(true);
    } else {
      setIsPanning(false);
    }
  }, [editorEngine.state.editorMode]);
  
  const middleMouseButtonDown = useCallback((e: MouseEvent) => {
    if (e.button === 1) {
      editorEngine.state.editorMode = EditorMode.PAN;
      setIsPanning(true);
      e.preventDefault();
      e.stopPropagation();
    }
  }, [editorEngine.state.editorMode]);
  
  const middleMouseButtonUp = useCallback((e: MouseEvent) => {
    if (e.button === 1) {
      editorEngine.state.editorMode = EditorMode.DESIGN;
      setIsPanning(false);
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
      <div 
        className="overflow-hidden bg-background-onlook flex flex-grow relative"
        id={EditorAttributes.CANVAS_CONTAINER_ID}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
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
          elevateNodesOnSelect={false}
          panOnScroll={!isPanning} // Enable pan on scroll when not in PAN mode
          panOnDrag={isPanning} // Enable pan on drag when in PAN mode
          selectionOnDrag={!isPanning} // Enable selection on drag when not in PAN mode
          nodesDraggable={true}
          className="react-flow-canvas"
        >
          <Background 
            color="#ccc" 
            variant="dots" 
            gap={24} 
            size={1.5} 
          />
          <Controls showInteractive={false} />
        </ReactFlow>
        <Overlay>
          {/* Overlay content can remain as is */}
        </Overlay>
        <PanOverlay
          clampPosition={(position: { x: number; y: number }) => position}
          isPanning={isPanning}
          setIsPanning={setIsPanning}
        />
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
