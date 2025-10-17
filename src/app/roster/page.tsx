"use client";

import { useState, useEffect } from "react";
import { PageTitle } from "@/components/PageTitle";
import { SearchInput } from "@/components/SearchInput";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RosterPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

 

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
