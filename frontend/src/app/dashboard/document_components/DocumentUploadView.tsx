'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, X, AlertCircle, CheckCircle2, Loader2, FileUp, Filter, Menu } from 'lucide-react';
import Image from 'next/image';

interface DocumentStatus {
    id: string | null;
    uploadedGuidId: string;
    documentCode: string;
    documentName: string;
    description: string;
    ocrStatus: string;
    uploadedDate: string;
    documentNumber: string | null;
    remarks: string;
}

interface DocumentUploadProps {
    studtblId: string;
    API: string;
    token: string;
    institutionId: string;
}

export default function DocumentUploadView({ studtblId, API, token, institutionId }: DocumentUploadProps) {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'uploaded' | 'others'>('uploaded');

    // Data State
    const [uploadedDocs, setUploadedDocs] = useState<DocumentStatus[]>([]);
    const [otherDocs, setOtherDocs] = useState<DocumentStatus[]>([]);

    // Viewer State
    const [viewingDoc, setViewingDoc] = useState<DocumentStatus | null>(null);
    const [docBlobUrl, setDocBlobUrl] = useState<string | null>(null);
    const [blobLoading, setBlobLoading] = useState(false);

    // Upload Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    useEffect(() => {
        if (!studtblId) return;

        const fetchDocuments = async () => {
            setLoading(true);
            const headers = { Authorization: `Bearer ${token}`, 'X-Institution-Id': institutionId };

            try {
                const [uploadedRes, othersRes] = await Promise.all([
                    fetch(`${API}/api/document/status?studtblId=${encodeURIComponent(studtblId)}`, { headers }),
                    fetch(`${API}/api/document/others?studtblId=${encodeURIComponent(studtblId)}`, { headers })
                ]);

                const uploadedJson = await uploadedRes.json().catch(() => null);
                const othersJson = await othersRes.json().catch(() => null);

                if (uploadedJson?.success && uploadedJson?.data) {
                    setUploadedDocs(uploadedJson.data);
                }
                if (othersJson?.success && othersJson?.data) {
                    setOtherDocs(othersJson.data);
                }
            } catch (error) {
                console.error("Failed to fetch documents", error);
            }

            setLoading(false);
        };

        fetchDocuments();
    }, [studtblId, API, token, institutionId]);

    const handleViewDocument = async (doc: DocumentStatus) => {
        if (!doc.id) return; // Cannot view docs without an ID

        setViewingDoc(doc);
        setBlobLoading(true);
        setDocBlobUrl(null);

        try {
            const headers = { Authorization: `Bearer ${token}`, 'X-Institution-Id': institutionId };
            // Note: Since this endpoint returns a binary stream (StreamingResponse), we must parse it as a blob
            const res = await fetch(`${API}/api/document/download-blob?studtblId=${encodeURIComponent(studtblId)}&documentId=${encodeURIComponent(doc.id)}`, { headers });

            if (res.ok) {
                const blob = await res.blob();
                const objUrl = URL.createObjectURL(blob);
                setDocBlobUrl(objUrl);
            } else {
                console.error("Failed to fetch document blob");
            }
        } catch (error) {
            console.error("Error downloading blob:", error);
        }

        setBlobLoading(false);
    }

    const closeViewer = () => {
        if (docBlobUrl) URL.revokeObjectURL(docBlobUrl);
        setDocBlobUrl(null);
        setViewingDoc(null);
    }

    const renderStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return (
                    <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-200">
                        <AlertCircle size={14} /> Pending
                    </div>
                );
            case 'classified':
                return (
                    <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200">
                        <CheckCircle2 size={14} /> Classified
                    </div>
                );
            case 'updated':
                return (
                    <div className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full text-xs font-bold border border-indigo-200">
                        <CheckCircle2 size={14} /> Updated
                    </div>
                );
            default:
                return (
                    <div className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full text-xs font-bold border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> {status}
                    </div>
                );
        }
    }

    return (
        <div className="max-w-6xl mx-auto pb-20 space-y-4 sm:space-y-6">

            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
                <div>
                    <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                        Documents upload
                    </h1>
                    <p className="text-sm font-semibold text-slate-500 mt-1">Manage and upload your mandatory academic and identity documents.</p>
                </div>

                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
                >
                    <FileUp size={18} strokeWidth={2.5} /> Upload
                </button>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

                {/* Tabs & Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 bg-slate-50/50 p-4 gap-4">
                    <div className="flex gap-6 px-2">
                        <button
                            onClick={() => setActiveTab('uploaded')}
                            className={`relative pb-2 text-sm font-bold transition-colors ${activeTab === 'uploaded' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Documents Uploaded
                            {activeTab === 'uploaded' && (
                                <motion.div layoutId="doc-tab-indicator" className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-indigo-600" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('others')}
                            className={`relative pb-2 text-sm font-bold transition-colors ${activeTab === 'others' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Others
                            {activeTab === 'others' && (
                                <motion.div layoutId="doc-tab-indicator" className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-indigo-600" />
                            )}
                        </button>
                    </div>

                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-colors border border-indigo-200/50 mr-2">
                        <Filter size={14} /> Reload
                    </button>
                </div>

                {/* Table Data */}
                <div className="overflow-x-auto flex-1 p-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                            <p className="font-semibold">Loading documents...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left min-w-[700px] border-separate border-spacing-y-1">
                            <thead>
                                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                                    <th className="p-3 pl-4 rounded-l-xl">Document Name</th>
                                    <th className="p-3">Document Number</th>
                                    <th className="p-3">Uploaded on</th>
                                    <th className="p-3 rounded-r-xl">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(activeTab === 'uploaded' ? uploadedDocs : otherDocs).map((doc, idx) => (
                                    <motion.tr
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.02 }}
                                        key={doc.documentCode + idx}
                                        className={`group transition-colors ${doc.id ? 'hover:bg-indigo-50/50 cursor-pointer' : 'hover:bg-slate-50'}`}
                                        onClick={() => handleViewDocument(doc)}
                                    >
                                        <td className="p-3 pl-4 font-bold text-sm text-slate-700 border-b border-slate-100 group-hover:border-transparent">
                                            {doc.documentName}
                                            {doc.id && <span className="ml-2 text-[10px] text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">View</span>}
                                        </td>
                                        <td className="p-3 text-sm text-slate-500 border-b border-slate-100 group-hover:border-transparent font-medium">
                                            {doc.documentNumber || '-'}
                                        </td>
                                        <td className="p-3 text-sm text-slate-500 border-b border-slate-100 group-hover:border-transparent font-medium">
                                            {doc.uploadedDate || '-'}
                                        </td>
                                        <td className="p-3 border-b border-slate-100 group-hover:border-transparent">
                                            {renderStatusBadge(doc.ocrStatus)}
                                        </td>
                                    </motion.tr>
                                ))}
                                {(activeTab === 'uploaded' ? uploadedDocs : otherDocs).length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-400 font-medium pb-20">
                                            No documents found in this category.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Document Viewer Modal */}
            <AnimatePresence>
                {viewingDoc && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 md:p-12"
                            onClick={closeViewer}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white w-full max-w-4xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
                            >
                                {/* Viewer Header aligned with reference image */}
                                <div className="bg-indigo-600 text-white p-3 flex items-center justify-between shrink-0">
                                    <h3 className="font-bold ml-2">Document View - {viewingDoc.documentName}</h3>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => {
                                            if (!docBlobUrl) return;
                                            const a = document.createElement('a');
                                            a.href = docBlobUrl;
                                            a.download = viewingDoc.documentName + '.pdf';
                                            document.body.appendChild(a);
                                            a.click();
                                            a.remove();
                                        }} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Download Document">
                                            <Download size={18} />
                                        </button>
                                        <button onClick={closeViewer} className="p-1 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors border border-white/30 mr-1" title="Close Viewer">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Viewer Toolbar */}
                                <div className="bg-[#333333] text-white p-2 flex justify-between items-center shrink-0">
                                    <Menu size={20} className="text-gray-400 cursor-pointer ml-2 hover:text-white" />
                                    <div className="flex items-center gap-4 text-sm font-medium">
                                        <span>1 / 1</span>
                                        <div className="h-4 w-px bg-gray-600"></div>
                                        <span>73%</span>
                                    </div>
                                    <Download size={18} className="text-gray-400 cursor-pointer mr-2 hover:text-white" />
                                </div>

                                {/* Viewer Content */}
                                <div className="flex-1 overflow-auto bg-[#525659] p-4 flex justify-center pb-20">
                                    {blobLoading ? (
                                        <div className="flex flex-col items-center justify-center h-full text-white/70">
                                            <Loader2 className="w-10 h-10 animate-spin mb-4" />
                                            <p className="font-bold">Loading Document Blob...</p>
                                        </div>
                                    ) : docBlobUrl ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center">
                                            {/* Desktop Preview */}
                                            <iframe
                                                src={`${docBlobUrl}#toolbar=0`}
                                                className="hidden md:block w-full max-w-[800px] h-full min-h-[600px] bg-white shadow-xl"
                                                title={viewingDoc.documentName}
                                            />
                                            {/* Mobile View Options */}
                                            <div className="md:hidden flex flex-col items-center justify-center p-6 text-center w-full max-w-sm">
                                                <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 border border-indigo-400/30">
                                                    <FileText size={40} className="text-indigo-300" />
                                                </div>
                                                <p className="text-white font-bold text-xl mb-2">Document Ready</p>
                                                <p className="text-indigo-200 text-sm mb-8 px-4">Open this document in a new tab for the best viewing experience, or download it directly.</p>

                                                <div className="flex flex-col gap-3 w-full">
                                                    <button onClick={() => window.open(docBlobUrl, '_blank')} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 border border-indigo-500">
                                                        Open in New Tab
                                                    </button>
                                                    <button onClick={() => {
                                                        const a = document.createElement('a');
                                                        a.href = docBlobUrl;
                                                        a.download = viewingDoc.documentName + '.pdf';
                                                        document.body.appendChild(a);
                                                        a.click();
                                                        a.remove();
                                                    }} className="w-full py-3.5 bg-[#424242] hover:bg-[#4a4a4a] text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 border border-[#555]">
                                                        Download PDF
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-white/70">
                                            <AlertCircle className="w-10 h-10 mb-4 text-red-400" />
                                            <p className="font-bold text-red-100">Failed to render Document</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>


            {/* Upload Mock Modal */}
            <AnimatePresence>
                {isUploadModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setIsUploadModalOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
                        >
                            <div className="bg-indigo-500 text-white p-4 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-2 font-bold text-lg">
                                    <FileUp size={22} /> Upload
                                </div>
                                <button onClick={() => setIsUploadModalOpen(false)} className="p-1 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors border border-white/30">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8">
                                <div className="border-2 border-dashed border-indigo-200 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-indigo-50/50 transition-colors">
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center mb-4">
                                        <FileUp size={24} />
                                    </div>
                                    <p className="font-bold text-slate-700 text-lg">Click to Select Files</p>
                                    <p className="text-slate-500 text-sm mt-1 font-medium">Supported Formats: PDF (up to 20MB each)</p>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center gap-3">
                                <button onClick={() => setIsUploadModalOpen(false)} className="px-6 py-2.5 rounded-lg font-bold text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 transition-colors flex items-center gap-2">
                                    Back
                                </button>
                                <button className="px-8 py-2.5 rounded-lg font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 transition-colors shadow-sm flex items-center gap-2">
                                    <CheckCircle2 size={18} /> Submit
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
