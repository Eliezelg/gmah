#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Base translations structure
const enTranslations = {
  navigation: {
    home: "Home",
    dashboard: "Dashboard",
    loans: "Loans",
    myLoans: "My loans",
    newLoan: "New loan",
    loanRequests: "Loan requests",
    payments: "Payments",
    guarantees: "Guarantees",
    documents: "Documents",
    reports: "Reports",
    users: "Users",
    settings: "Settings",
    profile: "Profile",
    help: "Help",
    notifications: "Notifications",
    treasury: "Treasury",
    committee: "Committee",
    admin: "Administration"
  },
  loan: {
    title: "Loan",
    loanNumber: "Loan number",
    borrower: "Borrower",
    amount: "Amount",
    type: "Type",
    purpose: "Purpose",
    status: "Status",
    requestDate: "Request date",
    approvalDate: "Approval date",
    disbursementDate: "Disbursement date",
    repaymentSchedule: "Repayment schedule",
    guarantees: "Guarantees",
    documents: "Documents",
    interest: "Interest",
    duration: "Duration",
    monthlyPayment: "Monthly payment",
    totalRepayment: "Total repayment",
    outstandingBalance: "Outstanding balance",
    nextPaymentDate: "Next payment date",
    submit: "Submit request",
    approve: "Approve",
    reject: "Reject",
    disburse: "Disburse",
    statuses: {
      DRAFT: "Draft",
      SUBMITTED: "Submitted",
      UNDER_REVIEW: "Under review",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      DISBURSED: "Disbursed",
      ACTIVE: "Active",
      COMPLETED: "Completed",
      DEFAULTED: "Defaulted",
      CANCELLED: "Cancelled"
    },
    types: {
      PERSONAL: "Personal",
      BUSINESS: "Business",
      EDUCATION: "Education",
      MEDICAL: "Medical",
      EMERGENCY: "Emergency",
      OTHER: "Other"
    }
  },
  dashboard: {
    welcome: "Welcome",
    overview: "Overview",
    quickActions: "Quick actions",
    recentActivity: "Recent activity",
    statistics: "Statistics",
    totalLoans: "Total loans",
    activeLoans: "Active loans",
    pendingApproval: "Pending approval",
    totalDisbursed: "Total disbursed",
    totalCollected: "Total collected",
    outstandingAmount: "Outstanding amount",
    repaymentRate: "Repayment rate",
    defaultRate: "Default rate",
    admin: {
      title: "Admin Dashboard",
      subtitle: "Platform overview",
      underConstruction: "Under construction",
      underConstructionDesc: "The admin dashboard will be available soon",
      interfaceDescription: "This interface will allow managing users, loans and system configurations."
    },
    committee: {
      title: "Committee Dashboard",
      subtitle: "Review and vote on loan requests",
      underConstruction: "Under construction",
      underConstructionDesc: "The committee dashboard will be available soon",
      interfaceDescription: "This interface will allow reviewing requests and voting."
    },
    borrower: {
      title: "Dashboard",
      subtitle: "Manage your loans and track your repayments",
      newLoanButton: "New request",
      stats: {
        activeLoans: "Active loans",
        totalOf: "Out of {total} total",
        totalBorrowed: "Total borrowed",
        totalDisbursedDesc: "Total amount disbursed",
        repaid: "Repaid",
        repaidPercentage: "{percentage}% of total",
        completedLoans: "Completed loans",
        fullyRepaid: "Fully repaid"
      },
      upcomingPayments: {
        title: "Upcoming payments",
        viewDetails: "View details →"
      },
      tabs: {
        active: "Active ({count})",
        pending: "Pending ({count})",
        all: "All ({count})"
      },
      emptyStates: {
        noActiveLoans: "No active loans",
        noActiveLoanDesc: "You don't have any loans in repayment",
        makeNewLoan: "Apply for a loan",
        noPendingRequests: "No pending requests",
        noPendingDesc: "You don't have any pending requests",
        noLoansEver: "No loans",
        noLoansEverDesc: "You have never applied for a loan",
        firstLoan: "Make your first request"
      },
      loanDetails: {
        amount: "Amount",
        outstanding: "Outstanding",
        monthlyPayment: "Monthly payment",
        installments: "Installments",
        months: "months",
        requestedAmount: "Requested amount",
        requestDate: "Request date",
        type: "Type",
        date: "Date",
        viewDetails: "View details"
      }
    },
    layout: {
      headers: {
        borrower: "Dashboard",
        treasurer: "Financial Management",
        committee: "Approval Committee",
        admin: "Administration",
        superAdmin: "Super Administration"
      }
    }
  },
  payment: {
    title: "Payment",
    paymentNumber: "Payment number",
    amount: "Amount",
    date: "Date",
    method: "Method",
    status: "Status",
    reference: "Reference",
    makePayment: "Make payment",
    paymentHistory: "Payment history",
    upcomingPayments: "Upcoming payments",
    overduePayments: "Overdue payments",
    methods: {
      BANK_TRANSFER: "Bank transfer",
      CHECK: "Check",
      CASH: "Cash",
      CREDIT_CARD: "Credit card",
      STANDING_ORDER: "Standing order"
    },
    statuses: {
      PENDING: "Pending",
      PROCESSING: "Processing",
      COMPLETED: "Completed",
      FAILED: "Failed",
      CANCELLED: "Cancelled"
    }
  },
  committee: {
    title: "Approval Committee",
    members: "Members",
    pendingReview: "Pending review",
    votingInProgress: "Voting in progress",
    decisions: "Decisions",
    vote: "Vote",
    approve: "Approve",
    reject: "Reject",
    abstain: "Abstain",
    comments: "Comments",
    conditions: "Conditions",
    votingDeadline: "Voting deadline",
    unanimousRequired: "Unanimous required",
    majorityRequired: "Majority required"
  },
  treasury: {
    title: "Treasury",
    cashBalance: "Cash balance",
    pendingDisbursements: "Pending disbursements",
    expectedCollections: "Expected collections",
    cashFlow: "Cash flow",
    disbursements: "Disbursements",
    collections: "Collections",
    processDisbursement: "Process disbursement",
    recordPayment: "Record payment",
    bankDetails: "Bank details",
    transactionReference: "Transaction reference"
  },
  reports: {
    title: "Reports",
    generate: "Generate",
    export: "Export",
    schedule: "Schedule",
    loanReport: "Loan report",
    paymentReport: "Payment report",
    defaulterReport: "Defaulter report",
    financialSummary: "Financial summary",
    auditLog: "Audit log",
    selectPeriod: "Select period",
    format: "Format",
    excel: "Excel",
    pdf: "PDF",
    csv: "CSV"
  },
  settings: {
    title: "Settings",
    general: "General",
    security: "Security",
    notifications: "Notifications",
    language: "Language",
    theme: "Theme",
    twoFactorAuth: "Two-factor authentication",
    changePassword: "Change password",
    emailNotifications: "Email notifications",
    smsNotifications: "SMS notifications",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    systemDefault: "System default"
  },
  errors: {
    required: "This field is required",
    invalidEmail: "Invalid email",
    passwordTooShort: "Password must be at least 8 characters",
    passwordsDontMatch: "Passwords don't match",
    invalidPhone: "Invalid phone number",
    invalidAmount: "Invalid amount",
    somethingWentWrong: "Something went wrong",
    networkError: "Network error",
    unauthorized: "Unauthorized",
    forbidden: "Access forbidden",
    notFound: "Not found",
    serverError: "Server error"
  },
  calendar: {
    hebrew: "Hebrew calendar",
    gregorian: "Gregorian calendar",
    shemitah: "Shemitat Kesafim",
    months: {
      tishrei: "Tishrei",
      cheshvan: "Cheshvan",
      kislev: "Kislev",
      tevet: "Tevet",
      shevat: "Shevat",
      adar: "Adar",
      adar2: "Adar II",
      nissan: "Nissan",
      iyar: "Iyar",
      sivan: "Sivan",
      tamuz: "Tamuz",
      av: "Av",
      elul: "Elul"
    }
  },
  sidebar: {
    menu: {
      dashboardBorrower: "Dashboard",
      myLoans: "My loans",
      newLoan: "New request",
      myProfile: "My profile",
      dashboardGuarantor: "Dashboard",
      guarantees: "Guarantees",
      dashboardCommittee: "Dashboard",
      loansToReview: "Requests to review",
      votingHistory: "Voting history",
      statistics: "Statistics",
      dashboardTreasurer: "Dashboard",
      disbursements: "Disbursements",
      payments: "Payments",
      reports: "Reports",
      dashboardAdmin: "Dashboard",
      loanManagement: "Loan management",
      users: "Users",
      configuration: "Configuration",
      adminReports: "Reports"
    },
    userMenu: {
      myAccount: "My account",
      settings: "Settings",
      lightMode: "Light mode",
      darkMode: "Dark mode",
      logout: "Logout"
    }
  },
  languageSelector: {
    selectLanguage: "Select language"
  }
};

