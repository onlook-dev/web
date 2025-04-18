import { useEditorEngine } from "@/components/store";
import { Icons } from "@onlook/ui/icons";
import { useEffect, useState } from "react";
import type { CssValue } from ".";
import { InputRadio } from "../../inputs/input-radio";

const verticalAlignOptions: Record<string, CssValue> = {
    top: { value: "top", label: "Top", icon: <Icons.AlignTop className="h-4 w-4" /> },
    center: { value: "center", label: "Center", icon: <Icons.AlignCenterVertically className="h-4 w-4" /> },
    bottom: { value: "bottom", label: "Bottom", icon: <Icons.AlignBottom className="h-4 w-4" /> },
    "space-between": { value: "space-between", label: "Space Between", icon: <Icons.SpaceBetweenVertically className="h-4 w-4" /> },
};

const horizontalAlignOptions: Record<string, CssValue> = {
    left: { value: "left", label: "Left", icon: <Icons.AlignLeft className="h-4 w-4" /> },
    center: { value: "center", label: "Center", icon: <Icons.AlignCenterHorizontally className="h-4 w-4" /> },
    right: { value: "right", label: "Right", icon: <Icons.AlignRight className="h-4 w-4" /> },
    "space-between": { value: "space-between", label: "Space Between", icon: <Icons.SpaceBetweenHorizontally className="h-4 w-4" /> },
};

export const VerticalAlignInput = () => {
    const editorEngine = useEditorEngine();
    const [value, setValue] = useState<string>(editorEngine.style.getValue("align-items") ?? "top");

    useEffect(() => {
        setValue(editorEngine.style.getValue("align-items") ?? "top");
    }, [editorEngine.style.selectedStyle]);

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-24">Vertical</span>
            <InputRadio
                options={Object.values(verticalAlignOptions)}
                value={value}
                onChange={(newValue) => {
                    setValue(newValue);
                    editorEngine.style.update("align-items", newValue);
                }}
                className="flex-1"
            />
        </div>
    );
};

export const HorizontalAlignInput = () => {
    const editorEngine = useEditorEngine();
    const [value, setValue] = useState<string>(editorEngine.style.getValue("justify-content") ?? "left");

    useEffect(() => {
        setValue(editorEngine.style.getValue("justify-content") ?? "left");
    }, [editorEngine.style.selectedStyle]);

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-24">Horizontal</span>
            <InputRadio
                options={Object.values(horizontalAlignOptions)}
                value={value}
                onChange={(newValue) => {
                    setValue(newValue);
                    editorEngine.style.update("justify-content", newValue);
                }}
                className="flex-1"
            />
        </div>
    );
};