import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readBatches, writeBatches } from "@/lib/store";
import type { SendBatch, SendResult } from "@/lib/types";

// Validation schema
const AppendBatchSchema = z.object({
  batch: z.object({
    id: z.string(),
    timestamp: z.string(),
    subject: z.string(),
    attachmentNames: z.array(z.string()),
    total: z.number().int().min(0),
    sent: z.number().int().min(0),
    failed: z.number().int().min(0),
  }),
  results: z.array(z.object({
    id: z.string(),
    batchId: z.string(),
    email: z.string().email(),
    status: z.enum(["SENT", "FAILED"]),
    errorMessage: z.string().optional(),
  })),
});

export async function GET() {
  try {
    const data = await readBatches();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read batches" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = AppendBatchSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues?.[0];
      return NextResponse.json(
        { error: firstError?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const { batch, results } = validation.data;
    const data = await readBatches();

    // Validate that batch and results have matching batchId
    const invalidResults = results.filter(result => result.batchId !== batch.id);
    if (invalidResults.length > 0) {
      return NextResponse.json(
        { error: "All results must have matching batchId" },
        { status: 400 }
      );
    }

    // Validate that batch counts match results
    const sentCount = results.filter(r => r.status === "SENT").length;
    const failedCount = results.filter(r => r.status === "FAILED").length;

    if (batch.sent !== sentCount || batch.failed !== failedCount || batch.total !== results.length) {
      return NextResponse.json(
        { error: "Batch counts don't match results" },
        { status: 400 }
      );
    }

    // Append to existing data
    data.batches.push(batch);
    data.results.push(...results);

    await writeBatches(data);
    return NextResponse.json({
      message: "Batch and results added successfully",
      batchId: batch.id
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to append batch data" },
      { status: 500 }
    );
  }
}