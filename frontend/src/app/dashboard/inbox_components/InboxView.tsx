'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Inbox, RefreshCw, Search, Archive, Mail, MailOpen,
    Download, ChevronRight, Loader2, AlertCircle, CheckCircle2,
    FileText, Clock, User, Plus, Send
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────── */

interface InboxCategory {
    id: number;
    inboxCategoryGuid: string;
    categoryName: string;
    description: string;
    messageCount: number;
    unreadMessageCount: number;
}

interface InboxMessage {
    id: number;
    messageId: number;
    messageGuid: string;
    categoryGuid: string;
    title: string;
    description: string;
    suggestion: string | null;
    sender: string;
    receiver: string;
    messageDate: string;
    isRead: boolean;
    link: string | null;          // format: "docId~filename" e.g. "701228~image.jpg"
    counselingId: number | null;  // the doc ID for DownloadBlob
    needStudentAction: boolean;
}

interface MessageDetail {
    id: number;
    messageGuid: string;
    title: string;
    description: string;
    sender: string;
    receiver: string;
    suggestion: string | null;
    messageDate: string;
    isRead: boolean;
    link: string | null;
    // Mentoring fields from HAR
    topicDiscussed?: string;
    action?: string;
    mentoringDocumentId?: number;
    mentoringDocumentName?: string;
    studentDocumentId?: number;
}

interface InboxViewProps {
    studtblId: string;
    regNo: string; // receiver identifier (e.g. "SEC23EC242")
    API: string;
    token: string;
    institutionId: string;
}

/* ─── Helpers ─────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

function formatFullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function initials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

/* ─── Component ─────────────────────────────────────────── */

