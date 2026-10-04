import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Card, Button, Page, PageHeading, Notice } from '../components/ui';
import { tendersApi } from '../api/client';
import { ChevronRight, MessageSquareText, Upload } from 'lucide-react';

export function Check() {
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const uploadPdf = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setNotice('Please choose a PDF file.');
      return;
    }
    setNotice(`Uploading ${file.name}…`);
    try {
      await tendersApi.upload(file);
      setNotice(`${file.name} is uploaded. Its results will show under Tenders.`);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      setNotice(
        status === 401
          ? 'Please sign in to check your PDF. Your file was not sent.'
          : `Could not upload ${file.name}. Check your connection and try again.`,
      );
    }
  };


  return (
    <Page className="max-w-4xl">
      <PageHeading title="Check a tender" subtitle="Before you spend time and money, check that it is real and that you qualify." />

      <input
        ref={fileInput}
        type="file"
        accept="application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadPdf(file);
          e.target.value = '';
        }}
      />

      <Card className="p-6 sm:p-8 mb-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) uploadPdf(file);
          }}
          className={`rounded-lg border-2 border-dashed p-6 sm:p-8 text-center transition-colors ${
            dragging ? 'border-brand-600 bg-brand-50' : 'border-brand-200'
          }`}
        >
          <span className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Upload size={26} className="text-brand-700" aria-hidden />
          </span>
          <h2 className="h2 mb-1">Drop your tender PDF here</h2>
          <p className="text-ink-soft text-sm mb-5">or choose it from your device</p>
          <Button variant="primary" onClick={() => fileInput.current?.click()}>
            Browse files
          </Button>
        </div>
        {notice && (
          <div className="mt-4">
            <Notice>{notice}</Notice>
          </div>
        )}
      </Card>

      <Link to="/check/message" className="card flex items-center gap-4 p-5 transition hover:border-brand-300">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
          <MessageSquareText size={20} aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">Got it on WhatsApp or by email?</span>
          <span className="block text-sm text-ink-soft">Paste the message and we will look for common scam signs.</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink-soft" aria-hidden />
      </Link>
    </Page>
  );
}
