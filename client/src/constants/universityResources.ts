export interface ResourceItem {
  name: string;
  desc: string;
  link?: string;
  phone?: string;
}

export interface ResourceCategory {
  icon: string;
  label: string;
  items: ResourceItem[];
}

export const UNIVERSITY_RESOURCES: Record<string, ResourceCategory> = {
  stress: {
    icon: '💚',
    label: 'Mental Health & Stress',
    items: [
      { name: 'MDX Student Wellbeing', desc: 'Counselling and mental health support', link: 'https://www.mdx.ac.uk/student-life/support/wellbeing' },
      { name: 'Student Space', desc: 'Free mental health platform for UK students', link: 'https://studentspace.org.uk' },
      { name: 'Shout Crisis Text Line', desc: 'Text HELLO to 85258 — free 24/7', phone: '85258' },
    ],
  },
  focus: {
    icon: '🎯',
    label: 'Focus & Study Skills',
    items: [
      { name: 'MDX Study Skills Hub', desc: 'Academic writing, note-taking and revision guides', link: 'https://www.mdx.ac.uk/study-at-mdx/student-support/study-skills' },
      { name: 'MDX Library', desc: 'Research support, study spaces and e-resources', link: 'https://www.mdx.ac.uk/library' },
      { name: 'UniAdvisor', desc: 'Peer-to-peer academic advice', link: 'https://www.mdxsu.com/advice' },
    ],
  },
  sleep: {
    icon: '😴',
    label: 'Sleep & Rest',
    items: [
      { name: 'MDX Wellbeing Workshops', desc: 'Sleep hygiene and relaxation sessions', link: 'https://www.mdx.ac.uk/student-life/support/wellbeing' },
      { name: 'Sleepstation', desc: 'Evidence-based sleep improvement programme (free for students)', link: 'https://www.sleepstation.org.uk' },
    ],
  },
  motivation: {
    icon: '⚡',
    label: 'Motivation & Goals',
    items: [
      { name: 'MDX Careers & Employability', desc: 'Academic and career coaching sessions', link: 'https://www.mdx.ac.uk/study-at-mdx/student-support/careers' },
      { name: 'MDX Student Union', desc: 'Peer support, societies and student groups', link: 'https://www.mdxsu.com' },
    ],
  },
  burnout: {
    icon: '🔋',
    label: 'Burnout & Recovery',
    items: [
      { name: 'MDX Counselling', desc: 'One-to-one sessions with trained counsellors', link: 'https://www.mdx.ac.uk/student-life/support/wellbeing/counselling' },
      { name: 'Samaritans', desc: 'Confidential listening, 24/7 — call free', phone: '116 123', link: 'https://www.samaritans.org' },
      { name: 'MIND', desc: 'National mental health charity with online tools', link: 'https://www.mind.org.uk' },
    ],
  },
  general: {
    icon: '🤝',
    label: 'General Student Support',
    items: [
      { name: 'MDX Student Hub', desc: 'Central support for all student queries', link: 'https://www.mdx.ac.uk/student-life/support' },
      { name: 'MDX Student Union Advice', desc: 'Independent, free, confidential advice', link: 'https://www.mdxsu.com/advice' },
      { name: 'Student Minds', desc: 'UK student mental health charity', link: 'https://www.studentminds.org.uk' },
    ],
  },
};
