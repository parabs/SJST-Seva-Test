import React, { useState } from 'react';
import { 
  Users, 
  HandHeart, 
  Table, 
  Code2, 
  ShieldCheck, 
  Sparkles, 
  Info,
  ExternalLink,
  ChevronRight,
  Receipt,
  Building2,
  Mail,
  BarChart3,
  Phone,
  MessageSquare
} from 'lucide-react';

import { DonationRecord, VolunteerRecord, TrustConfig } from './types';
import {
  loadAppConfig,
  getConfiguredBackendUrl
} from './services/appConfig';
import { DonorForm } from './components/DonorForm';
import { VolunteerPortal } from './components/VolunteerPortal';
import { GoogleSheetView } from './components/GoogleSheetView';
import { CollectionsDashboard } from './components/CollectionsDashboard';
import { VolunteerManagementModal } from './components/VolunteerManagementModal';
import { CodeArtifacts } from './components/CodeArtifacts';
import { ReceiptModal } from './components/ReceiptModal';
import { EmailConfigView } from './components/EmailConfigView';
import { PublicDisplayDashboard } from './components/PublicDisplayDashboard';
import { TrustLogo } from './components/TrustLogo';
import { MaaDurgaWatermark } from './components/MaaDurgaWatermark';
import { useGmailAuth } from './context/GmailAuthContext';
import * as googleSheetsService from './services/googleSheetsService';

