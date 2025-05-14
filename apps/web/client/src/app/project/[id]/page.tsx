import { Main } from './_components/main';

export default async function Page({ params, searchParams }: { 
    params: Promise<{ id: string }>, 
    searchParams: { [key: string]: string | string[] | undefined } 
}) {
    const projectId = (await params).id;
    if (!projectId) {
        return <div>Invalid project ID</div>;
    }
    
    const extraDataParam = searchParams.extraData as string;
    let extraData = null;
    
    if (extraDataParam) {
        try {
            extraData = JSON.parse(extraDataParam);
            console.log('Project creation extra data:', extraData);
        } catch (error) {
            console.error('Failed to parse extra data:', error);
        }
    }
    
    return <Main projectId={projectId} extraData={extraData} />;
}
