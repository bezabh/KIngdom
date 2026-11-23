import { jsPDF } from 'jspdf';
import { WeeklySummaryData, UserProfile } from '../types';

export function generateWeeklySummaryPdfReport(
  data: WeeklySummaryData,
  user?: Partial<UserProfile>
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186 mm

  // =========================================================================
  // PAGE 1: HEADER, EXECUTIVE KPIS, RECENT ACTIVITY & LEARNED TOPICS
  // =========================================================================

  // Top Dark Gold Header Bar
  doc.setFillColor(14, 11, 22);
  doc.rect(0, 0, pageWidth, 36, 'F');

  // Gold Accent Divider Line
  doc.setFillColor(197, 160, 89);
  doc.rect(0, 36, pageWidth, 2, 'F');

  // Document Title
  doc.setTextColor(243, 229, 171);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('AXUMITE SOVEREIGN AI • WEEKLY PERFORMANCE & SAVINGS REPORT', margin, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 195, 215);
  doc.text('Personalized Learning Velocity, Activity Audit & Economic Savings Ledger', margin, 21);

  // User & Window Meta Info
  doc.setFontSize(8);
  doc.setTextColor(197, 160, 89);
  const userName = user?.name || 'Valued Axumite Scholar';
  const userEmail = user?.email || 'scholar@axumite.ai';
  const plan = user?.role === 'Admin' || user?.role === 'Creator' ? 'Executive Admin' : 'Sovereign Pro Member';
  doc.text(`Learner: ${userName} (${userEmail}) | Plan: ${plan}`, margin, 28);
  doc.text(`Period: ${data.periodLabel} (${data.startDate} – ${data.endDate}) | Issued: ${new Date().toLocaleDateString('en-US')}`, margin, 33);

  // -------------------------------------------------------------------------
  // KPI SUMMARY CARDS (4 Columns)
  // -------------------------------------------------------------------------
  const kpiY = 42;
  const cardWidth = (contentWidth - 9) / 4; // ~44.25mm
  const cardHeight = 22;

  const kpis = [
    {
      title: 'Active Study Time',
      value: `${data.totalStudyHours} Hours`,
      sub: `${data.completedTasks} tasks completed`,
    },
    {
      title: 'Learned Topics',
      value: `${data.topicsLearnedCount} Topics`,
      sub: `${data.accuracyRate}% mastery score`,
    },
    {
      title: 'Economic Savings',
      value: `$${data.totalSavingsUSD.toFixed(2)} USD`,
      sub: 'Platform cost offset',
    },
    {
      title: 'Active Streak',
      value: `${data.streakDays} Days`,
      sub: `+$${data.tokenMiningEarningsUSD.toFixed(2)} mining`,
    },
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = margin + idx * (cardWidth + 3);
    doc.setFillColor(248, 245, 238);
    doc.setDrawColor(197, 160, 89);
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, kpiY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(125, 95, 30);
    doc.text(kpi.title.toUpperCase(), cardX + 3, kpiY + 5.5);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(18, 14, 28);
    doc.text(kpi.value, cardX + 3, kpiY + 13);

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 85, 100);
    doc.text(kpi.sub, cardX + 3, kpiY + 18.5);
  });

  let currentY = 70;

  // -------------------------------------------------------------------------
  // SECTION 1: RECENT USER ACTIVITY & ENGAGEMENTS
  // -------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(18, 14, 28);
  doc.text('1. RECENT USER ACTIVITY & MULTI-MODAL ENGAGEMENTS', margin, currentY);

  doc.setDrawColor(197, 160, 89);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);

  currentY += 7;

  // Activity Table Header
  const actColWidths = [28, 48, 68, 24, 18];
  const actHeaders = ['Date / Time', 'Service / Module', 'Activity Description', 'Time / Volume', 'Status'];

  doc.setFillColor(18, 14, 28);
  doc.rect(margin, currentY, contentWidth, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(243, 229, 171);

  let actX = margin + 2;
  actHeaders.forEach((h, i) => {
    doc.text(h, actX, currentY + 4.5);
    actX += actColWidths[i];
  });

  currentY += 6.5;

  data.recentActivities.slice(0, 5).forEach((act, rowIdx) => {
    doc.setFillColor(rowIdx % 2 === 0 ? 252 : 246, rowIdx % 2 === 0 ? 250 : 244, rowIdx % 2 === 0 ? 245 : 238);
    doc.rect(margin, currentY, contentWidth, 6, 'F');

    doc.setDrawColor(230, 225, 215);
    doc.setLineWidth(0.1);
    doc.line(margin, currentY + 6, pageWidth - margin, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(40, 40, 50);

    let rowX = margin + 2;
    doc.text(act.date, rowX, currentY + 4.2);
    rowX += actColWidths[0];

    doc.setFont('helvetica', 'bold');
    doc.text(act.category.toUpperCase().replace('_', ' '), rowX, currentY + 4.2);
    doc.setFont('helvetica', 'normal');
    rowX += actColWidths[1];

    const truncatedTitle = act.title.length > 42 ? act.title.substring(0, 40) + '...' : act.title;
    doc.text(truncatedTitle, rowX, currentY + 4.2);
    rowX += actColWidths[2];

    doc.text(act.durationOrCount, rowX, currentY + 4.2);
    rowX += actColWidths[3];

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52); // green
    doc.text(act.status, rowX, currentY + 4.2);
    doc.setTextColor(40, 40, 50);

    currentY += 6;
  });

  currentY += 8;

  // -------------------------------------------------------------------------
  // SECTION 2: LEARNED TOPICS & ACADEMIC MASTERY
  // -------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(18, 14, 28);
  doc.text('2. LEARNED TOPICS & COMPETENCY MASTERY', margin, currentY);

  doc.setDrawColor(197, 160, 89);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);

  currentY += 7;

  // Learned Topics Table Header
  const topicColWidths = [42, 38, 22, 22, 62];
  const topicHeaders = ['Topic / Subject', 'Academic Field', 'Study Hours', 'Mastery Score', 'Key Concept & Competency Gained'];

  doc.setFillColor(18, 14, 28);
  doc.rect(margin, currentY, contentWidth, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(243, 229, 171);

  let topX = margin + 2;
  topicHeaders.forEach((h, i) => {
    doc.text(h, topX, currentY + 4.5);
    topX += topicColWidths[i];
  });

  currentY += 6.5;

  data.learnedTopics.forEach((topic, rowIdx) => {
    doc.setFillColor(rowIdx % 2 === 0 ? 252 : 246, rowIdx % 2 === 0 ? 250 : 244, rowIdx % 2 === 0 ? 245 : 238);
    doc.rect(margin, currentY, contentWidth, 6.5, 'F');

    doc.setDrawColor(230, 225, 215);
    doc.setLineWidth(0.1);
    doc.line(margin, currentY + 6.5, pageWidth - margin, currentY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(20, 15, 30);

    let rowX = margin + 2;
    doc.text(topic.topicName.length > 25 ? topic.topicName.substring(0, 23) + '..' : topic.topicName, rowX, currentY + 4.5);
    rowX += topicColWidths[0];

    doc.setFont('helvetica', 'normal');
    doc.text(topic.field, rowX, currentY + 4.5);
    rowX += topicColWidths[1];

    doc.text(`${topic.hoursSpent} hrs`, rowX, currentY + 4.5);
    rowX += topicColWidths[2];

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(125, 95, 30);
    doc.text(`${topic.masteryScore}%`, rowX, currentY + 4.5);
    doc.setTextColor(40, 40, 50);
    rowX += topicColWidths[3];

    doc.setFont('helvetica', 'normal');
    const truncatedKey = topic.keyTakeaway.length > 44 ? topic.keyTakeaway.substring(0, 42) + '...' : topic.keyTakeaway;
    doc.text(truncatedKey, rowX, currentY + 4.5);

    currentY += 6.5;
  });

  currentY += 8;

  // -------------------------------------------------------------------------
  // SECTION 3: ECONOMIC VALUE & SAVINGS BREAKDOWN
  // -------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(18, 14, 28);
  doc.text('3. VALUE DELIVERED & PERSONAL SAVINGS LEDGER', margin, currentY);

  doc.setDrawColor(197, 160, 89);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);

  currentY += 7;

  // Savings Table Header
  const saveColWidths = [45, 90, 26, 25];
  const saveHeaders = ['Savings Category', 'Benefit & Service Description', 'Market Equiv.', 'Net Savings'];

  doc.setFillColor(18, 14, 28);
  doc.rect(margin, currentY, contentWidth, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(243, 229, 171);

  let saveX = margin + 2;
  saveHeaders.forEach((h, i) => {
    doc.text(h, saveX, currentY + 4.5);
    saveX += saveColWidths[i];
  });

  currentY += 6.5;

  data.savingsBreakdown.forEach((item, rowIdx) => {
    doc.setFillColor(rowIdx % 2 === 0 ? 252 : 246, rowIdx % 2 === 0 ? 250 : 244, rowIdx % 2 === 0 ? 245 : 238);
    doc.rect(margin, currentY, contentWidth, 6.5, 'F');

    doc.setDrawColor(230, 225, 215);
    doc.setLineWidth(0.1);
    doc.line(margin, currentY + 6.5, pageWidth - margin, currentY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(20, 15, 30);

    let rowX = margin + 2;
    doc.text(item.category, rowX, currentY + 4.5);
    rowX += saveColWidths[0];

    doc.setFont('helvetica', 'normal');
    const desc = item.description.length > 56 ? item.description.substring(0, 54) + '...' : item.description;
    doc.text(desc, rowX, currentY + 4.5);
    rowX += saveColWidths[1];

    doc.text(`$${(item.savingsUSD * 1.25).toFixed(2)}`, rowX, currentY + 4.5);
    rowX += saveColWidths[2];

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52); // green
    doc.text(`+$${item.savingsUSD.toFixed(2)} USD`, rowX, currentY + 4.5);
    doc.setTextColor(40, 40, 50);

    currentY += 6.5;
  });

  // Total Savings Banner
  doc.setFillColor(243, 238, 225);
  doc.rect(margin, currentY, contentWidth, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(18, 14, 28);
  doc.text('TOTAL ESTIMATED WEEKLY ECONOMIC VALUE & SAVINGS:', margin + 4, currentY + 5);
  doc.setFontSize(9);
  doc.setTextColor(125, 95, 30);
  doc.text(`$${data.totalSavingsUSD.toFixed(2)} USD`, pageWidth - margin - 32, currentY + 5);

  currentY += 13;

  // -------------------------------------------------------------------------
  // SECTION 4: AI SOCRATIC TUTOR ASSESSMENT & ROADMAP
  // -------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(18, 14, 28);
  doc.text('4. AI SOCRATIC LEARNING ASSESSMENT & NEXT WEEK GOALS', margin, currentY);

  doc.setDrawColor(197, 160, 89);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);

  currentY += 7;

  // Insight box
  doc.setFillColor(248, 245, 238);
  doc.setDrawColor(197, 160, 89);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, 24, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(125, 95, 30);
  doc.text('WEEKLY SOCRATIC TUTOR EVALUATION:', margin + 3, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(50, 45, 60);
  const splitSummary = doc.splitTextToSize(data.aiSocraticInsight.summaryEn, contentWidth - 8);
  doc.text(splitSummary, margin + 3, currentY + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(18, 14, 28);
  doc.text('RECOMMENDED NEXT WEEK TARGETS:', margin + 3, currentY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(50, 45, 60);
  const splitGoal = doc.splitTextToSize(data.aiSocraticInsight.nextWeekGoalEn, contentWidth - 8);
  doc.text(splitGoal, margin + 3, currentY + 21);

  // -------------------------------------------------------------------------
  // PAGE FOOTER & OFFICIAL VERIFICATION STAMP
  // -------------------------------------------------------------------------
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 130);
  doc.text('Axumite Sovereign AI • Automated Weekly Performance & Financial Digest', margin, pageHeight - 8);
  doc.text('Official Encrypted Verification Record • Confidential', pageWidth - margin, pageHeight - 8, { align: 'right' });

  // Save the PDF
  const filename = `Axumite_AI_Weekly_Summary_${data.startDate.replace(/[^a-zA-Z0-9]/g, '_')}_to_${data.endDate.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}
