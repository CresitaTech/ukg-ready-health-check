import jsPDF from 'jspdf';

// ── Colour palette matching the Opallios template ──────────────────────────
const C = {
  headerBg:    [10,  37,  64]  as [number, number, number], // #0a2540 deep navy
  accentBg:    [0,   168, 120] as [number, number, number], // #00a878 green
  sectionBg:   [30,  41,  59]  as [number, number, number], // dark slate section bars
  subSectionBg:[241, 245, 249] as [number, number, number], // light grey sub-header
  white:       [255, 255, 255] as [number, number, number],
  black:       [15,  23,  42]  as [number, number, number],
  muted:       [71,  85,  105] as [number, number, number],
  border:      [203, 213, 225] as [number, number, number],
  fieldBg:     [248, 250, 252] as [number, number, number],
};

const PAGE_W  = 210; // A4 mm
const PAGE_H  = 297;
const MARGIN  = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ── Helper: safely render text, wrapping long values ──────────────────────
function formatDate(isoDate: string | undefined | null): string {
  if (!isoDate) return '—';
  // Check if it matches YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [y, m, d] = isoDate.split('-');
    return `${m}/${d}/${y}`;
  }
  return isoDate;
}

function val(raw: unknown, fallback = '—'): string {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const s = String(raw).trim() || fallback;
  return formatDate(s);
}

function boolVal(raw: unknown): string {
  if (raw === true || raw === 'true' || raw === '1') return 'Yes';
  if (raw === false || raw === 'false' || raw === '0') return 'No';
  return val(raw, '—');
}

// ── PDF class helper that tracks cursor Y and handles page breaks ──────────
class PdfBuilder {
  private doc: jsPDF;
  private y: number;
  private pageNum: number = 1;

  constructor() {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' });
    this.y = 0;
  }

  get currentY() { return this.y; }

  // Ensure there's at least `needed` mm left; add page otherwise
  private ensureSpace(needed: number) {
    if (this.y + needed > PAGE_H - 20) {
      this.addPage();
    }
  }

  private addPage() {
    this.doc.addPage();
    this.pageNum++;
    this.y = 20;
    this.pageFooter();
  }

  pageFooter() {
    const doc = this.doc;
    doc.setFillColor(...C.headerBg);
    doc.rect(0, PAGE_H - 12, PAGE_W, 12, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'OPALLIOS  |  UKG Ready Optimization & Advisory Services  |  info@opallios.com  |  1-(888)-205-4058',
      PAGE_W / 2, PAGE_H - 4.5, { align: 'center' }
    );
    doc.text(
      `Confidential — For Opallios and authorized UKG CSM personnel only   |   Page ${this.pageNum}`,
      PAGE_W / 2, PAGE_H - 1, { align: 'center' }
    );
  }

  // ── Page 1 header ──────────────────────────────────────────────────────
  header() {
    const doc = this.doc;

    // Navy top bar
    doc.setFillColor(...C.headerBg);
    doc.rect(0, 0, PAGE_W, 38, 'F');

    // Green accent left strip
    doc.setFillColor(...C.accentBg);
    doc.rect(0, 0, 5, 38, 'F');

    // OPALLIOS
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...C.white);
    doc.text('OPALLIOS', 12, 13);

