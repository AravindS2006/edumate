'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Mail, MapPin, Calendar, BookOpen, GraduationCap, Award, FileText, Activity, Users } from 'lucide-react';
import { ProfileImage } from '@/components/ProfileImage';
import CampusConnectTab from '@/app/dashboard/profile_components/CampusConnectTab';
import AchievementsTab from '@/app/dashboard/profile_components/AchievementsTab';
import CourseDetailsTab from '@/app/dashboard/profile_components/CourseDetailsTab';
import AttendanceLogTab from '@/app/dashboard/profile_components/AttendanceLogTab';


const API = process.env.NEXT_PUBLIC_API_URL || '';

const fadeIn = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState<'profile' | 'connect' | 'achievements' | 'courses' | 'attendance'>('profile');

    // Data States
    const [personal, setPersonal] = useState<any>(null);
    const [academic, setAcademic] = useState<any>(null);
    const [parent, setParent] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async () => {
            const token = localStorage.getItem('token');
            const id = localStorage.getItem('studtblId');
            const institutionId = localStorage.getItem('institutionId') || 'SEC';

            if (!token || !id) return;

            const headers = {
                Authorization: `Bearer ${token}`,
                'X-Institution-Id': institutionId
            };
            const eid = encodeURIComponent(id);

            try {
                const [persRes, acadRes, parRes] = await Promise.all([
                    fetch(`${API}/api/student/personal?studtblId=${eid}`, { headers }),
                    fetch(`${API}/api/student/academic?studtblId=${eid}`, { headers }),
                    fetch(`${API}/api/student/parent?studtblId=${eid}`, { headers })
                ]);

                if (persRes.ok) setPersonal(await persRes.json());
                if (acadRes.ok) setAcademic(await acadRes.json());
                if (parRes.ok) setParent(await parRes.json());

            } catch (err) {
                console.error("Failed to load profile data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, []);

    const tabs = [
        { id: 'profile', label: 'Overview', icon: User },
        { id: 'connect', label: 'Campus Connect', icon: Activity },
        { id: 'achievements', label: 'Achievements', icon: Award },
        { id: 'courses', label: 'Course Details', icon: BookOpen },
        { id: 'attendance', label: 'Attendance Log', icon: Calendar },
    ] as const;

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[500px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading profile data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm">
                <div className="h-32 sm:h-48 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                <div className="px-6 sm:px-10 pb-6 sm:pb-8 relative">
                    <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-end -mt-16 sm:-mt-20">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white shadow-xl bg-white overflow-hidden flex-shrink-0 z-10">
                            <ProfileImage
                                studtblId={localStorage.getItem('studtblId') || ''}
                                documentId={personal?.photo_id}
                                fallback={personal?.name?.substring(0, 2) || 'EM'}
                            />
                        </div>
                        <div className="flex-1 text-center sm:text-left pt-2 sm:pt-0 pb-2">
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{personal?.name || 'Student Name'}</h1>
                            <p className="text-slate-500 font-medium mt-1 flex items-center justify-center sm:justify-start gap-2">
                                <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-sm font-bold border border-indigo-100">
                                    {personal?.reg_no || 'Register No'}
                                </span>
                                <span>•</span>
                                <span>Batch {academic?.batch || 'N/A'}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1.5 bg-slate-100/50 rounded-2xl border border-slate-200/50">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-medium text-[13px] sm:text-sm transition-all whitespace-nowrap ${isActive
                                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                                : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                                }`}
                        >
                            <Icon size={16} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content Area */}
            <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, y: -10 }}
                        variants={fadeIn}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'profile' && <ProfileOverviewTab personal={personal} academic={academic} parent={parent} />}
                        {activeTab === 'connect' && <CampusConnectTab studtblId={localStorage.getItem('studtblId') || ''} />}
                        {activeTab === 'achievements' && <AchievementsTab studtblId={localStorage.getItem('studtblId') || ''} />}
                        {activeTab === 'courses' && <CourseDetailsTab studtblId={localStorage.getItem('studtblId') || ''} academic={academic} />}
                        {activeTab === 'attendance' && <AttendanceLogTab studtblId={localStorage.getItem('studtblId') || ''} academic={academic} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

function ProfileOverviewTab({ personal, academic, parent }: { personal: any, academic: any, parent: any }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Details Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5 sm:space-y-6">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <User className="text-indigo-500" size={18} />
                    Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4">
                    <InfoField label="Date of Birth" value={personal?.date_of_birth} />
                    <InfoField label="Gender" value={personal?.gender} />
                    <InfoField label="Blood Group" value={personal?.blood_group || 'Not Specified'} />
                    <InfoField label="Community" value={personal?.community} />
                    <InfoField label="Religion" value={personal?.religion} />
                    <InfoField label="Languages" value={personal?.languages} />
                </div>
            </div>

            {/* Contact Details Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5 sm:space-y-6">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Phone className="text-indigo-500" size={18} />
                    Contact Information
                </h3>
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 mt-0.5"><Mail size={16} /></div>
                        <div>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Official Email</p>
                            <p className="text-[13px] sm:text-sm font-medium text-slate-800 break-all">{personal?.email || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 mt-0.5"><Phone size={16} /></div>
                        <div>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Mobile Number</p>
                            <p className="text-[13px] sm:text-sm font-medium text-slate-800">{personal?.mobile || 'N/A'}</p>
                        </div>
                    </div>
                    {personal?.bus_route && (
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 mt-0.5"><MapPin size={16} /></div>
                            <div>
                                <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Transport</p>
                                <p className="text-[13px] sm:text-sm font-medium text-slate-800">{personal.bus_route}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Academic Details Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5 sm:space-y-6 md:col-span-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <GraduationCap className="text-indigo-500" size={18} />
                    Academic Information
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-5 gap-x-4">
                    <InfoField label="Department" value={academic?.dept} />
                    <InfoField label="Current Semester" value={`Semester ${academic?.semester} (${academic?.semester_type})`} />
                    <InfoField label="Batch" value={academic?.batch} />
                    <InfoField label="Admission Mode" value={academic?.admission_mode} />
                    <InfoField label="University Reg No" value={academic?.university_reg_no} />
                    <InfoField label="Hosteller" value={academic?.hostel ? 'Yes' : 'No'} />
                    <InfoField label="Mentor Name" value={academic?.mentor_name} />
                    <InfoField label="Academic Year" value={academic?.current_academic_year} />
                </div>
            </div>

            {/* Parent Details Card */}
            {parent && (
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5 sm:space-y-6 md:col-span-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Users className="text-indigo-500" size={18} />
                        Parent / Guardian Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-2 sm:mb-2">Father</p>
                            <p className="text-[13px] sm:text-sm font-bold text-slate-800">{parent.father_name || 'N/A'}</p>
                            {parent.father_mobile && <p className="text-[11px] sm:text-xs text-slate-600 mt-1 flex items-center gap-1"><Phone size={12} /> {parent.father_mobile}</p>}
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-2">Mother</p>
                            <p className="text-[13px] sm:text-sm font-bold text-slate-800">{parent.mother_name || 'N/A'}</p>
                            {parent.mother_mobile && <p className="text-[11px] sm:text-xs text-slate-600 mt-1 flex items-center gap-1"><Phone size={12} /> {parent.mother_mobile}</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoField({ label, value }: { label: string, value: any }) {
    return (
        <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-[13px] sm:text-sm font-semibold text-slate-800 mt-[2px] sm:mt-0.5">{value || '—'}</p>
        </div>
    );
}

function PlaceholderTab({ title, icon: Icon }: { title: string, icon: any }) {
    return (
        <div className="h-64 sm:h-96 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                <Icon size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
            <p className="text-slate-500 max-w-sm">This module is currently under development. Data will be mapped soon.</p>
        </div>
    );
}
