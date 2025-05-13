"use client";

import { Button } from "@onlook/ui-v4/button";
import { Icons } from "@onlook/ui-v4/icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@onlook/ui-v4/dropdown-menu";

export const ColorBackground = () => {
    return (
        <div className="flex flex-col gap-2">
            <Popover>
                <PopoverTrigger>
                    <div className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border active:bg-background-tertiary/20 active:border-border flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border px-5 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border active:text-white">
                        <Icons.PaintBucket className="!h-1.5 !w-1.5" />
                        <div
                            className="h-[5px] w-6 rounded-full bg-current border-[0.5px] border-background-primary"
                            style={{ backgroundColor: tempColor }}
                        />
                    </div>
                </PopoverTrigger>
                <PopoverContent
                    className="z-10 w-[280px] overflow-hidden rounded-lg p-0 shadow-xl backdrop-blur-lg"
                    side="bottom"
                    align="start"
                >
                    <ColorPickerContent
                        color={Color.from(tempColor)}
                        onChange={handleColorChange}
                        onChangeEnd={handleColorChangeEnd}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
};
