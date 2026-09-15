import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import type { RegistrationQuestion, QuestionType } from '../../types';
import {
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckSquare,
  AlignLeft,
  ListFilter,
  CheckCircle,
  Hash,
  Mail,
  Phone,
  Calendar,
  Lock,
  Sparkles,
  GripVertical,
} from 'lucide-react';
import { FormPreviewModal } from './FormPreviewModal';
import { AIFormGeneratorModal } from './AIFormGeneratorModal';

interface FormBuilderProps {
  initialEventId?: string;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({ initialEventId }) => {
  const { data, selectedEventId, setSelectedEventId, refreshData } = useApp();

  // Active event selected in builder
  const targetEventId = initialEventId || (selectedEventId !== 'all' ? selectedEventId : data.events[0]?.id || '');
  const activeEvent = data.events.find(e => e.id === targetEventId);

  const [questions, setQuestions] = useState<RegistrationQuestion[]>(() => {
    if (!targetEventId) return [];
    db.ensureDefaultQuestions(targetEventId, activeEvent?.accommodationEnabled || false);
    return db.getQuestionsForEvent(targetEventId);
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Sync questions when event changes
  React.useEffect(() => {
    if (targetEventId) {
      db.ensureDefaultQuestions(targetEventId, activeEvent?.accommodationEnabled || false);
      setQuestions(db.getQuestionsForEvent(targetEventId));
    }
  }, [targetEventId, activeEvent?.accommodationEnabled]);

  const saveQuestions = (updated: RegistrationQuestion[]) => {
    const reindexed = updated.map((q, idx) => ({ ...q, position: idx + 1 }));
    setQuestions(reindexed);
    db.saveQuestionsForEvent(targetEventId, reindexed);
    refreshData();
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= questions.length || toIndex >= questions.length) return;
    const updated = [...questions];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    saveQuestions(updated);
  };

  const handleAddQuestion = (type: QuestionType = 'short_text') => {
    const newQuestion: RegistrationQuestion = {
      id: `q-${Date.now()}`,
      eventId: targetEventId,
      label: 'New Question Label',
      type,
      required: false,
      options: ['Option 1', 'Option 2'],
      position: questions.length + 1,
    };
    saveQuestions([...questions, newQuestion]);
  };

  const handleUpdateQuestion = (id: string, updates: Partial<RegistrationQuestion>) => {
    const updated = questions.map(q => (q.id === id ? { ...q, ...updates } : q));
    saveQuestions(updated);
  };

  const handleDeleteQuestion = (id: string) => {
    const updated = questions.filter(q => q.id !== id);
    saveQuestions(updated);
  };

  const handleDuplicateQuestion = (q: RegistrationQuestion) => {
    const dup: RegistrationQuestion = {
      ...q,
      id: `q-${Date.now()}`,
      label: `${q.label} (Copy)`,
      position: questions.length + 1,
      isSystemQuestion: false,
    };
    saveQuestions([...questions, dup]);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === questions.length - 1)) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    handleReorder(index, targetIdx);
  };

  const getQuestionTypeIcon = (type: QuestionType) => {
    switch (type) {
      case 'short_text': return AlignLeft;
      case 'paragraph': return AlignLeft;
      case 'multiple_choice': return CheckCircle;
      case 'checkboxes': return CheckSquare;
      case 'dropdown': return ListFilter;
      case 'number': return Hash;
      case 'email': return Mail;
      case 'phone': return Phone;
      case 'date': return Calendar;
      default: return AlignLeft;
    }
  };

