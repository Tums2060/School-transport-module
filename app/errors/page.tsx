'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

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

const IMPORT_ERRORS_KEY = 'student_import_errors';

export default function ImportErrorsPage() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [errors, setErrors] = useState<ImportErrorRecord[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

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

      try {
        const parsed = JSON.parse(localStorage.getItem(IMPORT_ERRORS_KEY) || '[]') as ImportErrorRecord[];
        setErrors(parsed);
      } catch {
        setErrors([]);
      }

      setIsMounted(true);
    });
  }, []);

  useEffect(() => {
    if (isMounted && role !== '' && !canUsePage) {
      router.replace('/');
    }
  }, [isMounted, role, canUsePage, router]);

  async function handleDownloadPdf() {
    if (errors.length === 0 || isDownloading) {
      return;
    }

    setIsDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const document = new jsPDF({ orientation: 'landscape' });

      document.setFillColor(180, 35, 24);
      document.rect(0, 0, 297, 22, 'F');
      document.setFontSize(16);
      document.setTextColor(255, 255, 255);
      document.text('Student Import Error Report', 14, 14);

      document.setFontSize(10);
      document.setTextColor(55, 65, 81);
      document.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);

      autoTable(document, {
        startY: 36,
        head: [['Admission No.', 'Student', 'Price', 'Error', 'File', 'Date']],
        body: errors.map((item) => [
          item.admissionNumber || '-',
          item.studentName || '-',
          Number.isFinite(item.price) && item.price > 0 ? item.price.toLocaleString() : '-',
          item.reason,
          item.fileName,
          new Date(item.createdAt).toLocaleString(),
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [20, 122, 113] },
      });

      document.save('student-import-errors.pdf');
    } finally {
      setIsDownloading(false);
    }
  }

  function clearErrors() {
    if (!confirm('Clear all import errors from this list?')) return;
    localStorage.setItem(IMPORT_ERRORS_KEY, JSON.stringify([]));
    setErrors([]);
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
        <Link href="/imports/upload" className="hover:underline">Bulk Upload</Link>
        <Link href="/approvals" className="hover:underline">Approvals</Link>
        <span className="font-bold border-b-2 border-teal-700 pb-1 cursor-default">Errors</span>
      </div>

      <main className="p-6">
        <div className="bg-white dark:bg-transparent shadow-sm border border-gray-200 dark:border-gray-700/40 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Import Validation Errors</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Students and errors generated from bulk upload validation.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={errors.length === 0 || isDownloading}
                className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-50"
              >
                {isDownloading ? 'Generating PDF...' : 'Export PDF Report'}
              </button>
              <button
                onClick={clearErrors}
                disabled={errors.length === 0}
                className="px-4 py-2 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Clear List
              </button>
            </div>
          </div>

          {errors.length === 0 ? (
            <div className="text-sm text-gray-500">No import errors found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Admission</th>
                    <th className="px-3 py-2 text-left">Student</th>
                    <th className="px-3 py-2 text-left">Price</th>
                    <th className="px-3 py-2 text-left">Error</th>
                    <th className="px-3 py-2 text-left">File</th>
                    <th className="px-3 py-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {errors.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-medium text-red-700">{item.admissionNumber || '-'}</td>
                      <td className="px-3 py-2">{item.studentName || '-'}</td>
                      <td className="px-3 py-2">{Number.isFinite(item.price) && item.price > 0 ? item.price.toLocaleString() : '-'}</td>
                      <td className="px-3 py-2">{item.reason}</td>
                      <td className="px-3 py-2">{item.fileName}</td>
                      <td className="px-3 py-2">{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
