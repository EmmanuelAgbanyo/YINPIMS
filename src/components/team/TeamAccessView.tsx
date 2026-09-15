import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { syncFirestoreDoc } from '../../services/firebase';
import type { User, UserRole } from '../../types';
import { 
  ShieldCheck, 
  Lock, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  Phone, 
  X,
  Zap,
  Check
} from 'lucide-react';

export const TeamAccessView: React.FC = () => {
  const { data, currentUser, refreshData, hasPermission } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | UserRole>('ALL');
  
  // Modal states for creating/editing team member
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('EVENT_COORDINATOR');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [assignedEvents, setAssignedEvents] = useState<string[]>(['*']);
  
  // Error / Success messaging
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canManageStaff = hasPermission('manage_staff');

  const openCreateModal = () => {
    setEditingMember(null);
    setName('');
    setEmail('');
    setPhone('');
    setRole('EVENT_COORDINATOR');
    setStatus('Active');
    setAssignedEvents(['*']);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (member: User) => {
    setEditingMember(member);
    setName(member.name);
    setEmail(member.email);
    setPhone(member.phone || '');
    setRole(member.role);
    setStatus(member.status);
    setAssignedEvents(member.assignedEvents || ['*']);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !email.trim()) {
      setErrorMsg('Please enter both name and email address.');
      return;
    }

    try {
      const savedUser = db.saveUser({
        id: editingMember ? editingMember.id : undefined,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        status,
        assignedEvents,
      });

      // Real-time Sync to Firestore users collection
      try {
        await syncFirestoreDoc('users', savedUser.id, {
          uid: savedUser.id,
          name: savedUser.name,
          email: savedUser.email,
          phone: savedUser.phone,
          role: savedUser.role,
          status: savedUser.status,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Firestore team user sync note:', err);
      }

      refreshData();
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save team member.');
    }
  };

  const handleDeleteMember = async (member: User) => {
    if (member.email.toLowerCase() === 'policyp28@gmail.com') {
      alert('Super Admin account (policyp28@gmail.com) is protected and cannot be deleted.');
      return;
    }

    if (confirm(`Are you sure you want to remove team member "${member.name}" (${member.email})?`)) {
      try {
        db.deleteUser(member.id);
        refreshData();
      } catch (err: any) {
        alert(err.message || 'Failed to delete user.');
      }
    }
  };

  const filteredUsers = data.users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-body">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E4E4E1]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1A] tracking-tight font-heading flex items-center gap-2">
            <span>Team & Access Control Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B66] mt-0.5">
            Manage staff accounts, assign granular role permissions, and sync team profiles in real time.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#14595A]/10 text-[#14595A] border border-[#14595A]/20 flex items-center space-x-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span>Role: {currentUser.role}</span>
          </span>

          {canManageStaff && (
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-1.5 rounded-xl bg-[#14595A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Team Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Permission Matrix Card */}
      <div className="bg-white p-5 rounded-2xl border border-[#E4E4E1] shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1C1C1A] font-heading flex items-center space-x-2">
            <Lock className="h-4 w-4 text-[#14595A]" />
            <span>Role Permission Matrix</span>
          </h2>
          <span className="text-[11px] font-semibold text-[#6B6B66]">Enforced in AppContext</span>
        </div>

        <div className="overflow-x-auto border border-[#E4E4E1] rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAF9] border-b border-[#E4E4E1] text-[#6B6B66] font-bold text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">System Capability</th>
                <th className="py-3 px-4 text-center">Super Admin</th>
                <th className="py-3 px-4 text-center">Event Coordinator</th>
                <th className="py-3 px-4 text-center">Check-In Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E1]">
              <tr>
                <td className="py-3 px-4 font-semibold text-[#1C1C1A]">Organization Settings & Team Accounts</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F] bg-emerald-50/50">✓ Full Access</td>
                <td className="py-3 px-4 text-center text-red-600">✕ Restricted</td>
                <td className="py-3 px-4 text-center text-red-600">✕ Restricted</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-[#1C1C1A]">Create & Delete Events</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F] bg-emerald-50/50">✓ Full Access</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F]">✓ Create Only</td>
                <td className="py-3 px-4 text-center text-red-600">✕ Restricted</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-[#1C1C1A]">Custom Form Builder & Questions</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F] bg-emerald-50/50">✓ Full Access</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F]">✓ Assigned Events</td>
                <td className="py-3 px-4 text-center text-red-600">✕ Restricted</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-[#1C1C1A]">Accommodation & Room Assignment</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F] bg-emerald-50/50">✓ Full Access</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F]">✓ Assigned Events</td>
                <td className="py-3 px-4 text-center text-red-600">✕ Restricted</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-[#1C1C1A]">Launch Check-In Terminal & QR Passes</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F] bg-emerald-50/50">✓ Full Access</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F]">✓ Full Access</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F]">✓ Authorized Terminal</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Directory Header Controls */}
      <div className="bg-white border border-[#E4E4E1] rounded-2xl shadow-2xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6B66]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search team by name or email..."
              className="w-full rounded-xl border border-[#E4E4E1] bg-[#FAFAF9] pl-9 pr-3 py-2 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedRoleFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                selectedRoleFilter === 'ALL' ? 'bg-[#14595A] text-white' : 'bg-[#FAFAF9] text-[#6B6B66] hover:text-[#1C1C1A] border border-[#E4E4E1]'
              }`}
            >
              All ({data.users.length})
            </button>
            <button
              onClick={() => setSelectedRoleFilter('ADMIN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                selectedRoleFilter === 'ADMIN' ? 'bg-[#14595A] text-white' : 'bg-[#FAFAF9] text-[#6B6B66] hover:text-[#1C1C1A] border border-[#E4E4E1]'
              }`}
            >
              Admins
            </button>
            <button
              onClick={() => setSelectedRoleFilter('EVENT_COORDINATOR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                selectedRoleFilter === 'EVENT_COORDINATOR' ? 'bg-[#14595A] text-white' : 'bg-[#FAFAF9] text-[#6B6B66] hover:text-[#1C1C1A] border border-[#E4E4E1]'
              }`}
            >
              Coordinators
            </button>
            <button
              onClick={() => setSelectedRoleFilter('CHECKIN_STAFF')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                selectedRoleFilter === 'CHECKIN_STAFF' ? 'bg-[#14595A] text-white' : 'bg-[#FAFAF9] text-[#6B6B66] hover:text-[#1C1C1A] border border-[#E4E4E1]'
              }`}
            >
              Check-in Staff
            </button>
          </div>
        </div>

        {/* Directory List */}
        <div className="divide-y divide-[#E4E4E1] pt-2">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#6B6B66]">
              No team members match your criteria.
            </div>
          ) : (
            filteredUsers.map(member => {
              const isSuperAdmin = member.email.toLowerCase() === 'policyp28@gmail.com';
              return (
                <div key={member.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5">
                    <img
                      src={member.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={member.name}
                      className="h-11 w-11 rounded-full border border-[#E4E4E1] object-cover shrink-0"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-[#1C1C1A]">{member.name}</span>
                        {isSuperAdmin && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded-full">
                            <Zap className="h-3 w-3 fill-amber-500" />
                            <span>Super Admin (Owner)</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B6B66] mt-0.5">
                        <span className="flex items-center space-x-1">
                          <Mail className="h-3.5 w-3.5 text-[#14595A]" />
                          <span>{member.email}</span>
                        </span>
                        {member.phone && (
                          <span className="flex items-center space-x-1">
                            <Phone className="h-3.5 w-3.5 text-[#14595A]" />
                            <span>{member.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-[#FAFAF9] text-[#14595A] border border-[#E4E4E1]">
                        {member.role === 'ADMIN' ? 'Administrator' : member.role === 'EVENT_COORDINATOR' ? 'Coordinator' : 'Check-In Staff'}
                      </span>

                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1 ${
                        member.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {member.status === 'Active' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>{member.status}</span>
                      </span>
                    </div>

                    {canManageStaff && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditModal(member)}
                          className="p-1.5 text-[#6B6B66] hover:text-[#14595A] hover:bg-[#FAFAF9] rounded-lg transition-colors cursor-pointer"
                          title="Edit Team Member & Roles"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        {!isSuperAdmin && (
                          <button
                            onClick={() => handleDeleteMember(member)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Team Member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Team Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#E4E4E1] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#E4E4E1] px-6 py-4 bg-[#FAFAF9]">
              <h3 className="font-heading font-bold text-base text-[#1C1C1A]">
                {editingMember ? 'Edit Team Member' : 'Add New Team Member'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-[#6B6B66] hover:bg-[#E4E4E1] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. David Chen"
                  className="w-full rounded-xl border border-[#E4E4E1] bg-white px-3.5 py-2 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  disabled={editingMember?.email.toLowerCase() === 'policyp28@gmail.com'}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="david.chen@example.com"
                  className="w-full rounded-xl border border-[#E4E4E1] bg-white px-3.5 py-2 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full rounded-xl border border-[#E4E4E1] bg-white px-3.5 py-2 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Assigned System Role</label>
                  <select
                    value={role}
                    disabled={editingMember?.email.toLowerCase() === 'policyp28@gmail.com'}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-[#E4E4E1] bg-white px-3 py-2 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none cursor-pointer disabled:bg-gray-100"
                  >
                    <option value="ADMIN">Full Administrator</option>
                    <option value="EVENT_COORDINATOR">Event Coordinator</option>
                    <option value="CHECKIN_STAFF">Check-In Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Account Status</label>
                  <select
                    value={status}
                    disabled={editingMember?.email.toLowerCase() === 'policyp28@gmail.com'}
                    onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full rounded-xl border border-[#E4E4E1] bg-white px-3 py-2 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none cursor-pointer disabled:bg-gray-100"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E4E4E1] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-[#E4E4E1] bg-white px-4 py-2 text-xs font-semibold text-[#6B6B66] hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#14595A] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>{editingMember ? 'Update Member' : 'Add Team Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
