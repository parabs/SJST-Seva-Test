export interface DonationRecord {
  donationId: string; // Col A: Donation ID
  submittedAt: string; // Col B: Submitted At
  donorName: string; // Contributor / Donor Name
  mobile?: string; // Mobile / Contact
  email?: string; // Devotee Email ID
  phone?: string; // Devotee Phone
  amount: number; // Amount (₹)
  paymentMode: 'Cash' | 'UPI'; // Payment Mode
  paymentStatus: 'Paid' | 'Pending' | 'Confirmation Pending' | 'Cancelled'; // Payment Status
  paymentReference: string; // Payment Reference
  receiptUrl: string; // Final Receipt URL
  whatsappStatus?: 'Pending' | 'Sent' | 'Not Required' | 'Failed'; // WhatsApp Status
  whatsappMessageId?: string; // WhatsApp Message ID
  emailStatus?: 'Pending' | 'Sent' | 'Not Required' | 'Failed'; // Email Status
  emailMessageId?: string; // Email Message ID
  createdAt: string; // Created At
  updatedAt: string; // Updated At
  confirmedBy: string; // Confirmed by
  volunteerName?: string;
  confirmationCode: string; // 6-digit PIN in Form Responses 1 Col G & verification PIN
  sevaCategory?: string; // e.g. "General Seva", "Maha Ashtami Puja"
  sevaHead?: string; // e.g. "Maa's Bhog", "Anna Dana"
}

export interface VolunteerRecord {
  volunteerCode: string;
  volunteerName: string;
  authCode: string; // Plain or Hashed PIN
  status: 'Created' | 'Active' | 'Closed';
  phone?: string;
  email?: string;
  role?: string;
  verifiedSeva?: number;
}

export interface SevaOption {
  id: string;
  name: string;
  amount: number;
}

export interface SevaCategory {
  category: string;
  items: SevaOption[];
}

export interface GmailAuthConfig {
  senderEmail: string;
  senderName: string;
  authMethod: 'google_oauth' | 'app_password';
  isAuthenticated: boolean;
  authenticatedAt?: string;
  appPassword?: string;
  replyToEmail?: string;
  dailyQuotaUsed?: number;
  dailyQuotaLimit?: number;
}

export interface TrustConfig {
  name: string;
  regdNo: string;
  email: string;
  address?: string;
  phone?: string;
  panNo?: string;
  section80G?: string;
  bankName: string;
  accountName: string;
  accountNo: string;
  ifsc: string;
  branch: string;
  upiId: string;
  receiptsFolderId: string;
  gmailAuth?: GmailAuthConfig;
}

