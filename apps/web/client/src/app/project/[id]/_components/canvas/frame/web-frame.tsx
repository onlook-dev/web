import { useEditorEngine } from "@/components/store";
import type { DomElement, WebFrame } from "@onlook/models";
import { cn } from "@onlook/ui/utils";
import { observer } from "mobx-react-lite";
import { WindowMessenger, connect } from 'penpal';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type IframeHTMLAttributes } from 'react';

type PenpalRemote = {
    setFrameId: (frameId: string) => void;
    processDom: () => void;
    getElementAtLoc: (x: number, y: number, getStyle: boolean) => Promise<DomElement>;
    getDomElementByDomId: (domId: string, getStyle: boolean) => Promise<DomElement>;
};

// TODO: Move this to a shared package
export type WebFrameView = HTMLIFrameElement & {
    setZoomLevel: (level: number) => void;
    loadURL: (url: string) => void;
    supportsOpenDevTools: () => boolean;
    canGoForward: () => boolean;
    canGoBack: () => boolean;
    goForward: () => void;
    goBack: () => void;
    reload: () => void;
    isLoading: () => boolean;
    capturePageAsCanvas: () => Promise<HTMLCanvasElement>;
} & PenpalRemote;

interface WebFrameViewProps extends IframeHTMLAttributes<HTMLIFrameElement> {
    frame: WebFrame;
}

