import { type Frame } from '@onlook/models';
import { type NodeProps } from '@xyflow/react';
import { FrameView } from '../frame';

export function FrameNode({ data, selected }: NodeProps) {
    const { frame } = data as { frame: Frame };

    return (
        <div className="relative nodrag">
            <FrameView frame={frame} />
        </div>
    );
}
