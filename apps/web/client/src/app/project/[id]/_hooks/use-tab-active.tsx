import { useCallback, useEffect, useState } from 'react';

export function useTabActive() {
    const [isTabActive, setIsTabActive] = useState(true);

    const handleVisibilityChange = useCallback(() => {
        setIsTabActive(document.visibilityState === 'visible');
    }, []);

    useEffect(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return isTabActive;
};
