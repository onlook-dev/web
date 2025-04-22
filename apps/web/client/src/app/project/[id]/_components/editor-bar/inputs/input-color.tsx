"use client";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@onlook/ui/popover";
import { useState, useCallback } from "react";
import { ColorPickerContent } from "./color-picker";
import { Color } from "@onlook/utility";

interface InputColorProps {
  color: string;
  opacity: number;
  onColorChange?: (color: string) => void;
  onOpacityChange?: (opacity: number) => void;
}

export const InputColor = ({
  color,
  opacity,
  onColorChange,
  onOpacityChange,
}: InputColorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempColor, setTempColor] = useState(color);

  const handleColorChange = useCallback((newColor: Color) => {
    setTempColor(newColor.toHex());
  }, []);

  const handleColorChangeEnd = useCallback(
    (newColor: Color) => {
      const hexColor = newColor.toHex();
      setTempColor(hexColor);
      onColorChange?.(hexColor);
    },
    [onColorChange],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setTempColor(value);
      onColorChange?.(value);
    },
    [onColorChange],
  );

  const handleOpacityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value);
      if (!isNaN(value)) {
        onOpacityChange?.(value);
      }
    },
    [onOpacityChange],
  );

  return (
    <div className="flex h-9 w-full items-center">
      <div className="bg-background-tertiary/50 mr-[1px] flex h-full flex-1 items-center rounded-md px-3 py-1.5 pl-1.5">
        <Popover onOpenChange={setIsOpen}>
          <PopoverAnchor className="absolute bottom-0 left-0" />

          <PopoverTrigger>
            <div
              className="mr-2 aspect-square h-5 w-5 rounded-sm"
              style={{ backgroundColor: tempColor }}
              onClick={() => setIsOpen(!isOpen)}
            />
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

        <input
          type="text"
          value={tempColor}
          onChange={handleInputChange}
          className="h-full w-full bg-transparent text-sm text-white focus:outline-none"
        />
      </div>
      <div className="bg-background-tertiary/50 flex h-full max-w-[60px] min-w-[60px] items-center justify-start rounded-md px-2.5 py-1.5">
        <input
          type="text"
          value={opacity}
          onChange={handleOpacityChange}
          className="h-full w-full bg-transparent text-left text-sm text-white focus:outline-none"
        />
        <span className="text-muted-foreground ml-[2px] text-sm">%</span>
      </div>
    </div>
  );
};
