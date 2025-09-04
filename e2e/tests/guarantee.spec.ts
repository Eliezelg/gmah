import { test, expect } from '@playwright/test';
import { testUsers, urls, selectors } from '../fixtures/test-data';

test.describe('Guarantee Electronic Signature', () => {
  
  test('should access guarantee signature page', async ({ page }) => {
    // Accéder directement avec un token (simulé)
    const mockToken = 'test-guarantee-token-123';
    await page.goto(`/guarantees/sign?token=${mockToken}`);
    
    // Vérifier les éléments de la page
    await expect(page.locator('h1:has-text("Signature de garantie")')).toBeVisible();
    await expect(page.locator('text=Détails du prêt')).toBeVisible();
  });

  test('should display loan details for guarantee', async ({ page }) => {
    const mockToken = 'test-guarantee-token-123';
    await page.goto(`/guarantees/sign?token=${mockToken}`);
    
    // Vérifier les informations affichées
    await expect(page.locator('text=Emprunteur')).toBeVisible();
    await expect(page.locator('text=Montant')).toBeVisible();
    await expect(page.locator('text=Durée')).toBeVisible();
    await expect(page.locator('text=Objet du prêt')).toBeVisible();
  });

  test('should validate guarantee form', async ({ page }) => {
    const mockToken = 'test-guarantee-token-123';
    await page.goto(`/guarantees/sign?token=${mockToken}`);
    
    // Essayer de soumettre sans remplir
    await page.click('button:has-text("Signer la garantie")');
    
    // Vérifier les messages de validation
    await expect(page.locator('text=Ce champ est requis')).toBeVisible();
  });

  test('should sign guarantee electronically', async ({ page }) => {
    const mockToken = 'test-guarantee-token-123';
    await page.goto(`/guarantees/sign?token=${mockToken}`);
    
    // Remplir le formulaire
    await page.fill('input[name="firstName"]', 'Pierre');
    await page.fill('input[name="lastName"]', 'Martin');
    await page.fill('input[name="email"]', 'pierre.martin@example.com');
    await page.fill('input[name="phone"]', '0612345678');
    
    // Cocher les conditions
    await page.check('input[name="acceptTerms"]');
    await page.check('input[name="acceptResponsibility"]');
    
    // Signature (canvas ou texte)
    const signatureCanvas = page.locator('canvas[data-testid="signature-canvas"]');
    if (await signatureCanvas.isVisible()) {
      // Simuler une signature sur le canvas
      const box = await signatureCanvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 4, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 3 * box.width / 4, box.y + box.height / 2);
        await page.mouse.up();
      }
    } else {
      // Ou signature textuelle
      await page.fill('input[name="signature"]', 'Pierre Martin');
    }
    
    // Soumettre
    await page.click('button:has-text("Signer la garantie")');
    
    // Vérifier la redirection vers la page de succès
    await page.waitForURL('**/guarantees/success');
    await expect(page.locator('text=Signature enregistrée')).toBeVisible();
  });

  test('should show error for expired token', async ({ page }) => {
    const expiredToken = 'expired-token-123';
    await page.goto(`/guarantees/sign?token=${expiredToken}`);
    
    // Vérifier le message d'erreur
    await expect(page.locator('text=Lien expiré')).toBeVisible();
  });

  test('should show error for invalid token', async ({ page }) => {
    const invalidToken = 'invalid-token';
    await page.goto(`/guarantees/sign?token=${invalidToken}`);
    
    // Vérifier le message d'erreur
    await expect(page.locator('text=Lien invalide')).toBeVisible();
  });

  test('should resend guarantee request', async ({ page }) => {
    // Se connecter en tant qu'emprunteur
    await page.goto(urls.login);
    await page.fill(selectors.emailInput, testUsers.borrower.email);
    await page.fill(selectors.passwordInput, testUsers.borrower.password);
    await page.click(selectors.loginButton);
    await page.waitForURL('**/dashboard');
    
    // Aller sur un prêt avec garantie
    await page.goto(urls.loans);
    await page.click('tr:first-child');
    
    // Trouver le bouton renvoyer pour une garantie
    const resendButton = page.locator('button:has-text("Renvoyer la demande")').first();
    if (await resendButton.isVisible()) {
      await resendButton.click();
      
      // Confirmer
      await page.click('button:has-text("Confirmer")');
      
      // Vérifier le message de succès
      await expect(page.locator('text=Demande renvoyée')).toBeVisible();
    }
  });

  test('should display guarantee status', async ({ page }) => {
    // Se connecter
    await page.goto(urls.login);
    await page.fill(selectors.emailInput, testUsers.borrower.email);
    await page.fill(selectors.passwordInput, testUsers.borrower.password);
    await page.click(selectors.loginButton);
    await page.waitForURL('**/dashboard');
    
    // Aller sur les détails d'un prêt
    await page.goto(urls.loans);
    await page.click('tr:first-child');
    
    // Vérifier les statuts de garantie
    const guaranteeStatuses = ['EN_ATTENTE', 'SIGNÉE', 'REFUSÉE', 'EXPIRÉE'];
    const statusBadges = page.locator('[data-testid="guarantee-status"]');
    
    const count = await statusBadges.count();
    for (let i = 0; i < count; i++) {
      const text = await statusBadges.nth(i).textContent();
      expect(guaranteeStatuses.some(s => text?.includes(s))).toBeTruthy();
    }
  });

  test('should download guarantee document', async ({ page }) => {
    // Se connecter
    await page.goto(urls.login);
    await page.fill(selectors.emailInput, testUsers.borrower.email);
    await page.fill(selectors.passwordInput, testUsers.borrower.password);
    await page.click(selectors.loginButton);
    await page.waitForURL('**/dashboard');
    
    // Aller sur les détails d'un prêt avec garantie signée
    await page.goto(urls.loans);
    await page.click('tr:has-text("ACTIF"):first-child');
    
    // Chercher le bouton de téléchargement
    const downloadButton = page.locator('button:has-text("Télécharger la garantie")').first();
    if (await downloadButton.isVisible()) {
      // Attendre le téléchargement
      const downloadPromise = page.waitForEvent('download');
      await downloadButton.click();
      const download = await downloadPromise;
      
      // Vérifier que le fichier existe
      expect(download).toBeTruthy();
      expect(download.suggestedFilename()).toContain('garantie');
    }
  });
});