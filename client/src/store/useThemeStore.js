import { create } from "zustand";

export const useThemeStore = create((set) => ({
  darkMode: localStorage.getItem("theme") === "dark",

  toggleTheme: () =>
    set((state) => {
      const newMode = !state.darkMode;
      localStorage.setItem("theme", newMode ? "dark" : "light");

      if (newMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      return { darkMode: newMode };
    }),
}));