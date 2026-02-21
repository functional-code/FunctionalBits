import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Leaf, LayoutDashboard, List, Settings } from 'lucide-react';
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

function Layout() {
    const navItems = [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
        { label: 'Workloads', path: '/jobs', icon: List },
        { label: 'Settings', path: '/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] font-sans relative overflow-hidden flex flex-col md:flex-row">

            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800/60 bg-slate-900/40 backdrop-blur-md flex-shrink-0 z-50 sticky top-0 md:h-screen transition-all">
                <div className="p-4 flex items-center gap-3 border-b border-slate-800/60 h-16">
                    <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
                        <Leaf className="w-6 h-6" />
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
                        Green Scheduler
                    </span>
                </div>

                <nav className="p-4 space-y-1 overflow-x-auto md:overflow-x-visible flex md:block gap-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group flex-shrink-0 md:flex-shrink",
                                    isActive
                                        ? "bg-slate-800/80 text-emerald-400 shadow-sm border border-slate-700/50"
                                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                                )
                            }
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative z-10">
                <div className="h-full">
                    <Outlet />
                </div>
            </main>

        </div>
    );
}

export default Layout;
