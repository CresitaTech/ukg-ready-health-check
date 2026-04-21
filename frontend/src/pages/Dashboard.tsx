import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { generateSubmissionPDF } from '../utils/generatePDF';

interface Submission {
  id: number;
  customer_name: string;
  status: string;
  last_updated: string;
  current_section: number;
  form_data: string;
}

const TOTAL_SECTIONS = 9;

export const Dashboard = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubmissions();
  }, [token]);

  const fetchSubmissions = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/submissions/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSubmissions(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNew = async () => {
    setIsCreating(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/submissions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customer_name: 'New Referral', form_data: '{}', current_section: 1, status: 'draft' }),
      });
      if (res.ok) {
        const s = await res.json();
        navigate(`/intake/${s.id}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownloadPDF = async (sub: Submission) => {
    setDownloadingId(sub.id);
    try {
      // Fetch the latest full data (includes form_data) before generating
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/submissions/${sub.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const fullSub = await res.json();
        generateSubmissionPDF(fullSub);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const stats = {
    total: submissions.length,
    draft: submissions.filter(s => s.status === 'draft').length,
    completed: submissions.filter(s => s.status === 'completed').length,
  };

  if (isLoading) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 32, height: 32, borderColor: 'var(--brand-accent)', borderTopColor: 'transparent', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Health Check Referrals
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Manage your CSM intake forms and track submission status.
          </p>
        </div>
        <Button leftIcon={<PlusIcon />} onClick={handleStartNew} isLoading={isCreating}>
          Start New Referral
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Referrals', value: stats.total, accent: false },
          { label: 'In Progress', value: stats.draft, accent: false },
          { label: 'Completed', value: stats.completed, accent: true },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: stat.accent ? 'var(--brand-accent)' : 'var(--text-primary)', lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.375rem', fontWeight: 500 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.25rem 1.5rem', marginBottom: 0 }}>
          <div>
            <div className="card-title">All Referrals</div>
            <div className="card-subtitle">
              Click "Resume" to continue drafting, "View" to review, or "Download PDF" to export a completed submission.
            </div>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="empty-state" style={{ margin: '2rem', borderRadius: 'var(--radius-md)' }}>
            <div className="empty-state-icon">📋</div>
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No referrals yet</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Click "Start New Referral" to create your first intake form.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer Name</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub, idx) => {
                  const progress = Math.min(100, Math.round(((sub.current_section - 1) / (TOTAL_SECTIONS - 1)) * 100));
                  const isCompleted = sub.status === 'completed';
                  const isDownloading = downloadingId === sub.id;

                  return (
                    <tr key={sub.id}>
                      <td style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>{idx + 1}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{sub.customer_name}</span>
                      </td>
                      <td>
                        <span className={`badge ${isCompleted ? 'badge-success' : 'badge-warning'}`}>
                          {isCompleted ? 'Completed' : 'In Progress'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <div style={{ flex: 1, maxWidth: 100 }}>
                            <div className="progress-bar-outer" style={{ height: 6 }}>
                              <div className="progress-bar-inner" style={{ width: `${isCompleted ? 100 : progress}%` }} />
                            </div>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500, minWidth: 32 }}>
                            {isCompleted ? '100%' : `${progress}%`}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {new Date(sub.last_updated).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/intake/${sub.id}`)}
                          >
                            {isCompleted ? 'View' : 'Resume'}
                          </Button>
                          {isCompleted && (
                            <Button
                              variant="outline"
                              size="sm"
                              isLoading={isDownloading}
                              leftIcon={!isDownloading ? <DownloadIcon /> : undefined}
                              onClick={() => handleDownloadPDF(sub)}
                            >
                              {isDownloading ? 'Generating…' : 'Download PDF'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 2v8M5 7l3 3 3-3M3 13h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