  if (!activeEvent) {
    return (
      <div className="p-12 text-center text-[#6B6B66]">
        Please select an event to manage its registration form.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E4E1]">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1A] tracking-tight">
              Registration Form Builder
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#14595A]/10 text-[#14595A]">
              {activeEvent.name}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#6B6B66] mt-0.5">
            Design registration questions, required fields, and live form experience for participants.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Event selector dropdown inside form builder */}
          <select
            value={targetEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className="h-9 px-3 text-xs font-medium rounded-md border border-[#E4E4E1] bg-white text-[#1C1C1A] focus:outline-none focus:border-[#14595A] cursor-pointer"
          >
            {data.events.map(e => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsAIGeneratorOpen(true)}
            className="flex items-center space-x-1.5 h-9 px-3.5 bg-[#14595A] text-white text-xs font-medium rounded-md hover:bg-[#0E4243] transition-colors cursor-pointer shadow-2xs"
          >
            <Sparkles className="h-4 w-4" />
            <span>Smart AI Builder</span>
          </button>

          <button
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center space-x-1.5 h-9 px-3.5 bg-white border border-[#E4E4E1] text-[#1C1C1A] text-xs font-medium rounded-md hover:bg-[#FAFAF9] transition-colors cursor-pointer shadow-2xs"
          >
            <Eye className="h-4 w-4 text-[#14595A]" />
            <span>Live Preview</span>
          </button>
        </div>
      </div>

      {/* Main Question Editor List */}
      <div className="space-y-4">
        {questions.map((q, idx) => {
          const Icon = getQuestionTypeIcon(q.type);
          const isNeedsOptions = ['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type);

          const isBeingDragged = draggedIndex === idx;
          const isDragTarget = dragOverIndex === idx;

          return (
            <div
              key={q.id}
              draggable={true}
              onDragStart={e => {
                setDraggedIndex(idx);
                e.dataTransfer.setData('text/plain', idx.toString());
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverIndex !== idx) setDragOverIndex(idx);
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={e => {
                e.preventDefault();
                if (draggedIndex !== null && draggedIndex !== idx) {
                  handleReorder(draggedIndex, idx);
                }
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              onDragEnd={() => {
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              className={`bg-white border rounded-lg shadow-2xs transition-all duration-150 ${
                isBeingDragged
                  ? 'opacity-40 border-dashed border-[#14595A] bg-[#EBF4F4]'
                  : isDragTarget
                  ? 'border-2 border-[#14595A] shadow-md ring-2 ring-[#14595A]/20 scale-[1.005]'
                  : q.isSystemQuestion
                  ? 'border-[#14595A]/30 bg-[#FAFAF9]/40'
                  : 'border-[#E4E4E1] hover:border-[#14595A]/50'
              }`}
            >
              {/* Question Item Header */}
              <div className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 flex-1">
                    {/* Drag Handle Icon */}
                    <div
                      title="Drag to reorder position"
                      className="cursor-grab active:cursor-grabbing text-[#6B6B66] hover:text-[#14595A] p-1 rounded hover:bg-[#FAFAF9] transition-colors shrink-0"
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>

                    <span className="h-6 w-6 rounded bg-[#FAFAF9] border border-[#E4E4E1] text-[11px] font-bold text-[#6B6B66] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>

                    {/* Question Label Input */}
                    <input
                      type="text"
                      value={q.label}
                      onChange={e => handleUpdateQuestion(q.id, { label: e.target.value })}
                      readOnly={q.isSystemQuestion && ['Full Name', 'Email Address', 'Phone Number'].includes(q.label)}
                      placeholder="Enter question label..."
                      className={`flex-1 h-9 px-3 text-xs font-semibold rounded-md border bg-white focus:outline-none ${
                        q.isSystemQuestion ? 'border-[#E4E4E1] text-[#6B6B66]' : 'border-[#E4E4E1] focus:border-[#14595A] text-[#1C1C1A]'
                      }`}
                    />

                    {q.isSystemQuestion && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#14595A]/10 text-[#14595A] flex items-center space-x-1 shrink-0">
                        <Lock className="h-3 w-3" />
                        <span>System Field</span>
                      </span>
                    )}
                  </div>

                  {/* Question Type Selector */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="flex items-center space-x-1.5 h-9 px-2.5 bg-[#FAFAF9] border border-[#E4E4E1] rounded-md text-xs">
                      <Icon className="h-3.5 w-3.5 text-[#14595A]" />
                      <select
                        value={q.type}
                        onChange={e => handleUpdateQuestion(q.id, { type: e.target.value as QuestionType })}
                        disabled={q.isSystemQuestion}
                        className="bg-transparent text-xs font-medium text-[#1C1C1A] focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                      >
                        <option value="short_text">Short Answer</option>
                        <option value="paragraph">Paragraph</option>
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="checkboxes">Checkboxes</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="number">Number</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="date">Date</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Options Manager for Multiple Choice / Checkboxes / Dropdown */}
                {isNeedsOptions && (
                  <div className="p-3 bg-[#FAFAF9] border border-[#E4E4E1] rounded-md space-y-2">
                    <span className="text-[11px] font-bold text-[#6B6B66] block">Answer Options:</span>
                    <div className="space-y-1.5">
                      {(q.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center space-x-2">
                          <span className="h-2 w-2 rounded-full bg-[#14595A]" />
                          <input
                            type="text"
                            value={opt}
                            onChange={e => {
                              const newOpts = [...(q.options || [])];
                              newOpts[optIdx] = e.target.value;
                              handleUpdateQuestion(q.id, { options: newOpts });
                            }}
                            className="flex-1 h-7 px-2 text-xs rounded border border-[#E4E4E1] bg-white focus:outline-none focus:border-[#14595A]"
                          />
                          {(q.options || []).length > 1 && !q.isSystemQuestion && (
                            <button
                              onClick={() => {
                                const newOpts = (q.options || []).filter((_, i) => i !== optIdx);
                                handleUpdateQuestion(q.id, { options: newOpts });
                              }}
                              className="h-7 w-7 text-[#6B6B66] hover:text-[#B0413E] flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {!q.isSystemQuestion && (
                      <button
                        onClick={() => {
                          const newOpts = [...(q.options || []), `Option ${(q.options || []).length + 1}`];
                          handleUpdateQuestion(q.id, { options: newOpts });
                        }}
                        className="text-xs font-semibold text-[#14595A] hover:underline flex items-center space-x-1 pt-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Option</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Footer Controls: Required toggle, Duplicate, Delete, Reorder */}
                <div className="flex items-center justify-between pt-2 border-t border-[#E4E4E1] text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer font-medium text-[#1C1C1A]">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={e => handleUpdateQuestion(q.id, { required: e.target.checked })}
                      disabled={q.isSystemQuestion}
                      className="rounded text-[#14595A] focus:ring-[#14595A]"
                    />
                    <span>Required Field</span>
                  </label>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleMoveQuestion(idx, 'up')}
                      disabled={idx === 0}
                      className="h-7 w-7 flex items-center justify-center text-[#6B6B66] hover:bg-[#FAFAF9] disabled:opacity-30 rounded cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveQuestion(idx, 'down')}
                      disabled={idx === questions.length - 1}
                      className="h-7 w-7 flex items-center justify-center text-[#6B6B66] hover:bg-[#FAFAF9] disabled:opacity-30 rounded cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>

                    {!q.isSystemQuestion && (
                      <>
                        <button
                          onClick={() => handleDuplicateQuestion(q)}
                          className="h-7 w-7 flex items-center justify-center text-[#6B6B66] hover:text-[#14595A] hover:bg-[#FAFAF9] rounded cursor-pointer"
                          title="Duplicate Question"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="h-7 w-7 flex items-center justify-center text-[#6B6B66] hover:text-[#B0413E] hover:bg-[#FAFAF9] rounded cursor-pointer"
                          title="Delete Question"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Question Bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-[#E4E4E1] rounded-lg shadow-2xs">
        <span className="text-xs font-bold text-[#1C1C1A] mr-2">Add Question:</span>
        <button
          onClick={() => handleAddQuestion('short_text')}
          className="px-2.5 h-8 bg-[#FAFAF9] border border-[#E4E4E1] text-[#1C1C1A] text-xs font-medium rounded hover:bg-[#EBF4F4] hover:text-[#14595A] transition-colors cursor-pointer"
        >
          Short Answer
        </button>
        <button
          onClick={() => handleAddQuestion('paragraph')}
          className="px-2.5 h-8 bg-[#FAFAF9] border border-[#E4E4E1] text-[#1C1C1A] text-xs font-medium rounded hover:bg-[#EBF4F4] hover:text-[#14595A] transition-colors cursor-pointer"
        >
          Paragraph
        </button>
        <button
          onClick={() => handleAddQuestion('multiple_choice')}
          className="px-2.5 h-8 bg-[#FAFAF9] border border-[#E4E4E1] text-[#1C1C1A] text-xs font-medium rounded hover:bg-[#EBF4F4] hover:text-[#14595A] transition-colors cursor-pointer"
        >
          Multiple Choice
        </button>
        <button
          onClick={() => handleAddQuestion('checkboxes')}
          className="px-2.5 h-8 bg-[#FAFAF9] border border-[#E4E4E1] text-[#1C1C1A] text-xs font-medium rounded hover:bg-[#EBF4F4] hover:text-[#14595A] transition-colors cursor-pointer"
        >
          Checkboxes
        </button>
        <button
          onClick={() => handleAddQuestion('dropdown')}
          className="px-2.5 h-8 bg-[#FAFAF9] border border-[#E4E4E1] text-[#1C1C1A] text-xs font-medium rounded hover:bg-[#EBF4F4] hover:text-[#14595A] transition-colors cursor-pointer"
        >
          Dropdown
        </button>
      </div>

      {/* Live Form Preview Drawer Modal */}
      <FormPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        event={activeEvent}
        questions={questions}
      />

      {/* Smart AI Form Generator Modal */}
      <AIFormGeneratorModal
        isOpen={isAIGeneratorOpen}
        onClose={() => setIsAIGeneratorOpen(false)}
        eventId={targetEventId}
        onApplyQuestions={generated => {
          saveQuestions(generated);
        }}
      />
    </div>
  );
};
