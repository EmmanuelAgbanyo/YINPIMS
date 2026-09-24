import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import type { Participant, ParticipantBadgeType, GenderType } from '../../types';
import { getBadgeTitleTheme } from '../badge/ParticipantBadgeModal';
import {
  X,
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Tag,
  Save,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface EditParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Participant | null;
  onUpdated?: (updated: Participant) => void;
}

export const EditParticipantModal: React.FC<EditParticipantModalProps> = ({
  isOpen,
  onClose,
  participant,
  onUpdated,
}) => {
  const { data, refreshData } = useApp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<GenderType>('Prefer not to say');
  const [organization, setOrganization] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [badgeType, setBadgeType] = useState<ParticipantBadgeType>('Delegate');

  const [errors, setErrors] = useState<{ fullName?: string; email?: string; general?: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state with incoming participant prop
  useEffect(() => {
    if (participant) {
      setFullName(participant.fullName || '');
      setEmail(participant.email || '');
      setPhone(participant.phone || '');
      setGender(participant.gender || 'Prefer not to say');
      setOrganization(participant.organization || '');
      setJobTitle(participant.jobTitle || '');
      setBadgeType(participant.badgeType || 'Delegate');
      setErrors({});
      setSaveSuccess(false);
    }
  }, [participant, isOpen]);

  if (!isOpen || !participant) return null;

  // Active registrations for this participant
  const participantRegistrations = data.registrations.filter(r => r.participantId === participant.id);

  const validate = () => {
    const errs: typeof errors = {};
    if (!fullName.trim()) {
      errs.fullName = 'Full name is required.';
    }
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    // Check for email collision with other participants
    const normalizedEmail = email.trim().toLowerCase();
    const collision = data.participants.find(
      p => p.id !== participant.id && p.email.toLowerCase() === normalizedEmail
    );
    if (collision) {
      errs.email = `This email is already registered to ${collision.fullName} (ID: ${collision.id}).`;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    setErrors({});

    try {
      const updated = db.updateParticipant(participant.id, {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        gender,
        organization: organization.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        badgeType,
      });

      refreshData();
      setSaveSuccess(true);
      if (onUpdated) onUpdated(updated);

      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to update participant:', err);
      setErrors({ general: (err as Error).message || 'Failed to save changes.' });
      setIsSaving(false);
    }
  };

  const badgeTheme = getBadgeTitleTheme(badgeType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto font-body">
      <div className="bg-white border border-[#E4E4E1] rounded-2xl shadow-2xl w-full max-w-xl flex flex-col my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E4E1] flex items-center justify-between bg-[#FAFAF9]">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-[#14595A]/10 text-[#14595A] flex items-center justify-center font-bold">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1C1C1A] font-heading">
                Edit Participant Information
              </h2>
              <p className="text-xs text-[#6B6B66]">
                Update profile details, contact information, and badge classification.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-[#6B6B66] hover:bg-white hover:text-[#1C1C1A] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-130px)]">
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errors.general}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Participant information saved successfully!</span>
            </div>
          )}

          {/* Section: Personal Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#14595A] flex items-center space-x-1.5 pb-1 border-b border-[#E4E4E1]">
              <User className="h-3.5 w-3.5" />
              <span>Personal Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Full Name */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-[#1C1C1A]">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-[#A3A39E]" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-white text-[#1C1C1A] focus:outline-none transition-colors ${
                      errors.fullName
                        ? 'border-red-400 focus:border-red-500 bg-red-50/20'
                        : 'border-[#E4E4E1] focus:border-[#14595A]'
                    }`}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-[11px] text-red-600">{errors.fullName}</p>
                )}
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1C1C1A]">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#A3A39E]" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. john@example.com"
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-white text-[#1C1C1A] focus:outline-none transition-colors ${
                      errors.email
                        ? 'border-red-400 focus:border-red-500 bg-red-50/20'
                        : 'border-[#E4E4E1] focus:border-[#14595A]'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1C1C1A]">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-[#A3A39E]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. +233 24 123 4567"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E4E4E1] bg-white text-[#1C1C1A] focus:outline-none focus:border-[#14595A]"
                  />
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-[#1C1C1A]">Gender</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as GenderType)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E4E4E1] bg-white text-[#1C1C1A] focus:outline-none focus:border-[#14595A] cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Affiliation Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#14595A] flex items-center space-x-1.5 pb-1 border-b border-[#E4E4E1]">
              <Building className="h-3.5 w-3.5" />
              <span>Affiliation & Role</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Organization */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1C1C1A]">Organization / School</label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 h-4 w-4 text-[#A3A39E]" />
                  <input
                    type="text"
                    value={organization}
                    onChange={e => setOrganization(e.target.value)}
                    placeholder="e.g. University of Ghana"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E4E4E1] bg-white text-[#1C1C1A] focus:outline-none focus:border-[#14595A]"
                  />
                </div>
              </div>

              {/* Job Title / Role */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1C1C1A]">Job Title / Designation</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-[#A3A39E]" />
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    placeholder="e.g. Student / Delegate"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E4E4E1] bg-white text-[#1C1C1A] focus:outline-none focus:border-[#14595A]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Badge Classification */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#14595A] flex items-center space-x-1.5 pb-1 border-b border-[#E4E4E1]">
              <Tag className="h-3.5 w-3.5" />
              <span>Event Pass & Badge Classification</span>
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#1C1C1A]">Badge Title</label>
              <div className="flex items-center space-x-3">
                <select
                  value={badgeType}
                  onChange={e => setBadgeType(e.target.value as ParticipantBadgeType)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#E4E4E1] bg-white text-[#1C1C1A] font-semibold focus:outline-none focus:border-[#14595A] cursor-pointer"
                >
                  <option value="Delegate">Delegate</option>
                  <option value="Contestant">Contestant</option>
                  <option value="Speaker">Speaker</option>
                  <option value="Volunteer">Volunteer</option>
                  <option value="Staff">Staff</option>
                  <option value="Coordinator">Coordinator</option>
                </select>

                <div className="shrink-0 flex items-center space-x-1.5">
                  <span className="text-[10px] text-[#6B6B66] font-medium">Badge Preview:</span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${badgeTheme.border} ${badgeTheme.bg} ${badgeTheme.text}`}
                  >
                    ★ {badgeTheme.label} ★
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-[#6B6B66]">
                Changing this classification automatically updates pass credentials, QR badges, and printed cards.
              </p>
            </div>
          </div>

          {/* Associated Registrations Summary */}
          {participantRegistrations.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#E4E4E1]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#6B6B66] uppercase tracking-wider">
                  Associated Event Registrations ({participantRegistrations.length})
                </span>
                <span className="text-[10px] text-[#A3A39E] font-mono">ID: {participant.id}</span>
              </div>
              <div className="space-y-1.5">
                {participantRegistrations.map(reg => {
                  const evt = data.events.find(e => e.id === reg.eventId);
                  return (
                    <div
                      key={reg.id}
                      className="p-2.5 bg-[#FAFAF9] rounded-lg border border-[#E4E4E1] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3.5 w-3.5 text-[#14595A]" />
                        <span className="font-semibold text-[#1C1C1A]">{evt?.name || reg.eventId}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          reg.checkInStatus === 'Checked In'
                            ? 'bg-emerald-100 text-emerald-800'
                            : reg.status === 'Waitlisted'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-teal-50 text-[#14595A] border border-teal-200'
                        }`}>
                          {reg.checkInStatus === 'Checked In' ? 'Checked In' : reg.status}
                        </span>
                        <span className="font-mono text-[10px] text-[#A3A39E]">{reg.id}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 border-t border-[#E4E4E1] flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 h-9 bg-white border border-[#E4E4E1] text-[#1C1C1A] text-xs font-semibold rounded-xl hover:bg-[#FAFAF9] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center space-x-1.5 px-5 h-9 bg-[#14595A] hover:bg-[#0E4243] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
