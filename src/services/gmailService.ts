import { DonationRecord, TrustConfig } from '../types';

export interface SendReceiptEmailParams {
  donation: DonationRecord;
  trustConfig: TrustConfig;
  accessToken: string;
  senderEmail?: string;
  senderName?: string;
  customBlessingMessage?: string;
  subjectTemplate?: string;
  subjectPrefix?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isAuthError?: boolean;
}

/**
 * Generates an elegant, high-contrast HTML receipt template formatted for all email clients.
 */
export function buildReceiptHtml(
  donation: DonationRecord,
  trustConfig: TrustConfig,
  customBlessing?: string
): string {
  const formattedAmount = Number(donation.amount).toLocaleString('en-IN');
  const formattedDate = new Date(donation.submittedAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const blessing = customBlessing || 'May Lord Jagannath, Balabhadra, and Devi Subhadra shower divine peace, prosperity, and happiness upon you and your family.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Donation Receipt - ${trustConfig.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #78350f 0%, #451a03 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
              <div style="font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #fde68a; text-transform: uppercase; margin-bottom: 6px;">
                Official Donation Receipt • 80G Tax Exempt
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; font-family: Georgia, serif; letter-spacing: 0.5px; color: #ffffff;">
                ${trustConfig.name}
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #fef3c7; opacity: 0.9;">
                Regd. No: <strong>${trustConfig.regdNo}</strong> | PAN: <strong>${trustConfig.panNo || 'AAATS9823P'}</strong>
              </p>
            </td>
          </tr>

          <!-- Divine Greeting & Blessing -->
          <tr>
            <td style="padding: 28px 24px 16px 24px;">
              <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #78350f;">
                🙏 Jay Jagannath, Namaste ${donation.donorName}!
              </p>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                We gratefully acknowledge receipt of your pious contribution towards <strong>${donation.sevaHead || donation.sevaCategory || 'General Seva'}</strong>.
              </p>

              <!-- Blessing Card -->
              <div style="background-color: #fef3c7; border-left: 4px solid #d97706; border-radius: 8px; padding: 14px 16px; margin: 16px 0;">
                <p style="margin: 0; font-size: 13px; font-style: italic; color: #92400e; line-height: 1.5;">
                  &ldquo;${blessing}&rdquo;
                </p>
              </div>
            </td>
          </tr>

          <!-- Receipt Details Table -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; font-size: 13px;">
                <tr style="background-color: #f1f5f9;">
                  <td style="padding: 10px 14px; font-weight: 700; color: #475569; width: 40%; border-bottom: 1px solid #e2e8f0;">Receipt Number</td>
                  <td style="padding: 10px 14px; font-weight: 700; font-family: monospace; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${donation.donationId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">Amount Contributed</td>
                  <td style="padding: 10px 14px; font-weight: 800; font-size: 15px; color: #15803d; border-bottom: 1px solid #e2e8f0;">₹${formattedAmount}/-</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px 14px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">Seva Category / Head</td>
                  <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${donation.sevaHead || donation.sevaCategory || 'Anna Dana Seva'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">Payment Mode</td>
                  <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${donation.paymentMode} (${donation.paymentStatus})</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px 14px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">Transaction Date</td>
                  <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-weight: 600; color: #475569;">Verified / Confirmed By</td>
                  <td style="padding: 10px 14px; color: #0f172a;">${donation.confirmedBy || 'Trust Admin Desk'}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Tax Exemption Notice -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px; font-size: 12px; color: #166534; line-height: 1.5;">
                <strong style="color: #14532d;">🏛️ Income Tax 80G Benefit:</strong><br/>
                Donations to <em>${trustConfig.name}</em> are eligible for 50% deduction under Section 80G of the Income Tax Act, 1961. Please retain this email and receipt number for your tax filing.
              </div>
            </td>
          </tr>

          <!-- Trust Contact & Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6;">
              <p style="margin: 0 0 4px 0; font-weight: 700; color: #334155;">
                ${trustConfig.name}
              </p>
              <p style="margin: 0 0 8px 0;">
                ${trustConfig.address || 'Thane, Maharashtra'} • Phone: ${trustConfig.phone || '+91 98200 00000'}
              </p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8;">
                This computerized receipt is automatically generated and dispatched via authorized Gmail API services.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Safely converts any UTF-8 string (including Devanagari, emojis, Rupee symbols)
 * into a base64 string without btoa() Latin-1 overflow errors.
 */
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Safely converts a UTF-8 string into RFC 4648 Base64URL format for the Gmail REST API.
 */
function utf8ToBase64Url(str: string): string {
  return utf8ToBase64(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Securely calls the Google Gmail REST API (`/gmail/v1/users/me/messages/send`)
 * using the provided OAuth access token.
 */
export async function sendGmailRestMessage(
  params: SendReceiptEmailParams
): Promise<SendEmailResult> {
  const {
    donation,
    trustConfig,
    accessToken,
    senderEmail = trustConfig.email || 'me',
    senderName = trustConfig.name,
    customBlessingMessage,
    subjectTemplate,
    subjectPrefix = '[SJST-Receipt]'
  } = params;

  if (!accessToken) {
    return {
      success: false,
      error: 'Google OAuth access token is missing. Please authenticate sender in Email & Receipts tab.'
    };
  }

  if (!donation.email || !donation.email.includes('@')) {
    return {
      success: false,
      error: 'Devotee email address is missing or invalid.'
    };
  }

  try {
    const rawSubject = subjectTemplate 
      ? subjectTemplate
          .replace('{{TRUST_NAME}}', trustConfig.name)
          .replace('{{RECEIPT_NO}}', donation.donationId)
          .replace('{{AMOUNT}}', String(donation.amount))
          .replace('{{SEVA}}', donation.sevaHead || donation.sevaCategory || 'Seva')
      : `${subjectPrefix} Official Donation Receipt - ${donation.donationId} (₹${Number(donation.amount).toLocaleString('en-IN')})`;

    const htmlBody = buildReceiptHtml(donation, trustConfig, customBlessingMessage);

    // Build standard RFC 2822 MIME message
    const formattedFrom = senderName 
      ? `"${senderName.replace(/"/g, '')}" <${senderEmail}>`
      : senderEmail;
    
    const formattedTo = donation.donorName
      ? `"${donation.donorName.replace(/"/g, '')}" <${donation.email.trim()}>`
      : donation.email.trim();

    // Base64 encode subject for UTF-8 safety
    const encodedSubject = `=?UTF-8?B?${utf8ToBase64(rawSubject)}?=`;

    const mimeMessage = [
      `From: ${formattedFrom}`,
      `To: ${formattedTo}`,
      `Reply-To: ${trustConfig.email || senderEmail}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      htmlBody
    ].join('\r\n');

    // Base64URL-encode the entire MIME message
    const rawBase64Url = utf8ToBase64Url(mimeMessage);

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: rawBase64Url })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const rawErrorMsg = errData.error?.message || `Gmail API error (${response.status}): ${response.statusText}`;
      
      const isAuthError = response.status === 401 || 
        response.status === 403 || 
        rawErrorMsg.toLowerCase().includes('invalid authentication credentials') ||
        rawErrorMsg.toLowerCase().includes('unauthenticated') ||
        rawErrorMsg.toLowerCase().includes('oauth 2 access token') ||
        rawErrorMsg.toLowerCase().includes('invalid credentials');

      if (isAuthError) {
        // Broadcast token expiry so UI updates and clears stale token
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('google_auth_expired', { 
              detail: { reason: 'gmail_send_unauthenticated', message: rawErrorMsg } 
            }));
          }
        } catch (e) {
          // Ignore
        }

        const friendlyMsg = 'Google account authorization has expired or is invalid. Please click "Authenticate Sender with Google Account" to re-authorize receipt sending.';
        console.warn('Gmail API auth expired:', rawErrorMsg);
        return { 
          success: false, 
          error: friendlyMsg,
          isAuthError: true 
        };
      }

      console.error('Gmail API send error:', rawErrorMsg);
      return { success: false, error: rawErrorMsg };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.id || `msg-${Date.now()}`
    };
  } catch (err: unknown) {
    console.error('Failed to send email via Gmail API:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error communicating with Gmail API'
    };
  }
}
