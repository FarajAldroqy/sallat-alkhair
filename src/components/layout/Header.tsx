import { Sidebar as SidebarIcon, Search, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface HeaderProps {
  searchValue: string
  onSearchChange: (v: string) => void
  sectionTitle: string
}

export function Header({ searchValue, onSearchChange, sectionTitle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-6 h-13 border-b border-zinc-200/80 bg-white">
      {/* Left side: Panel icon + Title */}
      <div className="flex items-center gap-3">
        <button
          className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          title="Toggle Sidebar"
        >
          <SidebarIcon className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-zinc-900">
          {sectionTitle || 'Documents'}
        </span>
      </div>

      {/* Right side: GitHub link, search & user profile */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <Input
            id="header-search"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 bg-zinc-50 border-zinc-200 text-xs text-zinc-800 placeholder:text-zinc-400 rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-400"
          />
        </div>

        {/* GitHub link */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5 fill-current text-zinc-700" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span>GitHub</span>
        </a>

        {/* User avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 focus:outline-none">
              <Avatar className="w-6 h-6 border border-zinc-200">
                <AvatarFallback className="text-[10px] bg-zinc-100 text-zinc-800 font-semibold">
                  FA
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 bg-white border-zinc-200">
            <DropdownMenuLabel className="text-xs text-zinc-700">Faraj Ali</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-100" />
            <DropdownMenuItem className="text-xs text-zinc-700 gap-2 cursor-pointer">
              <User className="w-3.5 h-3.5" /> Profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
