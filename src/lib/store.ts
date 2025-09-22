import { promises as fs } from "fs";
import path from "path";
import type { Student, SendBatch, SendResult, Settings } from "./types";
import { isProd, DEMO_MODE } from "./runtime";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const STUDENTS_FILE = path.join(DATA_DIR, "students.json");
const BATCHES_FILE = path.join(DATA_DIR, "batches.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

// In-memory storage for demo mode
let memoryStudents: Student[] = [];
let memoryBatches: { batches: SendBatch[]; results: SendResult[] } = { batches: [], results: [] };
let memorySettings: Settings | null = null;

const useMemoryStore = isProd && DEMO_MODE;

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

// Students operations
export async function readStudents(): Promise<Student[]> {
  if (useMemoryStore) {
    return [...memoryStudents];
  }

  await ensureDataDir();
  try {
    const data = await fs.readFile(STUDENTS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty array
    return [];
  }
}

export async function writeStudents(students: Student[]): Promise<void> {
  if (useMemoryStore) {
    memoryStudents = [...students];
    return;
  }

  await ensureDataDir();
  await fs.writeFile(STUDENTS_FILE, JSON.stringify(students, null, 2));
}

// Batches operations
export async function readBatches(): Promise<{ batches: SendBatch[]; results: SendResult[] }> {
  if (useMemoryStore) {
    return {
      batches: [...memoryBatches.batches],
      results: [...memoryBatches.results]
    };
  }

  await ensureDataDir();
  try {
    const data = await fs.readFile(BATCHES_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty structure
    return { batches: [], results: [] };
  }
}

export async function writeBatches(data: { batches: SendBatch[]; results: SendResult[] }): Promise<void> {
  if (useMemoryStore) {
    memoryBatches = {
      batches: [...data.batches],
      results: [...data.results]
    };
    return;
  }

  await ensureDataDir();
  await fs.writeFile(BATCHES_FILE, JSON.stringify(data, null, 2));
}

// Settings operations
export async function readSettings(): Promise<Settings> {
  if (useMemoryStore) {
    if (!memorySettings) {
      memorySettings = {
        fromName: "Professor",
        fromEmail: process.env.FROM_EMAIL || "prof@example.com",
        provider: "none",
        testMode: process.env.TEST_MODE === "true",
        maxTotalAttachmentMB: 20,
      };
    }
    return { ...memorySettings };
  }

  await ensureDataDir();
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, create with defaults
    const defaultSettings: Settings = {
      fromName: "Professor",
      fromEmail: process.env.FROM_EMAIL || "prof@example.com",
      provider: "none",
      testMode: process.env.TEST_MODE === "true",
      maxTotalAttachmentMB: 20,
    };
    await writeSettings(defaultSettings);
    return defaultSettings;
  }
}

export async function writeSettings(settings: Settings): Promise<void> {
  if (useMemoryStore) {
    memorySettings = { ...settings };
    return;
  }

  await ensureDataDir();
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}