import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { Stepper } from '../components/Stepper';
import { Button } from '../components/Button';
import { Input, TextArea, Select } from '../components/Input';
import { generateSubmissionPDFBase64 } from '../utils/generatePDF';
import { FileUploader } from '../components/FileUploader';

const SECTIONS = [
  { title: 'CSM Info',              icon: '👤', desc: 'CSM identification and referral details' },
  { title: 'Customer Profile',      icon: '🏢', desc: 'Customer identification and contact information' },
  { title: 'Health Check Trigger',  icon: '⚠️',  desc: 'Primary reason for Health Check referral' },
  { title: 'License & Usage',       icon: '📦', desc: 'UKG platform modules licensed and in use' },
  { title: 'Implementation History',icon: '🔧', desc: 'Go-live history and configuration details' },
  { title: 'Operational Model',     icon: '⚙️',  desc: 'How the customer manages their UKG environment' },
  { title: 'Ticket History',        icon: '🎫', desc: 'Support ticket summary for the last 6 months' },
  { title: 'AI Readiness',          icon: '🤖', desc: 'UKG Bryte AI and analytics readiness assessment' },
  { title: 'Additional Info',       icon: '📎', desc: 'Organizational context and engagement guidance' },
];

const YN = [{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }];
const YNU = [...YN, { label: 'Unknown', value: 'Unknown' }];
const YNIP = [...YN, { label: 'Unknown', value: 'Unknown' }, { label: 'In Progress', value: 'In Progress' }];

