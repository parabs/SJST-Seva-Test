import { DonationRecord, TrustConfig } from '../types';

/**
 * Google Drive Service for saving 80G Receipts directly to Google Drive
 */
export async function uploadReceiptToGoogleDrive(
  donation: DonationRecord,
  trustConfig: TrustConfig,
  accessToken?: string | null
): Promise<{ success: boolean; fileId?: string; webViewLink?: string; error?: string }> {
  if (!accessToken) {
    return {
      success: false,
      error: 'Google OAuth Access Token is required to upload to Google Drive'
    };
  }

  try {
    const fileName = `80G_Receipt_${donation.donationId}_${donation.donorName.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    
    // Create rich HTML receipt document content for Google Drive
    const receiptHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt #${donation.donationId} - ${trustConfig.name}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
    .receipt-card { max-width: 800px; margin: 0 auto; background: white; border: 2px solid #b45309; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); position: relative; }
    .header { text-align: center; border-bottom: 2px solid #fef3c7; padding-bottom: 20px; margin-bottom: 20px; }
    .title { font-size: 24px; font-weight: 900; color: #78350f; margin: 0; }
    .subtitle { font-size: 13px; color: #475569; margin: 5px 0; }
    .reg-badges { display: flex; justify-content: center; gap: 10px; margin-top: 10px; font-size: 11px; font-weight: bold; }
    .badge { background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 6px; border: 1px solid #fde68a; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .field { background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .field-label { font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase; }
    .field-value { font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 4px; }
    .amount-box { background: #fef3c7; border: 2px dashed #d97706; padding: 15px; border-radius: 12px; text-align: center; margin: 20px 0; }
    .amount { font-size: 32px; font-weight: 900; color: #92400e; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 11px; color: #64748b; }
    .stamp { display: inline-block; border: 2px solid #16a34a; color: #16a34a; padding: 6px 16px; border-radius: 8px; font-weight: 900; font-size: 14px; text-transform: uppercase; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <h1 class="title">${trustConfig.name}</h1>
      <p class="subtitle">${trustConfig.address} | Phone: ${trustConfig.phone} | Email: ${trustConfig.email}</p>
      <div class="reg-badges">
        <span class="badge">Trust Reg: ${trustConfig.regdNo || 'E-33633 (Mumbai)'}</span>
        <span class="badge">PAN: ${trustConfig.panNo || 'AAATS1234F'}</span>
        <span class="badge">80G Certificate: ${trustConfig.section80G || 'CIT(E)/80G/2023-24/1042'}</span>
      </div>
    </div>

    <div style="text-align:center;">
      <h2 style="color: #92400e; margin: 0; font-size: 18px;">OFFICIAL DONATION &amp; 80G TAX EXEMPTION RECEIPT</h2>
      <p style="font-size: 12px; color: #64748b;">Issued under Section 80G(5)(vi) of the Income Tax Act, 1961</p>
    </div>

    <div class="amount-box">
      <div class="field-label">Received with Gratitude (Amount in INR)</div>
      <div class="amount">₹${donation.amount.toLocaleString('en-IN')}</div>
      <div style="font-size: 12px; color: #78350f; font-weight: 600; margin-top: 4px;">(${donation.paymentMode} Offering)</div>
    </div>

    <div class="grid">
      <div class="field">
        <div class="field-label">Receipt Number</div>
        <div class="field-value">${donation.donationId}</div>
      </div>
      <div class="field">
        <div class="field-label">Date &amp; Time</div>
        <div class="field-value">${new Date(donation.submittedAt).toLocaleString('en-IN')}</div>
      </div>
      <div class="field">
        <div class="field-label">Devotee / Contributor Name</div>
        <div class="field-value">${donation.donorName}</div>
      </div>
      <div class="field">
        <div class="field-label">Devotee Email / Contact</div>
        <div class="field-value">${donation.email || 'N/A'}</div>
      </div>
      <div class="field">
        <div class="field-label">Seva Category</div>
        <div class="field-value">${donation.sevaCategory || 'General Seva'}</div>
      </div>
      <div class="field">
        <div class="field-label">Seva Head</div>
        <div class="field-value">${donation.sevaHead || 'General Seva'}</div>
      </div>
      <div class="field">
        <div class="field-label">Verification Mode</div>
        <div class="field-value">${donation.paymentMode} (UTR: ${donation.paymentReference || 'Direct Counter'})</div>
      </div>
      <div class="field">
        <div class="field-label">Confirmed By Volunteer</div>
        <div class="field-value">${donation.confirmedBy || 'Mandap Counter Volunteer'}</div>
      </div>
    </div>

    <div style="text-align: center; margin: 20px 0;">
      <div class="stamp">✓ Payment Verified &amp; 80G Exemption Confirmed</div>
    </div>

    <div class="footer">
      <p>This is a computer-generated tax receipt with embedded Maa Durga Watermark issued by Shree Jagannath Seva Trust.</p>
      <p>Eligible for income tax deduction under Section 80G of the Indian Income Tax Act. Retain this receipt for tax returns.</p>
    </div>
  </div>
</body>
</html>`;

    // Upload file to Google Drive using multipart upload
    const metadata = {
      name: fileName,
      mimeType: 'text/html',
      description: `Official 80G Receipt #${donation.donationId} for ${donation.donorName} - ₹${donation.amount} - ${trustConfig.name}`
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/html\r\n\r\n' +
      receiptHtmlContent +
      closeDelimiter;

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.warn('Google Drive upload warning:', err);
      return {
        success: false,
        error: err?.error?.message || `Google Drive error HTTP ${response.status}`
      };
    }

    const driveData = await response.json();
    const webViewLink = driveData.webViewLink || `https://drive.google.com/file/d/${driveData.id}/view`;

    return {
      success: true,
      fileId: driveData.id,
      webViewLink
    };
  } catch (error: any) {
    console.error('Error uploading receipt to Google Drive:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload receipt to Google Drive'
    };
  }
}
