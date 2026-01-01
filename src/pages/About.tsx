import { Link } from 'react-router-dom'
import { theme } from '../styles/theme'

export function About() {
  return (
    <div className={theme.layout.container}>
      <h1 className={theme.text.h1}>About</h1>

      <div className="mb-12">
        <h2 className={theme.text.h2}>Hi there! 👋 I'm Viola</h2>
        <p className={`${theme.text.body} mb-4`}>
          I'm a ceramic artist based in Toronto, Canada, specializing in
          handcrafted pottery that combines my background in painting with
          Chinese design elements with contemporary design. Each piece is
          thoughtfully created to bring both beauty and function to everyday
          life.
        </p>
        <p className={theme.text.body}>
          My work is inspired by hand painted and raw textures with highly
          functional design. I believe in creating pieces that invite touch and
          effortlessly fit into the flow of daily life.
        </p>
        <Link
          to="/gallery"
          className={`mt-6 inline-block ${theme.button.accent}`}
        >
          View Gallery
        </Link>
      </div>

      <div className="mb-12">
        <h2 className={theme.text.h2}>Approach & Process</h2>
        <p className={`${theme.text.body} mb-4`}>
          Working primarily with stoneware and porcelain clays, I create pieces
          that emphasize organic forms and subtle, earthy glazes. My process
          combines wheel-throwing and hand-building techniques.
        </p>
        <p className={theme.text.body}>
          The unpredictability of this process ensures that each creation is
          truly one-of-a-kind.
        </p>
      </div>

      <div>
        <h2 className={theme.text.h2}>Experience</h2>
        <ul className={`space-y-2 ${theme.text.body}`}>
          <li>• Member of Pot Pot Studio</li>
        </ul>
      </div>
    </div>
  )
}

export default About
