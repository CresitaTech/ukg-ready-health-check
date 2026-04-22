import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { generateSubmissionPDF } from '../utils/generatePDF';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SubmissionData {
  id: number;
  customer_name: string;
  status: string;
  last_updated: string;
  form_data: string;
  user_id: number;
}

// ── Section definitions ───────────────────────────────────────────────────────
const SECTIONS = [
  { title: 'CSM Info',               icon: '👤' },
  { title: 'Customer Profile',       icon: '🏢' },
  { title: 'Health Check Trigger',   icon: '⚠️'  },
  { title: 'License & Usage',        icon: '📦' },
  { title: 'Implementation History', icon: '🔧' },
  { title: 'Operational Model',      icon: '⚙️'  },
  { title: 'Ticket History',         icon: '🎫' },
  { title: 'AI Readiness',           icon: '🤖' },
  { title: 'Additional Info',        icon: '📎' },
];

// ── Helper UI ────────────────────────────────────────────────────────────────
const Field = ({ label, value }: { label: string; value?: string }) => (
  <div style={{ marginBottom: '1.25rem' }}>
    <div style={{
      fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' as const,
      letterSpacing: '0.055em', color: 'var(--text-tertiary)', marginBottom: '0.3rem',
    }}>
      {label}
    </div>
    <div style={{
      fontSize: '0.9375rem', color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
      padding: '0.625rem 0.875rem',
      background: 'var(--neutral-50)',
      borderRadius: 'var(--radius-md)',
      border: '1.5px solid var(--border-subtle)',
      minHeight: '2.5rem',
      lineHeight: 1.6,
      whiteSpace: 'pre-wrap' as const,
    }}>
      {value || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>—</span>}
    </div>
  </div>
);

const Grid2 = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
    {children}
  </div>
);

const SectionDivider = () => (
  <div style={{ borderTop: '1.5px dashed var(--border-subtle)', margin: '0.5rem 0 1.25rem' }} />
);

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

type F = Record<string, string>;

// ── Section renderers ─────────────────────────────────────────────────────────
const Section1 = ({ d }: { d: F }) => (
  <>
    <Grid2>
      <Field label="CSM Full Name"              value={d.csmName} />
      <Field label="CSM Email"                  value={d.csmEmail} />
    </Grid2>
    <Grid2>
      <Field label="CSM Region / Territory"     value={d.csmRegion} />
      <Field label="Referral Date"              value={d.referralDate} />
    </Grid2>
    <Field label="Opallios Engagement Contact"  value={d.opalliosContact} />
  </>
);

const Section2 = ({ d }: { d: F }) => (
  <>
    <Grid2>
      <Field label="Customer / Company Name"    value={d.customerName} />
      <Field label="Industry / Vertical"        value={d.industry} />
    </Grid2>
    <Grid2>
      <Field label="UKG Account ID"             value={d.accountId} />
      <Field label="Number of Active Employees" value={d.headcount} />
    </Grid2>
    <Grid2>
      <Field label="Number of EINs (Tax IDs)"   value={d.eins} />
      <Field label="Number of Locations/Sites"  value={d.locations} />
    </Grid2>
    <Field label="Primary Customer Contact"     value={d.primaryContact} />
    <Field label="Secondary Contact"            value={d.secondaryContact} />
    <Field label="Geographic Distribution"      value={d.geoDistribution} />
  </>
);

const Section3 = ({ d }: { d: F }) => (
  <>
    <Field label="Primary Reason for Referral"       value={d.primaryReason} />
    <Field label="Brief Description of Concern"      value={d.concernDescription} />
    <Grid2>
      <Field label="Escalated / Churn Intent?"       value={d.escalated} />
      <Field label="Renewal Date"                    value={d.renewalDate} />
    </Grid2>
    <Field label="Escalation Context"                value={d.escalationContext} />
    <Field label="CSM's Desired Outcome"             value={d.desiredOutcome} />
  </>
);

const MODULES = [
  'Workforce Management', 'Payroll', 'Benefits Administration',
  'Core HR', 'Talent / Recruiting', 'Onboarding',
  'Performance Management', 'Learning Management (LMS)', 'Compensation',
  'UKG Ready Scheduler', 'Analytics / Reporting', 'UKG Bryte AI',
];

