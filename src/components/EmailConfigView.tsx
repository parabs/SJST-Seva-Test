import React, { useState, useEffect, useRef } from 'react';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  Building2, 
  User, 
  FileText, 
  ShieldCheck, 
  Sparkles, 
  Copy, 
  Check, 
  AlertCircle, 
  Clock, 
  Eye, 
  Settings, 
  Lock, 
  KeyRound, 
  RefreshCw, 
  Unlink, 
  LogIn, 
  ExternalLink,
  HelpCircle,
  Laptop,
  Plus,
  Trash2,
  Edit3,
  Tag,
  Upload,
  Image as ImageIcon,
  RotateCcw
} from 'lucide-react';
import { TrustConfig, DonationRecord, GmailAuthConfig } from '../types';
import { useGmailAuth } from '../context/GmailAuthContext';
import { MaaDurgaWatermark } from './MaaDurgaWatermark';

interface EmailConfigViewProps {
  trustConfig: TrustConfig;
  onUpdateTrustConfig: (updated: Partial<TrustConfig>) => void;
  recentDonations: DonationRecord[];
  onViewReceipt: (donation: DonationRecord) => void;
}

interface SenderProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  isDefault?: boolean;
}

const INITIAL_SENDER_PROFILES: SenderProfile[] = [
  {
    id: 'trust-official',
    email: 'shreejagannathsevatrust.thane@gmail.com',
    name: 'SHREE JAGANNATH SEVA TRUST, THANE',
    role: 'Official Trust Dispatch Account'
  },
  {
    id: 'accounts-desk',
    email: 'accounts.sjst.thane@gmail.com',
    name: 'SJST Accounts & Receipt Cell',
    role: 'Finance & 80G Tax Exemption Desk'
  }
];

