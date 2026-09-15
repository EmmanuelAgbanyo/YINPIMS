import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Lock } from 'lucide-react';

export const TeamAccessView: React.FC = () => {
  const { data, currentUser } = useApp();

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E4E1]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1A] tracking-tight">
            Team & Access Control Management
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B66] mt-0.5">
            Manage staff accounts, assign events, and enforce security role permissions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded bg-[#14595A]/10 text-[#14595A] flex items-center space-x-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Active Role: {currentUser.role}</span>
          </span>
        </div>
      </div>

      {/* Role Permission Matrix Card */}
      <div className="bg-white p-5 rounded-lg border border-[#E4E4E1] shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-[#1C1C1A] font-heading flex items-center space-x-2">
          <Lock className="h-4 w-4 text-[#14595A]" />
          <span>Role Permission Matrix</span>
        </h2>

        <div className="overflow-x-auto border border-[#E4E4E1] rounded-md">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAF9] border-b border-[#E4E4E1] text-[#6B6B66] font-bold text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-4">Permission Capability</th>
                <th className="py-2.5 px-4 text-center">Full Administrator</th>
                <th className="py-2.5 px-4 text-center">Event Coordinator</th>
                <th className="py-2.5 px-4 text-center">Check-In Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E1]">
              <tr>
                <td className="py-2.5 px-4 font-semibold text-[#1C1C1A]">Manage Organization & Staff Accounts</td>
                <td className="py-2.5 px-4 text-center font-bold text-[#2F7D4F]">✓ Full Access</td>
                <td className="py-2.5 px-4 text-center text-[#B0413E]">✕ Restricted</td>
                <td className="py-2.5 px-4 text-center text-[#B0413E]">✕ Restricted</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-[#1C1C1A]">Create & Delete Events</td>
                <td className="py-2.5 px-4 text-center font-bold text-[#2F7D4F]">✓ Full Access</td>
                <td className="py-2.5 px-4 text-center font-bold text-[#2F7D4F]">✓ Create Only</td>
                <td className="py-2.5 px-4 text-center text-[#B0413E]">✕ Restricted</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-[#1C1C1A]">Build & Customize Registration Forms</td>
                <td className="py-2.5 px-4 text-center font-bold text-[#2F7D4F]">✓ Full Access</td>
                <td className="py-2.5 px-4 text-center font-bold text-[#2F7D4F]">✓ Assigned Events</td>
                <td className="py-2.5 px-4 text-center text-[#B0413E]">✕ Restricted</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-[#1C1C1A]">Manage Accommodation & Room Assignments</td>
                <td className="py-2.5 px-4 text-center font-bold text-[#2F7D4F]">✓ Full Access</td>
                <td className="py-2.5 px-4 text-center font-bold text-[#2F7D4F]">✓ Assigned Events</td>
                <td className="py-2.5 px-4 text-center text-[#B0413E]">✕ Restricted</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-[#1C1C1A]">Launch Terminal & Check-in QR Passes</td>
                <td className="py-2.5 px-4 text-center font-bold text-[#2F7D4F]">✓ Full Access</td>
                <td className="py-2.5 px-4 text-center font-bold text-[#2F7D4F]">✓ Full Access</td>
                <td className="py-2.5 px-4 text-center font-bold text-[#2F7D4F]">✓ Authorized Terminal</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Users Directory */}
      <div className="bg-white border border-[#E4E4E1] rounded-lg shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E4E4E1] flex items-center justify-between">
          <span className="font-bold text-xs text-[#1C1C1A]">Active Staff Accounts ({data.users.length})</span>
        </div>

        <div className="divide-y divide-[#E4E4E1]">
          {data.users.map(u => (
            <div key={u.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <img
                  src={u.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}
                  alt={u.name}
                  className="h-10 w-10 rounded-full border border-[#E4E4E1] object-cover"
                />
                <div>
                  <div className="font-bold text-xs text-[#1C1C1A]">{u.name}</div>
                  <div className="text-[11px] text-[#6B6B66]">{u.email} • {u.phone}</div>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <span className="font-semibold px-2.5 py-1 rounded bg-[#FAFAF9] text-[#14595A] border border-[#E4E4E1]">
                  {u.role}
                </span>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F0F9F3] text-[#2F7D4F]">
                  {u.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
