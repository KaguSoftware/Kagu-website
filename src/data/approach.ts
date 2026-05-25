export type ApproachStep = {
  number: string;
  title: string;
  body: string;
};

export const approach: readonly ApproachStep[] = [
  {
    number: "01",
    title: "Listen",
    body:
      "Before any code, we sit with the operators. We watch a shift. We read the messages they actually send each other. The brief on paper is rarely the brief in practice.",
  },
  {
    number: "02",
    title: "Map",
    body:
      "We design the smallest system that solves the actual workflow. One database. Two surfaces. No microservices for a fifteen-person team.",
  },
  {
    number: "03",
    title: "Ship",
    body:
      "Production in weeks, not quarters. The first deploy is real, on a real domain, the day kickoff ends. Every later week is a real release.",
  },
  {
    number: "04",
    title: "Hand off",
    body:
      "An admin staff actually use. Documentation the team reads once. The handover is the moment we stop being needed, and the moment Kagu is most useful.",
  },
] as const;