    // Subtitle
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.accentBg);
    doc.text('UKG Ready Health Check', 12, 20);

    // Form title
    doc.setFontSize(8.5);
    doc.setTextColor(180, 200, 220);
    doc.text('CSM Customer Referral & Intake Form', 12, 27);
    doc.text('Confidential — For Opallios Internal Use Only', 12, 33);

    // Date stamp (right)
    doc.setFontSize(7.5);
    doc.setTextColor(160, 185, 210);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}`, PAGE_W - MARGIN, 27, { align: 'right' });

    this.y = 44;

    // Intro note
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    const intro = 'Complete this form before introducing Opallios to a referred customer. The quality of Health Check findings is directly proportional to the quality of information provided here.';
    const introLines = doc.splitTextToSize(intro, CONTENT_W);
    doc.text(introLines, MARGIN, this.y);
    this.y += introLines.length * 4.5 + 4;

    this.pageFooter();
  }

  // ── Section banner (dark bar) ─────────────────────────────────────────
  sectionBanner(num: number, title: string) {
    this.ensureSpace(14);
    const doc = this.doc;

    doc.setFillColor(...C.sectionBg);
    doc.rect(MARGIN - 2, this.y, CONTENT_W + 4, 9, 'F');

    // Accent left pip
    doc.setFillColor(...C.accentBg);
    doc.rect(MARGIN - 2, this.y, 3, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.white);
    doc.text(`SECTION ${num}  —  ${title.toUpperCase()}`, MARGIN + 4, this.y + 6);

    this.y += 12;
  }

  // ── Sub-section label (light grey bar) ───────────────────────────────
  subSection(title: string) {
    this.ensureSpace(9);
    const doc = this.doc;

    doc.setFillColor(...C.subSectionBg);
    doc.rect(MARGIN - 2, this.y, CONTENT_W + 4, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(title.toUpperCase(), MARGIN + 1, this.y + 5);

    this.y += 9;
  }

  // ── Single field row ─────────────────────────────────────────────────
  field(label: string, value: string, opts?: { wide?: boolean }) {
    const doc = this.doc;
    const labelW = opts?.wide ? CONTENT_W : CONTENT_W * 0.38;
    const valueW = opts?.wide ? CONTENT_W : CONTENT_W - labelW - 2;

    const valueLines  = doc.splitTextToSize(value, valueW - 4);
    const labelLines  = doc.splitTextToSize(label, labelW - 4);
    const lineH = 4.2;
    const rows  = Math.max(valueLines.length, labelLines.length);
    const rowH  = Math.max(rows * lineH + 5, 9);

    this.ensureSpace(rowH + 2);

    // Label cell
    doc.setFillColor(...C.fieldBg);
    doc.setDrawColor(...C.border);
    doc.rect(MARGIN - 2, this.y, labelW + 2, rowH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.black);
    doc.text(labelLines, MARGIN, this.y + 5, { maxWidth: labelW - 2 });

    if (!opts?.wide) {
      // Value cell
      doc.setFillColor(...C.white);
      doc.rect(MARGIN + labelW, this.y, valueW + 2, rowH, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(value === '—' ? 150 : 30, value === '—' ? 150 : 41, value === '—' ? 150 : 59);
      doc.text(valueLines, MARGIN + labelW + 3, this.y + 5, { maxWidth: valueW - 2 });
    } else {
      // Full-width value below label in same cell
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(value === '—' ? 150 : 30, value === '—' ? 150 : 41, value === '—' ? 150 : 59);
      doc.text(valueLines, MARGIN, this.y + 5 + labelLines.length * lineH + 1, { maxWidth: CONTENT_W - 4 });
    }

    this.y += rowH + 1;
  }

  // ── Two fields side by side ───────────────────────────────────────────
  fieldRow(pairs: [string, string][]) {
    const doc = this.doc;
    const colW = (CONTENT_W - (pairs.length - 1) * 2) / pairs.length;
    const labelW = colW * 0.42;
    const valueW = colW - labelW - 2;
    const lineH  = 4.2;

    let maxH = 9;
    pairs.forEach(([lbl, v]) => {
      const lLines = doc.splitTextToSize(lbl, labelW - 4);
      const vLines = doc.splitTextToSize(v, valueW - 4);
      const rows   = Math.max(lLines.length, vLines.length);
      maxH = Math.max(maxH, rows * lineH + 5);
    });

    this.ensureSpace(maxH + 2);

    pairs.forEach(([label, value], i) => {
      const xOff = MARGIN - 2 + i * (colW + 2);

      // Label
      doc.setFillColor(...C.fieldBg);
      doc.setDrawColor(...C.border);
      doc.rect(xOff, this.y, labelW + 2, maxH, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.black);
      doc.text(doc.splitTextToSize(label, labelW - 4), xOff + 2, this.y + 5, { maxWidth: labelW - 2 });

      // Value
      doc.setFillColor(...C.white);
      doc.rect(xOff + labelW + 2, this.y, valueW, maxH, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(value === '—' ? 150 : 30, value === '—' ? 150 : 41, value === '—' ? 150 : 59);
      doc.text(doc.splitTextToSize(value, valueW - 4), xOff + labelW + 4, this.y + 5, { maxWidth: valueW - 4 });
    });

    this.y += maxH + 1;
  }

  // ── Checkbox group display ─────────────────────────────────────────────
  checkboxGroup(groupLabel: string, modules: string[], checkedMap: Record<string, boolean>) {
    this.ensureSpace(30);
    const doc = this.doc;

    // Group label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
    doc.text(groupLabel.toUpperCase(), MARGIN, this.y + 4);
    this.y += 6;

    const colW = (CONTENT_W) / modules.length;
    modules.forEach((mod, i) => {
      const key = `module_${mod.replace(/ /g, '_')}`;
      const checked = checkedMap[key] === true || (checkedMap[key] as unknown) === 'true';
      const x = MARGIN - 2 + i * colW;

      // Module pill background
      if (checked) {
        doc.setFillColor(220, 247, 239);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
      doc.roundedRect(x, this.y, colW - 2, 9, 1.5, 1.5, 'FD');

      // Checkbox square
      if (checked) {
        doc.setFillColor(C.accentBg[0], C.accentBg[1], C.accentBg[2]);
        doc.setDrawColor(C.accentBg[0], C.accentBg[1], C.accentBg[2]);
        doc.rect(x + 2, this.y + 2, 5, 5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(255, 255, 255);
        doc.text('✓', x + 2.8, this.y + 6.2);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(C.accentBg[0], C.accentBg[1], C.accentBg[2]);
        doc.rect(x + 2, this.y + 2, 5, 5, 'D');
      }

      // Module label text
      doc.setFont('helvetica', checked ? 'bold' : 'normal');
      doc.setFontSize(7);
      if (checked) {
        doc.setTextColor(C.black[0], C.black[1], C.black[2]);
      } else {
        doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
      }
      const modLines = doc.splitTextToSize(mod, colW - 12);
      doc.text(modLines, x + 9, this.y + 5.5);
    });

    this.y += 11;
  }

  // ── Spacer ─────────────────────────────────────────────────────────────
  spacer(h = 4) { this.y += h; }

  save(filename: string) { this.doc.save(filename); }

  // Returns raw base64 string (no data URI prefix)
  outputBase64(): string {
    const dataUri = this.doc.output('datauristring');
    // Strip the "data:application/pdf;filename=generated.pdf;base64," prefix
    return dataUri.split(',')[1] ?? dataUri;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export: generateSubmissionPDF
// ─────────────────────────────────────────────────────────────────────────────
export function generateSubmissionPDF(submission: {
  id: number;
  customer_name: string;
  last_updated: string;
  form_data: string;
}) {
  const data: Record<string, unknown> = JSON.parse(submission.form_data || '{}');
  const pdf = new PdfBuilder();

  // ── Cover Page Header ───────────────────────────────────────────────────
  pdf.header();

  // ── SECTION 1: CSM & Referral Identification ───────────────────────────
  pdf.sectionBanner(1, 'CSM & Referral Identification');
  pdf.subSection('CSM Information');
  pdf.fieldRow([
    ['CSM Full Name', val(data.csmName)],
    ['CSM Email', val(data.csmEmail)],
  ]);
  pdf.fieldRow([
    ['CSM Region / Territory', val(data.csmRegion)],
    ['Referral Date', val(data.referralDate)],
  ]);
  pdf.field('Opallios Engagement Contact', val(data.opalliosContact));
  pdf.spacer();

  // ── SECTION 2: Customer Profile ────────────────────────────────────────
  pdf.sectionBanner(2, 'Customer Profile');
  pdf.subSection('Customer Identification');
  pdf.fieldRow([
    ['Customer / Company Name', val(data.customerName)],
    ['Industry / Vertical', val(data.industry)],
  ]);
  pdf.fieldRow([
    ['UKG Account ID', val(data.accountId)],
    ['Number of Active Employees', val(data.headcount)],
  ]);
  pdf.fieldRow([
    ['Number of EINs (Tax IDs)', val(data.eins)],
    ['Number of Locations / Sites', val(data.locations)],
  ]);
  pdf.field('Primary Customer Contact', val(data.primaryContact));
  pdf.field('Secondary Contact (if any)', val(data.secondaryContact));
  pdf.field('Geographic Distribution', val(data.geoDistribution));
  pdf.spacer();

  // ── SECTION 3: Health Check Trigger ────────────────────────────────────
  pdf.sectionBanner(3, 'Health Check Trigger / Categorization');
  const reasonMap: Record<string, string> = {
    churn: 'At Risk of Churn',
    low_adoption: 'Low Adoption / Low Engagement',
    poor_csat: 'Poor CSAT / NPS',
    renewal_uncertainty: 'Renewal Uncertainty',
  };
  pdf.field('Primary Reason for Health Check Referral', val(data.primaryReason ? reasonMap[data.primaryReason as string] || data.primaryReason : undefined));
  pdf.field('Brief Description of Concern', val(data.concernDescription));
  pdf.fieldRow([
    ['Has customer escalated / expressed churn intent?', boolVal(data.escalated)],
    ['Renewal Date (if known)', val(data.renewalDate)],
  ]);
  pdf.field('Escalation Context', val(data.escalationContext));
  pdf.field("CSM's Desired Outcome from Health Check", val(data.desiredOutcome));
  pdf.spacer();

  // ── SECTION 4: UKG Platform License & Usage ────────────────────────────
  pdf.sectionBanner(4, 'UKG Platform License & Usage');
  pdf.subSection('Licensed Modules — check all that apply');

  const checkedData = data as Record<string, boolean>;
  pdf.checkboxGroup('Group 1', ['Workforce Management', 'Payroll', 'Benefits Administration'], checkedData);
  pdf.checkboxGroup('Group 2', ['Core HR', 'Talent / Recruiting', 'Onboarding'], checkedData);
  pdf.checkboxGroup('Group 3', ['Performance Management', 'Learning Management (LMS)', 'Compensation'], checkedData);
  pdf.checkboxGroup('Group 4', ['UKG Ready Scheduler', 'Analytics / Reporting', 'UKG Bryte AI'], checkedData);
  pdf.field('Other Licensed Modules', val(data.otherLicensedModules));

  pdf.subSection('Actual Usage');
  pdf.field('Actively Implemented Modules', val(data.activeModules));
  pdf.field('Licensed But NOT Implemented', val(data.notImplemented));
  pdf.field('Modules with Low Adoption', val(data.lowAdoptionModules));
  pdf.field('Integration Points', val(data.integrations));
  pdf.spacer();

  // ── SECTION 5: Implementation & Configuration History ──────────────────
  pdf.sectionBanner(5, 'Implementation & Configuration History');
  pdf.subSection('Go-Live & Configuration History');
  pdf.fieldRow([
    ['Original Go-Live Date', val(data.goLiveDate)],
    ['Implementation Partner (original)', val(data.implementationPartner)],
  ]);
  pdf.field('Any subsequent re-implementations or major upgrades?', boolVal(data.subsequentUpgrades));
  pdf.field('If Yes — describe scope and date', val(data.upgradeScope));
  pdf.field('Significant configuration changes post go-live?', boolVal(data.configChanges));
  pdf.fieldRow([
    ['When were changes made?', val(data.configChangeDate)],
    ['Who made the changes?', val(data.configChangeWho)],
  ]);
  pdf.fieldRow([
    ['Is configuration change documented?', val(data.configDocumented)],
    ['Has PayCalc 2.0 been adopted?', val(data.payCalcAdoption)],
  ]);
  pdf.field('Has Accruals 2.0 been adopted?', val(data.accrualsAdoption));
  pdf.spacer();

  // ── SECTION 6: Operational & Administrative Model ──────────────────────
  pdf.sectionBanner(6, 'Operational & Administrative Model');
  pdf.subSection('How the Customer Manages Their UKG Environment');
  pdf.field('Who manages UKG day-to-day?', val(data.dayToDayManager));
  pdf.fieldRow([
    ['Number of UKG Admins / Super Users', val(data.numberOfAdmins)],
    ['Payroll audit frequency', val(data.payrollAuditFrequency)],
  ]);
  pdf.field('Formal change management process for UKG?', val(data.changeManagementProcess));
  pdf.field('How is payroll validated before finalization?', val(data.payrollValidation));
  pdf.field('How are timecards reviewed and approved?', val(data.timecardReview));
  pdf.field('How is accrual management handled?', val(data.accrualManagement));
  pdf.field('Known recurring operational pain points', val(data.painPoints));
  pdf.field('Reliance on specific individuals?', boolVal(data.individualReliance));
  pdf.spacer();

  // ── SECTION 7: Support Ticket History ─────────────────────────────────
  pdf.sectionBanner(7, 'Support Ticket History (Last 6 Months)');
  pdf.subSection('Support Ticket Summary');
  pdf.fieldRow([
    ['Total Tickets (Last 6 Months)', val(data.totalTickets)],
    ['Average Ticket Resolution Time', val(data.resolutionTime)],
  ]);
  pdf.field('Top 3 Ticket Categories / Themes', val(data.ticketCategories));
  pdf.fieldRow([
    ['Open / unresolved critical tickets?', boolVal(data.openCriticalTickets)],
    ['Any escalations to UKG leadership?', boolVal(data.escalationsToLeadership)],
  ]);
  pdf.field('Recurring ticket patterns', val(data.ticketPatterns));
  pdf.field('Ticket Details / Additional Context', val(data.ticketDetails));
  pdf.spacer();

  // ── SECTION 8: AI & Analytics Readiness ───────────────────────────────
  pdf.sectionBanner(8, 'AI & Analytics Readiness');
  pdf.subSection('UKG Bryte AI / Analytics Readiness');
  pdf.fieldRow([
    ['Customer interested in Bryte AI?', val(data.interestedInBryteAI)],
    ['Known data quality / integrity concerns?', boolVal(data.dataQualityConcerns)],
  ]);
  pdf.field('Any AI functionality explored or piloted?', val(data.aiFunctionalityExplored));
  pdf.field('How is reporting currently handled?', val(data.reportingHandled));
  pdf.fieldRow([
    ['Executive dashboards available?', boolVal(data.executiveDashboards)],
  ]);
  pdf.field('If No — describe current executive reporting approach', val(data.executiveDashboardAlt));
  pdf.field('Compliance or data governance concerns', val(data.complianceConcerns));
  pdf.spacer();

  // ── SECTION 9: Additional Context & Attachments ────────────────────────
  pdf.sectionBanner(9, 'Additional Context & Attachments');
  pdf.subSection('Additional Information');
  pdf.field('Recent organizational changes?', val(data.recentChanges));
  pdf.fieldRow([
    ['Budget allocated for optimization work?', val(data.budgetAllocated)],
    ['Customer worked with Opallios before?', boolVal(data.workedWithOpallios)],
  ]);
  pdf.field('Prior Opallios engagement details', val(data.priorEngagement));
  pdf.field('Political or relationship sensitivities?', val(data.politicalSensitivities));
  pdf.field('Recommended introduction approach', val(data.introApproach));
  pdf.field('Attachments Provided', val(data.attachments));

  // ── Save PDF ────────────────────────────────────────────────────────────
  const safeName = (submission.customer_name || 'Referral').replace(/[^a-z0-9]/gi, '_');
  pdf.save(`Opallios_HealthCheck_${safeName}_${submission.id}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Secondary export: returns base64 string for email attachment
