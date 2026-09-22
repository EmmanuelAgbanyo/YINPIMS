import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../context/AppContext';
import { getPassUrl } from '../../utils/qrUtils';
import type { Participant, Registration, Event } from '../../types';
import {
  X,
  Printer,
  ShieldCheck,
  Bed,
  CheckSquare,
  Square,
  Search,
  Filter,
  Users,
  Scissors,
} from 'lucide-react';

interface BatchBadgePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEventId?: string;
}

export const BatchBadgePrintModal: React.FC<BatchBadgePrintModalProps> = ({
  isOpen,
  onClose,
  initialEventId,
}) => {
  const { data, selectedEventId } = useApp();

  // Track modal open state on body to isolate during printing
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('batch-badge-modal-active');
      return () => {
        document.body.classList.remove('batch-badge-modal-active');
      };
    }
  }, [isOpen]);

  const effectiveEventId = initialEventId || (selectedEventId !== 'all' ? selectedEventId : 'all');

  const [filterEvent, setFilterEvent] = useState<string>(effectiveEventId);
  const [filterStatus, setFilterStatus] = useState<string>('Confirmed');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRegIds, setSelectedRegIds] = useState<Set<string>>(new Set());

  // Filter registrations based on selected controls
  const filteredItems = useMemo(() => {
    return data.registrations
      .map(reg => {
        const participant = data.participants.find(p => p.id === reg.participantId);
        const event = data.events.find(e => e.id === reg.eventId);
        const room = reg.roomAssignmentId ? data.rooms.find(r => r.id === reg.roomAssignmentId) : null;
        return { reg, participant, event, room };
      })
      .filter((item): item is { reg: Registration; participant: Participant; event: Event; room: ReturnType<typeof data.rooms.find> | null } => {
        if (!item.participant || !item.event) return false;

        // Filter by Event
        if (filterEvent !== 'all' && item.reg.eventId !== filterEvent) {
          return false;
        }

        // Filter by Registration / Attendance Status
        if (filterStatus === 'Confirmed' && item.reg.status !== 'Confirmed') return false;
        if (filterStatus === 'Checked In' && item.reg.checkInStatus !== 'Checked In') return false;
        if (filterStatus === 'Waitlisted' && item.reg.status !== 'Waitlisted') return false;

        // Filter by Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nameMatch = item.participant.fullName.toLowerCase().includes(q);
          const emailMatch = item.participant.email.toLowerCase().includes(q);
          const orgMatch = item.participant.organization?.toLowerCase().includes(q) || false;
          const regIdMatch = item.reg.id.toLowerCase().includes(q);
          if (!nameMatch && !emailMatch && !orgMatch && !regIdMatch) return false;
        }

        return true;
      });
  }, [data, filterEvent, filterStatus, searchQuery]);

  // Auto initialize selectedRegIds when filteredItems change initially or when Select All clicked
  const isAllSelected = filteredItems.length > 0 && filteredItems.every(i => selectedRegIds.has(i.reg.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRegIds(new Set());
    } else {
      setSelectedRegIds(new Set(filteredItems.map(i => i.reg.id)));
    }
  };

  const handleToggleSingle = (id: string) => {
    const next = new Set(selectedRegIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRegIds(next);
  };

  // Get array of items that are selected for printing
  const itemsToPrint = useMemo(() => {
    // If no checkboxes selected, default to printing all filtered items
    if (selectedRegIds.size === 0) {
      return filteredItems;
    }
    return filteredItems.filter(item => selectedRegIds.has(item.reg.id));
  }, [filteredItems, selectedRegIds]);

  // Chunk items to print into groups of 4 (4 badges per A4 page)
  const a4Pages = useMemo(() => {
    const pages: typeof itemsToPrint[] = [];
    for (let i = 0; i < itemsToPrint.length; i += 4) {
      pages.push(itemsToPrint.slice(i, i + 4));
    }
    return pages;
  }, [itemsToPrint]);

  if (!isOpen) return null;

  const handleTriggerPrint = () => {
    window.print();
  };

  return createPortal(
    <div className="batch-print-portal batch-print-modal-root fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-xs overflow-hidden">
      {/* Dynamic CSS for Print Layout */}
      <style>{`
        @media print {
          /* Complete isolation: hide all elements attached to body except our print portal */
          body > *:not(.batch-print-portal) {
            display: none !important;
            visibility: hidden !important;
          }

          body.batch-badge-modal-active > #root {
            display: none !important;
          }

          @page {
            size: A4 portrait;
            margin: 6mm 6mm;
          }

          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          html, body {
            background: #FFFFFF !important;
            background-color: #FFFFFF !important;
            color: #000000 !important;
            font-family: system-ui, -apple-system, sans-serif !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }

          /* Force all modal wrappers, backdrops, and containers to pure white */
          .batch-print-portal,
          .batch-print-modal-root,
          .batch-print-workspace,
          .print-container {
            display: block !important;
            position: static !important;
            inset: auto !important;
            background: #FFFFFF !important;
            background-color: #FFFFFF !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          /* Hide all UI elements except printable pages */
          .no-print {
            display: none !important;
          }

          /* Page wrapper for strict A4 pagination without bleed or split */
          .a4-page-wrapper {
            display: block !important;
            width: 198mm !important;
            max-width: 198mm !important;
            height: 278mm !important;
            max-height: 278mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            page-break-before: auto !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            background: #FFFFFF !important;
            background-color: #FFFFFF !important;
          }

          .a4-page-wrapper:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          /* Exactly 1 A4 printable grid per sheet: 2x2 layout */
          .a4-print-page {
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 2mm !important;
            box-sizing: border-box !important;
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            grid-template-rows: repeat(2, 1fr) !important;
            gap: 4mm !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #FFFFFF !important;
            background-color: #FFFFFF !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }

          /* Remove shadows and rounded outer gaps during physical printing */
          .badge-print-card {
            box-shadow: none !important;
            border: 1px dashed #A3A39E !important;
            border-radius: 6px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #FFFFFF !important;
            background-color: #FFFFFF !important;
            height: 100% !important;
            max-height: 135mm !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
            padding: 6px 8px !important;
          }

          .empty-badge-cell {
            border: 1px dashed #E4E4E1 !important;
            background: #FFFFFF !important;
            opacity: 0.2 !important;
          }
        }
      `}</style>

      {/* Screen Control Top Bar (Hidden during window.print) */}
      <div className="no-print bg-[#1C1C1A] text-white px-6 py-4 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-lg z-10">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-lg bg-[#14595A] text-white flex items-center justify-center font-bold">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold font-heading text-white flex items-center space-x-2">
              <span>Batch Participant Badge Printer</span>
              <span className="text-xs bg-[#14595A] px-2 py-0.5 rounded-full font-mono">
                A4 Layout (4 per page)
              </span>
            </h2>
            <p className="text-xs text-[#A3A39E]">
              Print delegate badges arranged in a 2x2 grid with cutting guides.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="text-right text-xs text-[#D5D5D1] hidden lg:block">
            <div>
              Total Selected: <span className="font-bold text-white">{itemsToPrint.length} Badges</span>
            </div>
            <div className="text-[11px] text-[#A3A39E]">
              Requires <span className="font-bold text-[#EBF4F4]">{a4Pages.length} A4 Sheet(s)</span>
            </div>
          </div>

          <button
            onClick={handleTriggerPrint}
            disabled={itemsToPrint.length === 0}
            className="flex items-center space-x-2 px-4 h-9 bg-[#14595A] hover:bg-[#0E4243] text-white text-xs font-bold rounded-md shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print Badges ({a4Pages.length} A4 Page{a4Pages.length !== 1 ? 's' : ''})</span>
          </button>

          <button
            onClick={onClose}
            className="h-9 w-9 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Screen Workspace Area */}
      <div className="batch-print-workspace flex-1 flex flex-col md:flex-row overflow-hidden bg-[#2D2D2A]">
        {/* Left Filter & Selection Sidebar (Hidden in print) */}
        <div className="no-print w-full md:w-80 bg-[#1C1C1A] border-r border-white/10 p-4 overflow-y-auto space-y-4 text-xs text-white shrink-0">
          <div className="font-bold text-xs uppercase tracking-wider text-[#A3A39E] flex items-center space-x-1.5 pb-2 border-b border-white/10">
            <Filter className="h-3.5 w-3.5 text-[#14595A]" />
            <span>Filter Participants</span>
          </div>

          {/* Event Filter */}
          <div className="space-y-1">
            <label className="text-[11px] text-[#D5D5D1] font-semibold">Select Event</label>
            <select
              value={filterEvent}
              onChange={e => setFilterEvent(e.target.value)}
              className="w-full h-8 px-2.5 bg-[#2D2D2A] border border-white/20 rounded text-xs text-white focus:outline-none focus:border-[#14595A] cursor-pointer"
            >
              <option value="all">All Events ({data.registrations.length} registrations)</option>
              {data.events.map(evt => (
                <option key={evt.id} value={evt.id}>
                  {evt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[11px] text-[#D5D5D1] font-semibold">Status Filter</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full h-8 px-2.5 bg-[#2D2D2A] border border-white/20 rounded text-xs text-white focus:outline-none focus:border-[#14595A] cursor-pointer"
            >
              <option value="Confirmed">Confirmed Registrations</option>
              <option value="Checked In">Checked-In Only</option>
              <option value="Waitlisted">Waitlisted Queue</option>
              <option value="all">All Statuses</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="space-y-1">
            <label className="text-[11px] text-[#D5D5D1] font-semibold">Search Delegate</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#A3A39E]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Name, org, or registration ID..."
                className="w-full h-8 pl-8 pr-2.5 bg-[#2D2D2A] border border-white/20 rounded text-xs text-white placeholder-[#A3A39E] focus:outline-none focus:border-[#14595A]"
              />
            </div>
          </div>

          {/* Selection List */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-[#D5D5D1]">
                Matching Delegates ({filteredItems.length})
              </span>
              <button
                onClick={handleToggleSelectAll}
                className="text-[11px] text-[#14595A] hover:underline font-bold flex items-center space-x-1 cursor-pointer"
              >
                {isAllSelected ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
              </button>
            </div>

            <div className="max-h-64 md:max-h-96 overflow-y-auto space-y-1 pr-1">
              {filteredItems.map(item => {
                const isSelected = selectedRegIds.has(item.reg.id) || selectedRegIds.size === 0;
                return (
                  <label
                    key={item.reg.id}
                    className={`flex items-center space-x-2.5 p-2 rounded cursor-pointer border transition-colors ${
                      isSelected
                        ? 'bg-[#14595A]/20 border-[#14595A]'
                        : 'bg-[#2D2D2A] border-transparent hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRegIds.has(item.reg.id)}
                      onChange={() => handleToggleSingle(item.reg.id)}
                      className="accent-[#14595A] rounded cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs text-white truncate">
                        {item.participant.fullName}
                      </div>
                      <div className="text-[10px] text-[#A3A39E] truncate">
                        {item.participant.organization || item.event.name}
                      </div>
                    </div>
                  </label>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="text-center py-6 text-[11px] text-[#A3A39E]">
                  No matching participants found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Print Preview Viewport */}
        <div className="print-container flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center space-y-8">
          {/* Header Banner for screen view */}
          <div className="no-print bg-[#1C1C1A] border border-white/10 rounded-lg p-3 text-xs text-[#D5D5D1] max-w-4xl w-full flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Scissors className="h-4 w-4 text-[#14595A]" />
              <span>
                <strong>A4 Paper Preview:</strong> Showing {a4Pages.length} sheet(s) formatted with 4 badges per page.
              </span>
            </div>
            <span className="text-[11px] text-[#A3A39E]">
              Tip: Standard cut lines are rendered around each badge card.
            </span>
          </div>

          {a4Pages.length > 0 ? (
            a4Pages.map((pageItems, pageIdx) => (
              <div key={pageIdx} className="a4-page-wrapper flex flex-col items-center space-y-2 print:space-y-0">
                {/* Page Indicator for screen preview */}
                <div className="no-print text-xs font-mono text-[#A3A39E] self-start font-semibold flex items-center space-x-2">
                  <span className="bg-white/10 px-2 py-0.5 rounded text-white">
                    Sheet Page {pageIdx + 1} of {a4Pages.length}
                  </span>
                  <span>({pageItems.length} Badges on this page)</span>
                </div>

                {/* A4 Sheet Paper Mockup Container */}
                <div className="a4-print-page bg-white border border-[#E4E4E1] shadow-2xl rounded-sm p-4 w-[210mm] max-w-full grid grid-cols-2 grid-rows-2 gap-4 box-sizing-border font-body text-[#1C1C1A]">
                  {pageItems.map(({ reg, participant, event, room }) => (
                    <div
                      key={reg.id}
                      className="badge-print-card bg-white border-2 border-dashed border-[#D5D5D1] rounded-lg overflow-hidden flex flex-col justify-between relative p-3 transition-shadow hover:border-[#14595A]"
                    >
                      {/* Cut corners guide markings */}
                      <div className="absolute top-1 left-1 text-[8px] text-[#A3A39E] flex items-center space-x-0.5 no-print">
                        <Scissors className="h-2.5 w-2.5" />
                        <span>Cut</span>
                      </div>

                      {/* Badge Top Header */}
                      <div className="bg-[#14595A] text-white p-2 rounded-md text-center space-y-0.5" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        <div className="flex items-center justify-center space-x-1 text-[8px] font-bold uppercase tracking-wider text-white/80">
                          <ShieldCheck className="h-2.5 w-2.5" />
                          <span>Official Pass</span>
                        </div>
                        <h3 className="font-heading font-bold text-[11px] leading-tight text-white line-clamp-1 px-1">
                          {event.name}
                        </h3>
                      </div>

                      {/* Prominent Badge Title Category Banner */}
                      <div 
                        className={`w-full py-1 text-center text-[9px] font-extrabold font-heading tracking-widest uppercase shadow-2xs ${
                          reg.badgeType === 'Speaker' ? 'bg-amber-600 text-white' :
                          reg.badgeType === 'Contestant' ? 'bg-purple-600 text-white' :
                          reg.badgeType === 'Volunteer' ? 'bg-emerald-600 text-white' :
                          reg.badgeType === 'Staff' ? 'bg-[#14595A] text-white' : 'bg-slate-800 text-white'
                        }`}
                        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                      >
                        ★ {reg.badgeType || participant.badgeType || 'DELEGATE'} ★
                      </div>

                      {/* Badge Main Body */}
                      <div className="py-2 px-1 text-center flex-1 flex flex-col items-center justify-center space-y-1.5">
                        <div>
                          <h2 className="font-heading font-bold text-sm text-[#1C1C1A] tracking-tight leading-snug">
                            {participant.fullName}
                          </h2>
                          {participant.organization && (
                            <p className="text-[10px] font-semibold text-[#14595A] mt-0.5 line-clamp-1">
                              {participant.organization}
                            </p>
                          )}
                          {participant.jobTitle && (
                            <p className="text-[9px] text-[#6B6B66] line-clamp-1">
                              {participant.jobTitle}
                            </p>
                          )}
                        </div>

                        {/* QR Code Centerpiece */}
                        <div className="bg-[#FAFAF9] p-2 rounded-md border border-[#E4E4E1] inline-block shadow-2xs" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          <QRCodeSVG
                            value={getPassUrl(reg.qrIdentifier)}
                            size={110}
                            level="H"
                            includeMargin={false}
                          />
                        </div>

                        {/* Registration ID & Room details */}
                        <div className="space-y-0.5">
                          <div className="text-[9px] font-bold text-[#6B6B66] uppercase tracking-wider">
                            Pass ID: <span className="font-mono text-[#1C1C1A]">{reg.id}</span>
                          </div>

                          {room && (
                            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#EBF4F4] text-[#14595A] text-[10px] font-bold" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                              <Bed className="h-3 w-3" />
                              <span>Room: {room.roomNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Badge Footer */}
                      <div className="bg-[#FAFAF9] px-2.5 py-1 rounded border-t border-[#E4E4E1] flex items-center justify-between text-[9px] text-[#6B6B66]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        <span>YIN-PIMS System</span>
                        <span className="font-bold text-[#2F7D4F] uppercase tracking-wider text-[8px]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          {reg.checkInStatus === 'Checked In' ? 'Checked In' : 'VERIFIED'}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Fill empty grid cells if less than 4 items on last page */}
                  {Array.from({ length: 4 - pageItems.length }).map((_, emptyIdx) => (
                    <div
                      key={`empty-${emptyIdx}`}
                      className="empty-badge-cell border border-dashed border-[#E4E4E1] rounded-lg p-4 flex flex-col items-center justify-center text-center text-xs text-[#A3A39E] bg-[#FAFAF9]/40 print:bg-white print:border-dashed print:border-[#E4E4E1]"
                    >
                      <div className="no-print flex flex-col items-center">
                        <Scissors className="h-4 w-4 mb-1 opacity-40" />
                        <span>Empty Badge Cell</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="no-print bg-[#1C1C1A] border border-white/10 rounded-xl p-12 text-center text-white space-y-3 max-w-md">
              <Users className="h-10 w-10 text-[#A3A39E] mx-auto" />
              <h3 className="font-bold text-sm">No Delegates Selected</h3>
              <p className="text-xs text-[#A3A39E]">
                Select delegates from the left filter sidebar to preview and generate printable A4 badge sheets.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
