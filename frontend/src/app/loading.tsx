/* Next.js shows this while the login page JS chunk loads.
   Matches the login page layout for instant LCP. */
export default function HomeLoading() {
    return (
        <main className="flex min-h-[100dvh] flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
            <div className="z-10 w-full max-w-md">
                <div className="bg-white border border-slate-200/60 shadow-xl rounded-2xl p-8 flex flex-col items-center">
                    {/* Logo placeholder */}
                    <div className="w-24 h-24 rounded-full bg-slate-100 animate-pulse mb-6 ring-4 ring-indigo-50" />
                    {/* Title */}
                    <h1 className="text-3xl font-extrabold mb-1 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-600">
                        EduMate
                    </h1>
                    <p className="text-slate-500 text-sm mt-3 mb-6">Sign in to your student portal</p>
                    {/* Form skeleton */}
                    <div className="w-full space-y-4">
                        <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                        <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                        <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                        <div className="h-12 bg-gradient-to-r from-indigo-200 to-cyan-200 rounded-xl animate-pulse mt-6" />
                    </div>
                </div>
            </div>
        </main>
    );
}
