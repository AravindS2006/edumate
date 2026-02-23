import Image from 'next/image';

/* Next.js shows this component while the dashboard page chunk is loading.
   This provides instant visual feedback (good LCP) before client JS hydrates. */
export default function DashboardLoading() {
    return (
        <div className="min-h-[100dvh] bg-slate-50 text-slate-800 overflow-x-hidden pb-24 md:pb-28">
            <header className="sticky top-0 z-40 border-b border-slate-200/60 backdrop-blur-2xl bg-white/90">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white flex items-center justify-center shadow-md shadow-indigo-100 ring-1 ring-slate-100 overflow-hidden">
                            <Image src="/assets/SAIRAM-ROUND-LOGO.png" alt="Sairam" width={28} height={28} className="object-contain" />
                        </div>
                        <p className="text-sm font-extrabold tracking-tight text-slate-800">EduMate</p>
                    </div>
                    <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
                </div>
            </header>
            <div className="max-w-[1400px] mx-auto px-3 sm:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse" />
                    <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="rounded-2xl p-4 sm:p-5 border border-slate-200/60 bg-white">
                            <div className="h-4 w-16 bg-slate-100 rounded animate-pulse mb-3" />
                            <div className="h-8 w-20 bg-slate-200 rounded-lg animate-pulse mb-2" />
                            <div className="h-3 w-12 bg-slate-100 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
