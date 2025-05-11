import type { Frame, FrameType, RectDimension, RectPosition, WebFrame } from '@onlook/models';
import { makeObservable, observable } from 'mobx';
import type { Orientation, Theme } from '../../../../../../../../packages/constants/src/frame';

export class FrameImpl implements Frame {
    id: string;
    position: RectPosition;
    dimension: RectDimension;
    type: FrameType;
    device: string | null;
    orientation: Orientation | null;
    aspectRatioLocked: boolean | null;
    theme: Theme | null;

    constructor({ id, position, dimension, type, device, orientation, aspectRatioLocked, theme }: Frame) {
        this.id = id;
        this.position = position;
        this.dimension = dimension;
        this.type = type;
        this.device = device;
        this.orientation = orientation;
        this.aspectRatioLocked = aspectRatioLocked;
        this.theme = theme;

        makeObservable(this, {
            id: observable,
            position: observable,
            dimension: observable,
            type: observable,
        });
    }

    static fromJSON(json: Frame) {
        return new FrameImpl(json);
    }
}

export class WebFrameImpl extends FrameImpl implements WebFrame {
    url: string;

    constructor({ id, position, dimension, type, url }: WebFrame) {
        super({ id, position, dimension, type });
        this.url = url;

        makeObservable(this, {
            url: observable,
        });
    }

    static fromJSON(json: WebFrame) {
        return new WebFrameImpl(json);
    }
}
