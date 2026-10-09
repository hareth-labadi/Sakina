import nodemailer from 'nodemailer';
import type { FastifyBaseLogger } from 'fastify';
import type { Config } from '../config.js';

export type Mail = { to: string; subject: string; text: string };

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** Real delivery over SMTP (Mailpit in development, a provider in production). */
function smtpMailer(url: string, from: string): Mailer {
  const transport = nodemailer.createTransport(url);
  return {
    async send(mail) {
      await transport.sendMail({ from, ...mail });
    }
  };
}

/**
 * No SMTP configured. In development the message (with its link) goes to the console so flows can
 * be tested; anywhere else nothing is printed, since the link is a credential.
 */
function consoleMailer(log: FastifyBaseLogger, showContent: boolean): Mailer {
  return {
    async send(mail) {
      if (showContent) console.log(`\n--- email (not sent: SMTP_URL is empty) ---\nSubject: ${mail.subject}\n\n${mail.text}\n---\n`);
      else log.warn('SMTP_URL is empty: email not sent');
    }
  };
}

export function createMailer(config: Config, log: FastifyBaseLogger): Mailer {
  return config.SMTP_URL ? smtpMailer(config.SMTP_URL, config.MAIL_FROM) : consoleMailer(log, config.NODE_ENV === 'development');
}

/** Keeps sent mail in memory, for tests. */
export function memoryMailer(): Mailer & { sent: Mail[] } {
  const sent: Mail[] = [];
  return {
    sent,
    async send(mail) {
      sent.push(mail);
    }
  };
}
