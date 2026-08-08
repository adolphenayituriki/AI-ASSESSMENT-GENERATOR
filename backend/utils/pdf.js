const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const LOGO_PATH = path.join(__dirname, '..', '..', 'frontend', 'public', 'dufast-eduai.png');
const HAS_LOGO = fs.existsSync(LOGO_PATH);

const SCHOOL_NAME = 'DuFast EduAi';
const SCHOOL_ADDR = '';
const SCHOOL_PHONE = '';
const SCHOOL_EMAIL = '';
const SCHOOL_MOTTO = 'Smart assessments in seconds';

const GREEN = '#078ECE';
const DARK = '#111827';
const GREY = '#6b7280';
const MID = '#374151';
const LINE = '#e5e7eb';
const TINT = '#e7f6fe';

function buildAssessmentPdf({ title, type, subject, className, questions = [], timeAllowed = '', markingGuide = false, marks = 1, extraInstructions = '' }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 76, bottom: 74, left: 64, right: 64 },
      bufferPages: true,
      info: { Title: title || 'Assessment', Author: SCHOOL_NAME },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const MARGIN = 64;
    const W = pageW - MARGIN * 2;
    const total = questions.length;
    const mk = Number(marks) || 1;
    const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || mk), 0);
    const extraLines = (Array.isArray(extraInstructions) ? extraInstructions : String(extraInstructions || '').split('\n'))
      .map((s) => String(s).trim())
      .filter(Boolean);
    const metaParts = [type, subject, className].filter(Boolean).map((m) => String(m).toUpperCase());

    const hline = (color = LINE, width = 1) => {
      doc.moveTo(MARGIN, doc.y).lineTo(pageW - MARGIN, doc.y).strokeColor(color).lineWidth(width).stroke();
    };

    const ensureSpace = (h) => {
      if (doc.y + h > pageH - 90) {
        doc.addPage();
        doc.y = 76;
      }
    };

    const drawDiagramBox = () => {
      const boxTop = doc.y;
      const boxH = 96;
      doc.roundedRect(MARGIN + 12, boxTop, W - 24, boxH, 5).lineWidth(1).strokeColor('#cbd5e1').dash(3, 3).stroke();
      doc.undash();
      doc.font('Helvetica-Oblique').fontSize(8).fillColor(GREY).text('Draw your diagram in the box below.', MARGIN + 24, boxTop + boxH - 15, { width: W - 48 });
      doc.y = boxTop + boxH;
    };

    const drawGraphBox = (q) => {
      const gx = MARGIN + 12;
      const gyTop = doc.y;
      const gW = W - 24;
      const gH = 104;
      doc.lineWidth(0.25).strokeColor('#e2e8f0');
      for (let x = gx + 12; x < gx + gW; x += 12) {
        doc.moveTo(x, gyTop).lineTo(x, gyTop + gH).stroke();
      }
      for (let y = gyTop + 12; y < gyTop + gH; y += 12) {
        doc.moveTo(gx, y).lineTo(gx + gW, y).stroke();
      }
      doc.lineWidth(1).strokeColor('#cbd5e1').rect(gx, gyTop, gW, gH).stroke();
      doc.lineWidth(1.1).strokeColor(MID);
      doc.moveTo(gx, gyTop + gH).lineTo(gx, gyTop).stroke();
      doc.moveTo(gx, gyTop + gH).lineTo(gx + gW, gyTop + gH).stroke();
      doc.moveTo(gx - 3, gyTop + 8).lineTo(gx, gyTop).lineTo(gx + 3, gyTop + 8).stroke();
      doc.moveTo(gx + gW - 8, gyTop + gH - 3).lineTo(gx + gW, gyTop + gH).lineTo(gx + gW - 8, gyTop + gH + 3).stroke();
      if (q.graphX) {
        doc.font('Helvetica-Oblique').fontSize(8).fillColor(GREY).text(q.graphX, gx + gW - 120, gyTop + gH + 7, { width: 120, align: 'right' });
      }
      if (q.graphY) {
        const lx = gx - 14;
        const ly = gyTop + gH / 2;
        doc.rotate(-90, { origin: [lx, ly] });
        doc.font('Helvetica-Oblique').fontSize(8).fillColor(GREY).text(q.graphY, lx - 60, ly, { width: 120, align: 'center' });
        doc.rotate(90, { origin: [lx, ly] });
      }
      doc.y = gyTop + gH + 20;
    };

    // ---------------- Header ----------------
    if (HAS_LOGO) {
      const logoSize = 56;
      doc.image(LOGO_PATH, (pageW - logoSize) / 2, 14, { fit: [logoSize, logoSize] });
      doc.y = 14 + logoSize + 10;
      hline(GREEN, 2);
      doc.moveDown(0.9);
    }
    doc.font('Helvetica-Bold').fontSize(15).fillColor(GREEN).text(SCHOOL_NAME, { width: W, align: 'center' });
    doc.moveDown(0.12);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GREY).text(SCHOOL_MOTTO, { width: W, align: 'center' });
    if (SCHOOL_ADDR) {
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(8.5).fillColor(GREY).text(SCHOOL_ADDR, { width: W, align: 'center' });
      doc.moveDown(0.15);
      doc.font('Helvetica').fontSize(8.5).fillColor(GREY).text(`${SCHOOL_PHONE}   •   ${SCHOOL_EMAIL}`, { width: W, align: 'center' });
    }
    doc.moveDown(0.55);
    hline(LINE, 1);
    doc.moveDown(0.9);

    doc.font('Helvetica-Bold').fontSize(13).fillColor(DARK).text(title || 'Assessment', { width: W, align: 'center' });
    if (metaParts.length) {
      doc.moveDown(0.25);
      doc.font('Helvetica').fontSize(9).fillColor(GREY).text(metaParts.join('  •  '), { width: W, align: 'center' });
    }
    doc.moveDown(0.8);
    const cellW = W / 2;
    const padX = 14;
    const rowH = 26;
    const infoRows = [
      [['Subject', subject || 'General'], ['Class', className || '—']],
      [['Date', new Date().toLocaleDateString('en-GB')], ['Total', `${totalMarks} mark${totalMarks === 1 ? '' : 's'}`]],
    ];
    const boxTop = doc.y;
    const boxH = infoRows.length * rowH;

    doc.roundedRect(MARGIN, boxTop, W, boxH, 4).lineWidth(1).strokeColor(LINE).stroke();
    doc.moveTo(MARGIN + cellW, boxTop).lineTo(MARGIN + cellW, boxTop + boxH).lineWidth(1).strokeColor(LINE).stroke();
    doc.moveTo(MARGIN, boxTop + rowH).lineTo(pageW - MARGIN, boxTop + rowH).lineWidth(1).strokeColor(LINE).stroke();

    infoRows.forEach((row, r) => {
      row.forEach(([k, v], c) => {
        const x = MARGIN + c * cellW + padX;
        const y = boxTop + r * rowH + 9;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GREY).text(k.toUpperCase(), x, y, { width: 80 });
        doc.font('Helvetica').fontSize(9.5).fillColor(DARK).text(String(v || '—'), x + 96, y - 1, { width: cellW - padX - 96 });
      });
    });
    doc.y = boxTop + boxH;
    doc.moveDown(0.9);

    // ---------------- Marking guide banner ----------------
    if (markingGuide) {
      const bannerTop = doc.y;
      doc.rect(MARGIN, bannerTop, W, 24).fill('#06749f');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9.5).text(
        'MARKING GUIDE  •  TEACHER COPY',
        MARGIN, bannerTop + 8, { width: W, align: 'center' }
      );
      doc.y = bannerTop + 24;
      doc.moveDown(0.7);
    } else {
      // ---------------- Student details ----------------
      const studentTop = doc.y;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GREY).text('STUDENT NAME', MARGIN, studentTop, { width: 200 });
      doc.font('Helvetica').fontSize(9.5).fillColor(DARK).text('______________________________', MARGIN, studentTop + 16, { width: 200 });
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GREY).text('REGISTRATION NO.', MARGIN + cellW, studentTop, { width: 200 });
      doc.font('Helvetica').fontSize(9.5).fillColor(DARK).text('______________________________', MARGIN + cellW, studentTop + 16, { width: 200 });
      doc.y = studentTop + 36;
      doc.moveDown(0.7);

      // ---------------- Instructions callout ----------------
      const insTop = doc.y;
      const timeLabel = timeAllowed || '60 minutes';
      const insLines = [
        'Answer ALL questions.',
        `Each question carries the marks shown beside it. Total marks: ${totalMarks}.`,
        `Time allowed: ${timeLabel}.`,
        'Read each question carefully before answering.',
        ...extraLines,
      ];
      const insH = insLines.length * 15 + 22;
      doc.rect(MARGIN, insTop, W, insH).lineWidth(1).strokeColor('#b5e5fb').fillColor(TINT).fillAndStroke();
      doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(8).text('INSTRUCTIONS', MARGIN + 12, insTop + 10, { width: W - 24 });
      doc.fillColor(MID).font('Helvetica').fontSize(9);
      insLines.forEach((l, i) => {
        doc.text(`${i + 1}.  ${l}`, MARGIN + 12, insTop + 26 + i * 15, { width: W - 28 });
      });
      doc.y = insTop + insH;
      doc.moveDown(0.9);
    }

    // ---------------- Questions ----------------
    doc.font('Helvetica-Bold').fontSize(10).fillColor(GREEN).text(
      markingGuide ? 'SECTION A — QUESTIONS & ANSWERS' : 'SECTION A — ANSWER ALL QUESTIONS',
      { width: W }
    );
    doc.moveDown(0.2);
    hline();
    doc.moveDown(0.7);

    questions.forEach((q, i) => {
      const qText = `${i + 1}. ${String(q.question || '')}`;
      const qTextH = doc.heightOfString(qText, { width: W - 55 });
      const optH = q.options && q.options.length > 0 ? q.options.length * 12 + 6 : (markingGuide ? 14 : 40);
      const extra = markingGuide ? 46 : q.graph ? 165 : q.diagram ? 130 : 10;
      ensureSpace(qTextH + optH + extra + 20);

      const qy = doc.y;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK);
      doc.text(qText, { width: W - 55, lineGap: 2 });
      const afterQ = doc.y;
      doc.font('Helvetica').fontSize(8).fillColor(GREY).text(`(${Number(q.marks) || mk} mark${(Number(q.marks) || mk) === 1 ? '' : 's'})`, pageW - MARGIN - 45, qy + 2, { width: 45, align: 'right' });
      doc.x = MARGIN;
      doc.y = afterQ;

      if (q.options && q.options.length > 0) {
        doc.moveDown(0.2);
        q.options.forEach((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isCorrect = markingGuide && idx === q.correctIndex;
          if (isCorrect) {
            const bx = MARGIN + 8;
            const by = doc.y + 7;
            doc.moveTo(bx, by).lineTo(bx + 2.6, by + 3.2).lineTo(bx + 6.6, by - 2.8).lineWidth(1.3).strokeColor('#06739f').stroke();
          }
          doc.font(isCorrect ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).fillColor(isCorrect ? '#06739f' : MID);
          doc.text(`${isCorrect ? '      ' : '     '}${letter}) ${opt}`, { width: W - 40, lineGap: 1 });
        });
      } else if (markingGuide) {
        doc.moveDown(0.15);
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#06739f').text(`Answer: ${q.answer || ''}`, { width: W, lineGap: 1 });
      } else {
        const noOpts = true;
        if (!q.graph && !q.diagram) {
          doc.moveDown(0.5);
          for (let l = 0; l < 3; l += 1) {
            doc.moveTo(MARGIN, doc.y).lineTo(pageW - MARGIN, doc.y).lineWidth(0.75).strokeColor(LINE).stroke();
            doc.moveDown(0.7);
          }
        } else {
          doc.moveDown(0.2);
        }
      }

      if (markingGuide) {
        doc.moveDown(0.15);
        if (q.explanation) {
          doc.font('Helvetica').fontSize(8.5).fillColor(GREY).text(`Explanation: ${q.explanation}`, { width: W - 16, lineGap: 1 });
        }
        doc.moveDown(0.35);
        hline();
        doc.moveDown(0.6);
      } else {
        if (!(q.options && q.options.length > 0)) {
          if (q.graph) drawGraphBox(q);
          else if (q.diagram) drawDiagramBox();
        }
        doc.moveDown(0.9);
      }
    });

    // ---------------- End of paper ----------------
    doc.moveDown(1.2);
    hline(LINE, 1);
    doc.moveDown(0.5);
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(GREY).text('— End of paper —', { width: W, align: 'center' });

    // ---------------- Footer: page numbers ----------------
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      const y = doc.page.height - 90;
      doc.font('Helvetica').fontSize(8).fillColor(GREY);
      doc.text(SCHOOL_NAME, MARGIN, y, { width: W / 2 });
      doc.text(`Page ${i + 1} of ${range.count}`, pageW - MARGIN, y, { width: W / 2, align: 'right' });
    }

    doc.end();
  });
}

module.exports = { buildAssessmentPdf };
