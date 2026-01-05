import { Logo, NavActions, NavLinks, ThemeToggle } from './nav'

const styles = {
  container:
    'fixed left-0 top-0 h-screen w-64 p-8 hidden lg:flex lg:flex-col select-none',
  nav: 'space-y-4',
  themeToggle:
    'mt-auto text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
} as const

export default function Sidebar() {
  return (
    <div className={styles.container}>
      <div className="mb-12">
        <Logo />
      </div>

      <nav className={styles.nav}>
        <NavLinks />
        <NavActions />
      </nav>

      <ThemeToggle className={styles.themeToggle} />
    </div>
  )
}
