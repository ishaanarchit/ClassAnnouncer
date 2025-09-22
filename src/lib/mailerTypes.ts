export interface AttachmentLike {
  filename: string;
  content: Buffer | string;
  type?: string;
  disposition?: "attachment";
}