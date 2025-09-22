import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSettings, writeSettings } from "@/lib/store";
import type { ProviderChoice } from "@/lib/types";

// Validation schema (excludes secrets)
const SettingsSchema = z.object({
  fromName: z.string().min(1, "From name is required"),
  fromEmail: z.string().email("Invalid email format"),
  provider: z.enum(["none", "sendgrid", "smtp"] as const),
  testMode: z.boolean(),
  maxTotalAttachmentMB: z.number().int().min(1).max(100),
});

export async function GET() {
  try {
    const settings = await readSettings();

    // Return non-secret settings only
    const publicSettings = {
      fromName: settings.fromName,
      fromEmail: settings.fromEmail,
      provider: settings.provider,
      testMode: settings.testMode,
      maxTotalAttachmentMB: settings.maxTotalAttachmentMB,
    };

    return NextResponse.json(publicSettings);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = SettingsSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues?.[0];
      return NextResponse.json(
        { error: firstError?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const newSettings = validation.data;

    // Read current settings to preserve any existing data
    const currentSettings = await readSettings();

    // Update with new settings
    const updatedSettings = {
      ...currentSettings,
      ...newSettings,
    };

    await writeSettings(updatedSettings);

    // Return non-secret settings only
    const publicSettings = {
      fromName: updatedSettings.fromName,
      fromEmail: updatedSettings.fromEmail,
      provider: updatedSettings.provider,
      testMode: updatedSettings.testMode,
      maxTotalAttachmentMB: updatedSettings.maxTotalAttachmentMB,
    };

    return NextResponse.json(publicSettings);

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}