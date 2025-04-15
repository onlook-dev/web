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

    const nodeTransform = new DOMMatrix(getComputedStyle(frameNode as HTMLElement).transform);
    
    const reactFlowPane = document.querySelector('.react-flow__pane');
    if (!reactFlowPane) {
        console.error('React Flow pane not found');
        return rect;
    }
    
    const paneTransform = new DOMMatrix(getComputedStyle(reactFlowPane as HTMLElement).transform);
    
    // Get scale from transform matrix
    const scale = inverse ? 1 / paneTransform.a : paneTransform.a;

    // Transform coordinates to fixed overlay space
    return {
        width: rect.width * scale,
        height: rect.height * scale,
        top: (rect.top + nodeTransform.m42) * scale,
        left: (rect.left + nodeTransform.m41) * scale,
    };
}

export function adaptValueToCanvas(value: number, inverse = false): number {
    const reactFlowPane = document.querySelector('.react-flow__pane');
    if (!reactFlowPane) {
        console.error('React Flow pane not found');
        return value;
    }
    
    const paneTransform = new DOMMatrix(getComputedStyle(reactFlowPane as HTMLElement).transform);
    const scale = inverse ? 1 / paneTransform.a : paneTransform.a; // Get scale from transform matrix
    return value * scale;
}

/**
 * Get the relative mouse position a webview element inside a React Flow node.
 * This accounts for React Flow node transforms and pane scaling.
 */
export function getRelativeMousePositionToFrame(
    e: React.MouseEvent<HTMLDivElement>,
    frameView: WebFrameView,
    inverse: boolean = false,
): ElementPosition {
    const rect = frameView.getBoundingClientRect();
    
    const reactFlowPane = document.querySelector('.react-flow__pane');
    if (!reactFlowPane) {
        console.error('React Flow pane not found');
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    
    const paneTransform = new DOMMatrix(getComputedStyle(reactFlowPane as HTMLElement).transform);
    const scale = paneTransform.a || 1; // Get scale from transform matrix
    
    // Calculate position relative to the frame, accounting for React Flow scale
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    return { x, y };
}
