import { useEditorEngine } from '@/components/store';
import type { FrameData } from '@/components/store/editor/engine/frames';
import { getRelativeMousePositionToFrame } from '@/components/store/editor/engine/overlay/utils';
import type { DomElement, ElementPosition, WebFrame } from '@onlook/models';
import { EditorMode, MouseAction } from '@onlook/models';
import { cn } from '@onlook/ui/utils';
import throttle from 'lodash/throttle';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo } from 'react';
import { RightClickMenu } from './right-click';

export const GestureScreen = observer(({ frame }: { frame: WebFrame }) => {
    const editorEngine = useEditorEngine();
    const isResizing = false;

    const getFrameData: () => FrameData | undefined = () => {
        return editorEngine.frames.get(frame.id);
    }

    const getRelativeMousePosition = (e: React.MouseEvent<HTMLDivElement>): ElementPosition => {
        const frameData = getFrameData();
        if (!frameData) {
            return { x: 0, y: 0 };
        }
        const { view } = frameData;
        return getRelativeMousePositionToFrame(e, view);
    }

    const handleMouseEvent = useCallback(
        async (e: React.MouseEvent<HTMLDivElement>, action: MouseAction) => {
            const frameData = getFrameData();
            if (!frameData) {
                console.error('Frame data not found');
                return;
            }
            const pos = getRelativeMousePosition(e);
            const shouldGetStyle = [MouseAction.MOUSE_DOWN, MouseAction.DOUBLE_CLICK].includes(action);
            const el: DomElement = await frameData.view.getElementAtLoc(pos.x, pos.y, shouldGetStyle);
            if (!el) {
                console.log('No element found');
                return;
            }

            switch (action) {
                case MouseAction.MOVE:
                    editorEngine.elements.mouseover(el, frameData);
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
        },
        [getRelativeMousePosition, editorEngine],
    );

    const throttledMouseMove = useMemo(
        () =>
            throttle((e: React.MouseEvent<HTMLDivElement>) => {
                handleMouseEvent(e, MouseAction.MOVE);
            }, 16),
        [editorEngine, getRelativeMousePosition, handleMouseEvent],
    );

    useEffect(() => {
        return () => {
            throttledMouseMove.cancel();
        };
    }, [throttledMouseMove]);

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            editorEngine.frames.select(frame);
        },
        [editorEngine.frames],
    );

    function handleDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
    }

    function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        if (editorEngine.state.editorMode === EditorMode.DESIGN) {
            handleMouseEvent(e, MouseAction.MOUSE_DOWN);
        } else if (
            editorEngine.state.editorMode === EditorMode.INSERT_DIV ||
            editorEngine.state.editorMode === EditorMode.INSERT_TEXT ||
            editorEngine.state.editorMode === EditorMode.INSERT_IMAGE
        ) {
        }
    }

    async function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const gestureScreenClassName = useMemo(() => {
        return cn(
            'absolute inset-0 bg-transparent',
            editorEngine.state.editorMode === EditorMode.PREVIEW && !isResizing ? 'hidden' : 'visible',
            editorEngine.state.editorMode === EditorMode.INSERT_DIV && 'cursor-crosshair',
            editorEngine.state.editorMode === EditorMode.INSERT_TEXT && 'cursor-text',
        );
    }, [editorEngine.state.editorMode, isResizing]);

    const handleMouseOut = () => {
        editorEngine.elements.clearHoveredElement();
        editorEngine.overlay.state.removeHoverRect();
    }

    return (
        <RightClickMenu>
            <div
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
            ></div>
        </RightClickMenu>
    );
});
