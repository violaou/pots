import { Link } from 'react-router-dom'

import { theme } from '../styles/theme'

export const BackToBlog = (
  <Link to="/blog" className={`${theme.backLink} mb-4 inline-block`}>
    ← Back to Blog
  </Link>
)
