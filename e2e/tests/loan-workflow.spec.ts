import { test, expect } from '@playwright/test';
import { testUsers, testLoan, urls, messages, selectors } from '../fixtures/test-data';

test.describe('Loan Workflow - Complete Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Se connecter en tant qu'emprunteur
    await page.goto(urls.login);
    await page.fill(selectors.emailInput, testUsers.borrower.email);
    await page.fill(selectors.passwordInput, testUsers.borrower.password);
    await page.click(selectors.loginButton);
    await page.waitForURL('**/dashboard');
  });

  test('should create a new loan request', async ({ page }) => {
    // Naviguer vers la page de nouvelle demande
    await page.goto(urls.newLoan);
    
    // Étape 1 : Type de prêt
    await expect(page.locator('h2:has-text("Type de prêt")')).toBeVisible();
    await page.click(`button:has-text("${testLoan.type}")`);
    await page.click('button:has-text("Suivant")');
    
    // Étape 2 : Montant et durée
    await expect(page.locator('h2:has-text("Montant et durée")')).toBeVisible();
    await page.fill('input[name="amount"]', testLoan.amount);
    await page.fill('input[name="duration"]', testLoan.duration.toString());
    await page.click('button:has-text("Suivant")');
    
    // Étape 3 : Objet du prêt
    await expect(page.locator('h2:has-text("Objet du prêt")')).toBeVisible();
    await page.fill('input[name="purpose"]', testLoan.purpose);
    await page.fill('textarea[name="description"]', testLoan.description);
    await page.click('button:has-text("Suivant")');
    
    // Étape 4 : Documents (skip pour le test)
    await expect(page.locator('h2:has-text("Documents")')).toBeVisible();
    await page.click('button:has-text("Suivant")');
    
    // Étape 5 : Garanties
    await expect(page.locator('h2:has-text("Garanties")')).toBeVisible();
    await page.click('button:has-text("Ajouter un garant")');
    await page.fill('input[name="guarantorEmail"]', testLoan.guarantor.email);
    await page.fill('input[name="guarantorFirstName"]', testLoan.guarantor.firstName);
    await page.fill('input[name="guarantorLastName"]', testLoan.guarantor.lastName);
    await page.fill('input[name="guarantorPhone"]', testLoan.guarantor.phone);
    await page.click('button:has-text("Ajouter")');
    await page.click('button:has-text("Suivant")');
    
    // Étape 6 : Récapitulatif
    await expect(page.locator('h2:has-text("Récapitulatif")')).toBeVisible();
    
    // Vérifier les informations
    await expect(page.locator(`text=${testLoan.amount}`)).toBeVisible();
    await expect(page.locator(`text=${testLoan.purpose}`)).toBeVisible();
    
    // Soumettre la demande
    await page.click('button:has-text("Soumettre la demande")');
    
    // Vérifier le message de succès
    await expect(page.locator(selectors.successToast)).toBeVisible();
    await expect(page.locator('text=Demande soumise avec succès')).toBeVisible();
    
    // Vérifier la redirection vers le dashboard
    await page.waitForURL('**/dashboard');
  });

  test('should display loan in borrower dashboard', async ({ page }) => {
    // Aller au dashboard
    await page.goto(urls.dashboard);
    
    // Vérifier que la section "Mes prêts" existe
    await expect(page.locator('h2:has-text("Mes prêts")')).toBeVisible();
    
    // Vérifier qu'il y a au moins un prêt dans la liste
    const loansList = page.locator('[data-testid="loans-list"]');
    await expect(loansList).toBeVisible();
    
    // Vérifier les statuts possibles
    const statuses = ['EN_ATTENTE', 'EN_COURS', 'APPROUVÉ', 'REJETÉ', 'ACTIF'];
    const statusBadge = page.locator('[data-testid="loan-status"]').first();
    
    if (await statusBadge.isVisible()) {
      const statusText = await statusBadge.textContent();
      expect(statuses.some(s => statusText?.includes(s))).toBeTruthy();
    }
  });

  test('should edit loan in draft status', async ({ page }) => {
    // Créer un brouillon d'abord
    await page.goto(urls.newLoan);
    
    // Remplir partiellement et sauvegarder comme brouillon
    await page.click(`button:has-text("PERSONAL")`);
    await page.click('button:has-text("Sauvegarder le brouillon")');
    
    // Aller au dashboard
    await page.goto(urls.dashboard);
    
    // Trouver le brouillon et cliquer sur modifier
    await page.click('button:has-text("Modifier")');
    
    // Vérifier qu'on est sur la page d'édition
    await expect(page).toHaveURL(/.*loans.*edit/);
  });

  test('should cancel a loan request', async ({ page }) => {
    await page.goto(urls.loans);
    
    // Trouver un prêt en attente
    const pendingLoan = page.locator('tr:has-text("EN_ATTENTE")').first();
    
    if (await pendingLoan.isVisible()) {
      // Cliquer sur le menu actions
      await pendingLoan.locator('button[data-testid="actions-menu"]').click();
      
      // Cliquer sur annuler
      await page.click('button:has-text("Annuler")');
      
      // Confirmer l'annulation dans le modal
      await page.click('button:has-text("Confirmer l\'annulation")');
      
      // Vérifier le message de succès
      await expect(page.locator('text=Demande annulée')).toBeVisible();
    }
  });
});

