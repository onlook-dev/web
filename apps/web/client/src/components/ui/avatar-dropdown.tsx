'use client'

import { useUserContext } from '@/components/hooks/use-user'
import { Avatar, AvatarFallback, AvatarImage } from '@onlook/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu'
import { Icons } from '@onlook/ui/icons/index'
import { usePathname } from 'next/navigation'

export const CurrentUserAvatar = ({ className }: { className?: string }) => {
    const currentPath = usePathname()
    const { image, name, handleSignOut } = useUserContext()
    const initials = name
        ?.split(' ')
        ?.map((word) => word[0])
        ?.join('')
        ?.toUpperCase()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Avatar className={className}>
                    {image && <AvatarImage src={image} alt={initials} />}
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleSignOut(currentPath)}>
                    <Icons.Exit className="w-4 h-4 mr-2" /> Sign Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}