import { uploadReceiptToGoogleDrive } from './services/googleDriveService';
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  state = {
    hasError: false,
    errorMessage: ''
  };

  static getDerivedStateFromError(error: any) {
    return {
      hasError: true,
      errorMessage:
        error?.message ||
        String(error) ||
        'Unknown application error'
    };
  }

  componentDidCatch(error: any, errorInfo: React.ErrorInfo) {
    const message =
      error?.message ||
      String(error) ||
      'Unknown application error';

    console.error(
      'SJST APPLICATION ERROR:',
      error,
      errorInfo
    );

    alert(
      'SJST APPLICATION ERROR\n\n' +
      message +
      '\n\n' +
      'Please send this exact error message to Admin.'
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-white border border-red-200 rounded-2xl shadow-lg p-6">
            <div className="text-lg font-black text-red-700 mb-2">
              Application Error
            </div>

            <div className="text-sm text-slate-700 mb-4">
              The application encountered an unexpected error.
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-xs font-mono text-red-800 whitespace-pre-wrap break-words">
                {this.state.errorMessage}
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
function App() {
  const [trustConfig, setTrustConfig] = useState<TrustConfig>({
    name: '',
    regdNo: '',
    email: '',
    address: '',
    phone: '',
    panNo: '',
    section80G: '',
    bankName: '',
    accountName: '',
    accountNo: '',
    ifsc: '',
    branch: '',
    upiId: '',
    receiptsFolderId: ''
  });

  React.useEffect(() => {
    let isMounted = true;

    loadAppConfig()
      .then((config) => {
        if (!isMounted) return;

        const updatedTrustConfig: TrustConfig = {
          name: config.trust?.name || '',
          regdNo: config.trust?.regdNo || '',
          email: config.trust?.email || '',
          address: config.trust?.address || '',
          phone: config.trust?.phone || '',
          panNo: '',
          section80G: '',
          bankName: config.payment?.bankName || '',
          accountName: config.payment?.accountName || '',
          accountNo: config.payment?.accountNo || '',
          ifsc: config.payment?.ifsc || '',
          branch: config.payment?.branch || '',
          upiId: config.payment?.upiId || '',
          receiptsFolderId: ''
        };

        setTrustConfig(updatedTrustConfig);
      })
      .catch((error) => {
        console.error(
          'Unable to load Trust Configuration:',
          error
        );
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const [donations, setDonations] = useState<DonationRecord[]>(() => {
    // Return empty array to prevent loading old test cache
    return [];
  });

  const [volunteers, setVolunteers] = useState<VolunteerRecord[]>([]);

  const [dashboardCalculation, setDashboardCalculation] = useState<any[][]>([]);
  // Real Google & Gmail Auth Context
  const {
    isAuthenticated: isGmailAuthenticated,
    accessToken: googleAccessToken,
    sendDonationReceipt,
    loginWithGoogle
  } = useGmailAuth();

  // Navigation: Public Devotee Form, Public Display Dashboard, Authenticated Volunteer/Admin Portal, Email & Receipts Setup, Code & Setup
  const [activeView, setActiveView] =
  useState<'donor' | 'publicDashboard' | 'volunteer' | 'emailConfig' | 'code'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('resetPinToken') ? 'volunteer' : 'donor';
  });
  // Modals
  const [modalReceiptDonation, setModalReceiptDonation] = useState<DonationRecord | null>(null);
  const [isVolunteerManagementOpen, setIsVolunteerManagementOpen] = useState(false);

  const [isVolunteerDashboard, setIsVolunteerDashboard] = useState(false);

  // Quick statistics
  const pendingUpiCount = donations.filter(d => d.paymentMode === 'UPI' && d.paymentStatus === 'Confirmation Pending').length;
  const totalPaidCount = donations.filter(d => d.paymentStatus === 'Paid').length;
  const totalCollection = donations
    .filter(d => d.paymentStatus === 'Paid')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const refreshRequestRef = React.useRef(0);

    // ----------------------------------------------------
  // FETCH DASHBOARD CALCULATION
  // ----------------------------------------------------
  async function handleRefreshDashboardCalculation() {
    const result = await googleSheetsService.fetchDashboardCalculation(
      null
    );

    if (!result.success) {
      console.warn(
        'Failed to fetch dashboard calculation:',
        result.error
      );
      return;
    }

    setDashboardCalculation(result.values || []);
  }


  // ----------------------------------------------------
  // REFRESH / SYNC FROM GOOGLE SHEET
  // ----------------------------------------------------
  async function handleRefreshFromGoogleSheet(): Promise<{ count: number; error?: string }> {
    const requestId = ++refreshRequestRef.current;

    try {
      const donRes = await googleSheetsService.fetchDonationsFromGoogleSheet(
        googleAccessToken,
        undefined,
        'Donations'
      );

      if (!donRes.success) {
        return {
          count: 0,
          error: donRes.error || 'Failed to fetch Donations sheet'
        };
      }

      const freshList = donRes.donations || [];

      // Ignore an older request if a newer refresh has already started.
      if (requestId !== refreshRequestRef.current) {
        return { count: freshList.length };
      }

      setDonations(freshList);

      try {
        localStorage.setItem(
          'sjst_donations',
          JSON.stringify(freshList)
        );
      } catch (e) {}

      return { count: freshList.length };

    } catch (e: any) {
      return {
        count: 0,
        error: e.message || 'Failed to refresh from Google Sheet'
      };
    }
  }

  // ----------------------------------------------------
  // FETCH PENDING VERIFICATION QUEUE
  // ----------------------------------------------------
  async function handleRefreshPendingQueue() {
    return await googleSheetsService.fetchPendingVerificationQueue();
  }

  async function handleSendReceiptFromSheet(
    donation: DonationRecord
  ): Promise<void> {

    try {
      await fetch(
        await getConfiguredBackendUrl(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify({
            action: 'send_receipt',
            donationId: donation.donationId
          }),
          redirect: 'follow'
        }
      );
    } catch (err) {
      console.warn(
        'Receipt request response could not be read. Verifying from Google Sheet.',
        err
      );
    }

    // Refresh the live sheet after the backend request.
    // This avoids depending on the Apps Script browser response.
    const syncResult = await handleRefreshFromGoogleSheet();

    if (syncResult.error) {
      alert(
        `Receipt request was sent, but the Google Sheet could not be refreshed.\n\n${syncResult.error}`
      );
      return;
    }

    alert('Official receipt request sent successfully.');
  }

  const handleRepaymentFromSheet = async (
    donation: DonationRecord
  ): Promise<void> => {
    try {
      await fetch(
        await getConfiguredBackendUrl(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify({
            action: 'repayment',
            donationId: donation.donationId.trim()
          }),
          redirect: 'follow'
        }
      );
    } catch (err) {
      console.warn(
        'Repayment request response could not be read. Verifying from Google Sheet.',
        err
      );
    }

    const syncResult = await handleRefreshFromGoogleSheet();

    if (syncResult.error) {
      alert(
        `Repayment request was sent, but the Google Sheet could not be refreshed.\n\n${syncResult.error}`
      );
      return;
    }

    alert(
      `Donation ${donation.donationId} moved to Repayment.`
    );
  };

  const handleConfirmRepaymentFromSheet = async (
    donation: DonationRecord
  ): Promise<void> => {
    const activeVolunteer = (() => {
      try {
        const saved = sessionStorage.getItem('sjst_active_volunteer');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    })();

    const confirmedBy = activeVolunteer?.volunteerCode || '';
    const volunteerName = activeVolunteer?.volunteerName || '';

    try {
      await fetch(
        await getConfiguredBackendUrl(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify({
            action: 'confirm_repayment',
            donationId: donation.donationId.trim(),
            volunteerCode: confirmedBy,
            confirmedBy: confirmedBy,
            volunteerName
          }),
          redirect: 'follow'
        }
      );
    } catch (err) {
      console.warn(
        'Repayment confirmation response could not be read. Verifying from Google Sheet.',
        err
      );
    }

    const syncResult = await handleRefreshFromGoogleSheet();

    if (syncResult.error) {
      alert(
        `Repayment confirmation was sent, but the Google Sheet could not be refreshed.\n\n${syncResult.error}`
      );
      return;
    }

    alert(
      `Donation ${donation.donationId} confirmed and moved to Paid.`
    );
  };

  // Automatically pull live rows from the single master Donations sheet on load if authenticated
  React.useEffect(() => {
    if (activeView === 'volunteer') {
      // Load both Donations and Volunteers when the dashboard opens.
      handleRefreshFromGoogleSheet();
      handleRefreshVolunteers();
    }

    if (activeView === 'publicDashboard') {
      handleRefreshDashboardCalculation();
    }
  }, [activeView]);
  
  // DEVOTEE / DONOR SUBMISSION HANDLER
  const handleDonorSubmit = async (formData: {
    donorName: string;
    email: string;
    amount: number;
    paymentMode: 'Cash' | 'UPI';
    sevaCategory: string;
    sevaHead: string;
  }): Promise<DonationRecord> => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(donations.length + 1).padStart(4, '0');
    const donationId = `SJST-${dateStr}-${seq}`;
    
    const confirmationCode = String(Math.floor(100000 + Math.random() * 900000));
    const paymentStatus: 'Paid' | 'Confirmation Pending' = 'Confirmation Pending';
    const confirmedBy = '';
    const receiptUrl = '';
    const emailStatus: 'Pending' | 'Sent' | 'Not Required' | 'Failed' = formData.email ? 'Pending' : 'Not Required';
    const emailMessageId = '';

    const newRecord: DonationRecord = {
      donationId,
      submittedAt: new Date().toISOString(),
      donorName: formData.donorName,
      mobile: '',
      phone: '',
      email: formData.email,
      amount: formData.amount,
      paymentMode: formData.paymentMode,
      paymentStatus,
      paymentReference: formData.paymentMode === 'Cash' ? 'CASH-PENDING-VERIFY' : '',
      receiptUrl,
      emailStatus,
      emailMessageId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmationCode,
      confirmedBy,
      sevaCategory: formData.sevaCategory,
      sevaHead: formData.sevaHead
    };

    setDonations(prev => [newRecord, ...prev]);

    googleSheetsService.syncDonationToGoogleSheet(
      newRecord,
      googleAccessToken
    ).catch(err => {
      console.warn('Initial Google Sheet sync warning:', err);
    });

    return newRecord;
  };

  const handleVolunteerDirectDonation = async (formData: {
    donorName: string;
    email: string;
    amount: number;
    paymentMode: 'Cash' | 'UPI';
    sevaCategory: string;
    sevaHead: string;
    volunteerName: string;
    volunteerCode: string;
  }): Promise<DonationRecord> => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(donations.length + 1).padStart(4, '0');
    const donationId = `SJST-${dateStr}-${seq}`;
    const confirmationCode = '';
    const confirmedBy = formData.volunteerCode;
    const volunteerName = formData.volunteerName;
    const paymentStatus = 'Paid';
    const paymentReference = formData.paymentMode === 'Cash' ? 'CASH-COUNTER-DIRECT' : 'UPI-COUNTER-DIRECT';
    let driveReceiptUrl = `https://drive.google.com/file/d/receipt-${donationId}/view`;
    let emailStatus: 'Pending' | 'Sent' | 'Not Required' | 'Failed' = formData.email ? 'Pending' : 'Not Required';
    let emailMessageId = '';

    const newRecord: DonationRecord = {
      donationId,
      submittedAt: new Date().toISOString(),
      donorName: formData.donorName || 'Devotee',
      mobile: '',
      phone: '',
      email: formData.email || '',
      amount: formData.amount,
      paymentMode: formData.paymentMode,
      paymentStatus,
      paymentReference,
      receiptUrl: '',
      emailStatus,
      emailMessageId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmationCode,
      confirmedBy,
      volunteerName,
      sevaCategory: formData.sevaCategory,
      sevaHead: formData.sevaHead
    };

 // Official receipt and email are now handled by Google Apps Script.
// Do not generate/upload/send anything from the frontend.

    setDonations(prev => [newRecord, ...prev]);

    googleSheetsService.syncDonationToGoogleSheet(
      newRecord,
      googleAccessToken,
      undefined,
      { directVolunteerEntry: true }
    ).catch(err => {
      console.error('VOLUNTEER SHEET SYNC ERROR:', err);
    });

    return newRecord;
  };
  
    const handleVolunteerVerify = async (
    confirmationCode: string,
    volunteerCode: string,
    volunteerName: string
    ): Promise<{
      success: boolean;
      donation?: DonationRecord;
      error?: string;
    }> => {
      const cleanCode = confirmationCode.trim();

      try {
        const result = await googleSheetsService.verifyDonationByPin(
          cleanCode,
          volunteerCode,
          volunteerName
        );

        if (!result.success) {
          return {
            success: false,
            error:
              result.error ||
              `PIN or ID "${confirmationCode}" not found in records.`
          };
        }

        const updatedRecord: DonationRecord = {
          ...result.donation,
          paymentStatus: 'Paid',
          confirmedBy: volunteerCode,
          volunteerName,
          confirmationCode: '',
          receiptUrl: result.receiptUrl || result.donation?.receiptUrl || '',
          updatedAt: new Date().toISOString()
        };


        setDonations(prev =>
          prev.map(d =>
            d.donationId === updatedRecord.donationId
              ? updatedRecord
              : d
          )
        );

        return {
          success: true,
          donation: updatedRecord
        };
      } catch (err: any) {
        console.error('VOLUNTEER VERIFICATION ERROR:', err);

        return {
          success: false,
          error:
            err?.message ||
            'Network or processing error during verification.'
        };
      }
    };

  
     
  const handleAddVolunteer = (newVolunteer: VolunteerRecord) => {
    setVolunteers(prev => [...prev, newVolunteer]);
  };

  const handleRefreshVolunteers = async () => {
    const result = await googleSheetsService.fetchVolunteers();

    //alert('VOLUNTEER REFRESH RESULT:\n\n' + JSON.stringify(result, null, 2));
    if (!result.success || !result.volunteers) {
      console.error(
        'VOLUNTEER REFRESH ERROR:',
        result.error || 'Unable to load volunteers.'
      );
      return;
    }

    setVolunteers(
      result.volunteers.map(v => ({
        volunteerCode: v.volunteerCode,
        volunteerName: v.volunteerName,
        authCode: '',
        status: v.status as 'Created' | 'Active' | 'Closed',
        phone: v.phone,
        email: v.email,
        role: v.role,
        verifiedSeva: v.verifiedSeva ?? 0
      }))

    );
  };

  const handleEditVolunteer = (updatedVolunteer: VolunteerRecord) => {
    setVolunteers(prev => prev.map(v => 
      v.volunteerCode === updatedVolunteer.volunteerCode ? updatedVolunteer : v
    ));
  };

  const handleResetPassword = (volunteerCode: string, newAuthCode: string) => {
    setVolunteers(prev => prev.map(v => {
      if (v.volunteerCode === volunteerCode) {
        return { ...v, authCode: newAuthCode };
      }
      return v;
    }));
  };

  const handleConfirmDonationFromSheet = async (
    donationId: string,
    volunteerName: string
  ) => {

    const target = donations.find(d => d.donationId === donationId);

    if (!target) {
      return {
        success: false,
        error: 'Donation not found.'
      };
    }

    // Get the logged-in volunteer from session
    let volunteerCode = '';
    let confirmedVolunteerName = volunteerName || '';

    try {
      const saved = sessionStorage.getItem('sjst_active_volunteer');

      if (saved) {
        const parsed = JSON.parse(saved);

        volunteerCode = String(
          parsed?.volunteerCode || ''
        ).trim().toUpperCase();

        confirmedVolunteerName = String(
          parsed?.volunteerName || volunteerName || ''
        ).trim();
      }
    } catch (err) {
      console.warn(
        'Unable to read active volunteer session:',
        err
      );
    }

    if (!volunteerCode) {
      return {
        success: false,
        error: 'Active volunteer session not found.'
      };
    }

    try {

      const response = await fetch(
        await getConfiguredBackendUrl(),
        {
          method: 'POST',

          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },

          body: JSON.stringify({
            action: 'confirm_sheet_donation',
            donationId: donationId.trim(),
            volunteerCode,
            confirmedBy: volunteerCode,
            volunteerName: confirmedVolunteerName
          }),

          redirect: 'follow'
        }
      );

      const result = await response.json();

      if (!result.success) {
        return result;
      }

      const updatedRecord: DonationRecord = {
        ...target,
        paymentStatus: 'Paid',
        confirmedBy: volunteerCode,
        volunteerName: confirmedVolunteerName,
        confirmationCode: '',
        receiptUrl: result.receiptUrl || '',
        emailStatus: result.emailStatus || 'Not Required',
        updatedAt: new Date().toISOString()
      };

      setDonations(prev =>
        prev.map(d =>
          d.donationId === donationId
            ? updatedRecord
            : d
        )
      );

      return {
        ...result,
        donation: updatedRecord
      };

    } catch (err: any) {

      console.error(
        'SHEET CONFIRMATION ERROR:',
        err
      );

      return {
        success: false,
        error:
          err?.message ||
          'Network error during donation confirmation.'
      };
    }
  };

  const handleCancelDonationFromSheet = async (
    donationId: string,
    volunteerName: string
  ) => {
    const target = donations.find(d => d.donationId === donationId);

    if (!target) {
      return {
        success: false,
        error: 'Donation not found.'
      };
    }

    const cancelledBy = (() => {
      try {
        const saved = sessionStorage.getItem('sjst_active_volunteer');
        const parsed = saved ? JSON.parse(saved) : null;
        return parsed?.volunteerCode || '';
      } catch {
        return '';
      }
    })();

    try {
      await fetch(
        await getConfiguredBackendUrl(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify({
            action: 'cancel_donation',
            donationId: donationId.trim(),
            volunteerCode: cancelledBy,
            cancelledBy: cancelledBy
          }),
          redirect: 'follow'
        }
      );
    } catch (err: any) {
      console.warn(
        'Cancellation request response could not be read. Verifying from Google Sheet.',
        err
      );
    }

    /*
    * Apps Script may complete the cancellation successfully even when
    * the browser reports "Failed to fetch".
    *
    * Therefore, refresh the actual Google Sheet and use that as the
    * source of truth for the UI.
    */
    const syncResult = await handleRefreshFromGoogleSheet();

    if (syncResult.error) {
      return {
        success: false,
        error: syncResult.error
      };
    }

    return {
      success: true,
      donationId: donationId,
      paymentStatus: 'Cancelled',
      cancelledBy: cancelledBy
    };
  };

  return (
    <div className="min-h-screen bg-amber-50/30 text-slate-900 flex flex-col font-sans relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden select-none">
        <MaaDurgaWatermark opacity={0.06} size="full" />
      </div>
      
          {/* Top Navbar */}
            {!isVolunteerDashboard && (
            <header className="bg-white border-b border-amber-200/60 sticky top-0 z-30 shadow-xs">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <TrustLogo className="w-11 h-11" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 text-sm sm:text-base leading-none font-serif">
                        {trustConfig.name}
                      </span>
                      <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                        Regd: {trustConfig.regdNo}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>Direct UPI &amp; Cash Seva Collection</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline font-mono font-semibold text-amber-900">UPI: {trustConfig.upiId}</span>
                    </p>
                  </div>
                </div>

                <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto max-w-full">
                  <button
                    onClick={() => setActiveView('donor')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                      activeView === 'donor'
                        ? 'bg-amber-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <HandHeart className="w-4 h-4" />
                    <span className="hidden sm:inline">Devotee Form</span>
                    <span className="sm:hidden">Devotee</span>
                  </button>

                  <button
                    onClick={() => setActiveView('publicDashboard')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                      activeView === 'publicDashboard'
                        ? 'bg-amber-800 text-white shadow-xs'
                        : 'text-amber-900 bg-amber-100/70 hover:bg-amber-100 border border-amber-300/60'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="hidden sm:inline">Public Display Dashboard</span>
                    <span className="sm:hidden">Public Display</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </button>

                  <button
                    onClick={() => setActiveView('volunteer')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition relative shrink-0 cursor-pointer ${
                      activeView === 'volunteer'
                        ? 'bg-amber-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Volunteer &amp; Management Portal</span>
                    <span className="sm:hidden">Volunteer Portal</span>
                    {pendingUpiCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                        {pendingUpiCount}
                      </span>
                    )}
                  </button>

                  
                </nav>
              </div>
            </header>
          )}
        

      {/* Main Content Area */}
      <main className={
          isVolunteerDashboard
            ? "flex-1 w-full px-0 py-0"
            : "flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8"
        }
      >
        {activeView === 'donor' && (
          <div className="space-y-6">
            
            <DonorForm
              trustConfig={trustConfig}
              donations={donations}
              volunteers={volunteers}
              onSubmitDonation={handleDonorSubmit}
              onViewReceipt={d => setModalReceiptDonation(d)}
              onVerifyDonation={async (code, volunteerCode, volunteerName) => {
                const res = await handleVolunteerVerify(
                  code,
                  volunteerCode,
                  volunteerName
                );

                if (res.success && res.donation) {
                  setModalReceiptDonation(res.donation);
                }

                return res;
              }}
            />
          </div>
        )}

        {activeView === 'publicDashboard' && (
          <div className="space-y-6">
            <PublicDisplayDashboard
              donations={donations}
              trustConfig={trustConfig}
              dashboardCalculation={dashboardCalculation}
              onOpenDonorForm={() => setActiveView('donor')}
              onOpenVolunteerLogin={() => setActiveView('volunteer')}
            />
          </div>
        )}

        {activeView === 'volunteer' && (
          <div className="space-y-6">
            <VolunteerPortal
              volunteers={volunteers}
              donations={donations}
              trustConfig={trustConfig}
              onDashboardModeChange={setIsVolunteerDashboard}
              onVerifyDonation={handleVolunteerVerify}
              onDirectDonationSubmit={handleVolunteerDirectDonation}
              onViewReceipt={d => setModalReceiptDonation(d)}
              onConfirmDonationFromSheet={handleConfirmDonationFromSheet}
              onSendReceipt={handleSendReceiptFromSheet}
              onRepayment={handleRepaymentFromSheet} 
              onConfirmRepayment={handleConfirmRepaymentFromSheet}        
              onCancelDonationFromSheet={handleCancelDonationFromSheet}
              onRefreshFromGoogleSheet={handleRefreshFromGoogleSheet}
              onRefreshPendingQueue={handleRefreshPendingQueue}
              onUpdateTrustConfig={upd => setTrustConfig(prev => ({ ...prev, ...upd }))}
              onOpenVolunteerManagement={() => {
                setIsVolunteerManagementOpen(true);
              }}
            />
          </div>
        )}

        {activeView === 'emailConfig' && (
          <div className="space-y-6">
            <EmailConfigView
              trustConfig={trustConfig}
              onUpdateTrustConfig={upd => setTrustConfig(prev => ({ ...prev, ...upd }))}
              recentDonations={donations}
              onViewReceipt={d => setModalReceiptDonation(d)}
            />
          </div>
        )}

        {activeView === 'code' && (
          <CodeArtifacts />
        )}
      </main>


      <footer className="mt-auto bg-slate-900 text-slate-300 border-t border-slate-800 py-5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-1.5">

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-300 text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Digital Donation Solution</span>
          </div>

          <div className="text-sm font-semibold text-slate-100 font-serif">
            Designed &amp; developed by <strong className="text-amber-400">Sachin Parab</strong>
          </div>

          <div className="text-sm font-bold text-amber-300 font-serif">
            Your Challenge. My Solution.
          </div>

          <div className="pt-2 text-[10px] text-slate-500">
            © {new Date().getFullYear()} Shree Jagannath Seva Trust, Thane • Autonomous Live Integration
          </div>

        </div>
      </footer>
      
      {modalReceiptDonation && (
        <ReceiptModal
          donation={modalReceiptDonation}
          trustConfig={trustConfig}
          volunteers={volunteers}
          onVerifyDonation={async (
            code,
            volunteerCode,
            volunteerName
          ) => {

            const res = await handleVolunteerVerify(
              code,
              volunteerCode,
              volunteerName
            );

            if (res.success && res.donation) {
              setModalReceiptDonation(res.donation);
            }

            return res;
          }}
          onClose={() => setModalReceiptDonation(null)}
        />
      )}

      {isVolunteerManagementOpen && (
        <VolunteerManagementModal
          volunteers={volunteers}
          donations={donations}
          onAddVolunteer={handleAddVolunteer}
          onEditVolunteer={handleEditVolunteer}
          onResetPassword={handleResetPassword}
          onRefreshVolunteers={handleRefreshVolunteers}
          onClose={() => setIsVolunteerManagementOpen(false)}
        />
      )}
    </div>
  );
}

export default function AppWithErrorBoundary() {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}