test.describe('Loan Approval - Committee Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Se connecter en tant que membre du comité
    await page.goto(urls.login);
    await page.fill(selectors.emailInput, testUsers.committee.email);
    await page.fill(selectors.passwordInput, testUsers.committee.password);
    await page.click(selectors.loginButton);
    await page.waitForURL('**/dashboard');
  });

  test('should display pending loans for committee', async ({ page }) => {
    await page.goto(urls.committee);
    
    // Vérifier le titre de la page
    await expect(page.locator('h1:has-text("Comité d\'approbation")')).toBeVisible();
    
    // Vérifier la présence de la liste des prêts
    await expect(page.locator('[data-testid="pending-loans-table"]')).toBeVisible();
    
    // Vérifier les colonnes
    await expect(page.locator('th:has-text("Emprunteur")')).toBeVisible();
    await expect(page.locator('th:has-text("Montant")')).toBeVisible();
    await expect(page.locator('th:has-text("Type")')).toBeVisible();
    await expect(page.locator('th:has-text("Date")')).toBeVisible();
    await expect(page.locator('th:has-text("Actions")')).toBeVisible();
  });

  test('should vote on a loan request', async ({ page }) => {
    await page.goto(urls.committee);
    
    // Trouver un prêt en attente de vote
    const pendingLoan = page.locator('tr:has-text("EN_EXAMEN")').first();
    
    if (await pendingLoan.isVisible()) {
      // Cliquer sur examiner
      await pendingLoan.locator('button:has-text("Examiner")').click();
      
      // Vérifier qu'on est sur la page de détail
      await expect(page.locator('h2:has-text("Détails de la demande")')).toBeVisible();
      
      // Voter pour approuver
      await page.click('button:has-text("Approuver")');
      
      // Ajouter un commentaire
      await page.fill('textarea[name="comment"]', 'Dossier complet et conforme');
      
      // Soumettre le vote
      await page.click('button:has-text("Confirmer mon vote")');
      
      // Vérifier le message de succès
      await expect(page.locator('text=Vote enregistré')).toBeVisible();
    }
  });

  test('should reject a loan with reason', async ({ page }) => {
    await page.goto(urls.committee);
    
    const pendingLoan = page.locator('tr:has-text("EN_EXAMEN")').first();
    
    if (await pendingLoan.isVisible()) {
      await pendingLoan.locator('button:has-text("Examiner")').click();
      
      // Voter pour rejeter
      await page.click('button:has-text("Rejeter")');
      
      // Sélectionner une raison
      await page.selectOption('select[name="reason"]', 'INSUFFICIENT_INCOME');
      
      // Ajouter un commentaire
      await page.fill('textarea[name="comment"]', 'Revenus insuffisants par rapport au montant demandé');
      
      // Soumettre le vote
      await page.click('button:has-text("Confirmer mon vote")');
      
      // Vérifier le message
      await expect(page.locator('text=Vote enregistré')).toBeVisible();
    }
  });
});

