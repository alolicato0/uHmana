import Constants from 'expo-constants';

// Versione app (da app.json) + etichetta build che incremento ad ogni OTA.
// Serve a verificare a colpo d'occhio quando un OTA è arrivato sul dispositivo.
export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';
export const BUILD_LABEL = 'R24';

export const VERSION_STRING = `v${APP_VERSION} · BUILD ${BUILD_LABEL}`;
