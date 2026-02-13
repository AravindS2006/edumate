"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface LogEntry {
    timestamp: string;
    username: string;
    name: string;
    status: string;
    ip: string;
    institution: string;
}

export default function SecretDashboard() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [secretKey, setSecretKey] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Function to fetch logs
    const fetchLogs = async (key: string) => {
        setLoading(true);
        setError("");
        try {
            // In production, use the actual domain. For dev, localhost is fine.
            // We'll use relative path which works for both if served correctly, 
            // but for Vercel/Next.js dev proxy, /api/ should route to backend.
            // However, if backend is on 8000 and frontend on 3000 (local), we need full URL or proxy.
            // Assuming Next.js rewrites in next.config.ts or vercel.json handle it.
            // The user has 'rewrites' or 'routes' configured.

            const res = await fetch(`/api/admin/logs?secret=${key}&limit=100`);
            if (!res.ok) {
                if (res.status === 403) throw new Error("Invalid Secret Key");
                throw new Error("Failed to fetch logs");
            }
            const data = await res.json();
            // data might be an array of dicts or list of lists depending on sheets_logger
            // sheets_logger.get_all_records() returns list of dicts.
            setLogs(data);
            setIsAuthenticated(true);
        } catch (err: any) {
            setError(err.message || "An error occurred");
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchLogs(secretKey);
    };

    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                    Admin Dashboard
                </h1>

                {!isAuthenticated ? (
                    <div className="max-w-md mx-auto mt-20 p-6 border border-gray-800 rounded-xl bg-gray-900/50 backdrop-blur-sm">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Enter Admin Secret</label>
                                <input
                                    type="password"
                                    value={secretKey}
                                    onChange={(e) => setSecretKey(e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Secret Key"
                                />
                            </div>
                            {error && <p className="text-red-400 text-sm">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50"
                            >
                                {loading ? "Accessing..." : "Access Logs"}
                            </button>
                        </form>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl text-gray-300">Login Activity</h2>
                            <button
                                onClick={() => fetchLogs(secretKey)}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                            >
                                Refresh
                            </button>
                        </div>

                        <div className="overflow-x-auto border border-gray-800 rounded-xl bg-gray-900/30">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-900/80 text-gray-400 border-b border-gray-800">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Timestamp</th>
                                        <th className="px-6 py-4 font-medium">Username</th>
                                        <th className="px-6 py-4 font-medium">Name</th>
                                        <th className="px-6 py-4 font-medium">Status</th>
                                        <th className="px-6 py-4 font-medium">IP</th>
                                        <th className="px-6 py-4 font-medium">Institution</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                No logs found or empty sheet.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.slice().reverse().map((log, index) => (
                                            <tr key={index} className="hover:bg-gray-800/30 transition-colors">
                                                <td className="px-6 py-3 text-gray-300">{log.timestamp || "-"}</td>
                                                <td className="px-6 py-3 font-mono text-blue-400">{log.username}</td>
                                                <td className="px-6 py-3 text-gray-300">{log.name}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs ${log.status === "Success"
                                                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                                                        }`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-gray-500 font-mono text-xs">{log.ip}</td>
                                                <td className="px-6 py-3 text-gray-500 text-xs">{log.institution}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
