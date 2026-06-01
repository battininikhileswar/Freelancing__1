import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'light',
      language: 'en',

      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light';
        set({ theme: newTheme });
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
      },

      initTheme: () => {
        const { theme } = get();
        document.documentElement.classList.toggle('dark', theme === 'dark');
      },

      setLanguage: (lang) => set({ language: lang }),
    }),
    { name: 'grievance-theme' }
  )
);

export default useThemeStore;
