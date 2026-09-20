import { cubicBezier, Easing } from 'react-native-reanimated';

// Curvas do web (150-180 ms em toques, 200 ms em modais); ease-out forte em
// entradas, curva de folha do iOS em sheets.
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);
export const CSS_EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

export const PRESS_MS = 120;
export const STEP_MS = 220;
export const SHEET_MS = 280;
