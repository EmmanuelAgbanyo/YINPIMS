import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import type { Registration, Participant, ParticipantBadgeType } from '../../types';
import { X, AlertCircle, AlertTriangle, CheckCircle, QrCode } from 'lucide-react';
import { ParticipantBadgeModal } from '../badge/ParticipantBadgeModal';

interface PublicRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string;
}

export const PublicRegistrationModal: React.FC<PublicRegistrationModalProps> = ({
  isOpen,
  onClose,
  eventId: initialEventId,
}) => {
  const { data, refreshData } = useApp();

  const [selectedEvtId, setSelectedEvtId] = useState<string>(
    initialEventId || data.events.find(e => e.status === 'Active')?.id || data.events[0]?.id || ''
  );

  const event = data.events.find(e => e.id === selectedEvtId);
  const questions = event ? data.questions.filter(q => q.eventId === event.id).sort((a, b) => a.position - b.position) : [];

  // Form State
  const [badgeType, setBadgeType] = useState<ParticipantBadgeType>('Delegate');
  const [fallbackInstitution, setFallbackInstitution] = useState('');
  const [formAnswers, setFormAnswers] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Result States
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);
  const [successRegistration, setSuccessRegistration] = useState<{
    registration: Registration;
    participant: Participant;
    isWaitlisted: boolean;
    waitlistPosition?: number;
  } | null>(null);

  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (initialEventId) {
      setSelectedEvtId(initialEventId);
    }
  }, [initialEventId]);

  if (!isOpen) return null;

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setFormAnswers(prev => ({ ...prev, [questionId]: value }));
    setErrors(prev => ({ ...prev, [questionId]: '' }));
    setDuplicateNotice(null);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    for (const q of questions) {
      const val = formAnswers[q.id];
      if (q.required) {
        if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === 'string' && !val.trim())) {
          newErrors[q.id] = `Please answer: ${q.label}`;
        }
      }

      if (q.type === 'email' && val && typeof val === 'string' && val.trim().length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val.trim())) {
          newErrors[q.id] = 'Please enter a valid email address.';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !event) return;

    // Find Name, Email, Phone, Gender answers from system questions or generic labels
    const nameQ = questions.find(q => q.label.toLowerCase().includes('name')) || questions[0];
    const emailQ = questions.find(q => q.type === 'email' || q.label.toLowerCase().includes('email'));
    const phoneQ = questions.find(q => q.type === 'phone' || q.label.toLowerCase().includes('phone'));
    const genderQ = questions.find(q => q.label.toLowerCase().includes('gender'));
    const accomQ = questions.find(q =>
      q.label.toLowerCase().includes('accommodation') ||
      q.label.toLowerCase().includes('room') ||
      q.label.toLowerCase().includes('housing')
    );
    // Find Institution / Organization / School
    const institutionQ = questions.find(q =>
      q.label.toLowerCase().includes('institution') ||
      q.label.toLowerCase().includes('school') ||
      q.label.toLowerCase().includes('organization') ||
      q.label.toLowerCase().includes('university') ||
      q.label.toLowerCase().includes('college') ||
      q.label.toLowerCase().includes('company') ||
      q.label.toLowerCase().includes('affiliation')
    );

    const fullName = String(formAnswers[nameQ?.id || ''] || 'Participant').trim();
    const email = String(formAnswers[emailQ?.id || ''] || '').trim();
    const phone = String(formAnswers[phoneQ?.id || ''] || '').trim();
    const gender = String(formAnswers[genderQ?.id || ''] || 'Prefer not to say');
    const organization = (institutionQ ? String(formAnswers[institutionQ.id] || '') : fallbackInstitution).trim();

    let accommodationRequired = false;
    if (event.accommodationEnabled) {
      if (accomQ) {
        const ans = String(formAnswers[accomQ.id] || '').toLowerCase();
        accommodationRequired = !ans.includes('no');
      } else {
        accommodationRequired = true;
      }
    }

    const result = db.registerParticipant(
      event.id,
      { fullName, email, phone, gender, organization: organization || undefined, badgeType },
      formAnswers,
      accommodationRequired
    );

    if (result.isDuplicate) {
      setDuplicateNotice(
        `Duplicate Registration Detected: An existing registration already exists for ${email} in "${event.name}". Registration ID: ${result.registration.id}.`
      );
      return;
    }

    refreshData();
    setSuccessRegistration({
      registration: result.registration,
      participant: result.participant,
      isWaitlisted: result.isWaitlisted,
      waitlistPosition: result.waitlistPosition,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 overflow-y-auto">
      <div className="bg-white border border-[#E4E4E1] rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E1]">
          <div>
            <h2 className="text-base font-bold text-[#1C1C1A] font-heading">
              Participant Event Registration
            </h2>
            <p className="text-xs text-[#6B6B66]">Complete participant information to register.</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 text-[#6B6B66] hover:bg-[#FAFAF9] rounded flex items-center justify-center cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Success Screen */}
          {successRegistration ? (
            <div className="text-center py-6 space-y-4">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto ${
                successRegistration.isWaitlisted ? 'bg-[#FDF9F0] text-[#C17F16]' : 'bg-[#F0F9F3] text-[#2F7D4F]'
              }`}>
                <CheckCircle className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#1C1C1A] font-heading">
                  {successRegistration.isWaitlisted ? 'Added to Event Waitlist' : 'Registration Confirmed!'}
                </h3>
                <p className="text-xs text-[#6B6B66] mt-1 max-w-md mx-auto">
                  {successRegistration.isWaitlisted
                    ? `Capacity for "${event?.name}" is currently full. You are number ${successRegistration.waitlistPosition} on the waitlist.`
                    : `Successfully registered ${successRegistration.participant.fullName} for "${event?.name}".`}
                </p>
              </div>

              {/* Digital Badge Launch Button */}
              {!successRegistration.isWaitlisted && (
                <div className="pt-2">
                  <button
                    onClick={() => setShowBadge(true)}
                    className="inline-flex items-center space-x-2 h-10 px-5 bg-[#14595A] text-white text-xs font-semibold rounded-md hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>View & Download Digital Badge</span>
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-[#E4E4E1] flex justify-center space-x-2">
                <button
                  onClick={() => {
                    setSuccessRegistration(null);
                    setFormAnswers({});
                  }}
                  className="px-4 h-8 bg-white border border-[#E4E4E1] text-xs font-medium text-[#1C1C1A] rounded hover:bg-[#FAFAF9] cursor-pointer"
                >
                  Register Another Participant
                </button>
                <button
                  onClick={onClose}
                  className="px-4 h-8 bg-[#14595A] text-xs font-medium text-white rounded hover:bg-[#0E4243] cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Event Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Target Event</label>
                <select
                  value={selectedEvtId}
                  onChange={e => {
                    setSelectedEvtId(e.target.value);
                    setFormAnswers({});
                    setErrors({});
                    setDuplicateNotice(null);
                  }}
                  className="w-full h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-white text-[#1C1C1A] focus:outline-none focus:border-[#14595A] cursor-pointer"
                >
                  {data.events.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.status}) {e.capacity ? `[Capacity: ${e.capacity}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Badge Title / Classification Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Badge Title / Classification</label>
                <select
                  value={badgeType}
                  onChange={e => setBadgeType(e.target.value as ParticipantBadgeType)}
                  className="w-full h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-white text-[#1C1C1A] focus:outline-none focus:border-[#14595A] cursor-pointer font-medium"
                >
                  <option value="Delegate">Delegate</option>
                  <option value="Contestant">Contestant</option>
                  <option value="Speaker">Speaker</option>
                  <option value="Volunteer">Volunteer</option>
                  <option value="Staff">Staff</option>
                  <option value="Coordinator">Coordinator</option>
                </select>
                <p className="text-[11px] text-[#6B6B66] mt-1">Classification printed on official event badges & ID cards.</p>
              </div>

              {/* Duplicate Notice Banner */}
              {duplicateNotice && (
                <div className="p-3 bg-[#FDF2F2] border border-[#B0413E]/30 rounded-md flex items-start space-x-2.5 text-xs text-[#B0413E]">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="font-medium leading-relaxed">{duplicateNotice}</div>
                </div>
              )}

              {/* Event Capacity Warning Badge */}
              {event?.capacity && (
                <div className="p-2.5 bg-[#FAFAF9] border border-[#E4E4E1] rounded-md text-xs flex items-center justify-between text-[#6B6B66]">
                  <span>Event Capacity: <strong className="text-[#1C1C1A]">{event.capacity} registrations max</strong></span>
                  <span className="text-[11px] text-[#C17F16] font-semibold">Auto-Waitlist Enabled</span>
                </div>
              )}

              {/* Questions Render */}
              <div className="space-y-3.5 pt-2">
                {questions.map(q => (
                  <div key={q.id} className="space-y-1">
                    <label className="block text-xs font-semibold text-[#1C1C1A]">
                      {q.label} {q.required ? (
                        <span className="text-[#B0413E] font-bold">*</span>
                      ) : (
                        <span className="text-[11px] font-normal text-[#8A8A85] ml-1">(Optional)</span>
                      )}
                    </label>

                    {q.type === 'short_text' && (
                      <input
                        type="text"
                        value={String(formAnswers[q.id] || '')}
                        onChange={e => handleAnswerChange(q.id, e.target.value)}
                        placeholder={`Enter ${q.label.toLowerCase()}`}
                        className={`w-full h-9 px-3 text-xs rounded-md border bg-white focus:outline-none ${
                          errors[q.id] ? 'border-[#B0413E]' : 'border-[#E4E4E1] focus:border-[#14595A]'
                        }`}
                      />
                    )}

                    {q.type === 'paragraph' && (
                      <textarea
                        rows={2}
                        value={String(formAnswers[q.id] || '')}
                        onChange={e => handleAnswerChange(q.id, e.target.value)}
                        placeholder={`Enter ${q.label.toLowerCase()}`}
                        className={`w-full p-2.5 text-xs rounded-md border bg-white focus:outline-none ${
                          errors[q.id] ? 'border-[#B0413E]' : 'border-[#E4E4E1] focus:border-[#14595A]'
                        }`}
                      />
                    )}

                    {q.type === 'email' && (
                      <input
                        type="email"
                        value={String(formAnswers[q.id] || '')}
                        onChange={e => handleAnswerChange(q.id, e.target.value)}
                        placeholder="name@example.com"
                        className={`w-full h-9 px-3 text-xs rounded-md border bg-white focus:outline-none ${
                          errors[q.id] ? 'border-[#B0413E]' : 'border-[#E4E4E1] focus:border-[#14595A]'
                        }`}
                      />
                    )}

                    {q.type === 'phone' && (
                      <input
                        type="tel"
                        value={String(formAnswers[q.id] || '')}
                        onChange={e => handleAnswerChange(q.id, e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className={`w-full h-9 px-3 text-xs rounded-md border bg-white focus:outline-none ${
                          errors[q.id] ? 'border-[#B0413E]' : 'border-[#E4E4E1] focus:border-[#14595A]'
                        }`}
                      />
                    )}

                    {q.type === 'dropdown' && (
                      <select
                        value={String(formAnswers[q.id] || '')}
                        onChange={e => handleAnswerChange(q.id, e.target.value)}
                        className={`w-full h-9 px-3 text-xs rounded-md border bg-white focus:outline-none ${
                          errors[q.id] ? 'border-[#B0413E]' : 'border-[#E4E4E1] focus:border-[#14595A]'
                        }`}
                      >
                        <option value="">Select option...</option>
                        {(q.options || []).map((opt, idx) => (
                          <option key={idx} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {q.type === 'multiple_choice' && (
                      <div className="space-y-1 pt-1">
                        {(q.options || []).map((opt, idx) => (
                          <label key={idx} className="flex items-center space-x-2 text-xs text-[#1C1C1A] cursor-pointer">
                            <input
                              type="radio"
                              name={q.id}
                              checked={formAnswers[q.id] === opt}
                              onChange={() => handleAnswerChange(q.id, opt)}
                              className="text-[#14595A] focus:ring-[#14595A]"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === 'checkboxes' && (
                      <div className="space-y-1 pt-1">
                        {(q.options || []).map((opt, idx) => {
                          const currentArr = (formAnswers[q.id] as string[]) || [];
                          const isChecked = currentArr.includes(opt);
                          return (
                            <label key={idx} className="flex items-center space-x-2 text-xs text-[#1C1C1A] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => {
                                  if (e.target.checked) {
                                    handleAnswerChange(q.id, [...currentArr, opt]);
                                  } else {
                                    handleAnswerChange(q.id, currentArr.filter(i => i !== opt));
                                  }
                                }}
                                className="rounded text-[#14595A] focus:ring-[#14595A]"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {errors[q.id] && (
                      <span className="flex items-center space-x-1 text-[11px] text-[#B0413E] mt-0.5 font-medium">
                        <AlertCircle className="h-3 w-3" />
                        <span>{errors[q.id]}</span>
                      </span>
                    )}
                  </div>
                ))}

                {/* Fallback Institution Field if questions do not include institution */}
                {!questions.some(q =>
                  q.label.toLowerCase().includes('institution') ||
                  q.label.toLowerCase().includes('school') ||
                  q.label.toLowerCase().includes('organization') ||
                  q.label.toLowerCase().includes('university') ||
                  q.label.toLowerCase().includes('college')
                ) && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#1C1C1A]">
                      Institution / School / Organization
                      <span className="text-[11px] font-normal text-[#8A8A85] ml-1">(Added to Badge)</span>
                    </label>
                    <input
                      type="text"
                      value={fallbackInstitution}
                      onChange={e => setFallbackInstitution(e.target.value)}
                      placeholder="e.g. University of Ghana, Achimota School"
                      className="w-full h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-white focus:outline-none focus:border-[#14595A]"
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-[#E4E4E1] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 h-9 text-xs font-medium text-[#1C1C1A] bg-white border border-[#E4E4E1] rounded-md hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 h-9 text-xs font-medium text-white bg-[#14595A] rounded-md hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer"
                >
                  Submit Registration
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Participant Digital Badge Modal */}
      {successRegistration && showBadge && (
        <ParticipantBadgeModal
          isOpen={showBadge}
          onClose={() => setShowBadge(false)}
          registration={successRegistration.registration}
          participant={successRegistration.participant}
          event={event!}
        />
      )}
    </div>
  );
};
