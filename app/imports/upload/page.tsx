'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

type Student = {
  id: string;
  admissionNumber: string;
  fullName: string;
  grade: string;
  stream: string | null;
  parentName: string;
  parentContact: string;
};

type RouteRecord = {
  id: string;
  routeName: string;
  oneWayFare: number;
  twoWayFare: number;
  status: 'Active' | 'Inactive';
};

type ImportRow = {
  admissionNumber: string;
  price: number;
  sourceRow: number;
};

type ImportErrorRecord = {
  id: string;
  batchId: string;
  admissionNumber: string;
  price: number;
  studentName: string;
  reason: string;
  fileName: string;
  createdAt: string;
};

type ApprovalRecord = {
  studentId: string;
  admissionNumber: string;
  fullName: string;
  grade: string;
  parentName: string;
  parentContact: string;
  routeId: string;
  busId: string;
  tripType: '' | 'one_way' | 'two_way';
  direction: '' | 'morning' | 'evening';
  usingBus: boolean;
  status: 'pending' | 'approved';
  updatedAt: string;
};

const ROUTES_KEY = 'school_routes';
const APPROVALS_KEY = 'student_transport_approvals';
const IMPORT_ERRORS_KEY = 'student_import_errors';

function normalizeAdmission(value: unknown): string {
  return String(value ?? '').trim();
}

function parsePrice(value: unknown): number {
  const raw = String(value ?? '').trim();
  if (!raw) return NaN;
  const cleaned = raw.replace(/[^0-9.\-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function detectAdmissionKey(keys: string[]): string | null {
  const found = keys.find((key) => /admission|admission\s*number|adm\s*no|admno|admissionnumber/i.test(key));
  return found || null;
}

function detectPriceKey(keys: string[]): string | null {
  const found = keys.find((key) => /price|amount|fare|fees?/i.test(key));
  return found || null;
}

function normalizeRouteRecord(raw: unknown): RouteRecord[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => {
      const legacyFare = parsePrice(item.fare);
      const oneWayRaw = parsePrice(item.oneWayFare);
      const twoWayRaw = parsePrice(item.twoWayFare);

      return {
        id: String(item.id || ''),
        routeName: String(item.routeName || item.routeCode || item.id || 'Unnamed Route'),
        oneWayFare: Number.isFinite(oneWayRaw) ? oneWayRaw : Number.isFinite(legacyFare) ? legacyFare : 0,
        twoWayFare: Number.isFinite(twoWayRaw)
          ? twoWayRaw
          : Number.isFinite(legacyFare)
          ? legacyFare * 2
          : 0,
        status: (item.status === 'Inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive',
      };
    })
    .filter((route) => route.id);
}

function resolveRouteByPrice(routes: RouteRecord[], price: number): { route: RouteRecord; tripType: 'one_way' | 'two_way' } | null {
  for (const route of routes) {
    if (route.status !== 'Active') continue;
    if (Math.abs(route.oneWayFare - price) < 0.01) {
      return { route, tripType: 'one_way' };
    }
    if (Math.abs(route.twoWayFare - price) < 0.01) {
      return { route, tripType: 'two_way' };
    }
  }
  return null;
}

function parseRowsFromObjects(rows: Record<string, unknown>[]): ImportRow[] {
  if (rows.length === 0) return [];

  const keys = Object.keys(rows[0] || {});
  const admissionKey = detectAdmissionKey(keys);
  const priceKey = detectPriceKey(keys);

  return rows
    .map((row, idx) => {
      let admission: unknown = '';
      let priceValue: unknown = '';

      if (admissionKey && priceKey) {
        admission = row[admissionKey];
        priceValue = row[priceKey];
      } else {
        const values = Object.values(row);
        admission = values[0] ?? '';
        priceValue = values[1] ?? '';
      }

      return {
        admissionNumber: normalizeAdmission(admission),
        price: parsePrice(priceValue),
        sourceRow: idx + 2,
      };
    })
    .filter((row) => row.admissionNumber !== '' || Number.isFinite(row.price));
}

function parseRowsFromText(text: string): ImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines
    .map((line, idx) => {
      const parts = line.split(/[\t,;]+/).map((v) => v.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return {
          admissionNumber: normalizeAdmission(parts[0]),
          price: parsePrice(parts[1]),
          sourceRow: idx + 1,
        };
      }

      const admissionMatch = line.match(/admission\s*(number)?\s*[:\-]?\s*([A-Za-z0-9\-_/]+)/i);
      const priceMatch = line.match(/(price|amount|fare)\s*[:\-]?\s*([0-9,]+(?:\.[0-9]+)?)/i);

      return {
        admissionNumber: normalizeAdmission(admissionMatch?.[2] || ''),
        price: parsePrice(priceMatch?.[2] || ''),
        sourceRow: idx + 1,
      };
    })
    .filter((row) => row.admissionNumber !== '' || Number.isFinite(row.price));
}

async function extractRowsFromFile(file: File): Promise<ImportRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    return parseRowsFromObjects(rows);
  }

  if (ext === 'docx') {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return parseRowsFromText(result.value || '');
  }

  if (ext === 'doc' || ext === 'txt') {
    const text = await file.text();
    return parseRowsFromText(text);
  }

  throw new Error('Unsupported file format. Use .xlsx, .xls, .csv, .docx, .doc, or .txt');
}

