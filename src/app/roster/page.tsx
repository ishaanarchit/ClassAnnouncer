"use client";

import { useState, useEffect } from "react";
import { PageTitle } from "@/components/PageTitle";
import { SearchInput } from "@/components/SearchInput";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, Upload, Trash2, Edit, Loader2, UserPlus } from "lucide-react";
import type { Student } from "@/lib/types";

export default function RosterPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Import form state
  const [importText, setImportText] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    // Filter students based on search query
    const filtered = students.filter(student =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredStudents(filtered);
  }, [students, searchQuery]);

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

  const importStudents = async () => {
    if (!importText.trim()) {
      toast.error("Please enter student data");
      return;
    }

    setIsImporting(true);

    try {
      // Parse the import text (expecting CSV-like format: name,email per line)
      const lines = importText.trim().split("\n");
      const students = lines.map(line => {
        const parts = line.split(",").map(part => part.trim());
        if (parts.length >= 2) {
          return { name: parts[0], email: parts[1] };
        }
        // Try to handle "Name <email@domain.com>" format
        const match = line.match(/^(.+?)\s*<(.+?)>$/);
        if (match) {
          return { name: match[1].trim(), email: match[2].trim() };
        }
        // Default to treating the whole line as an email with empty name
        return { name: "", email: line.trim() };
      }).filter(s => s.email); // Filter out empty emails

      if (students.length === 0) {
        toast.error("No valid student data found");
        return;
      }

      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ students }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
        setImportText("");
        setShowImportDialog(false);
        loadStudents();
      } else {
        toast.error(result.error || "Failed to import students");
      }
    } catch (error) {
      toast.error("Failed to import students");
    } finally {
      setIsImporting(false);
    }
  };

  const editStudent = async () => {
    if (!editingStudent) return;

    if (!editName.trim() || !editEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }

    try {
      const response = await fetch(`/api/students/${editingStudent.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Student updated successfully");
        setShowEditDialog(false);
        setEditingStudent(null);
        loadStudents();
      } else {
        toast.error(result.error || "Failed to update student");
      }
    } catch (error) {
      toast.error("Failed to update student");
    }
  };

  const deleteStudent = async (studentId: string) => {
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Student deleted successfully");
        loadStudents();
      } else {
        toast.error(result.error || "Failed to delete student");
      }
    } catch (error) {
      toast.error("Failed to delete student");
    }
  };

  const clearAllStudents = async () => {
    try {
      const response = await fetch("/api/students", {
        method: "DELETE",
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("All students cleared");
        loadStudents();
      } else {
        toast.error(result.error || "Failed to clear students");
      }
    } catch (error) {
      toast.error("Failed to clear students");
    }
  };

  const startEdit = (student: Student) => {
    setEditingStudent(student);
    setEditName(student.name);
    setEditEmail(student.email);
    setShowEditDialog(true);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div>
        <PageTitle title="Student Roster" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Student Roster"
        subtitle="Manage your class roster and student information"
      />

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search students..."
            ariaLabel="Search students by name or email"
          />
        </div>

        <div className="flex gap-2">
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import Students
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Students</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="importData">Student Data</Label>
                  <Textarea
                    id="importData"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={`Enter student data in one of these formats:
John Doe, john.doe@email.com
Jane Smith, jane.smith@email.com

Or:
John Doe <john.doe@email.com>
Jane Smith <jane.smith@email.com>`}
                    rows={10}
                    disabled={isImporting}
                    className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowImportDialog(false)}
                    disabled={isImporting}
                    className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={importStudents}
                    disabled={isImporting || !importText.trim()}
                    aria-busy={isImporting}
                    className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {students.length > 0 && (
            <ConfirmDialog
              title="Clear All Students"
              description="This will permanently delete all students from your roster. This action cannot be undone."
              confirmLabel="Clear All"
              onConfirm={clearAllStudents}
              destructive
              trigger={
                <Button
                  variant="outline"
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Students Table */}
      {filteredStudents.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title={searchQuery ? "No Students Found" : "No Students Added"}
          description={
            searchQuery
              ? "No students match your search criteria."
              : "Add students to your roster to get started with announcements."
          }
          action={
            !searchQuery
              ? {
                  label: "Import Students",
                  onClick: () => setShowImportDialog(true),
                }
              : undefined
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Students ({filteredStudents.length})
              </span>
              {searchQuery && (
                <span className="text-sm font-normal text-muted-foreground">
                  {filteredStudents.length} of {students.length} shown
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.name || <span className="text-muted-foreground italic">No name</span>}
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(student.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(student)}
                            className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <ConfirmDialog
                            title="Delete Student"
                            description={`Are you sure you want to delete ${student.name || student.email} from the roster?`}
                            confirmLabel="Delete"
                            onConfirm={() => deleteStudent(student.id)}
                            destructive
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                          />
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

      {/* Edit Student Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Name *</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Student name"
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email *</Label>
              <Input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="student@email.com"
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Cancel
              </Button>
              <Button
                onClick={editStudent}
                disabled={!editName.trim() || !editEmail.trim()}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}