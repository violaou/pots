import { Construction, Instagram } from 'lucide-react'

export const UnderConstruction = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-soft-white ">
      <Construction className="w-16 h-16 text-gray-400 mb-6" />
      <h1 className="text-2xl font-medium text-gray-900 mb-3 text-center">
        Portfolio Coming Soon
      </h1>
      <p className="text-gray-600 mb-8 text-center max-w-md">
        Hi there! I'm still working on this - so in the meantime, check out my
        stuff on Instagram!
      </p>
      <a
        href="https://www.instagram.com/viola.pots/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors"
      >
        <Instagram className="w-5 h-5 mr-2" />
        Follow on Instagram
      </a>
    </div>
  )
}
