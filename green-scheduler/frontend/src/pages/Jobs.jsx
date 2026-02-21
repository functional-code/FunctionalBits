import React, { useState, useEffect } from 'react';
import { List, Search, Loader2, CheckCircle, Clock, Activity, ArrowRightLeft, Trash2 } from 'lucide-react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

function Jobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchJobs = async () => {
        try {
            const res = await fetch(`${API_URL}/jobs`);
            if (res.ok) {
                const data = await res.json();
                setJobs(data);
            }
        } catch (e) {
            console.error("Failed to fetch jobs", e);
        }
    };

    useEffect(() => {
        const initFetch = async () => {
            setLoading(true);
            await fetchJobs();
            setLoading(false);
        };
        initFetch();

        const interval = setInterval(() => {
            fetchJobs();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const deleteJob = async (jobId) => {
        // Optimistically remove from UI
        setJobs(prev => prev.filter(j => j.id !== jobId));
        try {
            const res = await fetch(`${API_URL}/jobs/${jobId}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                // If it fails, we should re-fetch to restore state, but this is a simple hackathon app
                console.error("Failed to delete job on backend");
            }
        } catch (e) {
            console.error("Failed to delete job", e);
        }
    };

    const stopJob = async (jobId) => {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'Stopped' } : j));
        try {
            const res = await fetch(`${API_URL}/jobs/${jobId}/stop`, {
                method: 'PUT',
            });
            if (!res.ok) {
                console.error("Failed to stop job on backend");
            }
        } catch (e) {
            console.error("Failed to stop job", e);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            case 'Delayed': return "bg-amber-500/10 text-amber-400 border-amber-500/20";
            case 'Running': return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse";
            case 'Stopped': return "bg-slate-700/50 text-slate-300 border-slate-600/50";
            default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
        }
    };

    const getIcon = (status) => {
        switch (status) {
            case 'Completed': return CheckCircle;
            case 'Delayed': return Clock;
            case 'Running': return Loader2;
            default: return Activity;
        }
    }

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleString();
    };

    const filteredJobs = jobs.filter(job =>
        job.name.toLowerCase().includes(search.toLowerCase()) ||
        job.execution_region?.toLowerCase().includes(search.toLowerCase()) ||
        job.requested_region?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
                        <List className="w-6 h-6 text-emerald-400" />
                        All Workloads
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Comprehensive history of all batch workloads executed.
                    </p>
                </div>

                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search jobs or region..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 w-full md:w-64 transition-all"
                    />
                </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 shadow-sm backdrop-blur-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-900/60 uppercase text-xs font-semibold text-slate-400">
                            <tr>
                                <th className="px-6 py-4 border-b border-slate-800">Job Details</th>
                                <th className="px-6 py-4 border-b border-slate-800">Status</th>
                                <th className="px-6 py-4 border-b border-slate-800">Action/Region</th>
                                <th className="px-6 py-4 border-b border-slate-800">Carbon Saved</th>
                                <th className="px-6 py-4 border-b border-slate-800 text-right">Time</th>
                                <th className="px-6 py-4 border-b border-slate-800 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {loading && jobs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-emerald-500/50" />
                                        Loading workloads...
                                    </td>
                                </tr>
                            ) : filteredJobs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        No workloads found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredJobs.map((job) => {
                                    const StatusIcon = getIcon(job.status);
                                    return (
                                        <tr key={job.id} className="hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-200 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                                                    {job.name}
                                                    <span className={cn("text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border", job.priority === 'High' ? 'text-rose-400 border-rose-500/20 bg-rose-500/10' : 'text-slate-500 border-slate-500/20 bg-slate-500/10')}>{job.priority} Prio</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1.5 font-mono">ID: {job.id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
                                                    getStatusColor(job.status)
                                                )}>
                                                    <StatusIcon className={cn("w-3.5 h-3.5", job.status === 'Running' && 'animate-spin')} />
                                                    {job.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2 text-slate-300 w-max">
                                                        {job.execution_region !== 'Pending...' ? (
                                                            <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
                                                        ) : null}
                                                        <span className="font-medium tracking-tight border border-slate-700/50 bg-slate-800/40 px-2.5 py-1 rounded">{job.execution_region}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {job.carbon_saved > 0 ? (
                                                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-md w-max border border-emerald-500/20 shadow-inner">
                                                        +{job.carbon_saved.toFixed(1)}g CO₂
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500 italic">None</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-400 text-xs">
                                                {formatTime(job.created_at)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {job.status === 'Running' && (
                                                        <button
                                                            onClick={() => stopJob(job.id)}
                                                            className="px-2 py-1 text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-md transition-colors"
                                                        >
                                                            Stop
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteJob(job.id)}
                                                        className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors inline-flex justify-center items-center"
                                                        title="Delete Workload"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Jobs;
