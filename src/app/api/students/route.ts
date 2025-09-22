import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readStudents, writeStudents } from "@/lib/store";
import { id, isValidEmail } from "@/lib/utils";
import type { Student } from "@/lib/types";

// Validation schemas
const BulkUpsertSchema = z.object({
  students: z.array(z.object({
    name: z.string().default(""),
    email: z.string().email("Invalid email format"),
  })),
});

export async function GET() {
  try {
    const students = await readStudents();
    return NextResponse.json(students);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read students" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = BulkUpsertSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues?.[0];
      return NextResponse.json(
        { error: firstError?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const { students: inputStudents } = validation.data;
    const existingStudents = await readStudents();

    // Process and clean input students
    const processedStudents = inputStudents
      .map(student => ({
        name: student.name.trim() || student.email.split('@')[0], // Use email username as fallback
        email: student.email.toLowerCase().trim(),
      }))
      .filter(student => {
        // Validate email format
        if (!isValidEmail(student.email)) {
          return false;
        }
        return true;
      });

    // Deduplicate by email
    const uniqueStudents = new Map<string, { name: string; email: string }>();
    processedStudents.forEach(student => {
      uniqueStudents.set(student.email, student);
    });

    // Convert to Student objects with IDs and timestamps
    const newStudents: Student[] = Array.from(uniqueStudents.values()).map(student => ({
      id: id(),
      name: student.name,
      email: student.email,
      createdAt: new Date().toISOString(),
    }));

    // Merge with existing students (update if email exists, add if new)
    const existingEmailMap = new Map(existingStudents.map(s => [s.email, s]));

    newStudents.forEach(newStudent => {
      const existing = existingEmailMap.get(newStudent.email);
      if (existing) {
        // Update existing student
        existing.name = newStudent.name;
      } else {
        // Add new student
        existingStudents.push(newStudent);
      }
    });

    await writeStudents(existingStudents);
    return NextResponse.json({
      message: `Processed ${newStudents.length} students`,
      students: existingStudents
    });

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to process students", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await writeStudents([]);
    return NextResponse.json({ message: "All students cleared" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to clear students" },
      { status: 500 }
    );
  }
}