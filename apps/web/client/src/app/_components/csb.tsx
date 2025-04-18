'use client';

import { api } from "@/trpc/react";
import { Button } from "@onlook/ui/button";

export function Csb() {
    const helloNoArgs = api.external.sandbox.start.useQuery({ projectId: '123' });
    console.log(helloNoArgs.data);

    return (
        <div>
            <Button
                onClick={() => helloNoArgs.refetch()}
                disabled={helloNoArgs.isPending}
            >
                Start Client
            </Button>

        </div>
    );
}