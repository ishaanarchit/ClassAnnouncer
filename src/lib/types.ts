export interface Student {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface SendBatch {
  id: string;
  timestamp: string;
  subject: string;
  attachmentNames: string[];
  total: number;
  sent: number;
  failed: number;
}

export interface SendResult {
  id: string;
  batchId: string;
  email: string;
  status: "SENT" | "FAILED";
  errorMessage?: string;
}

export type ProviderChoice = "none" | "sendgrid" | "smtp";

export interface Settings {
  fromName: string;
  fromEmail: string;
  provider: ProviderChoice;
  testMode: boolean;
  maxTotalAttachmentMB: number;
}