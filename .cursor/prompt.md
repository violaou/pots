# Artist Portfolio & Blog

This is a React-based web application that serves as both an artist portfolio and a blog platform. The application is built with TypeScript and uses modern web technologies.

## Core Features

### Portfolio Gallery
- Displays a grid of artwork pieces
- Detailed view for individual artworks
- Responsive layout with sidebar navigation
- Development/Staging mode toggle for content visibility

### Blog System
- Blog post listing page
- Individual blog post view
- Protected route for creating new blog posts
- Authentication required for content creation

### Authentication
- User login functionality
- Protected routes for authenticated content
- Supabase authentication with Google provider.

### Layout & Navigation
- TopBar for main navigation
- Sidebar for additional navigation options
- Responsive design with mobile considerations
- Main content area with proper spacing and layout

## Technical Stack
- React with TypeScript
- React Router for navigation
- Supabase for authentication
- Supabase Postgres for database.
- Vercel for backend
- Vite as the build tool
- CSS for styling (likely with Tailwind CSS based on class names)

## Development Notes
- The application has a development/staging mode toggle
- Protected routes are implemented for authenticated features
- Component-based architecture with clear separation of concerns
- Type definitions are centralized in types.ts
- Vercel and Supabase for backend services

## Project Structure
- `/src/components` - Reusable UI components
- `/src/pages` - Main page components
- `/src/contexts` - React context providers
- `/src/assets` - Static assets and data
- `/src/types.ts` - Global TypeScript definitions

## Best Practices
- TypeScript for type safety
- Component-based architecture
- Protected routes for authenticated content
- Environment-aware development features
- Centralized type definitions
- Modular file structure