import { Config } from "@remotion/cli/config";

// Vale para `npm run render` y para el botón de render de Studio.
// Calidad alta para vídeo vertical en redes: fotogramas en PNG, H.264, color BT.709 y audio a 320k.
// RELLENA: ajusta CRF y preset a tu equipo y a tu plataforma.
Config.setOverwriteOutput(true);
Config.setVideoImageFormat("png");
Config.setCodec("h264");
Config.setCrf(18);
Config.setPixelFormat("yuv420p");
Config.setColorSpace("bt709");
Config.setAudioBitrate("320k");
