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
