import { useEditorEngine } from '@/components/store';
import type { FrameData } from '@/components/store/editor/engine/frames';
import { getRelativeMousePositionToFrame } from '@/components/store/editor/engine/overlay/utils';
import type { DomElement, ElementPosition, WebFrame } from '@onlook/models';
import { EditorMode, MouseAction } from '@onlook/models';
import { cn } from '@onlook/ui/utils';
import throttle from 'lodash/throttle';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { RightClickMenu } from './right-click';

export const GestureScreen = observer(({ frame, webFrame }: { frame: WebFrame, webFrame?: any }) => {
    const editorEngine = useEditorEngine();
    const reactFlowInstance = useReactFlow();
    const isResizing = false;
    const gestureRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        console.log(`GestureScreen mounted/updated for frame ${frame.id}`, {
            webFrameExists: !!webFrame,
            nodeId: editorEngine.state.getNodeIdFromFrameId(frame.id),
        });
        
        if (reactFlowInstance) {
            const viewport = reactFlowInstance.getViewport();
            console.log('React Flow viewport:', viewport);
        }
    }, [frame.id, webFrame, reactFlowInstance, editorEngine.state]);

    const getFrameData: () => FrameData | undefined = () => {
        const frameData = editorEngine.frames.get(frame.id);
        if (!frameData) {
            console.error(`No frame data found for frame: ${frame.id}`);
        }
        return frameData;
    }

    const getRelativeMousePosition = (e: React.MouseEvent<HTMLDivElement>): ElementPosition => {
        const frameData = getFrameData();
        if (!frameData) {
            console.error('No frame data found for frame:', frame.id);
            return { x: 0, y: 0 };
        }
        
        const { view } = frameData;
        console.log('Getting mouse position for frame:', frame.id, 'view:', view ? 'exists' : 'missing');
        
        if (!view) {
            console.error('No view found for frame:', frame.id);
            return { x: 0, y: 0 };
        }
        
        const position = getRelativeMousePositionToFrame(e, view);
        console.log('Mouse position relative to frame:', position);
        return position;
    }

    const handleMouseEvent = useCallback(
        async (e: React.MouseEvent<HTMLDivElement>, action: MouseAction) => {
            e.stopPropagation(); // Prevent event from bubbling up to React Flow
            
            console.log(`handleMouseEvent called with action: ${action} for frame ${frame.id}`);
            
            const frameData = getFrameData();
            if (!frameData) {
                console.error('Frame data not found');
                return;
            }
            
            console.log('Frame data found:', frameData.frame.id);
            
            const pos = getRelativeMousePosition(e);
            const shouldGetStyle = [MouseAction.MOUSE_DOWN, MouseAction.DOUBLE_CLICK].includes(action);
            
            console.log(`Calling getElementAtLoc with pos: ${pos.x}, ${pos.y}, shouldGetStyle: ${shouldGetStyle}`);
            
            if (action === MouseAction.MOVE) {
                editorEngine.overlay.refreshOverlay();
            }
            
            try {
                if (!frameData.view || !frameData.view.getElementAtLoc) {
                    console.error('getElementAtLoc function not available on frame view');
                    return;
                }
                
                const el: DomElement = await frameData.view.getElementAtLoc(pos.x, pos.y, shouldGetStyle);
                console.log('getElementAtLoc result:', el ? `${el.tagName} with rect ${JSON.stringify(el.rect)}` : 'null');
                
                if (!el) {
                    console.log('No element found');
                    return;
                }

                switch (action) {
                    case MouseAction.MOVE:
                        console.log('Calling mouseover with element:', el.tagName);
                        editorEngine.elements.mouseover(el, frameData);
                        console.log('Mouse over element:', el.tagName, el.rect);
                        break;
                    case MouseAction.MOUSE_DOWN:
                        if (el.tagName.toLocaleLowerCase() === 'body') {
                            editorEngine.frames.select(frame);
                            return;
                        }
                        // Ignore right-clicks
                        if (e.button == 2) {
                            break;
                        }
                        if (e.shiftKey) {
                            editorEngine.elements.shiftClick(el, frameData);
                        } else {
                            editorEngine.elements.click([el], frameData);
                        }
                        break;
                    case MouseAction.DOUBLE_CLICK:
                        break;
                }
            } catch (error) {
                console.error('Error in handleMouseEvent:', error);
            }
        },
        [getRelativeMousePosition, editorEngine, frame],
    );

    const throttledMouseMove = useMemo(
        () =>
            throttle((e: React.MouseEvent<HTMLDivElement>) => {
                handleMouseEvent(e, MouseAction.MOVE);
            }, 16),
        [handleMouseEvent],
    );

    useEffect(() => {
        return () => {
            throttledMouseMove.cancel();
        };
    }, [throttledMouseMove]);

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            e.stopPropagation(); // Prevent event from bubbling up to React Flow
            console.log(`Click in gesture screen for frame ${frame.id}`);
            editorEngine.frames.select(frame);
        },
        [editorEngine.frames, frame],
    );

    function handleDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation(); // Prevent event from bubbling up to React Flow
        console.log(`Double click in gesture screen for frame ${frame.id}`);
    }

    function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation(); // Prevent event from bubbling up to React Flow
        console.log(`Mouse down in gesture screen for frame ${frame.id}`);
        
        if (editorEngine.state.editorMode === EditorMode.DESIGN) {
            handleMouseEvent(e, MouseAction.MOUSE_DOWN);
        } else if (
            editorEngine.state.editorMode === EditorMode.INSERT_DIV ||
            editorEngine.state.editorMode === EditorMode.INSERT_TEXT ||
            editorEngine.state.editorMode === EditorMode.INSERT_IMAGE
        ) {
        }
    }

    function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation(); // Prevent event from bubbling up to React Flow
        console.log(`Mouse up in gesture screen for frame ${frame.id}`);
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.stopPropagation(); // Prevent event from bubbling up to React Flow
        e.preventDefault();
        console.log(`Drag over in gesture screen for frame ${frame.id}`);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.stopPropagation(); // Prevent event from bubbling up to React Flow
        e.preventDefault();
        console.log(`Drop in gesture screen for frame ${frame.id}`);
    };

    const gestureScreenClassName = useMemo(() => {
        return cn(
            'absolute inset-0 bg-transparent z-10', // Higher z-index to ensure it captures events
            editorEngine.state.editorMode === EditorMode.PREVIEW && !isResizing ? 'hidden' : 'visible',
            editorEngine.state.editorMode === EditorMode.INSERT_DIV && 'cursor-crosshair',
            editorEngine.state.editorMode === EditorMode.INSERT_TEXT && 'cursor-text',
            'nodrag', // Tell React Flow not to drag when interacting with this element
        );
    }, [editorEngine.state.editorMode, isResizing]);

    const handleMouseOut = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation(); // Prevent event from bubbling up to React Flow
        console.log(`Mouse out in gesture screen for frame ${frame.id}`);
        editorEngine.elements.clearHoveredElement();
        editorEngine.overlay.state.removeHoverRect();
    }

    return (
        <RightClickMenu>
            <div
                ref={gestureRef}
                className={gestureScreenClassName}
                onClick={handleClick}
                onMouseOut={handleMouseOut}
                onMouseLeave={handleMouseUp}
                onMouseMove={throttledMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                data-frame-id={frame.id}
                data-testid={`gesture-screen-${frame.id}`}
                style={{ pointerEvents: 'all' }}
            ></div>
        </RightClickMenu>
    );
});
