/**
 * Données de test pour les tests E2E
 */

export const testUsers = {
  admin: {
    email: 'admin@gmah.org',
    password: 'Admin123!',
    role: 'ADMIN'
  },
  borrower: {
    email: 'borrower.test@gmah.org',
    password: 'Borrower123!',
    role: 'BORROWER',
    firstName: 'Jean',
    lastName: 'Dupont',
    phone: '0123456789'
  },
  committee: {
    email: 'committee@gmah.org',
    password: 'Committee123!',
    role: 'COMMITTEE'
  },
  treasurer: {
    email: 'treasurer@gmah.org',
    password: 'Treasurer123!',
    role: 'TREASURER'
  },
  guarantor: {
    email: 'guarantor@gmah.org',
    password: 'Guarantor123!',
    role: 'GUARANTOR'
  }
};

export const testLoan = {
  type: 'PERSONAL',
  amount: '5000',
  duration: 12,
  purpose: 'Test E2E - Achat équipement',
  description: 'Demande de prêt automatisée pour test E2E',
  documents: {
    identity: 'test-id-card.pdf',
    income: 'test-income.pdf',
    residence: 'test-residence.pdf'
  },
  guarantor: {
    email: 'guarantor.test@gmah.org',
    firstName: 'Pierre',
    lastName: 'Martin',
    phone: '0987654321'
  }
};

export const testPayment = {
  amount: '500',
  method: 'BANK_TRANSFER',
  reference: 'TEST-PAY-001'
};

export const urls = {
  home: '/fr',
  login: '/fr/login',
  register: '/fr/register',
  forgotPassword: '/fr/forgot-password',
  resetPassword: '/fr/reset-password',
  dashboard: '/fr/dashboard',
  loans: '/fr/loans',
  newLoan: '/fr/loans/new',
  committee: '/fr/committee',
  treasury: '/fr/treasury',
  profile: '/fr/profile',
  settings: '/fr/settings'
};

export const messages = {
  loginSuccess: 'Connexion réussie',
  logoutSuccess: 'Déconnexion réussie',
  loanSubmitted: 'Votre demande de prêt a été soumise avec succès',
  loanApproved: 'Le prêt a été approuvé',
  loanRejected: 'Le prêt a été rejeté',
  paymentRecorded: 'Le paiement a été enregistré',
  profileUpdated: 'Profil mis à jour avec succès',
  passwordChanged: 'Mot de passe modifié avec succès',
  emailSent: 'Email envoyé avec succès'
};

export const selectors = {
  // Auth
  emailInput: 'input[name="email"]',
  passwordInput: 'input[name="password"]',
  loginButton: 'button[type="submit"]:has-text("Se connecter")',
  logoutButton: 'button:has-text("Déconnexion")',
  
  // Navigation
  sidebar: '[data-testid="sidebar"]',
  navLink: (text: string) => `a:has-text("${text}")`,
  
  // Forms
  submitButton: 'button[type="submit"]',
  cancelButton: 'button:has-text("Annuler")',
  
  // Loan
  loanTypeSelect: 'select[name="type"]',
  amountInput: 'input[name="amount"]',
  durationInput: 'input[name="duration"]',
  purposeTextarea: 'textarea[name="purpose"]',
  
  // Notifications
  toast: '.sonner-toast',
  successToast: '.sonner-toast-success',
  errorToast: '.sonner-toast-error',
  
  // Tables
  dataTable: '[data-testid="data-table"]',
  tableRow: 'tr',
  
  // Modals
  modal: '[role="dialog"]',
  modalTitle: '[role="dialog"] h2',
  modalClose: '[role="dialog"] button[aria-label="Close"]'
};

export const timeouts = {
  short: 5000,
  medium: 10000,
  long: 30000,
  navigation: 30000,
  apiCall: 15000
};

/**
 * Helper pour générer un email unique pour les tests
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}.${timestamp}.${random}@gmah.test`;
}

/**
 * Helper pour attendre un élément
 */
export async function waitForElement(page: any, selector: string, timeout = timeouts.medium) {
  await page.waitForSelector(selector, { timeout });
}

/**
 * Helper pour attendre une navigation
 */
export async function waitForNavigation(page: any, url: string, timeout = timeouts.navigation) {
  await page.waitForURL(url, { timeout });
}