import React, { useState } from 'react';
import type { RegistrationQuestion } from '../../types';
import { X, Sparkles, ArrowRight, Wand2 } from 'lucide-react';

interface AIFormGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onApplyQuestions: (generatedQuestions: RegistrationQuestion[]) => void;
}

export const AIFormGeneratorModal: React.FC<AIFormGeneratorModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onApplyQuestions,
}) => {
  const [prompt, setPrompt] = useState(
    'Create a registration form for an International AI & Tech Conference. We need attendee full name, email, phone, organization, job title, dietary requirements (Vegetarian, Vegan, Gluten-Free, None), t-shirt size (S, M, L, XL), experience level, and accommodation request.'
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<RegistrationQuestion[] | null>(null);

  if (!isOpen) return null;

  // Smart Parser Logic to convert write-up into structured RegistrationQuestions
  const handleGenerate = () => {
    setIsGenerating(true);

    setTimeout(() => {
      const lower = prompt.toLowerCase();
      const generated: RegistrationQuestion[] = [
        { id: `sys-name-${eventId}`, eventId, label: 'Full Name', type: 'short_text', required: true, position: 1, isSystemQuestion: true },
        { id: `sys-email-${eventId}`, eventId, label: 'Email Address', type: 'email', required: true, position: 2, isSystemQuestion: true },
        { id: `sys-phone-${eventId}`, eventId, label: 'Phone Number', type: 'phone', required: true, position: 3, isSystemQuestion: true },
        { id: `sys-gender-${eventId}`, eventId, label: 'Gender', type: 'dropdown', required: true, options: ['Male', 'Female', 'Other', 'Prefer not to say'], position: 4, isSystemQuestion: true },
      ];

      // Smart pattern detection from write-up text
      if (lower.includes('organization') || lower.includes('company') || lower.includes('institution')) {
        generated.push({
          id: `ai-q-${Date.now()}-1`,
          eventId,
          label: 'Organization / Institution',
          type: 'short_text',
          required: true,
          position: generated.length + 1,
        });
      }

      if (lower.includes('title') || lower.includes('role') || lower.includes('job')) {
        generated.push({
          id: `ai-q-${Date.now()}-2`,
          eventId,
          label: 'Current Job Title / Role',
          type: 'short_text',
          required: false,
          position: generated.length + 1,
        });
      }

      if (lower.includes('diet') || lower.includes('food') || lower.includes('meal')) {
        generated.push({
          id: `ai-q-${Date.now()}-3`,
          eventId,
          label: 'Dietary Restrictions & Preferences',
          type: 'checkboxes',
          required: false,
          options: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'None'],
          position: generated.length + 1,
        });
      }

      if (lower.includes('shirt') || lower.includes('size')) {
        generated.push({
          id: `ai-q-${Date.now()}-4`,
          eventId,
          label: 'T-Shirt Size',
          type: 'dropdown',
          required: true,
          options: ['Small (S)', 'Medium (M)', 'Large (L)', 'Extra Large (XL)', '2XL'],
          position: generated.length + 1,
        });
      }

      if (lower.includes('experience') || lower.includes('level') || lower.includes('skill')) {
        generated.push({
          id: `ai-q-${Date.now()}-5`,
          eventId,
          label: 'Experience Level',
          type: 'multiple_choice',
          required: true,
          options: ['Beginner', 'Intermediate', 'Advanced', 'Executive / Leader'],
          position: generated.length + 1,
        });
      }

      if (lower.includes('github') || lower.includes('portfolio') || lower.includes('linkedin') || lower.includes('url')) {
        generated.push({
          id: `ai-q-${Date.now()}-6`,
          eventId,
          label: 'Portfolio / Profile URL',
          type: 'short_text',
          required: false,
          position: generated.length + 1,
        });
      }

      if (lower.includes('accommodat') || lower.includes('hotel') || lower.includes('room') || lower.includes('stay')) {
        generated.push({
          id: `sys-accom-${eventId}`,
          eventId,
          label: 'Do you need accommodation?',
          type: 'multiple_choice',
          required: true,
          options: ['Yes', 'No'],
          position: generated.length + 1,
          isSystemQuestion: true,
        });
      }

      if (lower.includes('statement') || lower.includes('purpose') || lower.includes('motivation') || lower.includes('why')) {
        generated.push({
          id: `ai-q-${Date.now()}-7`,
          eventId,
          label: 'Statement of Purpose / Motivation',
          type: 'paragraph',
          required: false,
          position: generated.length + 1,
        });
      }

      setPreviewQuestions(generated);
      setIsGenerating(false);
    }, 600);
  };

  const handleApply = () => {
    if (!previewQuestions) return;
    onApplyQuestions(previewQuestions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 overflow-y-auto">
      <div className="bg-white border border-[#E4E4E1] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E1] bg-[#14595A] text-white rounded-t-lg">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5" />
            <div>
              <h2 className="text-base font-bold font-heading leading-tight">
                Smart AI Form Generator
              </h2>
              <p className="text-xs text-white/80">Type or paste any write-up description to automatically build registration questions.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Quick Presets */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1C1C1A]">Sample Event Presets:</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPrompt('Create a registration form for a Tech Hackathon: Name, email, github URL, programming language preference, t-shirt size, dietary restrictions, and accommodation requirement.')}
                className="px-2.5 py-1 bg-[#FAFAF9] border border-[#E4E4E1] text-[11px] font-medium text-[#14595A] rounded hover:bg-[#EBF4F4] cursor-pointer"
              >
                Hackathon Registration
              </button>
              <button
                type="button"
                onClick={() => setPrompt('Registration form for an Executive Leadership Summit: Full name, organization, job title, bio, dietary preferences, t-shirt size, and room stay preference.')}
                className="px-2.5 py-1 bg-[#FAFAF9] border border-[#E4E4E1] text-[11px] font-medium text-[#14595A] rounded hover:bg-[#EBF4F4] cursor-pointer"
              >
                Leadership Summit
              </button>
              <button
                type="button"
                onClick={() => setPrompt('Medical Training Workshop form asking for full name, specialty, institution, years of practice, dietary needs, and accommodation.')}
                className="px-2.5 py-1 bg-[#FAFAF9] border border-[#E4E4E1] text-[11px] font-medium text-[#14595A] rounded hover:bg-[#EBF4F4] cursor-pointer"
              >
                Medical Workshop
              </button>
            </div>
          </div>

          {/* Prompt Write-up Input */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Event Write-Up / Requirements Description</label>
            <textarea
              rows={4}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe your event and what details you want to collect..."
              className="w-full p-3 text-xs rounded-md border border-[#E4E4E1] bg-white focus:outline-none focus:border-[#14595A]"
            />
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full h-9 bg-[#14595A] text-white text-xs font-semibold rounded-md hover:bg-[#0E4243] transition-colors shadow-2xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Wand2 className="h-4 w-4" />
            <span>{isGenerating ? 'Analyzing Write-Up & Generating Questions...' : 'Generate Form Questions from Write-Up'}</span>
          </button>

          {/* Parsed Preview Table */}
          {previewQuestions && (
            <div className="space-y-2 pt-2 border-t border-[#E4E4E1]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1C1C1A]">Extracted Questions Preview ({previewQuestions.length} questions)</span>
                <span className="text-[11px] text-[#2F7D4F] font-semibold">Smart Parser Matched</span>
              </div>

              <div className="border border-[#E4E4E1] rounded-md overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAF9] border-b border-[#E4E4E1] text-[#6B6B66] font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Question Label</th>
                      <th className="py-2 px-3">Inferred Type</th>
                      <th className="py-2 px-3">Options / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E1]">
                    {previewQuestions.map((q, idx) => (
                      <tr key={idx} className="bg-white">
                        <td className="py-2 px-3 font-semibold text-[#6B6B66]">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-[#1C1C1A]">{q.label}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-[#14595A]">{q.type}</td>
                        <td className="py-2 px-3 text-[11px] text-[#6B6B66]">
                          {q.options ? q.options.join(', ') : 'Free text input'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-2 px-6 py-3 border-t border-[#E4E4E1] bg-[#FAFAF9] rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 text-xs font-medium text-[#1C1C1A] bg-white border border-[#E4E4E1] rounded-md hover:bg-[#FAFAF9] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!previewQuestions}
            className="px-4 h-9 text-xs font-medium text-white bg-[#14595A] rounded-md hover:bg-[#0E4243] disabled:opacity-50 transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
          >
            <span>Apply to Form</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
