import { Platform } from 'react-native';

export const C = {
  bg: '#f0ece4',
  surface: '#faf7f1',
  surface2: '#e8e2d6',
  border: '#ddd5c7',
  ink: '#2b2722',
  muted: '#7a7268',
  savorer: '#c0644e',
  savorerTint: 'rgba(192,100,78,0.12)',
  steward: '#5f7a5a',
  stewardTint: 'rgba(95,122,90,0.14)',
};

export const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const R = { sm: 4, md: 8, lg: 12, xl: 16, full: 999 };

export const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });

export const roleColor = (role) => (role === 'savorer' ? C.savorer : C.steward);
export const roleTint = (role) => (role === 'savorer' ? C.savorerTint : C.stewardTint);
