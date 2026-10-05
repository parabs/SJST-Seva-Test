import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  KeyRound, 
  Edit3, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  Search,
  Phone,
  Mail,
  UserX,
  UserCheck,
  Shield,
  Send,
  Trash2,
  Ban,
  RefreshCw
} from 'lucide-react';
import { VolunteerRecord, DonationRecord } from '../types';
import {
  addVolunteer,
  sendVolunteerActivation,
  deleteVolunteer,
  sendVolunteerPinReset,
  disableVolunteer,
  reactivateVolunteer,
  adminUpdateVolunteer
} from '../services/googleSheetsService';

interface VolunteerManagementModalProps {
  volunteers: VolunteerRecord[];
  donations: DonationRecord[];
  onAddVolunteer: (volunteer: VolunteerRecord) => void;
  onEditVolunteer: (volunteer: VolunteerRecord) => void;
  onResetPassword: (volunteerCode: string, newAuthCode: string) => void;
  onRefreshVolunteers: () => Promise<void>;
  onClose: () => void;
}

export function VolunteerManagementModal({
  volunteers,
  donations,
  onAddVolunteer,
  onEditVolunteer,
  onResetPassword,
  onRefreshVolunteers,
  onClose
}: VolunteerManagementModalProps) {

  React.useEffect(() => {
  const loadVolunteers = async () => {
    setLoadingVolunteers(true);

    try {
      await onRefreshVolunteers();
    } finally {
      setLoadingVolunteers(false);
    }
  };

  loadVolunteers();
}, []);


  const [statusFilter, setStatusFilter] = useState<'All' | 'Created' | 'Active' | 'Closed'>('All');

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [editingVolunteer, setEditingVolunteer] = useState<VolunteerRecord | null>(null);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);

  // New Volunteer Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Volunteer');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Filter volunteers
  const filteredVolunteers = volunteers.filter(v => {
    const matchesSearch =
      v.volunteerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.volunteerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.phone && v.phone.includes(searchTerm)) ||
      (v.email && v.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'All' || v.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!newName.trim() || !newPhone.trim() || !newEmail.trim() || !newRole.trim()) {
      setFormError('Name, Mobile, Email, and Role are required.');
      return;
    }

    try {
      const result = await addVolunteer(
        newName,
        newPhone,
        newEmail,
        newRole
      );

      if (!result.success || !result.volunteer) {
        setFormError(
          result.error || 'Unable to create volunteer account.'
        );
        return;
      }

      const createdVolunteer: VolunteerRecord = {
        volunteerCode: result.volunteer.volunteerCode,
        volunteerName: result.volunteer.volunteerName,
        authCode: '',
        status: 'Created',
        phone: result.volunteer.phone,
        email: result.volunteer.email,
        role: result.volunteer.role
      };

      onAddVolunteer(createdVolunteer);

      setFormSuccess(
        `Volunteer ${createdVolunteer.volunteerName} created successfully.`
      );

      // Reset form
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewRole('Volunteer');

      setTimeout(() => {
        setFormSuccess('');
        setActiveTab('list');
      }, 1500);

    } catch (err: any) {
      setFormError(
        err.message || 'Unable to create volunteer account.'
      );
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingVolunteer) return;

    if (!editingVolunteer.volunteerName.trim()) {
      alert('Volunteer name cannot be empty.');
      return;
    }

    const result = await adminUpdateVolunteer({
      volunteerCode: editingVolunteer.volunteerCode,
      volunteerName: editingVolunteer.volunteerName.trim(),
      phone: editingVolunteer.phone || '',
      email: editingVolunteer.email || '',
      role: editingVolunteer.role || ''
    });

    if (!result.success) {
      alert(
        result.error ||
        'Unable to update volunteer.'
      );
      return;
    }

    alert(
      `Volunteer ${editingVolunteer.volunteerName} updated successfully.`
    );

    setEditingVolunteer(null);
    await onRefreshVolunteers();
  };

