// ─── API Configuration ────────────────────────────────────────────────────────
// Change BASE_URL to your server IP when running on a real device/emulator
// For Android emulator: use 10.0.2.2 instead of localhost
// For Expo Go on device: use your machine's local IP e.g. http://192.168.1.10

export const BASE_URL = 'http://192.168.1.90'; // Wi-Fi IP for real device (Expo Go)

export const USER_API  = `${BASE_URL}:5001/api/auth`;
export const CHAT_API  = `${BASE_URL}:8000`;
export const WS_BASE   = `ws://${BASE_URL.replace('http://', '')}:8000`;
