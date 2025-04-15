import { type Frame } from '@onlook/models';
import { type NodeProps, useReactFlow } from '@xyflow/react';
import { useCallback, useEffect, useRef } from 'react';
import { FrameView } from '../frame';
import { useEditorEngine } from '@/components/store';

export function FrameNode({ data, selected, id }: NodeProps) {
    const { frame } = data as { frame: Frame };
    const editorEngine = useEditorEngine();
    const reactFlowInstance = useReactFlow();
    const nodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (frame && frame.id) {
            editorEngine.state.setNodeFrameMapping(id, frame.id);
            console.log(`Registered node ${id} with frame ${frame.id}`);
        }

        return () => {
            editorEngine.state.removeNodeFrameMapping(id);
        };
    }, [id, frame, editorEngine.state]);

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
                frameDimension: frame.dimension
            });
        }
    }, [id, frame, reactFlowInstance]);

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

    return (
        <div 
            ref={nodeRef}
            className="relative" 
            data-frame-id={frame.id} 
            data-node-id={id}
            style={{ pointerEvents: 'all' }}
            onMouseEnter={() => {
                console.log(`Mouse entered node ${id} with frame ${frame.id}`);
                logNodeInfo();
            }}
            onMouseMove={(e) => {
                console.log(`Mouse move in node ${id} at ${e.clientX},${e.clientY}`);
            }}
            onClick={(e) => {
                console.log(`Click in node ${id} with frame ${frame.id} at ${e.clientX},${e.clientY}`);
                e.stopPropagation();
            }}
        >
            <FrameView frame={frame} />
        </div>
    );
}
