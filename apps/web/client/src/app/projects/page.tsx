import { createClient } from "@/utils/supabase/server";
import { SelectProject } from './_components/select';
import { TopBar } from './_components/top-bar';
import { redirect } from "next/navigation";
import { Routes } from "@/utils/constants";

export default async function Projects() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        redirect(Routes.LOGIN);
    }
    
    return (
        <div className="w-screen h-screen flex flex-col">
            <TopBar />
            <div className="flex justify-center overflow-hidden w-full h-full">
                <SelectProject />
            </div>
        </div>
    );
};
