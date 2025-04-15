import { FrameType, type Frame, type WebFrame } from "@onlook/models";
import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";
import { GestureScreen } from "./gesture";
import { ResizeHandles } from './resize-handles';
import { TopBar } from "./top-bar";
import { WebFrameComponent, type WebFrameView } from "./web-frame";

export const FrameView = observer(
    ({
        frame,
    }: {
        frame: Frame;
    }) => {
        const webFrameRef = useRef<WebFrameView>(null);
        const [webFrame, setWebFrame] = useState<WebFrameView | null>(null);

        useEffect(() => {
            if (webFrameRef.current) {
                console.log(`Setting webFrame for frame ${frame.id}`);
                setWebFrame(webFrameRef.current);
            }
        }, [webFrameRef.current, frame.id]);

        return (
            <div
                className="flex flex-col"
                style={{
                    width: frame.dimension.width,
                    height: frame.dimension.height,
                }}
                data-testid={`frame-view-${frame.id}`}
                onMouseEnter={() => console.log(`Mouse entered frame ${frame.id}`)}
            >
                <TopBar frame={frame} />
                <div className="relative w-full h-full">
                    <ResizeHandles frame={frame} />
                    {frame.type === FrameType.WEB && <WebFrameComponent frame={frame as WebFrame} ref={webFrameRef} />}
                    {frame.type === FrameType.WEB && webFrame && <GestureScreen frame={frame as WebFrame} webFrame={webFrame} />}
                </div>
            </div>
        );
    });
