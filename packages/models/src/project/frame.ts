import type { RectDimension, RectPosition } from "./rect";
import { Orientation, Theme } from "@onlook/constants";

export enum FrameType {
    WEB = 'web',
}

export interface Frame {
    id: string;
    position: RectPosition;
    type: FrameType;
    dimension: RectDimension;
    orientation: Orientation | null;
    aspectRatioLocked: boolean | null;
    device: string | null;
    theme: Theme | null;
}

export interface WebFrame extends Frame {
    url: string;
    type: FrameType.WEB;
}