export default function UploadImportPage() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');

  const canUsePage = useMemo(() => role === 'Admin' || role === 'superior_Admin', [role]);

  useEffect(() => {
    queueMicrotask(() => {
      const session = localStorage.getItem('user');
      if (session) {
        try {
          const user = JSON.parse(session);
          setRole(user.role || '');
        } catch {
          setRole('');
        }
      }
      setIsMounted(true);
    });
  }, []);

  useEffect(() => {
    if (isMounted && role !== '' && !canUsePage) {
      router.replace('/');
    }
  }, [isMounted, role, canUsePage, router]);

  async function handleProcessFile() {
    if (!selectedFile) {
      alert('Please choose a file first.');
      return;
    }

    setIsProcessing(true);
    setMessage('');

    try {
      const parsedRows = await extractRowsFromFile(selectedFile);
      if (parsedRows.length === 0) {
        alert('No valid rows found. Ensure your file includes admission number and price columns.');
        return;
      }

      const studentsRes = await fetch('/api/students');
      const studentsJson = await studentsRes.json();
      if (!studentsJson.success) {
        throw new Error('Could not load students list.');
      }

      const students = (studentsJson.data || []) as Student[];
      const studentsMap = new Map(students.map((student) => [student.admissionNumber.trim(), student]));

      const rawRoutes = localStorage.getItem(ROUTES_KEY);
      const routes = normalizeRouteRecord(rawRoutes ? JSON.parse(rawRoutes) : []);

      let approvals: ApprovalRecord[] = [];
      try {
        approvals = JSON.parse(localStorage.getItem(APPROVALS_KEY) || '[]') as ApprovalRecord[];
      } catch {
        approvals = [];
      }

      const batchId = `batch_${Date.now()}`;
      const now = new Date().toISOString();
      const nextApprovalsMap = new Map(approvals.map((record) => [record.studentId, record]));
      const importErrors: ImportErrorRecord[] = [];

      for (const row of parsedRows) {
        const student = studentsMap.get(row.admissionNumber);
        if (!student) {
          importErrors.push({
            id: `${batchId}_${row.sourceRow}_student`,
            batchId,
            admissionNumber: row.admissionNumber,
            price: Number.isFinite(row.price) ? row.price : 0,
            studentName: 'Unknown',
            reason: `Student admission number ${row.admissionNumber} not found in Students list.`,
            fileName: selectedFile.name,
            createdAt: now,
          });
          continue;
        }

        if (!Number.isFinite(row.price)) {
          importErrors.push({
            id: `${batchId}_${row.sourceRow}_price`,
            batchId,
            admissionNumber: row.admissionNumber,
            price: 0,
            studentName: student.fullName,
            reason: `Price is missing or invalid for admission ${row.admissionNumber}.`,
            fileName: selectedFile.name,
            createdAt: now,
          });
          continue;
        }

        const routeMatch = resolveRouteByPrice(routes, row.price);
        if (!routeMatch) {
          importErrors.push({
            id: `${batchId}_${row.sourceRow}_route`,
            batchId,
            admissionNumber: row.admissionNumber,
            price: row.price,
            studentName: student.fullName,
            reason: `No active route has a fare matching ${row.price.toLocaleString()}.`,
            fileName: selectedFile.name,
            createdAt: now,
          });
          continue;
        }

        const approval: ApprovalRecord = {
          studentId: student.id,
          admissionNumber: student.admissionNumber,
          fullName: student.fullName,
          grade: student.grade,
          parentName: student.parentName,
          parentContact: student.parentContact,
          routeId: routeMatch.route.id,
          busId: '',
          tripType: routeMatch.tripType,
          direction: '',
          usingBus: true,
          status: 'pending',
          updatedAt: now,
        };

        nextApprovalsMap.set(student.id, approval);
      }

      const nextApprovals = Array.from(nextApprovalsMap.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      localStorage.setItem(APPROVALS_KEY, JSON.stringify(nextApprovals));
      localStorage.setItem(IMPORT_ERRORS_KEY, JSON.stringify(importErrors));

      const successCount = parsedRows.length - importErrors.length;
      setMessage(`Processed ${parsedRows.length} rows: ${successCount} sent to approvals, ${importErrors.length} errors.`);

      if (importErrors.length > 0) {
        alert('Some records failed validation. You will be redirected to the Error page.');
        router.push('/errors');
      } else {
        alert('All records imported successfully and are now pending in Approvals.');
        router.push('/approvals');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to process file.';
      alert(msg);
    } finally {
      setIsProcessing(false);
    }
  }

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm flex items-center justify-center">
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!canUsePage) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm text-gray-800 dark:text-gray-100">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 px-4 py-3 flex items-center space-x-6 text-teal-700">
        <Link href="/" className="hover:underline text-gray-500 dark:text-gray-400">Home</Link>
        <Link href="/approvals" className="hover:underline">Approvals</Link>
        <Link href="/errors" className="hover:underline">Errors</Link>
        <span className="font-bold border-b-2 border-teal-700 pb-1 cursor-default">Bulk Upload</span>
      </div>

      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-transparent shadow-sm border border-gray-200 dark:border-gray-700/40 p-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Upload Admissions and Price File</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            Upload an Excel or Word file with admission number and price. Students will be matched against the Students list, and price will map to route fare.
          </p>

          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded mb-4">
            <p className="font-medium mb-2">Expected file fields</p>
            <ul className="list-disc ml-6 text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>Admission Number</li>
              <li>Price</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
              Accepted formats: .xlsx, .xls, .csv, .docx, .doc, .txt
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.docx,.doc,.txt"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              className="block w-full sm:w-auto text-sm text-gray-700 dark:text-gray-300"
            />

            <button
              type="button"
              onClick={handleProcessFile}
              disabled={!selectedFile || isProcessing}
              className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Upload and Process'}
            </button>
          </div>

          {selectedFile && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Selected file: <span className="font-medium">{selectedFile.name}</span>
            </p>
          )}

          {message && (
            <div className="mt-4 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-900/40 px-4 py-3 rounded text-blue-800 dark:text-blue-300">
              {message}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
