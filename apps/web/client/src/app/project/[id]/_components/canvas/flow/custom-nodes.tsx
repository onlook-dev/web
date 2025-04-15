import { type Frame } from '@onlook/models';
import { type NodeProps, useReactFlow } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FrameView } from '../frame';
import { useEditorEngine } from '@/components/store';

export function FrameNode({ data, selected, id, dragging }: NodeProps) {
    const { frame } = data as { frame: Frame };
    const editorEngine = useEditorEngine();
    const reactFlowInstance = useReactFlow();
    const nodeRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (frame && frame.id) {
            editorEngine.state.setNodeFrameMapping(id, frame.id);
            console.log(`Registered node ${id} with frame ${frame.id}`);
        }

        return () => {
            editorEngine.state.removeNodeFrameMapping(id);
        };
    }, [id, frame, editorEngine.state]);

    useEffect(() => {
        setIsDragging(!!dragging);
    }, [dragging]);

    const logNodeInfo = useCallback(() => {
        if (nodeRef.current) {
            const nodeRect = nodeRef.current.getBoundingClientRect();
            const viewport = reactFlowInstance.getViewport();
            console.log('Node info:', {
                nodeId: id,
                frameId: frame.id,
                nodeRect,
                viewport,
                framePosition: frame.position,
                frameDimension: frame.dimension,
                isDragging,
                selected
            });
        }
    }, [id, frame, reactFlowInstance, isDragging, selected]);

    useEffect(() => {
        logNodeInfo();
        
        const handleGlobalClick = (e: MouseEvent) => {
            if (nodeRef.current && nodeRef.current.contains(e.target as Node)) {
                console.log(`Global click detected in node ${id} with frame ${frame.id}`);
                logNodeInfo();
            }
        };
        
        document.addEventListener('click', handleGlobalClick);
        return () => {
            document.removeEventListener('click', handleGlobalClick);
        };
    }, [id, frame.id, selected, logNodeInfo]);

    useEffect(() => {
        if (isDragging) {
            const existingFrame = editorEngine.canvas.getFrame(frame.id);
            if (existingFrame) {
                console.log(`Updating frame ${frame.id} position to match node ${id}`);
                existingFrame.position = frame.position;
            }
        }
    }, [isDragging, frame.position, frame.id, id, editorEngine.canvas]);

    return (
        <div 
            ref={nodeRef}
            className="relative" 
            data-frame-id={frame.id} 
            data-node-id={id}
            data-selected={selected ? 'true' : 'false'}
            data-dragging={isDragging ? 'true' : 'false'}
            style={{ 
                pointerEvents: 'all',
                width: frame.dimension.width,
                height: frame.dimension.height
            }}
            onMouseEnter={() => {
                console.log(`Mouse entered node ${id} with frame ${frame.id}`);
                logNodeInfo();
            }}
            onMouseMove={(e) => {
                if (!isDragging) {
                    console.log(`Mouse move in node ${id} at ${e.clientX},${e.clientY}`);
                }
            }}
            onClick={(e) => {
                console.log(`Click in node ${id} with frame ${frame.id} at ${e.clientX},${e.clientY}`);
                e.stopPropagation();
                
                const existingFrame = editorEngine.canvas.getFrame(frame.id);
                if (existingFrame) {
                    editorEngine.frames.select(existingFrame);
                }
            }}
        >
            <FrameView frame={frame} />
        </div>
    );
}
