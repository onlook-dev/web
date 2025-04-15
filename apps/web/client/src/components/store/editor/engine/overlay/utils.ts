import type { WebFrameView } from '@/app/project/[id]/_components/canvas/frame/web-frame';
import { EditorAttributes } from '@onlook/constants';
import type { ElementPosition, RectDimensions } from '@onlook/models';

/**
 * Calculates the cumulative offset between an element and its ancestor,
 * taking into account CSS transforms and offset positions.
 */
export function getRelativeOffset(element: HTMLElement, ancestor: HTMLElement) {
    let top = 0,
        left = 0;
    let currentElement = element;

    while (currentElement && currentElement !== ancestor) {
        // Handle CSS transforms
        const transform = window.getComputedStyle(currentElement).transform;
        if (transform && transform !== 'none') {
            const matrix = new DOMMatrix(transform);
            top += matrix.m42; // translateY
            left += matrix.m41; // translateX
        }

        // Add offset positions
        top += currentElement.offsetTop || 0;
        left += currentElement.offsetLeft || 0;

        // Move up to parent
        const offsetParent = currentElement.offsetParent as HTMLElement;
        if (!offsetParent || offsetParent === ancestor) {
            break;
        }
        currentElement = offsetParent;
    }

    return { top, left };
}

/**
 * Adapts a rectangle from a webview element to the overlay coordinate space.
 * This ensures that overlay rectangles perfectly match the source elements,
 * accounting for React Flow node transforms.
 */
export function adaptRectToCanvas(
    rect: RectDimensions,
    frameView: WebFrameView,
    inverse = false,
): RectDimensions {
    const frameNode = frameView.closest('.react-flow__node');
    if (!frameNode) {
        console.error('React Flow node not found');
        return rect;
    }

    const iframeRect = frameView.getBoundingClientRect();
    
    const nodeTransform = new DOMMatrix(getComputedStyle(frameNode as HTMLElement).transform);
    
    const reactFlowViewport = document.querySelector('.react-flow__viewport');
    if (!reactFlowViewport) {
        console.error('React Flow viewport not found');
        return rect;
    }
    
    const viewportTransform = new DOMMatrix(getComputedStyle(reactFlowViewport as HTMLElement).transform);
    
    // Get scale from transform matrix
    const scale = inverse ? 1 / viewportTransform.a : viewportTransform.a;
    
    // Calculate the position relative to the iframe
    const nodeRect = (frameNode as HTMLElement).getBoundingClientRect();
    const overlayContainer = document.getElementById(EditorAttributes.OVERLAY_CONTAINER_ID);
    const overlayRect = overlayContainer?.getBoundingClientRect() || { top: 0, left: 0 };
    
    return {
        width: rect.width * scale,
        height: rect.height * scale,
        top: (rect.top + iframeRect.top - overlayRect.top) * scale,
        left: (rect.left + iframeRect.left - overlayRect.left) * scale,
    };
}

export function adaptValueToCanvas(value: number, inverse = false): number {
    const reactFlowViewport = document.querySelector('.react-flow__viewport');
    if (!reactFlowViewport) {
        console.error('React Flow viewport not found');
        return value;
    }
    
    const viewportTransform = new DOMMatrix(getComputedStyle(reactFlowViewport as HTMLElement).transform);
    const scale = inverse ? 1 / viewportTransform.a : viewportTransform.a; // Get scale from transform matrix
    return value * scale;
}

/**
 * Get the relative mouse position a webview element inside a React Flow node.
 * This accounts for React Flow node transforms and viewport scaling.
 */
export function getRelativeMousePositionToFrame(
    e: React.MouseEvent<HTMLDivElement>,
    frameView: WebFrameView,
    inverse: boolean = false,
): ElementPosition {
    const rect = frameView.getBoundingClientRect();
    
    const reactFlowViewport = document.querySelector('.react-flow__viewport');
    if (!reactFlowViewport) {
        console.error('React Flow viewport not found');
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    
    const viewportTransform = new DOMMatrix(getComputedStyle(reactFlowViewport as HTMLElement).transform);
    const scale = viewportTransform.a || 1; // Get scale from transform matrix
    
    // Calculate position relative to the iframe, accounting for React Flow scale
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    return { x, y };
}
