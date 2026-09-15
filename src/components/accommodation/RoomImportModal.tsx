import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { X, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';

interface RoomImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

export const RoomImportModal: React.FC<RoomImportModalProps> = ({
  isOpen,
  onClose,
  eventId,
}) => {
  const { refreshData } = useApp();
  const [inputText, setInputText] = useState(
    'Room 101, 2, Female\nRoom 102, 2, Male\nSuite 201, 4, Female\nExecutive Suite 301, 2, Mixed\nVIP Room 405, 1, Male\nDeluxe Room 501'
  );

  if (!isOpen) return null;

  // Parse text / CSV lines into room objects supporting Room Number, Capacity, and Gender
  const parseLines = () => {
    const lines = inputText.split('\n');
    const parsed: Array<{
      raw: string;
      roomNumber: string;
      capacity: number;
      genderGroup: 'Male' | 'Female' | 'Mixed';
      isValid: boolean;
      error?: string;
    }> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.toLowerCase().startsWith('room,') || trimmed.toLowerCase().startsWith('room number')) continue;

      const parts = trimmed.split(',').map(s => s.trim());
      const roomNumber = parts[0];
      let capacity = 1;
      let genderGroup: 'Male' | 'Female' | 'Mixed' = 'Mixed';
      let isValid = true;
      let error: string | undefined = undefined;

      if (!roomNumber) {
        isValid = false;
        error = 'Missing room number or identifier.';
      }

      // Parse Capacity (2nd part)
      if (parts.length >= 2) {
        const parsedCap = parseInt(parts[1], 10);
        if (isNaN(parsedCap) || parsedCap <= 0) {
          isValid = false;
          error = 'Invalid capacity (must be positive number).';
        } else {
          capacity = parsedCap;
        }
      }

      // Parse Gender (3rd part)
      if (parts.length >= 3) {
        const rawGender = parts[2].toLowerCase();
        if (rawGender.includes('female') || rawGender.includes('women') || rawGender.includes('woman') || rawGender === 'f') {
          genderGroup = 'Female';
        } else if (rawGender.includes('male') || rawGender.includes('men') || rawGender.includes('man') || rawGender === 'm') {
          genderGroup = 'Male';
        } else {
          genderGroup = 'Mixed';
        }
      }

      parsed.push({ raw: trimmed, roomNumber, capacity, genderGroup, isValid, error });
    }

    return parsed;
  };

  const parsedRooms = parseLines();
  const validRooms = parsedRooms.filter(r => r.isValid);

  const handleConfirmImport = () => {
    if (validRooms.length === 0) return;

    db.importRooms(
      eventId,
      validRooms.map(r => ({
        roomNumber: r.roomNumber,
        capacity: r.capacity,
        genderGroup: r.genderGroup,
      }))
    );

    refreshData();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 overflow-y-auto">
      <div className="bg-white border border-[#E4E4E1] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E1]">
          <div>
            <h2 className="text-base font-bold text-[#1C1C1A] font-heading flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5 text-[#14595A]" />
              <span>Smart Room Importer (CSV / Excel / Write-Up)</span>
            </h2>
            <p className="text-xs text-[#6B6B66]">Paste CSV rows, Excel copied text, or plain text write-ups containing Room Name, Capacity, and Gender.</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 text-[#6B6B66] hover:bg-[#FAFAF9] rounded flex items-center justify-center cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Preset Template Snippets */}
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-[#1C1C1A]">Text / CSV Input</label>
            <div className="flex items-center space-x-2">
              <span className="text-[#6B6B66]">Templates:</span>
              <button
                type="button"
                onClick={() => setInputText('Room 101, 2, Female\nRoom 102, 2, Male\nRoom 103, 3, Mixed\nSuite 201, 4, Female')}
                className="text-[11px] font-bold text-[#14595A] hover:underline cursor-pointer"
              >
                Standard Hotel
              </button>
              <button
                type="button"
                onClick={() => setInputText('Dorm A1, 4, Female\nDorm A2, 4, Female\nDorm B1, 6, Male\nDorm B2, 6, Male')}
                className="text-[11px] font-bold text-[#14595A] hover:underline cursor-pointer"
              >
                Dormitory Block
              </button>
            </div>
          </div>

          <div>
            <textarea
              rows={5}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Room 101, 2, Female&#10;Room 102, 2, Male&#10;Suite 201, 4, Mixed"
              className="w-full p-3 text-xs font-mono rounded-md border border-[#E4E4E1] bg-[#FAFAF9] focus:bg-white focus:outline-none focus:border-[#14595A]"
            />
            <div className="p-2 bg-[#FAFAF9] border border-[#E4E4E1] rounded mt-1.5 text-[11px] text-[#6B6B66] space-y-0.5">
              <div><strong>Supported Format:</strong> <code>Room Identifier, Capacity, Gender Group</code></div>
              <div>Examples: <code>Room 101, 2, Female</code> | <code>Suite A, 4, Male</code> | <code>Executive Suite, 1, Mixed</code></div>
            </div>
          </div>

          {/* Parsed Preview Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#1C1C1A]">Validation Preview ({validRooms.length} rooms ready for import)</span>
            </div>

            <div className="border border-[#E4E4E1] rounded-md overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAF9] border-b border-[#E4E4E1] text-[#6B6B66] font-bold text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-3">Room Identifier</th>
                    <th className="py-2 px-3">Capacity</th>
                    <th className="py-2 px-3">Gender Group</th>
                    <th className="py-2 px-3">Validation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E1]">
                  {parsedRooms.map((r, idx) => (
                    <tr key={idx} className={r.isValid ? 'bg-white' : 'bg-[#FDF2F2]'}>
                      <td className="py-2 px-3 font-semibold text-[#1C1C1A]">{r.roomNumber || '—'}</td>
                      <td className="py-2 px-3 tabular-nums font-medium">{r.capacity} bed(s)</td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          r.genderGroup === 'Female'
                            ? 'bg-pink-100 text-pink-700'
                            : r.genderGroup === 'Male'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-[#FAFAF9] text-[#6B6B66] border border-[#E4E4E1]'
                        }`}>
                          {r.genderGroup}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {r.isValid ? (
                          <span className="text-[11px] font-semibold text-[#2F7D4F] flex items-center space-x-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Valid</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-[#B0413E] flex items-center space-x-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>{r.error}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-2 px-6 py-3 border-t border-[#E4E4E1] bg-[#FAFAF9]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 text-xs font-medium text-[#1C1C1A] bg-white border border-[#E4E4E1] rounded-md hover:bg-[#FAFAF9] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={validRooms.length === 0}
            className="px-4 h-9 text-xs font-medium text-white bg-[#14595A] rounded-md hover:bg-[#0E4243] disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
          >
            Import {validRooms.length} Room(s)
          </button>
        </div>
      </div>
    </div>
  );
};
