import { User, Phone, Mail, MapPin, GraduationCap, Users } from 'lucide-react';

export default function ProfileOverviewTab({ personal, academic, parent }: { personal: any, academic: any, parent: any }) {
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
