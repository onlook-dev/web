import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@onlook/web-server/src/router/context';
import { redirect } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';

type UserContextType = {
    user: User | null;
    name: string | null;
    image: string | null;
    handleSignOut: (redirectRoute?: string) => Promise<void>;
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const [user, setUser] = useState<User | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [name, setName] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user: supabaseUser } } = await supabase.auth.getUser();
            if (supabaseUser) {
                // Map Supabase user to our app's User type
                setUser({
                    name: supabaseUser.user_metadata?.full_name ||
                        supabaseUser.user_metadata?.name ||
                        supabaseUser.email ||
                        'Anonymous',
                });
                setName(supabaseUser.user_metadata?.full_name ||
                    supabaseUser.user_metadata?.name ||
                    supabaseUser.email ||
                    'Anonymous');
                setImage(supabaseUser.user_metadata?.avatar_url || null);
            } else {
                setUser(null);
            }
        };
        fetchUser();
    }, []);

    const handleSignOut = async (redirectRoute?: string) => {
        await supabase.auth.signOut();
        clearUser();
        redirect(redirectRoute || Routes.LOGIN);
    }

    const clearUser = () => {
        setUser(null);
        setName(null);
        setImage(null);
    }

    return <UserContext.Provider value={{ user, name, image, handleSignOut }}>{children}</UserContext.Provider>;
}

export function useUserContext() {
    const context = useContext(UserContext);
    if (!context) throw new Error('useUserContext must be used within a UserProvider');
    return context;
}
