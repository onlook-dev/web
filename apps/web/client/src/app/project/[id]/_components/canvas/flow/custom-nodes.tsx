import { type Frame } from '@onlook/models';
import { type NodeProps } from '@xyflow/react';
import { useEffect } from 'react';
import { FrameView } from '../frame';
import { useEditorEngine } from '@/components/store';

export function FrameNode({ data, selected, id }: NodeProps) {
    const { frame } = data as { frame: Frame };
    const editorEngine = useEditorEngine();

    useEffect(() => {
        if (frame && frame.id) {
            editorEngine.state.setNodeFrameMapping(id, frame.id);
            console.log(`Registered node ${id} with frame ${frame.id}`);
        }

        return () => {
            editorEngine.state.removeNodeFrameMapping(id);
        };
    }, [id, frame, editorEngine.state]);

    return (
        <div className="relative nodrag" data-frame-id={frame.id} data-node-id={id}>
            <FrameView frame={frame} />
        </div>
    );
}
