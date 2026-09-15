import React from 'react';
import type { Event, RegistrationQuestion } from '../../types';
import { X, Calendar, MapPin, Eye } from 'lucide-react';

interface FormPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  questions: RegistrationQuestion[];
}

export const FormPreviewModal: React.FC<FormPreviewModalProps> = ({
  isOpen,
  onClose,
  event,
  questions,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 overflow-y-auto">
      <div className="bg-[#FAFAF9] border border-[#E4E4E1] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8">
        {/* Preview Banner */}
        <div className="bg-[#14595A] text-white px-6 py-3 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center space-x-2 text-xs font-semibold">
            <Eye className="h-4 w-4" />
            <span>Participant Registration Form — Live Preview Mode</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Form Representation */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Form Header */}
          <div className="bg-white p-6 rounded-lg border border-[#E4E4E1] shadow-2xs space-y-3">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#14595A]/10 text-[#14595A] uppercase tracking-wider">
              {event.type}
            </span>
            <h1 className="font-heading font-bold text-xl text-[#1C1C1A]">
              {event.name}
            </h1>
            <p className="text-xs text-[#6B6B66] leading-relaxed">
              {event.description || 'Please complete the registration form below to confirm your attendance.'}
            </p>

            <div className="pt-2 border-t border-[#E4E4E1] flex flex-wrap gap-4 text-xs text-[#6B6B66]">
              <div className="flex items-center space-x-1.5">
                <Calendar className="h-4 w-4 text-[#14595A]" />
                <span>
                  {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <MapPin className="h-4 w-4 text-[#14595A]" />
                <span>{event.location}</span>
              </div>
            </div>
          </div>

          {/* Form Questions */}
          <form onSubmit={e => e.preventDefault()} className="bg-white p-6 rounded-lg border border-[#E4E4E1] shadow-2xs space-y-5">
            {questions.map(q => (
              <div key={q.id} className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#1C1C1A]">
                  {q.label} {q.required && <span className="text-[#B0413E]">*</span>}
                </label>

                {/* Question Control Rendering */}
                {q.type === 'short_text' && (
                  <input
                    type="text"
                    disabled
                    placeholder="Short answer text"
                    className="w-full h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9]"
                  />
                )}

                {q.type === 'paragraph' && (
                  <textarea
                    rows={3}
                    disabled
                    placeholder="Detailed response text..."
                    className="w-full p-2.5 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9]"
                  />
                )}

                {q.type === 'email' && (
                  <input
                    type="email"
                    disabled
                    placeholder="name@example.com"
                    className="w-full h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9]"
                  />
                )}

                {q.type === 'phone' && (
                  <input
                    type="tel"
                    disabled
                    placeholder="+1 (555) 000-0000"
                    className="w-full h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9]"
                  />
                )}

                {q.type === 'date' && (
                  <input
                    type="date"
                    disabled
                    className="w-full h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9]"
                  />
                )}

                {q.type === 'number' && (
                  <input
                    type="number"
                    disabled
                    placeholder="0"
                    className="w-full h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9]"
                  />
                )}

                {q.type === 'dropdown' && (
                  <select disabled className="w-full h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9]">
                    <option>Select an option...</option>
                    {(q.options || []).map((opt, idx) => (
                      <option key={idx}>{opt}</option>
                    ))}
                  </select>
                )}

                {q.type === 'multiple_choice' && (
                  <div className="space-y-1.5 pt-1">
                    {(q.options || []).map((opt, idx) => (
                      <label key={idx} className="flex items-center space-x-2 text-xs text-[#1C1C1A]">
                        <input type="radio" disabled name={q.id} />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'checkboxes' && (
                  <div className="space-y-1.5 pt-1">
                    {(q.options || []).map((opt, idx) => (
                      <label key={idx} className="flex items-center space-x-2 text-xs text-[#1C1C1A]">
                        <input type="checkbox" disabled />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              disabled
              className="w-full h-10 bg-[#14595A] text-white text-xs font-semibold rounded-md opacity-90 cursor-not-allowed"
            >
              Complete Registration (Preview Mode)
            </button>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#E4E4E1] bg-white rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-4 h-8 bg-white border border-[#E4E4E1] text-xs font-medium text-[#1C1C1A] rounded-md hover:bg-[#FAFAF9] cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
