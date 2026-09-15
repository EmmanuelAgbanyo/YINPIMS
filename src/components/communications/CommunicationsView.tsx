import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Send, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { CommunicationModal } from './CommunicationModal';

interface CommunicationsViewProps {
  filterEventId?: string;
}

export const CommunicationsView: React.FC<CommunicationsViewProps> = ({ filterEventId }) => {
  const { data, selectedEventId } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const effectiveEventId = filterEventId || selectedEventId;

  const logs = effectiveEventId === 'all'
    ? data.logs
    : data.logs.filter(l => l.eventId === effectiveEventId);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E4E1]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1A] tracking-tight">
            Communications & Dispatch Logs
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B66] mt-0.5">
            Audit automatic registration confirmations, event reminders, and notification history.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 h-9 px-3.5 bg-[#14595A] text-white text-xs font-medium rounded-md hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer shrink-0"
        >
          <Send className="h-4 w-4" />
          <span>Dispatch Reminder / Message</span>
        </button>
      </div>

      {/* Integration Transparency Banner */}
      <div className="p-4 bg-[#FDF9F0] border border-[#C17F16]/30 rounded-lg flex items-start space-x-3 text-xs text-[#1C1C1A]">
        <ShieldAlert className="h-5 w-5 text-[#C17F16] shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-[#C17F16] text-sm">Integration Transparency Banner</div>
          <p className="text-[#6B6B66] mt-0.5 leading-relaxed">
            Actual SMTP Email Gateway and Twilio SMS API credentials are not currently configured. Dispatches are safely processed in <strong>Simulated Delivery Mode</strong> and logged to the central history table below.
          </p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-[#E4E4E1] rounded-lg shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E4E4E1] flex items-center justify-between">
          <span className="font-bold text-xs text-[#1C1C1A]">Dispatch History ({logs.length} entries)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAF9] border-b border-[#E4E4E1] text-[#6B6B66] font-bold text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Recipient</th>
                <th className="py-2.5 px-4">Channel & Type</th>
                <th className="py-2.5 px-4">Subject</th>
                <th className="py-2.5 px-4">Delivery Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E1]">
              {logs.length > 0 ? (
                logs.map(log => {
                  const event = data.events.find(e => e.id === log.eventId);

                  return (
                    <tr key={log.id} className="hover:bg-[#FAFAF9] transition-colors">
                      <td className="py-3 px-4 text-[#6B6B66] whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleString()}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1C1C1A]">{log.participantName}</div>
                        <div className="text-[11px] text-[#6B6B66]">{log.participantEmail}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#14595A]">
                          {log.channel} • {log.type}
                        </span>
                        <div className="text-[10px] text-[#6B6B66] truncate max-w-[120px]">{event?.name}</div>
                      </td>

                      <td className="py-3 px-4 text-[#1C1C1A] max-w-xs truncate" title={log.subject}>
                        {log.subject}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F0F9F3] text-[#2F7D4F] inline-flex items-center space-x-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{log.status}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-[#6B6B66]">
                    No communication dispatches recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CommunicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
