import { Button } from "@onlook/ui/button";

export function Hero() {
    return (
        <div className="w-full h-full grid grid-cols-2 items-center justify-center">
            <div className="w-full h-full bg-red-500"></div>
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-lg text-center">
                <h1 className="text-4xl font-bold">Code makes your designs real</h1>
                <p className="">
                    Onlook is an AI-powered visual editor for code that helps you prototype, design, and ideate
                </p>
                <Button>
                    Get Started
                </Button>
            </div>
        </div>
    );
}