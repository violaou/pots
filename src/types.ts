export interface ArtworkItem {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
  year: number;
  medium: string;
  dimensions: string;
  price?: string;
  altText?: string;
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

// New shared interfaces for artwork service (Phase 1)
export interface ArtworkImage {
  id: string
  artworkId: string
  imageUrl: string
  alt?: string
  sortOrder: number
  isHero: boolean
  createdAt: string
}

export interface Artwork {
  id: string
  slug: string
  title: string
  description?: string
  materials?: string
  clay?: string
  cone?: number
  altText?: string
  isMicrowaveSafe: boolean
  createdAt: string
  updatedAt: string
  images: ArtworkImage[]
}

export interface ArtworkListItem {
  id: string
  slug: string
  title: string
  heroImageUrl: string
}
