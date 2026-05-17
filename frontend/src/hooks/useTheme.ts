import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) ?? 'dark'
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggle() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggle }
}
