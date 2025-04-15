import { EditorAttributes } from '@onlook/constants';
import type { RectDimensions } from '@onlook/models';
import { colors } from '@onlook/ui/tokens';
import React from 'react';

export interface RectProps extends RectDimensions {
    isComponent?: boolean;
    className?: string;
    children?: React.ReactNode;
    strokeWidth?: number;
}

export const BaseRect: React.FC<RectProps> = ({
    width,
    height,
    top,
    left,
    isComponent,
    className,
    children,
    strokeWidth = 2,
}) => {
    if (width === undefined || height === undefined || top === undefined || left === undefined) {
        return null;
    }

    console.log('BaseRect rendering with dimensions:', { width, height, top, left });

    return (
        <div
            style={{
                position: 'absolute',
                top: `${top}px`,
                left: `${left}px`,
                width: `${width}px`,
                height: `${height}px`,
                pointerEvents: 'none',
                boxSizing: 'border-box',
                border: `${strokeWidth}px solid ${isComponent ? colors.purple[500] : colors.red[500]}`,
                zIndex: 1000,
            }}
            className={className}
            data-onlook-ignore="true"
            id={EditorAttributes.ONLOOK_RECT_ID}
        >
            {children}
        </div>
    );
};
