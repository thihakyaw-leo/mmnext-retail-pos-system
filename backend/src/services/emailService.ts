import type { Env } from '../types/env.js';

export class EmailService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async sendWelcomeEmail(email: string, payload: any): Promise<void> {
    console.log(`[EmailService] Sending Welcome Email to ${email}`);
    console.log(`[EmailService] Payload:`, JSON.stringify(payload, null, 2));
    
    // In a real application, you would integrate with SendGrid, Mailgun, AWS SES, etc.
    // e.g., await fetch('https://api.sendgrid.com/v3/mail/send', { ... })
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`[EmailService] Welcome Email sent successfully to ${email}`);
  }

  async sendPasswordResetEmail(email: string, payload: any): Promise<void> {
    console.log(`[EmailService] Sending Password Reset Email to ${email}`);
    console.log(`[EmailService] Reset Link: ${payload.resetUrl}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`[EmailService] Password Reset Email sent successfully to ${email}`);
  }

  async sendLowStockAlertEmail(adminEmail: string, payload: any): Promise<void> {
    console.log(`[EmailService] Sending Low Stock Alert to ${adminEmail}`);
    console.log(`[EmailService] Low Stock Items (${payload.items.length}):`);
    for (const item of payload.items) {
      console.log(`  - ${item.name} (SKU: ${item.sku}): ${item.quantity_on_hand} left (Reorder at: ${item.reorder_point})`);
    }
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`[EmailService] Low Stock Alert Email sent successfully.`);
  }
}
