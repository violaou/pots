export interface ArtworkItem {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
  year: number;
  medium: string;
  dimensions: string;
  price?: string;
}

export interface NavItem {
  path: string
  label: string
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  imageUrl?: string;
  tags?: string[];
}
