/**
 * Service to fetch and manage roadmaps from roadmap.sh
 * Since roadmap.sh doesn't have a public API, we use a curated list
 */

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  category: 'role' | 'skill' | 'beginner';
  url: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Get all available roadmaps from roadmap.sh
 * This is a curated list based on popular roadmaps from roadmap.sh
 */
export async function getAvailableRoadmaps(): Promise<RoadmapItem[]> {
  // Curated list of popular roadmaps from roadmap.sh
  const roadmaps: RoadmapItem[] = [
    // Role-based roadmaps
    {
      id: 'frontend',
      title: 'Frontend Developer',
      description: 'Step by step guide to becoming a modern frontend developer',
      category: 'role',
      url: 'https://roadmap.sh/frontend',
      tags: ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'Angular'],
      difficulty: 'beginner',
    },
    {
      id: 'backend',
      title: 'Backend Developer',
      description: 'Step by step guide to becoming a modern backend developer',
      category: 'role',
      url: 'https://roadmap.sh/backend',
      tags: ['Node.js', 'Python', 'Java', 'Database', 'API'],
      difficulty: 'beginner',
    },
    {
      id: 'fullstack',
      title: 'Full Stack Developer',
      description: 'Step by step guide to becoming a full stack developer',
      category: 'role',
      url: 'https://roadmap.sh/full-stack',
      tags: ['Frontend', 'Backend', 'DevOps', 'Database'],
      difficulty: 'intermediate',
    },
    {
      id: 'devops',
      title: 'DevOps',
      description: 'Step by step guide to becoming a DevOps engineer',
      category: 'role',
      url: 'https://roadmap.sh/devops',
      tags: ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Linux'],
      difficulty: 'intermediate',
    },
    {
      id: 'android',
      title: 'Android Developer',
      description: 'Step by step guide to becoming an Android developer',
      category: 'role',
      url: 'https://roadmap.sh/android',
      tags: ['Kotlin', 'Java', 'Android Studio', 'Material Design'],
      difficulty: 'beginner',
    },
    {
      id: 'ios',
      title: 'iOS Developer',
      description: 'Step by step guide to becoming an iOS developer',
      category: 'role',
      url: 'https://roadmap.sh/ios',
      tags: ['Swift', 'SwiftUI', 'Xcode', 'UIKit'],
      difficulty: 'beginner',
    },
    {
      id: 'qa',
      title: 'QA Engineer',
      description: 'Step by step guide to becoming a QA engineer',
      category: 'role',
      url: 'https://roadmap.sh/qa',
      tags: ['Testing', 'Automation', 'Selenium', 'Cypress'],
      difficulty: 'beginner',
    },
    {
      id: 'ml',
      title: 'Machine Learning Engineer',
      description: 'Step by step guide to becoming a machine learning engineer',
      category: 'role',
      url: 'https://roadmap.sh/ml-engineer',
      tags: ['Python', 'TensorFlow', 'PyTorch', 'Data Science'],
      difficulty: 'advanced',
    },
    {
      id: 'ai',
      title: 'AI Engineer',
      description: 'Step by step guide to becoming an AI engineer',
      category: 'role',
      url: 'https://roadmap.sh/ai-engineer',
      tags: ['AI', 'ML', 'Deep Learning', 'NLP'],
      difficulty: 'advanced',
    },
    {
      id: 'blockchain',
      title: 'Blockchain Developer',
      description: 'Step by step guide to becoming a blockchain developer',
      category: 'role',
      url: 'https://roadmap.sh/blockchain',
      tags: ['Solidity', 'Ethereum', 'Web3', 'Smart Contracts'],
      difficulty: 'intermediate',
    },
    {
      id: 'cybersecurity',
      title: 'Cyber Security',
      description: 'Step by step guide to becoming a cybersecurity expert',
      category: 'role',
      url: 'https://roadmap.sh/cyber-security',
      tags: ['Security', 'Penetration Testing', 'Network Security'],
      difficulty: 'intermediate',
    },
    // Skill-based roadmaps
    {
      id: 'react',
      title: 'React',
      description: 'Step by step guide to learning React',
      category: 'skill',
      url: 'https://roadmap.sh/react',
      tags: ['React', 'JavaScript', 'Frontend'],
      difficulty: 'beginner',
    },
    {
      id: 'vue',
      title: 'Vue',
      description: 'Step by step guide to learning Vue.js',
      category: 'skill',
      url: 'https://roadmap.sh/vue',
      tags: ['Vue', 'JavaScript', 'Frontend'],
      difficulty: 'beginner',
    },
    {
      id: 'angular',
      title: 'Angular',
      description: 'Step by step guide to learning Angular',
      category: 'skill',
      url: 'https://roadmap.sh/angular',
      tags: ['Angular', 'TypeScript', 'Frontend'],
      difficulty: 'intermediate',
    },
    {
      id: 'nodejs',
      title: 'Node.js',
      description: 'Step by step guide to learning Node.js',
      category: 'skill',
      url: 'https://roadmap.sh/nodejs',
      tags: ['Node.js', 'JavaScript', 'Backend'],
      difficulty: 'beginner',
    },
    {
      id: 'python',
      title: 'Python',
      description: 'Step by step guide to learning Python',
      category: 'skill',
      url: 'https://roadmap.sh/python',
      tags: ['Python', 'Programming', 'Backend'],
      difficulty: 'beginner',
    },
    {
      id: 'java',
      title: 'Java',
      description: 'Step by step guide to learning Java',
      category: 'skill',
      url: 'https://roadmap.sh/java',
      tags: ['Java', 'Programming', 'Backend'],
      difficulty: 'beginner',
    },
    {
      id: 'go',
      title: 'Go',
      description: 'Step by step guide to learning Go',
      category: 'skill',
      url: 'https://roadmap.sh/golang',
      tags: ['Go', 'Programming', 'Backend'],
      difficulty: 'intermediate',
    },
    {
      id: 'rust',
      title: 'Rust',
      description: 'Step by step guide to learning Rust',
      category: 'skill',
      url: 'https://roadmap.sh/rust',
      tags: ['Rust', 'Programming', 'Systems'],
      difficulty: 'advanced',
    },
    {
      id: 'docker',
      title: 'Docker',
      description: 'Step by step guide to learning Docker',
      category: 'skill',
      url: 'https://roadmap.sh/docker',
      tags: ['Docker', 'DevOps', 'Containers'],
      difficulty: 'beginner',
    },
    {
      id: 'kubernetes',
      title: 'Kubernetes',
      description: 'Step by step guide to learning Kubernetes',
      category: 'skill',
      url: 'https://roadmap.sh/kubernetes',
      tags: ['Kubernetes', 'DevOps', 'Orchestration'],
      difficulty: 'intermediate',
    },
    {
      id: 'aws',
      title: 'AWS',
      description: 'Step by step guide to learning AWS',
      category: 'skill',
      url: 'https://roadmap.sh/aws',
      tags: ['AWS', 'Cloud', 'DevOps'],
      difficulty: 'intermediate',
    },
    {
      id: 'sql',
      title: 'SQL',
      description: 'Step by step guide to learning SQL',
      category: 'skill',
      url: 'https://roadmap.sh/sql',
      tags: ['SQL', 'Database', 'Backend'],
      difficulty: 'beginner',
    },
    {
      id: 'mongodb',
      title: 'MongoDB',
      description: 'Step by step guide to learning MongoDB',
      category: 'skill',
      url: 'https://roadmap.sh/mongodb',
      tags: ['MongoDB', 'Database', 'NoSQL'],
      difficulty: 'beginner',
    },
    {
      id: 'graphql',
      title: 'GraphQL',
      description: 'Step by step guide to learning GraphQL',
      category: 'skill',
      url: 'https://roadmap.sh/graphql',
      tags: ['GraphQL', 'API', 'Backend'],
      difficulty: 'intermediate',
    },
    {
      id: 'git',
      title: 'Git and GitHub',
      description: 'Step by step guide to learning Git and GitHub',
      category: 'skill',
      url: 'https://roadmap.sh/git',
      tags: ['Git', 'Version Control', 'Tools'],
      difficulty: 'beginner',
    },
    {
      id: 'typescript',
      title: 'TypeScript',
      description: 'Step by step guide to learning TypeScript',
      category: 'skill',
      url: 'https://roadmap.sh/typescript',
      tags: ['TypeScript', 'JavaScript', 'Frontend'],
      difficulty: 'beginner',
    },
    {
      id: 'system-design',
      title: 'System Design',
      description: 'Step by step guide to learning system design',
      category: 'skill',
      url: 'https://roadmap.sh/system-design',
      tags: ['Architecture', 'Design', 'Backend'],
      difficulty: 'advanced',
    },
    {
      id: 'computer-science',
      title: 'Computer Science',
      description: 'Step by step guide to learning computer science fundamentals',
      category: 'skill',
      url: 'https://roadmap.sh/computer-science',
      tags: ['Algorithms', 'Data Structures', 'Fundamentals'],
      difficulty: 'beginner',
    },
    // Beginner roadmaps
    {
      id: 'frontend-beginner',
      title: 'Frontend Beginner',
      description: 'Beginner-friendly frontend development roadmap',
      category: 'beginner',
      url: 'https://roadmap.sh/frontend?r=frontend-beginner',
      tags: ['HTML', 'CSS', 'JavaScript', 'Beginner'],
      difficulty: 'beginner',
    },
    {
      id: 'backend-beginner',
      title: 'Backend Beginner',
      description: 'Beginner-friendly backend development roadmap',
      category: 'beginner',
      url: 'https://roadmap.sh/backend?r=backend-beginner',
      tags: ['Programming', 'API', 'Database', 'Beginner'],
      difficulty: 'beginner',
    },
    {
      id: 'devops-beginner',
      title: 'DevOps Beginner',
      description: 'Beginner-friendly DevOps roadmap',
      category: 'beginner',
      url: 'https://roadmap.sh/devops?r=devops-beginner',
      tags: ['Linux', 'Docker', 'CI/CD', 'Beginner'],
      difficulty: 'beginner',
    },
  ];

  return roadmaps;
}

/**
 * Get roadmaps by category
 */
export async function getRoadmapsByCategory(category: 'role' | 'skill' | 'beginner' | 'all'): Promise<RoadmapItem[]> {
  const roadmaps = await getAvailableRoadmaps();
  if (category === 'all') return roadmaps;
  return roadmaps.filter((r) => r.category === category);
}

/**
 * Search roadmaps by query
 */
export async function searchRoadmaps(query: string): Promise<RoadmapItem[]> {
  const roadmaps = await getAvailableRoadmaps();
  const lowerQuery = query.toLowerCase();
  return roadmaps.filter(
    (r) =>
      r.title.toLowerCase().includes(lowerQuery) ||
      r.description.toLowerCase().includes(lowerQuery) ||
      r.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get roadmap by ID
 */
export async function getRoadmapById(id: string): Promise<RoadmapItem | null> {
  const roadmaps = await getAvailableRoadmaps();
  return roadmaps.find((r) => r.id === id) || null;
}

