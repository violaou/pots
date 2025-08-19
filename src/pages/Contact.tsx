import '@fillout/react/style.css'

import { FilloutStandardEmbed } from '@fillout/react'

const filloutId = import.meta.env.VITE_FILLOUT_ID as string

export const Contact = () => (
  <section className=" md:mb-16 h-[600px] lg:h-[700px]">
    <FilloutStandardEmbed filloutId={filloutId} />
  </section>
)
