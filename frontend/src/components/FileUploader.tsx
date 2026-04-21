import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export interface AttachedFile {
  filename: string;
  size: number;
  content_type?: string;
}

interface FileUploaderProps {
  submissionId: string | number;
  disabled?: boolean;
  onChange?: (files: AttachedFile[]) => void;
}

const ALLOWED_TYPES: Record<string, string> = {
  '.pdf':  'application/pdf',
  '.doc':  'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls':  'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv':  'text/csv',
  '.ppt':  'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.txt':  'text/plain',
  '.zip':  'application/zip',
};

const ACCEPT_STRING = Object.keys(ALLOWED_TYPES).join(',');

const MAX_MB = 10;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const icons: Record<string, string> = {
    pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
    csv: '📊', ppt: '📑', pptx: '📑', png: '🖼️', jpg: '🖼️',
    jpeg: '🖼️', txt: '📃', zip: '🗜️',
  };
  return icons[ext || ''] || '📎';
}

export const FileUploader: React.FC<FileUploaderProps> = ({ submissionId, disabled, onChange }) => {
  const { token } = useAuth();
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing attachments on mount
  useEffect(() => {
    if (!submissionId || !token) return;
    fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/attachments/${submissionId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setFiles)
      .catch(() => {});
  }, [submissionId, token]);

  // Report files to parent robustly without causing infinite render loops
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (onChangeRef.current) {
      onChangeRef.current(files);
    }
  }, [files]);

  const uploadFiles = async (selectedFiles: FileList | File[]) => {
    if (!token || !submissionId) return;
    const errors: string[] = [];
    setUploading(true);

    for (const file of Array.from(selectedFiles)) {
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
      if (!(ext in ALLOWED_TYPES)) {
        errors.push(`"${file.name}" — unsupported format.`);
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        errors.push(`"${file.name}" — exceeds ${MAX_MB}MB limit.`);
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/attachments/${submissionId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) {
          const uploaded: AttachedFile = await res.json();
          setFiles(prev => [...prev.filter(f => f.filename !== uploaded.filename), uploaded]);
        } else {
          const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
          errors.push(`"${file.name}" — ${err.detail}`);
        }
      } catch {
        errors.push(`"${file.name}" — Network error, please try again.`);
      }
    }

    setUploadErrors(errors);
    setUploading(false);
  };

  const handleDelete = async (filename: string) => {
    if (!token) return;
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/attachments/${submissionId}/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setFiles(prev => prev.filter(f => f.filename !== filename));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  }, [disabled, submissionId, token]);

  return (
    <div className="form-group">
      <label className="form-label">Attachments</label>

      {/* Supported formats hint */}
      <div style={{
        background: 'var(--neutral-50)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem',
        fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem',
      }}>
        <strong>Supported formats:</strong>{' '}
        PDF, Word (DOC/DOCX), Excel (XLS/XLSX), CSV, PowerPoint (PPT/PPTX), PNG, JPG, TXT, ZIP
        &nbsp;·&nbsp; Max <strong>{MAX_MB}MB</strong> per file
      </div>

      {/* Drop zone */}
      {!disabled && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${isDragging ? 'var(--brand-accent)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)',
            background: isDragging ? 'var(--brand-accent-subtle)' : 'var(--surface-base)',
            padding: '1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            marginBottom: files.length ? '0.75rem' : 0,
          }}
        >
          <div style={{ fontSize: '1.75rem', marginBottom: '0.375rem' }}>
            {uploading ? '⏳' : '📁'}
          </div>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem', margin: 0 }}>
            {uploading ? 'Uploading…' : 'Drag & drop files here, or click to browse'}
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_STRING}
            style={{ display: 'none' }}
            onChange={e => e.target.files && uploadFiles(e.target.files)}
          />
        </div>
      )}

      {/* Error messages */}
      {uploadErrors.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          {uploadErrors.map((err, i) => (
            <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--color-danger)', marginBottom: '0.25rem' }}>
              ⚠ {err}
            </div>
          ))}
        </div>
      )}

      {/* Uploaded files list */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
          {files.map(f => (
            <div key={f.filename} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.625rem 0.875rem',
              border: '1.5px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-base)',
              gap: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{fileIcon(f.filename)}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.filename}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {formatBytes(f.size)}
                  </div>
                </div>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleDelete(f.filename)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-danger)', fontSize: '1rem', flexShrink: 0,
                    padding: '0.25rem', borderRadius: 'var(--radius-sm)',
                    transition: 'background 0.15s',
                  }}
                  title="Remove file"
                >✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && disabled && (
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', margin: 0 }}>No attachments uploaded.</p>
      )}
    </div>
  );
};
