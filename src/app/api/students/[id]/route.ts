import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readStudents, writeStudents } from "@/lib/store";
import { isValidEmail } from "@/lib/utils";

// Validation schema
const UpdateStudentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentId = id;
    const body = await request.json();
    const validation = UpdateStudentSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues?.[0];
      return NextResponse.json(
        { error: firstError?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const { name, email } = validation.data;
    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();

    // Validate email format
    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const students = await readStudents();
    const studentIndex = students.findIndex(s => s.id === studentId);

    if (studentIndex === -1) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Check if email is already used by another student
    const existingStudent = students.find(s => s.email === cleanEmail && s.id !== studentId);
    if (existingStudent) {
      return NextResponse.json(
        { error: "Email already exists for another student" },
        { status: 400 }
      );
    }

    // Update student
    students[studentIndex] = {
      ...students[studentIndex],
      name: cleanName,
      email: cleanEmail,
    };

    await writeStudents(students);
    return NextResponse.json(students[studentIndex]);

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update student" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentId = id;
    const students = await readStudents();
    const filteredStudents = students.filter(s => s.id !== studentId);

    if (filteredStudents.length === students.length) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    await writeStudents(filteredStudents);
    return NextResponse.json({ message: "Student deleted successfully" });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete student" },
      { status: 500 }
    );
  }
}