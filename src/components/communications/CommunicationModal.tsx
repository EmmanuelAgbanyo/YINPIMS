import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { X, Send, Mail, MessageSquare, CheckCircle2, ShieldAlert } from 'lucide-react';

interface CommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEventId?: string;
}

export const CommunicationModal: React.FC<CommunicationModalProps> = ({
  isOpen,
  onClose,
  initialEventId,
}) => {
  const { data, refreshData } = useApp();

  const [eventId, setEventId] = useState<string>(
    initialEventId || data.events[0]?.id || ''
  );
  const [channel, setChannel] = useState<'Email' | 'SMS'>('Email');
  const [msgType, setMsgType] = useState<'Confirmation' | 'Reminder'>('Reminder');
  const [timing, setTiming] = useState('24h_before');
  const [subject, setSubject] = useState('Event Reminder: Global Youth Innovation Summit 2026');
  const [messageBody, setMessageBody] = useState(
    'Dear Participant,\n\nThis is a friendly reminder that your event begins tomorrow. Please have your Digital QR Badge ready for check-in.\n\nBest regards,\nEvent Operations Team'
  );

  const [sentNotice, setSentNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const event = data.events.find(e => e.id === eventId);
  const eventRegs = data.registrations.filter(r => r.eventId === eventId && r.status === 'Confirmed');

  const handleSendDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || eventRegs.length === 0) return;

    let count = 0;
    eventRegs.forEach(reg => {
      const p = data.participants.find(part => part.id === reg.participantId);
      if (p) {
        db.addLog({
          eventId: event.id,
          participantId: p.id,
          participantName: p.fullName,
          participantEmail: p.email,
          type: msgType,
          channel,
          status: 'Simulated',
          subject: channel === 'Email' ? subject : 'SMS Notification',
          content: messageBody,
        });
        count++;
      }
    });

    refreshData();
    setSentNotice(`Successfully logged simulated ${channel} dispatch to ${count} confirmed participant(s).`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 overflow-y-auto">
      <div className="bg-white border border-[#E4E4E1] rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E1]">
          <div>
            <h2 className="text-base font-bold text-[#1C1C1A] font-heading">
              Dispatch Communications & Reminders
            </h2>
            <p className="text-xs text-[#6B6B66]">Configure and trigger automated emails or SMS updates.</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 text-[#6B6B66] hover:bg-[#FAFAF9] rounded flex items-center justify-center cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSendDispatch} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Integration Transparency Banner */}
          <div className="p-3 bg-[#FDF9F0] border border-[#C17F16]/30 rounded-md flex items-start space-x-2.5 text-xs text-[#1C1C1A]">
            <ShieldAlert className="h-4 w-4 text-[#C17F16] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#C17F16]">Integration Transparency Status: Simulated Mode</div>
              <p className="text-[#6B6B66] text-[11px] mt-0.5 leading-relaxed">
                External SMTP Server and Twilio SMS Gateway API credentials are not yet connected. Dispatches will be logged cleanly to simulated application history.
              </p>
            </div>
          </div>

          {sentNotice && (
            <div className="p-3 bg-[#F0F9F3] border border-[#2F7D4F]/30 rounded-md text-xs font-semibold text-[#2F7D4F] flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>{sentNotice}</span>
            </div>
          )}

          {/* Target Event */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Target Event</label>
            <select
              value={eventId}
              onChange={e => setEventId(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-white text-[#1C1C1A] focus:outline-none focus:border-[#14595A] cursor-pointer"
            >
              {data.events.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name} ({data.registrations.filter(r => r.eventId === e.id && r.status === 'Confirmed').length} Confirmed)
                </option>
              ))}
            </select>
          </div>

          {/* Channel & Message Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Channel</label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setChannel('Email')}
                  className={`flex-1 h-9 flex items-center justify-center space-x-1 text-xs font-medium rounded border cursor-pointer ${
                    channel === 'Email' ? 'bg-[#14595A] text-white border-[#14595A]' : 'bg-white text-[#1C1C1A] border-[#E4E4E1]'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('SMS')}
                  className={`flex-1 h-9 flex items-center justify-center space-x-1 text-xs font-medium rounded border cursor-pointer ${
                    channel === 'SMS' ? 'bg-[#14595A] text-white border-[#14595A]' : 'bg-white text-[#1C1C1A] border-[#E4E4E1]'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>SMS</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Message Type</label>
              <select
                value={msgType}
                onChange={e => setMsgType(e.target.value as any)}
                className="w-full h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-white focus:outline-none cursor-pointer"
              >
                <option value="Reminder">Event Reminder</option>
                <option value="Confirmation">Registration Confirmation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Timing Schedule</label>
              <select
                value={timing}
                onChange={e => setTiming(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-white focus:outline-none cursor-pointer"
              >
                <option value="now">Send Immediately</option>
                <option value="24h_before">24 Hours Before Event</option>
                <option value="2h_before">2 Hours Before Event</option>
              </select>
            </div>
          </div>

          {channel === 'Email' && (
            <div>
              <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Email Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-white focus:outline-none focus:border-[#14595A]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Message Content Template</label>
            <textarea
              rows={4}
              value={messageBody}
              onChange={e => setMessageBody(e.target.value)}
              className="w-full p-2.5 text-xs rounded-md border border-[#E4E4E1] bg-white focus:outline-none focus:border-[#14595A]"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E4E4E1]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-9 text-xs font-medium text-[#1C1C1A] bg-white border border-[#E4E4E1] rounded-md hover:bg-[#FAFAF9] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-4 h-9 text-xs font-medium text-white bg-[#14595A] rounded-md hover:bg-[#0E4243] cursor-pointer shadow-2xs"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Trigger Dispatch ({eventRegs.length} Delegates)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
