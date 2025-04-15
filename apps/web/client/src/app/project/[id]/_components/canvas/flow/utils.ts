import type { Frame } from '@onlook/models';
import { type Edge, type Node, Position } from '@xyflow/react';

export const createNodeFromFrame = (frame: Frame): Node => {
    return {
        id: frame.id,
        position: {
            x: frame.position.x,
            y: frame.position.y,
        },
        data: { frame },
        width: frame.dimension.width,
        height: frame.dimension.height,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        type: 'frameNode',
    };
};

export const createFrameFromNode = (node: Node): Frame => {
    const frame = node.data.frame as Frame;

    return {
        ...frame,
        position: {
            x: node.position.x,
            y: node.position.y,
        },
    };
};

export const createInitialNodes = (frames: Frame[]): Node[] => {
    return frames.map(createNodeFromFrame);
};

export const createInitialEdges = (): Edge[] => {
    return [];
};
