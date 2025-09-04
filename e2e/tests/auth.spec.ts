import { test, expect } from '@playwright/test';
import { testUsers, urls, messages, selectors, waitForElement } from '../fixtures/test-data';

test.describe('Authentication Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(urls.home);
  });

  test('should display login page', async ({ page }) => {
    await page.goto(urls.login);
    
    // Vérifier les éléments de la page de connexion
    await expect(page).toHaveTitle(/Connexion/i);
    await expect(page.locator(selectors.emailInput)).toBeVisible();
    await expect(page.locator(selectors.passwordInput)).toBeVisible();
    await expect(page.locator(selectors.loginButton)).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto(urls.login);
    
    // Remplir le formulaire
    await page.fill(selectors.emailInput, testUsers.borrower.email);
    await page.fill(selectors.passwordInput, testUsers.borrower.password);
    
    // Soumettre
    await page.click(selectors.loginButton);
    
    // Vérifier la redirection vers le dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Vérifier que l'utilisateur est connecté
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto(urls.login);
    
    // Essayer avec des identifiants incorrects
    await page.fill(selectors.emailInput, 'invalid@gmah.org');
    await page.fill(selectors.passwordInput, 'WrongPassword123!');
    await page.click(selectors.loginButton);
    
    // Vérifier le message d'erreur
    await expect(page.locator('text=Email ou mot de passe incorrect')).toBeVisible();
    
    // Vérifier qu'on reste sur la page de connexion
    await expect(page).toHaveURL(/.*login/);
  });

  test('should validate email format', async ({ page }) => {
    await page.goto(urls.login);
    
    // Entrer un email invalide
    await page.fill(selectors.emailInput, 'invalid-email');
    await page.fill(selectors.passwordInput, testUsers.borrower.password);
    await page.click(selectors.loginButton);
    
    // Vérifier le message de validation
    await expect(page.locator('text=Email invalide')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // D'abord se connecter
    await page.goto(urls.login);
    await page.fill(selectors.emailInput, testUsers.borrower.email);
    await page.fill(selectors.passwordInput, testUsers.borrower.password);
    await page.click(selectors.loginButton);
    await page.waitForURL('**/dashboard');
    
    // Chercher et cliquer sur le bouton de déconnexion
    await page.click(selectors.logoutButton);
    
    // Vérifier la redirection vers login
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Essayer d'accéder au dashboard sans être connecté
    await page.goto(urls.dashboard);
    
    // Devrait être redirigé vers login
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto(urls.login);
    
    // Cliquer sur le lien "Mot de passe oublié"
    await page.click('text=Mot de passe oublié');
    
    // Vérifier la navigation
    await page.waitForURL('**/forgot-password');
    await expect(page).toHaveTitle(/Mot de passe oublié/i);
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('should submit forgot password form', async ({ page }) => {
    await page.goto(urls.forgotPassword);
    
    // Remplir et soumettre le formulaire
    await page.fill('input[name="email"]', testUsers.borrower.email);
    await page.click('button:has-text("Envoyer")');
    
    // Vérifier le message de succès
    await expect(page.locator('text=Email envoyé')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto(urls.login);
    
    const passwordInput = page.locator(selectors.passwordInput);
    
    // Vérifier que le mot de passe est masqué par défaut
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Cliquer sur l'icône pour afficher le mot de passe
    await page.click('button[aria-label="Show password"]');
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Cliquer à nouveau pour masquer
    await page.click('button[aria-label="Hide password"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should persist session on page refresh', async ({ page }) => {
    // Se connecter
    await page.goto(urls.login);
    await page.fill(selectors.emailInput, testUsers.borrower.email);
    await page.fill(selectors.passwordInput, testUsers.borrower.password);
    await page.click(selectors.loginButton);
    await page.waitForURL('**/dashboard');
    
    // Rafraîchir la page
    await page.reload();
    
    // Vérifier qu'on reste connecté
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Tableau de bord')).toBeVisible();
  });

  test('should handle 2FA if enabled', async ({ page }) => {
    // Se connecter avec un compte ayant 2FA activé
    await page.goto(urls.login);
    await page.fill(selectors.emailInput, testUsers.admin.email);
    await page.fill(selectors.passwordInput, testUsers.admin.password);
    await page.click(selectors.loginButton);
    
    // Si 2FA est activé, vérifier la page de vérification
    const has2FA = await page.locator('text=Code de vérification').isVisible();
    
    if (has2FA) {
      // Vérifier qu'on a le champ pour le code
      await expect(page.locator('input[name="code"]')).toBeVisible();
      await expect(page.locator('button:has-text("Vérifier")')).toBeVisible();
    }
  });
});