import React, { useRef, useState, useEffect } from 'react';
import { getConfiguredBackendUrl } from '../services/appConfig';
import { 
  X, 
  Printer, 
  Download, 
  Mail, 
  CheckCircle2, 
  AlertTriangle,
  Check, 
  Clock, 
  Loader2, 
  Phone, 
  Send,
  ShieldCheck,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { DonationRecord, TrustConfig, VolunteerRecord } from '../types';
import { numberToWordsInr } from '../data/mockData';
import { TrustLogo } from './TrustLogo';
import { MaaDurgaWatermark } from './MaaDurgaWatermark';
import { useGmailAuth } from '../context/GmailAuthContext';

interface ReceiptModalProps {
  donation: DonationRecord;
  trustConfig: TrustConfig;
  volunteers?: VolunteerRecord[];
  onClose: () => void;
  onVerifyDonation?: (
    confirmationCode: string,
    volunteerName: string
  ) => Promise<{ success: boolean; donation?: DonationRecord; error?: string }>;
}

export function ReceiptModal({ 
  donation: initialDonation, 
  trustConfig, 
  volunteers = [], 
  onClose,
  onVerifyDonation 
}: ReceiptModalProps) {
  const [currentDonation, setCurrentDonation] = useState<DonationRecord>(initialDonation);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Verification state within modal
  const [isConfirmingInModal, setIsConfirmingInModal] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<string>(
    volunteers[0]?.volunteerName || trustConfig.name
  );
  const [confirmSuccessMsg, setConfirmSuccessMsg] = useState<string | null>(null);
  const [confirmErrorMsg, setConfirmErrorMsg] = useState<string | null>(null);

  const autoReceiptProcessedRef = useRef<string | null>(null);
  
  // Sync prop changes
  useEffect(() => {
    setCurrentDonation(initialDonation);
  }, [initialDonation]);

  // Email resend state
  const { isAuthenticated: isGmailConnected, sendDonationReceipt, loginWithGoogle } = useGmailAuth();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentResult, setEmailSentResult] = useState<string | null>(null);

  const isPending = currentDonation.paymentStatus !== 'Paid';
  const isCash = currentDonation.paymentMode.toLowerCase() === 'cash';

  const formattedDate = new Date(currentDonation.submittedAt || currentDonation.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const amountWords = numberToWordsInr(currentDonation.amount);

  // Clean Receipt No Display
  const receiptNoDisplay = currentDonation.donationId.split('-').pop() || currentDonation.donationId;

  // Real Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Direct Verification from Receipt Modal
  const handleConfirmInModal = async () => {
    if (!onVerifyDonation) return;
    setIsConfirmingInModal(true);
    setConfirmErrorMsg(null);
    setConfirmSuccessMsg(null);

    try {
      const code = currentDonation.confirmationCode || currentDonation.donationId;
      const res = await onVerifyDonation(code, selectedVolunteer);
    
    if (res.success && res.donation) {
      setDirectSuccessDonation(res.donation);
    
      // Automatically open the receipt after successful verification.
      // This mounts ReceiptModal, which triggers the automatic
      // PDF → Drive → Email workflow.
      setModalReceiptDonation(res.donation);
    } else {
        setConfirmErrorMsg(res.error || 'Failed to verify donation.');
      }
    } catch (e: any) {
      setConfirmErrorMsg(e.message || 'Error executing verification.');
    } finally {
      setIsConfirmingInModal(false);
    }
  };

  const handleDispatchEmail = async () => {
    if (!currentDonation.email) {
      alert('No email address was provided on this donation.');
      return;
    }
    setIsSendingEmail(true);
    setEmailSentResult(null);

    const result = await sendDonationReceipt(currentDonation, trustConfig);
    setIsSendingEmail(false);

    if (result.success) {
      setEmailSentResult('✅ Receipt dispatched to donor inbox!');
      setTimeout(() => setEmailSentResult(null), 4000);
    } else {
      setEmailSentResult(`❌ ${result.error || 'Failed to dispatch'}`);
      setTimeout(() => setEmailSentResult(null), 5000);
    }
  };

const uploadReceiptPdfToBackend = async (
  pdf: jsPDF,
  fileName: string
) => {
  const pdfDataUri = pdf.output('datauristring');

  const base64 = pdfDataUri.split(',')[1];

  const response = await fetch(
    getConfiguredBackendUrl(),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'save_client_receipt_pdf',
        donationId: currentDonation.donationId,
        fileName,
        pdfBase64: base64
      })
    }
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.error || 'Unable to save receipt PDF to Google Drive.'
    );
  }

  return result;
};

  const waitForReceiptAssets = async (
    element: HTMLElement
  ): Promise<void> => {
    // Wait for the browser to finish the current render cycle.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => resolve())
      )
    );
  
    // Wait for all normal <img> elements.
    const images = Array.from(
      element.querySelectorAll('img')
    );
  
    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) {
          return Promise.resolve();
        }
  
        return new Promise<void>((resolve) => {
          const done = () => {
            img.removeEventListener('load', done);
            img.removeEventListener('error', done);
            resolve();
          };
  
          img.addEventListener('load', done);
          img.addEventListener('error', done);
        });
      })
    );
  
    // Give inline SVG / CSS rendering one final browser cycle.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => resolve())
      )
    );
  };

  // Real Native PDF Generation in 210mm x 105mm Custom Compact Landscape Receipt Format
  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
  
    setIsGeneratingPdf(true);
  
    try {
      const element = receiptRef.current;
  
      // Wait for logo, watermark, SVG and fonts to finish rendering.
      await waitForReceiptAssets(element);
  
      const dataUrl = await toPng(element, {
        quality: 0.98,
        pixelRatio: 3,
        backgroundColor: '#FFF3E0',
        cacheBust: true,
        skipFonts: false,
      });
  
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [210, 105],
      });
  
      const img = new Image();
      img.src = dataUrl;
  
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () =>
          reject(new Error('Receipt image could not be loaded.'));
      });
  
      const pageWidth = 210;
      const pageHeight = 105;
  
      const margin = 3;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;
  
      let renderWidth = availableWidth;
      let renderHeight =
        (img.height * renderWidth) / img.width;
  
      if (renderHeight > availableHeight) {
        renderHeight = availableHeight;
        renderWidth =
          (img.width * renderHeight) / img.height;
      }
  
      const xPos =
        margin +
        (availableWidth - renderWidth) / 2;
  
      const yPos =
        margin +
        (availableHeight - renderHeight) / 2;
  
      pdf.addImage(
        dataUrl,
        'PNG',
        xPos,
        yPos,
        renderWidth,
        renderHeight,
        undefined,
        'FAST'
      );
  
      const fileName = isPending
        ? `SJST_Provisional_Receipt_${currentDonation.donationId}.pdf`
        : `SJST_Official_Receipt_${currentDonation.donationId}.pdf`;
  
      // ---------------------------------------------------------
      // DOWNLOAD ONLY
      // Do NOT upload to Google Drive.
      // Do NOT send email.
      // ---------------------------------------------------------
  
      pdf.save(fileName);
  
      setDownloadSuccess(true);
  
      setTimeout(
        () => setDownloadSuccess(false),
        3000
      );
  
    } catch (err) {
  
      console.error(
        'Error generating PDF:',
        err
      );
  
      alert(
        'Unable to generate receipt PDF.'
      );
  
    } finally {
  
      setIsGeneratingPdf(false);
    }
  };
  const handleAutoSaveReceiptPdf = async (): Promise<boolean> => {
    if (!currentDonation) {
      return false;
    }
  
    try {
  
      console.log(
        'AUTO RECEIPT: Starting for donation:',
        currentDonation.donationId
      );
  
      // ---------------------------------------------------------
      // Wait for the actual receipt DOM element to exist.
      // ---------------------------------------------------------
  
      let receiptElement: HTMLElement | null = null;
  
      for (let attempt = 0; attempt < 20; attempt++) {
  
        receiptElement = document.getElementById(
          'compact-digital-receipt'
        );
  
        if (receiptElement) {
          break;
        }
  
        console.log(
          `AUTO RECEIPT: Waiting for receipt element... attempt ${attempt + 1}`
        );
  
        await new Promise(resolve =>
          setTimeout(resolve, 300)
        );
      }
  
      if (!receiptElement) {
        throw new Error(
          'Receipt element was not rendered after waiting.'
        );
      }
  
      console.log(
        'AUTO RECEIPT: Receipt element found.'
      );
  
      // ---------------------------------------------------------
      // Wait for logo, watermark, fonts and other assets.
      // ---------------------------------------------------------
  
      await waitForReceiptAssets(receiptElement);
  
      // Give browser a little additional time to paint everything.
      await new Promise(resolve =>
        setTimeout(resolve, 500)
      );
  
      console.log(
        'AUTO RECEIPT: Receipt assets ready. Creating PNG...'
      );
  
      // ---------------------------------------------------------
      // Generate image from the SAME online receipt.
      // ---------------------------------------------------------
  
      const dataUrl = await toPng(receiptElement, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: '#FFF3E0',
        skipFonts: false
      });
  
      console.log(
        'AUTO RECEIPT: PNG generated.'
      );
  
      // ---------------------------------------------------------
      // Convert PNG to PDF.
      // ---------------------------------------------------------
  
      const img = new Image();
  
      await new Promise<void>((resolve, reject) => {
  
        img.onload = () => resolve();
  
        img.onerror = () =>
          reject(
            new Error(
              'Receipt image could not be loaded.'
            )
          );
  
        img.src = dataUrl;
      });
  
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [210, 105]
      });
  
      pdf.addImage(
        dataUrl,
        'PNG',
        0,
        0,
        210,
        105,
        undefined,
        'FAST'
      );
  
      console.log(
        'AUTO RECEIPT: PDF generated.'
      );
  
      // ---------------------------------------------------------
      // Send EXACT PDF to Apps Script.
      // Apps Script saves it to Drive and emails it.
      // ---------------------------------------------------------
  
      const fileName =
        `SJST_Official_Receipt_${currentDonation.donationId}.pdf`;
  
      console.log(
        'AUTO RECEIPT: Uploading PDF to backend...'
      );
  
      const backendResult =
        await uploadReceiptPdfToBackend(
          pdf,
          fileName
        );
  
      console.log(
        'AUTO RECEIPT: Backend response:',
        backendResult
      );
  
      if (!backendResult?.success) {
        throw new Error(
          backendResult?.error ||
          'Backend failed to save the receipt PDF.'
        );
      }
  
      // ---------------------------------------------------------
      // Make sure email was actually sent.
      // ---------------------------------------------------------
  
      if (
        backendResult.emailStatus &&
        backendResult.emailStatus !== 'Sent'
      ) {
        throw new Error(
          backendResult.emailError ||
          'Receipt was saved to Drive but email was not sent.'
        );
      }
  
      // ---------------------------------------------------------
      // Update local receipt state.
      // ---------------------------------------------------------
  
      setCurrentDonation(prev => {
  
        if (!prev) {
          return prev;
        }
  
        return {
          ...prev,
  
          receiptUrl:
            backendResult.receiptUrl ||
            prev.receiptUrl,
  
          emailStatus:
            backendResult.emailStatus ||
            prev.emailStatus
        };
      });
  
      console.log(
        'AUTO RECEIPT: COMPLETE.',
        backendResult.receiptUrl
      );
  
      return true;
  
    } catch (error) {
  
      console.error(
        'AUTO RECEIPT: FAILED:',
        error
      );
  
      // IMPORTANT:
      // Re-throw so the useEffect knows the process failed.
      throw error;
    }
  };

 useEffect(() => {
    if (!currentDonation) return;
  
    // Only automatic processing for Paid donations.
    if (currentDonation.paymentStatus !== 'Paid') return;
  
    // Existing receipt = do not generate another PDF.
    if (currentDonation.receiptUrl) {
      console.log(
        'AUTO RECEIPT: Existing receipt found. No new PDF required.'
      );
      return;
    }
  
    // Already successfully processed.
    if (
      autoReceiptProcessedRef.current ===
      currentDonation.donationId
    ) {
      return;
    }
  
    let cancelled = false;
    let attempts = 0;
  
    const tryAutomaticReceipt = async () => {
      // Maximum ~10 seconds waiting for receipt to render.
      if (cancelled || attempts >= 20) {
        console.error(
          'AUTO RECEIPT: Receipt did not become ready.'
        );
        return;
      }
  
      attempts++;
  
      const receiptElement = document.getElementById(
        'compact-digital-receipt'
      );
  
      // Receipt has not mounted yet.
      // Keep trying — DO NOT give up.
      if (!receiptElement) {
        setTimeout(tryAutomaticReceipt, 500);
        return;
      }
  
      // Prevent duplicate processing.
      if (
        autoReceiptProcessedRef.current ===
        currentDonation.donationId
      ) {
        return;
      }
  
      try {
        console.log(
          'AUTO RECEIPT: Receipt is ready. Starting automatic PDF workflow.'
        );
  
        const success =
          await handleAutoSaveReceiptPdf();
  
        if (cancelled) return;
  
        if (success) {
          // Mark ONLY after PDF + Drive + Email succeeded.
          autoReceiptProcessedRef.current =
            currentDonation.donationId;
  
          setConfirmSuccessMsg(
            '🎉 Offering confirmed & verified! Official Receipt generated, saved to Drive and emailed successfully.'
          );
  
          console.log(
            'AUTO RECEIPT: COMPLETE — PDF saved to Drive and email sent.'
          );
        }
  
      } catch (error) {
  
        console.error(
          'AUTO RECEIPT: Automatic workflow failed:',
          error
        );
  
        autoReceiptProcessedRef.current = null;
  
        setConfirmErrorMsg(
          error instanceof Error
            ? error.message
            : 'Unable to generate, save and email the official receipt.'
        );
      }
    };
  
    // Give React one render cycle before starting.
    const timer = setTimeout(
      tryAutomaticReceipt,
      500
    );
  
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  
  }, [
    currentDonation?.donationId,
    currentDonation?.paymentStatus,
    currentDonation?.receiptUrl
  ]);
    
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none">
        
        {/* Modal Action Bar (Hidden during Print) */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            {isPending ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-bold text-xs sm:text-sm text-amber-300">
                  Provisional Slip (Pending Verification • PIN: {currentDonation.confirmationCode})
                </span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="font-bold text-xs sm:text-sm text-emerald-300">
                  Official Verified Seva Receipt (210 × 105 mm)
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Print Receipt"
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

           
            {currentDonation.receiptUrl ? (
              <button
                onClick={() => window.open(currentDonation.receiptUrl, '_blank', 'noopener,noreferrer')}
                title="Open Official Receipt"
                className="px-3.5 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Open Official Receipt</span>
              </button>
            ) : (
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                title="Download Compact 210x105mm PDF"
                className="px-3.5 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : downloadSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* INLINE CONFIRMATION BANNER IF PENDING */}
        {isPending && onVerifyDonation && (
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-orange-500/15 border-b border-amber-300 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs print:hidden">
            <div className="flex items-center gap-2 text-amber-950">
              <Clock className="w-4 h-4 text-amber-700 shrink-0 animate-pulse" />
              <div>
                <strong>Awaiting Verification:</strong> Devotee PIN is <span className="font-mono font-black text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded border border-amber-400">{currentDonation.confirmationCode}</span>. Volunteer can confirm below to instantly generate the Final Receipt.
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <select
                value={selectedVolunteer}
                onChange={e => setSelectedVolunteer(e.target.value)}
                className="bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-hidden"
              >
                {volunteers.length > 0 ? (
                  volunteers.map(v => (
                    <option key={v.volunteerCode} value={v.volunteerName}>
                      {v.volunteerName} ({v.volunteerCode})
                    </option>
                  ))
                ) : (
                  <option value={trustConfig.name}>{trustConfig.name}</option>
                )}
              </select>

              <button
                onClick={handleConfirmInModal}
                disabled={isConfirmingInModal}
                className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isConfirmingInModal ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Issue Final Receipt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Status Alerts */}
        {confirmSuccessMsg && (
          <div className="p-2.5 bg-emerald-100 border-b border-emerald-300 text-emerald-950 text-xs font-bold text-center flex items-center justify-center gap-2 print:hidden">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>{confirmSuccessMsg}</span>
          </div>
        )}

        {confirmErrorMsg && (
          <div className="p-2.5 bg-rose-100 border-b border-rose-300 text-rose-950 text-xs font-bold text-center flex items-center justify-center gap-2 print:hidden">
            <AlertTriangle className="w-4 h-4 text-rose-700" />
            <span>{confirmErrorMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* COMPACT LANDSCAPE RECEIPT (210 mm x 105 mm FORMAT, 2:1 RATIO)            */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-6 bg-slate-100 flex justify-center items-center overflow-x-auto print:p-0 print:bg-white">
          <div 
            ref={receiptRef} 
            id="compact-digital-receipt"
            className="w-full max-w-[794px] bg-[#FFF3E0] text-slate-900 relative selection:bg-amber-100 border border-amber-900/30 shadow-md print:shadow-none print:border-amber-900/40 print:w-[210mm] print:h-[105mm] print:max-w-none"
            style={{ 
              fontFamily: "Georgia, Cambria, 'Times New Roman', serif",
              boxSizing: 'border-box'
            }}
          >
            {/* Double Border Frame */}
            <div className="p-3.5 sm:p-4.5 border-2 border-amber-900/60 m-1 rounded-sm bg-[#FFF3E0] relative overflow-hidden">
              
              {/* Divine Maa Durga Watermark behind the receipt content */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden">
                <MaaDurgaWatermark 
                  opacity={0.10} 
                  size="receipt" 
                />
              </div>

              {/* Corner Traditional Accents */}
              <div className="absolute top-1 left-1.5 text-amber-800 text-[9px] select-none opacity-70">❖</div>
              <div className="absolute top-1 right-1.5 text-amber-800 text-[9px] select-none opacity-70">❖</div>
              <div className="absolute bottom-1 left-1.5 text-amber-800 text-[9px] select-none opacity-70">❖</div>
              <div className="absolute bottom-1 right-1.5 text-amber-800 text-[9px] select-none opacity-70">❖</div>

              {/* Watermark for Pending Confirmation */}
              {isPending && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20 select-none overflow-hidden">
                  <div className="transform -rotate-12 border-2 border-dashed border-rose-500/60 bg-rose-50/95 text-rose-800 font-black text-xs sm:text-sm font-sans tracking-widest px-6 py-2 rounded-xl uppercase text-center shadow-lg">
                    <div>PROVISIONAL SLIP • CONFIRMATION PENDING</div>
                    <div className="text-[9px] font-bold text-rose-700 normal-case tracking-normal mt-0.5">
                      PIN: {currentDonation.confirmationCode} — Awaiting Mandap Volunteer Verification
                    </div>
                  </div>
                </div>
              )}

              {/* A. TOP HEADER: LOGO, TRUST NAME, REGD NO, ADDRESS & RECEIPT META */}
              <div className="border-b border-amber-900/40 pb-2 mb-2.5">
                
                {/* Invocation Shloka */}
                <div className="text-[10px] font-bold text-amber-900 tracking-wider text-center uppercase font-serif">
                  ॥ जय जगन्नाथ स्वामी नयन पथगामी भवतु मे ॥
                </div>

                <div className="flex items-center justify-between gap-3 mt-1">
                  
                  {/* Left: Divine Official Trust Emblem Logo */}
                  <TrustLogo className="w-14 h-14 sm:w-16 sm:h-16 shrink-0" />

                  {/* Center: Trust Title, Regd, PAN & Address */}
                  <div className="flex-1 text-center sm:text-left space-y-0.5">
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-amber-950 uppercase font-serif leading-tight">
                      {trustConfig.name}
                    </h1>
                    <div className="text-[10px] sm:text-[11px] font-sans font-medium text-slate-700 leading-tight">
                      <span className="font-bold text-amber-950">Regd. No.:</span> {trustConfig.regdNo} • <span className="font-bold text-amber-950">PAN:</span> {trustConfig.panNo || 'AAATS12018F'}
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-sans text-slate-600 leading-tight truncate max-w-[420px]">
                      {trustConfig.address || 'Flat No. 103, G5,Unnathi Greens,G.B. Road, Kasarvadavali,  Thane (West) - 400615, Maharashtra'}
                    </div>
                    <div className="text-[9px] font-sans text-slate-600">
                      <strong>Email:</strong> <span className="text-amber-900 font-bold">{trustConfig.email}</span>
                      {trustConfig.phone && <span> • <strong>Mob:</strong> {trustConfig.phone}</span>}
                    </div>
                  </div>

                  {/* Right Side: Receipt Number & Date Box */}
                  <div className="text-right shrink-0 font-sans space-y-1">
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block ${
                      isPending 
                        ? 'bg-rose-100 text-rose-900 border border-rose-200' 
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    }`}>
                      {isPending ? 'PROVISIONAL' : 'RECEIPT'}
                    </div>
                    <div className="text-[10.5px]">
                      <span className="text-slate-500">Receipt No: </span>
                      <strong className="font-mono text-amber-950 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        SJST-{receiptNoDisplay}
                      </strong>
                    </div>
                    <div className="text-[10.5px]">
                      <span className="text-slate-500">Date: </span>
                      <strong className="text-slate-900">{formattedDate}</strong>
                    </div>
                  </div>

                </div>
              </div>

              {/* B. DONATION CORE DETAILS (TRADITIONAL SLIP FORMAT) */}
              <div className="space-y-1.5 text-xs font-sans">
                
                {/* Devotee Name */}
                <div className="flex items-baseline gap-1.5 border-b border-dashed border-slate-300/80 pb-1">
                  <span className="text-slate-600 w-44 shrink-0 font-medium italic font-serif text-[11px] sm:text-xs">
                    Received with thanks from:
                  </span>
                  <span className="font-bold text-slate-950 text-xs sm:text-sm tracking-wide font-serif flex-1">
                    {currentDonation.donorName}
                    {currentDonation.phone && (
                      <span className="text-[10px] font-sans font-normal text-slate-500 ml-2">
                        (M: {currentDonation.phone})
                      </span>
                    )}
                  </span>
                </div>

                {/* Amount in Words */}
                <div className="flex items-baseline gap-1.5 border-b border-dashed border-slate-300/80 pb-1">
                  <span className="text-slate-600 w-44 shrink-0 font-medium italic font-serif text-[11px] sm:text-xs">
                    The sum of Rupees (in words):
                  </span>
                  <span className="font-bold text-amber-950 italic font-serif text-[11px] sm:text-xs leading-tight flex-1">
                    {amountWords}
                  </span>
                </div>

                {/* Towards Seva Head */}
                <div className="flex items-baseline gap-1.5 border-b border-dashed border-slate-300/80 pb-1">
                  <span className="text-slate-600 w-44 shrink-0 font-medium italic font-serif text-[11px] sm:text-xs">
                    Towards (Seva Purpose):
                  </span>
                  <span className="font-bold text-slate-900 text-[11px] sm:text-xs flex-1">
                    {currentDonation.sevaCategory ? `${currentDonation.sevaCategory} — ` : ''}{currentDonation.sevaHead || 'General Seva & Puja Contribution'}
                  </span>
                </div>

              </div>

              {/* C, D, E. COMPACT BOTTOM 3-COLUMN STRIP: PAYMENT META | AMOUNT BOX | AUTHORIZATION */}
              <div className="grid grid-cols-12 gap-2.5 mt-2.5 items-center font-sans">
                
                {/* C. Payment Details (5 Cols) */}
                <div className="col-span-5 bg-amber-50/60 rounded-lg p-2 border border-amber-200/80 text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Mode:</span>
                    <span className="font-bold text-slate-900 uppercase">{currentDonation.paymentMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Donation ID:</span>
                    <span className="font-mono text-slate-800 font-semibold">{currentDonation.donationId}</span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5 border-t border-amber-200/60">
                    <span className="text-slate-500">Status:</span>
                    {isPending ? (
                      <span className="text-rose-700 font-bold flex items-center gap-0.5 font-mono text-[9.5px]">
                        <Clock className="w-3 h-3" />
                        <span>Pending ({currentDonation.confirmationCode})</span>
                      </span>
                    ) : (
                      <span className="text-emerald-800 font-bold flex items-center gap-0.5 font-mono text-[9.5px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>✓ Paid ({currentDonation.confirmedBy || 'Verified'})</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* D. Prominent Amount Highlight Box (4 Cols) */}
                <div className="col-span-4 bg-gradient-to-br from-amber-900 to-amber-950 text-white rounded-lg p-2 flex flex-col justify-center items-center text-center shadow-xs">
                  <span className="text-[8.5px] uppercase font-bold tracking-widest text-amber-200">
                    AMOUNT RECEIVED
                  </span>
                  <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-white leading-tight mt-0.5">
                    ₹ {currentDonation.amount.toLocaleString('en-IN')}/-
                  </div>
                  <div className="text-[8px] text-amber-200/90 font-sans">
                    {isPending ? 'Provisional • Verification Pending' : 'Official Valid Receipt'}
                  </div>
                </div>

                {/* E. Authorized Signatory / Trustee (3 Cols) */}
                <div className="col-span-3 text-center space-y-0.5">
                  {isPending ? (
                    <div className="border border-dashed border-slate-300 rounded p-1 bg-slate-50 text-[8.5px] text-slate-400 font-mono">
                      [VERIFICATION PENDING]
                    </div>
                  ) : (
                    <div className="border border-amber-800/80 rounded p-1 bg-amber-50/70">
                      <div className="font-serif font-bold text-amber-950 text-[9px] uppercase leading-tight">
                        TRUSTEE / SIGNATORY
                      </div>
                      <div className="text-[7.5px] text-emerald-700 font-mono font-bold">
                        DIGITALLY SIGNED
                      </div>
                    </div>
                  )}
                  <div className="text-[8px] text-slate-500 leading-tight">
                    Shree Jagannath Seva Trust
                  </div>
                </div>

              </div>

              {/* REQUIREMENT 3: SUBTLE DEVELOPER BRANDING & COMPLIANCE FOOTER */}
              <div className="mt-2 pt-1.5 border-t border-slate-200 text-center space-y-0.5 font-sans">
                <div className="text-[8px] text-slate-400">
                  {trustConfig.section80G || ''} • Computer Generated Receipt
                </div>
                <div className="text-[7.5px] text-slate-500 font-medium tracking-wide">
                  Powered by <span className="font-semibold text-slate-600">Digital Donation Management Solution</span> | Developed by <span className="font-semibold text-slate-700">Sachin Parab</span> | <span className="font-mono">9892805337</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar (Hidden during Print) */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Mail className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              Delivery Email: <strong className="text-slate-900">{currentDonation.email || trustConfig.email}</strong>
            </span>
            {emailSentResult && (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md ml-2 animate-in fade-in">
                {emailSentResult}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentDonation.email && (
              isGmailConnected ? (
                <button
                  onClick={handleDispatchEmail}
                  disabled={isSendingEmail}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  title="Send official receipt via authenticated Google Gmail API"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send via Gmail</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      await loginWithGoogle();
                    } catch (err) {
                      console.warn('Google connect from modal error:', err);
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  title="Connect Google Account to email receipts directly"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-700" />
                  <span>Connect Gmail to Send</span>
                </button>
              )
            )}

            {isPending && onVerifyDonation && (
              <button
                onClick={handleConfirmInModal}
                disabled={isConfirmingInModal}
                className="flex-1 sm:flex-none px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verify &amp; Finalize</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex-1 sm:flex-none px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Saved PDF!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF (210×105 mm)</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
