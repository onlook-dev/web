import type { FrameType, WebFrame } from '@onlook/models';
import type { Frame as DbFrame } from '../schema';
import { deviceOptions, Orientation } from '@Onlook/constants';

export const toFrame = (dbFrame: DbFrame): WebFrame => {
    return {
        id: dbFrame.id,
        url: dbFrame.url,
        type: dbFrame.type as FrameType,
        position: {
            x: Number(dbFrame.x),
            y: Number(dbFrame.y),
        },
        dimension: {
            width: Number(dbFrame.width),
            height: Number(dbFrame.height),
        },
        windowMetadata: {
            orientation:
                dbFrame.width > dbFrame.height ? Orientation.Landscape : Orientation.Portrait,
            aspectRatioLocked: true,
            device: computeDevice(dbFrame.width, dbFrame.height),
            theme: null,
        },
    };
};

export const fromFrame = (canvasId: string, frame: WebFrame): DbFrame => {
    return {
        id: frame.id,
        url: frame.url,
        type: frame.type as FrameType,
        x: frame.position.x.toString(),
        y: frame.position.y.toString(),
        canvasId: canvasId,
        width: frame.dimension.width.toString(),
        height: frame.dimension.height.toString(),
    };
};

const computeDevice = (width: string, height: string): string => {
    let matchedDevice = 'Custom';

    for (const category in deviceOptions) {
        const devices = deviceOptions[category as keyof typeof deviceOptions];

        for (const deviceName in devices) {
            const resolution = devices[deviceName];
            if (typeof resolution === 'string') {
                const [w, h] = resolution.split('x').map(Number);
                if (w === Number(width) && h === Number(height)) {
                    matchedDevice = deviceName;
                    break;
                }
            }
        }

        if (matchedDevice !== 'Custom') break;
    }
    return matchedDevice;
};
