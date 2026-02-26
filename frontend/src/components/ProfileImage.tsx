'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function ProfileImage({ studtblId, documentId, fallback }: { studtblId: string; documentId?: string; fallback: string }) {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        if (!studtblId || !documentId) return;
        let revoked = false;

        (async () => {
            try {
                const token = localStorage.getItem('token');
                const institutionId = localStorage.getItem('institutionId') || 'SEC';
                const res = await fetch(
                    `${API_URL}/api/profile/image?studtblId=${encodeURIComponent(studtblId)}&documentId=${encodeURIComponent(documentId)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'X-Institution-Id': institutionId
                        }
                    },
                );
                if (res.ok && !revoked) {
                    const ct = res.headers.get('content-type') || '';
                    if (ct.includes('image') || ct.includes('octet-stream') || ct.includes('jpeg')) {
                        const blob = await res.blob();
                        if (blob.size > 100) {
                            setSrc(URL.createObjectURL(blob));
                        }
                    }
                }
            } catch { /* fallback to initials */ }
        })();

        return () => { revoked = true; };
    }, [studtblId, documentId]);

    if (src) return <img src={src} alt="Profile" className="w-full h-full object-cover" />;

    return (
        <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center">
            <span className="text-2xl font-black text-white">{fallback}</span>
        </div>
    );
}
