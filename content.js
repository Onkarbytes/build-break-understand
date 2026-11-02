window.portfolioContent = Object.freeze({
  schemaVersion: 1,
  projects: [],
  investigations: [],
  articles: [],
  interests: [
    { area: "Security", topics: ["Web security research", "Bug bounty investigations", "Offensive security"] },
    { area: "AI", topics: ["AI security", "Adversarial machine learning", "Agentic AI security"] },
    { area: "Systems", topics: ["Reverse engineering", "Experimental engineering", "Software architecture"] },
  ],
  now: [
    { area: "Learning", status: "Not shared" },
    { area: "Projects", status: "No active projects supplied" },
    { area: "Research", status: "Interests only; no active investigation supplied" },
    { area: "Goals", status: "Not shared" },
  ],
});

/*
Project records can include: slug, title, summary, status, public, date, tags,
role, stack, architecture, sections, screenshots, sourceCodeUrl, demoUrl, lessons.
Investigations can include: slug, title, summary, status, public, date, topics,
methodology, technicalDetails, diagrams, code, findings, limitations,
references, conclusion. Articles can include: slug, title, summary, status,
public, publishedAt, updatedAt, category, tags, body, references, and related
slugs. Article body blocks use
paragraph, heading, list, code, image, and quote types.
*/
