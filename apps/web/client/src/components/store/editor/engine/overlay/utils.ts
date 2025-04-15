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
    
    const reactFlowViewport = document.querySelector('.react-flow__viewport');
    if (!reactFlowViewport) {
        console.error('React Flow viewport not found');
        return rect;
    }
    
    // Get the viewport transform matrix
    const viewportTransform = new DOMMatrix(getComputedStyle(reactFlowViewport as HTMLElement).transform);
    
    // Get the node transform matrix
    const nodeTransform = new DOMMatrix(getComputedStyle(frameNode as HTMLElement).transform);
    
    const overlayContainer = document.getElementById(EditorAttributes.OVERLAY_CONTAINER_ID);
    if (!overlayContainer) {
        console.error('Overlay container not found');
        return rect;
    }
    
    const overlayRect = overlayContainer.getBoundingClientRect();
    
    const reactFlowPane = document.querySelector('.react-flow__pane');
    if (!reactFlowPane) {
        console.error('React Flow pane not found');
        return rect;
    }
    
    const paneRect = reactFlowPane.getBoundingClientRect();
    
    // Calculate the scale
    const scale = viewportTransform.a;
    
    // Get the node position relative to the viewport
    const nodeX = nodeTransform.m41;
    const nodeY = nodeTransform.m42;
    
    // Calculate the position relative to the React Flow viewport
    const x = rect.left * scale;
    const y = rect.top * scale;
    
    // Calculate the position relative to the overlay container
    const absoluteX = x + iframeRect.left - paneRect.left + (nodeX * scale);
    const absoluteY = y + iframeRect.top - paneRect.top + (nodeY * scale);
    
    return {
        width: rect.width * scale,
        height: rect.height * scale,
        top: absoluteY,
        left: absoluteX,
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