return (
    <>
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-2 sm:my-6 flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-3rem)]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900 to-amber-950 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/15">
              <Shield className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white font-serif">Volunteer Management</h2>
              <p className="text-xs text-amber-200/90">
                Add, edit details, and reset authentication PIN for authorized mandal volunteers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => {
              setActiveTab('list');
              setEditingVolunteer(null);
            }}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'list'
                ? 'border-amber-800 text-amber-950'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            All Volunteers ({volunteers.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('add');
              setEditingVolunteer(null);
            }}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'add'
                ? 'border-amber-800 text-amber-950'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add New Volunteer</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 min-h-0 overflow-y-auto overscroll-contain">
          
          {/* TAB: LIST VOLUNTEERS */}
          {activeTab === 'list' && !editingVolunteer && (
            <div className="space-y-4">
                    
              {/* Search & Status Filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search volunteer by code, name, phone or email..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={e =>
                    setStatusFilter(
                      e.target.value as 'All' | 'Created' | 'Active' | 'Closed'
                    )
                  }
                  className="sm:w-40 px-3.5 py-2.5 text-xs font-bold text-slate-700 rounded-xl border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                >
                  <option value="All">All Status</option>
                  <option value="Created">Created</option>
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              {/* Volunteers Roster */}

              {/* MOBILE — CARD VIEW */}
              <div className="sm:hidden space-y-3">
                {loadingVolunteers ? (
                  <div className="py-10 text-center text-sm font-semibold text-slate-500">
                    ⏳ Loading Volunteers...
                  </div>
                ) : filteredVolunteers.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No volunteers found matching "{searchTerm}"
                  </div>
                ) : (
                  filteredVolunteers.map(vol => {
                    const verifiedCount = vol.verifiedSeva ?? 0;
              
                    return (
                      <div
                        key={vol.volunteerCode}
                        className="border border-slate-200 rounded-2xl p-4 bg-white shadow-2xs"
                      >
                        {/* Top */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-mono font-bold text-amber-950 text-sm">
                              {vol.volunteerCode}
                            </div>
              
                            <div className="font-bold text-slate-900 mt-1">
                              {vol.volunteerName}
                            </div>
                          </div>
              
                          <span
                            className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              vol.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : vol.status === 'Created'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {vol.status}
                          </span>
                        </div>
              
                        {/* Contact */}
                        {(vol.phone || vol.email) && (
                          <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                            {vol.phone && (
                              <div>📱 {vol.phone}</div>
                            )}
              
                            {vol.email && (
                              <div className="break-all">
                                ✉️ {vol.email}
                              </div>
                            )}
                          </div>
                        )}
              
                        {/* Verified Seva */}
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                            Verified Seva
                          </span>
              
                          <span className="ml-2 font-mono font-semibold text-slate-700 text-xs">
                            {verifiedCount} verified
                          </span>
                        </div>
              
                        {/* Actions */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                          
                          {/* Edit */}
                          <button
                            onClick={() => setEditingVolunteer({ ...vol })}
                            title="Edit Volunteer Details"
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:text-amber-900 hover:bg-amber-50 transition cursor-pointer text-xs font-bold"
                          >
                            <span className="inline-flex items-center justify-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </span>
                          </button>
              
                          {/* Created */}
                          {vol.status === 'Created' && (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  const result = await sendVolunteerActivation(
                                    vol.volunteerCode
                                  );
              
                                  if (result.success) {
                                    alert(
                                      `Activation link sent to ${vol.volunteerName}.`
                                    );
                                  } else {
                                    alert(
                                      result.error ||
                                      'Unable to send activation link.'
                                    );
                                  }
                                }}
                                title="Send Activation Link"
                                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-amber-900 hover:bg-amber-50 transition cursor-pointer"
                              >
                                <Send className="w-4 h-4" />
                              </button>
              
                              <button
                                type="button"
                                onClick={async () => {
                                  const confirmed = window.confirm(
                                    `Delete volunteer ${vol.volunteerName} (${vol.volunteerCode})?`
                                  );
              
                                  if (!confirmed) return;
              
                                  const result = await deleteVolunteer(
                                    vol.volunteerCode
                                  );
              
                                  if (result.success) {
                                    alert(
                                      `Volunteer ${vol.volunteerName} deleted successfully.`
                                    );
                                    await onRefreshVolunteers();
                                  } else {
                                    alert(
                                      result.error ||
                                      'Unable to delete volunteer.'
                                    );
                                  }
                                }}
                                title="Delete Volunteer"
                                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
              
                          {/* Active */}
                          {vol.status === 'Active' && (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  const result = await sendVolunteerPinReset(
                                    vol.volunteerCode
                                  );
              
                                  if (result.success) {
                                    alert(
                                      `PIN reset link sent to ${vol.volunteerName}.`
                                    );
                                  } else {
                                    alert(
                                      result.error ||
                                      'Unable to send PIN reset link.'
                                    );
                                  }
                                }}
                                title="Reset Security PIN / Password"
                                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-amber-900 hover:bg-amber-50 transition cursor-pointer"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
              
                              <button
                                type="button"
                                onClick={async () => {
                                  const confirmed = window.confirm(
                                    `Disable volunteer ${vol.volunteerName} (${vol.volunteerCode})?`
                                  );
              
                                  if (!confirmed) return;
              
                                  const result = await disableVolunteer(
                                    vol.volunteerCode
                                  );
              
                                  if (result.success) {
                                    alert(
                                      `Volunteer ${vol.volunteerName} has been disabled.`
                                    );
                                    await onRefreshVolunteers();
                                  } else {
                                    alert(
                                      result.error ||
                                      'Unable to disable volunteer.'
                                    );
                                  }
                                }}
                                title="Disable Volunteer"
                                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            </>
                          )}
              
                          {/* Closed */}
                          {vol.status === 'Closed' && (
                            <button
                              type="button"
                              onClick={async () => {
                                const confirmed = window.confirm(
                                  `Reactivate volunteer ${vol.volunteerName} (${vol.volunteerCode})?`
                                );
              
                                if (!confirmed) return;
              
                                const result = await reactivateVolunteer(
                                  vol.volunteerCode
                                );
              
                                if (result.success) {
                                  alert(
                                    `Volunteer ${vol.volunteerName} has been reactivated.`
                                  );
                                  await onRefreshVolunteers();
                                } else {
                                  alert(
                                    result.error ||
                                    'Unable to reactivate volunteer.'
                                  );
                                }
                              }}
                              title="Reactivate Volunteer"
                              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              
              {/* DESKTOP — EXISTING TABLE */}
              <div className="hidden sm:block border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider sticky top-0">
                      <tr>
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Volunteer Name</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Verified Seva</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
              
                    <tbody className="divide-y divide-slate-100 font-normal">
                      {loadingVolunteers ? (
                        <tr>
                          <td colSpan={5} className="py-10 text-center">
                            <div className="text-sm font-semibold text-slate-500 animate-pulse">
                              ⏳ Loading Volunteers...
                            </div>
                          </td>
                        </tr>
                      ) : filteredVolunteers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-8 text-center text-slate-400 text-xs"
                          >
                            No volunteers found matching "{searchTerm}"
                          </td>
                        </tr>
                      ) : (
                        filteredVolunteers.map(vol => {
                          const verifiedCount = vol.verifiedSeva ?? 0;
              
                          return (
                            <tr
                              key={vol.volunteerCode}
                              className="hover:bg-amber-50/40 transition"
                            >
                              <td className="py-3.5 px-4 font-mono font-bold text-amber-950">
                                {vol.volunteerCode}
                              </td>
              
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-900">
                                  {vol.volunteerName}
                                </div>
              
                                {(vol.phone || vol.email) && (
                                  <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                                    {vol.phone && <span>📱 {vol.phone}</span>}
                                    {vol.email && <span>✉️ {vol.email}</span>}
                                  </div>
                                )}
                              </td>
              
                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    vol.status === 'Active'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {vol.status}
                                </span>
                              </td>
              
                              <td className="py-3.5 px-4 font-mono text-slate-700 font-medium">
                                {verifiedCount} verified
                              </td>
              
                             <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setEditingVolunteer({ ...vol })}
                                    title="Edit Volunteer Details"
                                    className="p-1.5 rounded-lg text-slate-600 hover:text-amber-900 hover:bg-amber-100 transition cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                    {vol.status === 'Created' && (
                                      <>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const result = await sendVolunteerActivation(vol.volunteerCode);

                                          if (result.success) {
                                            alert(`Activation link sent to ${vol.volunteerName}.`);
                                          } else {
                                            alert(
                                              result.error ||
                                              'Unable to send activation link.'
                                            );
                                          }
                                        }}
                                        title="Send Activation Link"
                                        className="p-1.5 rounded-lg text-slate-600 hover:text-amber-900 hover:bg-amber-100 transition cursor-pointer"
                                      >
                                        <Send className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const confirmed = window.confirm(
                                            `Delete volunteer ${vol.volunteerName} (${vol.volunteerCode})?`
                                          );

                                          if (!confirmed) return;

                                          const result = await deleteVolunteer(vol.volunteerCode);

                                          if (result.success) {
                                            alert(`Volunteer ${vol.volunteerName} deleted successfully.`);
                                            await onRefreshVolunteers();
                                          } else {
                                            alert(
                                              result.error ||
                                              'Unable to delete volunteer.'
                                            );
                                          }
                                        }}
                                        title="Delete Volunteer"
                                        className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                      </>
                                    )}


                                  {vol.status === 'Active' && (
                                    <>
                                    <button
                                      onClick={async () => {
                                        const result = await sendVolunteerPinReset(
                                          vol.volunteerCode
                                        );

                                        if (result.success) {
                                          alert(`PIN reset link sent to ${vol.volunteerName}.`);
                                        } else {
                                          alert(
                                            result.error ||
                                            'Unable to send PIN reset link.'
                                          );
                                        }
                                      }}
                                      title="Reset Security PIN / Password"
                                      className="p-1.5 rounded-lg text-slate-600 hover:text-amber-900 hover:bg-amber-100 transition cursor-pointer"
                                    >
                                      <KeyRound className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const confirmed = window.confirm(
                                          `Disable volunteer ${vol.volunteerName} (${vol.volunteerCode})?`
                                        );

                                        if (!confirmed) return;

                                        const result = await disableVolunteer(vol.volunteerCode);

                                        if (result.success) {
                                          alert(`Volunteer ${vol.volunteerName} has been disabled.`);
                                          await onRefreshVolunteers();
                                        } else {
                                          alert(
                                            result.error ||
                                            'Unable to disable volunteer.'
                                          );
                                        }
                                      }}
                                      title="Disable Volunteer"
                                      className="text-slate-500 hover:text-rose-700 transition cursor-pointer"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                    </button>
                                    </>
                                  )}

                                  {vol.status === 'Closed' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const confirmed = window.confirm(
                                        `Reactivate volunteer ${vol.volunteerName} (${vol.volunteerCode})?`
                                      );

                                      if (!confirmed) return;

                                      const result = await reactivateVolunteer(
                                        vol.volunteerCode
                                      );

                                      if (result.success) {
                                        alert(
                                          `Volunteer ${vol.volunteerName} has been reactivated.`
                                        );
                                        await onRefreshVolunteers();
                                      } else {
                                        alert(
                                          result.error ||
                                          'Unable to reactivate volunteer.'
                                        );
                                      }
                                    }}
                                    title="Reactivate Volunteer"
                                    className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                </div>

                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 text-right">
                Authorized volunteers can login to the Volunteer App to confirm UPI contributions.
              </div>

            </div>
          )}

          {/* TAB: ADD NEW VOLUNTEER */}
          {activeTab === 'add' && (
            <form onSubmit={handleAddSubmit} className="space-y-4">

              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  Enter the volunteer's profile details. An activation link will be
                  sent to their registered email so they can set their own
                  Security PIN and activate the account.
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priyabrata Mohanty"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                  />
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9892805337"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="e.g. volunteer@gmail.com"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                  >
                    <option value="Volunteer">Volunteer</option>
                    <option value="Treasurer">Treasurer</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="text-[11px] text-slate-500">
                  The system will automatically generate a unique Volunteer Code.
                  The account will remain <strong>Created</strong> until the
                  volunteer activates it and sets a Security PIN.
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Volunteer</span>
                </button>
              </div>

            </form>
          )}

          {/* EDIT VOLUNTEER SUB-VIEW */}
          {editingVolunteer && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">
                  Edit Volunteer: <span className="font-mono text-amber-900">{editingVolunteer.volunteerCode}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingVolunteer(null)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Back to List
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Volunteer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingVolunteer.volunteerName}
                    onChange={e => setEditingVolunteer({ ...editingVolunteer, volunteerName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Status
                  </label>
                  <select
                    value={editingVolunteer.status}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 bg-slate-100 cursor-not-allowed"
                  >
                    <option value="Active">Active</option>
                    <option value="Closed">Closed / Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9892805337"
                    value={editingVolunteer.phone || ''}
                    onChange={e => setEditingVolunteer({ ...editingVolunteer, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. volunteer@gmail.com"
                    value={editingVolunteer.email || ''}
                    onChange={e => setEditingVolunteer({ ...editingVolunteer, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingVolunteer(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Update Volunteer</span>
                </button>
              </div>
            </form>
          )}

          
        </div>

      </div>
    </div>
    </>
  );
}
