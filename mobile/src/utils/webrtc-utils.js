import { Platform, NativeModules } from 'react-native';

/**
 * Checks if the WebRTC native module is available in the current environment.
 * Helps prevent crashes on Expo Go where these modules are naturally absent.
 */
export const isWebRTCSupported = () => {
  try {
    // If we're on web, we use browser WebRTC (if available)
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' && !!window.RTCPeerConnection;
    }

    // On native, we check for NativeModules.WebRTCModule directly.
    // This is the most reliable way to check for support without triggering 
    // the library's internal "prototype" crash during require().
    return !!NativeModules.WebRTCModule;
  } catch (e) {
    return false;
  }
};
