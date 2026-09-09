export type Region = 'intl' | 'cn';
export type Category = 'student' | 'platform' | 'vendor' | 'startup' | 'gov' | 'web3' | 'vertical';
export type Format = 'online' | 'hybrid' | 'onsite';
export type Frequency = 'annual' | 'biannual' | 'quarterly' | 'monthly' | 'oneoff';
export type Friendly = 'yes' | 'no' | 'unknown';

export interface Edition {
  year: number;
  dates: string;
  url: string;
  note: string;
}

export interface Winner {
  year: number;
  project: string;
  team: string | null;
  what: string;
  why: string;
  url: string | null;
}

export interface Hackathon {
  id: string;
  name: string;
  nameCn: string;
  org: string;
  region: Region;
  category: Category;
  theme: string;
  description: string;
  requirements: string;
  format: Format;
  location: string;
  prize: string;
  frequency: Frequency;
  typicalMonths: number[];
  url: string;
  soloAllowed: boolean;
  cnFriendly: Friendly;
  editions: Edition[];
  years: number[];
  winners: Winner[];
  _confidence: 'high' | 'medium' | 'low';
  source_file: string;
}

export interface UpcomingItem {
  id: string;
  name: string;
  org: string;
  region: Region;
  deadline: string;
  window: string;
  format: Format;
  prize: string;
  theme: string;
  solo: boolean;
  cnFriendly: Friendly;
  url: string;
  note: string;
}

export interface UpcomingFile {
  updatedAt: string;
  nextUpdate: string;
  sources: string[];
  items: UpcomingItem[];
}