const Section4 = ({ d }: { d: F }) => {
  const checked = MODULES.filter(m => d[`module_${m.replace(/ /g, '_')}`] === 'true' || d[`module_${m.replace(/ /g, '_')}`] === 'on');
  return (
    <>
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.055em', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
          Licensed Modules
        </div>
        {checked.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {checked.map(m => (
              <span key={m} style={{ padding: '0.25rem 0.75rem', background: 'var(--brand-accent-subtle)', color: 'var(--brand-accent)', borderRadius: '999px', fontSize: '0.8125rem', fontWeight: 600, border: '1.5px solid var(--brand-accent)' }}>
                {m}
              </span>
            ))}
          </div>
        ) : <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>None selected</span>}
      </div>
      <Field label="Other Licensed Modules"       value={d.otherLicensedModules} />
      <SectionDivider />
      <Field label="Actively Implemented Modules" value={d.activeModules} />
      <Field label="Licensed But NOT Implemented" value={d.notImplemented} />
      <Field label="Modules with Low Adoption"    value={d.lowAdoptionModules} />
      <Field label="Integration Points"           value={d.integrations} />
    </>
  );
};

const Section5 = ({ d }: { d: F }) => (
  <>
    <Grid2>
      <Field label="Original Go-Live Date"                 value={d.goLiveDate} />
      <Field label="Implementation Partner (original)"     value={d.implementationPartner} />
    </Grid2>
    <Field label="Subsequent Re-implementations/Upgrades?" value={d.subsequentUpgrades} />
    <Field label="Upgrade Scope & Date"                    value={d.upgradeScope} />
    <Field label="Significant Config Changes Post Go-Live?" value={d.configChanges} />
    <Grid2>
      <Field label="When Were Changes Made?"               value={d.configChangeDate} />
      <Field label="Who Made the Changes?"                 value={d.configChangeWho} />
    </Grid2>
    <Field label="Configuration Change Documented?"        value={d.configDocumented} />
    <Grid2>
      <Field label="PayCalc 2.0 Adopted?"                  value={d.payCalcAdoption} />
      <Field label="Accruals 2.0 Adopted?"                 value={d.accrualsAdoption} />
    </Grid2>
  </>
);

const Section6 = ({ d }: { d: F }) => (
  <>
    <Field label="Who Manages UKG Day-to-Day?"             value={d.dayToDayManager} />
    <Field label="Number of UKG Admins / Super Users"      value={d.numberOfAdmins} />
    <Field label="Change Management Process"               value={d.changeManagementProcess} />
    <Field label="Payroll Validation Process"              value={d.payrollValidation} />
    <Grid2>
      <Field label="Payroll Audit Frequency"               value={d.payrollAuditFrequency} />
      <Field label="Timecard Review & Approval Process"    value={d.timecardReview} />
    </Grid2>
    <Field label="Accrual Management"                      value={d.accrualManagement} />
    <Field label="Known Recurring Pain Points"             value={d.painPoints} />
    <Field label="Reliance on Specific Individuals?"       value={d.individualReliance} />
  </>
);

const Section7 = ({ d }: { d: F }) => (
  <>
    <Grid2>
      <Field label="Total Tickets (Last 6 Months)"  value={d.totalTickets} />
      <Field label="Avg Ticket Resolution Time"     value={d.resolutionTime} />
    </Grid2>
    <Field label="Top 3 Ticket Categories / Themes" value={d.ticketCategories} />
    <Grid2>
      <Field label="Open / Unresolved Critical Tickets?" value={d.openCriticalTickets} />
      <Field label="Escalations to UKG Leadership?"     value={d.escalationsToLeadership} />
    </Grid2>
    <Field label="Recurring Ticket Patterns"        value={d.ticketPatterns} />
    <Field label="Ticket Details / Additional Context" value={d.ticketDetails} />
  </>
);

const Section8 = ({ d }: { d: F }) => (
  <>
    <Grid2>
      <Field label="Interested in Bryte AI?"            value={d.interestedInBryteAI} />
      <Field label="Data Quality / Integrity Concerns?" value={d.dataQualityConcerns} />
    </Grid2>
    <Field label="AI Functionality Explored / Piloted"  value={d.aiFunctionalityExplored} />
    <Field label="How Is Reporting Currently Handled?"  value={d.reportingHandled} />
    <Field label="Executive Dashboards Available?"      value={d.executiveDashboards} />
    <Field label="Executive Reporting Alternative"      value={d.executiveDashboardAlt} />
    <Field label="Compliance / Data Governance Concerns" value={d.complianceConcerns} />
  </>
);

const Section9 = ({ d }: { d: F }) => (
  <>
    <Field label="Recent Organizational Changes?"    value={d.recentChanges} />
    <Field label="Budget Allocated for Work?"        value={d.budgetAllocated} />
    <Field label="Worked with Opallios Before?"      value={d.workedWithOpallios} />
    <Field label="Prior Opallios Engagement Details" value={d.priorEngagement} />
    <Field label="Political / Relationship Sensitivities" value={d.politicalSensitivities} />
    <Field label="Recommended Introduction Approach" value={d.introApproach} />
    <Field label="Attachments Provided"              value={d.attachments} />
  </>
);

