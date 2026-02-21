import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Leaf, LayoutDashboard, List, Settings, Info } from 'lucide-react';
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
            <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800/60 bg-slate-900/40 backdrop-blur-md flex-shrink-0 z-50 sticky top-0 md:h-screen transition-all flex flex-col">
                <div className="p-4 flex items-center gap-3 border-b border-slate-800/60 h-16">
                    <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
                        <Leaf className="w-6 h-6" />
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
                        CarbonEngine
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

                {/* Info Box (Desktop) */}
                <div className="hidden md:flex flex-col mt-auto p-4 border-t border-slate-800/60 flex-1">
                    <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-5 relative overflow-hidden flex-1 group flex flex-col justify-center">
                        <div className="absolute -top-4 -right-4 p-2 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12">
                            <Leaf className="w-32 h-32 text-emerald-400" />
                        </div>

                        <div className="relative z-10 flex flex-col h-full">
                            <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2 tracking-wide uppercase">
                                <Info className="w-4 h-4 text-emerald-400" />
                                How it works
                            </h4>

                            <div className="space-y-5 text-xs text-slate-400 leading-relaxed flex-1 flex flex-col justify-center">
                                <p className="text-sm text-slate-300 font-medium">
                                    CarbonEngine puts your batch workloads on the cleanest grid available.
                                </p>

                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/50">
                                        <div className="bg-blue-500/10 p-1.5 rounded-md shrink-0 mt-0.5">
                                            <LayoutDashboard className="w-3.5 h-3.5 text-blue-400" />
                                        </div>
                                        <p><strong>1. Live Telemetry:</strong> We query the WattTime API to trace real-time CO₂ intensity of datacenters across the globe.</p>
                                    </div>

                                    <div className="flex items-start gap-3 bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/50">
                                        <div className="bg-amber-500/10 p-1.5 rounded-md shrink-0 mt-0.5">
                                            <List className="w-3.5 h-3.5 text-amber-400" />
                                        </div>
                                        <p><strong>2. Smart Delay:</strong> If your local grid is moderately dirty, low-priority jobs pause until the wind blows or sun shines.</p>
                                    </div>

                                    <div className="flex items-start gap-3 bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                                        <div className="bg-emerald-500/20 p-1.5 rounded-md shrink-0 mt-0.5">
                                            <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                                        </div>
                                        <p><strong className="text-emerald-400">3. Region-Hop:</strong> If grid conditions remain poor, we auto-migrate your job to a datacenter running entirely on renewables.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
