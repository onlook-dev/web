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
        return (
            <div
                className='absolute rounded bg-foreground-primary/10 hover:shadow h-6 m-auto flex flex-row items-center backdrop-blur-sm overflow-hidden relative shadow-sm border-input text-foreground'
                style={{
                    transform: `scale(${1 / editorEngine.canvas.scale})`,
                    width: `${frame.dimension.width * editorEngine.canvas.scale}px`,
                    marginBottom: `${20 / editorEngine.canvas.scale}px`,
                    cursor: 'grab',
                }}
                data-drag-handle
                onMouseEnter={() => console.log(`Mouse entered top bar for frame ${frame.id}`)}
            >
                {children}
            </div>
        );
    },
);