const SECTION_COMPONENTS = [Section1, Section2, Section3, Section4, Section5, Section6, Section7, Section8, Section9];

// ── Main Page ─────────────────────────────────────────────────────────────────
export const SubmissionView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, isManager, user } = useAuth();

  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [formData, setFormData] = useState<F>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const API = import.meta.env.VITE_API_BASE_URL || '';
  const backPath = isManager ? '/manager' : '/dashboard';
  const backLabel = isManager ? '← Back to Manager Dashboard' : '← Back to Dashboard';

  useEffect(() => {
    if (!token || !id) return;
    fetch(`${API}/submissions/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { navigate(backPath); return; }
        setSubmission(data);
        setFormData(JSON.parse(data.form_data || '{}'));
      })
      .finally(() => setIsLoading(false));
  }, [id, token]);

  const handleDownload = () => {
    if (!submission) return;
    setIsDownloading(true);
    try {
      generateSubmissionPDF(submission);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUnlockEdit = async () => {
    if (!submission || !token) return;
    setIsUnlocking(true);
    try {
      await fetch(`${API}/submissions/${submission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customer_name: submission.customer_name,
          form_data: submission.form_data,
          current_section: 1,
          status: 'draft',
        }),
      });
      navigate(`/intake/${submission.id}`);
    } finally {
      setIsUnlocking(false);
    }
  };

  if (isLoading) return (
    <main className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading submission…</p>
      </div>
    </main>
  );

  if (!submission) return null;

  const SectionContent = SECTION_COMPONENTS[currentStep - 1];
  const section = SECTIONS[currentStep - 1];

  // CSMs only see Unlock & Edit on their own submissions
  const isOwner = !isManager && submission.user_id === user?.id;

  return (
    <main className="page-content">
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <button
            onClick={() => navigate(backPath)}
            style={{ background: 'none', border: 'none', color: 'var(--brand-accent)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', padding: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            {backLabel}
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {submission.customer_name}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Submitted {formatDate(submission.last_updated)} · View-Only Mode
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Role-aware action: CSMs get Unlock & Edit, Managers get Read-Only badge */}
          {isOwner ? (
            <Button variant="primary" onClick={handleUnlockEdit} disabled={isUnlocking}>
              {isUnlocking ? '…' : '✏️ Unlock & Edit'}
            </Button>
          ) : (
            <span style={{
              padding: '0.375rem 1rem',
              background: '#f0fdf4',
              color: 'var(--brand-accent)',
              border: '1.5px solid var(--brand-accent)',
              borderRadius: '999px',
              fontSize: '0.8125rem',
              fontWeight: 700,
            }}>
              🔒 Read-Only
            </span>
          )}
          <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? '…' : '⬇ Download PDF'}
          </Button>
        </div>
      </div>

      {/* Section tab navigation – wrapping pills, no horizontal scroll */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          {SECTIONS.map((s, i) => {
            const active = currentStep === i + 1;
            return (
              <button
                key={i}
                onClick={() => setCurrentStep(i + 1)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: active ? '2px solid var(--brand-accent)' : '2px solid transparent',
                  background: active ? 'var(--brand-accent-subtle)' : 'transparent',
                  color: active ? 'var(--brand-accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.8125rem',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                <span>{s.icon}</span>
                <span>{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section content card */}
      <div className="card" style={{ padding: '2rem' }}>
        {/* Section heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.75rem', paddingBottom: '1.25rem', borderBottom: '2px solid var(--border-subtle)' }}>
          <div style={{
            width: '2.75rem', height: '2.75rem', borderRadius: 'var(--radius-md)',
            background: 'var(--brand-accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.375rem', flexShrink: 0,
          }}>
            {section.icon}
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: '0.125rem' }}>
              Section {currentStep} of {SECTIONS.length}
            </div>
            <div style={{ fontSize: '1.1875rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {section.title}
            </div>
          </div>
        </div>

        {/* Fields */}
        <SectionContent d={formData} />

        {/* Prev / Next navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
            disabled={currentStep === 1}
          >
            ← Previous
          </Button>
          {currentStep < SECTIONS.length ? (
            <Button onClick={() => setCurrentStep(s => Math.min(SECTIONS.length, s + 1))}>
              Next Section →
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate(backPath)}>
              ← Back to Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Footer */}
      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '1.5rem' }}>
        Opallios — UKG Ready Optimization & Advisory Services | info@opallios.com | 1-(888)-205-4058<br/>
        Confidential — For Opallios and authorized UKG CSM personnel only.
      </p>
    </main>
  );
};
