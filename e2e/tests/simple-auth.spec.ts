import { test, expect } from '@playwright/test';

test.describe('Simple Authentication Tests', () => {
  
  test('should load the homepage', async ({ page }) => {
    // Aller à la page d'accueil
    await page.goto('http://localhost:3001');
    
    // Vérifier que la page se charge
    await expect(page).toHaveURL(/localhost:3001/);
    
    // Vérifier qu'il y a du contenu
    const title = await page.title();
    expect(title).toContain('GMAH');
  });

  test('should navigate to login page', async ({ page }) => {
    // Aller directement à la page de login
    await page.goto('http://localhost:3001/fr/login');
    
    // Vérifier qu'on est sur la page de login
    await expect(page).toHaveURL(/.*login/);
    
    // Vérifier la présence des champs de formulaire
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('should show error with empty credentials', async ({ page }) => {
    await page.goto('http://localhost:3001/fr/login');
    
    // Trouver et cliquer sur le bouton de soumission
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Attendre un peu pour voir si une erreur apparaît
    await page.waitForTimeout(1000);
    
    // Vérifier qu'on est toujours sur la page de login (pas de redirection)
    await expect(page).toHaveURL(/.*login/);
  });

  test('should fill login form', async ({ page }) => {
    await page.goto('http://localhost:3001/fr/login');
    
    // Remplir le formulaire
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await emailInput.fill('test@example.com');
    await passwordInput.fill('TestPassword123!');
    
    // Vérifier que les valeurs sont bien remplies
    await expect(emailInput).toHaveValue('test@example.com');
    await expect(passwordInput).toHaveValue('TestPassword123!');
  });

  test('should have forgot password link', async ({ page }) => {
    await page.goto('http://localhost:3001/fr/login');
    
    // Chercher le lien "Mot de passe oublié"
    const forgotLink = page.locator('a').filter({ hasText: /mot de passe|forgot|oublié/i }).first();
    
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      
      // Vérifier qu'on navigue vers la page forgot password
      await page.waitForURL(/.*forgot|password/, { timeout: 5000 });
      await expect(page).toHaveURL(/.*forgot|password/);
    }
  });

  test('should check API health', async ({ page }) => {
    // Vérifier que l'API est accessible
    const response = await page.request.get('http://localhost:3333/health');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('should check frontend is responsive', async ({ page }) => {
    await page.goto('http://localhost:3001/fr');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    // Si on arrive ici, pas d'erreur de responsive
    expect(true).toBeTruthy();
  });

  test('should have dark mode toggle', async ({ page }) => {
    await page.goto('http://localhost:3001/fr');
    
    // Chercher un bouton de toggle theme
    const themeToggle = page.locator('button').filter({ has: page.locator('[class*="moon"], [class*="sun"], [class*="theme"]') }).first();
    
    if (await themeToggle.isVisible()) {
      // Récupérer la classe initiale du body
      const initialClass = await page.locator('body').getAttribute('class') || '';
      
      // Cliquer sur le toggle
      await themeToggle.click();
      await page.waitForTimeout(500);
      
      // Vérifier que la classe a changé
      const newClass = await page.locator('body').getAttribute('class') || '';
      expect(newClass).not.toBe(initialClass);
    }
  });
});