export function EmailConfigView({
  trustConfig,
  onUpdateTrustConfig,
  recentDonations,
  onViewReceipt
}: EmailConfigViewProps) {
  const { 
    accessToken, 
    userProfile, 
    isAuthenticated: isGoogleConnected, 
    isLoading: isGoogleAuthLoading, 
    error: googleAuthError, 
    loginWithGoogle, 
    logout: logoutGoogle,
    sendDonationReceipt,
    clientId
  } = useGmailAuth();

  // Manage Dynamic Sender Profiles
  const [senderProfiles, setSenderProfiles] = useState<SenderProfile[]>(() => {
    const saved = localStorage.getItem('sjst_sender_profiles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_SENDER_PROFILES;
      }
    }
    return INITIAL_SENDER_PROFILES;
  });

  // Current Active Sender Information
  const currentAuth = trustConfig.gmailAuth || {
    senderEmail: userProfile?.email || trustConfig.email || 'shreejagannathsevatrust.thane@gmail.com',
    senderName: userProfile?.name || trustConfig.name || 'SHREE JAGANNATH SEVA TRUST',
    authMethod: 'google_oauth' as const,
    isAuthenticated: isGoogleConnected,
    authenticatedAt: new Date().toISOString(),
    replyToEmail: userProfile?.email || trustConfig.email || 'shreejagannathsevatrust.thane@gmail.com',
    dailyQuotaUsed: 14,
    dailyQuotaLimit: 500
  };

  const [senderEmail, setSenderEmail] = useState(userProfile?.email || currentAuth.senderEmail);
  const [senderDisplayName, setSenderDisplayName] = useState(userProfile?.name || currentAuth.senderName);
  const [replyToEmail, setReplyToEmail] = useState(userProfile?.email || currentAuth.replyToEmail || currentAuth.senderEmail);
  const [subjectPrefix, setSubjectPrefix] = useState('[SJST-Receipt]');
  const [subjectTemplate, setSubjectTemplate] = useState('Official Donation Receipt - {{TRUST_NAME}} [{{RECEIPT_NO}}]');
  const [customMessage, setCustomMessage] = useState(
    'May Lord Jagannath, Balabhadra, and Devi Subhadra bless you and your family with divine peace, health, and prosperity.'
  );

  // New Profile Form modal/state
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [newProfileEmail, setNewProfileEmail] = useState('');
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileRole, setNewProfileRole] = useState('Trust Member');

  // UI status states
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Test email states
  const [testRecipient, setTestRecipient] = useState(userProfile?.email || 'shreejagannathsevatrust.thane@gmail.com');
  const [testAmount, setTestAmount] = useState(5001);
  const [testSevaHead, setTestSevaHead] = useState('Anna Dana');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSentSuccess, setTestSentSuccess] = useState(false);
  const [testLogs, setTestLogs] = useState<Array<{
    id: string;
    from: string;
    to: string;
    subject: string;
    amount: number;
    timestamp: string;
    status: string;
    messageId?: string;
  }>>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Master Trust Branding & Watermark (Admin Only)
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const [masterWatermark, setMasterWatermark] = useState<string | null>(() => {
    return localStorage.getItem('sjst_custom_watermark') || null;
  });

  const handleUploadWatermark = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPEG or PNG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        localStorage.setItem('sjst_custom_watermark', dataUrl);
        setMasterWatermark(dataUrl);
        window.dispatchEvent(new Event('storage'));
        setSaveStatus('✅ Sacred Watermark (Watermark.jpeg) uploaded and permanently set for all receipts!');
        setTimeout(() => setSaveStatus(null), 5000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetWatermark = () => {
    localStorage.removeItem('sjst_custom_watermark');
    setMasterWatermark(null);
    window.dispatchEvent(new Event('storage'));
    setSaveStatus('Default Maa Durga sacred art watermark restored.');
    setTimeout(() => setSaveStatus(null), 4000);
  };

  // Auto-sync Google Profile when logged in
  useEffect(() => {
    if (isGoogleConnected && userProfile?.email) {
      setSenderEmail(userProfile.email);
      setSenderDisplayName(userProfile.name || senderDisplayName);
      setReplyToEmail(userProfile.email);
      
      // Auto-save to trust config
      onUpdateTrustConfig({
        email: userProfile.email,
        gmailAuth: {
          ...currentAuth,
          senderEmail: userProfile.email,
          senderName: userProfile.name || senderDisplayName,
          isAuthenticated: true,
          authenticatedAt: new Date().toISOString()
        }
      });
    }
  }, [isGoogleConnected, userProfile]);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Select sender profile and sync directly with trustConfig
  const handleSelectProfile = (profile: SenderProfile) => {
    setSenderEmail(profile.email);
    setSenderDisplayName(profile.name);
    setReplyToEmail(profile.email);

    const updatedGmailAuth: GmailAuthConfig = {
      ...currentAuth,
      senderEmail: profile.email,
      senderName: profile.name,
      replyToEmail: profile.email,
      isAuthenticated: isGoogleConnected
    };

    onUpdateTrustConfig({
      email: profile.email,
      gmailAuth: updatedGmailAuth
    });

    setSaveStatus(`Active sender profile switched to "${profile.name}" (${profile.email}).`);
    setTimeout(() => setSaveStatus(null), 4000);
  };

  // Add custom profile
  const handleAddCustomProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileEmail || !newProfileEmail.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    if (!newProfileName) {
      alert('Please enter a display name.');
      return;
    }

    const newProfile: SenderProfile = {
      id: `custom-${Date.now()}`,
      email: newProfileEmail.trim(),
      name: newProfileName.trim(),
      role: newProfileRole.trim()
    };

    const updatedProfiles = [...senderProfiles, newProfile];
    setSenderProfiles(updatedProfiles);
    localStorage.setItem('sjst_sender_profiles', JSON.stringify(updatedProfiles));

    // Also select it
    handleSelectProfile(newProfile);

    // Reset form
    setNewProfileEmail('');
    setNewProfileName('');
    setNewProfileRole('Trust Member');
    setShowAddProfileModal(false);
  };

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (senderProfiles.length <= 1) {
      alert('At least one sender profile must exist.');
      return;
    }
    const updated = senderProfiles.filter(p => p.id !== id);
    setSenderProfiles(updated);
    localStorage.setItem('sjst_sender_profiles', JSON.stringify(updated));
    if (senderEmail === senderProfiles.find(p => p.id === id)?.email && updated[0]) {
      handleSelectProfile(updated[0]);
    }
  };

  // Save Gmail Sender Configuration to App State
  const handleSaveConfiguration = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const updatedGmailAuth: GmailAuthConfig = {
      senderEmail: (userProfile?.email || senderEmail).trim(),
      senderName: (userProfile?.name || senderDisplayName).trim(),
      authMethod: 'google_oauth',
      isAuthenticated: isGoogleConnected,
      authenticatedAt: new Date().toISOString(),
      replyToEmail: replyToEmail.trim(),
      dailyQuotaUsed: currentAuth.dailyQuotaUsed || 14,
      dailyQuotaLimit: 500
    };

    onUpdateTrustConfig({
      email: (userProfile?.email || senderEmail).trim(),
      gmailAuth: updatedGmailAuth
    });

    setSaveStatus(`✅ Gmail Sender Configuration saved! Receipts will be dispatched from ${userProfile?.email || senderEmail}`);
    setTimeout(() => setSaveStatus(null), 5000);
  };

  // Handle Real Google Sign-in
  const handleConnectRealGoogle = async () => {
    try {
      setSendError(null);
      await loginWithGoogle();
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Failed to connect Google account');
    }
  };

  const handleDisconnectGmail = async () => {
    await logoutGoogle();
    const updatedGmailAuth: GmailAuthConfig = {
      ...currentAuth,
      isAuthenticated: false
    };
    onUpdateTrustConfig({ gmailAuth: updatedGmailAuth });
    setSaveStatus('⚠️ Gmail Sender Account disconnected.');
    setTimeout(() => setSaveStatus(null), 4000);
  };

  const sampleReceiptNo = 'SJST-2026-0089';
  const resolvedSubject = `${subjectPrefix} ${subjectTemplate
    .replace('{{TRUST_NAME}}', userProfile?.name || senderDisplayName)
    .replace('{{RECEIPT_NO}}', sampleReceiptNo)}`;

  // Send Test Receipt (Calls Real Gmail API when Google is connected)
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    if (!testRecipient || !testRecipient.includes('@')) {
      setSendError('Please enter a valid recipient email address.');
      return;
    }

    if (!isGoogleConnected || !accessToken) {
      setSendError('Please click "Authenticate Sender with Google Account" above to authorize Gmail API dispatch.');
      return;
    }

    setIsSendingTest(true);
    setTestSentSuccess(false);

    // Mock dummy donation record for test
    const dummyDonation: DonationRecord = {
      donationId: sampleReceiptNo,
      submittedAt: new Date().toISOString(),
      donorName: 'SHREE JAGANNATH SEVA TRUST',
      email: testRecipient.trim(),
      amount: testAmount,
      paymentMode: 'UPI',
      paymentStatus: 'Paid',
      paymentReference: 'UPI-TEST-998822',
      receiptUrl: `https://drive.google.com/file/d/receipt-${sampleReceiptNo}/view`,
      emailStatus: 'Sent',
      emailMessageId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmationCode: '749201',
      confirmedBy: `${userProfile?.name || senderDisplayName} (Verified Admin)`,
      sevaCategory: 'General Seva',
      sevaHead: testSevaHead
    };

    const result = await sendDonationReceipt(dummyDonation, trustConfig, {
      senderEmail: userProfile?.email || senderEmail,
      senderName: userProfile?.name || senderDisplayName,
      customBlessing: customMessage,
      subjectPrefix
    });

    setIsSendingTest(false);

    if (result.success) {
      setTestSentSuccess(true);
      const newLog = {
        id: `MSG-${Date.now().toString().slice(-4)}`,
        from: `${userProfile?.name || senderDisplayName} <${userProfile?.email || senderEmail}>`,
        to: testRecipient,
        subject: resolvedSubject,
        amount: testAmount,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: 'Delivered via Gmail API',
        messageId: result.messageId
      };
      setTestLogs(prev => [newLog, ...prev]);
    } else {
      setSendError(result.error || 'Failed to dispatch email via Gmail API.');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto font-sans">
      
      {/* Top Banner with Connection Status */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-900/30 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
              <Mail className="w-3.5 h-3.5" />
              <span>Trust Administration &amp; Receipt Configuration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-serif">
              Master Branding &amp; Dispatch Setup
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Manage the hardcoded Watermark image, trust branding, and authenticate Google account for automated 80G tax receipt dispatch.
            </p>
          </div>

          {/* Connection Status Badge */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-xs space-y-2.5 shrink-0 w-full sm:w-80 shadow-lg">
            <div className="text-amber-300 font-bold uppercase tracking-wider text-[11px] flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Connection Status</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full ${isGoogleConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`} />
                <span className={`font-bold text-[10px] uppercase ${isGoogleConnected ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {isGoogleConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            <div className="font-mono font-bold text-white text-xs break-all bg-black/40 px-3 py-2 rounded-xl border border-white/10 flex items-center justify-between gap-2">
              <span className="truncate">{userProfile?.email || senderEmail}</span>
              {isGoogleConnected && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-white/10">
              <span>Scope: <strong className="text-amber-200">gmail.send</strong></span>
              <span className="font-mono text-emerald-300 text-[10px]">OAuth 2.0 Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* MASTER SACRED WATERMARK CONFIGURATION (ADMIN ONLY) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shadow-xs">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-slate-900 text-base sm:text-lg">Master Watermark Configuration</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                  Hardcoded • Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Volunteers cannot edit or change the watermark. All 80G receipts automatically render this image as the background.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={watermarkInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadWatermark}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => watermarkInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center gap-2 transition shadow-xs cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Custom Image (Watermark.jpeg)</span>
            </button>

            {masterWatermark && (
              <button
                type="button"
                onClick={handleResetWatermark}
                title="Reset to default sacred art"
                className="px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Instructions & Preview Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Left: How to upload explanation */}
          <div className="md:col-span-7 space-y-3.5">
            <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200/80 space-y-2.5 text-xs text-amber-950">
              <div className="font-bold flex items-center gap-2 text-amber-900">
                <span>📌 How to set your custom watermark:</span>
              </div>
              <ul className="space-y-2 pl-4 list-disc text-[11px] leading-relaxed text-amber-900">
                <li>
                  <strong>Option 1 (Direct Upload):</strong> Click the <strong>&quot;Upload Custom Image (Watermark.jpeg)&quot;</strong> button above and select your image. It is immediately saved as the hardcoded master watermark for all receipts.
                </li>
                <li>
                  <strong>Option 2 (Project File):</strong> Place your image named <code className="bg-white/80 px-1.5 py-0.5 rounded font-mono text-[10px] border border-amber-300">Watermark.jpeg</code> in the project&apos;s <code className="bg-white/80 px-1.5 py-0.5 rounded font-mono text-[10px] border border-amber-300">/public/images/</code> directory.
                </li>
                <li>
                  <strong>Volunteer Lock:</strong> Volunteers have zero access to watermark/logo controls; the receipt generation engine automatically binds this watermark.
                </li>
              </ul>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Current Status: <strong>{masterWatermark ? 'Custom Image Active' : 'Default Maa Durga Sacred Art Active (/images/Watermark.jpeg)'}</strong></span>
            </div>
          </div>

          {/* Right: Live Preview Box */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200 bg-slate-50 relative overflow-hidden">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Watermark Live Background Preview
            </div>
            
            <div className="w-44 h-44 rounded-xl bg-white border border-slate-200 shadow-inner flex items-center justify-center p-2 relative overflow-hidden">
              <MaaDurgaWatermark opacity={0.45} size="sm" customImageUrl={masterWatermark || undefined} />
              <div className="absolute inset-x-0 bottom-2 text-center pointer-events-none">
                <span className="text-[9px] font-mono font-bold bg-black/60 text-white px-2 py-0.5 rounded-full">
                  Receipt Opacity: 22%
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Notification Banner */}
      {saveStatus && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveStatus}</span>
          </div>
          <button 
            onClick={() => setSaveStatus(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* CORE SENDER CONFIGURATION & AUTHENTICATION SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Sender Gmail Setup & Auth (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shadow-xs">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-base">Sender Account &amp; OAuth Authentication</h2>
                  <p className="text-xs text-slate-500">Authorize Google Account &amp; Manage Sender Profiles</p>
                </div>
              </div>

              {/* Status Indicator */}
              {isGoogleConnected ? (
                <div className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-300 flex items-center gap-2 shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Google Connected</span>
                </div>
              ) : (
                <div className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-800 font-bold text-xs border border-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Not Connected</span>
                </div>
              )}
            </div>

            {/* Real Google Account OAuth Handshake Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border border-amber-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white shadow-xs flex items-center justify-center p-1.5 border border-slate-200">
                    <svg viewBox="0 0 24 24" className="w-full h-full">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">Google OAuth 2.0 Handshake</div>
                    <div className="text-[11px] text-slate-500">Client ID: <span className="font-mono text-slate-700">{clientId ? `${clientId.slice(0, 16)}...apps.googleusercontent.com` : 'Configured'}</span></div>
                  </div>
                </div>

                <span className="text-[11px] font-mono font-semibold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg">
                  Scope: gmail.send
                </span>
              </div>

              {isGoogleConnected && userProfile ? (
                <div className="p-4 bg-white rounded-xl border border-emerald-200 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    {userProfile.picture ? (
                      <img src={userProfile.picture} alt="Profile" className="w-10 h-10 rounded-full border-2 border-emerald-300" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-amber-700 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                        {userProfile.name[0] || 'G'}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <span>{userProfile.name}</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                      </div>
                      <div className="font-mono text-xs text-slate-600">{userProfile.email}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDisconnectGmail}
                    className="px-3.5 py-2 rounded-xl text-rose-700 hover:bg-rose-50 border border-rose-200 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>
              ) : (
                <div className="pt-2 space-y-3">
                  <button
                    type="button"
                    onClick={handleConnectRealGoogle}
                    disabled={isGoogleAuthLoading}
                    className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>{isGoogleAuthLoading ? 'Authenticating with Google Account...' : 'Authenticate Sender with Google Account'}</span>
                  </button>

                  <p className="text-[11px] text-slate-500 text-center">
                    Authenticating opens a standard Google Sign-In popup to grant receipt sending permission.
                  </p>
                </div>
              )}

              {googleAuthError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{googleAuthError}</span>
                </div>
              )}
            </div>

            {/* DYNAMIC SENDER PROFILES & PREFIX SECTION */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Sender Email Profiles:
                  </label>
                  <p className="text-[11px] text-slate-500">Select which email identity should be stored in trustConfig</p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddProfileModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Profile</span>
                </button>
              </div>

              {/* Profiles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {senderProfiles.map(profile => {
                  const isSelected = senderEmail === profile.email;
                  return (
                    <div
                      key={profile.id}
                      onClick={() => handleSelectProfile(profile)}
                      className={`p-3.5 rounded-2xl border text-left transition relative cursor-pointer group ${
                        isSelected
                          ? 'border-amber-600 bg-amber-50/90 ring-2 ring-amber-700/20 shadow-xs'
                          : 'border-slate-200 hover:border-amber-300 bg-slate-50/70 hover:bg-amber-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ${
                            isSelected ? 'bg-amber-800 text-white' : 'bg-slate-800 text-white'
                          }`}>
                            {profile.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs text-slate-900 truncate">{profile.name}</div>
                            <div className="font-mono text-[10px] text-slate-600 truncate">{profile.email}</div>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-amber-700 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 italic truncate">{profile.role}</span>
                        {senderProfiles.length > 1 && !profile.isDefault && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteProfile(profile.id, e)}
                            className="text-slate-400 hover:text-rose-600 transition p-0.5 opacity-0 group-hover:opacity-100"
                            title="Delete profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SENDER & SUBJECT PREFIX SETTINGS */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <Tag className="w-4 h-4 text-amber-700" />
                <span>Subject &amp; Trust Email Prefix</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Subject Line Prefix:
                  </label>
                  <input
                    type="text"
                    value={subjectPrefix}
                    onChange={(e) => setSubjectPrefix(e.target.value)}
                    placeholder="e.g. [SJST-Receipt] or [SJST-Thane]"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Prepended to all outgoing receipt email subjects</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Reply-To Address:
                  </label>
                  <input
                    type="email"
                    value={replyToEmail}
                    onChange={(e) => setReplyToEmail(e.target.value)}
                    placeholder="shreejagannathsevatrust.thane@gmail.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Replies from donors will be routed here</span>
                </div>
              </div>
            </div>

            {/* Custom Devotee Blessing Message */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Custom Devotee Blessing Message:
              </label>
              <textarea
                rows={2}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveConfiguration}
                className="w-full sm:w-auto py-3 px-6 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Sender Configuration to Trust State</span>
              </button>

              <span className="text-[11px] text-slate-500">
                Active in Trust: <strong className="text-slate-800">{trustConfig.email}</strong>
              </span>
            </div>

          </div>

        </div>

        {/* Right Column: Live Dispatch Test & Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Master Sacred Watermark & Branding (Admin Only) */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-amber-200/80 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Master Receipt Watermark</h3>
                  <p className="text-[10px] text-slate-500">Admin Only • Hardcoded across all receipts</p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                {masterWatermark ? 'Custom Image Active' : 'Default Sacred Art'}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Upload your custom idol photo (e.g. <strong>Watermark.jpeg</strong>) to set the fixed background watermark for all 80G tax receipts. Volunteers will not see or edit this.
            </p>

            {/* Current Watermark Preview */}
            <div className="relative rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4 flex items-center justify-center h-44 overflow-hidden">
              <MaaDurgaWatermark 
                opacity={0.35} 
                size="receipt" 
                customImageUrl={masterWatermark || undefined} 
              />
              <div className="absolute bottom-2 right-2 text-[10px] font-mono bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                {masterWatermark ? 'Custom Watermark.jpeg' : 'Default Maa Durga Art'}
              </div>
            </div>

            {/* Upload & Reset Controls */}
            <div className="flex items-center gap-2 pt-1">
              <input
                ref={watermarkInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadWatermark}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => watermarkInputRef.current?.click()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>{masterWatermark ? 'Change Watermark Image' : 'Upload Watermark.jpeg'}</span>
              </button>

              {masterWatermark && (
                <button
                  type="button"
                  onClick={handleResetWatermark}
                  title="Reset to default Maa Durga artwork"
                  className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
              )}
            </div>
          </div>

          {/* Test Gmail Dispatch Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Send Real Live Test Email</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Live Gmail API
              </span>
            </div>

            <form onSubmit={handleSendTest} className="space-y-4 text-xs">
              
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Recipient Devotee Email:
                </label>
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="shreejagannathsevatrust.thane@gmail.com"
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Seva Head:
                  </label>
                  <select
                    value={testSevaHead}
                    onChange={(e) => setTestSevaHead(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                  >
                    <option value="Anna Dana">Anna Dana</option>
                    <option value="Murti Seva">Murti Seva</option>
                    <option value="Rath Yatra Mahotsav">Rath Yatra Mahotsav</option>
                    <option value="Maa Durga Bhog Seva">Maa Durga Bhog Seva</option>
                    <option value="Temple Trust General Fund">General Trust Fund</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Offering Amount:
                  </label>
                  <input
                    type="number"
                    value={testAmount}
                    onChange={(e) => setTestAmount(Number(e.target.value))}
                    min="1"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              {sendError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-2.5">
                  <div className="font-bold flex items-center justify-between text-rose-900">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Dispatch Error / Auth Required</span>
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-800">{sendError}</p>
                  
                  <button
                    type="button"
                    onClick={handleConnectRealGoogle}
                    className="w-full py-2 px-3 rounded-xl bg-rose-900 hover:bg-rose-950 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Authenticate / Reconnect Google Account Now</span>
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isSendingTest}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSendingTest ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching via Gmail REST API...</span>
                  </span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Live Receipt to {testRecipient.slice(0, 18)}...</span>
                  </>
                )}
              </button>
            </form>

            {/* Test Success Confirmation */}
            {testSentSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs space-y-2.5 animate-in fade-in">
                <div className="font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Receipt Dispatched to Devotee Inbox!</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded font-mono font-bold">
                    HTTP 200 OK
                  </span>
                </div>
                <div className="text-[11px] text-emerald-800 space-y-1">
                  <div><strong>From:</strong> {userProfile?.name || senderDisplayName} &lt;{userProfile?.email || senderEmail}&gt;</div>
                  <div><strong>To:</strong> {testRecipient}</div>
                  <div><strong>Subject:</strong> {resolvedSubject}</div>
                  <div><strong>Status:</strong> Dispatched via official Google Gmail API. Check <em>{testRecipient}</em>.</div>
                </div>

                <div className="pt-2 flex items-center gap-2 border-t border-emerald-200">
                  <button
                    type="button"
                    onClick={() => onViewReceipt({
                      donationId: sampleReceiptNo,
                      submittedAt: new Date().toISOString(),
                      donorName: 'SHREE JAGANNATH SEVA TRUST',
                      email: testRecipient,
                      amount: testAmount,
                      paymentMode: 'UPI',
                      paymentStatus: 'Paid',
                      paymentReference: 'UPI-TEST-998822',
                      receiptUrl: `https://drive.google.com/file/d/receipt-${sampleReceiptNo}/view`,
                      emailStatus: 'Sent',
                      emailMessageId: `msg-${Date.now()}@gmail.com`,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      confirmationCode: '749201',
                      confirmedBy: `${userProfile?.name || senderDisplayName} (Verified Admin)`,
                      sevaCategory: 'General Seva',
                      sevaHead: testSevaHead
                    })}
                    className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview Official 80G PDF Receipt</span>
                  </button>
                </div>
              </div>
            )}

            {/* Test Log history */}
            {testLogs.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Recent Dispatches in this Session:
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {testLogs.map(log => (
                    <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">To: {log.to} (₹{log.amount})</div>
                        <div className="text-[10px] text-slate-500 font-mono">{log.timestamp} • {log.status}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                        Sent
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Devotee Inbox Preview Box */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-700" />
              <span>Devotee Inbox View Preview</span>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
              <div className="bg-slate-100 px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 truncate">{resolvedSubject}</span>
                <span className="text-[10px] text-slate-500">Inbox</span>
              </div>
              <div className="p-3.5 space-y-2 bg-white">
                <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 pb-2">
                  <span><strong>From:</strong> {userProfile?.name || senderDisplayName} &lt;{userProfile?.email || senderEmail}&gt;</span>
                  <span>Just now</span>
                </div>
                <p className="text-slate-800 leading-relaxed text-[11px]">
                  🙏 <strong>Jay Jagannath! Namaste Devotee,</strong><br/>
                  Thank you for your pious offering of <strong>₹{testAmount.toLocaleString('en-IN')}/-</strong> towards <strong>{testSevaHead}</strong>.
                </p>
                <div className="p-2 rounded-lg bg-amber-50 text-amber-900 italic text-[10px]">
                  &ldquo;{customMessage}&rdquo;
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-semibold">
                  🏛️ 80G Tax Exemption Certificate: Deductible under Sec 80G of Income Tax Act 1961.
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ADD CUSTOM PROFILE MODAL */}
      {showAddProfileModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-700" />
                <h3 className="font-bold text-slate-900 text-base">Add Custom Sender Profile</h3>
              </div>
              <button 
                onClick={() => setShowAddProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Sender Email Address:
                </label>
                <input
                  type="email"
                  value={newProfileEmail}
                  onChange={(e) => setNewProfileEmail(e.target.value)}
                  placeholder="e.g. secretary.sjst@gmail.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Display Name:
                </label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g. Temple Secretary (SHREE JAGANNATH SEVA TRUST)"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Role / Description:
                </label>
                <input
                  type="text"
                  value={newProfileRole}
                  onChange={(e) => setNewProfileRole(e.target.value)}
                  placeholder="e.g. Trustee / Puja Committee"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProfileModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold transition shadow-sm cursor-pointer"
                >
                  Save &amp; Select Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