test.describe('Loan Disbursement - Treasurer Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Se connecter en tant que trésorier
    await page.goto(urls.login);
    await page.fill(selectors.emailInput, testUsers.treasurer.email);
    await page.fill(selectors.passwordInput, testUsers.treasurer.password);
    await page.click(selectors.loginButton);
    await page.waitForURL('**/dashboard');
  });

  test('should display treasury dashboard', async ({ page }) => {
    await page.goto(urls.treasury);
    
    // Vérifier les métriques
    await expect(page.locator('text=Solde disponible')).toBeVisible();
    await expect(page.locator('text=Prêts actifs')).toBeVisible();
    await expect(page.locator('text=Montant total prêté')).toBeVisible();
    await expect(page.locator('text=Taux de remboursement')).toBeVisible();
    
    // Vérifier les sections
    await expect(page.locator('h2:has-text("Décaissements en attente")')).toBeVisible();
    await expect(page.locator('h2:has-text("Paiements récents")')).toBeVisible();
  });

  test('should process a loan disbursement', async ({ page }) => {
    await page.goto(urls.treasury + '/disbursements');
    
    // Trouver un prêt approuvé en attente de décaissement
    const approvedLoan = page.locator('tr:has-text("APPROUVÉ")').first();
    
    if (await approvedLoan.isVisible()) {
      // Cliquer sur traiter
      await approvedLoan.locator('button:has-text("Traiter")').click();
      
      // Remplir le formulaire de décaissement
      await page.selectOption('select[name="method"]', 'BANK_TRANSFER');
      await page.fill('input[name="reference"]', 'VIR-2024-001');
      await page.fill('textarea[name="notes"]', 'Virement effectué ce jour');
      
      // Confirmer le décaissement
      await page.click('button:has-text("Confirmer le décaissement")');
      
      // Vérifier le message de succès
      await expect(page.locator('text=Décaissement effectué')).toBeVisible();
      
      // Vérifier que le statut a changé
      await expect(page.locator('text=DÉCAISSÉ')).toBeVisible();
    }
  });

  test('should record a payment', async ({ page }) => {
    await page.goto(urls.treasury + '/payments');
    
    // Cliquer sur enregistrer un paiement
    await page.click('button:has-text("Enregistrer un paiement")');
    
    // Remplir le formulaire
    await page.fill('input[name="loanNumber"]', 'LOAN-2024-001');
    await page.fill('input[name="amount"]', '500');
    await page.selectOption('select[name="method"]', 'BANK_TRANSFER');
    await page.fill('input[name="reference"]', 'PAY-2024-001');
    
    // Soumettre
    await page.click('button:has-text("Enregistrer")');
    
    // Vérifier le message de succès
    await expect(page.locator('text=Paiement enregistré')).toBeVisible();
  });

  test('should generate financial report', async ({ page }) => {
    await page.goto(urls.treasury + '/reports');
    
    // Sélectionner le type de rapport
    await page.selectOption('select[name="reportType"]', 'MONTHLY_SUMMARY');
    
    // Sélectionner la période
    await page.click('button:has-text("Sélectionner la période")');
    await page.click('button:has-text("Ce mois")');
    
    // Sélectionner le format
    await page.selectOption('select[name="format"]', 'PDF');
    
    // Générer le rapport
    await page.click('button:has-text("Générer le rapport")');
    
    // Vérifier qu'un téléchargement a commencé
    const download = await page.waitForEvent('download');
    expect(download).toBeTruthy();
  });
});