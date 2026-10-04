import { useRef, type ReactNode } from 'react';
import axios from 'axios';
import { documentsApi } from '../api/client';

interface UploadButtonProps {
  /** The backend DocType the file is saved as (core/contracts.py). */
  docType: string;
  /** Plain name of the document, used in the messages. */
  name: string;
  onMessage: (message: string, tone: 'info' | 'ok' | 'warn') => void;
  className?: string;
  children: ReactNode;
}

/** Opens the file picker and uploads the chosen PDF or photo as a business document. */
export function UploadButton({ docType, name, onMessage, className = '', children }: UploadButtonProps) {
  const input = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    onMessage(`Uploading your ${name}…`, 'info');
    try {
      await documentsApi.upload(file, docType);
      onMessage(`Your ${name} is uploaded. We will read it and update your documents.`, 'ok');
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      onMessage(
        status === 401
          ? `Please sign in to upload your ${name}. Your file was not sent.`
          : `We could not upload your ${name}. Check your connection and try again.`,
        'warn',
      );
    }
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="application/pdf,image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = '';
        }}
      />
      <button type="button" className={className} onClick={() => input.current?.click()}>
        {children}
      </button>
    </>
  );
}
