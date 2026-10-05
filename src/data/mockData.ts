import { DonationRecord, VolunteerRecord, TrustConfig, SevaCategory } from '../types';

export const TRUST_CONFIG: TrustConfig = {
  name: 'SHREE JAGANNATH SEVA TRUST',
  regdNo: 'E-12018/Thane',
  email: 'shreejagannathsevatrust.thane@gmail.com',
  address: 'Regd. Office: Flat No. 103, G5,Unnathi Greens,G.B. Road, Kasarvadavali,  Thane (West) - 400615, Maharashtra',
  phone: '+91 93247 88848',
  panNo: 'ABCTS6864K',
  section80G: '',
  bankName: 'STATE BANK OF INDIA (SBI)',
  accountName: 'SHREE JAGANNATH SEVA TRUST',
  accountNo: '40994707688',
  ifsc: 'SBIN0010786',
  branch: 'GHODBUNDER ROAD, THANE',
  upiId: 'SJSTTHANE@SBI',
  receiptsFolderId: '1AbCdEfGhIjKlMnOpQrStUvWxYz_ReceiptsFolder',
  gmailAuth: {
    senderEmail: 'shreejagannathsevatrust.thane@gmail.com',
    senderName: 'SHREE JAGANNATH SEVA TRUST, THANE',
    authMethod: 'google_oauth',
    isAuthenticated: true,
    authenticatedAt: '2026-08-28T07:00:00.000Z',
    appPassword: '•••• •••• •••• ••••',
    replyToEmail: 'shreejagannathsevatrust.thane@gmail.com',
    dailyQuotaUsed: 14,
    dailyQuotaLimit: 500
  }
};

export const SEVA_CATEGORIES: SevaCategory[] = [
  {
    category: 'General Seva',
    items: [
      { id: 'murti-5001', name: 'Murti Seva', amount: 5001 },
      { id: 'murti-11001', name: 'Murti Seva', amount: 11001 },
      { id: 'murti-21001', name: 'Murti Seva', amount: 21001 },
      { id: 'purohit-5000', name: 'Purohit Seva', amount: 5000 },
      { id: 'annadana-5001', name: 'Anna Dana', amount: 5001 },
      { id: 'annadana-10001', name: 'Anna Dana', amount: 10001 },
      { id: 'annadana-15001', name: 'Anna Dana', amount: 15001 },
    ]
  },
  {
    category: 'Maha Shashti Puja',
    items: [
      { id: 'shashti-puja-4001', name: 'Maha Shashti Puja', amount: 4001 },
      { id: 'shashti-bhog-3001', name: "Maa's Bhog", amount: 3001 },
      { id: 'shashti-phool-2001', name: "Maa's Phool", amount: 2001 },
      { id: 'shashti-mistanna-2001', name: 'Mistanna', amount: 2001 },
    ]
  },
  {
    category: 'Maha Saptami Puja',
    items: [
      { id: 'saptami-puja-4501', name: 'Maha Saptami Puja', amount: 4501 },
      { id: 'saptami-bhog-3501', name: "Maa's Bhog", amount: 3501 },
      { id: 'saptami-phool-2001', name: "Maa's Phool", amount: 2001 },
      { id: 'saptami-aarati-3001', name: 'Sandhya Aarati', amount: 3001 },
      { id: 'saptami-mistanna-2001', name: 'Mistanna', amount: 2001 },
      { id: 'saptami-kanya-1101', name: 'Kanya Puja (11 Kanyas)', amount: 1101 },
    ]
  },
  {
    category: 'Maha Ashtami Puja',
    items: [
      { id: 'ashtami-puja-5001', name: 'Maha Ashtami Puja', amount: 5001 },
      { id: 'ashtami-bhog-4001', name: "Maa's Bhog", amount: 4001 },
      { id: 'ashtami-phool-3001', name: "Maa's Phool", amount: 3001 },
      { id: 'ashtami-lotus-7001', name: 'Sandhi Puja Lotus 108 nos', amount: 7001 },
    ]
  },
  {
    category: 'Sandhi Puja',
    items: [
      { id: 'sandhi-deepa-3001', name: 'Sandhi Puja Deepa 108 nos', amount: 3001 },
      { id: 'sandhi-belapatra-2001', name: 'Sandhi Puja Bela Patra 108 nos', amount: 2001 },
      { id: 'sandhi-aarati-3001', name: 'Sandhya Aarati', amount: 3001 },
      { id: 'sandhi-mistanna-2001', name: 'Mistanna', amount: 2001 },
    ]
  },
  {
    category: 'Maha Navami Puja',
    items: [
      { id: 'navami-puja-4001', name: 'Maha Navami Puja', amount: 4001 },
      { id: 'navami-bhog-3001', name: "Maa's Bhog", amount: 3001 },
      { id: 'navami-phool-2001', name: "Maa's Phool", amount: 2001 },
      { id: 'navami-aarati-3001', name: 'Sandhya Aarati', amount: 3001 },
      { id: 'navami-mistanna-2001', name: 'Mistanna', amount: 2001 },
    ]
  },
  {
    category: 'Vijaya Dashami Puja',
    items: [
      { id: 'dashami-puja-4001', name: 'Vijaya Dashami Puja', amount: 4001 },
      { id: 'dashami-aparajita-3001', name: 'Aparajita Puja', amount: 3001 },
      { id: 'dashami-mistanna-2001', name: 'Mistanna', amount: 2001 },
      { id: 'dashami-visarjan-5001', name: 'Visarjan', amount: 5001 },
    ]
  }
];

export const INITIAL_VOLUNTEERS: VolunteerRecord[] = [
  {
    volunteerCode: 'VOL001',
    volunteerName: 'Ramesh Patel',
    authCode: '246810',
    status: 'Active'
  },
  {
    volunteerCode: 'VOL002',
    volunteerName: 'Sachin Parab',
    authCode: '135790',
    status: 'Active'
  },
  {
    volunteerCode: 'VOL003',
    volunteerName: 'Priya Sharma',
    authCode: '987654',
    status: 'Active'
  },
  {
    volunteerCode: 'VOL004',
    volunteerName: 'Inactive Volunteer',
    authCode: '000000',
    status: 'Closed'
  }
];

export const INITIAL_DONATIONS: DonationRecord[] = [];

export function numberToWordsInr(amount: number): string {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (amount === 0) return 'Zero Rupees only';

  function convertGroup(num: number): string {
    let str = '';
    if (num > 99) {
      str += a[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num > 0) {
      if (str !== '') str += 'and ';
      if (num < 20) {
        str += a[num];
      } else {
        str += b[Math.floor(num / 10)];
        if (num % 10 > 0) {
          str += ' ' + a[num % 10];
        }
      }
    }
    return str.trim();
  }

  let crore = Math.floor(amount / 10000000);
  let lakh = Math.floor((amount % 10000000) / 100000);
  let thousand = Math.floor((amount % 100000) / 1000);
  let remainder = amount % 1000;

  let words = '';
  if (crore > 0) words += convertGroup(crore) + ' Crore ';
  if (lakh > 0) words += convertGroup(lakh) + ' Lakh ';
  if (thousand > 0) words += convertGroup(thousand) + ' Thousand ';
  if (remainder > 0) words += convertGroup(remainder);

  return words.trim() + ' Rupees only';
}
