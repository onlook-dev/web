import { useEditorEngine } from '@/components/store';
import type { ClickRectState } from '@/components/store/editor/engine/overlay/state';
import { EditorAttributes } from '@onlook/constants';
import { EditorMode } from '@onlook/models';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { OverlayChat } from './elements/chat';
import { MeasurementOverlay } from './elements/measurement';
import { ClickRect } from './elements/rect/click';
import { HoverRect } from './elements/rect/hover';
import { InsertRect } from './elements/rect/insert';
import { TextEditor } from './elements/text';

// Memoize child components
const MemoizedInsertRect = memo(InsertRect);
const MemoizedClickRect = memo(ClickRect);
const MemoizedTextEditor = memo(TextEditor);
const MemoizedChat = memo(OverlayChat);
const MemoizedMeasurementOverlay = memo(MeasurementOverlay);

export const Overlay = observer(() => {
    const editorEngine = useEditorEngine();
    const reactFlowInstance = useReactFlow();
    const overlayRef = useRef<HTMLDivElement>(null);
    
    const { transform, width, height } = useStore();

    // Memoize overlay state values
    const overlayState = editorEngine.overlay.state;
    const isPreviewMode = editorEngine.state.editorMode === EditorMode.PREVIEW;
    const isSingleSelection = editorEngine.elements.selected.length === 1;

    const syncViewport = useCallback(() => {
        if (reactFlowInstance) {
            const { x, y, zoom } = reactFlowInstance.getViewport();
            console.log('Syncing viewport:', { x, y, zoom });
            editorEngine.canvas.position = { x, y };
            editorEngine.canvas.scale = zoom;
        }
    }, [reactFlowInstance, editorEngine.canvas]);

    useEffect(() => {
        syncViewport();
    }, [transform, syncViewport]);

    useEffect(() => {
        syncViewport();
    }, [syncViewport]);

    useEffect(() => {
        if (overlayState.hoverRect) {
            console.log('Hover rect updated:', overlayState.hoverRect.rect);
        }
    }, [overlayState.hoverRect]);

    // Memoize the container style object
    const containerStyle = useMemo(
        () => ({
            position: 'absolute',
            height: '100%',
            width: '100%',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            visibility: isPreviewMode ? 'hidden' : 'visible',
            zIndex: 10,
        }),
        [isPreviewMode],
    );

    // Memoize the clickRects rendering
    const clickRectsElements = useMemo(
        () =>
            overlayState.clickRects.map((rectState: ClickRectState) => (
                <MemoizedClickRect
                    key={rectState.id}
                    width={rectState.width}
                    height={rectState.height}
                    top={rectState.top}
                    left={rectState.left}
                    isComponent={rectState.isComponent}
                    styles={rectState.styles ?? {}}
                    shouldShowResizeHandles={isSingleSelection}
                />
            )),
        [overlayState.clickRects, isSingleSelection],
    );

    const viewportTransform = useMemo(() => {
        if (!reactFlowInstance) return '';
        const { x, y, zoom } = reactFlowInstance.getViewport();
        return `translate(${x}px, ${y}px) scale(${zoom})`;
    }, [reactFlowInstance, transform]);

    return (
        <div
            ref={overlayRef}
            style={containerStyle as React.CSSProperties}
            id={EditorAttributes.OVERLAY_CONTAINER_ID}
            className={cn(
                'transition-opacity duration-150 react-flow__overlay',
                {
                    'opacity-0': editorEngine.state.shouldHideOverlay,
                }
            )}
            onMouseMove={() => console.log('Mouse move on overlay container')}
        >
            <div 
                className="react-flow__viewport"
                style={{
                    transform: viewportTransform,
                    transformOrigin: '0 0',
                }}
                onMouseMove={(e) => console.log('Mouse move on viewport container', e.clientX, e.clientY)}
            >
                {overlayState.hoverRect && (
                    <HoverRect
                        rect={overlayState.hoverRect.rect}
                        isComponent={overlayState.hoverRect.isComponent}
                    />
                )}
                {overlayState.insertRect && <MemoizedInsertRect rect={overlayState.insertRect} />}
                {clickRectsElements}
                {
                    overlayState.textEditor && (
                        <MemoizedTextEditor
                            rect={overlayState.textEditor.rect}
                            content={overlayState.textEditor.content}
                            styles={overlayState.textEditor.styles}
                            onChange={overlayState.textEditor.onChange}
                            onStop={overlayState.textEditor.onStop}
                            isComponent={overlayState.textEditor.isComponent}
                        />
                    )
                }
                {
                    overlayState.measurement && (
                        <MemoizedMeasurementOverlay
                            fromRect={overlayState.measurement.fromRect}
                            toRect={overlayState.measurement.toRect}
                        />
                    )
                }
                {/*
                 <MemoizedChat
                        elementId={editorEngine.elements.selected[0]?.domId ?? ''}
                        selectedEl={overlayState.clickRects[0]}
                    /> 
                */}
            </div>
        </div>
    );
});
