export interface PortfolioStrategy {
  positioning: string;
  keyMessage: string;
  projectGuides: ProjectGuide[];
  skillStrategy: {
    leadWith: string[];
    emphasize: string[];
    deemphasize: string[];
    missing: string[];
    reasoning: string;
  };
  introOptimization: {
    original: string;
    improved: string;
    reasoning: string;
  };
  keywordMatch?: {
    matched: string[];
    missing: string[];
    coverage: number;
    suggestions: string[];
  };
  additionalSuggestions: string[];
}

export interface ProjectGuide {
  projectId: string;
  projectSource: 'portfolio' | 'experience';
  projectTitle: string;
  relevanceScore: number;
  recommendedOrder: number;
  highlightPoints: string[];
  descriptionImproved: string;
  achievementsImproved: string[];
  techStackHighlight: string[];
  troubleshootingGuide?: {
    suggested: string;
    reasoning: string;
  };
  reasoning: string;
}
