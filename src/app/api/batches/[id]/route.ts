import { NextRequest, NextResponse } from "next/server";
import { readBatches } from "@/lib/store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batchId = id;
    const data = await readBatches();

    // Find the specific batch
    const batch = data.batches.find(b => b.id === batchId);
    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      );
    }

    // Find all results for this batch
    const results = data.results.filter(r => r.batchId === batchId);

    return NextResponse.json({ batch, results });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read batch data" },
      { status: 500 }
    );
  }
}