import { EditorAttributes } from '@onlook/constants';
import type { RectDimensions } from '@onlook/models';
import { colors } from '@onlook/ui/tokens';
import React, { useEffect, useRef } from 'react';

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
    const rectRef = useRef<HTMLDivElement>(null);
    
    if (width === undefined || height === undefined || top === undefined || left === undefined) {
        return null;
    }

    console.log('BaseRect rendering with dimensions:', { width, height, top, left });
    
    useEffect(() => {
        if (rectRef.current) {
            const rect = rectRef.current.getBoundingClientRect();
            console.log('BaseRect actual position in viewport:', {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                requestedPosition: { top, left, width, height }
            });
            
            const reactFlowViewport = document.querySelector('.react-flow__viewport');
            if (reactFlowViewport) {
                const viewportTransform = new DOMMatrix(
                    getComputedStyle(reactFlowViewport as HTMLElement).transform
                );
                console.log('React Flow viewport transform:', {
                    x: viewportTransform.m41,
                    y: viewportTransform.m42,
                    scale: viewportTransform.a
                });
            }
        }
    }, [width, height, top, left]);

    return (
        <div
            ref={rectRef}
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
                transform: 'translate3d(0, 0, 0)', // Force GPU acceleration for smoother rendering
            }}
            className={className}
            data-onlook-ignore="true"
            id={EditorAttributes.ONLOOK_RECT_ID}
            data-rect-type={isComponent ? 'component' : 'hover'}
        >
            {children}
        </div>
    );
};
