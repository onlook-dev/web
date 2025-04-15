import { sendAnalytics } from "@/utils/analytics";
import { type BrandTabValue, EditorMode, EditorTabValue, type LeftPanelTabValue, SettingsTabValue } from "@onlook/models";
import { debounce } from "lodash";
import { makeAutoObservable } from "mobx";

export class StateManager {
    private _plansOpen = false;
    settingsOpen = false;
    hotkeysOpen = false;
    publishOpen = false;
    leftPanelLocked = false;
    private _canvasScrolling = false;
    canvasPanning = false;

    private _nodeFrameMap: Map<string, string> = new Map();

    editorMode: EditorMode = EditorMode.DESIGN;
    settingsTab: SettingsTabValue = SettingsTabValue.PREFERENCES;

    leftPanelTab: LeftPanelTabValue | null = null;
    rightPanelTab: EditorTabValue = EditorTabValue.CHAT;
    brandTab: BrandTabValue | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    set canvasScrolling(value: boolean) {
        this._canvasScrolling = value;
        this.resetCanvasScrolling();
    }

    get shouldHideOverlay() {
        return this._canvasScrolling || this.canvasPanning;
    }

    get plansOpen() {
        return this._plansOpen;
    }

    set plansOpen(open: boolean) {
        this._plansOpen = open;
        if (open) {
            sendAnalytics('open pro checkout');
        }
    }

    setNodeFrameMapping(nodeId: string, frameId: string) {
        this._nodeFrameMap.set(nodeId, frameId);
    }

    removeNodeFrameMapping(nodeId: string) {
        this._nodeFrameMap.delete(nodeId);
    }

    getFrameIdFromNodeId(nodeId: string): string | undefined {
        return this._nodeFrameMap.get(nodeId);
    }

    getNodeIdFromFrameId(frameId: string): string | undefined {
        for (const [nodeId, mappedFrameId] of this._nodeFrameMap.entries()) {
            if (mappedFrameId === frameId) {
                return nodeId;
            }
        }
        return undefined;
    }

    private resetCanvasScrolling() {
        this.resetCanvasScrollingDebounced();
    }

    private resetCanvasScrollingDebounced = debounce(() => {
        this.canvasScrolling = false;
    }, 150);

    dispose() {
        this.plansOpen = false;
        this.settingsOpen = false;
        this.hotkeysOpen = false;
        this.publishOpen = false;
        this._nodeFrameMap.clear();
        this.resetCanvasScrollingDebounced.cancel();
    }
}