const heTranslations = {
  navigation: {
    home: "בית",
    dashboard: "לוח בקרה",
    loans: "הלוואות",
    myLoans: "ההלוואות שלי",
    newLoan: "הלוואה חדשה",
    loanRequests: "בקשות הלוואה",
    payments: "תשלומים",
    guarantees: "ערבויות",
    documents: "מסמכים",
    reports: "דוחות",
    users: "משתמשים",
    settings: "הגדרות",
    profile: "פרופיל",
    help: "עזרה",
    notifications: "התראות",
    treasury: "קופה",
    committee: "ועדה",
    admin: "ניהול"
  },
  loan: {
    title: "הלוואה",
    loanNumber: "מספר הלוואה",
    borrower: "לווה",
    amount: "סכום",
    type: "סוג",
    purpose: "מטרה",
    status: "סטטוס",
    requestDate: "תאריך בקשה",
    approvalDate: "תאריך אישור",
    disbursementDate: "תאריך העברה",
    repaymentSchedule: "לוח תשלומים",
    guarantees: "ערבויות",
    documents: "מסמכים",
    interest: "ריבית",
    duration: "משך",
    monthlyPayment: "תשלום חודשי",
    totalRepayment: "סך החזר",
    outstandingBalance: "יתרה לתשלום",
    nextPaymentDate: "תאריך תשלום הבא",
    submit: "הגש בקשה",
    approve: "אשר",
    reject: "דחה",
    disburse: "העבר",
    statuses: {
      DRAFT: "טיוטה",
      SUBMITTED: "הוגש",
      UNDER_REVIEW: "בבדיקה",
      APPROVED: "מאושר",
      REJECTED: "נדחה",
      DISBURSED: "הועבר",
      ACTIVE: "פעיל",
      COMPLETED: "הושלם",
      DEFAULTED: "בהפרה",
      CANCELLED: "בוטל"
    },
    types: {
      PERSONAL: "אישי",
      BUSINESS: "עסקי",
      EDUCATION: "לימודים",
      MEDICAL: "רפואי",
      EMERGENCY: "חירום",
      OTHER: "אחר"
    }
  },
  common: {
    appName: "מערכת גמ״ח",
    loading: "טוען...",
    save: "שמור",
    cancel: "ביטול",
    delete: "מחק",
    edit: "ערוך",
    search: "חיפוש",
    filter: "סינון",
    export: "ייצוא",
    import: "ייבוא",
    submit: "שלח",
    confirm: "אישור",
    back: "חזרה",
    next: "הבא",
    previous: "הקודם",
    yes: "כן",
    no: "לא",
    status: "סטטוס",
    actions: "פעולות",
    date: "תאריך",
    amount: "סכום",
    description: "תיאור",
    details: "פרטים",
    error: "שגיאה",
    success: "הצלחה",
    warning: "אזהרה",
    info: "מידע"
  },
  auth: {
    login: {
      title: "כניסה למערכת גמ״ח",
      subtitle: "הזן את פרטי ההזדהות שלך",
      email: "דוא״ל",
      emailPlaceholder: "name@example.com",
      password: "סיסמה",
      passwordPlaceholder: "••••••••",
      forgotPassword: "שכחת סיסמה?",
      loginButton: "כניסה",
      noAccount: "אין לך חשבון?",
      signUpLink: "הרשמה",
      loginSuccess: "כניסה הצליחה!",
      loginError: "שגיאת כניסה",
      rememberMe: "זכור אותי"
    },
    register: {
      title: "הרשמה",
      email: "דוא״ל",
      password: "סיסמה",
      confirmPassword: "אישור סיסמה",
      createAccount: "צור חשבון",
      alreadyHaveAccount: "יש לך כבר חשבון?",
      registerSuccess: "הרשמה הצליחה",
      registerError: "שגיאת הרשמה",
      accountCreated: "החשבון נוצר בהצלחה"
    },
    reset: {
      forgotPassword: "שכחת סיסמה?",
      resetPassword: "איפוס סיסמה",
      passwordResetSent: "נשלח דוא״ל לאיפוס סיסמה",
      passwordResetSuccess: "הסיסמה אופסה בהצלחה"
    },
    logout: "יציאה",
    validation: {
      invalidEmail: "דוא״ל לא תקין",
      passwordTooShort: "הסיסמה חייבת להכיל לפחות 6 תווים",
      passwordsDontMatch: "הסיסמאות אינן תואמות",
      invalidCredentials: "פרטי הזדהות שגויים"
    }
  },
  dashboard: {
    welcome: "ברוך הבא",
    overview: "סקירה",
    quickActions: "פעולות מהירות",
    recentActivity: "פעילות אחרונה",
    statistics: "סטטיסטיקות",
    totalLoans: "סך הלוואות",
    activeLoans: "הלוואות פעילות",
    pendingApproval: "ממתינות לאישור",
    totalDisbursed: "סך הועבר",
    totalCollected: "סך נגבה",
    outstandingAmount: "סכום לגבייה",
    repaymentRate: "שיעור החזר",
    defaultRate: "שיעור הפרה",
    admin: {
      title: "לוח בקרה מנהל",
      subtitle: "סקירת המערכת",
      underConstruction: "בבנייה",
      underConstructionDesc: "לוח הבקרה למנהל יהיה זמין בקרוב",
      interfaceDescription: "ממשק זה יאפשר ניהול משתמשים, הלוואות והגדרות מערכת."
    },
    committee: {
      title: "לוח בקרה ועדה",
      subtitle: "בדיקה והצבעה על בקשות הלוואה",
      underConstruction: "בבנייה",
      underConstructionDesc: "לוח הבקרה לוועדה יהיה זמין בקרוב",
      interfaceDescription: "ממשק זה יאפשר בדיקת בקשות והצבעה."
    },
    borrower: {
      title: "לוח בקרה",
      subtitle: "נהל את ההלוואות שלך ועקוב אחר ההחזרים",
      newLoanButton: "בקשה חדשה",
      stats: {
        activeLoans: "הלוואות פעילות",
        totalOf: "מתוך {total} בסך הכל",
        totalBorrowed: "סך לווה",
        totalDisbursedDesc: "סכום כולל שהועבר",
        repaid: "הוחזר",
        repaidPercentage: "{percentage}% מהסך הכל",
        completedLoans: "הלוואות שהושלמו",
        fullyRepaid: "הוחזרו במלואן"
      },
      upcomingPayments: {
        title: "תשלומים קרובים",
        viewDetails: "צפה בפרטים ←"
      },
      tabs: {
        active: "פעילות ({count})",
        pending: "בהמתנה ({count})",
        all: "הכל ({count})"
      },
      emptyStates: {
        noActiveLoans: "אין הלוואות פעילות",
        noActiveLoanDesc: "אין לך הלוואות בהחזר",
        makeNewLoan: "הגש בקשת הלוואה",
        noPendingRequests: "אין בקשות בהמתנה",
        noPendingDesc: "אין לך בקשות בהמתנה",
        noLoansEver: "אין הלוואות",
        noLoansEverDesc: "מעולם לא הגשת בקשת הלוואה",
        firstLoan: "הגש את בקשתך הראשונה"
      },
      loanDetails: {
        amount: "סכום",
        outstanding: "יתרה",
        monthlyPayment: "תשלום חודשי",
        installments: "תשלומים",
        months: "חודשים",
        requestedAmount: "סכום מבוקש",
        requestDate: "תאריך בקשה",
        type: "סוג",
        date: "תאריך",
        viewDetails: "צפה בפרטים"
      }
    },
    layout: {
      headers: {
        borrower: "לוח בקרה",
        treasurer: "ניהול פיננסי",
        committee: "ועדת אישורים",
        admin: "ניהול",
        superAdmin: "ניהול ראשי"
      }
    }
  },
  sidebar: {
    menu: {
      dashboardBorrower: "לוח בקרה",
      myLoans: "ההלוואות שלי",
      newLoan: "בקשה חדשה",
      myProfile: "הפרופיל שלי",
      dashboardGuarantor: "לוח בקרה",
      guarantees: "ערבויות",
      dashboardCommittee: "לוח בקרה",
      loansToReview: "בקשות לבדיקה",
      votingHistory: "היסטוריית הצבעות",
      statistics: "סטטיסטיקות",
      dashboardTreasurer: "לוח בקרה",
      disbursements: "העברות",
      payments: "תשלומים",
      reports: "דוחות",
      dashboardAdmin: "לוח בקרה",
      loanManagement: "ניהול הלוואות",
      users: "משתמשים",
      configuration: "הגדרות",
      adminReports: "דוחות"
    },
    userMenu: {
      myAccount: "החשבון שלי",
      settings: "הגדרות",
      lightMode: "מצב בהיר",
      darkMode: "מצב כהה",
      logout: "יציאה"
    }
  },
  languageSelector: {
    selectLanguage: "בחר שפה"
  }
};

async function generateTranslations() {
  console.log('Generating base translations for EN and HE...');

  // Write English translations
  for (const [module, content] of Object.entries(enTranslations)) {
    const filePath = path.join(__dirname, '..', 'messages', 'en', `${module}.json`);
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8');
    console.log(`✓ Created en/${module}.json`);
  }

  // Write Hebrew translations
  for (const [module, content] of Object.entries(heTranslations)) {
    const filePath = path.join(__dirname, '..', 'messages', 'he', `${module}.json`);
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8');
    console.log(`✓ Created he/${module}.json`);
  }

  console.log('Base translations generated successfully!');
}

generateTranslations().catch(console.error);