export default function InboxView({ studtblId, regNo, API, token, institutionId }: InboxViewProps) {
    const [categories, setCategories] = useState<InboxCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<InboxCategory | null>(null);
    const [messages, setMessages] = useState<InboxMessage[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
    const [messageDetail, setMessageDetail] = useState<MessageDetail | null>(null);
    const [messageFilter, setMessageFilter] = useState<'all' | 'unread' | 'archive'>('all');
    const [searchText, setSearchText] = useState('');
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null);

    const headers = { Authorization: `Bearer ${token}`, 'X-Institution-Id': institutionId };

    // Fetch categories on mount
    useEffect(() => {
        const fetchCategories = async () => {
            setLoadingCategories(true);
            try {
                // Use regNo (e.g. "SEC23EC242") as StudtblId for GetInboxCategory
                const res = await fetch(`${API}/api/inbox/categories?studtblId=${encodeURIComponent(regNo)}`, { headers });
                const json = await res.json();
                if (json?.success && json.data) {
                    setCategories(json.data);
                    // Auto-select first category with messages, or just the first one
                    const first = json.data.find((c: InboxCategory) => c.messageCount > 0) || json.data[0];
                    if (first) setSelectedCategory(first);
                }
            } catch (e) { console.error(e); }
            setLoadingCategories(false);
        };
        fetchCategories();
    }, [studtblId]);

    // Fetch messages when category or filter changes
    const fetchMessages = useCallback(async () => {
        if (!selectedCategory) return;
        setLoadingMessages(true);
        setMessages([]);
        setSelectedMessage(null);
        setMessageDetail(null);
        try {
            const params = new URLSearchParams({
                categoryGuid: selectedCategory.inboxCategoryGuid,
                receiver: regNo,
                pageNumber: '1',
                pageSize: '20',
                searchText,
                isArchived: String(messageFilter === 'archive'),
            });
            if (messageFilter === 'unread') params.set('isRead', 'false');
            const res = await fetch(`${API}/api/inbox/messages?${params}`, { headers });
            const json = await res.json();
            if (json?.success && json.data?.data) {
                // API returns messageId but we need id too — map it
                setMessages(json.data.data.map((m: any) => ({ ...m, id: m.messageId ?? m.id })));
            }
        } catch (e) { console.error(e); }
        setLoadingMessages(false);
    }, [selectedCategory, regNo, messageFilter, searchText]);

    useEffect(() => { fetchMessages(); }, [fetchMessages]);

    // Fetch message detail
    const handleSelectMessage = async (msg: InboxMessage) => {
        if (!selectedCategory) return;
        setSelectedMessage(msg);
        setMessageDetail(null);
        setLoadingDetail(true);
        try {
            const params = new URLSearchParams({
                categoryGuid: selectedCategory.inboxCategoryGuid,
                messageGuid: msg.messageGuid,
                receiver: regNo
            });
            const res = await fetch(`${API}/api/inbox/message-details?${params}`, { headers });
            const json = await res.json();
            if (json?.success && json.data) {
                // Enrich detail with suggestion from the message list (not always in detail)
                setMessageDetail({ ...selectedMessage, ...json.data });
            }
        } catch (e) { console.error(e); }
        setLoadingDetail(false);
    };

    // Download mentoring document
    const handleDownloadDoc = async (documentId: number, fileName: string) => {
        setDownloadingDocId(documentId);
        try {
            const params = new URLSearchParams({
                studtblId: encodeURIComponent(studtblId),
                documentId: String(documentId),
                documentType: 'MENTORING_DOC'
            });
            const res = await fetch(`${API}/api/inbox/download-doc?${params}`, { headers });
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            }
        } catch (e) { console.error(e); }
        setDownloadingDocId(null);
    };

    /* ─── Render ─────────────────────────────────────────── */

    return (
        <div className="max-w-7xl mx-auto pb-24 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                        <Inbox size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-800">Inbox</h1>
                        <p className="text-xs text-slate-500 font-medium">Your messages and notifications</p>
                    </div>
                </div>
                <button onClick={fetchMessages} className="p-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl transition-colors border border-slate-200">
                    <RefreshCw size={18} />
                </button>
            </div>

            {/* 3-Panel Layout */}
            <div className="flex flex-col lg:flex-row gap-4 min-h-[70vh]">

                {/* ── Left: Categories ── */}
                <div className="w-full lg:w-56 flex-shrink-0 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Categories</h2>
                    </div>
                    {loadingCategories ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={24} className="animate-spin text-indigo-400" />
                        </div>
                    ) : (
                        <div className="p-2">
                            {categories.map(cat => {
                                const isActive = selectedCategory?.id === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mb-1 ${isActive
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                            : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <span>{cat.categoryName}</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive
                                            ? 'bg-white/20 text-white'
                                            : cat.messageCount > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {cat.messageCount}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Middle: Messages List ── */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                    {/* Search + Tabs */}
                    <div className="border-b border-slate-100 p-3 space-y-2.5">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && fetchMessages()}
                                type="text"
                                placeholder="Search messages..."
                                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 font-medium text-slate-700 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                            {(['all', 'unread', 'archive'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setMessageFilter(f)}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${messageFilter === f
                                        ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {f === 'unread' ? 'Unread' : f === 'archive' ? 'Archive' : 'All Message'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto">
                        {loadingMessages ? (
                            <div className="flex flex-col items-center justify-center h-full py-16 text-slate-400">
                                <Loader2 size={28} className="animate-spin mb-3 text-indigo-400" />
                                <p className="text-sm font-medium">Loading messages...</p>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-16 text-slate-400">
                                <div className="p-5 bg-slate-50 rounded-2xl mb-4">
                                    <Mail size={36} className="text-slate-300" />
                                </div>
                                <p className="font-bold text-slate-500 text-sm">"Oops! No messages found"</p>
                            </div>
                        ) : (
                            <div>
                                {messages.map(msg => {
                                    const isActive = selectedMessage?.id === msg.id;
                                    return (
                                        <button
                                            key={msg.messageGuid}
                                            onClick={() => handleSelectMessage(msg)}
                                            className={`w-full text-left px-4 py-3.5 border-b border-slate-100 last:border-b-0 transition-colors ${isActive
                                                ? 'bg-indigo-50 border-l-2 border-l-indigo-600'
                                                : 'hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <p className={`text-sm font-bold ${msg.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                                                    {msg.title}
                                                </p>
                                                <span className="text-[10px] whitespace-nowrap text-slate-400 font-medium flex-shrink-0 mt-0.5">
                                                    {timeAgo(msg.messageDate)}
                                                </span>
                                            </div>
                                            <p className={`text-xs line-clamp-2 leading-relaxed ${msg.isRead ? 'text-slate-400' : 'text-indigo-600 font-medium'}`}>
                                                {msg.description}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right: Detail Panel ── */}
                <div className="flex-1 lg:flex-[2] bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                    <AnimatePresence mode="wait">
                        {!selectedMessage ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center h-full py-24 text-slate-300"
                            >
                                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                                    <MailOpen size={36} />
                                </div>
                                <p className="text-sm font-semibold text-slate-400">Please click the message to preview</p>
                            </motion.div>
                        ) : loadingDetail ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex items-center justify-center h-full"
                            >
                                <Loader2 size={28} className="animate-spin text-indigo-400" />
                            </motion.div>
                        ) : messageDetail ? (
                            <motion.div
                                key={messageDetail.id}
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="flex flex-col h-full overflow-y-auto"
                            >
                                {/* Detail Header */}
                                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <h2 className="text-base font-bold text-slate-800">{messageDetail.title}</h2>
                                    <button className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                                        <Archive size={14} /> Archive
                                    </button>
                                </div>

                                {/* Sender Info */}
                                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                                        {initials(messageDetail.sender)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-800">{messageDetail.sender}</p>
                                        <p className="text-xs text-slate-500 font-medium">{messageDetail.receiver}</p>
                                    </div>
                                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                        <Clock size={12} />
                                        {formatFullDate(messageDetail.messageDate)}
                                    </span>
                                </div>

                                {/* Message Content */}
                                <div className="px-5 py-5 space-y-5 flex-1">
                                    {/* Topic Discussed (Mentoring) */}
                                    {messageDetail.suggestion && (
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Topic Discussed</p>
                                            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                                                {messageDetail.suggestion}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action / Description */}
                                    {messageDetail.description && (
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Action</p>
                                            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                                                {messageDetail.description}
                                            </div>
                                        </div>
                                    )}

                                    {/* Mentoring Document — parsed from selected message's link/counselingId */}
                                    {(() => {
                                        const docId = selectedMessage?.counselingId;
                                        const rawLink = selectedMessage?.link || '';
                                        const fileName = rawLink.includes('~') ? rawLink.split('~')[1] : '';
                                        if (!docId) return null;
                                        return (
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mentoring Document</p>
                                                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                                                        <FileText size={18} className="text-indigo-500" />
                                                    </div>
                                                    <p className="text-sm font-bold text-indigo-700 flex-1 truncate">
                                                        {fileName || `Document ${docId}`}
                                                    </p>
                                                    <button
                                                        onClick={() => handleDownloadDoc(docId, fileName || `document_${docId}`)}
                                                        disabled={downloadingDocId === docId}
                                                        className="p-2 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-lg transition-colors disabled:opacity-60"
                                                    >
                                                        {downloadingDocId === docId
                                                            ? <Loader2 size={16} className="animate-spin" />
                                                            : <Download size={16} />
                                                        }
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Student Document Upload */}
                                    {selectedCategory?.categoryName === 'Mentoring Action' && (
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student Document</p>
                                            <button className="w-full flex items-center justify-center gap-2 p-3.5 bg-slate-50 hover:bg-indigo-50 border border-dashed border-slate-300 hover:border-indigo-400 rounded-xl text-sm font-bold text-slate-500 hover:text-indigo-600 transition-all">
                                                <Plus size={16} /> Click here to Upload
                                            </button>
                                        </div>
                                    )}

                                    {/* Comments */}
                                    {selectedCategory?.categoryName === 'Mentoring Action' && (
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                                Comments <span className="text-rose-500">*</span>
                                            </p>
                                            <textarea
                                                className="w-full h-24 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 transition-colors font-medium text-slate-700 placeholder:text-slate-400 resize-none"
                                                placeholder="Your comments..."
                                            />
                                            <div className="flex justify-end mt-2">
                                                <button className="flex items-center gap-2 px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold rounded-xl text-sm transition-all shadow-sm active:scale-95">
                                                    <Send size={14} /> Submit
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
