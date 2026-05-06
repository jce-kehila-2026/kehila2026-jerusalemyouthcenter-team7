import { Platform } from 'react-native';

export const AppColors = {
  primary: '#0a7ea4',
  primaryDark: '#086d8e',
  primaryLight: '#e8f4f8',
  secondary: '#FF6B35',
  success: '#28a745',
  successLight: '#d4edda',
  warning: '#ffc107',
  warningLight: '#fff3cd',
  danger: '#dc3545',
  dangerLight: '#f8d7da',
  purple: '#6f42c1',
  purpleLight: '#e8e0f5',
};

export const Colors = {
  light: {
    text: '#11181C',
    subtext: '#687076',
    background: '#f4f6f8',
    card: '#ffffff',
    border: '#e0e4e8',
    tint: AppColors.primary,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: AppColors.primary,
  },
  dark: {
    text: '#ECEDEE',
    subtext: '#9BA1A6',
    background: '#151718',
    card: '#1e2022',
    border: '#2a2d2e',
    tint: '#ffffff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#ffffff',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
