import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db } from './config'
import type { BlogPost } from '../types'

const BLOG_POSTS_COLLECTION = 'blogPosts'

export async function createBlogPost(post: Omit<BlogPost, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, BLOG_POSTS_COLLECTION), {
    ...post,
    date: Timestamp.fromDate(new Date(post.date))
  })
  return docRef.id
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const q = query(
    collection(db, BLOG_POSTS_COLLECTION),
    orderBy('date', 'desc')
  )
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate().toISOString().split('T')[0]
  })) as BlogPost[]
}

export async function getBlogPost(id: string): Promise<BlogPost | null> {
  const docRef = doc(db, BLOG_POSTS_COLLECTION, id)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) {
    return null
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
    date: docSnap.data().date.toDate().toISOString().split('T')[0]
  } as BlogPost
}