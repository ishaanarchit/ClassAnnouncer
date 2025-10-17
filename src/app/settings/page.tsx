"use client";

import { useState, useEffect } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Settings, Send, Loader2, Save, TestTube } from "lucide-react";
import type { Settings as SettingsType, ProviderChoice } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to load settings");
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setIsSaving(true);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save settings");
      }

      toast.success("Settings saved successfully");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save settings";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!settings) return;

    setIsTesting(true);

    try {
      const formData = new FormData();
      formData.append("subject", "Provider Test");
      formData.append("bodyHtml", "<p>Hello from Class Announcer (Test)</p>");
      formData.append("recipients", JSON.stringify([settings.fromEmail]));

      const response = await fetch("/api/send", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.ok) {
        toast.success("Test email sent successfully!");
      } else {
        toast.error(result.error || "Failed to send test email");
      }
    } catch (error) {
      toast.error("Failed to send test email");
    } finally {
      setIsTesting(false);
    }
  };

  const updateSetting = <K extends keyof SettingsType>(
    key: K,
    value: SettingsType[K]
  ) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (isLoading || !settings) {
    return (
      <div>
        <PageTitle title="Settings" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Settings"
        subtitle="Configure email providers and application preferences"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Email Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Email Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* From Name */}
            <div className="space-y-2">
              <Label htmlFor="fromName">From Name *</Label>
              <Input
                id="fromName"
                value={settings.fromName}
                onChange={(e) => updateSetting("fromName", e.target.value)}
                placeholder="Professor Smith"
                disabled={isSaving}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* From Email */}
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From Email *</Label>
              <Input
                id="fromEmail"
                type="email"
                value={settings.fromEmail}
                onChange={(e) => updateSetting("fromEmail", e.target.value)}
                placeholder="professor@university.edu"
                disabled={isSaving}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* Provider */}
            <div className="space-y-2">
              <Label htmlFor="provider">Email Provider</Label>
              <Select
                value={settings.provider}
                onValueChange={(value: ProviderChoice) => updateSetting("provider", value)}
                disabled={isSaving}
              >
                <SelectTrigger className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Test Mode Only)</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="smtp">SMTP</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {settings.provider === "none" && "No emails will be sent, only simulated"}
                {settings.provider === "sendgrid" && "Requires SENDGRID_API_KEY environment variable"}
                {settings.provider === "smtp" && "Requires SMTP_* environment variables"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Application Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Application Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Test Mode */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="testMode">Test Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Simulate email sending without actually sending
                </p>
              </div>
              <Switch
                id="testMode"
                checked={settings.testMode}
                onCheckedChange={(checked) => updateSetting("testMode", checked)}
                disabled={isSaving}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <Separator />

            {/* Max Attachment Size */}
            <div className="space-y-2">
              <Label htmlFor="maxSize">Max Total Attachment Size (MB)</Label>
              <Input
                id="maxSize"
                type="number"
                min="1"
                max="100"
                value={settings.maxTotalAttachmentMB}
                onChange={(e) => updateSetting("maxTotalAttachmentMB", parseInt(e.target.value) || 20)}
                disabled={isSaving}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground">
                Maximum combined size of all attachments per email
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-medium">Actions</h3>
              <p className="text-sm text-muted-foreground">
                Save your settings or test your email configuration
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={sendTestEmail}
                disabled={isTesting || isSaving || !settings.fromEmail}
                aria-busy={isTesting}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Test...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Send Test Email
                  </>
                )}
              </Button>

              <Button
                onClick={saveSettings}
                disabled={isSaving || isTesting}
                aria-busy={isSaving}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Variables Help */}
      <Card>
        
          <p className="text-xs text-muted-foreground">
            Add these to your .env.local file to configure email providers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
