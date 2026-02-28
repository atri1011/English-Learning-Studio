import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UIState {
  theme: "light" | "dark"
  toggleTheme: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: "light",
      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light"
        document.documentElement.classList.toggle("dark", next === "dark")
        set({ theme: next })
      },
    }),
    {
      name: "ui-store",
      onRehydrateStorage: () => (state) => {
        if (state?.theme === "dark") {
          document.documentElement.classList.add("dark")
        }
      },
    },
  ),
)
