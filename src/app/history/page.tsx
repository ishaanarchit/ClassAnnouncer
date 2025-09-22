"use client";

import { useState, useEffect } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { FileChips } from "@/components/FileChips";
import { toast } from "sonner";
import { History, Eye, Download, RefreshCw, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import type { SendBatch, SendResult } from "@/lib/types";

interface BatchData {
  batches: SendBatch[];
  results: SendResult[];
}

interface BatchDetails {
  batch: SendBatch;
  results: SendResult[];
}

export default function HistoryPage() {
  const [batchData, setBatchData] = useState<BatchData>({ batches: [], results: [] });
  const [selectedBatch, setSelectedBatch] = useState<BatchDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const response = await fetch("/api/batches");
      if (!response.ok) throw new Error("Failed to load batches");
      const data = await response.json();
      setBatchData(data);
    } catch (error) {
      toast.error("Failed to load email history");
    } finally {
      setIsLoading(false);
    }
  };

  const loadBatchDetails = async (batchId: string) => {
    try {
      const response = await fetch(`/api/batches/${batchId}`);
      if (!response.ok) throw new Error("Failed to load batch details");
      const data = await response.json();
      setSelectedBatch(data);
      setDialogOpen(true);
    } catch (error) {
      toast.error("Failed to load batch details");
    }
  };

  const exportCSV = (batch: SendBatch, results: SendResult[]) => {
    const headers = ["Email", "Status", "Error Message", "Timestamp"];
    const rows = results.map(result => [
      result.email,
      result.status,
      result.errorMessage || "",
      batch.timestamp
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `batch-${batch.id}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resendFailures = async (batch: SendBatch) => {
    if (!selectedBatch) return;

    const failedResults = selectedBatch.results.filter(r => r.status === "FAILED");
    if (failedResults.length === 0) {
      toast.info("No failed emails to resend");
      return;
    }

    setIsResending(true);

    try {
      const formData = new FormData();
      formData.append("subject", `[RESEND] ${batch.subject}`);
      formData.append("bodyHtml", "<p><em>This is a resend of a previous message.</em></p>");
      formData.append("recipients", JSON.stringify(failedResults.map(r => r.email)));

      const response = await fetch("/api/send", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.ok) {
        toast.success(`Resend complete! ${result.summary.sent} sent, ${result.summary.failed} failed`);
        setDialogOpen(false);
        loadBatches(); // Refresh the list
      } else {
        toast.error(result.error || "Failed to resend emails");
      }
    } catch (error) {
      toast.error("Failed to resend emails");
    } finally {
      setIsResending(false);
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  const getStatusIcon = (status: "SENT" | "FAILED") => {
    return status === "SENT"
      ? <CheckCircle className="h-4 w-4 text-green-600" />
      : <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusBadge = (sent: number, failed: number, total: number) => {
    if (failed === 0) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">All Sent</Badge>;
    } else if (sent === 0) {
      return <Badge variant="destructive">All Failed</Badge>;
    } else {
      return <Badge variant="secondary">{sent}/{total} Sent</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageTitle title="Email History" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Email History"
        subtitle="View past announcements and their delivery status"
      />

      {batchData.batches.length === 0 ? (
        <EmptyState
          icon={<History className="h-12 w-12" />}
          title="No Email History"
          description="Your sent announcements will appear here."
          action={{
            label: "Send First Announcement",
            onClick: () => window.location.href = "/compose",
          }}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sent Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attachments</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchData.batches
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatDate(batch.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {batch.subject}
                      </TableCell>
                      <TableCell>
                        {batch.total} recipient{batch.total !== 1 ? 's' : ''}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(batch.sent, batch.failed, batch.total)}
                      </TableCell>
                      <TableCell>
                        {batch.attachmentNames.length > 0 ? (
                          <FileChips files={batch.attachmentNames} readOnly />
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadBatchDetails(batch.id)}
                            className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
          </DialogHeader>

          {selectedBatch && (
            <div className="space-y-6">
              {/* Batch Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedBatch.batch.subject}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Sent: {formatDate(selectedBatch.batch.timestamp)}</span>
                    <span>Total: {selectedBatch.batch.total}</span>
                    <span>Sent: {selectedBatch.batch.sent}</span>
                    <span>Failed: {selectedBatch.batch.failed}</span>
                  </div>
                </CardHeader>
                {selectedBatch.batch.attachmentNames.length > 0 && (
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="font-medium">Attachments:</h4>
                      <FileChips files={selectedBatch.batch.attachmentNames} readOnly />
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => exportCSV(selectedBatch.batch, selectedBatch.results)}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>

                {selectedBatch.batch.failed > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => resendFailures(selectedBatch.batch)}
                    disabled={isResending}
                    aria-busy={isResending}
                    className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Resend Failures ({selectedBatch.batch.failed})
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Results Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Error Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBatch.results.map((result) => (
                          <TableRow key={result.id}>
                            <TableCell>{result.email}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(result.status)}
                                <Badge variant={result.status === "SENT" ? "default" : "destructive"}>
                                  {result.status}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              {result.errorMessage || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}