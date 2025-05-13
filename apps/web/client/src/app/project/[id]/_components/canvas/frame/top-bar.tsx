import { useEditorEngine } from '@/components/store';
import type { Frame } from '@onlook/models';
import { observer } from 'mobx-react-lite';

export const TopBar = observer(
    ({
        frame,
        children
    }: {
        frame: Frame;
        children?: React.ReactNode;
    }) => {
        const editorEngine = useEditorEngine();

        const startMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault();
            e.stopPropagation();

            const startX = e.clientX;
            const startY = e.clientY;
            const startPositionX = frame.position.x;
            const startPositionY = frame.position.y;

            const handleMove = (e: MouseEvent) => {
                const scale = editorEngine.canvas.scale;
                const deltaX = (e.clientX - startX) / scale;
                const deltaY = (e.clientY - startY) / scale;

                frame.position = {
                    x: startPositionX + deltaX,
                    y: startPositionY + deltaY,
                };
            };

            const endMove = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();

                window.removeEventListener('mousemove', handleMove);
                window.removeEventListener('mouseup', endMove);
            };

            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', endMove);
        };

        return (
            <div
                className="bg-background-primary/10 hover:shadow h-6 flex flex-row items-center backdrop-blur-lg overflow-hidden relative shadow-sm border-input text-foreground/50 hover:text-foreground rounded-lg transition-colors duration-200 cursor-grab active:cursor-grabbing"
                style={{
                    height: `${28 / editorEngine.canvas.scale}px`,
                    width: `${frame.dimension.width}px`,
                    marginBottom: `${10 / editorEngine.canvas.scale}px`,
                }}
                onMouseDown={handleMouseDown}
            >
                <div
                    className="flex flex-row items-center justify-between gap-1 w-full"
                    style={{
                        transform: `scale(${1 / editorEngine.canvas.scale})`,
                        transformOrigin: 'left center',
                    }}
                >
                    <Button variant="ghost" size="icon" onClick={handleReload} className="transition-colors duration-200 hover:bg-background-primary cursor-default">
                        <Icons.Reload />
                    </Button>
                    <div className="text-small overflow-hidden text-ellipsis whitespace-nowrap">
                        {frame.url}
                    </div>
                    <Link className="ml-auto" href={frame.url} target="_blank">
                        <Button variant="ghost" size="icon" className="transition-colors duration-200">
                            <Icons.ExternalLink />
                        </Button>
                    </Link>
                </div>
            </div>
        );
    },
);