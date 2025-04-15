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
        
        // Get the React Flow wrapper element (the container for the entire flow)
        const reactFlowWrapper = document.querySelector('.react-flow');
        if (!reactFlowWrapper) {
            console.error('React Flow wrapper not found');
            return rect;
        }
        
        // Get the overlay container
        const overlayContainer = document.getElementById(EditorAttributes.OVERLAY_CONTAINER_ID);
        if (!overlayContainer) {
            console.error('Overlay container not found');
            return rect;
        }
        
        // Get the bounding rectangles for various elements
        const wrapperRect = reactFlowWrapper.getBoundingClientRect();
        const nodeRect = frameNode.getBoundingClientRect();
        const overlayRect = overlayContainer.getBoundingClientRect();
        
        // Get the viewport transform matrix (contains zoom and pan information)
        const viewportTransform = new DOMMatrix(getComputedStyle(reactFlowViewport as HTMLElement).transform);
        const scale = viewportTransform.a; // Extract scale from transform matrix
        
        // Get the node's data attributes for debugging
        const frameId = frameNode.getAttribute('data-frame-id');
        const nodeId = frameNode.getAttribute('data-node-id');
        
        // and the element's position within the iframe
        
        // 1. Get the position of the element within the iframe
        const elementInIframeX = rect.left;
        const elementInIframeY = rect.top;
        
        // 2. Calculate the position of the iframe relative to the overlay container
        const iframeToOverlayX = iframeRect.left - overlayRect.left;
        const iframeToOverlayY = iframeRect.top - overlayRect.top;
        
        // 3. Calculate the final position in the overlay space
        const absoluteX = iframeToOverlayX + (elementInIframeX * scale);
        const absoluteY = iframeToOverlayY + (elementInIframeY * scale);
        
        // Log detailed information for debugging
        console.log('Overlay calculation (direct):', {
            frameId,
            nodeId,
            rect: {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
            },
            scale,
            iframeRect: {
                left: iframeRect.left,
                top: iframeRect.top,
                width: iframeRect.width,
                height: iframeRect.height
            },
            nodeRect: {
                left: nodeRect.left,
                top: nodeRect.top,
                width: nodeRect.width,
                height: nodeRect.height
            },
            overlayRect: {
                left: overlayRect.left,
                top: overlayRect.top,
                width: overlayRect.width,
                height: overlayRect.height
            },
            iframeToOverlay: {
                x: iframeToOverlayX,
                y: iframeToOverlayY
            },
            elementInIframe: {
                x: elementInIframeX,
                y: elementInIframeY
            },
            viewportTransform: {
                x: viewportTransform.m41,
                y: viewportTransform.m42,
                scale
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
    try {
        // Get the bounding rectangle of the iframe
        const rect = frameView.getBoundingClientRect();
        
        const frameNode = frameView.closest('.react-flow__node');
        if (!frameNode) {
            console.error('React Flow node not found');
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
        
        // Get the React Flow viewport element
        const reactFlowViewport = document.querySelector('.react-flow__viewport');
        if (!reactFlowViewport) {
            console.error('React Flow viewport not found');
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
        
        // Get the React Flow wrapper element
        const reactFlowWrapper = document.querySelector('.react-flow');
        if (!reactFlowWrapper) {
            console.error('React Flow wrapper not found');
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
        
        // Get the viewport transform matrix to extract the scale
        const viewportTransform = new DOMMatrix(getComputedStyle(reactFlowViewport as HTMLElement).transform);
        const scale = viewportTransform.a || 1; // Get scale from transform matrix
        
        // Get the node transform matrix
        const nodeTransform = new DOMMatrix(getComputedStyle(frameNode as HTMLElement).transform);
        
        // Get the node's data attributes for debugging
        const frameId = frameNode.getAttribute('data-frame-id');
        const nodeId = frameNode.getAttribute('data-node-id');
        
        // Get the node's bounding rectangle
        const nodeRect = frameNode.getBoundingClientRect();
        
        // Calculate the position of the mouse relative to the iframe
        // 1. The mouse position in client coordinates
        
        const rawOffsetX = e.clientX - rect.left;
        const rawOffsetY = e.clientY - rect.top;
        
        const adjustedX = rawOffsetX / scale;
        const adjustedY = rawOffsetY / scale;
        
        console.log('Mouse position relative to frame (improved):', { 
            frameId,
            nodeId,
            original: { x: e.clientX, y: e.clientY },
            rect: { 
                left: rect.left, 
                top: rect.top,
                width: rect.width,
                height: rect.height
            },
            nodeRect: {
                left: nodeRect.left,
                top: nodeRect.top,
                width: nodeRect.width,
                height: nodeRect.height
            },
            rawOffset: { x: rawOffsetX, y: rawOffsetY },
            adjusted: { x: adjustedX, y: adjustedY },
            scale,
            nodeTransform: {
                x: nodeTransform.m41,
                y: nodeTransform.m42
            },
            viewportTransform: {
                x: viewportTransform.m41,
                y: viewportTransform.m42,
                scale
            }
        });
        
        return { x: adjustedX, y: adjustedY };
    } catch (error) {
        console.error('Error in getRelativeMousePositionToFrame:', error);
        return { x: e.clientX - frameView.getBoundingClientRect().left, y: e.clientY - frameView.getBoundingClientRect().top };
    }
}
