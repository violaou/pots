# Viola Pots - Project Guidelines

A React + TypeScript pottery portfolio application with Vercel and Supabase backend.

## 🏗️ Architecture Overview

This is a client-side React application built with:
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Vercel and Supabase
- **Deployment**: Vercel

---

## 📁 File Structure & Naming Conventions

### Directory Structure
```
src/
├── components/          # Reusable UI components
├── pages/              # Route-level components
├── contexts/           # React contexts (auth, theme, etc.)
├── services/           # External service integrations
├── utils/              # Pure utility functions
├── assets/             # Static assets (images, fonts)
└── types.ts            # Global TypeScript definitions
```

### Naming Conventions
- **Directories**: lowercase with dashes (`auth-wizard`, `artwork-grid`)
- **Components**: PascalCase files with named exports (`ArtworkDetail.tsx`)
- **Services**: camelCase with service suffix (`authService.ts`)
- **Utilities**: descriptive names with auxiliary verbs (`formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE in dedicated files

---

## ⚛️ React & TypeScript Patterns

### Component Structure
```typescript
// 1. Imports (React, libraries, local)
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { ArtworkCard } from './ArtworkCard'

// 2. Interface definitions
interface ArtworkGridProps {
  artworks: Artwork[]
  isLoading?: boolean
}

// 3. Static content (outside render)
const emptyStateMessage = "No artworks found. Check back soon!"

// 4. Main component (function keyword)
function ArtworkGrid({ artworks, isLoading = false }: ArtworkGridProps) {
  // Early returns for error conditions
  if (isLoading) return <LoadingSpinner />
  if (!artworks.length) return <EmptyState message={emptyStateMessage} />

  // Happy path logic
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {artworks.map(artwork => (
        <ArtworkCard key={artwork.id} artwork={artwork} />
      ))}
    </div>
  )
}

// 5. Named export
export { ArtworkGrid }
```

### TypeScript Guidelines
- Use `interface` over `type` for object shapes
- Avoid `enum`, use const maps instead
- Define props interfaces in the same file as components
- Use strict type checking for Supabase data

### Error Handling Pattern
```typescript
// For expected errors, return error objects instead of throwing
async function createBlogPost(data: BlogPostData) {
  // Early validation
  const validation = validateBlogPost(data)
  if (!validation.success) {
    return { error: validation.error, data: null }
  }

  try {
    const result = await blogService.create(data)
    return { error: null, data: result }
  } catch (error) {
    console.error('Failed to create blog post:', error)
    return { error: 'Failed to create post. Please try again.', data: null }
  }
}
```

---

## 🔥 Supabase Integration

### Service Organization
- **authService.ts**: Authentication operations
- **blogService.ts**: Blog CRUD operations
- **imageService.ts**: Image upload/management
- **config.ts**: Supabase configuration

### Data Fetching Pattern
```typescript
// Use React Query or SWR for data fetching
function useArtworks() {
  return useQuery({
    queryKey: ['artworks'],
    queryFn: () => artworkService.getAll(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}
```

### Authentication Context
- Centralize auth state in `AuthContext`
- Provide auth helpers and user data
- Handle loading states consistently

---

## 🎨 Styling Guidelines

### Tailwind CSS Patterns
```typescript
// Component-specific styles object for complex styling
const styles = {
  container: "max-w-4xl mx-auto px-4 py-12",
  heading: "text-3xl font-bold mb-8 text-gray-900",
  card: "bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow",
  button: {
    primary: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-md"
  }
}
```

### Responsive Design
- Mobile-first approach
- Use Tailwind breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- Test on actual devices, especially for artwork viewing

### Color Palette
- Primary: Warm, earthy tones reflecting pottery aesthetic
- Maintain accessibility contrast ratios
- Define custom colors in `tailwind.config.js`

---

## 🔒 Security & Performance

### Authentication
- Protect admin routes with `ProtectedRoute` component
- Validate user permissions on both client and server
- Use Supabase Auth security rules

### Image Handling
- Optimize images before upload (WebP format preferred)
- Implement progressive loading for artwork gallery
- Use Supabase Storage security rules

### Performance
- Lazy load components with `React.lazy()`
- Implement virtual scrolling for large artwork collections
- Optimize bundle size with tree shaking

---

## 📝 Content Management

### Blog Posts
- Support rich text editing (consider React Quill or similar)
- Implement draft/publish workflow
- Add SEO meta tags for published posts

### Artwork Management
- Batch upload capability for new collections
- Image variants for different display contexts
- Metadata management (dimensions, materials, price)

---

## 🧪 Testing Strategy

### Unit Tests
- Test utility functions comprehensively
- Mock Firebase services in tests
- Focus on business logic over UI details

### Integration Tests
- Test complete user flows (viewing artwork, contact form)
- Mock external services appropriately
- Use React Testing Library patterns

---

## 🚀 Build & Deployment

### Environment Configuration
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
# ... other Supabase config
```

### Build Process
- Run TypeScript checks before build
- Optimize assets during build
- Generate source maps for debugging

### Deployment Checklist
- [ ] Run linting and type checking
- [ ] Test critical user flows
- [ ] Verify environment variables
- [ ] Check Supabase security rules
- [ ] Test on multiple devices/browsers

---

## 🛠️ Development Workflow

### Git Conventions
- Feature branches: `feature/artwork-detail-page`
- Bug fixes: `fix/authentication-redirect`
- Hotfixes: `hotfix/production-image-loading`

### Code Quality
- Use ESLint + Prettier for consistent formatting
- Pre-commit hooks for linting and type checking
- Regular dependency updates

### Local Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # Run TypeScript checks
npm run lint         # Run ESLint
```

---

## 📋 Content Guidelines

### Artwork Descriptions
- concise and terse
- Include the materials and clay as being fired to cone 6
- Include if the piece is microwavable
- Made in Toronto, Canada

### Blog Content
- Share pottery process and techniques
- Behind-the-scenes studio content
- Artist journey and inspiration stories

### SEO Considerations
- Descriptive alt text for all artwork images (if not provided, use the title)
- Structured data for artwork and blog posts
- Clean URLs and meta descriptions

---

## 🎯 Key Principles

1. **User Experience First**: Prioritize artwork viewing experience
2. **Performance Matters**: Fast loading times for image-heavy content
3. **Mobile Responsive**: Many users browse art on mobile devices
4. **Accessibility**: Ensure content is accessible to all users
5. **Maintainable Code**: Write code that future you will thank you for
6. **Security Conscious**: Protect user data and admin functions

---

## 📚 Resources

- [React TypeScript Patterns](https://react-typescript-cheatsheet.netlify.app/)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

*Last updated: August 2025*
