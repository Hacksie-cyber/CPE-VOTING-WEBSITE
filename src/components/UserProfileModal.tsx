import React, { useState, useEffect } from 'react';
import { Voter, YearLevel } from '../types';
import {
  User,
  CreditCard,
  GraduationCap,
  BookOpen,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  ShieldCheck,
  Calendar,
  Hash,
} from 'lucide-react';
import { updateVoterProfileInFirestore } from '../lib/firebase';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  voter: Voter | null;
  onProfileUpdated: (updatedVoter: Voter) => void;
}

const COMMON_COURSES = [
  'BS Computer Engineering',
  'BS Electronics Engineering',
  'BS Electrical Engineering',
  'BS Computer Science',
  'BS Information Technology',
  'BS Software Engineering',
  'Other',
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  voter,
  onProfileUpdated,
}) => {
  const [fullName, setFullName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('BS Computer Engineering');
  const [customCourse, setCustomCourse] = useState('');
  const [yearLevel, setYearLevel] = useState<YearLevel>('3rd Year');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (voter) {
      setFullName(voter.name || '');
      setStudentNumber(voter.studentNumber || voter.id || '');
      setYearLevel(voter.yearLevel || '3rd Year');

      const existingCourse = voter.course || 'BS Computer Engineering';
      if (COMMON_COURSES.includes(existingCourse) && existingCourse !== 'Other') {
        setSelectedCourse(existingCourse);
        setCustomCourse('');
      } else {
        setSelectedCourse('Other');
        setCustomCourse(existingCourse);
      }
      setError(null);
      setSuccessMsg(null);
    }
  }, [voter, isOpen]);

  if (!isOpen || !voter) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanStudentNum = studentNumber.trim().toUpperCase();
    const resolvedCourse =
      selectedCourse === 'Other'
        ? customCourse.trim() || 'BS Computer Engineering'
        : selectedCourse;

    if (!cleanName) {
      setError('Please provide your Full Name.');
      return;
    }
    if (!cleanStudentNum) {
      setError('Please provide your Student ID Number.');
      return;
    }
    if (!resolvedCourse) {
      setError('Please specify your Course.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      currentId: voter.id,
      email: voter.email,
      name: cleanName,
      studentNumber: cleanStudentNum,
      course: resolvedCourse,
      yearLevel,
    };

    try {
      // 1. Update on Server API
      let updatedVoterObj: Voter | null = null;
      try {
        const res = await fetch('/api/voter/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to update personal information.');
        }
        updatedVoterObj = data.voter;
      } catch (apiErr: any) {
        console.warn('API update failed, attempting direct Firestore synchronization...', apiErr);
      }

      // 2. Direct Firestore synchronization as backup or primary
      await updateVoterProfileInFirestore(voter.id || voter.email, {
        name: cleanName,
        studentNumber: cleanStudentNum,
        course: resolvedCourse,
        yearLevel,
        email: voter.email,
      });

      const finalVoter: Voter = updatedVoterObj || {
        ...voter,
        id: cleanStudentNum,
        studentNumber: cleanStudentNum,
        name: cleanName,
        course: resolvedCourse,
        yearLevel,
      };

      // Save to localStorage & notify parent app
      localStorage.setItem('cpe_voter', JSON.stringify(finalVoter));
      onProfileUpdated(finalVoter);
      setSuccessMsg('Personal information updated successfully!');

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="user-profile-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="user-profile-modal-content"
        className="bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(225,29,72,0.3)] relative text-neutral-900 dark:text-slate-100"
      >
        {/* Close Button */}
        <button
          id="close-profile-modal-btn"
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 border border-neutral-300 dark:border-slate-600 flex items-center justify-center text-neutral-600 dark:text-slate-300 hover:text-black dark:hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3.5 mb-6 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border-2 border-black dark:border-rose-800 flex items-center justify-center text-rose-700 dark:text-rose-400 flex-shrink-0 shadow-sm">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-slate-100 leading-tight">
                Personal Information
              </h2>
              <span className="bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-rose-300 dark:border-rose-800">
                Student Profile
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-slate-400 font-medium mt-0.5">
              Update your official name, student ID number, course, and year level.
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-700 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border-2 border-emerald-600 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Read-Only Account Details Header Card */}
        <div className="mb-5 p-3.5 rounded-2xl bg-neutral-50 dark:bg-slate-800/70 border border-neutral-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5 truncate">
            <Mail className="w-4 h-4 text-neutral-500 dark:text-slate-400 flex-shrink-0" />
            <div className="truncate">
              <span className="text-[10px] uppercase font-black text-neutral-600 dark:text-slate-400 block">
                Institutional Email
              </span>
              <span className="font-bold text-neutral-900 dark:text-slate-100 truncate block">
                {voter.email || `${voter.id.toLowerCase()}@cpe.edu.ph`}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {voter.hasVoted ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3" />
                <span>Ballot Cast</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                <Calendar className="w-3 h-3" />
                <span>Eligible to Vote</span>
              </span>
            )}
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Full Name */}
          <div>
            <label className="block text-neutral-800 dark:text-slate-200 font-extrabold mb-1.5 uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span>Full Name *</span>
              <span className="text-[10px] font-medium text-neutral-500 dark:text-slate-400">First M. Last</span>
            </label>
            <div className="relative">
              <input
                id="edit-profile-fullname-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Juan Dela Cruz"
                className="w-full bg-neutral-50 dark:bg-slate-800 border-2 border-neutral-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-700 dark:focus:ring-rose-500 focus:border-black transition-all"
                required
              />
              <User className="w-4 h-4 text-neutral-400 dark:text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Student ID Number */}
          <div>
            <label className="block text-neutral-800 dark:text-slate-200 font-extrabold mb-1.5 uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span>Student ID Number *</span>
              <span className="text-[10px] font-medium text-neutral-500 dark:text-slate-400">Format: YYYY-XXXXX</span>
            </label>
            <div className="relative">
              <input
                id="edit-profile-studentid-input"
                type="text"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="e.g. 2023-10294"
                className="w-full bg-neutral-50 dark:bg-slate-800 border-2 border-neutral-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-rose-700 dark:focus:ring-rose-500 focus:border-black transition-all"
                required
              />
              <CreditCard className="w-4 h-4 text-neutral-400 dark:text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Course / Degree Program */}
          <div>
            <label className="block text-neutral-800 dark:text-slate-200 font-extrabold mb-1.5 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
              <span>Degree Program / Course *</span>
            </label>
            <div className="space-y-2">
              <select
                id="edit-profile-course-select"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-slate-800 border-2 border-neutral-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-700 dark:focus:ring-rose-500 focus:border-black transition-all"
              >
                {COMMON_COURSES.map((crs) => (
                  <option key={crs} value={crs} className="text-neutral-900 dark:text-slate-100">
                    {crs === 'Other' ? 'Other Course (Specify Below)' : crs}
                  </option>
                ))}
              </select>

              {selectedCourse === 'Other' && (
                <input
                  id="edit-profile-custom-course-input"
                  type="text"
                  value={customCourse}
                  onChange={(e) => setCustomCourse(e.target.value)}
                  placeholder="Enter your specific course / program..."
                  className="w-full bg-neutral-50 dark:bg-slate-800 border-2 border-neutral-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-neutral-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
                  required
                />
              )}
            </div>
          </div>

          {/* School Year Level */}
          <div>
            <label className="block text-neutral-800 dark:text-slate-200 font-extrabold mb-1.5 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
              <span>Year Level *</span>
            </label>
            <select
              id="edit-profile-yearlevel-select"
              value={yearLevel}
              onChange={(e) => setYearLevel(e.target.value as YearLevel)}
              className="w-full bg-neutral-50 dark:bg-slate-800 border-2 border-neutral-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-700 dark:focus:ring-rose-500 focus:border-black transition-all"
            >
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
          </div>

          {/* Receipt Info if already voted */}
          {voter.hasVoted && voter.receiptHash && (
            <div className="p-3 bg-neutral-50 dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 text-[11px] text-neutral-600 dark:text-slate-400 font-medium">
              <div className="flex items-center space-x-1 text-neutral-900 dark:text-slate-200 font-bold mb-0.5">
                <Hash className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
                <span>Associated Ballot Receipt:</span>
              </div>
              <span className="font-mono text-[10px] break-all font-bold text-neutral-700 dark:text-slate-300">
                {voter.receiptHash}
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-3">
            <button
              id="cancel-profile-modal-btn"
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-slate-700 text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 font-extrabold text-xs transition-colors"
            >
              Cancel
            </button>

            <button
              id="save-profile-modal-btn"
              type="submit"
              disabled={loading}
              className="bg-rose-700 hover:bg-rose-800 text-white font-extrabold px-6 py-2.5 rounded-xl transition-all border-2 border-black dark:border-rose-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(225,29,72,0.5)] flex items-center space-x-2 text-xs disabled:opacity-50 active:scale-95"
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security Footer Note */}
        <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-slate-800 flex items-center justify-center space-x-2 text-[10px] text-neutral-500 dark:text-slate-400 font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Official Commission on Elections Registry System</span>
        </div>
      </div>
    </div>
  );
};
