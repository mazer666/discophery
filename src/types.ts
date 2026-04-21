export interface FeedConfig {
  id: string;
  name: string;
  url: string;
  category: string;
  language: string;
  enabled: boolean;
  type?: string;        // 'html' = server-side scrape, kein direkter Browser-Fetch
  fallbackUrl?: string;
}

export interface CategoryStyle {
  bg: string;
  text: string;
}

export interface DiscopheryArticle {
  id: string;
  title: string;
  url: string;
  image: string | null;
  description: string;
  source: string;
  sourceId: string;
  category: string;
  date: Date;
  dismissed: boolean;
}
