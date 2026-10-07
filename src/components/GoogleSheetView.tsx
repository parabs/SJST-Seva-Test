import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Search, 
  Filter, 
  ExternalLink, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  Receipt,
  Download,
  Check,
  X,
  RefreshCw
} from 'lucide-react';
import { DonationRecord, VolunteerRecord } from '../types';
import { useGmailAuth } from '../context/GmailAuthContext';
import { loadAppConfig } from '../services/appConfig';

interface GoogleSheetViewProps {
  donations: DonationRecord[];
  volunteers: VolunteerRecord[];
  currentVolunteer: VolunteerRecord | null;
  onViewReceipt: (donation: DonationRecord) => void;
  onSendReceipt?: (donation: DonationRecord) => Promise<void>;
  onConfirmDonation?: (
    donationId: string,
    volunteerName: string
  ) => Promise<{
    success: boolean;
    donation?: DonationRecord;
    error?: string;
  }>;
  onCancelDonation?: (donationId: string, volunteerName: string) => Promise<void>;
  onRepayment?: (donation: DonationRecord) => Promise<void>;
  onConfirmRepayment?: (donation: DonationRecord) => Promise<void>;
  onRefreshFromGoogleSheet?: () => Promise<{ count: number; error?: string }>;
}

export function GoogleSheetView({
  donations,
  volunteers,
  currentVolunteer,
  onViewReceipt,
  onSendReceipt,
  onConfirmDonation,
  onCancelDonation,
  onRepayment,
  onConfirmRepayment,
  onRefreshFromGoogleSheet
}: GoogleSheetViewProps) {
  const { isAuthenticated, accessToken, userProfile, loginWithGoogle } = useGmailAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] =  useState<string>('All');
  const [modeFilter, setModeFilter] = useState<'All' | 'Cash' | 'UPI'>('All');
  const [volunteerFilter, setVolunteerFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');

    useEffect(() => {
    let isMounted = true;

    loadAppConfig()
      .then((config) => {
        const spreadsheetId =
          config.google?.spreadsheetId?.trim();

        if (isMounted && spreadsheetId) {
          setSpreadsheetUrl(
            `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
          );
        }
      })
      .catch((error) => {
        console.error(
          'Unable to load Google Spreadsheet configuration:',
          error
        );
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const currentRole = String(currentVolunteer?.role || '')
  .trim()
  .toLowerCase();

  const isVolunteer = currentRole === 'volunteer';

  const isViewOnlyRole =
    currentRole === 'trustee' ||
    currentRole === 'admin';

  // Confirmation Modal State
  const [confirmingDonation, setConfirmingDonation] = useState<DonationRecord | null>(null);
  const [selectedVolunteerForConfirm, setSelectedVolunteerForConfirm] = useState<string>(
    volunteers[0] ? `${volunteers[0].volunteerName} (${volunteers[0].volunteerCode})` : 'Trust Volunteer'
  );
  const [isProcessingConfirm, setIsProcessingConfirm] = useState(false);
  const [confirmSuccessMsg, setConfirmSuccessMsg] = useState('');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');


  const handleRefreshLiveSheet = async () => {
    if (!onRefreshFromGoogleSheet) return;

    setIsRefreshing(true);
    setRefreshMessage('');

    try {
      const result = await onRefreshFromGoogleSheet();

      if (result.error) {
        setRefreshMessage(`Refresh failed: ${result.error}`);
        return;
      }

      setRefreshMessage(`✓ Refreshed ${result.count} donation records`);
    } catch (err: any) {
      setRefreshMessage(
        `Refresh failed: ${err.message || 'Unable to refresh Live Sheet'}`
      );
    } finally {
      setIsRefreshing(false);

      setTimeout(() => {
        setRefreshMessage('');
      }, 3500);
    }
  };
  
  const visibleDonations = isVolunteer && currentVolunteer
  ? donations.filter(d => {
      const donationVolunteerName = String(d.volunteerName || '')
        .trim()
        .toLowerCase();

      const confirmedBy = String(d.confirmedBy || '')
        .trim()
        .toLowerCase();

      const volunteerName = String(currentVolunteer.volunteerName || '')
        .trim()
        .toLowerCase();

      const volunteerCode = String(currentVolunteer.volunteerCode || '')
        .trim()
        .toLowerCase();

      return (
        donationVolunteerName === volunteerName ||
        confirmedBy === volunteerName ||
        confirmedBy.includes(volunteerCode)
      );
    })
  : donations;

  // Live filter values derived from the Donations master sheet
  const volunteerOptions = Array.from(
    new Set(
      visibleDonations
        .map(d => String(d.volunteerName || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const categoryOptions = Array.from(
    new Set(
      donations
        .map(d => String(d.sevaHead || d.sevaCategory || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  // Filter donations
  const filteredDonations = visibleDonations.filter(d => {
    const search = searchTerm.trim().toLowerCase();

    const searchableText = [
      d.donationId,
      d.donorName,
      d.email,
      d.sevaHead,
      d.sevaCategory,
      d.paymentReference,
      d.volunteerName
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch =
      !search || searchableText.includes(search);

    const normalizedStatus = String(d.paymentStatus || '')
      .trim()
      .toLowerCase();

    const matchesStatus =
      statusFilter === 'All' ||
      normalizedStatus === statusFilter.toLowerCase();

    const matchesMode =
      modeFilter === 'All' ||
      String(d.paymentMode || '').trim().toLowerCase() ===
        modeFilter.toLowerCase();

    const matchesVolunteer =
      isVolunteer
        ? String(d.volunteerName || '').trim() ===
          String(currentVolunteer?.volunteerName || '').trim()
        : (
            volunteerFilter === 'All' ||
            String(d.volunteerName || '').trim() === volunteerFilter
          );

    const donationCategory = String(
      d.sevaHead || d.sevaCategory || ''
    ).trim();

    const matchesCategory =
      categoryFilter === 'All' ||
      donationCategory === categoryFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesMode &&
      matchesVolunteer &&
      matchesCategory
    );
  });

  const handleExecuteConfirm = async () => {
    if (!confirmingDonation) return;

    setIsProcessingConfirm(true);
    setConfirmSuccessMsg('');
    setConfirmErrorMsg('');

    try {
      if (!onConfirmDonation) {
        throw new Error('Payment confirmation handler is unavailable.');
      }

      const result = await onConfirmDonation(
        confirmingDonation.donationId,
        selectedVolunteerForConfirm
      );

      if (!result?.success) {
        throw new Error(
          result?.error || 'Failed to confirm donation.'
        );
      }

      // ---------------------------------------------------------
      // PAYMENT CONFIRMED
      // ---------------------------------------------------------
      setConfirmSuccessMsg(
        `Payment confirmed for ${confirmingDonation.donorName}!`
      );

      // ---------------------------------------------------------
      // STAGE 2 — OPEN RECEIPT MODAL
      //
      // ReceiptModal will then execute:
      // Generate PDF → Stage 3 Save → Stage 4 Email
      // ---------------------------------------------------------
      if (result.donation) {
        onViewReceipt(result.donation);
      }

      setTimeout(() => {
        setIsProcessingConfirm(false);
        setConfirmSuccessMsg('');
        setConfirmingDonation(null);
      }, 1200);

    } catch (error: any) {

      console.error(
        'LIVE SHEET CONFIRMATION ERROR:',
        error
      );

      setConfirmErrorMsg(
        error?.message ||
        'Unable to confirm payment.'
      );

      setIsProcessingConfirm(false);
    }
  };

  const exportCsv = () => {
    const headers = [
      'Donation ID', 'Submitted At', 'Towards (Seva Head)', 'Donor Name', 'Email ID',
      'Amount (INR)', 'Payment Mode', 'Payment Status', 'Reference', 'Receipt URL',
      'Email Status', 'Email Message ID', 'Created At', 'Updated At',
      'Confirmation Code', 'Confirmed By', 'Seva Category', 'Seva Head'
    ];
    
    const rows = filteredDonations.map(d => [
      d.donationId,
      d.submittedAt,
      `"${(d.sevaHead || d.sevaCategory || 'General Seva').replace(/"/g, '""')}"`,
      `"${d.donorName.replace(/"/g, '""')}"`,
      d.email,
      d.amount,
      d.paymentMode,
      d.paymentStatus,
      d.paymentReference,
      d.receiptUrl,
      d.emailStatus,
      d.emailMessageId,
      d.createdAt,
      d.updatedAt,
      d.confirmationCode,
      `"${(d.volunteerName || '').replace(/"/g, '""')}"`,
      `"${(d.sevaCategory || '').replace(/"/g, '""')}"`,
      `"${(d.sevaHead || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SHREE_JAGANNATH_SEVA_TRUST_DONATIONS_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Live Donation Ledger Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">

          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 font-serif">
                  Live Donation Ledger
                </h2>

                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Connected
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Donations Master Sheet • Payment Verification &amp; Receipt Tracking
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">

            {onRefreshFromGoogleSheet && (
              <button
                type="button"
                onClick={handleRefreshLiveSheet}
                disabled={isRefreshing}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isRefreshing ? 'animate-spin' : ''
                  }`}
                />
                <span>
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={exportCsv}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <a
              href={spreadsheetUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Open Google Sheet</span>
              <ExternalLink className="w-3 h-3" />
            </a>

          </div>
        </div>

        {refreshMessage && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            {refreshMessage}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Multi-Filter Bar with Search, Status, Mode, Volunteer & Category Filter */}
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 space-y-3">
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Devotee, Email, ID, Seva Head, or 6-digit Code..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                />
              </div>

              <div className="text-xs text-slate-500 font-medium self-center">
                Showing <strong className="text-slate-900 font-mono">{filteredDonations.length}</strong> of {visibleDonations.length} records
              </div>
            </div>

            {/* Structured Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              
              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
                >
                  <option value="All">All Statuses</option>
                  <option value="Confirmation Pending">Confirmation Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Repayment">Repayment</option>
                  <option value="Repayment - Confirmation">Repayment - Confirmation</option>
                  <option value="Repayment - Dispute">Repayment - Dispute</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Mode Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Payment Mode</label>
                <select
                  value={modeFilter}
                  onChange={e => setModeFilter(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
                >
                  <option value="All">All Modes</option>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              {/* Volunteer Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Volunteer Filter</label>

                <select
                  value={
                    isVolunteer
                      ? String(currentVolunteer?.volunteerName || '')
                      : volunteerFilter
                  }
                  onChange={e => {
                    if (!isVolunteer) {
                      setVolunteerFilter(e.target.value);
                    }
                  }}
                  disabled={isVolunteer}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
                >

                {!isVolunteer && (
                  <option value="All">All Volunteers</option>
                )}

                {volunteerOptions.map(volunteer => (
                  <option key={volunteer} value={volunteer}>
                    {volunteer}
                  </option>
                ))}
                </select>
              </div>

              {/* Seva Category Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Seva Category</label>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
                >
                  <option value="All">All Categories</option>
                    {categoryOptions.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                </select>
              </div>

            </div>

          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Donation ID</th>
                  <th className="py-3 px-3">Towards / Seva</th>
                  <th className="py-3 px-3">Donor Name</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3 text-right">Amount (₹)</th>
                  <th className="py-3 px-3">Payment Mode</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Payment Reference</th>
                  <th className="py-3 px-3">Confirmed By</th>
                  <th className="py-3 px-3">Receipt</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-normal">
                {filteredDonations.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-slate-400 text-xs">
                      No donation records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredDonations.map(row => (
                    <tr
                      key={`${row.donationId}-${row.submittedAt}-${row.paymentReference}`}
                      className="hover:bg-amber-50/30 transition"
                    >
                      {/* Donation ID */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {row.donationId}
                      </td>

                      {/* Towards / Seva */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[10px]">
                          {row.sevaHead || row.sevaCategory || 'General Seva'}
                        </span>
                      </td>

                      {/* Donor Name */}
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {row.donorName || '—'}
                      </td>

                      {/* Email */}
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {row.email || '—'}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3 text-right font-black font-mono text-slate-900">
                        ₹{Number(row.amount || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                            row.paymentMode === 'UPI'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {row.paymentMode || '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.paymentStatus === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {row.paymentStatus === 'Paid' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}

                          <span>{row.paymentStatus || 'Confirmation Pending'}</span>
                        </span>
                      </td>

                      {/* Payment Reference */}
                      <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                        {row.paymentReference || '—'}
                      </td>

                      {/* Confirmed By / Volunteer Name */}
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {row.volunteerName ? (
                          <span className="bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200 font-bold text-[11px]">
                            {row.volunteerName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Receipt */}
                      <td className="py-3 px-3">
                        {row.receiptUrl ? (
                          <button
                            type="button"
                            onClick={() => onViewReceipt(row)}
                            className="px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>View Receipte</span>
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-center">

                        {/* TRUSTEE / ADMIN → VIEW ONLY */}
                        {!isViewOnlyRole && row.paymentStatus === 'Confirmation Pending' && (
                          <div className="flex items-center justify-center gap-1.5">

                            <button
                              type="button"
                              onClick={() => setConfirmingDonation(row)}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Confirm</span>
                            </button>

                            <button
                              type="button"
                              onClick={async () => {
                                if (!onRepayment) {
                                  alert('Repayment handler is not available.');
                                  return;
                                }

                                await onRepayment(row);
                              }}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              Repayment
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (onCancelDonation) {
                                  onCancelDonation(
                                    row.donationId,
                                    row.volunteerName || 'Trust Volunteer'
                                  );
                                }
                              }}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              Cancel
                            </button>

                          </div>
                        )}

                        {/* PAID → VIEW + SEND ONLY */}
                        {!isViewOnlyRole && row.paymentStatus === 'Paid' && (
                          <div className="flex items-center justify-center gap-1.5">

                            {onSendReceipt && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await onSendReceipt(row);
                                }}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                              >
                                Send Receipt
                              </button>
                            )}

                          </div>
                        )}

                        {/* CANCELLED → NO OPTIONS */}

                        {/* ALL OTHER STATUSES → NO OPTIONS */}

                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>Showing {filteredDonations.length} of {donations.length} records</span>
            <span className="text-[11px] text-slate-500 font-mono">
              Columns: A (Donation ID) → O (Confirmed by). Status (Col H: Pending / Paid), Confirmed by (Col O: filled only after verification)
            </span>
          </div>

        </div>
      

      {/* CONFIRM PAYMENT MODAL (DIRECT FROM LIVESHEET) */}
      {confirmingDonation && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Confirm Payment in LiveSheet</span>
              </div>
              <button
                onClick={() => setConfirmingDonation(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {confirmSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 text-center font-bold">
                {confirmSuccessMsg}
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Donation Details Preview */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Donation ID:</span>
                    <strong className="font-mono text-slate-900">{confirmingDonation.donationId}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Devotee Name:</span>
                    <strong className="text-slate-900">{confirmingDonation.donorName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <strong className="font-mono text-slate-900">{confirmingDonation.email}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount:</span>
                    <strong className="text-base font-black text-amber-950">₹{confirmingDonation.amount.toLocaleString('en-IN')}</strong>
                  </div>
                  {confirmingDonation.confirmationCode && (
                    <div className="flex justify-between items-center pt-1 border-t border-amber-200/60">
                      <span className="text-slate-500">6-Digit Code:</span>
                      <strong className="font-mono text-sm tracking-widest text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                        {confirmingDonation.confirmationCode}
                      </strong>
                    </div>
                  )}
                </div>
               

                {/* Modal Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDonation(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingConfirm}
                    onClick={handleExecuteConfirm}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isProcessingConfirm ? 'Confirming...' : 'Approve & Issue Receipt'}</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
