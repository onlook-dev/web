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
    try {
        const frameNode = frameView.closest('.react-flow__node');
        if (!frameNode) {
            console.error('React Flow node not found');
            return rect;
        }

        // Get the iframe's bounding rectangle
        const iframeRect = frameView.getBoundingClientRect();
        
        // Get the React Flow viewport element
        const reactFlowViewport = document.querySelector('.react-flow__viewport');
        if (!reactFlowViewport) {
            console.error('React Flow viewport not found');
            return rect;
        }
        
        // Get the React Flow wrapper element
        const reactFlowWrapper = document.querySelector('.react-flow');
        if (!reactFlowWrapper) {
            console.error('React Flow wrapper not found');
            return rect;
        }
        
        const wrapperRect = reactFlowWrapper.getBoundingClientRect();
        
        // Get the viewport transform matrix (contains zoom and pan information)
        const viewportTransform = new DOMMatrix(getComputedStyle(reactFlowViewport as HTMLElement).transform);
        
        // Get the node transform matrix (contains node position)
        const nodeTransform = new DOMMatrix(getComputedStyle(frameNode as HTMLElement).transform);
        
        // Get the overlay container
        const overlayContainer = document.getElementById(EditorAttributes.OVERLAY_CONTAINER_ID);
        if (!overlayContainer) {
            console.error('Overlay container not found');
            return rect;
        }
        
        const scale = viewportTransform.a;
        
        const nodeX = nodeTransform.m41;
        const nodeY = nodeTransform.m42;
        
        // Get the viewport position
        const viewportX = viewportTransform.m41;
        const viewportY = viewportTransform.m42;
        
        // Calculate the position of the element within the iframe, accounting for scale
        const elementX = rect.left * scale;
        const elementY = rect.top * scale;
        
        // Calculate the absolute position by combining:
        const absoluteX = elementX + (iframeRect.left - wrapperRect.left) + nodeX * scale + viewportX;
        const absoluteY = elementY + (iframeRect.top - wrapperRect.top) + nodeY * scale + viewportY;
        
        console.log('Overlay calculation:', {
            rect,
            elementX,
            elementY,
            iframeRect: {
                left: iframeRect.left,
                top: iframeRect.top,
            },
            wrapperRect: {
                left: wrapperRect.left,
                top: wrapperRect.top,
            },
            nodeTransform: {
                x: nodeX,
                y: nodeY,
            },
            viewportTransform: {
                x: viewportX,
                y: viewportY,
                scale,
            },
            result: {
                left: absoluteX,
                top: absoluteY,
                width: rect.width * scale,
                height: rect.height * scale,
            }
        });
        
        // Return the adjusted rectangle
        return {
            width: rect.width * scale,
            height: rect.height * scale,
            top: absoluteY,
            left: absoluteX,
        };
    } catch (error) {
        console.error('Error in adaptRectToCanvas:', error);
        return rect;
    }
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
    // Get the bounding rectangle of the iframe
    const rect = frameView.getBoundingClientRect();
    
    // Get the React Flow viewport element
    const reactFlowViewport = document.querySelector('.react-flow__viewport');
    if (!reactFlowViewport) {
        console.error('React Flow viewport not found');
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    
    // Get the viewport transform matrix to extract the scale
    const viewportTransform = new DOMMatrix(getComputedStyle(reactFlowViewport as HTMLElement).transform);
    const scale = viewportTransform.a || 1; // Get scale from transform matrix
    
    // Calculate position relative to the iframe, accounting for React Flow scale
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    console.log('Mouse position relative to frame:', { x, y, scale });
    
    return { x, y };
}
