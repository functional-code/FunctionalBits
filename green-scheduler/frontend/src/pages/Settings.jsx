import React from 'react';
import { Settings as SettingsIcon, Shield, Bell, CloudRain } from 'lucide-react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

function Settings() {
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
                    <SettingsIcon className="w-6 h-6 text-slate-400" />
                    Scheduler Settings
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                    Manage your environmental preferences and scheduler thresholds here.
                </p>
            </div>

            <div className="space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 shadow-sm backdrop-blur-xl p-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-200 mb-6">
                        <CloudRain className="w-5 h-5 text-emerald-400" />
                        Carbon Intensity Thresholds
                    </h2>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Local Grid Maximum Threshold (gCO₂/kWh)</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="50"
                                    max="300"
                                    defaultValue="150"
                                    className="flex-1 accent-emerald-500"
                                />
                                <span className="w-12 text-right text-sm font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">150</span>
                            </div>
                            <p className="text-xs text-slate-500">If the local grid exceeds this value, workloads will be region-hopped.</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/50 shadow-sm backdrop-blur-xl p-6 opacity-60 pointer-events-none">
                    <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-200 mb-4">
                        <Shield className="w-5 h-5 text-indigo-400" />
                        API Keys & Security (Coming Soon)
                    </h2>
                    <p className="text-sm text-slate-400 mb-4">Configure your Electricity Maps API key to get real-time data instead of simulation.</p>
                    <input type="password" placeholder="••••••••••••••••" disabled className="w-full pl-4 pr-4 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-sm text-slate-500 mb-2 cursor-not-allowed" />
                </div>

            </div>
        </div>
    );
}

export default Settings;
