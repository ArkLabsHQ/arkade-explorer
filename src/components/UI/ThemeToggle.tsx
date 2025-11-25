import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
  }

  const className = resolvedTheme === 'light' ? 'text-arkade-purple' : 'text-arkade-white'

  return (
    <button
      onClick={toggleTheme}
      className={`cursor-pointer p-2 ${className} hover:text-arkade-orange transition-colors`}
      aria-label='Toggle theme'
      title={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}>
      {resolvedTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  )
}
