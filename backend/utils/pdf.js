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
      margins: { top: 82, bottom: 82, left: 72, right: 72 },
      bufferPages: true,
      info: { Title: title || 'Assessment', Author: SCHOOL_NAME },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const MARGIN = 72;
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
        doc.y = 82;
      }
    };

    const drawDiagramBox = () => {
      const boxTop = doc.y;
      const boxH = 112;
      doc.roundedRect(MARGIN + 12, boxTop, W - 24, boxH, 5).lineWidth(1).strokeColor('#cbd5e1').dash(3, 3).stroke();
      doc.undash();
      doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(GREY).text('Draw your diagram in the box below.', MARGIN + 24, boxTop + boxH - 18, { width: W - 48 });
      doc.y = boxTop + boxH;
    };

    const drawGraphBox = (q) => {
      const gx = MARGIN + 12;
      const gyTop = doc.y;
      const gW = W - 24;
      const gH = 122;
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
      doc.y = gyTop + gH + 22;
    };

    // ---------------- Header ----------------
    if (HAS_LOGO) {
      const logoSize = 58;
      doc.image(LOGO_PATH, (pageW - logoSize) / 2, 12, { fit: [logoSize, logoSize] });
      doc.y = 12 + logoSize + 12;
      hline(GREEN, 2);
      doc.moveDown(1.1);
    }
    doc.font('Helvetica-Bold').fontSize(17).fillColor(GREEN).text(SCHOOL_NAME, { width: W, align: 'center' });
    doc.moveDown(0.15);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GREY).text(SCHOOL_MOTTO, { width: W, align: 'center' });
    if (SCHOOL_ADDR) {
      doc.moveDown(0.25);
      doc.font('Helvetica').fontSize(9.5).fillColor(GREY).text(SCHOOL_ADDR, { width: W, align: 'center' });
      doc.moveDown(0.18);
      doc.font('Helvetica').fontSize(9.5).fillColor(GREY).text(`${SCHOOL_PHONE}   •   ${SCHOOL_EMAIL}`, { width: W, align: 'center' });
    }
    doc.moveDown(0.7);
    hline(LINE, 1);
    doc.moveDown(1.1);

    doc.font('Helvetica-Bold').fontSize(15).fillColor(DARK).text(title || 'Assessment', { width: W, align: 'center' });
    if (metaParts.length) {
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10).fillColor(GREY).text(metaParts.join('   •   '), { width: W, align: 'center' });
    }
    doc.moveDown(1.0);
    const cellW = W / 2;
    const padX = 16;
    const rowH = 30;
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
        const y = boxTop + r * rowH + 10;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(GREY).text(k.toUpperCase(), x, y, { width: 90 });
        doc.font('Helvetica').fontSize(11).fillColor(DARK).text(String(v || '—'), x + 104, y - 1, { width: cellW - padX - 104 });
      });
    });
    doc.y = boxTop + boxH;
    doc.moveDown(1.1);

    // ---------------- Marking guide banner ----------------
    if (markingGuide) {
      const bannerTop = doc.y;
      doc.rect(MARGIN, bannerTop, W, 28).fill('#06749f');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10.5).text(
        'MARKING GUIDE  •  TEACHER COPY',
        MARGIN, bannerTop + 9, { width: W, align: 'center' }
      );
      doc.y = bannerTop + 28;
      doc.moveDown(0.9);
    } else {
      // ---------------- Student details ----------------
      const studentTop = doc.y;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GREY).text('STUDENT NAME', MARGIN, studentTop, { width: 220 });
      doc.font('Helvetica').fontSize(11).fillColor(DARK).text('______________________________', MARGIN, studentTop + 18, { width: 220 });
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GREY).text('REGISTRATION NO.', MARGIN + cellW, studentTop, { width: 220 });
      doc.font('Helvetica').fontSize(11).fillColor(DARK).text('______________________________', MARGIN + cellW, studentTop + 18, { width: 220 });
      doc.y = studentTop + 42;
      doc.moveDown(0.9);

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
      const insH = insLines.length * 18 + 28;
      doc.rect(MARGIN, insTop, W, insH).lineWidth(1).strokeColor('#b5e5fb').fillColor(TINT).fillAndStroke();
      doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(9).text('INSTRUCTIONS', MARGIN + 14, insTop + 11, { width: W - 28 });
      doc.fillColor(MID).font('Helvetica').fontSize(9.5);
      insLines.forEach((l, i) => {
        doc.text(`${i + 1}.   ${l}`, MARGIN + 14, insTop + 30 + i * 18, { width: W - 32, lineGap: 1 });
      });
      doc.y = insTop + insH;
      doc.moveDown(1.1);
    }

    // ---------------- Questions ----------------
    doc.font('Helvetica-Bold').fontSize(12).fillColor(GREEN).text(
      markingGuide ? 'SECTION A — QUESTIONS & ANSWERS' : 'SECTION A — ANSWER ALL QUESTIONS',
      { width: W }
    );
    doc.moveDown(0.3);
    hline();
    doc.moveDown(0.9);

    questions.forEach((q, i) => {
      const qText = `${i + 1}. ${String(q.question || '')}`;
      const qTextH = doc.heightOfString(qText, { width: W - 60 });
      const optH = q.options && q.options.length > 0 ? q.options.length * 15 + 8 : (markingGuide ? 18 : 52);
      const extra = markingGuide ? 54 : q.graph ? 190 : q.diagram ? 150 : 14;
      ensureSpace(qTextH + optH + extra + 24);

      const qy = doc.y;
      doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK);
      doc.text(qText, { width: W - 60, lineGap: 4 });
      const afterQ = doc.y;
      doc.font('Helvetica').fontSize(8.5).fillColor(GREY).text(`(${Number(q.marks) || mk} mark${(Number(q.marks) || mk) === 1 ? '' : 's'})`, pageW - MARGIN - 50, qy + 2, { width: 50, align: 'right' });
      doc.x = MARGIN;
      doc.y = afterQ;

      if (q.options && q.options.length > 0) {
        doc.moveDown(0.3);
        q.options.forEach((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isCorrect = markingGuide && idx === q.correctIndex;
          if (isCorrect) {
            const bx = MARGIN + 10;
            const by = doc.y + 7.5;
            doc.moveTo(bx, by).lineTo(bx + 3, by + 3.6).lineTo(bx + 7.4, by - 3.2).lineWidth(1.4).strokeColor('#06739f').stroke();
          }
          doc.font(isCorrect ? 'Helvetica-Bold' : 'Helvetica').fontSize(10.5).fillColor(isCorrect ? '#06739f' : MID);
          doc.text(`${isCorrect ? '      ' : '     '}${letter}) ${opt}`, { width: W - 44, lineGap: 2.5 });
        });
      } else if (markingGuide) {
        doc.moveDown(0.2);
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#06739f').text(`Answer: ${q.answer || ''}`, { width: W, lineGap: 1.5 });
      } else {
        const noOpts = true;
        if (!q.graph && !q.diagram) {
          doc.moveDown(0.6);
          for (let l = 0; l < 3; l += 1) {
            doc.moveTo(MARGIN, doc.y).lineTo(pageW - MARGIN, doc.y).lineWidth(1).strokeColor(LINE).stroke();
            doc.moveDown(0.85);
          }
        } else {
          doc.moveDown(0.25);
        }
      }

      if (markingGuide) {
        doc.moveDown(0.2);
        if (q.explanation) {
          doc.font('Helvetica').fontSize(9.5).fillColor(GREY).text(`Explanation: ${q.explanation}`, { width: W - 20, lineGap: 1.5 });
        }
        doc.moveDown(0.45);
        hline();
        doc.moveDown(0.8);
      } else {
        if (!(q.options && q.options.length > 0)) {
          if (q.graph) drawGraphBox(q);
          else if (q.diagram) drawDiagramBox();
        }
        doc.moveDown(1.1);
      }
    });

    // ---------------- End of paper ----------------
    doc.moveDown(1.4);
    hline(LINE, 1);
    doc.moveDown(0.6);
    doc.font('Helvetica-Oblique').fontSize(10).fillColor(GREY).text('— End of paper —', { width: W, align: 'center' });

    // ---------------- Footer: page numbers ----------------
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      const y = doc.page.height - 92;
      doc.font('Helvetica').fontSize(8.5).fillColor(GREY);
      doc.text(SCHOOL_NAME, MARGIN, y, { width: W / 2 });
      doc.text(`Page ${i + 1} of ${range.count}`, pageW - MARGIN, y, { width: W / 2, align: 'right' });
    }

    doc.end();
  });
}

module.exports = { buildAssessmentPdf };