export const WebFrameComponent = observer(forwardRef<WebFrameView, WebFrameViewProps>(({ frame, ...props }, ref) => {
    const editorEngine = useEditorEngine();
    const [iframeRemote, setIframeRemote] = useState<any>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const zoomLevel = useRef(1);

    const setupPenpalConnection = useCallback(async (iframe: HTMLIFrameElement) => {
        console.log('Initializing penpal connection for frame', frame.id);
        if (!iframe?.contentWindow) {
            throw new Error('No content window found');
        }
        
        // Create a promise that resolves when the iframe is fully loaded
        const loadPromise = new Promise<void>((resolve) => {
            const checkLoaded = () => {
                if (iframe.contentDocument?.readyState === 'complete') {
                    resolve();
                } else {
                    setTimeout(checkLoaded, 100);
                }
            };
            checkLoaded();
        });
        
        // Wait for the iframe to be fully loaded
        await loadPromise;
        console.log('Iframe fully loaded for frame', frame.id);
        
        try {
            const messenger = new WindowMessenger({
                remoteWindow: iframe.contentWindow,
                // TODO: Use a proper origin
                allowedOrigins: ['*'],
            });
            
            const connection = connect({
                messenger,
                // Methods we are exposing to the iframe window.
                methods: {
                    logMessage: (message: string) => {
                        console.log(`Message from iframe ${frame.id}:`, message);
                    }
                }
            });
            
            console.log('Waiting for penpal connection promise for frame', frame.id);
            const remote = (await connection.promise) as unknown as PenpalRemote;
            console.log('Penpal connection promise resolved for frame', frame.id);
            
            if (!remote) {
                console.error('No remote connection established for frame', frame.id);
                return null;
            }
            
            console.log('Setting frame ID for frame', frame.id);
            await remote.setFrameId(frame.id);
            console.log('Processing DOM for frame', frame.id);
            await remote.processDom();
            
            setIframeRemote(remote);
            console.log('Penpal connection initialized for frame', frame.id, 'Remote methods:', Object.keys(remote));
            
            return remote;
        } catch (error) {
            console.error('Error establishing penpal connection for frame', frame.id, error);
            return null;
        }
    }, [frame.id, setIframeRemote]);

    const setupIframe = useCallback(async (iframe: HTMLIFrameElement) => {
        try {
            const remote = await setupPenpalConnection(iframe);
            
            if (!remote) {
                console.error('Failed to establish remote connection for frame', frame.id);
                return;
            }
            
            console.log('Remote connection established for frame', frame.id, 'with methods:', Object.keys(remote));
            
            // Create an enhanced iframe with the remote methods
            const enhancedIframe = iframe as WebFrameView;
            
            enhancedIframe.getElementAtLoc = async (x, y, getStyle) => {
                console.log('Enhanced iframe getElementAtLoc called with:', { x, y, getStyle });
                try {
                    if (!remote.getElementAtLoc) {
                        console.error('Remote getElementAtLoc not available');
                        return null;
                    }
                    const element = await remote.getElementAtLoc(x, y, getStyle);
                    console.log('Enhanced iframe getElementAtLoc result:', element ? `${element.tagName}` : 'null');
                    return element;
                } catch (error) {
                    console.error('Error in enhanced iframe getElementAtLoc:', error);
                    return null;
                }
            };
            
            enhancedIframe.getDomElementByDomId = async (domId, getStyle) => {
                console.log('Enhanced iframe getDomElementByDomId called with:', { domId, getStyle });
                try {
                    if (!remote.getDomElementByDomId) {
                        console.error('Remote getDomElementByDomId not available');
                        return null;
                    }
                    const element = await remote.getDomElementByDomId(domId, getStyle);
                    console.log('Enhanced iframe getDomElementByDomId result:', element ? `${element.tagName}` : 'null');
                    return element;
                } catch (error) {
                    console.error('Error in enhanced iframe getDomElementByDomId:', error);
                    return null;
                }
            };
            
            enhancedIframe.setFrameId = async (frameId) => {
                console.log('Enhanced iframe setFrameId called with:', frameId);
                try {
                    if (!remote.setFrameId) {
                        console.error('Remote setFrameId not available');
                        return null;
                    }
                    return await remote.setFrameId(frameId);
                } catch (error) {
                    console.error('Error in enhanced iframe setFrameId:', error);
                    return null;
                }
            };
            
            enhancedIframe.processDom = async () => {
                console.log('Enhanced iframe processDom called');
                try {
                    if (!remote.processDom) {
                        console.error('Remote processDom not available');
                        return null;
                    }
                    return await remote.processDom();
                } catch (error) {
                    console.error('Error in enhanced iframe processDom:', error);
                    return null;
                }
            };
            
            // Register the frame with a delay to ensure it's fully loaded
            setTimeout(() => {
                if (iframe && iframe.contentWindow) {
                    const existingFrame = editorEngine.frames.get(frame.id);
                    if (!existingFrame) {
                        editorEngine.frames.register(frame, enhancedIframe);
                        console.log('Frame registered successfully:', frame.id);
                        
                        const nodeId = editorEngine.state.getNodeIdFromFrameId(frame.id);
                        if (nodeId) {
                            console.log(`Found existing node mapping: ${nodeId} -> ${frame.id}`);
                        } else {
                            console.log(`No node mapping found for frame ${frame.id}`);
                        }
                    } else {
                        console.log(`Frame ${frame.id} already registered, updating view`);
                        existingFrame.view = enhancedIframe;
                    }
                }
            }, 200); // Slightly longer delay to ensure iframe is fully loaded
        } catch (error) {
            console.error('Initialize penpal connection failed:', error);
        }
    }, [setupPenpalConnection, frame, editorEngine.frames, editorEngine.state]);

    const handleIframeLoad = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe) {
            console.error('No iframe found');
            return;
        }

        if (iframe.contentDocument?.readyState === 'complete') {
            setupIframe(iframe);
        } else {
            iframe.addEventListener('load', () => setupIframe(iframe), { once: true });
        }
    }, [setupIframe]);

    useEffect(() => {
        handleIframeLoad();
    }, [handleIframeLoad]);

    useImperativeHandle(ref, () => {
        const iframe = iframeRef.current!;

        const enhancedIframe = Object.assign(iframe, {
            supportsOpenDevTools: () => {
                const contentWindow = iframe.contentWindow;
                return !!contentWindow && 'openDevTools' in contentWindow;
            },
            setZoomLevel: (level: number) => {
                zoomLevel.current = level;
                iframe.style.transform = `scale(${level})`;
                iframe.style.transformOrigin = 'top left';
            },
            loadURL: async (url: string) => {
                iframe.src = url;
            },
            canGoForward: () => {
                return (iframe.contentWindow?.history?.length ?? 0) > 0;
            },
            canGoBack: () => {
                return (iframe.contentWindow?.history?.length ?? 0) > 0;
            },
            goForward: () => {
                iframe.contentWindow?.history.forward();
            },
            goBack: () => {
                iframe.contentWindow?.history.back();
            },
            reload: () => {
                iframe.contentWindow?.location.reload();
            },
            isLoading: (): boolean => {
                const contentDocument = iframe.contentDocument;
                if (!contentDocument) {
                    throw new Error(
                        'Could not call isLoading(): iframe.contentDocument is null/undefined',
                    );
                }
                return contentDocument.readyState !== 'complete';
            },
            getElementAtLoc: async (x: number, y: number, getStyle: boolean) => {
                console.log('getElementAtLoc called with:', { x, y, getStyle });
                if (!iframeRemote?.getElementAtLoc) {
                    console.error('getElementAtLoc not available in iframeRemote');
                    return null;
                }
                try {
                    const element = await iframeRemote.getElementAtLoc(x, y, getStyle);
                    console.log('getElementAtLoc result:', element ? `${element.tagName} with rect ${JSON.stringify(element.rect)}` : 'null');
                    return element;
                } catch (error) {
                    console.error('Error in getElementAtLoc:', error);
                    return null;
                }
            },
            getDomElementByDomId: async (domId: string, getStyle: boolean) => {
                console.log('getDomElementByDomId called with:', { domId, getStyle });
                if (!iframeRemote?.getDomElementByDomId) {
                    console.error('getDomElementByDomId not available in iframeRemote');
                    return null;
                }
                try {
                    const element = await iframeRemote.getDomElementByDomId(domId, getStyle);
                    console.log('getDomElementByDomId result:', element ? `${element.tagName} with rect ${JSON.stringify(element.rect)}` : 'null');
                    return element;
                } catch (error) {
                    console.error('Error in getDomElementByDomId:', error);
                    return null;
                }
            },
            setFrameId: async (frameId: string) => {
                if (iframeRemote?.setFrameId) {
                    return iframeRemote.setFrameId(frameId);
                }
                console.error('setFrameId not available in iframeRemote');
                return null;
            },
            processDom: async () => {
                if (iframeRemote?.processDom) {
                    return iframeRemote.processDom();
                }
                console.error('processDom not available in iframeRemote');
                return null;
            }
        });

        // Register the frame with the editor engine if not already registered
        setTimeout(() => {
            const existingFrame = editorEngine.frames.get(frame.id);
            if (!existingFrame) {
                editorEngine.frames.register(frame, enhancedIframe as WebFrameView);
                console.log('Frame registered in useImperativeHandle:', frame.id);
            }
        }, 100);

        return enhancedIframe as WebFrameView;
    }, [iframeRemote, frame, editorEngine.frames]);
    return (
        <iframe
            ref={iframeRef}
            id={frame.id}
            className={cn(
                'backdrop-blur-sm transition outline outline-4 w-full h-full',
                // shouldShowDomFailed ? 'bg-transparent' : 'bg-white',
                // selected ? getSelectedOutlineColor() : 'outline-transparent',
            )}
            src={frame.url}
            sandbox="allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-downloads"
            allow="geolocation; microphone; camera; midi; encrypted-media"
            {...props}
        />
    );
}));
