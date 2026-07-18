import PDFDocument from "pdfkit";
import { getTemplateById, normalizeResumeSettings } from "./templates.js";

function pageSize(settings) {
  return settings.page_size === "letter" ? "LETTER" : "A4";
}

function skillNames(skills) {
  return (skills || [])
    .map((s) => (typeof s === "string" ? s : s.name))
    .filter(Boolean)
    .join(" · ");
}

function dateRange(start, end, current) {
  const a = start || "";
  const b = current ? "Present" : end || "";
  if (!a && !b) return "";
  return `${a}${a || b ? " – " : ""}${b}`;
}

function safeFilename(resume) {
  const parts = [
    resume.basics?.name || "Resume",
    resume.target_role || resume.basics?.title || "",
    "Resume",
  ]
    .filter(Boolean)
    .join("_")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return `${parts || "Resume"}.pdf`;
}

/**
 * Generate a selectable-text PDF buffer matching the chosen template.
 */
export async function renderResumePdf(resume) {
  const template = getTemplateById(resume.template_id || "classic_ats");
  const settings = normalizeResumeSettings(resume.settings, template.id);
  const margin = settings.margins;
  const font = settings.font_family;
  const size = settings.font_size;
  const primary = settings.primary_color;
  const accent = settings.accent_color;
  const hidden = new Set(resume.hidden_sections || []);

  const doc = new PDFDocument({
    size: pageSize(settings),
    margins: { top: margin, bottom: margin, left: margin, right: margin },
    info: {
      Title: resume.title || "Resume",
      Author: resume.basics?.name || "",
      Creator: "UXGuard Studio Resume Builder",
    },
  });

  const chunks = [];
  doc.on("data", (c) => chunks.push(c));

  const done = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pageWidth = doc.page.width - margin * 2;

  function ensureSpace(needed = 48) {
    if (doc.y + needed > doc.page.height - margin) {
      doc.addPage();
    }
  }

  function sectionHeading(label) {
    ensureSpace(36);
    doc.moveDown(settings.section_spacing / 18);
    doc
      .font(font === "Times-Roman" ? "Times-Bold" : "Helvetica-Bold")
      .fontSize(size + 1)
      .fillColor(primary)
      .text(label.toUpperCase(), { characterSpacing: template.id === "executive_minimal" ? 1.2 : 0.4 });
    if (template.id !== "executive_minimal") {
      doc
        .moveTo(margin, doc.y + 2)
        .lineTo(margin + pageWidth, doc.y + 2)
        .strokeColor(accent)
        .lineWidth(template.id === "classic_ats" ? 0.8 : 1.2)
        .stroke();
      doc.moveDown(0.5);
    } else {
      doc.moveDown(0.35);
    }
  }

  // Header
  if (template.id === "modern_professional") {
    doc.rect(0, 0, doc.page.width, 78).fill(primary);
    doc.fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(size + 8)
      .text(resume.basics?.name || "Your Name", margin, 22, { width: pageWidth });
    doc
      .font("Helvetica")
      .fontSize(size + 1)
      .text(resume.basics?.title || resume.target_role || "", margin, 46, { width: pageWidth });
    doc.y = 90;
    doc.fillColor("#334155");
  } else {
    doc
      .fillColor(primary)
      .font(font === "Times-Roman" ? "Times-Bold" : "Helvetica-Bold")
      .fontSize(size + 8)
      .text(resume.basics?.name || "Your Name", { align: template.id === "executive_minimal" ? "left" : "left" });
    doc
      .font(font)
      .fontSize(size + 1)
      .fillColor(accent)
      .text(resume.basics?.title || resume.target_role || "");
  }

  const contact = [
    resume.basics?.email,
    resume.basics?.phone,
    resume.basics?.city || resume.basics?.location,
    resume.basics?.linkedin_url,
    resume.basics?.portfolio_url || resume.basics?.website_url,
  ]
    .filter(Boolean)
    .join("  ·  ");

  doc
    .font(font)
    .fontSize(size - 0.5)
    .fillColor("#475569")
    .text(contact, { width: pageWidth });
  doc.moveDown(0.6);

  const summary = resume.basics?.summary || resume.basics?.objective;
  if (summary && !hidden.has("summary")) {
    sectionHeading("Summary");
    doc
      .font(font)
      .fontSize(size)
      .fillColor("#1e293b")
      .text(summary, { width: pageWidth, lineGap: (settings.line_spacing - 1) * size });
  }

  if ((resume.experience || []).length && !hidden.has("experience")) {
    sectionHeading("Experience");
    for (const exp of resume.experience) {
      ensureSpace(56);
      doc
        .font(font === "Times-Roman" ? "Times-Bold" : "Helvetica-Bold")
        .fontSize(size + 0.5)
        .fillColor("#0f172a")
        .text(exp.role || "Role", { continued: true })
        .font(font)
        .fillColor("#64748b")
        .text(`  ${dateRange(exp.start, exp.end, exp.current)}`, { align: "left" });
      doc
        .font(font)
        .fontSize(size)
        .fillColor("#334155")
        .text([exp.company, exp.location].filter(Boolean).join(" · "));
      for (const bullet of (exp.bullets || []).filter(Boolean)) {
        doc
          .font(font)
          .fontSize(size)
          .fillColor("#1e293b")
          .text(`•  ${bullet}`, { width: pageWidth, indent: 4, lineGap: (settings.line_spacing - 1) * size });
      }
      doc.moveDown(0.35);
    }
  }

  if ((resume.education || []).length && !hidden.has("education")) {
    sectionHeading("Education");
    for (const edu of resume.education) {
      ensureSpace(40);
      doc
        .font(font === "Times-Roman" ? "Times-Bold" : "Helvetica-Bold")
        .fontSize(size + 0.5)
        .fillColor("#0f172a")
        .text(edu.school || "Institution");
      doc
        .font(font)
        .fontSize(size)
        .fillColor("#334155")
        .text(
          [edu.degree, edu.field, dateRange(edu.start, edu.end, edu.current)].filter(Boolean).join(" · "),
        );
      if (edu.details) {
        doc.fillColor("#475569").text(edu.details, { width: pageWidth });
      }
      doc.moveDown(0.25);
    }
  }

  if ((resume.skills || []).length && !hidden.has("skills")) {
    sectionHeading("Skills");
    doc
      .font(font)
      .fontSize(size)
      .fillColor("#1e293b")
      .text(skillNames(resume.skills), { width: pageWidth });
  }

  if ((resume.projects || []).length && !hidden.has("projects")) {
    sectionHeading("Projects");
    for (const project of resume.projects) {
      ensureSpace(36);
      doc
        .font(font === "Times-Roman" ? "Times-Bold" : "Helvetica-Bold")
        .fontSize(size + 0.5)
        .fillColor("#0f172a")
        .text(project.name || "Project");
      if (project.summary) {
        doc.font(font).fontSize(size).fillColor("#334155").text(project.summary, { width: pageWidth });
      }
      if (project.url) {
        doc.fillColor(accent).text(project.url, { link: project.url, underline: true });
      }
      doc.moveDown(0.2);
    }
  }

  if ((resume.certifications || []).length && !hidden.has("certifications")) {
    sectionHeading("Certifications");
    for (const cert of resume.certifications) {
      doc
        .font(font)
        .fontSize(size)
        .fillColor("#1e293b")
        .text([cert.name, cert.issuer, cert.year || cert.issue_date].filter(Boolean).join(" · "));
    }
  }

  if ((resume.languages || []).length && !hidden.has("languages")) {
    sectionHeading("Languages");
    doc
      .font(font)
      .fontSize(size)
      .fillColor("#1e293b")
      .text(
        (resume.languages || [])
          .map((l) => [l.language, l.proficiency].filter(Boolean).join(" — "))
          .filter(Boolean)
          .join(" · "),
      );
  }

  doc.end();
  const buffer = await done;
  return {
    buffer,
    filename: safeFilename(resume),
    contentType: "application/pdf",
  };
}

export { safeFilename };
