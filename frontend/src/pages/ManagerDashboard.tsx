import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { generateSubmissionPDF } from '../utils/generatePDF';

interface SubmissionWithUser {
  id: number;
  customer_name: string;
  status: string;
  has_updates: boolean;
  last_updated: string;
  current_section: number;
  form_data: string;
  user_id: number;
  csm_name: string | null;
  csm_email: string | null;
}

interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: string;
}

type Tab = 'submissions' | 'users';

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

export const ManagerDashboard = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('submissions');

  const [submissions, setSubmissions] = useState<SubmissionWithUser[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, tab]);

  const API = import.meta.env.VITE_API_BASE_URL || '';

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${API}/submissions/all`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
      fetch(`${API}/auth/users`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
    ]).then(([subs, usrs]) => {
      setSubmissions(subs);
      setUsers(usrs);
    }).finally(() => setIsLoading(false));
  }, [token]);

  const handleDownloadPDF = async (sub: SubmissionWithUser) => {
    setDownloadingId(sub.id);
    try {
      const res = await fetch(`${API}/submissions/${sub.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const full = await res.json();
        generateSubmissionPDF({ id: full.id, customer_name: full.customer_name, last_updated: full.last_updated, form_data: full.form_data });
      }
    } finally {
      setDownloadingId(null);
    }
  };



  const filteredSubs = submissions.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = !q || s.customer_name?.toLowerCase().includes(q) || s.csm_name?.toLowerCase().includes(q) || s.csm_email?.toLowerCase().includes(q);
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'updated' && s.has_updates) || 
                         (filterStatus === 'new' && !s.has_updates);
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: submissions.length,
    new: submissions.filter(s => !s.has_updates).length,
    updated: submissions.filter(s => s.has_updates).length,
    csms: users.filter(u => u.role === 'csm').length,
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.625rem 1.5rem',
    fontWeight: 600,
    fontSize: '0.875rem',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: active ? 'var(--brand-accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
  });

  if (isLoading) return (
    <main className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading manager view…</p>
      </div>
    </main>
  );

  return (
    <main className="page-content">
      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🛡️</span>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>Manager Dashboard</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9375rem' }}>
          Full visibility across all completed CSM submissions and team management.
        </p>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Reports', value: stats.total, icon: '📋', color: 'var(--brand-primary)' },
          { label: 'New Submissions', value: stats.new, icon: '✨', color: 'var(--brand-accent)' },
          { label: 'Updated Reports', value: stats.updated, icon: '🔄', color: '#0ea5e9' },
          { label: 'Active CSMs', value: stats.csms, icon: '👤', color: '#7c3aed' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '1.75rem' }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--neutral-100)', borderRadius: 'var(--radius-lg)', padding: '0.25rem', width: 'fit-content', marginBottom: '1.5rem' }}>
          <button style={tabStyle(tab === 'submissions')} onClick={() => setTab('submissions')}>📋 All Submissions</button>
          <button style={tabStyle(tab === 'users')} onClick={() => setTab('users')}>👥 Team Members</button>
        </div>

        {tab === 'submissions' && (
          <>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search by customer, CSM name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="form-input"
                style={{ flex: 1, minWidth: '220px' }}
              />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-select" style={{ width: '180px' }}>
                <option value="all">All Reports</option>
                <option value="new">New Only</option>
                <option value="updated">Updated Only</option>
              </select>
            </div>

            {filteredSubs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-tertiary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
                <p>No reports match your filters.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
                      {['Customer', 'CSM', 'Status', 'Last Updated', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((sub, index) => {
                      const i = (currentPage - 1) * rowsPerPage + index;
                      return (
                        <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--neutral-50)', transition: 'background 0.1s' }}>
                          <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {sub.customer_name || '—'}
                          </td>
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{sub.csm_name || '—'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{sub.csm_email}</div>
                          </td>
                          <td style={{ padding: '0.875rem 1rem' }}>
                            {sub.has_updates ? (
                              <span style={{ 
                                padding: '0.3rem 0.75rem', 
                                background: '#e0f2fe', 
                                color: '#0369a1', 
                                borderRadius: '999px', 
                                fontSize: '0.7rem', 
                                fontWeight: 700, 
                                textTransform: 'uppercase',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                border: '1.5px solid #7dd3fc'
                              }}>
                                <span style={{ fontSize: '0.9rem' }}>🔄</span> Updated
                              </span>
                            ) : (
                              <span style={{ 
                                padding: '0.3rem 0.75rem', 
                                background: '#f0fdf4', 
                                color: '#15803d', 
                                borderRadius: '999px', 
                                fontSize: '0.7rem', 
                                fontWeight: 700, 
                                textTransform: 'uppercase',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                border: '1.5px solid #86efac'
                              }}>
                                <span style={{ fontSize: '0.9rem' }}>✨</span> New
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)' }}>{formatDate(sub.last_updated)}</td>
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <Button
                                variant="outline"
                                onClick={() => handleDownloadPDF(sub)}
                                disabled={downloadingId === sub.id}
                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                              >
                                {downloadingId === sub.id ? '…' : '⬇ PDF'}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => navigate(`/view/${sub.id}`)}
                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                              >
                                👁 View
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {Math.ceil(filteredSubs.length / rowsPerPage) > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border-subtle)', marginTop: '1rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredSubs.length)} of {filteredSubs.length} reports
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredSubs.length / rowsPerPage), p + 1))} 
                    disabled={currentPage === Math.ceil(filteredSubs.length / rowsPerPage)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'users' && (
          <div>
            {users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-tertiary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👥</div>
                <p>No team members found.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {users.map(u => {
                  const userSubmissions = submissions.filter(s => s.user_id === u.id);
                  const count = userSubmissions.length;
                  
                  return (
                    <div key={u.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1rem 1.25rem',
                      border: '1.5px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-base)',
                      flexWrap: 'wrap', gap: '0.75rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div style={{
                          width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                          background: u.role === 'manager' ? 'var(--brand-primary)' : 'var(--brand-accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
                        }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--brand-accent)', lineHeight: 1 }}>{count}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, marginTop: '2px' }}>Submissions</div>
                        </div>
                        <span style={{
                          padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
                          background: u.role === 'manager' ? 'var(--brand-primary)' : 'var(--neutral-100)',
                          color: u.role === 'manager' ? '#fff' : 'var(--text-secondary)',
                          border: `1.5px solid ${u.role === 'manager' ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                        }}>
                          {u.role === 'manager' ? '🛡️ Manager' : '👤 CSM'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};
