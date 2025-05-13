import type { RectDimension, RectPosition } from './rect';
import { Orientation, Theme } from '@onlook/constants';

export enum FrameType {
    WEB = 'web',
}

export interface Frame {
    id: string;
    position: RectPosition;
    type: FrameType;
    dimension: RectDimension;
    windowMetadata: WindowMetadata;
}

export interface WebFrame extends Frame {
    url: string;
    type: FrameType.WEB;
}

export interface WindowMetadata {
    orientation?: Orientation | null;
    aspectRatioLocked?: boolean | null;
    device?: string | null;
    theme?: Theme | null;
}
