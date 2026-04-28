import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('korus-theme') ?? 'dark')

  useEffect(() => {
    const html = document.documentElement
    if (theme === 'light') {
      html.classList.add('light')
    } else {
      html.classList.remove('light')
    }
    localStorage.setItem('korus-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

// Returns the correct set of colors for current theme
export function useThemeColors() {
  const { theme } = useTheme()
  const dark = {
    bg:           'rgba(255,255,255,0.03)',
    bgCard:       'rgba(255,255,255,0.02)',
    bgSubtle:     'rgba(255,255,255,0.05)',
    border:       'rgba(255,255,255,0.08)',
    borderSubtle: 'rgba(255,255,255,0.05)',
    text:         '#f1f5f9',
    textSub:      '#cbd5e1',
    textMuted:    'rgba(148,163,184,0.6)',
    textFaint:    'rgba(148,163,184,0.4)',
    divider:      'rgba(255,255,255,0.1)',
    selectBg:     'rgba(255,255,255,0.05)',
    selectBorder: 'rgba(255,255,255,0.1)',
    selectColor:  '#94a3b8',
    progressTrack:'rgba(255,255,255,0.08)',
  }
  const light = {
    bg:           'rgba(0,0,0,0.02)',
    bgCard:       'rgba(0,0,0,0.02)',
    bgSubtle:     'rgba(0,0,0,0.05)',
    border:       'rgba(0,0,0,0.10)',
    borderSubtle: 'rgba(0,0,0,0.06)',
    text:         '#0f172a',
    textSub:      '#1e293b',
    textMuted:    '#475569',
    textFaint:    '#64748b',
    divider:      'rgba(0,0,0,0.10)',
    selectBg:     '#ffffff',
    selectBorder: 'rgba(0,0,0,0.15)',
    selectColor:  '#1e293b',
    progressTrack:'rgba(0,0,0,0.08)',
  }
  return theme === 'light' ? light : dark
}
