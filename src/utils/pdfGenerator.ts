import { jsPDF } from 'jspdf';
import {
  PositionResult,
  VoterTurnoutStats,
  ElectionSettings,
  ExhibitProject,
  ExhibitVote,
  ExhibitSettings,
} from '../types';

export const generateElectionPDF = (
  positionResults: PositionResult[],
  turnoutStats: VoterTurnoutStats | null,
  settings: ElectionSettings,
  lastUpdated: string
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 15;

  // Primary Theme Colors (Deep Navy, Cyan Accent, Slate Neutral)
  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const cyanColor: [number, number, number] = [6, 182, 212];   // Cyan 500
  const darkGray: [number, number, number] = [51, 65, 85];     // Slate 700
  const lightBg: [number, number, number] = [241, 245, 249];   // Slate 100

  // Draw Page Top Banner
  const drawPageHeader = (isFirstPage: boolean) => {
    doc.setFillColor(...primaryColor);
    if (isFirstPage) {
      doc.rect(0, 0, pageWidth, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('COMPUTER ENGINEERING STUDENT GOVERNMENT (CPESG)', pageWidth / 2, 11, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(...cyanColor);
      doc.text('OFFICIAL ELECTION TALLY & RESULTS CERTIFICATE 2026', pageWidth / 2, 17, { align: 'center' });

      doc.setFontSize(7.5);
      doc.setTextColor(203, 213, 225);
      doc.setFont('helvetica', 'normal');
      const timestampStr = new Date(lastUpdated || Date.now()).toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'medium',
      });
      doc.text(`Official System Timestamp: ${timestampStr} | Status: ${settings.status.toUpperCase()}`, pageWidth / 2, 23, { align: 'center' });
    } else {
      doc.rect(0, 0, pageWidth, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('CPESG ELECTION 2026 — OFFICIAL TALLY CERTIFICATE (CONTINUED)', pageWidth / 2, 8, { align: 'center' });
    }
  };

  const checkPageBreak = (neededHeight: number): boolean => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      drawPageHeader(false);
      y = 18;
      return true;
    }
    return false;
  };

  // Helper to draw position table header
  const drawTableHeader = (posTitle: string, posCategory: string, totalVotesForPos: number, posIndex: number) => {
    // Position Header Sub-bar
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, pageWidth - margin * 2, 7, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...primaryColor);
    doc.text(`${posIndex + 1}. ${posTitle.toUpperCase()} (${posCategory})`, margin + 3, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total Ballots for Position: ${totalVotesForPos}`, pageWidth - margin - 3, y + 5, { align: 'right' });

    y += 9;

    // Table Column Headers
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...darkGray);

    doc.text('CANDIDATE NAME', margin + 4, y + 4);
    doc.text('PARTY / ALLIANCE', margin + 75, y + 4);
    doc.text('VOTES', margin + 135, y + 4);
    doc.text('STATUS', margin + 160, y + 4);

    y += 6;
  };

  // 1. First Page Header
  drawPageHeader(true);
  y = 35;

  // 2. Turnout Summary Box
  doc.setFillColor(...lightBg);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 26, 3, 3, 'FD');

  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ELECTION TURNOUT SUMMARY', margin + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...darkGray);

  const totalVoted = turnoutStats?.totalVoted || 0;
  const totalReg = turnoutStats?.totalRegistered || 0;

  doc.text(`Total Actual Voters: ${totalVoted}`, margin + 5, y + 13);
  doc.text(`Total Registered Voters: ${totalReg}`, margin + 90, y + 13);

  // Year level voted count
  if (turnoutStats?.byYearLevel) {
    const yrStr = turnoutStats.byYearLevel.map(yl => `${yl.yearLevel}: ${yl.voted}`).join('   |   ');
    doc.setFontSize(8);
    doc.text(`Voted per Year Level:   ${yrStr}`, margin + 5, y + 20);
  }

  y += 33;

  // Section Header: Position Standings
  doc.setFillColor(...primaryColor);
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('OFFICIAL CANDIDATE TALLY BY POSITION', margin + 4, y + 5);

  y += 11;

  // Sort Position Results by Order
  const sortedPositionResults = [...positionResults].sort(
    (a, b) => (a.position?.order || 0) - (b.position?.order || 0)
  );

  // Loop through Position Results (Governor, Vice-Governor, Secretary, Treasurer, Auditor, PIO, Muse)
  sortedPositionResults.forEach((pr, index) => {
    const tableHeaderHeight = 15;
    const rowHeight = 7;
    const candidatesCount = Math.max(1, pr.candidates.length) + (pr.abstainCount > 0 ? 1 : 0);
    const totalPosBlockHeight = tableHeaderHeight + (candidatesCount * rowHeight) + 6;

    // Check if whole block or header fits, else break page
    checkPageBreak(Math.min(totalPosBlockHeight, 35));

    // Draw position header & table column titles
    drawTableHeader(pr.position.title, pr.position.category, pr.totalVotesCast, index);

    const colCandidate = margin + 4;
    const colParty = margin + 75;
    const colVotes = margin + 135;
    const colStatus = margin + 160;

    // If no candidates registered for position
    if (pr.candidates.length === 0) {
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('No registered candidates for this position', colCandidate, y + 4.8);
      doc.text('-', colParty, y + 4.8);
      doc.text('0', colVotes, y + 4.8);
      doc.text('-', colStatus + 5, y + 4.8);
      y += rowHeight;
    } else {
      // Candidate Rows
      pr.candidates.forEach((cand, cIdx) => {
        const didBreak = checkPageBreak(rowHeight + 2);
        if (didBreak) {
          // Re-draw table header on top of new page for readability
          drawTableHeader(pr.position.title, pr.position.category, pr.totalVotesCast, index);
        }

        const isEven = cIdx % 2 === 0;
        doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
        doc.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F');

        doc.setFont('helvetica', cand.isLeading ? 'bold' : 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...(cand.isLeading ? primaryColor : darkGray));

        doc.text(cand.name, colCandidate, y + 4.8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(cand.party, colParty, y + 4.8);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(cand.votes.toString(), colVotes, y + 4.8);

        if (cand.isLeading && cand.votes > 0) {
          doc.setFillColor(220, 252, 231); // Soft Green
          doc.setDrawColor(134, 239, 172);
          doc.roundedRect(colStatus - 1, y + 1, 18, 5, 1, 1, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(22, 101, 52);
          doc.text('WINNER / LEAD', colStatus + 1, y + 4.3);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text('-', colStatus + 5, y + 4.5);
        }

        y += rowHeight;
      });
    }

    // Abstain row if non-zero
    if (pr.abstainCount > 0) {
      const didBreak = checkPageBreak(rowHeight + 2);
      if (didBreak) {
        drawTableHeader(pr.position.title, pr.position.category, pr.totalVotesCast, index);
      }
      doc.setFillColor(254, 243, 199); // Light Amber
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F');

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(180, 83, 9);
      doc.text('Abstain Ballots', colCandidate, y + 4.8);
      doc.text('Neutral / Non-vote', colParty, y + 4.8);
      doc.text(pr.abstainCount.toString(), colVotes, y + 4.8);
      doc.text('-', colStatus + 5, y + 4.8);

      y += rowHeight;
    }

    y += 5; // Spacing after position block
  });

  // Check overflow for Signatures & Audit Certification Block
  checkPageBreak(42);

  y += 5;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  y += 8;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Official automated vote tally by CPESG COMELEC.', margin, y);
  doc.text(`Verification Code: CPESG-2026-CERT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`, pageWidth - margin, y, { align: 'right' });

  y += 14;

  // Signature Lines
  const sigColWidth = (pageWidth - margin * 2) / 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);

  // Sig 1
  doc.line(margin + 5, y, margin + sigColWidth - 10, y);
  doc.text('COMELEC Chair', margin + (sigColWidth / 2) - 5, y + 4, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CPE Electoral Commission', margin + (sigColWidth / 2) - 5, y + 8, { align: 'center' });

  // Sig 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.line(margin + sigColWidth + 5, y, margin + sigColWidth * 2 - 10, y);
  doc.text('CPESG Student President', margin + sigColWidth + (sigColWidth / 2) - 5, y + 4, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Student Council Representative', margin + sigColWidth + (sigColWidth / 2) - 5, y + 8, { align: 'center' });

  // Sig 3
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.line(margin + sigColWidth * 2 + 5, y, pageWidth - margin - 5, y);
  doc.text('Department Chairperson', margin + sigColWidth * 2 + (sigColWidth / 2) - 5, y + 4, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Computer Engineering Dept.', margin + sigColWidth * 2 + (sigColWidth / 2) - 5, y + 8, { align: 'center' });

  // Save the generated PDF
  doc.save(`CPESG_Election_Results_2026_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const generateExhibitPDF = (
  exhibitProjects: ExhibitProject[],
  exhibitVotes: ExhibitVote[],
  exhibitSettings: ExhibitSettings | undefined,
  lastUpdated: string
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 15;

  const primaryColor: [number, number, number] = [15, 23, 42];
  const roseColor: [number, number, number] = [190, 18, 60];
  const darkGray: [number, number, number] = [51, 65, 85];
  const lightBg: [number, number, number] = [241, 245, 249];

  const validVotes = exhibitVotes.filter((v) => !v.isInvalidated);
  const totalVotes = validVotes.length;
  const counts: Record<string, number> = {};
  exhibitProjects.forEach((p) => (counts[p.id] = 0));
  validVotes.forEach((v) => {
    if (counts[v.projectId] !== undefined) counts[v.projectId]++;
  });

  const ranked = [...exhibitProjects]
    .map((p) => {
      const votes = counts[p.id] || 0;
      const percentage = totalVotes > 0 ? parseFloat(((votes / totalVotes) * 100).toFixed(1)) : 0;
      return { ...p, votes, percentage };
    })
    .sort((a, b) => b.votes - a.votes || a.title.localeCompare(b.title));

  const maxVotes = ranked.length > 0 ? ranked[0].votes : 0;

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('COMPUTER ENGINEERING DEPARTMENT — PROJECT EXHIBIT 2026', pageWidth / 2, 11, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(251, 113, 133);
  doc.text("OFFICIAL PEOPLE'S CHOICE EXHIBIT LIVE RESULTS", pageWidth / 2, 17, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  const timestampStr = new Date(lastUpdated || Date.now()).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });
  const statusLabel = exhibitSettings?.isOpen ? 'OPEN' : 'CLOSED';
  doc.text(`Official Timestamp: ${timestampStr} | Exhibit Status: ${statusLabel}`, pageWidth / 2, 23, { align: 'center' });

  y = 35;

  // Summary Box
  doc.setFillColor(...lightBg);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 24, 3, 3, 'FD');

  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PROJECT EXHIBIT VOTING SUMMARY', margin + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...darkGray);
  doc.text(`Total Valid Exhibit Votes: ${totalVotes}`, margin + 5, y + 13);
  doc.text(`Participating Projects: ${exhibitProjects.length}`, margin + 90, y + 13);

  const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const yrSummary = yearLevels
    .map((yl) => `${yl}: ${validVotes.filter((v) => v.yearLevel === yl).length}`)
    .join('   |   ');
  doc.setFontSize(8);
  doc.text(`Votes by Year Level:   ${yrSummary}`, margin + 5, y + 20);

  y += 31;

  // Table Section Header
  doc.setFillColor(...roseColor);
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RANKED PROJECT EXHIBIT STANDINGS', margin + 4, y + 5);
  y += 10;

  // Table Column Headers
  const drawCols = () => {
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...darkGray);
    doc.text('RANK', margin + 3, y + 4);
    doc.text('PROJECT TITLE', margin + 17, y + 4);
    doc.text('TEAM NAME', margin + 98, y + 4);
    doc.text('VOTES', margin + 145, y + 4);
    doc.text('SHARE', margin + 165, y + 4);
    y += 6;
  };

  drawCols();

  if (ranked.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No project exhibits registered.', margin + 4, y + 6);
    y += 10;
  } else {
    ranked.forEach((proj, idx) => {
      if (y + 9 > pageHeight - 25) {
        doc.addPage();
        y = 18;
        drawCols();
      }
      const isEven = idx % 2 === 0;
      const isLeader = maxVotes > 0 && proj.votes === maxVotes;
      doc.setFillColor(isLeader ? 255 : isEven ? 255 : 248, isLeader ? 241 : isEven ? 255 : 250, isLeader ? 242 : isEven ? 255 : 252);
      doc.rect(margin, y, pageWidth - margin * 2, 7.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...(isLeader ? roseColor : primaryColor));
      doc.text(`#${idx + 1}`, margin + 4, y + 5);

      const truncTitle = proj.title.length > 42 ? `${proj.title.slice(0, 39)}...` : proj.title;
      const truncTeam = proj.teamName.length > 24 ? `${proj.teamName.slice(0, 21)}...` : proj.teamName;

      doc.setFont('helvetica', isLeader ? 'bold' : 'normal');
      doc.setTextColor(...primaryColor);
      doc.text(truncTitle, margin + 17, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkGray);
      doc.text(truncTeam, margin + 98, y + 5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...roseColor);
      doc.text(`${proj.votes}`, margin + 147, y + 5);

      doc.setTextColor(...primaryColor);
      doc.text(`${proj.percentage}%`, margin + 165, y + 5);

      y += 7.5;
    });
  }

  doc.save(`CPE_Project_Exhibit_Results_2026_${new Date().toISOString().slice(0, 10)}.pdf`);
};