// ─────────────────────────────────────────────────────────────────────────────
export function generateSubmissionPDFBase64(submission: {
  id: number;
  customer_name: string;
  last_updated: string;
  form_data: string;
}): string {
  const data: Record<string, unknown> = JSON.parse(submission.form_data || '{}');
  const pdf = new PdfBuilder();

  pdf.header();
  pdf.sectionBanner(1, 'CSM & Referral Identification');
  pdf.subSection('CSM Information');
  pdf.fieldRow([['CSM Full Name', val(data.csmName)], ['CSM Email', val(data.csmEmail)]]);
  pdf.fieldRow([['CSM Region / Territory', val(data.csmRegion)], ['Referral Date', val(data.referralDate)]]);
  pdf.field('Opallios Engagement Contact', val(data.opalliosContact));
  pdf.spacer();

  pdf.sectionBanner(2, 'Customer Profile');
  pdf.subSection('Customer Identification');
  pdf.fieldRow([['Customer / Company Name', val(data.customerName)], ['Industry / Vertical', val(data.industry)]]);
  pdf.fieldRow([['UKG Account ID', val(data.accountId)], ['Number of Active Employees', val(data.headcount)]]);
  pdf.fieldRow([['Number of EINs (Tax IDs)', val(data.eins)], ['Number of Locations / Sites', val(data.locations)]]);
  pdf.field('Primary Customer Contact', val(data.primaryContact));
  pdf.field('Secondary Contact (if any)', val(data.secondaryContact));
  pdf.field('Geographic Distribution', val(data.geoDistribution));
  pdf.spacer();

  pdf.sectionBanner(3, 'Health Check Trigger / Categorization');
  const reasonMap: Record<string, string> = { churn: 'At Risk of Churn', low_adoption: 'Low Adoption / Low Engagement', poor_csat: 'Poor CSAT / NPS', renewal_uncertainty: 'Renewal Uncertainty' };
  pdf.field('Primary Reason for Health Check Referral', val(data.primaryReason ? reasonMap[data.primaryReason as string] || data.primaryReason : undefined));
  pdf.field('Brief Description of Concern', val(data.concernDescription));
  pdf.fieldRow([['Has customer escalated / expressed churn intent?', boolVal(data.escalated)], ['Renewal Date (if known)', val(data.renewalDate)]]);
  pdf.field('Escalation Context', val(data.escalationContext));
  pdf.field("CSM's Desired Outcome from Health Check", val(data.desiredOutcome));
  pdf.spacer();

  pdf.sectionBanner(4, 'UKG Platform License & Usage');
  pdf.subSection('Licensed Modules — check all that apply');
  const checkedData = data as Record<string, boolean>;
  pdf.checkboxGroup('Group 1', ['Workforce Management', 'Payroll', 'Benefits Administration'], checkedData);
  pdf.checkboxGroup('Group 2', ['Core HR', 'Talent / Recruiting', 'Onboarding'], checkedData);
  pdf.checkboxGroup('Group 3', ['Performance Management', 'Learning Management (LMS)', 'Compensation'], checkedData);
  pdf.checkboxGroup('Group 4', ['UKG Ready Scheduler', 'Analytics / Reporting', 'UKG Bryte AI'], checkedData);
  pdf.field('Other Licensed Modules', val(data.otherLicensedModules));
  pdf.subSection('Actual Usage');
  pdf.field('Actively Implemented Modules', val(data.activeModules));
  pdf.field('Licensed But NOT Implemented', val(data.notImplemented));
  pdf.field('Modules with Low Adoption', val(data.lowAdoptionModules));
  pdf.field('Integration Points', val(data.integrations));
  pdf.spacer();

  pdf.sectionBanner(5, 'Implementation & Configuration History');
  pdf.subSection('Go-Live & Configuration History');
  pdf.fieldRow([['Original Go-Live Date', val(data.goLiveDate)], ['Implementation Partner (original)', val(data.implementationPartner)]]);
  pdf.field('Any subsequent re-implementations or major upgrades?', boolVal(data.subsequentUpgrades));
  pdf.field('If Yes — describe scope and date', val(data.upgradeScope));
  pdf.field('Significant configuration changes post go-live?', boolVal(data.configChanges));
  pdf.fieldRow([['When were changes made?', val(data.configChangeDate)], ['Who made the changes?', val(data.configChangeWho)]]);
  pdf.fieldRow([['Is configuration change documented?', val(data.configDocumented)], ['Has PayCalc 2.0 been adopted?', val(data.payCalcAdoption)]]);
  pdf.field('Has Accruals 2.0 been adopted?', val(data.accrualsAdoption));
  pdf.spacer();

  pdf.sectionBanner(6, 'Operational & Administrative Model');
  pdf.subSection('How the Customer Manages Their UKG Environment');
  pdf.field('Who manages UKG day-to-day?', val(data.dayToDayManager));
  pdf.fieldRow([['Number of UKG Admins / Super Users', val(data.numberOfAdmins)], ['Payroll audit frequency', val(data.payrollAuditFrequency)]]);
  pdf.field('Formal change management process for UKG?', val(data.changeManagementProcess));
  pdf.field('How is payroll validated before finalization?', val(data.payrollValidation));
  pdf.field('How are timecards reviewed and approved?', val(data.timecardReview));
  pdf.field('How is accrual management handled?', val(data.accrualManagement));
  pdf.field('Known recurring operational pain points', val(data.painPoints));
  pdf.field('Reliance on specific individuals?', boolVal(data.individualReliance));
  pdf.spacer();

  pdf.sectionBanner(7, 'Support Ticket History (Last 6 Months)');
  pdf.subSection('Support Ticket Summary');
  pdf.fieldRow([['Total Tickets (Last 6 Months)', val(data.totalTickets)], ['Average Ticket Resolution Time', val(data.resolutionTime)]]);
  pdf.field('Top 3 Ticket Categories / Themes', val(data.ticketCategories));
  pdf.fieldRow([['Open / unresolved critical tickets?', boolVal(data.openCriticalTickets)], ['Any escalations to UKG leadership?', boolVal(data.escalationsToLeadership)]]);
  pdf.field('Recurring ticket patterns', val(data.ticketPatterns));
  pdf.field('Ticket Details / Additional Context', val(data.ticketDetails));
  pdf.spacer();

  pdf.sectionBanner(8, 'AI & Analytics Readiness');
  pdf.subSection('UKG Bryte AI / Analytics Readiness');
  pdf.fieldRow([['Customer interested in Bryte AI?', val(data.interestedInBryteAI)], ['Known data quality / integrity concerns?', boolVal(data.dataQualityConcerns)]]);
  pdf.field('Any AI functionality explored or piloted?', val(data.aiFunctionalityExplored));
  pdf.field('How is reporting currently handled?', val(data.reportingHandled));
  pdf.fieldRow([['Executive dashboards available?', boolVal(data.executiveDashboards)]]);
  pdf.field('If No — describe current executive reporting approach', val(data.executiveDashboardAlt));
  pdf.field('Compliance or data governance concerns', val(data.complianceConcerns));
  pdf.spacer();

  pdf.sectionBanner(9, 'Additional Context & Attachments');
  pdf.subSection('Additional Information');
  pdf.field('Recent organizational changes?', val(data.recentChanges));
  pdf.fieldRow([['Budget allocated for optimization work?', val(data.budgetAllocated)], ['Customer worked with Opallios before?', boolVal(data.workedWithOpallios)]]);
  pdf.field('Prior Opallios engagement details', val(data.priorEngagement));
  pdf.field('Political or relationship sensitivities?', val(data.politicalSensitivities));
  pdf.field('Recommended introduction approach', val(data.introApproach));
  pdf.field('Attachments Provided', val(data.attachments));

  // Return the raw base64 string (strip the data URI prefix)
  return pdf.outputBase64();
}

