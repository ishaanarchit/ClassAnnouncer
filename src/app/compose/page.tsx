"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileChips } from "@/components/FileChips";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { Upload, Send, Users, Loader2 } from "lucide-react";
import DOMPurify from "dompurify";
import type { Student } from "@/lib/types";

export default function ComposePage() {
  const router = useRouter();

  // State
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  // Load students on mount
  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const response = await fetch("/api/students");
      if (!response.ok) throw new Error("Failed to load students");
      const data = await response.json();
      setStudents(data);
    } catch (error) {
      toast.error("Failed to load students");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(new Set(students.map(s => s.id)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleStudentSelect = (studentId: string, checked: boolean) => {
    const newSelected = new Set(selectedStudents);
    if (checked) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (filename: string) => {
    setAttachments(prev => prev.filter(f => f.name !== filename));
  };

  const handleSend = async () => {
    if (selectedStudents.size === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    if (!bodyHtml.trim()) {
      toast.error("Message body is required");
      return;
    }

    setIsSending(true);
    setSendProgress(0);

    try {
      // Sanitize HTML on client side
      const sanitizedHtml = DOMPurify.sanitize(bodyHtml, {
        ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "p", "br", "a", "ul", "ol", "li", "small"],
        ALLOWED_ATTR: ["href"],
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false,
      });

      // Get selected student emails
      const recipients = students
        .filter(s => selectedStudents.has(s.id))
        .map(s => s.email);

      // Build FormData
      const formData = new FormData();
      formData.append("subject", subject.trim());
      formData.append("bodyHtml", sanitizedHtml);
      formData.append("recipients", JSON.stringify(recipients));

      // Add attachments
      attachments.forEach((file, index) => {
        formData.append(`file:${index}`, file);
      });

      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setSendProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/send", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setSendProgress(100);

      const result = await response.json();

      if (result.ok) {
        toast.success(
          `Email sent! ${result.summary.sent} sent, ${result.summary.failed} failed`,
          {
            action: {
              label: "View History",
              onClick: () => router.push("/history"),
            },
          }
        );

        // Reset form
        setSelectedStudents(new Set());
        setSubject("");
        setBodyHtml("");
        setAttachments([]);
      } else {
        toast.error(result.error || "Failed to send emails");
      }
    } catch (error) {
      toast.error("Failed to send emails");
    } finally {
      setIsSending(false);
      setSendProgress(0);
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageTitle title="Compose Announcement" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Compose Announcement"
        subtitle="Send messages to your students with optional attachments"
      />

      {students.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No Students Found"
          description="Add students to your roster before sending announcements."
          action={{
            label: "Go to Roster",
            onClick: () => router.push("/roster"),
          }}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recipients */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recipients ({selectedStudents.size})
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedStudents.size === students.length}
                  onCheckedChange={handleSelectAll}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <Label htmlFor="select-all" className="text-sm font-normal">
                  Select All ({students.length})
                </Label>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {students.map((student) => (
                <div key={student.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`student-${student.id}`}
                    checked={selectedStudents.has(student.id)}
                    onCheckedChange={(checked) => handleStudentSelect(student.id, Boolean(checked))}
                    className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <Label
                    htmlFor={`student-${student.id}`}
                    className="text-sm font-normal flex-1 cursor-pointer"
                  >
                    <div className="truncate">{student.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {student.email}
                    </div>
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Message Composer */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                  disabled={isSending}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label htmlFor="body">Message Body *</Label>
                <Textarea
                  id="body"
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  placeholder="Enter your message here. You can use basic HTML tags like <b>, <i>, <u>, <p>, <br>, <a href=''>, <ul>, <ol>, <li>"
                  rows={10}
                  disabled={isSending}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <p className="text-xs text-muted-foreground">
                  HTML tags allowed: &lt;b&gt;, &lt;strong&gt;, &lt;i&gt;, &lt;em&gt;, &lt;u&gt;, &lt;p&gt;, &lt;br&gt;, &lt;a href=&quot;&quot;&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;, &lt;small&gt;
                </p>
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <Label htmlFor="attachments">Attachments</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    disabled={isSending}
                    className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => document.getElementById("attachments")?.click()}
                    disabled={isSending}
                    className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>

                {attachments.length > 0 && (
                  <FileChips
                    files={attachments.map(f => f.name)}
                    onRemove={removeAttachment}
                    readOnly={isSending}
                  />
                )}
              </div>

              {/* Send Progress */}
              {isSending && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sending...</span>
                    <span className="text-sm text-muted-foreground">{sendProgress}%</span>
                  </div>
                  <Progress value={sendProgress} className="w-full" />
                </div>
              )}

              {/* Send Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSend}
                  disabled={isSending || selectedStudents.size === 0}
                  aria-busy={isSending}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send to {selectedStudents.size} recipient{selectedStudents.size !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}