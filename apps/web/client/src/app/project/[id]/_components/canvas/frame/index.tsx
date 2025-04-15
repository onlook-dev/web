import { FrameType, type Frame, type WebFrame } from "@onlook/models";
import { observer } from "mobx-react-lite";
import { useRef } from "react";
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

        return (
            <div
                className="flex flex-col"
                style={{
                    width: frame.dimension.width,
                    height: frame.dimension.height,
                }}
            >
                <TopBar frame={frame} />
                <div className="relative w-full h-full">
                    <ResizeHandles frame={frame} />
                    {frame.type === FrameType.WEB && <WebFrameComponent frame={frame as WebFrame} ref={webFrameRef} />}
                    {frame.type === FrameType.WEB && <GestureScreen frame={frame as WebFrame} />}
                    {/* {domFailed && shouldShowDomFailed && renderNotRunning()} */}
                </div>
            </div>
        );
    });
