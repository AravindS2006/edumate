import React from 'react';

export const StatCardSkeleton = () => {
    return (
        <div className="relative overflow-hidden rounded-2xl p-4 bg-white border border-slate-200/60 shadow-sm h-[110px]">
            <div className="flex items-start justify-between mb-2">
                <div className="flex flex-col gap-2">
                    <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                    <div className="h-6 w-16 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="h-8 w-8 bg-slate-100 rounded-lg animate-pulse" />
            </div>
            <div className="mt-2 h-4 w-24 bg-slate-100 rounded animate-pulse" />
        </div>
    );
};

export const ProfileSkeleton = () => {
    return (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200/60 bg-white shadow-sm h-full flex flex-col">
            <div className="h-20 sm:h-28 bg-slate-100 animate-pulse" />
            <div className="relative -mt-10 sm:-mt-12 flex justify-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1">
                    <div className="w-full h-full bg-slate-200 rounded-xl animate-pulse" />
                </div>
            </div>
            <div className="px-5 pb-5 pt-3 space-y-3 flex-1">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="space-y-2 mt-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex justify-between">
                            <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
                            <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const AttendanceRingSkeleton = () => {
    return (
        <div className="rounded-2xl p-5 border border-slate-200/60 bg-white flex flex-col sm:flex-row items-center gap-5">
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-full bg-slate-100 animate-pulse border-8 border-slate-50" />
            <div className="flex-1 w-full space-y-3">
                <div className="h-4 w-40 bg-slate-200 rounded animate-pulse mb-4" />
                {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-1">
                        <div className="flex justify-between">
                            <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
                            <div className="h-3 w-8 bg-slate-100 rounded animate-pulse" />
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    )
}
