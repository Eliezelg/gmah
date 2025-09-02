import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private readonly fromEmail: string;
  private readonly appName = 'GMAH Platform';
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || 'noreply@gmah.org';
    this.baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email service initialized');
    } else {
      this.logger.warn('RESEND_API_KEY not found - emails will be logged to console');
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      if (!this.resend) {
        // Development mode - log to console
        this.logger.log('📧 Email (Development Mode):');
        this.logger.log(`To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
        this.logger.log(`Subject: ${options.subject}`);
        this.logger.log(`Content: ${options.text || 'HTML content'}`);
        return;
      }

      const emailData: any = {
        from: `${this.appName} <${this.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
      };

      if (options.html) {
        emailData.html = options.html;
      }
      if (options.text) {
        emailData.text = options.text;
      }
      if (options.replyTo) {
        emailData.replyTo = options.replyTo;
      }

      const result = await this.resend.emails.send(emailData);

      this.logger.log(`Email sent successfully: ${result.data?.id}`);
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const subject = `Bienvenue sur ${this.appName}`;
    const html = this.getWelcomeEmailTemplate(firstName);
    
    await this.sendEmail({
      to: email,
      subject,
      html,
      text: `Bienvenue ${firstName}! Votre compte GMAH a été créé avec succès.`,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string, firstName?: string): Promise<void> {
    const resetUrl = `${this.baseUrl}/reset-password?token=${resetToken}`;
    const subject = 'Réinitialisation de votre mot de passe';
    const html = this.getPasswordResetTemplate(resetUrl, firstName);
    
    await this.sendEmail({
      to: email,
      subject,
      html,
      text: `Cliquez sur ce lien pour réinitialiser votre mot de passe: ${resetUrl}. Ce lien expire dans 1 heure.`,
    });
  }

  async sendLoanStatusEmail(
    email: string, 
    loanNumber: string, 
    status: string,
    firstName?: string,
    message?: string
  ): Promise<void> {
    const statusText = this.getLoanStatusText(status);
    const subject = `Mise à jour de votre prêt ${loanNumber}`;
    const html = this.getLoanStatusTemplate(loanNumber, statusText, firstName, message);
    
    await this.sendEmail({
      to: email,
      subject,
      html,
      text: `Votre prêt ${loanNumber} a été ${statusText}. ${message || ''}`,
    });
  }

  async sendGuaranteeRequestEmail(
    guarantorEmail: string,
    borrowerName: string,
    loanNumber: string,
    amount: number,
    guaranteeId: string
  ): Promise<void> {
    const signUrl = `${this.baseUrl}/guarantees/sign/${guaranteeId}`;
    const subject = `Demande de garantie pour le prêt ${loanNumber}`;
    const html = this.getGuaranteeRequestTemplate(borrowerName, loanNumber, amount, signUrl);
    
    await this.sendEmail({
      to: guarantorEmail,
      subject,
      html,
      text: `${borrowerName} vous demande d'être garant pour son prêt de ${amount}€. Cliquez ici pour signer: ${signUrl}`,
    });
  }

  async sendPaymentReminderEmail(
    email: string,
    loanNumber: string,
    amount: number,
    dueDate: Date,
    firstName?: string
  ): Promise<void> {
    const subject = `Rappel: Paiement de ${amount}€ dû le ${this.formatDate(dueDate)}`;
    const html = this.getPaymentReminderTemplate(loanNumber, amount, dueDate, firstName);
    
    await this.sendEmail({
      to: email,
      subject,
      html,
      text: `Rappel: Votre paiement de ${amount}€ pour le prêt ${loanNumber} est dû le ${this.formatDate(dueDate)}.`,
    });
  }

  async sendLoanDisbursementEmail(
    borrowerEmail: string,
    borrowerName: string,
    loanNumber: string,
    amount: number,
    paymentMethod: string,
  ): Promise<void> {
    const subject = `Décaissement effectué - Prêt ${loanNumber}`;
    const html = this.getLoanDisbursementTemplate(borrowerName, loanNumber, amount, paymentMethod);
    
    await this.sendEmail({
      to: borrowerEmail,
      subject,
      html,
      text: `Bonjour ${borrowerName}, les fonds de votre prêt ${loanNumber} d'un montant de ${amount}€ ont été décaissés par ${paymentMethod}.`,
    });
  }

  async sendCommitteeNotificationEmail(
    emails: string[],
    loanNumber: string,
    borrowerName: string,
    amount: number
  ): Promise<void> {
    const reviewUrl = `${this.baseUrl}/committee/loans`;
    const subject = `Nouveau prêt à examiner: ${loanNumber}`;
    const html = this.getCommitteeNotificationTemplate(loanNumber, borrowerName, amount, reviewUrl);
    
    await this.sendEmail({
      to: emails,
      subject,
      html,
      text: `Nouveau prêt à examiner: ${loanNumber} de ${borrowerName} pour ${amount}€. Connectez-vous pour voter.`,
    });
  }

  // Email Templates
  private getWelcomeEmailTemplate(firstName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bienvenue sur GMAH Platform!</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${firstName || 'là'},</h2>
              <p>Votre compte a été créé avec succès sur la plateforme GMAH.</p>
              <p>Vous pouvez maintenant:</p>
              <ul>
                <li>Faire une demande de prêt sans intérêt</li>
                <li>Suivre l'état de vos demandes</li>
                <li>Gérer vos remboursements</li>
                <li>Servir de garant pour d'autres membres</li>
              </ul>
              <a href="${this.baseUrl}/dashboard" class="button">Accéder à mon compte</a>
              <p style="margin-top: 30px;">Si vous avez des questions, n'hésitez pas à nous contacter.</p>
            </div>
            <div class="footer">
              <p>© 2024 GMAH Platform - Prêts sans intérêt conformes à la Halakha</p>
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getPasswordResetTemplate(resetUrl: string, firstName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Réinitialisation de mot de passe</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${firstName || 'là'},</h2>
              <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.</p>
              <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe:</p>
              <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>Ce lien expire dans 1 heure</li>
                  <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
                  <li>Pour votre sécurité, ne partagez jamais ce lien</li>
                </ul>
              </div>
              <p style="margin-top: 30px;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur:</p>
              <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            </div>
            <div class="footer">
              <p>© 2024 GMAH Platform - Prêts sans intérêt conformes à la Halakha</p>
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getLoanStatusTemplate(
    loanNumber: string, 
    status: string, 
    firstName?: string,
    message?: string
  ): string {
    const statusColor = this.getStatusColor(status);
    const statusIcon = this.getStatusIcon(status);
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${statusColor}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .status-badge { display: inline-block; padding: 8px 16px; background: ${statusColor}; color: white; border-radius: 20px; font-weight: bold; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .info-box { background: white; border-radius: 8px; padding: 20px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${statusIcon} Mise à jour de votre prêt</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${firstName || 'là'},</h2>
              <p>Le statut de votre prêt a été mis à jour:</p>
              <div class="info-box">
                <p><strong>Numéro de prêt:</strong> ${loanNumber}</p>
                <p><strong>Nouveau statut:</strong> <span class="status-badge">${status}</span></p>
                ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
              </div>
              <a href="${this.baseUrl}/loans/my-loans" class="button">Voir mes prêts</a>
            </div>
            <div class="footer">
              <p>© 2024 GMAH Platform - Prêts sans intérêt conformes à la Halakha</p>
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getGuaranteeRequestTemplate(
    borrowerName: string,
    loanNumber: string,
    amount: number,
    signUrl: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .amount-box { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .amount { font-size: 32px; color: #28a745; font-weight: bold; }
            .button { display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Demande de garantie</h1>
            </div>
            <div class="content">
              <h2>Shalom,</h2>
              <p><strong>${borrowerName}</strong> vous demande d'être garant pour son prêt auprès de GMAH.</p>
              <div class="amount-box">
                <p>Montant du prêt:</p>
                <div class="amount">€${amount.toLocaleString()}</div>
                <p style="color: #666;">Prêt ${loanNumber}</p>
              </div>
              <p>En acceptant d'être garant, vous vous engagez à rembourser le prêt si l'emprunteur n'est pas en mesure de le faire.</p>
              <a href="${signUrl}" class="button">Examiner et signer la garantie</a>
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>Prenez le temps de lire les conditions avant de signer</li>
                  <li>Votre signature électronique a valeur légale</li>
                  <li>Vous pouvez refuser cette demande sans justification</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>© 2024 GMAH Platform - Prêts sans intérêt conformes à la Halakha</p>
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getPaymentReminderTemplate(
    loanNumber: string,
    amount: number,
    dueDate: Date,
    firstName?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ffc107; color: #333; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .payment-box { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 2px solid #ffc107; }
            .amount { font-size: 28px; color: #333; font-weight: bold; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Rappel de paiement</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${firstName || 'là'},</h2>
              <p>Ceci est un rappel amical pour votre paiement à venir:</p>
              <div class="payment-box">
                <p><strong>Prêt:</strong> ${loanNumber}</p>
                <p><strong>Montant dû:</strong> <span class="amount">€${amount.toLocaleString()}</span></p>
                <p><strong>Date d'échéance:</strong> ${this.formatDate(dueDate)}</p>
              </div>
              <p>Pour effectuer votre paiement, connectez-vous à votre espace personnel.</p>
              <a href="${this.baseUrl}/loans/my-loans" class="button">Effectuer le paiement</a>
              <p style="margin-top: 30px; color: #666;">
                Si vous avez déjà effectué ce paiement, vous pouvez ignorer ce rappel.
              </p>
            </div>
            <div class="footer">
              <p>© 2024 GMAH Platform - Prêts sans intérêt conformes à la Halakha</p>
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getLoanDisbursementTemplate(
    borrowerName: string,
    loanNumber: string,
    amount: number,
    paymentMethod: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .disbursement-box { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 2px solid #28a745; }
            .amount { font-size: 32px; color: #28a745; font-weight: bold; }
            .details { margin: 15px 0; padding: 15px; background: #f1f3f5; border-radius: 5px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Décaissement effectué!</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${borrowerName},</h2>
              <p>Nous avons le plaisir de vous informer que les fonds de votre prêt ont été décaissés avec succès.</p>
              <div class="disbursement-box">
                <p><strong>Numéro de prêt:</strong> ${loanNumber}</p>
                <p><strong>Montant décaissé:</strong></p>
                <p class="amount">€${amount.toLocaleString()}</p>
                <p><strong>Méthode de paiement:</strong> ${paymentMethod}</p>
              </div>
              <div class="details">
                <h3>Prochaines étapes:</h3>
                <ul>
                  <li>Les fonds devraient être disponibles dans les 24-48 heures selon votre banque</li>
                  <li>Votre premier remboursement sera dû selon l'échéancier convenu</li>
                  <li>Vous pouvez consulter votre calendrier de remboursement dans votre espace personnel</li>
                </ul>
              </div>
              <a href="${this.baseUrl}/loans/my-loans" class="button">Voir mes prêts</a>
              <p style="margin-top: 30px; color: #666;">
                Si vous avez des questions, n'hésitez pas à nous contacter.
              </p>
            </div>
            <div class="footer">
              <p>© 2024 GMAH Platform - Prêts sans intérêt conformes à la Halakha</p>
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getCommitteeNotificationTemplate(
    loanNumber: string,
    borrowerName: string,
    amount: number,
    reviewUrl: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6c757d; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .loan-box { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #6c757d; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Nouveau prêt à examiner</h1>
            </div>
            <div class="content">
              <h2>Cher membre du comité,</h2>
              <p>Un nouveau prêt a été soumis et nécessite votre examen:</p>
              <div class="loan-box">
                <p><strong>Numéro de prêt:</strong> ${loanNumber}</p>
                <p><strong>Emprunteur:</strong> ${borrowerName}</p>
                <p><strong>Montant demandé:</strong> €${amount.toLocaleString()}</p>
              </div>
              <p>Veuillez vous connecter pour examiner les détails et voter.</p>
              <a href="${reviewUrl}" class="button">Examiner le prêt</a>
              <p style="margin-top: 30px; color: #666;">
                Votre vote est important pour la décision finale du comité.
              </p>
            </div>
            <div class="footer">
              <p>© 2024 GMAH Platform - Prêts sans intérêt conformes à la Halakha</p>
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Helper methods
  private getLoanStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      APPROVED: 'approuvé',
      REJECTED: 'rejeté',
      DISBURSED: 'décaissé',
      COMPLETED: 'complété',
      UNDER_REVIEW: 'en cours d\'examen',
      ACTIVE: 'actif',
      DEFAULTED: 'en défaut',
    };
    return statusMap[status] || status.toLowerCase();
  }

  private getStatusColor(status: string): string {
    if (status.includes('approuvé') || status.includes('complété')) return '#28a745';
    if (status.includes('rejeté') || status.includes('défaut')) return '#dc3545';
    if (status.includes('examen')) return '#ffc107';
    return '#667eea';
  }

  private getStatusIcon(status: string): string {
    if (status.includes('approuvé') || status.includes('complété')) return '✅';
    if (status.includes('rejeté') || status.includes('défaut')) return '❌';
    if (status.includes('examen')) return '⏳';
    return '📋';
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }
}