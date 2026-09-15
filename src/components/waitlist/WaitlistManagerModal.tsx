import React from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import type { Event, Registration } from '../../types';
import { X, Clock, ArrowUpCircle, Trash2 } from 'lucide-react';

interface WaitlistManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
}

export const WaitlistManagerModal: React.FC<WaitlistManagerModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const { data, refreshData } = useApp();

  if (!isOpen) return null;

  const waitlistRegs = data.registrations
    .filter(r => r.eventId === event.id && r.status === 'Waitlisted')
    .sort((a, b) => (a.waitlistPosition || 999) - (b.waitlistPosition || 999));

  const handleManualPromote = (reg: Registration) => {
    db.updateData(prev => {
      const allRegs = [...prev.registrations];
      const targetIdx = allRegs.findIndex((r: Registration) => r.id === reg.id);
      if (targetIdx !== -1) {
        allRegs[targetIdx] = {
          ...allRegs[targetIdx],
          status: 'Confirmed',
          waitlistPosition: undefined,
        };

        // Re-order positions
        let pos = 1;
        allRegs.forEach((r: Registration, idx: number) => {
          if (r.eventId === event.id && r.status === 'Waitlisted' && r.id !== reg.id) {
            allRegs[idx] = { ...allRegs[idx], waitlistPosition: pos++ };
          }
        });
      }
      return { ...prev, registrations: allRegs };
    });
    refreshData();
  };

  const handleCancelRegistration = (regId: string) => {
    db.cancelRegistration(regId);
    refreshData();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 overflow-y-auto">
      <div className="bg-white border border-[#E4E4E1] rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E1]">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-[#1C1C1A] font-heading">
                Waitlist Management
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#C17F16]/10 text-[#C17F16]">
                {event.name}
              </span>
            </div>
            <p className="text-xs text-[#6B6B66]">View queue positions and manage delegate promotions.</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 text-[#6B6B66] hover:bg-[#FAFAF9] rounded flex items-center justify-center cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {waitlistRegs.length > 0 ? (
            <div className="space-y-2">
              {waitlistRegs.map((reg, idx) => {
                const p = data.participants.find(part => part.id === reg.participantId);
                if (!p) return null;

                return (
                  <div
                    key={reg.id}
                    className="p-3 bg-[#FAFAF9] border border-[#E4E4E1] rounded-md flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="h-7 w-7 rounded-full bg-[#C17F16]/10 text-[#C17F16] font-bold text-xs flex items-center justify-center shrink-0">
                        #{reg.waitlistPosition || idx + 1}
                      </span>

                      <div>
                        <div className="font-bold text-[#1C1C1A]">{p.fullName}</div>
                        <div className="text-[11px] text-[#6B6B66]">{p.email} • {p.phone}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleManualPromote(reg)}
                        className="flex items-center space-x-1 h-7 px-2.5 bg-[#14595A] text-white text-xs font-semibold rounded hover:bg-[#0E4243] cursor-pointer"
                      >
                        <ArrowUpCircle className="h-3.5 w-3.5" />
                        <span>Promote</span>
                      </button>

                      <button
                        onClick={() => handleCancelRegistration(reg.id)}
                        className="h-7 w-7 text-[#6B6B66] hover:text-[#B0413E] flex items-center justify-center cursor-pointer"
                        title="Remove from waitlist"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#6B6B66] space-y-2">
              <Clock className="h-8 w-8 text-[#6B6B66] mx-auto" />
              <div className="font-bold text-[#1C1C1A]">No Waitlisted Delegates</div>
              <p>All current registrations for this event are confirmed.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E4E4E1] bg-[#FAFAF9] rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-4 h-8 bg-white border border-[#E4E4E1] text-xs font-medium text-[#1C1C1A] rounded-md hover:bg-[#FAFAF9] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
