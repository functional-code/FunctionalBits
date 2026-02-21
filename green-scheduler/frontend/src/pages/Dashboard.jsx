import React, { useState, useEffect } from 'react';
import { Activity, Zap, Server, Globe, Loader2, CheckCircle, Clock, ArrowRightLeft } from 'lucide-react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

function Card({ className, ...props }) {
    return (
        <div
            className={cn("rounded-xl border border-slate-800 bg-slate-900/50 text-slate-100 shadow-sm backdrop-blur-xl transition-all hover:bg-slate-900/60 hover:shadow-md", className)}
            {...props}
        />
    )
}

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

function Dashboard() {
    const [jobs, setJobs] = useState([]);
    const [stats, setStats] = useState({ total_carbon_saved: 0, current_intensity: 0, total_jobs_processed: 0, history: [] });
    const [loading, setLoading] = useState(true);

    // Form State
    const [submitting, setSubmitting] = useState(false);
    const [jobName, setJobName] = useState(`Job-${Math.floor(Math.random() * 1000)}`);
    const [region, setRegion] = useState('CAISO_NORTH');
    const [energyUsage, setEnergyUsage] = useState(1.5);
    const [priority, setPriority] = useState('Low');

    const fetchData = async () => {
        try {
            const [statsRes, jobsRes] = await Promise.all([
                fetch(`${API_URL}/stats`),
                fetch(`${API_URL}/jobs`)
            ]);

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats({
                    total_carbon_saved: statsData.total_carbon_saved || 0,
                    current_intensity: statsData.current_intensity || 0,
                    total_jobs_processed: statsData.total_jobs_processed || 0,
                    history: statsData.history || []
                });
            }
            if (jobsRes.ok) {
                const jobsData = await jobsRes.json();
                setJobs(jobsData.slice(0, 5));
            }
        } catch (e) {
            console.error("Failed to fetch data", e);
        }
    };

    useEffect(() => {
        const initFetch = async () => {
            setLoading(true);
            await fetchData();
            setLoading(false);
        };
        initFetch();

        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const submitJob = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/jobs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: jobName,
                    region: region,
                    energy_usage: parseFloat(energyUsage),
                    priority: priority
                }),
            });
            if (res.ok) {
                setJobName(`Job-${Math.floor(Math.random() * 1000)}`);
                await fetchData();
            }
        } catch (e) {
            console.error("Failed to submit job", e);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            case 'Pending': return "bg-slate-500/10 text-slate-400 border-slate-500/20";
            case 'Running': return "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse";
            default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 col-span-1 md:col-span-2 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent group-hover:from-emerald-500/20 transition-colors duration-500 rounded-xl" />
                    <div className="flex flex-col gap-1 relative z-10 w-full h-full justify-between">
                        <h2 className="text-slate-400 font-medium">Total Carbon Saved</h2>
                        <div className="flex items-end justify-between mt-2">
                            <div className="flex items-end gap-3">
                                <span className="text-6xl font-black tracking-tight bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">
                                    {stats.total_carbon_saved.toFixed(1)}
                                </span>
                                <span className="text-2xl font-bold text-emerald-400 mb-1">gCO₂</span>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-slate-400 mb-1">Jobs Processed</div>
                                <div className="text-2xl font-bold text-slate-200">{stats.total_jobs_processed}</div>
                            </div>
                        </div>
                        {/* Simple Intensity Graph */}
                        <div className="h-16 mt-4 w-full flex items-end gap-1">
                            {stats.history.slice(-24).map((point, idx) => {
                                const height = Math.min(100, Math.max(10, (point.intensity / 500) * 100));
                                const isHigh = point.intensity > 250;
                                return (
                                    <div key={idx} className="flex-1 rounded-t-sm group/bar relative" style={{ height: `${height}%`, backgroundColor: isHigh ? '#fb7185' : '#34d399', opacity: 0.8 }}>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 pointer-events-none whitespace-nowrap z-20">
                                            {point.intensity} g at {point.timestamp}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </Card>

                <Card className="p-6 relative group border-t-4 border-t-emerald-500/50 text-center flex flex-col justify-center items-center">
                    <div className="flex flex-col gap-2 w-full">
                        <div className="flex items-center justify-between w-full">
                            <h2 className="text-slate-400 font-medium tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">Grid Intensity</h2>
                            <Activity className={cn("w-5 h-5 ml-1 shrink-0", stats.current_intensity >= 250 ? "text-rose-400" : "text-emerald-400")} />
                        </div>
                        <div className="flex flex-col items-center justify-center gap-1 mt-4">
                            <span className={cn("text-5xl font-bold transition-colors group-hover:text-white", stats.current_intensity >= 250 ? "text-rose-400" : "text-emerald-400")}>
                                {stats.current_intensity}
                            </span>
                            <span className="text-sm font-medium text-slate-500 mb-1 whitespace-nowrap">gCO₂/kWh</span>
                        </div>
                        <p className={cn("text-xs mt-2 font-medium mx-auto px-2 py-1 rounded-md flex items-center gap-1 w-max transition-all",
                            stats.current_intensity >= 250 ? "bg-rose-500/10 text-rose-400/80" : "bg-emerald-500/10 text-emerald-400/80"
                        )}>
                            <Zap className="w-3 h-3" /> {stats.current_intensity >= 250 ? "High Carbon" : "Low Carbon"}
                        </p>
                    </div>
                </Card>

                <Card className="p-6 bg-slate-800/40 border-slate-700/50 flex flex-col justify-center">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-400" /> Decision Rules
                    </h4>
                    <ul className="space-y-3 text-xs text-slate-400">
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold shrink-0">Case A:</span>
                            <span>Low carbon (&lt;150). Runs immediately.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold shrink-0">Case B:</span>
                            <span>Med carbon (150-250), Low Priority. Delays 2m.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-rose-400 font-bold shrink-0">Case C:</span>
                            <span>High Carbon (&gt;250) or High Prio. Hops region.</span>
                        </li>
                    </ul>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Action Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Server className="w-24 h-24 text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 relative z-10">
                            <Server className="w-5 h-5 text-indigo-400" />
                            Submit Workload
                        </h3>
                        <p className="text-sm text-slate-400 mb-6 leading-relaxed relative z-10">
                            Dispatch a heavy compute job. The scheduler checks real-time grid intensity to decide the optimal region.
                        </p>
                        <form onSubmit={submitJob} className="space-y-4 relative z-10">
                            <div>
                                <label className="text-xs text-slate-400 font-medium mb-1 block">Job Name</label>
                                <input required type="text" value={jobName} onChange={e => setJobName(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500" />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 font-medium mb-1 block">Requested Region</label>
                                <select value={region} onChange={e => setRegion(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500">
                                    <option value="CAISO_NORTH">CAISO NORTH (California)</option>
                                    <option value="PJM_NJ">PJM NJ (US East)</option>
                                    <option value="ERCOT_ALL">ERCOT (Texas)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 font-medium mb-1 block">Energy (kWh)</label>
                                    <input required type="number" step="0.1" value={energyUsage} onChange={e => setEnergyUsage(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 font-medium mb-1 block">Priority</label>
                                    <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500">
                                        <option value="Low">Low (Wait up to 2m)</option>
                                        <option value="High">High (Immediate)</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full mt-2 py-3 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 text-white font-medium transition-all shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98] flex justify-center items-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Run Batch Job"}
                            </button>
                        </form>
                    </Card>

                    <Card className="p-6 bg-slate-800/40 border-slate-700/50">
                        <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-400" /> Rules
                        </h4>
                        <ul className="space-y-3 text-sm text-slate-400">
                            <li className="flex items-start gap-2">
                                <div className="w-5 text-center mt-0.5"><span className="text-emerald-400">✓</span></div>
                                <span>If local grid is &lt; 150 gCO₂/kWh, executes immediately.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="w-5 text-center mt-0.5"><span className="text-indigo-400">↗</span></div>
                                <span>If high (≥ 150 gCO₂), hops to Norway (20 gCO₂/kWh).</span>
                            </li>
                        </ul>
                    </Card>
                </div>

                {/* Job History Snippet */}
                <div className="lg:col-span-2">
                    <Card className="overflow-hidden flex flex-col h-full">
                        <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Globe className="w-5 h-5 text-blue-400" />
                                Recent Workloads
                            </h3>
                            <a href="/jobs" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                                View All &rarr;
                            </a>
                        </div>
                        <div className="p-0 overflow-x-auto flex-1">
                            <table className="w-full text-left text-sm whitespace-nowrap min-w-full">
                                <thead className="bg-slate-900/60 uppercase text-xs font-semibold text-slate-400">
                                    <tr>
                                        <th className="px-5 py-4 border-b border-slate-800">Job name</th>
                                        <th className="px-5 py-4 border-b border-slate-800">Status</th>
                                        <th className="px-5 py-4 border-b border-slate-800">Region</th>
                                        <th className="px-5 py-4 border-b border-slate-800 text-right">Saved</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {loading && jobs.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-5 py-12 text-center text-slate-500">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-indigo-500/50" />
                                                Loading jobs insight...
                                            </td>
                                        </tr>
                                    ) : jobs.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-5 py-12 text-center text-slate-500">
                                                No jobs recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        jobs.map((job) => {
                                            const getIcon = (status) => {
                                                switch (status) {
                                                    case 'Completed': return CheckCircle;
                                                    case 'Delayed': return Clock;
                                                    case 'Running': return Loader2;
                                                    default: return Activity;
                                                }
                                            }
                                            const StatusIcon = getIcon(job.status);
                                            return (
                                                <tr key={job.id} className="hover:bg-slate-800/20 transition-colors group">
                                                    <td className="px-5 py-4">
                                                        <div className="font-medium text-slate-200 group-hover:text-emerald-300 transition-colors">{job.name}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="text-xs text-slate-500">{formatTime(job.created_at)}</div>
                                                            <span className="text-slate-600 text-[10px]">•</span>
                                                            <span className={cn("text-[10px] font-medium uppercase tracking-wide", job.priority === 'High' ? 'text-rose-400' : 'text-slate-500')}>{job.priority} Prio</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
                                                            getStatusColor(job.status)
                                                        )}>
                                                            <StatusIcon className={cn("w-3.5 h-3.5", job.status === 'Running' && 'animate-spin')} />
                                                            {job.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-1.5 text-slate-300">
                                                                {job.execution_region !== job.requested_region && job.execution_region !== 'Pending...' ? (
                                                                    <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500" />
                                                                ) : null}
                                                                {job.execution_region}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Req: {job.requested_region}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        {job.carbon_saved > 0 ? (
                                                            <div className="flex flex-col items-end gap-0.5">
                                                                <span className="text-emerald-400 font-semibold flex items-center justify-end gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md text-xs">
                                                                    +{job.carbon_saved.toFixed(1)}g
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-500 text-xs">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
