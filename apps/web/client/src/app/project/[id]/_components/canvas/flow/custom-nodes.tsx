import { Handle, NodeProps, Position } from '@xyflow/react';
import type { Frame, WebFrame } from '@onlook/models';
import { FrameType } from '@onlook/models';
import { FrameView } from '../frame';

export function FrameNode({ data, selected }: NodeProps) {
  const { frame } = data;
  
  return (
    <div className="relative">
      <FrameView frame={frame} />
    </div>
  );
}
