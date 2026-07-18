/**
 * Transparent job/resume match indicator.
 * Excludes protected characteristics; never auto-rejects.
 */

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function skillSet(list = []) {
  return new Set((list || []).map(norm).filter(Boolean));
}

function overlap(required, available) {
  const req = [...required];
  if (!req.length) return { score: 1, matched: [], missing: [] };
  const matched = [];
  const missing = [];
  for (const skill of req) {
    if (available.has(skill)) matched.push(skill);
    else missing.push(skill);
  }
  return { score: matched.length / req.length, matched, missing };
}

function titleRelevance(jobTitle, resumeTitle, experienceRoles = []) {
  const target = norm(jobTitle);
  if (!target) return { score: 0.5, evidence: "No job title to compare" };
  const titles = [norm(resumeTitle), ...experienceRoles.map(norm)].filter(Boolean);
  if (titles.some((t) => t === target || t.includes(target) || target.includes(t))) {
    return { score: 1, evidence: "Job title aligns with resume roles" };
  }
  const targetTokens = new Set(target.split(" "));
  let best = 0;
  for (const title of titles) {
    const tokens = title.split(" ");
    const hits = tokens.filter((t) => targetTokens.has(t)).length;
    best = Math.max(best, hits / Math.max(targetTokens.size, 1));
  }
  return {
    score: best,
    evidence: best >= 0.4 ? "Partial title keyword overlap" : "Limited title overlap",
  };
}

function experienceFit(job, resume) {
  const minYears = job.min_experience_years;
  if (minYears == null) return { score: 0.7, evidence: "No minimum experience stated" };
  const years = (resume.experience || []).reduce((sum, item) => {
    const start = parseInt(String(item.start || "").slice(0, 4), 10);
    const end = item.current
      ? new Date().getFullYear()
      : parseInt(String(item.end || "").slice(0, 4), 10);
    if (!start || !end || end < start) return sum;
    return sum + (end - start);
  }, 0);
  if (years >= minYears) return { score: 1, evidence: `About ${years} years vs ${minYears} required` };
  if (years >= minYears * 0.7) {
    return { score: 0.6, evidence: `About ${years} years vs ${minYears} required` };
  }
  return { score: 0.25, evidence: `About ${years} years vs ${minYears} required` };
}

function locationFit(job, resume) {
  if (job.workplace_type === "remote" || job.location?.workplace_type === "remote") {
    return { score: 1, evidence: "Role is remote" };
  }
  const jobLoc = norm([job.city || job.location?.city, job.country || job.location?.country].filter(Boolean).join(" "));
  const resumeLoc = norm(resume.basics?.location || resume.basics?.city || "");
  if (!jobLoc) return { score: 0.6, evidence: "Job location not specified" };
  if (!resumeLoc) return { score: 0.4, evidence: "Resume location not specified" };
  if (resumeLoc.includes(jobLoc) || jobLoc.includes(resumeLoc)) {
    return { score: 1, evidence: "Location appears compatible" };
  }
  return { score: 0.35, evidence: "Location may not match" };
}

function educationFit(job, resume) {
  const req = (job.education_requirements || []).map(norm).filter(Boolean);
  if (!req.length) return { score: 0.7, evidence: "No education requirement listed" };
  const hay = (resume.education || [])
    .map((e) => norm([e.degree, e.field, e.school].join(" ")))
    .join(" ");
  const matched = req.filter((r) => hay.includes(r));
  return {
    score: matched.length / req.length,
    evidence:
      matched.length === req.length
        ? "Education requirements appear covered"
        : "Some education requirements unclear",
  };
}

function completeness(resume) {
  let score = 0;
  if (resume.basics?.name) score += 0.2;
  if (resume.basics?.summary) score += 0.2;
  if ((resume.experience || []).length) score += 0.3;
  if ((resume.skills || []).length) score += 0.2;
  if ((resume.education || []).length) score += 0.1;
  return {
    score,
    evidence: score >= 0.8 ? "Resume looks complete" : "Resume may be missing sections",
  };
}

export function computeJobMatch(job, resume, { screeningAnswers = [] } = {}) {
  const resumeSkills = skillSet([
    ...(resume.skills || []).map((s) => s.name || s),
    ...(resume.experience || []).flatMap((e) => e.tools || []),
  ]);
  const required = overlap(skillSet(job.required_skills), resumeSkills);
  const preferred = overlap(skillSet(job.preferred_skills), resumeSkills);
  const title = titleRelevance(
    job.title,
    resume.basics?.title || resume.target_role,
    (resume.experience || []).map((e) => e.role),
  );
  const experience = experienceFit(job, resume);
  const location = locationFit(job, resume);
  const education = educationFit(job, resume);
  const complete = completeness(resume);

  let authScore = 0.7;
  let authEvidence = "Work authorization not assessed from protected attributes";
  const authQ = (job.questions || []).find((q) => /authoriz|visa|eligible/i.test(q.question));
  if (authQ) {
    const answer = screeningAnswers.find((a) => a.question_id === authQ.id);
    if (answer?.value != null && String(answer.value).length) {
      authScore = 1;
      authEvidence = "Candidate provided a work-authorization answer";
    } else {
      authScore = 0.3;
      authEvidence = "Work-authorization question unanswered";
    }
  }

  const weighted =
    required.score * 0.3 +
    preferred.score * 0.1 +
    experience.score * 0.2 +
    title.score * 0.15 +
    education.score * 0.1 +
    location.score * 0.1 +
    complete.score * 0.05;

  const percent = Math.round(Math.min(100, Math.max(0, weighted * 100)));

  return {
    percent,
    disclaimer:
      "This match indicator is guidance based on the information provided and does not determine hiring eligibility.",
    categories: {
      required_skills: {
        score: Math.round(required.score * 100),
        matched: required.matched,
        missing: required.missing,
        evidence: `${required.matched.length}/${required.matched.length + required.missing.length || 0} required skills matched`,
      },
      preferred_skills: {
        score: Math.round(preferred.score * 100),
        matched: preferred.matched,
        missing: preferred.missing,
        evidence: `${preferred.matched.length} preferred skills matched`,
      },
      experience: { score: Math.round(experience.score * 100), evidence: experience.evidence },
      title: { score: Math.round(title.score * 100), evidence: title.evidence },
      education: { score: Math.round(education.score * 100), evidence: education.evidence },
      location: { score: Math.round(location.score * 100), evidence: location.evidence },
      work_authorization: { score: Math.round(authScore * 100), evidence: authEvidence },
      resume_completeness: { score: Math.round(complete.score * 100), evidence: complete.evidence },
    },
    suggested_improvements: [
      ...required.missing.slice(0, 5).map((s) => `Clarify or add skill: ${s}`),
      ...(complete.score < 0.8 ? ["Complete missing resume sections before applying"] : []),
    ],
  };
}
