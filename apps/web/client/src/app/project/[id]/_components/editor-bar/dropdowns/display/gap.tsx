import { useEditorEngine } from "@/components/store";
import { useState } from "react";
import { InputIcon } from "../../inputs/input-icon";

export const GapInput = () => {
    const editorEngine = useEditorEngine();
    const [value, setValue] = useState(12);
    const [unit, setUnit] = useState("px");

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-24">Gap</span>
            <InputIcon
                value={value}
                onChange={(newValue) => {
                    setValue(newValue);
                    editorEngine.style.update("gap", `${newValue}${unit}`);
                }}
                onUnitChange={(newUnit) => {
                    setUnit(newUnit);
                    editorEngine.style.update("gap", `${value}${newUnit}`);
                }}
            />
        </div>
    );
};