export const Intake = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user, isManager } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { register, watch, reset, setValue, trigger, formState: { errors } } = useForm({ defaultValues: {} as Record<string, any> });
  const formData = watch();
  const saveTimerRef = useRef<number | null>(null);

  const SECTION_FIELDS: Record<number, string[]> = {
    1: ['csmName', 'csmEmail'],
    2: ['customerName', 'accountId'],
    3: ['primaryReason', 'concernDescription', 'escalated'],
    4: [], // Section 4 is special: custom "any module" validation
    5: ['subsequentUpgrades', 'configChanges', 'configDocumented', 'payCalcAdoption', 'accrualsAdoption'],
    6: ['individualReliance'],
    7: ['totalTickets', 'openCriticalTickets', 'escalationsToLeadership'],
    8: ['interestedInBryteAI', 'dataQualityConcerns', 'executiveDashboards'],
    9: ['budgetAllocated', 'workedWithOpallios'],
  };

  useEffect(() => {
    if (!token || !id) return;
    (async () => {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/submissions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(data.form_data || '{}');
        
        // Auto-populate CSM name and email if empty
        if (!parsed.csmName && user?.name) parsed.csmName = user.name;
        if (!parsed.csmEmail && user?.email) parsed.csmEmail = user.email;
        
        reset({ ...parsed });
        setCurrentStep(data.current_section || 1);
        setIsCompleted(data.status === 'completed');
      } else {
        navigate(isManager ? '/manager' : '/dashboard');
      }
    })();
  }, [id, token, reset, navigate]);

  useEffect(() => {
    if (isCompleted) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => save(formData, currentStep), 30000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [formData]);

  const save = async (data: Record<string, any>, step: number, status = 'draft', pdfBase64?: string) => {
    if (!token || !id) return;
    setIsSaving(true);
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/submissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customer_name: data.customerName || 'Untitled Referral',
          form_data: JSON.stringify(data),
          current_section: step,
          status,
          ...(pdfBase64 ? { pdf_base64: pdfBase64 } : {}),
        }),
      });
      setLastSaved(new Date());
    } finally {
      setIsSaving(false);
    }
  };

  const validateCurrentSection = async () => {
    // Special check for section 4
    if (currentStep === 4) {
      const modules = Object.keys(formData).filter(k => k.startsWith('module_') && formData[k]);
      if (modules.length === 0) {
        // Return false to block progression; error will be shown via custom UI in section 4
        return false;
      }
    }
    
    const fields = SECTION_FIELDS[currentStep] || [];
    if (fields.length === 0) return true;
    return await trigger(fields as any);
  };

  const goNext = async () => {
    const isValid = await validateCurrentSection();
    if (!isValid) return;

    await save(formData, currentStep + 1);
    setCurrentStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPrev = async () => {
    await save(formData, currentStep - 1);
    setCurrentStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async () => {
    const isValid = await validateCurrentSection();
    if (!isValid) return;

    // Generate PDF as base64 to attach to email notification
    let pdfBase64: string | undefined;
    try {
      pdfBase64 = generateSubmissionPDFBase64({
        id: Number(id),
        customer_name: formData.customerName || 'Untitled Referral',
        last_updated: new Date().toISOString(),
        form_data: JSON.stringify(formData),
      });
    } catch (e) {
      console.warn('PDF generation for email failed:', e);
    }
    await save(formData, SECTIONS.length, 'completed', pdfBase64);
    navigate(`/view/${id}`);
  };

  const section = SECTIONS[currentStep - 1];
  const stepNames = SECTIONS.map(s => s.title);

  return (
    <div className="page-content" style={{ maxWidth: 860 }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: 0, fontFamily: 'Inter, sans-serif' }}
          >
            ← Back to Dashboard
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              CSM Health Check Intake
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Complete all 9 sections thoroughly. Your progress is automatically saved.
            </p>
          </div>
          <div className="save-indicator">
            {isSaving ? (
              <>
                <div className="save-dot" />
                <span>Saving…</span>
              </>
            ) : lastSaved ? (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--color-success)' }}>
                  <path d="M2 7l3.5 3.5L12 3" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </>
            ) : (
              <span>Auto-save enabled</span>
            )}
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <Stepper steps={stepNames} currentStep={currentStep} />
      </div>

      {/* Form Card */}
      <div className="card" style={{ position: 'relative' }}>
        {isCompleted && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            background: 'rgba(255,255,255,0.9)', borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem',
          }}>
            <div style={{ fontSize: '3rem' }}>✅</div>
            <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)' }}>This submission is completed</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Opening view-only report…</span>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="outline" onClick={() => navigate(isManager ? '/manager' : '/dashboard')}>
                {isManager ? '← Back to Manager Dashboard' : 'Back to Dashboard'}
              </Button>
              <Button variant="primary" onClick={() => navigate(`/view/${id}`)}>
                👁 View Report
              </Button>
            </div>
          </div>
        )}

        {/* Section Heading */}
        <div className="section-heading">
          <div className="section-heading-icon" style={{ fontSize: '1.25rem' }}>{section.icon}</div>
          <div className="section-heading-text">
            <h2>Section {currentStep}: {section.title}</h2>
            <p>{section.desc}</p>
          </div>
        </div>

        <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* ── Section 1: CSM Info ── */}
          {currentStep === 1 && (
            <div className="form-stack">
              <div className="grid-2">
                <Input 
                  label="CSM Full Name" 
                  placeholder="First and last name" 
                  hint="Your UKG-registered name" 
                  required
                  registration={register('csmName', { required: 'CSM Name is required' })} 
                  error={errors.csmName?.message as string}
                />
                <Input 
                  label="CSM Email" 
                  type="email" 
                  placeholder="name@ukg.com" 
                  hint="UKG internal email address" 
                  required
                  registration={register('csmEmail', { required: 'CSM Email is required' })} 
                  error={errors.csmEmail?.message as string}
                />
              </div>
              <div className="grid-2">
                <Input label="CSM Region / Territory" placeholder="e.g. Southeast, Mid-Atlantic" registration={register('csmRegion')} />
                <Input label="Referral Date" type="date" registration={register('referralDate')} />
              </div>
              <Input label="Opallios Engagement Contact" placeholder="Name of point of contact, if known" registration={register('opalliosContact')} />
            </div>
          )}

          {/* ── Section 2: Customer Profile ── */}
          {currentStep === 2 && (
            <div className="form-stack">
              <div className="grid-2">
                <Input 
                  label="Customer / Company Name" 
                  placeholder="Legal entity name as in UKG account" 
                  required 
                  registration={register('customerName', { required: 'Customer Name is required' })} 
                  error={errors.customerName?.message as string}
                />
                <Input label="Industry / Vertical" placeholder="e.g. Healthcare, Retail, Manufacturing" registration={register('industry')} />
              </div>
              <div className="grid-2">
                <Input 
                  label="UKG Account ID" 
                  placeholder="As listed in UKG CRM or Support portal" 
                  required
                  registration={register('accountId', { required: 'Account ID is required' })} 
                  error={errors.accountId?.message as string}
                />
                <Input label="Number of Active Employees" type="number" placeholder="Approximate headcount" registration={register('headcount')} />
              </div>
              <div className="grid-2">
                <Input label="Number of EINs (Tax IDs)" type="number" placeholder="Distinct employer identification numbers" registration={register('eins')} />
                <Input label="Number of Locations / Sites" type="number" placeholder="Physical locations or cost centers" registration={register('locations')} />
              </div>
              <TextArea label="Primary Customer Contact" placeholder="Name, title, email" hint="Include all relevant stakeholders" registration={register('primaryContact')} />
              <TextArea label="Secondary Contact (if any)" placeholder="Name, title, email" registration={register('secondaryContact')} />
              <Input label="Geographic Distribution" placeholder="States, regions, or countries where employees are based" registration={register('geoDistribution')} />
            </div>
          )}

          {/* ── Section 3: Health Check Trigger ── */}
          {currentStep === 3 && (
            <div className="form-stack">
              <Select
                label="Primary Reason for Health Check Referral"
                required
                options={[
                  { label: 'At Risk of Churn', value: 'churn' },
                  { label: 'Low Adoption / Low Engagement', value: 'low_adoption' },
                  { label: 'Poor CSAT / NPS', value: 'poor_csat' },
                  { label: 'Renewal Uncertainty', value: 'renewal_uncertainty' },
                ]}
                registration={register('primaryReason', { required: 'Please select a reason' })}
                error={errors.primaryReason?.message as string}
              />
              <TextArea 
                label="Brief Description of Concern" 
                placeholder="In 2–3 sentences, describe the specific situation" 
                required 
                registration={register('concernDescription', { required: 'Please provide a description' })} 
                error={errors.concernDescription?.message as string}
              />
              <div className="grid-2">
                <Select 
                  label="Has the customer escalated or expressed churn intent?" 
                  required
                  options={YN} 
                  registration={register('escalated', { required: 'Please select an option' })} 
                  error={errors.escalated?.message as string}
                />
                <Input label="Renewal Date (if known)" type="date" registration={register('renewalDate')} />
              </div>
              <TextArea label="Escalation context (if Yes)" placeholder="Describe the escalation or churn intent details…" registration={register('escalationContext')} />
              <TextArea label="CSM's Desired Outcome from Health Check" placeholder="e.g. identify quick wins, build optimization business case, reduce churn risk" registration={register('desiredOutcome')} />
            </div>
          )}

          {/* ── Section 4: License & Usage ── */}
          {currentStep === 4 && (
            <div className="form-stack">
              {/* Custom validation error for Section 4 */}
              {Object.keys(formData).filter(k => k.startsWith('module_') && formData[k]).length === 0 && (
                <div style={{ padding: '0.75rem 1rem', background: '#fff5f5', color: '#c53030', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, border: '1px solid #feb2b2' }}>
                  ⚠ Please select at least one licensed module below.
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Licensed Modules — Group 1 <span className="required">*</span></label>
                <div className="checkbox-grid">
                  {['Workforce Management', 'Payroll', 'Benefits Administration'].map(m => (
                    <label key={m} className="checkbox-item">
                      <input type="checkbox" {...register(`module_${m.replace(/ /g,'_')}`)} />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Licensed Modules — Group 2</label>
                <div className="checkbox-grid">
                  {['Core HR', 'Talent / Recruiting', 'Onboarding'].map(m => (
                    <label key={m} className="checkbox-item">
                      <input type="checkbox" {...register(`module_${m.replace(/ /g,'_')}`)} />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Licensed Modules — Group 3</label>
                <div className="checkbox-grid">
                  {['Performance Management', 'Learning Management (LMS)', 'Compensation'].map(m => (
                    <label key={m} className="checkbox-item">
                      <input type="checkbox" {...register(`module_${m.replace(/ /g,'_')}`)} />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Licensed Modules — Group 4</label>
                <div className="checkbox-grid">
                  {['UKG Ready Scheduler', 'Analytics / Reporting', 'UKG Bryte AI'].map(m => (
                    <label key={m} className="checkbox-item">
                      <input type="checkbox" {...register(`module_${m.replace(/ /g,'_')}`)} />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              </div>
              <TextArea label="Other Licensed Modules" placeholder="List any additional licensed modules not listed above" registration={register('otherLicensedModules')} />
              <div className="divider" />
              <TextArea label="Actively Implemented Modules" placeholder="List only modules that are live and in use today" hint="Do not include modules only licensed but not deployed" registration={register('activeModules')} />
              <TextArea label="Licensed But NOT Implemented" placeholder="Modules licensed but not yet deployed or used" registration={register('notImplemented')} />
              <TextArea label="Modules with Low Adoption" placeholder="Where engagement or utilization is known to be poor" registration={register('lowAdoptionModules')} />
              <TextArea label="Integration Points" placeholder="Third-party systems connected to UKG (ERP, ATS, GL, Benefits Carriers)" registration={register('integrations')} />
            </div>
          )}

          {/* ── Section 5: Implementation History ── */}
          {currentStep === 5 && (
            <div className="form-stack">
              <div className="grid-2">
                <Input label="Original Go-Live Date" placeholder="MM/YYYY" registration={register('goLiveDate')} />
                <Input label="Implementation Partner (original)" placeholder="Partner name or 'UKG Direct'" registration={register('implementationPartner')} />
              </div>
              <Select 
                label="Any subsequent re-implementations or major upgrades?" 
                required
                options={YN} 
                registration={register('subsequentUpgrades', { required: 'Please select an option' })} 
                error={errors.subsequentUpgrades?.message as string}
              />
              <TextArea label="If Yes, describe scope and date" registration={register('upgradeScope')} />
              <Select 
                label="Significant configuration changes post go-live?" 
                required
                options={YN} 
                registration={register('configChanges', { required: 'Please select an option' })} 
                error={errors.configChanges?.message as string}
              />
              <div className="grid-2">
                <TextArea label="When were changes made?" placeholder="Approximate date(s) and description" registration={register('configChangeDate')} />
                <TextArea label="Who made the changes?" placeholder="Internal admin, UKG, third-party partner" registration={register('configChangeWho')} />
              </div>
              <Select 
                label="Is configuration change documented?" 
                required
                options={YNU} 
                registration={register('configDocumented', { required: 'Please select an option' })} 
                error={errors.configDocumented?.message as string}
              />
              <div className="grid-2">
                <Select 
                  label="Has PayCalc 2.0 been adopted?" 
                  required
                  options={YNIP} 
                  registration={register('payCalcAdoption', { required: 'Please select an option' })} 
                  error={errors.payCalcAdoption?.message as string}
                />
                <Select 
                  label="Has Accruals 2.0 been adopted?" 
                  required
                  options={YNIP} 
                  registration={register('accrualsAdoption', { required: 'Please select an option' })} 
                  error={errors.accrualsAdoption?.message as string}
                />
              </div>
            </div>
          )}

          {/* ── Section 6: Operational Model ── */}
          {currentStep === 6 && (
            <div className="form-stack">
              <TextArea label="Who manages UKG day-to-day?" placeholder="e.g. dedicated HR admin, shared HR/Payroll team, IT, outsourced" registration={register('dayToDayManager')} />
              <Input label="Number of UKG Admins / Super Users" type="number" placeholder="Approximate number with admin-level access" registration={register('numberOfAdmins')} />
              <TextArea label="Formal change management process for UKG?" placeholder="Yes / No / Ad hoc — describe" registration={register('changeManagementProcess')} />
              <TextArea label="How is payroll validated before finalization?" placeholder="Describe manual review steps, checklists, or tools" registration={register('payrollValidation')} />
              <div className="grid-2">
                <Input label="Payroll audit frequency" placeholder="e.g. monthly, per cycle, ad hoc" registration={register('payrollAuditFrequency')} />
                <TextArea label="How are timecards reviewed and approved?" placeholder="Describe manager approval process and manual steps" registration={register('timecardReview')} />
              </div>
              <TextArea label="How is accrual management handled?" placeholder="Manual monitoring, automated, or combination" registration={register('accrualManagement')} />
              <TextArea label="Known recurring operational pain points" placeholder="Anything the team has complained about repeatedly…" registration={register('painPoints')} />
              <Select 
                label="Reliance on specific individuals?" 
                required
                options={YN} 
                registration={register('individualReliance', { required: 'Please select an option' })} 
                error={errors.individualReliance?.message as string}
                hint="Describes single-point-of-failure risks" 
              />
            </div>
          )}

          {/* ── Section 7: Ticket History ── */}
          {currentStep === 7 && (
            <div className="form-stack">
              <div style={{ background: 'var(--neutral-50)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                💡 A ticket summary is one of the most valuable inputs. If possible, export or summarize the customer's UKG Support ticket log for the past 6 months before completing this section.
              </div>
              <div className="grid-2">
                <Input 
                  label="Total Tickets (Last 6 Months)" 
                  type="number" 
                  placeholder="Count from UKG Support portal" 
                  required
                  registration={register('totalTickets', { required: 'Please enter total tickets' })} 
                  error={errors.totalTickets?.message as string}
                />
                <Input label="Average Ticket Resolution Time" placeholder="If known" registration={register('resolutionTime')} />
              </div>
              <TextArea label="Top 3 Ticket Categories / Themes" placeholder="e.g. payroll errors, time calc issues, reporting, accruals" registration={register('ticketCategories')} />
              <div className="grid-2">
                <Select 
                  label="Open / unresolved critical tickets?" 
                  required
                  options={YN} 
                  registration={register('openCriticalTickets', { required: 'Please select an option' })} 
                  error={errors.openCriticalTickets?.message as string}
                />
                <Select 
                  label="Any escalations to UKG leadership?" 
                  required
                  options={YN} 
                  registration={register('escalationsToLeadership', { required: 'Please select an option' })} 
                  error={errors.escalationsToLeadership?.message as string}
                />
              </div>
              <TextArea label="Recurring ticket patterns (issues logged more than once)" registration={register('ticketPatterns')} />
              <TextArea label="Ticket details / Additional context" placeholder="Paste or summarize ticket log here…" registration={register('ticketDetails')} />
            </div>
          )}

          {/* ── Section 8: AI Readiness ── */}
          {currentStep === 8 && (
            <div className="form-stack">
              <div className="grid-2">
                <Select 
                  label="Customer interested in Bryte AI?" 
                  required
                  options={YNU} 
                  registration={register('interestedInBryteAI', { required: 'Please select an option' })} 
                  error={errors.interestedInBryteAI?.message as string}
                />
                <Select 
                  label="Known data quality or integrity concerns?" 
                  required
                  options={YN} 
                  registration={register('dataQualityConcerns', { required: 'Please select an option' })} 
                  error={errors.dataQualityConcerns?.message as string}
                />
              </div>
              <TextArea label="Any AI functionality explored or piloted?" placeholder="Describe if applicable" registration={register('aiFunctionalityExplored')} />
              <TextArea label="How is reporting currently handled?" placeholder="e.g. native UKG reports, Excel exports, BI tool" registration={register('reportingHandled')} />
              <div className="grid-2">
                <Select 
                  label="Executive dashboards available?" 
                  required
                  options={YN} 
                  registration={register('executiveDashboards', { required: 'Please select an option' })} 
                  error={errors.executiveDashboards?.message as string}
                />
              </div>
              <TextArea label="If No, describe current executive reporting approach" registration={register('executiveDashboardAlt')} />
              <TextArea label="Compliance or data governance concerns" placeholder="Audit findings, compliance gaps, data sensitivity" registration={register('complianceConcerns')} />
            </div>
          )}

          {/* ── Section 9: Additional Info ── */}
          {currentStep === 9 && (
            <div className="form-stack">
              <TextArea label="Recent organizational changes?" placeholder="Mergers, acquisitions, leadership changes, restructuring" registration={register('recentChanges')} />
              <Select 
                label="Budget allocated for optimization work?" 
                required
                options={YNU} 
                registration={register('budgetAllocated', { required: 'Please select an option' })} 
                error={errors.budgetAllocated?.message as string}
              />
              <Select 
                label="Customer worked with Opallios before?" 
                required
                options={YN} 
                registration={register('workedWithOpallios', { required: 'Please select an option' })} 
                error={errors.workedWithOpallios?.message as string}
              />
              <TextArea label="Prior Opallios engagement details" placeholder="If Yes, describe prior engagement" registration={register('priorEngagement')} />
              <TextArea label="Political or relationship sensitivities?" placeholder="Stakeholder concerns, prior negative consultant experiences" registration={register('politicalSensitivities')} />
              <TextArea label="Recommended introduction approach" placeholder="e.g. executive briefing, working session, informal call" registration={register('introApproach')} />
              <FileUploader 
                submissionId={id!} 
                disabled={isCompleted} 
                onChange={(files) => setValue('attachments', files.map(f => f.filename).join(', '))} 
              />
            </div>
          )}
        </form>

        {/* Navigation */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: '2rem', paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <Button variant="ghost" onClick={goPrev} disabled={currentStep === 1}>
            ← Previous
          </Button>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Button variant="outline" size="sm" onClick={async () => { await save(formData, currentStep); navigate('/dashboard'); }}>
              Save & Exit
            </Button>
            {currentStep < SECTIONS.length ? (
              <Button onClick={goNext} isLoading={isSaving}>
                Next Section →
              </Button>
            ) : (
              <Button onClick={onSubmit} isLoading={isSaving}>
                ✓ Submit Final
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '1.5rem' }}>
        Opallios — UKG Ready Optimization & Advisory Services | info@opallios.com | 1-(888)-205-4058<br/>
        Confidential — For Opallios and authorized UKG CSM personnel only.
      </p>
    </div>
  );
};
