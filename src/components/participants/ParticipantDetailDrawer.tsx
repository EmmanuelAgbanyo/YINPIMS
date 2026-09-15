import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import type { Participant, Registration } from '../../types';
import { X, Mail, Phone, Building, QrCode, Bed } from 'lucide-react';
import { ParticipantBadgeModal } from '../badge/ParticipantBadgeModal';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface ParticipantDetailDrawerProps {
  participant: Participant | null;
  onClose: () => void;
}

export const ParticipantDetailDrawer: React.FC<ParticipantDetailDrawerProps> = ({
  participant,
  onClose,
}) => {
  const { data, refreshData } = useApp();

  const [activeBadgeReg, setActiveBadgeReg] = useState<Registration | null>(null);
  const [cancellingRegId, setCancellingRegId] = useState<string | null>(null);

  if (!participant) return null;

  const registrations = data.registrations.filter(r => r.participantId === participant.id);

  const handleCancelConfirm = () => {
    if (!cancellingRegId) return;
    db.cancelRegistration(cancellingRegId);
    refreshData();
    setCancellingRegId(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/30 backdrop-blur-2xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-[#E4E4E1] transform transition-transform">
        {/* Drawer Header */}
        <div className="p-6 border-b border-[#E4E4E1] flex items-center justify-between bg-[#FAFAF9]">
          <div>
            <h2 className="text-base font-bold text-[#1C1C1A] font-heading">
              Participant Profile
            </h2>
            <p className="text-xs text-[#6B6B66]">ID: <code className="tabular-nums font-mono">{participant.id}</code></p>
          </div>
          <button onClick={onClose} className="h-8 w-8 text-[#6B6B66] hover:bg-white rounded flex items-center justify-center cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Profile Overview */}
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-bold text-[#1C1C1A] font-heading">{participant.fullName}</h3>
              {participant.jobTitle && <p className="text-xs text-[#6B6B66] font-medium">{participant.jobTitle}</p>}
            </div>

            <div className="space-y-2 text-xs text-[#6B6B66]">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-[#14595A]" />
                <span className="text-[#1C1C1A] font-medium">{participant.email}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-[#14595A]" />
                <span className="text-[#1C1C1A]">{participant.phone}</span>
              </div>

              {participant.organization && (
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-[#14595A]" />
                  <span className="text-[#1C1C1A]">{participant.organization}</span>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAFAF9] text-[#6B6B66] border border-[#E4E4E1]">
                  Gender: {participant.gender}
                </span>
              </div>
            </div>
          </div>

          {/* Event Registration History */}
          <div className="space-y-3 pt-4 border-t border-[#E4E4E1]">
            <h4 className="text-xs font-bold text-[#1C1C1A] uppercase tracking-wider">
              Event Participation History ({registrations.length})
            </h4>

            <div className="space-y-3">
              {registrations.map(reg => {
                const event = data.events.find(e => e.id === reg.eventId);
                if (!event) return null;

                const room = reg.roomAssignmentId
                  ? data.rooms.find(r => r.id === reg.roomAssignmentId)
                  : null;

                return (
                  <div key={reg.id} className="p-3 bg-[#FAFAF9] rounded-lg border border-[#E4E4E1] space-y-2 text-xs">
                    <div className="flex items-start justify-between">
                      <span className="font-bold text-[#1C1C1A]">{event.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        reg.status === 'Confirmed'
                          ? 'bg-[#F0F9F3] text-[#2F7D4F]'
                          : reg.status === 'Waitlisted'
                          ? 'bg-[#FDF9F0] text-[#C17F16]'
                          : 'bg-[#FDF2F2] text-[#B0413E]'
                      }`}>
                        {reg.status} {reg.waitlistPosition ? `#${reg.waitlistPosition}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#6B6B66]">
                      <span>Check-In: <strong>{reg.checkInStatus}</strong></span>
                      {reg.checkInTimestamp && (
                        <span>{new Date(reg.checkInTimestamp).toLocaleTimeString()}</span>
                      )}
                    </div>

                    {room && (
                      <div className="flex items-center space-x-1 text-[11px] text-[#14595A] font-semibold">
                        <Bed className="h-3.5 w-3.5" />
                        <span>Room: {room.roomNumber}</span>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between border-t border-[#E4E4E1]/60">
                      {reg.status === 'Confirmed' && (
                        <button
                          onClick={() => setActiveBadgeReg(reg)}
                          className="flex items-center space-x-1 text-[11px] font-bold text-[#14595A] hover:underline cursor-pointer"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          <span>View Digital Badge</span>
                        </button>
                      )}

                      {reg.status !== 'Cancelled' && (
                        <button
                          onClick={() => setCancellingRegId(reg.id)}
                          className="text-[11px] text-[#B0413E] hover:underline font-medium ml-auto cursor-pointer"
                        >
                          Cancel Registration
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Digital Badge Modal */}
        {activeBadgeReg && (
          <ParticipantBadgeModal
            isOpen={!!activeBadgeReg}
            onClose={() => setActiveBadgeReg(null)}
            registration={activeBadgeReg}
            participant={participant}
            event={data.events.find(e => e.id === activeBadgeReg.eventId)!}
          />
        )}

        {/* Cancellation Confirmation */}
        <ConfirmationModal
          isOpen={!!cancellingRegId}
          title="Cancel Registration"
          message="Are you sure you want to cancel this registration? If event capacity is full, the next delegate on the waitlist will be promoted automatically."
          confirmLabel="Cancel Registration"
          onCancel={() => setCancellingRegId(null)}
          onConfirm={handleCancelConfirm}
          isDestructive={true}
        />
      </div>
    </div>
  );
};
