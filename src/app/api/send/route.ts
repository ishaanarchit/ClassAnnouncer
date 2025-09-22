import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSettings, readBatches, writeBatches } from "@/lib/store";
import { sendMany } from "@/lib/mailer";
import { id } from "@/lib/utils";
import type { SendBatch, SendResult } from "@/lib/types";
import type { AttachmentLike } from "@/lib/mailerTypes";

// Validation schema for recipients
const RecipientsSchema = z.array(z.string().email());

// Simple server-side HTML sanitizer (regex-based)
function sanitizeHtml(html: string): string {
  // Remove all HTML tags except allowed ones
  const allowedTags = ['b', 'strong', 'i', 'em', 'u', 'p', 'br', 'a', 'ul', 'ol', 'li', 'small'];
  const allowedTagsRegex = new RegExp(`<(?!\/?(?:${allowedTags.join('|')})(?:\s|>))[^>]*>`, 'gi');

  let sanitized = html.replace(allowedTagsRegex, '');

  // Clean up href attributes - only allow http(s) URLs
  sanitized = sanitized.replace(/(<a[^>]*href\s*=\s*["'])([^"']*)(["'][^>]*>)/gi, (match, start, url, end) => {
    if (url.match(/^https?:\/\//) || url.match(/^mailto:/)) {
      return start + url + end;
    }
    return match.replace(/href\s*=\s*["'][^"']*["']/, '');
  });

  // Remove any remaining dangerous attributes
  sanitized = sanitized.replace(/\s(on\w+|style|script)\s*=\s*["'][^"']*["']/gi, '');

  return sanitized;
}

async function parseFormData(request: NextRequest) {
  const formData = await request.formData();

  // Extract text fields
  const subject = formData.get("subject") as string;
  const bodyHtml = formData.get("bodyHtml") as string;
  const recipientsStr = formData.get("recipients") as string;

  if (!subject || !bodyHtml || !recipientsStr) {
    throw new Error("Missing required fields: subject, bodyHtml, recipients");
  }

  // Parse and validate recipients
  let recipients: string[];
  try {
    recipients = JSON.parse(recipientsStr);
  } catch {
    throw new Error("Invalid recipients JSON format");
  }

  const validation = RecipientsSchema.safeParse(recipients);
  if (!validation.success) {
    throw new Error("Invalid recipient email addresses");
  }

  if (recipients.length === 0) {
    throw new Error("No recipients");
  }

  // Extract files
  const attachments: AttachmentLike[] = [];
  let totalSize = 0;

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("file:") && typeof value === "object" && value !== null && "name" in value && "arrayBuffer" in value) {
      const file = value as File;
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      totalSize += fileBuffer.length;

      attachments.push({
        filename: file.name,
        content: fileBuffer,
        type: file.type || undefined,
        disposition: "attachment"
      });
    }
  }

  return {
    subject: subject.trim(),
    bodyHtml: sanitizeHtml(bodyHtml),
    recipients: validation.data,
    attachments,
    totalSize
  };
}

export async function POST(request: NextRequest) {
  console.log("=== START SEND API ===");
  try {
    // Check content type
    const contentType = request.headers.get("content-type");
    console.log("Content type:", contentType);
    if (!contentType?.includes("multipart/form-data")) {
      return NextResponse.json(
        { ok: false, error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    // Parse form data
    const { subject, bodyHtml, recipients, attachments, totalSize } = await parseFormData(request);

    // Check attachment size limit
    const settings = await readSettings();
    const maxBytes = settings.maxTotalAttachmentMB * 1024 * 1024;

    if (totalSize > maxBytes) {
      const maxMB = settings.maxTotalAttachmentMB;
      const actualMB = (totalSize / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        {
          ok: false,
          error: `Attachments too large: ${actualMB}MB exceeds limit of ${maxMB}MB`
        },
        { status: 400 }
      );
    }

    // Build messages for each recipient
    const messages = recipients.map(recipient => ({
      to: recipient,
      subject,
      html: bodyHtml,
      attachments: attachments.length > 0 ? attachments : undefined
    }));

    // Send emails
    const results = await sendMany(messages);

    // Create batch record
    const batchId = id();
    const timestamp = new Date().toISOString();
    const sent = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;

    const batch: SendBatch = {
      id: batchId,
      timestamp,
      subject,
      attachmentNames: attachments.map(a => a.filename),
      total: recipients.length,
      sent,
      failed
    };

    const sendResults: SendResult[] = results.map(result => ({
      id: id(),
      batchId,
      email: result.email,
      status: result.ok ? "SENT" : "FAILED",
      errorMessage: result.error
    }));

    // Persist batch and results
    const batchData = await readBatches();
    batchData.batches.push(batch);
    batchData.results.push(...sendResults);
    await writeBatches(batchData);

    return NextResponse.json({
      ok: true,
      batchId,
      summary: {
        total: recipients.length,
        sent,
        failed
      }
    });

  } catch (error: any) {
    console.error("API error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Handle validation errors with 400 status
    if (error.message === "No recipients" ||
        error.message.includes("Missing required fields") ||
        error.message.includes("Invalid")) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    // Handle other errors with 500 status
    return NextResponse.json(
      { ok: false, error: "Failed to send emails", details: error.message },
      { status: 500 }
    );
  }
}