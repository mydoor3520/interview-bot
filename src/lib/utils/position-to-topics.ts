import { TECH_CATEGORIES } from '@/lib/constants/tech-stacks';

interface TargetPositionData {
  requirements: string[];
  jobDescription?: string;
  position: string;
}

export function positionToTopics(position: TargetPositionData): string[] {
  const text = [
    ...position.requirements,
    position.jobDescription || '',
    position.position,
  ].join(' ').toLowerCase();

  const matched: string[] = [];

  for (const category of TECH_CATEGORIES) {
    for (const tech of category.items) {
      if (text.includes(tech.toLowerCase())) {
        matched.push(tech);
      }
    }
  }

  const unique = [...new Set(matched)].slice(0, 5);

  if (unique.length < 3) {
    const posLower = position.position.toLowerCase();
    if (posLower.includes('\uD504\uB860\uD2B8') || posLower.includes('frontend')) {
      unique.push(...['JavaScript', 'React', 'HTML/CSS'].filter(t => !unique.includes(t)));
    } else if (posLower.includes('\uBC31\uC5D4\uB4DC') || posLower.includes('backend')) {
      unique.push(...['Node.js', 'SQL', 'REST API'].filter(t => !unique.includes(t)));
    } else {
      unique.push(...['JavaScript', '\uC790\uB8CC\uAD6C\uC870/\uC54C\uACE0\uB9AC\uC998', 'Git'].filter(t => !unique.includes(t)));
    }
  }

  return unique.slice(0, 5);
}
