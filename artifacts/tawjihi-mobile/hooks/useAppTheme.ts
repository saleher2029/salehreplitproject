import { useTheme } from "@/context/ThemeContext";
import Colors from "@/constants/colors";

export function useAppTheme() {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  return { isDark, C, effectiveTheme };
}
