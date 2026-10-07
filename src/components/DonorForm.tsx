import React, { useState, useRef } from 'react';
import { 
  Heart, 
  QrCode, 
  Banknote, 
  ShieldCheck, 
  Mail, 
  Phone,
  CheckCircle2, 
  Copy, 
  Check, 
  Receipt, 
  Sparkles,
  Building2,
  ChevronDown,
  Info,
  Clock,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  Loader2,
  UserCheck,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { DonationRecord, TrustConfig, SevaCategory, SevaOption, VolunteerRecord } from '../types';
import { SEVA_CATEGORIES, numberToWordsInr } from '../data/mockData';
import { TrustLogo } from './TrustLogo';
import { useGmailAuth } from '../context/GmailAuthContext';
import { syncDonationToGoogleSheet, TARGET_SPREADSHEET_ID } from '../services/googleSheetsService';

interface DonorFormProps {
  trustConfig: TrustConfig;
  donations: DonationRecord[];
  volunteers?: VolunteerRecord[];
  onSubmitDonation: (data: {
    donorName: string;
    email: string;
    amount: number;
    paymentMode: 'Cash' | 'UPI';
    sevaCategory: string;
    sevaHead: string;
  }) => Promise<DonationRecord>;
  onViewReceipt: (donation: DonationRecord) => void;
  onVerifyDonation?: (
    confirmationCode: string,
    volunteerName: string
  ) => Promise<{ success: boolean; donation?: DonationRecord; error?: string }>;
}

export function DonorForm({
  trustConfig,
  donations,
  volunteers = [],
  onSubmitDonation,
  onViewReceipt,
  onVerifyDonation
}: DonorFormProps) {
  const { isAuthenticated, accessToken, loginWithGoogle } = useGmailAuth();

  // Form State
  const [donorName, setDonorName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('General Seva');
  const [selectedSeva, setSelectedSeva] = useState<string>('annadana-5001');
  const [amount, setAmount] = useState<number>(5001);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI'>('UPI');
  
  // Submission result state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedDonation, setSubmittedDonation] = useState<DonationRecord | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusCheckMsg, setStatusCheckMsg] = useState<string | null>(null);

  // Sound and Alert State
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const hasPlayedChimeRef = useRef(false);
  
  // Google Sheet manual push state
  const [isPushingSheet, setIsPushingSheet] = useState(false);
  const [sheetPushResult, setSheetPushResult] = useState<string | null>(null);

  // REACTIVE REAL-TIME SYNC: Update submittedDonation whenever donations prop changes or verification event arrives
  React.useEffect(() => {
    if (!submittedDonation) return;

    const currentId = submittedDonation.donationId;
    const match = donations.find(d => d.donationId === currentId);
    if (match && match.paymentStatus !== submittedDonation.paymentStatus) {
      setSubmittedDonation(match);
      if (match.paymentStatus === 'Paid') {
        setStatusCheckMsg(`🎉 Verified & Confirmed by ${match.confirmedBy || 'Mandap Volunteer'}! Your official 80G tax receipt is ready.`);
      }
    }
  }, [donations, submittedDonation?.donationId, submittedDonation?.paymentStatus]);

  // Cross-tab real-time sync with BroadcastChannel and custom events (no aggressive polling loop)
  React.useEffect(() => {
    if (!submittedDonation) return;
    const currentId = submittedDonation.donationId;

    const checkStoredDonation = () => {
      try {
        const saved = localStorage.getItem('sjst_donations');
        if (saved) {
          const list: DonationRecord[] = JSON.parse(saved);
          const match = list.find(d => d.donationId === currentId);
          if (match && match.paymentStatus === 'Paid' && submittedDonation.paymentStatus !== 'Paid') {
            setSubmittedDonation(match);
            setStatusCheckMsg(`🎉 Verified & Confirmed by ${match.confirmedBy || 'Mandap Volunteer'}! Your receipt is ready.`);
          }
        }
      } catch (e) {}
    };

    const handleVerifiedCustomEvent = (event: any) => {
      const verifiedDonation = event.detail as DonationRecord;
      if (verifiedDonation && verifiedDonation.donationId === currentId) {
        setSubmittedDonation(verifiedDonation);
        setStatusCheckMsg(`🎉 Verified & Confirmed by ${verifiedDonation.confirmedBy || 'Mandap Volunteer'}! Your receipt is ready.`);
      }
    };

    window.addEventListener('sjst_donation_verified', handleVerifiedCustomEvent);
    
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('sjst_donations_channel');
        channel.onmessage = (event) => {
          if (event.data?.type === 'DONATION_VERIFIED') {
            const vDon = event.data?.donation as DonationRecord | undefined;
            if (vDon && vDon.donationId === currentId) {
              setSubmittedDonation(vDon);
              setStatusCheckMsg(`🎉 Verified & Confirmed by ${vDon.confirmedBy || 'Mandap Volunteer'}! Your receipt is ready.`);
            } else {
              checkStoredDonation();
            }
          }
        };
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('sjst_donation_verified', handleVerifiedCustomEvent);
      if (channel) channel.close();
    };
  }, [submittedDonation?.donationId, submittedDonation?.paymentStatus]);

  // Push directly to Google Sheet
  const handleSyncToGoogleSheet = async () => {
    if (!submittedDonation) return;
    setIsPushingSheet(true);
    setSheetPushResult(null);

    try {
      const res = await syncDonationToGoogleSheet(submittedDonation, accessToken);
      if (res.success) {
        setSheetPushResult(`✓ ${res.message || 'Synced to Google Sheet!'}`);
      } else {
        setSheetPushResult(`Sync Note: ${res.error || res.message}`);
      }
    } catch (e: any) {
      setSheetPushResult(`Error: ${e.message}`);
    } finally {
      setIsPushingSheet(false);
    }
  };

  // Check confirmation status manually
  const handleCheckStatus = () => {
    if (!submittedDonation) return;
    setIsCheckingStatus(true);
    setStatusCheckMsg(null);

    setTimeout(() => {
      // Re-read latest from props or localStorage
      let latest = donations.find(d => d.donationId === submittedDonation.donationId);
      if (!latest) {
        try {
          const saved = localStorage.getItem('sjst_donations');
          if (saved) {
            const list: DonationRecord[] = JSON.parse(saved);
            latest = list.find(d => d.donationId === submittedDonation.donationId);
          }
        } catch (e) {}
      }

      setIsCheckingStatus(false);

      if (latest && latest.paymentStatus === 'Paid') {
        setSubmittedDonation(latest);
        setStatusCheckMsg('🎉 Confirmed! Your official receipt is ready.');
        // Automatically open the receipt modal
        onViewReceipt(latest);
      } else {
        setStatusCheckMsg('⏳ Offering is still Pending. Volunteer has not verified the 6-digit PIN yet.');
      }
    }, 500);
  };

  // Category changed
  const handleCategoryChange = (catName: string) => {
    setSelectedCategory(catName);
    const catObj = SEVA_CATEGORIES.find(c => c.category === catName);
    if (catObj && catObj.items.length > 0) {
      setSelectedSeva(catObj.items[0].id);
      setAmount(catObj.items[0].amount);
    } else {
      setSelectedSeva('custom');
    }
  };

  // Seva item changed
  const handleSevaChange = (sevaId: string) => {
    setSelectedSeva(sevaId);
    if (sevaId === 'custom') return;
    
    const catObj = SEVA_CATEGORIES.find(c => c.category === selectedCategory);
    const item = catObj?.items.find(i => i.id === sevaId);
    if (item) {
      setAmount(item.amount);
    }
  };

  // Find names for submission
  const currentCategoryObj = SEVA_CATEGORIES.find(c => c.category === selectedCategory);
  const currentSevaItem = currentCategoryObj?.items.find(i => i.id === selectedSeva);
  const sevaHeadName = selectedSeva === 'custom' ? 'General Seva' : (currentSevaItem?.name || 'Seva');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName.trim()) {
      alert('Please enter the donor / contributor name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      alert('Please enter a valid email address for receipt delivery.');
      return;
    }
    if (amount <= 0 || isNaN(amount)) {
      alert('Please enter a valid donation amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const record = await onSubmitDonation({
        donorName: donorName.trim(),
        email: email.trim(),
        amount: Number(amount),
        paymentMode,
        sevaCategory: selectedCategory,
        sevaHead: sevaHeadName
      });
      setSubmittedDonation(record);
    } catch (err) {
        console.error('DONATION SUBMISSION ERROR:', err);
        alert('Error submitting donation record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmittedDonation(null);
    setDonorName('');
    setEmail('');
    setSelectedCategory('General Seva');
    setSelectedSeva('annadana-5001');
    setAmount(5001);
    setPaymentMode('UPI');
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(trustConfig.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const currentUpiAmount = submittedDonation ? submittedDonation.amount : amount;
  const upiQrString = `upi://pay?pa=${trustConfig.upiId}&pn=${encodeURIComponent(trustConfig.accountName)}&am=${currentUpiAmount}&cu=INR`;
  const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiQrString)}&margin=4`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Clean Trust Header Banner with Divine Emblem & Complete Address */}
      <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-950/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          {/* Jagannath Official Sacred Trust Logo */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white p-1.5 border-2 border-amber-400 shadow-md flex items-center justify-center shrink-0">
            <TrustLogo className="w-full h-full" />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="inline-flex flex-wrap items-center justify-center sm:justify-start gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-amber-200 border border-white/15">
              <span>🙏 ॥ जय जगन्नाथ ॥</span>
              <span>•</span>
              <span>Regd. No.: {trustConfig.regdNo}</span>
              <span>•</span>
              <span>Email: {trustConfig.email}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-serif">
              {trustConfig.name}
            </h1>
            <p className="text-xs sm:text-sm text-amber-100/90 max-w-2xl leading-relaxed">
              {trustConfig.address || ''}
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div>
        
        {submittedDonation ? (
          /* SUBMISSION RESULT & PAYMENT STEP */
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            {/* CONFIRMATION STEP (FOR BOTH CASH & UPI) */}
            <div className="space-y-6">
              
              {/* Step Banner */}
              {/* Step Banner - Dynamic Confirmed vs Pending */}
              {submittedDonation.paymentStatus === 'Paid' ? (
                <div className="p-6 rounded-2xl bg-emerald-950 text-white border-2 border-emerald-400/50 shadow-lg shadow-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-emerald-500 text-white shrink-0 shadow-sm">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-bold border border-emerald-400/30 uppercase tracking-wider mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Verified &amp; Confirmed</span>
                      </div>
                      <h3 className="font-black text-xl text-white font-serif">
                        Offering Confirmed by Volunteer!
                      </h3>
                      <p className="text-xs sm:text-sm text-emerald-100/90 mt-1">
                        Verified by <strong className="text-white">{submittedDonation.confirmedBy || 'Mandap Volunteer'}</strong>. Your Official Receipt <span className="font-mono font-bold text-amber-300">#{submittedDonation.donationId}</span> is ready!
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onViewReceipt(submittedDonation)}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-black text-sm transition shadow-lg flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                  >
                    <Receipt className="w-5 h-5" />
                    <span>View Official Receipt</span>
                  </button>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-amber-700 text-white shrink-0">
                    {submittedDonation.paymentMode === 'Cash' ? (
                      <Banknote className="w-6 h-6" />
                    ) : (
                      <QrCode className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-amber-950">
                      {submittedDonation.paymentMode === 'Cash' 
                        ? 'Cash Offering Registered — Volunteer Verification Required'
                        : 'UPI Payment & Volunteer Verification Step'}
                    </h3>
                    <p className="text-xs sm:text-sm text-amber-800 mt-1">
                      {submittedDonation.paymentMode === 'Cash'
                        ? <>Please hand over cash offering of <strong>₹{submittedDonation.amount.toLocaleString('en-IN')}</strong> to the Mandap Cash Counter or any volunteer, and share your <strong>6-digit verification PIN</strong> below to issue the official 80G receipt.</>
                        : <>Complete your payment of <strong>₹{submittedDonation.amount.toLocaleString('en-IN')}</strong> using the Mandap UPI QR Code or Bank Details below, then show your <strong>6-digit confirmation code</strong> to any volunteer.</>
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Step 1 & Step 2 Container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left: Handover Instructions for Cash OR QR & Bank Details for UPI */}
                {submittedDonation.paymentMode === 'Cash' ? (
                  <div className="bg-gradient-to-b from-amber-50/70 to-orange-50/50 rounded-2xl p-6 border border-amber-200 text-left space-y-4">
                    <div className="inline-block px-3 py-1 bg-amber-200 text-amber-950 rounded-full text-xs font-black uppercase tracking-wider">
                      Step 1: Cash Counter Handover
                    </div>

                    <div className="space-y-3 pt-1">
                      <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-amber-200">
                        <div className="w-6 h-6 rounded-full bg-amber-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          1
                        </div>
                        <div className="text-xs text-slate-700">
                          <strong className="text-slate-900 block font-serif">Hand over cash offering</strong>
                          Amount: <span className="font-black text-amber-950 font-mono text-sm">₹{submittedDonation.amount.toLocaleString('en-IN')}/-</span> to the volunteer counter.
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-amber-200">
                        <div className="w-6 h-6 rounded-full bg-amber-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          2
                        </div>
                        <div className="text-xs text-slate-700">
                          <strong className="text-slate-900 block font-serif">Provide 6-Digit PIN</strong>
                          Share the 6-digit confirmation PIN on the right with the volunteer.
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-amber-200">
                        <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          3
                        </div>
                        <div className="text-xs text-slate-700">
                          <strong className="text-slate-900 block font-serif">Instant 80G Receipt Issuance</strong>
                          Your official receipt will be generated and emailed to <span className="font-mono font-medium text-slate-900">{submittedDonation.email}</span>.
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 text-[11px] text-amber-900/80 font-mono bg-amber-100/50 p-2.5 rounded-lg border border-amber-200">
                      Trust: {trustConfig.name} • Regd: {trustConfig.regdNo}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-b from-amber-50/70 to-orange-50/50 rounded-2xl p-6 border border-amber-200 text-center space-y-4">
                    <div className="inline-block px-3 py-1 bg-amber-200 text-amber-950 rounded-full text-xs font-black uppercase tracking-wider">
                      Step 1: Scan &amp; Pay ₹{submittedDonation.amount.toLocaleString('en-IN')}
                    </div>

                    <div className="bg-white p-3 rounded-2xl inline-block border border-amber-200 shadow-xs">
                      <img src={dynamicQrUrl} alt="UPI QR" className="w-44 h-44 mx-auto" />
                    </div>

                    <div className="text-xs text-slate-600">
                      Scan with <strong>GPay, PhonePe, Paytm, BHIM</strong> or any UPI App
                    </div>

                    {/* Official Bank Details on Payment Step */}
                    <div className="bg-white rounded-xl p-4 border border-amber-200 text-left space-y-2 text-xs shadow-2xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100">
                        <Building2 className="w-3.5 h-3.5 text-amber-800" />
                        <span>Trust Bank Account Details</span>
                      </div>
                      <div className="space-y-1 text-slate-700">
                        <div><span className="text-slate-400">Bank:</span> <strong>{trustConfig.bankName}</strong></div>
                        <div><span className="text-slate-400">Account Name:</span> <strong className="text-slate-900">{trustConfig.accountName}</strong></div>
                        <div><span className="text-slate-400">Account No:</span> <strong className="font-mono text-slate-900">{trustConfig.accountNo}</strong></div>
                        <div><span className="text-slate-400">IFSC:</span> <strong className="font-mono text-slate-900">{trustConfig.ifsc}</strong></div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span><span className="text-slate-400">UPI ID:</span> <strong className="font-mono text-amber-950">{trustConfig.upiId}</strong></span>
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold transition"
                          >
                            {copiedUpi ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* Right: 6-Digit Code & Status */}
                <div className="space-y-5 flex flex-col justify-between">
                  
                  <div className={`rounded-2xl p-6 border-2 text-center space-y-4 shadow-xs transition-all ${
                    submittedDonation.paymentStatus === 'Paid' 
                      ? 'bg-emerald-50/60 border-emerald-300' 
                      : 'bg-white border-dashed border-amber-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        submittedDonation.paymentStatus === 'Paid'
                          ? 'bg-emerald-800 text-white'
                          : 'bg-amber-900 text-white'
                      }`}>
                        {submittedDonation.paymentStatus === 'Paid' ? '✅ Step 2: Verification Complete' : 'Step 2: Show PIN to Volunteer'}
                      </div>

                      {/* Sound Alert Toggle */}
                      <button
                        type="button"
                        onClick={() => setIsSoundMuted(!isSoundMuted)}
                        className={`p-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                          isSoundMuted ? 'bg-slate-100 border-slate-300 text-slate-500' : 'bg-amber-100 border-amber-300 text-amber-900'
                        }`}
                        title={isSoundMuted ? "Sound muted. Click to enable chime." : "Sound chime active. Click to mute."}
                      >
                        {isSoundMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5 text-amber-700" />}
                        <span className="hidden sm:inline">{isSoundMuted ? 'Muted' : 'Sound On'}</span>
                      </button>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                        {submittedDonation.paymentStatus === 'Paid' ? 'Verified Confirmation Code' : 'Your 6-Digit Confirmation PIN'}
                      </div>
                      <div className={`text-5xl font-black font-mono tracking-widest my-3 ${
                        submittedDonation.paymentStatus === 'Paid' ? 'text-emerald-800 line-through decoration-emerald-500' : 'text-amber-900'
                      }`}>
                        {submittedDonation.confirmationCode}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(submittedDonation.confirmationCode)}
                        className="inline-flex items-center gap-1.5 text-xs text-amber-900 hover:text-amber-950 font-bold bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-lg border border-amber-200 transition cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Code Copied!' : 'Copy Code'}</span>
                      </button>
                    </div>

                    <div className={`rounded-xl p-3.5 border text-xs space-y-1.5 text-left ${
                      submittedDonation.paymentStatus === 'Paid'
                        ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                        : 'bg-amber-50 border-amber-200 text-amber-950'
                    }`}>
                      <div className="font-bold flex items-center gap-1.5">
                        {submittedDonation.paymentStatus === 'Paid' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        ) : (
                          <Info className="w-4 h-4 text-amber-700 shrink-0" />
                        )}
                        <span>80G Tax Receipt &amp; Email Delivery:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {submittedDonation.paymentStatus === 'Paid' ? (
                          <>Your donation has been confirmed by <strong>{submittedDonation.confirmedBy || 'Mandap Volunteer'}</strong>. The final 80G tax receipt has been generated and dispatched to <strong>{submittedDonation.email}</strong>.</>
                        ) : (
                          <>Your offering is currently <strong>Pending Volunteer Confirmation</strong>. Once verified at the Mandap, your <strong>Official 80G Tax Receipt</strong> will be finalized and emailed to <strong>{submittedDonation.email}</strong>.</>
                        )}
                      </p>
                    </div>

                    {/* Devotee Next Step Instructions (Volunteer Verification happens at Mandap Counter) */}
                    {submittedDonation.paymentStatus !== 'Paid' && (
                      <div className="mt-4 p-4 bg-amber-50/80 rounded-xl border border-amber-200/90 text-left space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-amber-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                            3
                          </span>
                          <span className="text-xs font-bold text-amber-950">
                            Next Step: Show PIN at Mandap Counter
                          </span>
                        </div>

                        <p className="text-[12px] text-slate-700 leading-relaxed pl-8">
                          Please show this 6-digit confirmation PIN (<strong className="font-mono text-amber-950">{submittedDonation.confirmationCode}</strong>) to the counter volunteer. Once verified, your donation will be marked Confirmed and your 80G tax receipt will be sent automatically.
                        </p>

                        <div className="pt-2 pl-8 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCheckStatus}
                            disabled={isCheckingStatus}
                            className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            {isCheckingStatus ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5 text-amber-200" />
                            )}
                            <span>Check Verification Status</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary Card */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Devotee Name:</span>
                      <strong className="text-slate-900">{submittedDonation.donorName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Seva Head:</span>
                      <strong className="text-slate-900">{submittedDonation.sevaHead}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Mode:</span>
                      <strong className="text-slate-900 uppercase font-bold">{submittedDonation.paymentMode}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Amount:</span>
                      <strong className="text-amber-950 font-bold">₹{submittedDonation.amount.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Receipt Status:</span>
                      {submittedDonation.paymentStatus === 'Paid' ? (
                        <span className="text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[11px] border border-emerald-300 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Confirmed &amp; Issued
                        </span>
                      ) : (
                        <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded text-[11px] border border-rose-200 animate-pulse">
                          ⏳ Confirmation Pending
                        </span>
                      )}
                    </div>

                    {/* Google Sheet Live Sync Status */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Google Sheet:</span>
                        <span className="font-mono text-emerald-800 font-semibold truncate max-w-[120px]">
                          {isAuthenticated ? 'Connected' : 'Local Master'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSyncToGoogleSheet}
                        disabled={isPushingSheet}
                        className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-800 px-2.5 py-1 rounded font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Force sync record to Google Sheet (Form Responses 1 & Donations)"
                      >
                        {isPushingSheet ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3 text-emerald-700" />}
                        <span>Sync Now</span>
                      </button>
                    </div>

                    {sheetPushResult && (
                      <div className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 p-1.5 rounded border border-emerald-200 mt-1">
                        {sheetPushResult}
                      </div>
                    )}
                  </div>

                </div>

              </div>

              {/* Dynamic Status Feedback message */}
              {statusCheckMsg && (
                <div className={`p-3 rounded-xl text-xs font-semibold border text-center animate-in fade-in duration-150 ${
                  submittedDonation.paymentStatus === 'Paid'
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    : 'bg-amber-100 text-amber-950 border-amber-300'
                }`}>
                  {statusCheckMsg}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={resetForm}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                >
                  ← Make Another Donation
                </button>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                  {submittedDonation.paymentStatus !== 'Paid' && (
                    <button
                      onClick={handleCheckStatus}
                      disabled={isCheckingStatus}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      {isCheckingStatus ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Checking with Volunteer Counter...</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>I Have Paid / Check Status</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => onViewReceipt(submittedDonation)}
                    className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                      submittedDonation.paymentStatus === 'Paid'
                        ? 'bg-amber-800 hover:bg-amber-900 text-white ring-2 ring-amber-400/50'
                        : 'bg-amber-700 hover:bg-amber-800 text-white'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>
                      {submittedDonation.paymentStatus === 'Paid'
                        ? 'Generate & Print Official 80G Receipt'
                        : 'View Provisional Slip (Pending Verification)'}
                    </span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* CLEAN DONATION INPUT FORM */
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 font-serif">
                Devotee Contribution Form
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Please complete this form to process your donation towards sacred temple seva &amp; community initiatives.
              </p>
            </div>

            {/* Contributor Contact Details */}
            <div className="space-y-4">
              {/* Contributor Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Contributor / Devotee Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sachin Parab / Arun Kumar"
                  value={donorName}
                  onChange={e => setDonorName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-700 text-sm font-medium text-slate-900 bg-slate-50/50"
                />
              </div>

              {/* Email Address (Mandatory for digital receipt delivery) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Email ID (For Receipt) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="e.g. devotee@gmail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-700 text-sm font-medium text-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>
            </div>

            {/* Seva Category & Head Selector */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Towards (Seva Head / Category) <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-amber-800 font-semibold">
                  {SEVA_CATEGORIES.length} Categories
                </span>
              </div>

              {/* Dropdown Selector for all Seva Heads */}
              <div className="relative">
                <select
                  value={selectedSeva}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setSelectedCategory('Custom / Other Seva');
                      setSelectedSeva('custom');
                    } else {
                      for (const cat of SEVA_CATEGORIES) {
                        const itm = cat.items.find(i => i.id === val);
                        if (itm) {
                          setSelectedCategory(cat.category);
                          setSelectedSeva(itm.id);
                          setAmount(itm.amount);
                          break;
                        }
                      }
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-700 text-sm font-semibold text-slate-900 bg-slate-50/50 appearance-none cursor-pointer"
                >
                  {SEVA_CATEGORIES.map(cat => (
                    <optgroup key={cat.category} label={cat.category}>
                      {cat.items.map(item => (
                        <option key={item.id} value={item.id}>
                          {cat.category}: {item.name} — ₹{item.amount.toLocaleString('en-IN')}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <optgroup label="Other">
                    <option value="custom">Custom / Other Seva Amount</option>
                  </optgroup>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              {/* Category Filter Chips */}
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Or Filter by Category:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SEVA_CATEGORIES.map(cat => (
                    <button
                      key={cat.category}
                      type="button"
                      onClick={() => handleCategoryChange(cat.category)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        selectedCategory === cat.category
                          ? 'bg-amber-800 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.category}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('Custom / Other Seva')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedCategory === 'Custom / Other Seva'
                        ? 'bg-amber-800 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Custom / Other Seva
                  </button>
                </div>
              </div>

              {/* Sub-items for selected category */}
              {selectedCategory !== 'Custom / Other Seva' && currentCategoryObj && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {currentCategoryObj.items.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSevaChange(item.id)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                        selectedSeva === item.id
                          ? 'border-amber-700 bg-amber-50/70 text-amber-950 font-bold ring-1 ring-amber-700'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                      }`}
                    >
                      <span className="text-xs">{item.name}</span>
                      <span className="font-mono text-xs font-black text-amber-900">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Donation Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Donation Amount (INR ₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-800 font-bold">
                  ₹
                </div>
                <input
                  type="number"
                  min="1"
                  required
                  value={amount || ''}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-700 text-base font-bold text-slate-900 bg-slate-50/50 font-mono"
                />
              </div>
              {amount > 0 && (
                <p className="text-[11px] text-amber-900 font-medium italic mt-1.5">
                  In words: {numberToWordsInr(amount)}
                </p>
              )}
            </div>

            {/* Payment Mode Selection */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Payment Mode <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMode('UPI')}
                  className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition cursor-pointer ${
                    paymentMode === 'UPI'
                      ? 'border-amber-700 bg-amber-50/70 text-amber-950 font-bold shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${paymentMode === 'UPI' ? 'bg-amber-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold">Direct UPI / QR Code</div>
                    <div className="text-[11px] text-slate-500 font-normal">Shows QR &amp; Bank details in Step 2</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('Cash')}
                  className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition cursor-pointer ${
                    paymentMode === 'Cash'
                      ? 'border-emerald-700 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${paymentMode === 'Cash' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold">Cash at Counter</div>
                    <div className="text-[11px] text-slate-500 font-normal">Instant receipt, no bank details</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-sm shadow-md shadow-amber-900/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Processing Contribution...</span>
              ) : (
                <>
                  <Heart className="w-4 h-4 fill-current" />
                  <span>
                    {paymentMode === 'Cash'
                      ? `Submit Cash Seva (₹${amount.toLocaleString('en-IN')})`
                      : `Proceed to UPI Payment (₹${amount.toLocaleString('en-IN')})`}
                  </span>
                </>
              )}
            </button>

          </form>
        )}

      </div>

    </div>
  );
}
