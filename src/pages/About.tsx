import violaPotsLogo from '../assets/viola-pots.png'

export const About = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">
        About the Artist
      </h1>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="md:col-span-1">
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            {/* TODO: I need a headshot */}
            <div className="w-full h-full flex items-center justify-center p-2 ">
              <img src={violaPotsLogo} alt="Viola Pots" />
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Hi there! 👋 I'm Viola
          </h2>
          <p className="text-gray-700 mb-4">
            I'm a ceramic artist based in Toronto, Canada, specializing in
            handcrafted pottery that combines my background in painting with
            Chinese design elements with contemporary design. Each piece is
            thoughtfully created to bring both beauty and function to everyday
            life.
          </p>
          <p className="text-gray-700">
            My work is inspired by hand painted and raw textures with highly
            functional design. I believe in creating pieces that invite touch
            and effortlessly fit into the flow of daily life.
          </p>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Approach & Process
        </h2>
        <p className="text-gray-700 mb-4">
          Working primarily with stoneware and porcelain clays, I create pieces
          that emphasize organic forms and subtle, earthy glazes. My process
          combines wheel-throwing and hand-building techniques.
        </p>
        <p className="text-gray-700">
          The unpredictability of this process ensures that each creation is
          truly one-of-a-kind.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Experience</h2>
        <ul className="space-y-2 text-gray-700">
          <li>• Member of Pot Pot Studio</li>
        </ul>
      </div>
    </div>
  )
}

export default About
