import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { syncFirestoreDoc } from '../../services/firebase';
import type { User, UserRole } from '../../types';
import { StaffInviteCardModal } from './StaffInviteCardModal';
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
  Check, 
  KeyRound, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  UserCheck, 
  Share2, 
  Calendar, 
  Clock
} from 'lucide-react';

export const TeamAccessView: React.FC = () => {
  const { 
    data, 
    currentUser, 
    effectiveUser,
    refreshData, 
    hasPermission, 
    startImpersonation,
    issueProvisionalPassword 
  } = useApp();
  
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
  const [provisionalPassword, setProvisionalPassword] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [showProvisionalPassword, setShowProvisionalPassword] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState('');

  // Support Credential Card modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteCardUser, setInviteCardUser] = useState<User | null>(null);
  const [inviteCardPassword, setInviteCardPassword] = useState<string | undefined>(undefined);

  // Error / Success messaging
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [supportNotice, setSupportNotice] = useState<string | null>(null);

  const canManageStaff = hasPermission('manage_staff');
  const isSuperAdminUser = currentUser.email.toLowerCase() === 'policyp28@gmail.com' || currentUser.role === 'ADMIN';

  const generateProvisionalPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = 'YIN-';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const openCreateModal = () => {
    setEditingMember(null);
    setName('');
    setEmail('');
    setPhone('');
    setRole('EVENT_COORDINATOR');
    setStatus('Active');
    setAssignedEvents(['*']);
    setProvisionalPassword(generateProvisionalPassword());
    setMustChangePassword(true);
    setShowProvisionalPassword(false);
    setEventSearchQuery('');
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
    setProvisionalPassword(member.provisionalPassword || '');
    setMustChangePassword(member.mustChangePassword !== false);
    setShowProvisionalPassword(false);
    setEventSearchQuery('');
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
        provisionalPassword: provisionalPassword.trim() || undefined,
        mustChangePassword,
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
          assignedEvents: savedUser.assignedEvents,
          mustChangePassword: savedUser.mustChangePassword,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Firestore team user sync note:', err);
      }

      refreshData();
      setIsModalOpen(false);

      // If newly created or password was set, pop up the Credentials Card
      if (!editingMember || provisionalPassword) {
        setInviteCardUser(savedUser);
        setInviteCardPassword(provisionalPassword);
        setInviteModalOpen(true);
      }
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

  // --- SUPERADMIN SUPPORT FUNCTIONS ---
  const handleSupportImpersonate = (member: User) => {
    startImpersonation(member);
    setSupportNotice(`Now impersonating staff member: ${member.name} (${member.role}). Testing authorized events and permissions.`);
    setTimeout(() => setSupportNotice(null), 5000);
  };

  const handleSupportResetPassword = (member: User) => {
    const defaultNewPass = generateProvisionalPassword();
    const promptPass = window.prompt(`Issue new provisional password for ${member.name} (${member.email}):`, defaultNewPass);
    if (promptPass !== null) {
      const res = issueProvisionalPassword(member.id, promptPass);
      setInviteCardUser(res.user);
      setInviteCardPassword(res.provisionalPassword);
      setInviteModalOpen(true);
    }
  };

  const handleOpenInviteCard = (member: User) => {
    setInviteCardUser(member);
    setInviteCardPassword(member.provisionalPassword || undefined);
    setInviteModalOpen(true);
  };

  const handleToggleStatus = (member: User) => {
    if (member.email.toLowerCase() === 'policyp28@gmail.com') {
      alert('Super Admin status cannot be toggled.');
      return;
    }
    const nextStatus = member.status === 'Active' ? 'Inactive' : 'Active';
    db.saveUser({
      ...member,
      status: nextStatus,
    });
    refreshData();
  };

  const filteredUsers = data.users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredEventsForSelection = data.events.filter(e => 
    e.name.toLowerCase().includes(eventSearchQuery.toLowerCase()) ||
    e.location.toLowerCase().includes(eventSearchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-body">
      {/* Support Notice Toast */}
      {supportNotice && (
        <div className="bg-amber-500 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between text-xs font-semibold animate-pulse">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>{supportNotice}</span>
          </div>
          <button onClick={() => setSupportNotice(null)} className="hover:opacity-75">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E4E4E1]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1A] tracking-tight font-heading flex items-center gap-2">
            <span>Team & User Access Control</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Enterprise 5-Star Suite
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B66] mt-0.5">
            Manage staff accounts with provisional passwords, mandatory first-login password recreation, granular event permissions, and Superadmin support tools.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#14595A]/10 text-[#14595A] border border-[#14595A]/20 flex items-center space-x-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span>Role: {effectiveUser.role}</span>
          </span>

          {canManageStaff && (
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-1.5 rounded-xl bg-[#14595A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Staff Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Superadmin Operations & Permission Matrix Card */}
      <div className="bg-white p-5 rounded-2xl border border-[#E4E4E1] shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1C1C1A] font-heading flex items-center space-x-2">
            <Lock className="h-4 w-4 text-[#14595A]" />
            <span>Role Permission & Security Matrix</span>
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Granular Event Scoping Enabled
            </span>
          </div>
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
                <td className="py-3 px-4 font-semibold text-[#1C1C1A]">Organization Settings & Staff Management</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F] bg-emerald-50/50">✓ Full Access</td>
                <td className="py-3 px-4 text-center text-red-600">✕ Restricted</td>
                <td className="py-3 px-4 text-center text-red-600">✕ Restricted</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-[#1C1C1A]">Superadmin Support & Impersonation Engine</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F] bg-emerald-50/50">✓ Full Access</td>
                <td className="py-3 px-4 text-center text-red-600">✕ Restricted</td>
                <td className="py-3 px-4 text-center text-red-600">✕ Restricted</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-[#1C1C1A]">Manage Events & Form Customization</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F] bg-emerald-50/50">✓ Full Access</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F]">✓ Assigned Events Only</td>
                <td className="py-3 px-4 text-center text-red-600">✕ Restricted</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-[#1C1C1A]">Accommodation & Room Assignment</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F] bg-emerald-50/50">✓ Full Access</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F]">✓ Assigned Events Only</td>
                <td className="py-3 px-4 text-center text-red-600">✕ Restricted</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-[#1C1C1A]">Check-In Terminal & QR Scanning</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F] bg-emerald-50/50">✓ Full Access</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F]">✓ Assigned Events</td>
                <td className="py-3 px-4 text-center font-bold text-[#2F7D4F]">✓ Assigned Events</td>
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
              placeholder="Search staff by name or email..."
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
              const isSelf = member.id === currentUser.id;
              const hasProvisional = member.mustChangePassword;

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
                        {hasProvisional && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 rounded-full" title="Staff must recreate password on first login">
                            <Clock className="h-3 w-3 text-amber-600" />
                            <span>Provisional Password</span>
                          </span>
                        )}
                        {!hasProvisional && !isSuperAdmin && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span>Verified</span>
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

                      {/* Assigned Events Badges */}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-[#6B6B66] flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Scope:
                        </span>
                        {member.assignedEvents?.includes('*') || !member.assignedEvents ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#14595A]/10 text-[#14595A] border border-[#14595A]/20">
                            All Events (*)
                          </span>
                        ) : member.assignedEvents.length === 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                            No Events Assigned
                          </span>
                        ) : (
                          member.assignedEvents.map(evtId => {
                            const evt = data.events.find(e => e.id === evtId);
                            if (!evt) return null;
                            return (
                              <span key={evtId} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#FAFAF9] text-[#1C1C1A] border border-[#E4E4E1]">
                                {evt.name}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Superadmin Support Controls */}
                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
                    <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-[#FAFAF9] text-[#14595A] border border-[#E4E4E1]">
                      {member.role === 'ADMIN' ? 'Administrator' : member.role === 'EVENT_COORDINATOR' ? 'Coordinator' : 'Check-In Staff'}
                    </span>

                    <button
                      onClick={() => handleToggleStatus(member)}
                      disabled={!canManageStaff || isSuperAdmin}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-1 cursor-pointer transition-colors ${
                        member.status === 'Active' 
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title="Click to toggle status"
                    >
                      {member.status === 'Active' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      <span>{member.status}</span>
                    </button>

                    {/* Support Functions Toolbar */}
                    {isSuperAdminUser && (
                      <div className="flex items-center space-x-1 bg-[#FAFAF9] p-1 rounded-xl border border-[#E4E4E1]">
                        {/* Support Impersonate */}
                        {!isSelf && (
                          <button
                            onClick={() => handleSupportImpersonate(member)}
                            className="px-2 py-1 text-[11px] font-bold text-[#14595A] hover:bg-[#14595A]/10 rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                            title={`Superadmin Support: Impersonate ${member.name}`}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Impersonate</span>
                          </button>
                        )}

                        {/* Reset Provisional Password */}
                        <button
                          onClick={() => handleSupportResetPassword(member)}
                          className="px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                          title="Issue New Provisional Password"
                        >
                          <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                          <span>Reset Pass</span>
                        </button>

                        {/* Share Invite Card */}
                        <button
                          onClick={() => handleOpenInviteCard(member)}
                          className="p-1.5 text-[#6B6B66] hover:text-[#14595A] hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="View & Copy Login Credentials"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

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
          <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-[#E4E4E1] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#E4E4E1] px-6 py-4 bg-[#FAFAF9]">
              <div>
                <h3 className="font-heading font-bold text-base text-[#1C1C1A]">
                  {editingMember ? 'Edit Staff Account & Permissions' : 'Add New Staff Member'}
                </h3>
                <p className="text-xs text-[#6B6B66]">Configure credentials, provisional password, and assigned events</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-[#6B6B66] hover:bg-[#E4E4E1] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </div>

              {/* Provisional Password Section */}
              <div className="p-4 rounded-2xl bg-[#FAFAF9] border border-[#E4E4E1] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1C1C1A] flex items-center gap-1.5">
                    <KeyRound className="h-4 w-4 text-[#14595A]" />
                    <span>Provisional Password & Onboarding</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setProvisionalPassword(generateProvisionalPassword())}
                    className="text-[11px] font-bold text-[#14595A] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" /> Auto-Generate
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showProvisionalPassword ? 'text' : 'password'}
                    value={provisionalPassword}
                    onChange={(e) => setProvisionalPassword(e.target.value)}
                    placeholder="Enter provisional password"
                    className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-3.5 pr-10 py-2 text-xs font-mono text-[#1C1C1A] focus:border-[#14595A] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProvisionalPassword(!showProvisionalPassword)}
                    className="absolute right-3 top-2.5 text-[#6B6B66] hover:text-[#1C1C1A] cursor-pointer"
                  >
                    {showProvisionalPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <label className="flex items-center space-x-2 text-xs text-[#1C1C1A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mustChangePassword}
                    onChange={(e) => setMustChangePassword(e.target.checked)}
                    className="rounded text-[#14595A] focus:ring-[#14595A]"
                  />
                  <span className="font-medium">Mandatory: Staff must recreate own password upon initial sign-in</span>
                </label>
              </div>

              {/* Enhanced Granular Event Scope Selection */}
              <div className="space-y-3 pt-2 border-t border-[#E4E4E1]">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#1C1C1A] flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-[#14595A]" />
                    <span>Assigned Event Scope</span>
                  </label>
                  {!assignedEvents.includes('*') && (
                    <span className="text-[11px] font-semibold text-[#14595A] bg-[#14595A]/10 px-2.5 py-0.5 rounded-full border border-[#14595A]/20">
                      {assignedEvents.length} Event(s) Selected
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-4 text-xs">
                  <label className="flex items-center space-x-2 font-medium text-[#1C1C1A] cursor-pointer">
                    <input
                      type="radio"
                      name="eventScope"
                      checked={assignedEvents.includes('*')}
                      disabled={editingMember?.email.toLowerCase() === 'policyp28@gmail.com'}
                      onChange={() => setAssignedEvents(['*'])}
                      className="text-[#14595A] focus:ring-[#14595A]"
                    />
                    <span>All Events (Global Operations)</span>
                  </label>

                  <label className="flex items-center space-x-2 font-medium text-[#1C1C1A] cursor-pointer">
                    <input
                      type="radio"
                      name="eventScope"
                      checked={!assignedEvents.includes('*')}
                      disabled={editingMember?.email.toLowerCase() === 'policyp28@gmail.com'}
                      onChange={() => {
                        const firstEvt = data.events[0]?.id;
                        setAssignedEvents(firstEvt ? [firstEvt] : []);
                      }}
                      className="text-[#14595A] focus:ring-[#14595A]"
                    />
                    <span>Specific Event(s) Only</span>
                  </label>
                </div>

                {!assignedEvents.includes('*') && (
                  <div className="p-3 bg-[#FAFAF9] border border-[#E4E4E1] rounded-2xl space-y-3">
                    {/* Quick Filters */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#6B6B66]" />
                        <input
                          type="text"
                          value={eventSearchQuery}
                          onChange={(e) => setEventSearchQuery(e.target.value)}
                          placeholder="Filter events list..."
                          className="w-full rounded-lg border border-[#E4E4E1] bg-white pl-8 pr-2 py-1.5 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setAssignedEvents(data.events.map(e => e.id))}
                          className="px-2 py-1 text-[10px] font-bold text-[#14595A] hover:bg-white rounded border border-[#E4E4E1] cursor-pointer"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssignedEvents(data.events.filter(e => e.status === 'Active').map(e => e.id))}
                          className="px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-white rounded border border-[#E4E4E1] cursor-pointer"
                        >
                          Active Only
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssignedEvents([])}
                          className="px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-white rounded border border-[#E4E4E1] cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Checkbox List */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {filteredEventsForSelection.length === 0 ? (
                        <p className="text-xs text-[#6B6B66] italic py-2 text-center">No events found.</p>
                      ) : (
                        filteredEventsForSelection.map(evt => {
                          const isChecked = assignedEvents.includes(evt.id);
                          return (
                            <label 
                              key={evt.id} 
                              className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                                isChecked ? 'bg-white border-[#14595A]/40 shadow-2xs' : 'bg-white/60 border-[#E4E4E1] hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setAssignedEvents([...assignedEvents.filter(id => id !== '*'), evt.id]);
                                    } else {
                                      setAssignedEvents(assignedEvents.filter(id => id !== evt.id));
                                    }
                                  }}
                                  className="rounded text-[#14595A] focus:ring-[#14595A]"
                                />
                                <div>
                                  <span className="font-bold text-[#1C1C1A] block">{evt.name}</span>
                                  <span className="text-[10px] text-[#6B6B66]">{evt.location} • {evt.startDate}</span>
                                </div>
                              </div>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                evt.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {evt.status}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
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
                  <span>{editingMember ? 'Update Staff Member' : 'Create & Issue Access'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Invite & Credentials Card Modal */}
      {inviteModalOpen && inviteCardUser && (
        <StaffInviteCardModal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          user={inviteCardUser}
          events={data.events}
          provisionalPassword={inviteCardPassword}
        />
      )}
    </div>
  );
};
