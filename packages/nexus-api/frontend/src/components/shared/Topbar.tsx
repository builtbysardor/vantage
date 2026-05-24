'use client';
import { RefreshCw, Bell, Search, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LiveDot } from '@/components/shared/ui';
import { dispatchRefresh } from '@/lib/events';
import { clearToken } from '@/lib/auth';

export function Topbar({ title }: { title: string }) {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10 flex items-center px-6 gap-4">
      <h2 className="text-sm font-semibold text-slate-300 flex-1">{title}</h2>

      <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
        <Search className="w-3 h-3" />
        <span>Search... </span>
        <kbd className="text-slate-600 bg-slate-700 px-1 rounded">⌘K</kbd>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <LiveDot />
        <span className="font-mono">auto-refresh 10s</span>
      </div>

      <button
        onClick={dispatchRefresh}
        title="Refresh current view"
        className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      <button className="relative p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors">
        <Bell className="w-4 h-4" />
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-slate-950" />
      </button>

      <button
        onClick={handleLogout}
        title="Sign out"
        className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </header>
  );
}
