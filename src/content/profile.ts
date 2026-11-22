export interface InterestGroup {
  area: string;
  topics: string[];
}

export interface CurrentUpdate {
  area: string;
  status: string;
}

export interface ProfessionalExperience {
  organization: string;
  role: string;
  startDate?: string;
  endDate?: string;
  summary: string;
  responsibilities: string[];
  technologies: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  issuedAt?: string;
  expiresAt?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export const interests: InterestGroup[] = [
  { area: "Security", topics: ["Web security research", "Bug bounty investigations", "Offensive security"] },
  { area: "AI", topics: ["AI security", "Adversarial machine learning", "Agentic AI security"] },
  { area: "Systems", topics: ["Reverse engineering", "Experimental engineering", "Software architecture"] },
];

export const currentUpdates: CurrentUpdate[] = [
  { area: "Learning", status: "Not shared" },
  { area: "Projects", status: "No active projects supplied" },
  { area: "Research", status: "Interests only; no active investigation supplied" },
  { area: "Goals", status: "Not shared" },
];
