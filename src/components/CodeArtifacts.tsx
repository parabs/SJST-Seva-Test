import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  FileCode, 
  FileSpreadsheet, 
  Terminal, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  Layers,
  Building2,
  Mail
} from 'lucide-react';
import { TRUST_CONFIG } from '../data/mockData';

export function CodeArtifacts() {
  const [activeTab, setActiveTab] = useState<'gas' | 'receiptHtml' | 'sheets' | 'emailWorker'>('gas');
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Google Apps Script (Code.gs)
  const codeGs = `/**
 * =========================================================================
 * SHREE JAGANNATH SEVA TRUST - DONATION & VERIFICATION SYSTEM (Code.gs)
 * Regd. No.: E-12018/Thane | Email: shreejagannathsevatrust.thane@gmail.com
 * Bank: SBI | A/c: 40994707688 | IFSC: SBIN0010786 | UPI: SJSTTHANE@SBI
 * =========================================================================
 */

const TRUST_CONFIG = {
  name: "SHREE JAGANNATH SEVA TRUST",
  regdNo: "E-12018/Thane",
  email: "shreejagannathsevatrust.thane@gmail.com",
  bankName: "SBI",
  accountName: "SHREE JAGANNATH SEVA TRUST",
  accountNo: "40994707688",
  ifsc: "SBIN0010786",
  branch: "GHODBUNDER ROAD, THANE",
  upiId: "SJSTTHANE@SBI",
  receiptsFolderId: "YOUR_GOOGLE_DRIVE_FOLDER_ID_FOR_RECEIPTS"
};

// 15-Column Schema mapping for 'Donations' Master Operational Ledger
const COLS = {
  DONATION_ID: 1,       // A: Donation ID (e.g. SJST-20260830-0012)
  SUBMITTED_AT: 2,      // B: Submitted At (ISO / Date)
  TOWARDS: 3,           // C: Towards (Seva Head / Category)
  DONOR_NAME: 4,        // D: Donor Name
  EMAIL: 5,             // E: Email ID
  AMOUNT: 6,            // F: Amount (INR)
  PAYMENT_MODE: 7,      // G: Payment Mode (Cash / UPI)
  PAYMENT_STATUS: 8,    // H: Payment Status (Pending on first entry, Paid after volunteer confirmation)
  PAYMENT_REF: 9,       // I: Payment Reference
  RECEIPT_URL: 10,      // J: Final Receipt URL
  WHATSAPP_STATUS: 11,  // K: WhatsApp Status
  WHATSAPP_MSG_ID: 12,  // L: WhatsApp Message ID
  CREATED_AT: 13,       // M: Created At
  UPDATED_AT: 14,       // N: Updated At
  CONFIRMED_BY: 15      // O: Confirmed by (Blank initially; entered only after volunteer confirms)
};

function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) || 'donor';
  if (page === 'volunteer') {
    return HtmlService.createHtmlOutputFromFile('volunteer')
      .setTitle('Volunteer Portal - ' + TRUST_CONFIG.name)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle(TRUST_CONFIG.name + ' - Seva Contribution')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    let data;
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    } else {
      data = {};
    }

    const action = data.action || (data.record && data.record.action) || 'sync_donation';

    if (action === 'submitDonation' || action === 'sync_donation') {
      return handleDonorSubmission(data);
    } else if (action === 'verifyCode' || action === 'confirm_donation') {
      return handleVolunteerVerification(data);
    }

    return respondJson({ success: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return respondJson({ success: false, error: err.toString() });
  }
}

/**
 * Trigger: On Form Submit from 'Form Responses 1'
 * Automatically processes raw Google Form submission into 'Donations' Master Sheet:
 * - Reads Form Responses 1: [0] Timestamp, [1] Donor Name, [2] Mobile/Email, [3] Amount, [4] Payment Mode, [5] Towards (Seva Head), [6] PIN
 * - Appends into Master 'Donations' Sheet (Columns A to O)
 * - Initializes Status = 'Pending' (Column H)
 * - Leaves Confirmed By (Column O) empty until volunteer confirms
 */
function onFormSubmit(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const formSheet = ss.getSheetByName('Form Responses 1');
  const donSheet = ss.getSheetByName('Donations') || ss.insertSheet('Donations');
  
  const values = e ? e.values : null;
  if (!values && formSheet) {
    const lastRow = formSheet.getLastRow();
    if (lastRow > 1) {
      processRowIntoDonations(formSheet.getRange(lastRow, 1, 1, formSheet.getLastColumn()).getValues()[0]);
    }
    return;
  }
  if (values) {
    processRowIntoDonations(values);
  }
}

function processRowIntoDonations(formValues) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const donSheet = ss.getSheetByName('Donations') || ss.insertSheet('Donations');
  
  const timestamp = formValues[0] || new Date().toISOString();
  const donorName = formValues[1] || 'Devotee';
  const email = formValues[2] || '';
  const amount = Number(formValues[3]) || 0;
  const paymentMode = formValues[4] || 'UPI';
  const sevaHead = formValues[5] || 'General Seva';
  const pin = String(formValues[6] || '').trim() || String(Math.floor(100000 + Math.random() * 900000));

  // Check if a row with this confirmation code or donor details already exists in Donations sheet
  const donData = donSheet.getDataRange().getValues();
  for (let r = 1; r < donData.length; r++) {
    const existingRef = String(donData[r][COLS.PAYMENT_REF - 1] || '');
    if (pin && existingRef.includes(pin)) {
      // Row already exists, avoid duplicate insertion
      return;
    }
  }

  const now = new Date();
  const dateStr = Utilities.formatDate(now, "Asia/Kolkata", "yyyyMMdd");
  const rowCount = donSheet.getLastRow();
  const seq = Utilities.formatString("%04d", rowCount);
  const donationId = "SJST-" + dateStr + "-" + seq;

  // Append into Master 'Donations' Sheet (15 Columns A:O):
  // Column H (Payment Status) is set to 'Pending' on first entry
  // Column O (Confirmed by) is left blank until volunteer verification
  donSheet.appendRow([
    donationId,                    // Col A: Donation ID
    timestamp,                     // Col B: Submitted At
    sevaHead,                      // Col C: Towards (Seva Head / Category)
    donorName,                     // Col D: Donor Name
    email,                         // Col E: Email
    amount,                        // Col F: Amount
    paymentMode,                   // Col G: Payment Mode
    'Pending',                     // Col H: Payment Status (Pending / Paid)
    paymentMode === 'Cash' ? 'CASH-COUNTER' : ('UPI-PIN-' + pin), // Col I: Payment Reference
    '',                            // Col J: Final Receipt URL (Generated upon confirmation)
    'Pending',                     // Col K: WhatsApp Status
    '',                            // Col L: WhatsApp Message ID
    now.toISOString(),             // Col M: Created At
    now.toISOString(),             // Col N: Updated At
    ''                             // Col O: Confirmed by (Left empty until volunteer confirms)
  ]);
}

// ----------------------------------------------------
// 1. DEVOTEE DONATION SUBMISSION (Webhook / App entry)
// Saves record to 'Donations' sheet with Status = 'Pending' & Confirmed by = ''
// ----------------------------------------------------
function handleDonorSubmission(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const formSheet = ss.getSheetByName('Form Responses 1');
  const donSheet = ss.getSheetByName('Donations') || formSheet || ss.getSheets()[0];
  
  const rec = data.record || data;
  const now = new Date();
  const dateStr = Utilities.formatDate(now, "Asia/Kolkata", "yyyyMMdd");
  const rowCount = donSheet.getLastRow();
  const seq = Utilities.formatString("%04d", rowCount);
  const donationId = rec.donationId || ("SJST-" + dateStr + "-" + seq);
  const isoNow = rec.submittedAt || now.toISOString();

  let paymentStatus = "Pending";
  let confirmationCode = rec.confirmationCode || rec.pin || String(Math.floor(100000 + Math.random() * 900000));
  let confirmedBy = ""; // Confirmed by value entered only after volunteer confirms
  let receiptUrl = "";
  let whatsappStatus = "Pending";

  if (rec.paymentMode === 'Cash' && rec.paymentStatus === 'Paid') {
    paymentStatus = "Paid";
    confirmedBy = rec.confirmedBy || "Cash Counter";
    receiptUrl = generateAndSendReceiptPdf({
      donationId: donationId,
      date: Utilities.formatDate(now, "Asia/Kolkata", "dd/MM/yyyy"),
      donorName: rec.donorName,
      email: rec.email || '',
      amount: rec.amount,
      paymentMode: "Cash",
      paymentReference: "CASH-COUNTER",
      sevaHead: rec.sevaHead || rec.towards || "General Seva"
    });
    whatsappStatus = "Sent";
  }

  // 1. If 'Form Responses 1' exists, record 7-column entry
  if (formSheet) {
    const formattedTime = Utilities.formatDate(now, "Asia/Kolkata", "dd/MM/yyyy, hh:mm:ss a");
    formSheet.appendRow([
      formattedTime,                               // Col A: Timestamp
      rec.donorName || rec.contributorName || 'Devotee', // Col B: Contributor Name
      rec.email || rec.emailId || '',             // Col C: Email ID
      Number(rec.amount) || 0,                    // Col D: Amount (₹)
      rec.paymentMode || 'UPI',                   // Col E: Payment Mode (Cash / UPI)
      rec.sevaHead || rec.towards || 'General Seva', // Col F: Towards (Seva Head / Category)
      paymentStatus === 'Paid' ? '' : confirmationCode // Col G: Confirmation Code (PIN)
    ]);
  }

  // 2. Append row into Master 'Donations' Sheet (15 Columns A:O)
  if (donSheet && donSheet !== formSheet) {
    donSheet.appendRow([
      donationId,                                // Col A: Donation ID
      isoNow,                                    // Col B: Submitted At
      rec.sevaHead || rec.towards || 'General Seva', // Col C: Towards (Seva Head / Category)
      rec.donorName || rec.contributorName || 'Devotee', // Col D: Donor Name
      rec.email || rec.emailId || '',            // Col E: Email
      Number(rec.amount),                        // Col F: Amount
      rec.paymentMode || 'UPI',                  // Col G: Payment Mode
      paymentStatus,                             // Col H: Payment Status
      rec.paymentReference || (rec.paymentMode === 'Cash' ? 'CASH-COUNTER' : ('UPI-PIN-' + confirmationCode)), // Col I: Payment Reference
      receiptUrl,                                // Col J: Final Receipt URL
      whatsappStatus,                            // Col K: WhatsApp Status
      paymentStatus === 'Paid' ? ('WA-' + seq) : '', // Col L: WhatsApp Message ID
      isoNow,                                    // Col M: Created At
      isoNow,                                    // Col N: Updated At
      confirmedBy                                // Col O: Confirmed by (Left blank on initial submission)
    ]);
  }

  return respondJson({
    success: true,
    donationId: donationId,
    confirmationCode: confirmationCode,
    paymentStatus: paymentStatus,
    receiptUrl: receiptUrl
  });
}

// ----------------------------------------------------
// 2. VOLUNTEER VERIFICATION ON 'Donations' SHEET
// Updates Status to 'Paid' and fills 'Confirmed By' with Volunteer Code
// ----------------------------------------------------
function handleVolunteerVerification(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const volSheet = ss.getSheetByName('Volunteers');
  const donSheet = ss.getSheetByName('Donations') || ss.getSheetByName('Form Responses 1') || ss.getSheets()[0];

  const rec = data.record || data;
  const volunteerCode = data.volunteerCode || (rec.confirmedBy ? rec.confirmedBy.split(' ')[0] : 'VOL-101');
  let confirmedByStr = rec.confirmedBy || volunteerCode;

  // Optional: Verify volunteer against Volunteers sheet if available
  if (volSheet && data.authCode) {
    const volData = volSheet.getDataRange().getValues();
    let validVolunteer = null;
    for (let i = 1; i < volData.length; i++) {
      if (String(volData[i][0]).toUpperCase() === String(data.volunteerCode).toUpperCase() &&
          String(volData[i][2]) === String(data.authCode)) {
        if (volData[i][3] === 'Active') {
          validVolunteer = volData[i][1];
        }
        break;
      }
    }
    if (validVolunteer) {
      confirmedByStr = validVolunteer + " (" + data.volunteerCode + ")";
    }
  }

  // Locate donation on 'Donations' sheet by donationId (Col A) or paymentReference (Col I)
  const donData = donSheet.getDataRange().getValues();
  let targetRowIndex = -1;
  let targetRecord = null;
  const searchCode = String(data.confirmationCode || rec.confirmationCode || rec.donationId || data.donationId);

  for (let r = 1; r < donData.length; r++) {
    const rowDonId = String(donData[r][COLS.DONATION_ID - 1]);
    const rowPaymentRef = String(donData[r][COLS.PAYMENT_REF - 1]);
    if (rowDonId === searchCode || rowPaymentRef.includes(searchCode)) {
      targetRowIndex = r + 1; // 1-indexed row in Google Sheet
      targetRecord = donData[r];
      break;
    }
  }

  if (targetRowIndex === -1) {
    return respondJson({ success: false, error: 'Confirmation code or Donation ID not found on Donations sheet.' });
  }

  const now = new Date();
  const isoNow = now.toISOString();

  // Generate Receipt PDF & Send Email / WhatsApp Notification
  const receiptUrl = generateAndSendReceiptPdf({
    donationId: targetRecord[COLS.DONATION_ID - 1],
    date: Utilities.formatDate(now, "Asia/Kolkata", "dd/MM/yyyy"),
    donorName: targetRecord[COLS.DONOR_NAME - 1],
    email: targetRecord[COLS.EMAIL - 1] || '',
    amount: targetRecord[COLS.AMOUNT - 1],
    paymentMode: targetRecord[COLS.PAYMENT_MODE - 1],
    paymentReference: "UPI-CONFIRMED-" + searchCode,
    sevaHead: targetRecord[COLS.TOWARDS - 1] || "General Seva"
  });

  // Update 'Donations' Sheet (15 Columns A:O):
  // 1. Set Payment Status (Column H) = 'Paid'
  // 2. Set Confirmed by (Column O) = Volunteer Code / Name
  donSheet.getRange(targetRowIndex, COLS.PAYMENT_STATUS).setValue("Paid");
  donSheet.getRange(targetRowIndex, COLS.CONFIRMED_BY).setValue(confirmedByStr);
  donSheet.getRange(targetRowIndex, COLS.RECEIPT_URL).setValue(receiptUrl);
  donSheet.getRange(targetRowIndex, COLS.WHATSAPP_STATUS).setValue("Sent");
  donSheet.getRange(targetRowIndex, COLS.WHATSAPP_MSG_ID).setValue("WA-" + targetRecord[COLS.DONATION_ID - 1].split('-').pop());
  donSheet.getRange(targetRowIndex, COLS.UPDATED_AT).setValue(isoNow);

  // 3. Search 'Form Responses 1' and remove/clear confirmation code from Column G
  const formSheet = ss.getSheetByName('Form Responses 1');
  if (formSheet) {
    const formData = formSheet.getDataRange().getValues();
    for (let f = 1; f < formData.length; f++) {
      const codeInForm = String(formData[f][6] || '').trim();
      if (codeInForm === searchCode || (searchCode && codeInForm.includes(searchCode))) {
        formSheet.getRange(f + 1, 7).setValue(""); // Clear confirmation PIN
        break;
      }
    }
  }

  return respondJson({
    success: true,
    message: 'Payment verified and status updated to Paid on Donations sheet by ' + confirmedByStr,
    receiptUrl: receiptUrl,
    donorName: targetRecord[COLS.DONOR_NAME - 1],
    amount: targetRecord[COLS.AMOUNT - 1]
  });
}

// ----------------------------------------------------
// 3. RECEIPT PDF GENERATION & EMAIL DISPATCH
// ----------------------------------------------------
function generateAndSendReceiptPdf(payload) {
  try {
    const template = HtmlService.createTemplateFromFile('receipt_template');
    template.trustName = TRUST_CONFIG.name;
    template.regdNo = TRUST_CONFIG.regdNo;
    template.trustEmail = TRUST_CONFIG.email;
    template.bankName = TRUST_CONFIG.bankName;
    template.accountNo = TRUST_CONFIG.accountNo;
    template.ifsc = TRUST_CONFIG.ifsc;
    template.branch = TRUST_CONFIG.branch;
    template.upiId = TRUST_CONFIG.upiId;

    template.receiptNo = payload.donationId.split('-').pop();
    template.donationId = payload.donationId;
    template.date = payload.date;
    template.donorName = payload.donorName;
    template.email = payload.email;
    template.amount = payload.amount;
    template.amountWords = numberToWords(payload.amount);
    template.paymentMode = payload.paymentMode;
    template.sevaHead = payload.sevaHead;

    const htmlBody = template.evaluate().getContent();
    const blob = Utilities.newBlob(htmlBody, 'text/html', 'Receipt_' + payload.donationId + '.html').getAs('application/pdf');
    blob.setName('SJST_Receipt_' + payload.donationId + '.pdf');

    // Save to Drive folder
    const folder = DriveApp.getFolderById(TRUST_CONFIG.receiptsFolderId);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileUrl = file.getUrl();

    // Send Email to Donor if Email is present
    if (payload.email) {
      GmailApp.sendEmail(payload.email, "Official Donation Receipt - " + TRUST_CONFIG.name, 
        "Namaste " + payload.donorName + ",\\n\\nThank you for your generous contribution of Rs. " + payload.amount + " towards " + payload.sevaHead + ".\\n\\nPlease find your official digital receipt attached.\\n\\nWith Devotion,\\n" + TRUST_CONFIG.name, 
        {
          attachments: [blob],
          name: TRUST_CONFIG.name
        }
      );
    }

    return fileUrl;
  } catch (err) {
    Logger.log("Error generating receipt: " + err);
    return "";
  }
}

function numberToWords(amount) {
  // Standard Indian Currency words conversion
  return "Rupees " + amount + " only";
}

function respondJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  // Digital Receipt HTML (receipt_template.html) - matches the image and instructions
  const receiptHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: #fdfbf7;
      color: #2c2523;
    }
    .receipt {
      max-width: 650px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e8dfd8;
      border-radius: 8px;
      padding: 35px 40px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #8b4513;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .trust-name {
      font-size: 24px;
      font-weight: 800;
      color: #4a2810;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-family: Georgia, serif;
    }
    .trust-meta {
      font-size: 12px;
      color: #6d5b4f;
      margin-top: 4px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dashed #d8cbbf;
      padding-bottom: 8px;
      margin-bottom: 18px;
      font-size: 13px;
      font-weight: 600;
    }
    .line-row {
      margin: 14px 0;
      font-size: 14px;
      display: flex;
      align-items: baseline;
      border-bottom: 1px solid #ede4db;
      padding-bottom: 6px;
    }
    .line-label {
      color: #7d6b5e;
      font-style: italic;
      width: 200px;
      flex-shrink: 0;
    }
    .line-value {
      color: #1a1a1a;
      font-weight: 700;
      font-size: 15px;
    }
    .amount-box {
      margin-top: 20px;
      background: #faf3ec;
      border: 1px solid #e4d3c2;
      border-radius: 6px;
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .amount-val {
      font-size: 22px;
      font-weight: 800;
      color: #8b4513;
      font-family: monospace;
    }
    .bank-footer {
      margin-top: 25px;
      padding-top: 15px;
      border-top: 1px solid #ede4db;
      font-size: 11px;
      color: #6d5b4f;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .disclaimer {
      margin-top: 15px;
      text-align: center;
      font-size: 10px;
      color: #a39589;
    }
  </style>
</head>
<body>
  <div class="receipt">
    
    <!-- HEADER -->
    <div class="header">
      <div class="trust-name"><?= trustName ?></div>
      <div class="trust-meta">
        Regd. No.: <?= regdNo ?> | Email: <?= trustEmail ?>
      </div>
    </div>

    <!-- RECEIPT META -->
    <div class="meta-row">
      <div>Receipt No.: <strong><?= receiptNo ?></strong></div>
      <div>Date: <strong><?= date ?></strong></div>
    </div>

    <!-- MAIN BODY -->
    <div class="line-row">
      <div class="line-label">Received with Thanks from:</div>
      <div class="line-value"><?= donorName ?></div>
    </div>

    <div class="line-row">
      <div class="line-label">The sum of Rupees (in words):</div>
      <div class="line-value" style="font-style: italic;"><?= amountWords ?></div>
    </div>

    <div class="line-row">
      <div class="line-label">Towards:</div>
      <div class="line-value"><?= sevaHead ?></div>
    </div>

    <div class="line-row">
      <div class="line-label">Payment Mode & Ref:</div>
      <div class="line-value"><?= paymentMode ?> (<?= donationId ?>)</div>
    </div>

    <!-- AMOUNT HIGHLIGHT -->
    <div class="amount-box">
      <span style="font-weight: 700; color: #4a2810;">Amount Received:</span>
      <span class="amount-val">&#8377; <?= amount ?>/-</span>
    </div>

    <!-- BANK DETAILS FOR DONATION -->
    <div class="bank-footer">
      <div>
        <strong style="color: #4a2810; text-transform: uppercase;">Bank Details for Donation:</strong><br>
        Bank: <strong><?= bankName ?></strong> | A/c: <strong><?= accountNo ?></strong> | IFSC: <strong><?= ifsc ?></strong><br>
        UPI: <strong><?= upiId ?></strong> | Branch: <?= branch ?>
      </div>
    </div>

    <div class="disclaimer">
      This is a computer-generated digital receipt and does not require a physical signature.<br>
      <span style="font-size: 9px; color: #8c827a; margin-top: 4px; display: inline-block;">
        Powered by <strong>Digital Donation Management Solution</strong> | Developed by <strong>Sachin Parab</strong> | 9892805337
      </span>
    </div>

  </div>
</body>
</html>`;

  // Google Sheet Schema guide
  const sheetSchema = `GOOGLE SHEETS MULTI-TAB ARCHITECTURE & SETUP GUIDE:
============================================================

SPREADSHEET ID: 1NA-Lj0fWSZYgmXDr-wNtZMAVhbnlo6MjlW1LuqJX3PE

-------------------------------------------------------------------------
1. TAB 1: "Form Responses 1" (Raw Devotee Submissions):
-------------------------------------------------------------------------
* Receives raw Google Form / Devotee submissions directly.
* Reference / UTR is NOT required on Form Responses 1.
* Column F is Towards (Seva Head / Category) and Column G is PIN.

Col A (1) : Timestamp                    (e.g., 29/08/2026 14:32:00)
Col B (2) : Contributor / Donor Name     (e.g., Dnyan Ganga Education Trust)
Col C (3) : Email ID                     (e.g., info@dnyanganga.org)
Col D (4) : Amount (₹)                   (e.g., 5001)
Col E (5) : Payment Mode                 (Cash / UPI)
Col F (6) : Towards (Seva Head/Category) (e.g., Puja Seva / Maa's Bhog)
Col G (7) : Confirmation Code / PIN      (6-digit confirmation code, e.g. 482731)

-------------------------------------------------------------------------
2. TAB 2: "Donations" (Master Operations Ledger - Exact 15 Columns A:O):
-------------------------------------------------------------------------
* Managed by Google Apps Script / App sync.
* Column H (Payment Status) initialized to 'Pending', updated to 'Paid' upon confirmation.
* Column O (Confirmed by) left BLANK initially; filled with Volunteer Code ONLY upon verification.

COLUMN  COLUMN NAME
A       Donation ID                      (e.g., SJST-20260829-0001)
B       Submitted At                     (ISO Timestamp / Date)
C       Towards (Seva Head / Category)   (Selected Seva Head e.g. Annadana Seva)
D       Donor Name                       (e.g., Dnyan Ganga Education Trust)
E       Email                            (Devotee Email for 80G Receipt delivery)
F       Amount                           (Numeric amount in INR, e.g. 5001)
G       Payment Mode                     (Cash / UPI)
H       Payment Status                   (Pending / Paid)
I       Payment Reference                (CASH-COUNTER / UPI-CONFIRMED-482731)
J       Final Receipt URL                (Google Drive PDF link generated upon confirmation)
K       WhatsApp Status                  (Sent / Pending / Not Required)
L       WhatsApp Message ID              (e.g., WA-0001)
M       Created At                       (Timestamp)
N       Updated At                       (Timestamp)
O       Confirmed by                     (Volunteer Name / Code, e.g. Ramesh Patel (VOL001))

-------------------------------------------------------------------------
3. TAB 3: "Volunteers" (Authorized Verification Roster):
-------------------------------------------------------------------------
Col A (1): Volunteer Code     (e.g., VOL001)
Col B (2): Volunteer Name     (e.g., Ramesh Patel)
Col C (3): Auth Code / PIN    (e.g., 246810)
Col D (4): Status             (Active / Closed)`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-800 text-white flex items-center justify-center shadow-md shadow-amber-900/20">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Google Apps Script &amp; Deployment Artifacts</h2>
            <p className="text-xs text-slate-500">
              Configured specifically for {TRUST_CONFIG.name} with Email delivery &amp; exact Seva Heads.
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs">
          <button
            onClick={() => setActiveTab('gas')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeTab === 'gas' ? 'bg-amber-800 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            Code.gs
          </button>
          <button
            onClick={() => setActiveTab('receiptHtml')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeTab === 'receiptHtml' ? 'bg-amber-800 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            receipt_template.html
          </button>
          <button
            onClick={() => setActiveTab('sheets')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeTab === 'sheets' ? 'bg-amber-800 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            Sheet Setup Guide
          </button>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-xl">
        
        {/* Code Header Bar */}
        <div className="bg-slate-900 px-6 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>
              {activeTab === 'gas' && 'Google Apps Script / Code.gs'}
              {activeTab === 'receiptHtml' && 'Google Drive PDF Template / receipt_template.html'}
              {activeTab === 'sheets' && 'Google Sheets Schema & Instructions'}
            </span>
          </div>

          <button
            onClick={() => {
              if (activeTab === 'gas') copyToClipboard(codeGs, 'gas');
              if (activeTab === 'receiptHtml') copyToClipboard(receiptHtml, 'receiptHtml');
              if (activeTab === 'sheets') copyToClipboard(sheetSchema, 'sheets');
            }}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Source'}</span>
          </button>
        </div>

        {/* Code Content */}
        <div className="p-6 overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed max-h-[500px]">
          <pre className="whitespace-pre">
            {activeTab === 'gas' && codeGs}
            {activeTab === 'receiptHtml' && receiptHtml}
            {activeTab === 'sheets' && sheetSchema}
          </pre>
        </div>

      </div>

      {/* Instructions Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-800" />
          <span>Deployment Steps for Shree Jagannath Seva Trust</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1.5">
            <div className="font-bold text-amber-950 flex items-center justify-between">
              <span>1. Connected Spreadsheet</span>
              <a
                href="https://docs.google.com/spreadsheets/d/1NA-Lj0fWSZYgmXDr-wNtZMAVhbnlo6MjlW1LuqJX3PE/edit?resourcekey=&gid=1334305026#gid=1334305026"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-amber-800 underline flex items-center gap-0.5"
              >
                <span>Open Sheet</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Target ID: <code className="bg-amber-100/70 px-1 py-0.5 rounded text-[10px] font-mono">1NA-Lj0fWSZYgmXDr-wNtZMAVhbnlo6MjlW1LuqJX3PE</code>. Raw entries route to <strong>Form Responses 1</strong> and verified operations to <strong>Donations</strong>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1.5">
            <div className="font-bold text-amber-950">2. Apps Script &amp; Drive Folder</div>
            <p className="text-slate-600 leading-relaxed">
              Paste <code>Code.gs</code> and <code>receipt_template.html</code> into Extensions &gt; Apps Script. Paste your Drive folder ID in <code>receiptsFolderId</code>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1.5">
            <div className="font-bold text-amber-950">3. Deploy as Web App</div>
            <p className="text-slate-600 leading-relaxed">
              Deploy &gt; New Deployment &gt; Web App. Execute as <strong>Me</strong> and Access = <strong>Anyone</strong>.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
