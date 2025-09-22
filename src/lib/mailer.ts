import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import type { AttachmentLike } from "./mailerTypes";
import { readSettings } from "./store";

export interface SendOne {
  to: string;
  subject: string;
  html: string;
  attachments?: AttachmentLike[];
}

export interface SendManyResult {
  email: string;
  ok: boolean;
  error?: string;
}

// Rate limiting: chunk messages to stay under 100/min
const CHUNK_SIZE = 20; // Conservative chunk size
const CHUNK_DELAY = 12000; // 12 seconds between chunks (5 chunks/min = 100 msgs/min)

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [500, 1000, 1500]; // ms

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isTransientError(error: any): boolean {
  if (!error) return false;

  // HTTP status codes that indicate transient errors
  const status = error.code || error.statusCode || error.status;
  if (status === 429 || (status >= 500 && status < 600)) {
    return true;
  }

  // SendGrid specific error codes
  if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
    return true;
  }

  return false;
}

async function sendOneMessage(message: SendOne, retryCount = 0): Promise<SendManyResult> {
  try {
    const settings = await readSettings();

    // Test mode or no provider - simulate success
    if (settings.testMode || settings.provider === "none") {
      return { email: message.to, ok: true };
    }

    if (settings.provider === "sendgrid") {
      return await sendViaSendGrid(message, settings);
    }

    if (settings.provider === "smtp") {
      return await sendViaSmtp(message, settings);
    }

    return {
      email: message.to,
      ok: false,
      error: `Unsupported provider: ${settings.provider}`
    };

  } catch (error: any) {
    // Check if we should retry
    if (retryCount < MAX_RETRIES && isTransientError(error)) {
      await delay(RETRY_DELAYS[retryCount]);
      return sendOneMessage(message, retryCount + 1);
    }

    return {
      email: message.to,
      ok: false,
      error: error.message || "Unknown error occurred"
    };
  }
}

async function sendViaSendGrid(message: SendOne, settings: any): Promise<SendManyResult> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    return {
      email: message.to,
      ok: false,
      error: "SENDGRID_API_KEY not configured"
    };
  }

  sgMail.setApiKey(apiKey);

  const msg = {
    to: message.to,
    from: {
      email: settings.fromEmail,
      name: settings.fromName
    },
    subject: message.subject,
    html: message.html,
    attachments: message.attachments?.map(att => ({
      filename: att.filename,
      content: typeof att.content === "string" ? att.content : att.content.toString("base64"),
      type: att.type,
      disposition: att.disposition || "attachment"
    }))
  };

  await sgMail.send(msg);
  return { email: message.to, ok: true };
}

async function sendViaSmtp(message: SendOne, settings: any): Promise<SendManyResult> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return {
      email: message.to,
      ok: false,
      error: "SMTP configuration incomplete"
    };
  }

  const transporter = nodemailer.createTransporter({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    secure: parseInt(SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to: message.to,
    subject: message.subject,
    html: message.html,
    attachments: message.attachments?.map(att => ({
      filename: att.filename,
      content: att.content,
      contentType: att.type,
      disposition: att.disposition || "attachment"
    }))
  };

  await transporter.sendMail(mailOptions);
  return { email: message.to, ok: true };
}

export async function sendMany(messages: SendOne[]): Promise<SendManyResult[]> {
  const results: SendManyResult[] = [];

  // Process messages in chunks to respect rate limits
  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);

    // Send all messages in the current chunk concurrently
    const chunkPromises = chunk.map(message => sendOneMessage(message));
    const chunkResults = await Promise.all(chunkPromises);

    results.push(...chunkResults);

    // Add delay between chunks (except for the last chunk)
    if (i + CHUNK_SIZE < messages.length) {
      await delay(CHUNK_DELAY);
    }
  }

  return results;
}