import JSZip from 'jszip';

/**
 * Generates an honest, ready-to-build Android APK / TWA & Capacitor packaging kit
 * plus standalone deployment instructions so LEIA can run completely independent of Google AI Studio.
 */
export async function downloadAndroidApkKit(appUrl: string): Promise<void> {
  const cleanUrl = appUrl.replace(/\/$/, '');
  const hostname = (() => {
    try {
      return new URL(cleanUrl).hostname;
    } catch {
      return 'leia-educativa.app';
    }
  })();

  const isStudioPreviewUrl =
    hostname.includes('ais-dev-') || hostname.includes('ais-pre-');

  const zip = new JSZip();

  const capacitorConfig = {
    appId: 'edu.leia.lectura',
    appName: 'LEIA - Lectora Educativa',
    webDir: 'dist',
    server: {
      url: cleanUrl,
      cleartext: cleanUrl.startsWith('http://'),
    },
    android: {
      allowMixedContent: false,
      backgroundColor: '#020617',
    },
  };

  const twaManifest = {
    packageId: 'edu.leia.lectura',
    host: hostname,
    name: 'LEIA — Lectora Educativa Inteligente Asistida',
    launcherName: 'LEIA',
    display: 'standalone',
    themeColor: '#203B5B',
    navigationColor: '#203B5B',
    backgroundColor: '#F7F5ED',
    startUrl: '/',
    iconUrl: `${cleanUrl}/pwa-512x512.png`,
    maskableIconUrl: `${cleanUrl}/pwa-maskable-512x512.png`,
    monochromeIconUrl: `${cleanUrl}/pwa-192x192.png`,
    splashScreenFadeOutDuration: 300,
    signingKey: {
      path: './android.keystore',
      alias: 'leia-release',
    },
    appVersionName: '1.0.0',
    appVersionCode: 1,
    shortcuts: [],
    generatorApp: 'LEIA-APK-Kit',
    webManifestUrl: `${cleanUrl}/manifest.webmanifest`,
    fallbackType: 'customtabs',
    enableNotifications: false,
    isChromeOSOnly: false,
    orientation: 'portrait-primary',
  };

  const instructionsMd = `# Kit Independiente de LEIA (Sin Google AI Studio + APK Android)

URL configurada en este kit: ${cleanUrl}
${
  isStudioPreviewUrl
    ? `\n⚠️ AVISO IMPORTANTE: Esta URL (${hostname}) es una vista previa interna de Google AI Studio. Si la compartes tal cual, Google pedirá inicio de sesión en Google AI Studio. Sigue el Paso 1 abajo para darle una URL pública propia antes de generar el .APK.\n`
    : ''
}
---

## Paso 1: Publicar LEIA de forma 100% independiente (sin Google AI Studio)

Descarga el código fuente del proyecto (en AI Studio: ícono de Descargar / Exportar a GitHub) y publícalo en cualquiera de estas opciones gratuitas o de bajo costo:

### Opción A — Render / Railway / Fly.io (Recomendado y sin pantallas de Google)
1. Sube el proyecto descargado a un repositorio privado o público en GitHub.
2. Crea un nuevo **Web Service** en Render.com o Railway.app conectado al repositorio.
3. Configura las variables de entorno:
   - \`GEMINI_API_KEY\` = tu clave de Gemini API (https://aistudio.google.com/apikey)
   - \`NODE_ENV\` = \`production\`
   - \`PORT\` = \`3000\`
4. Comandos:
   - Build Command: \`npm install && npm run build\`
   - Start Command: \`npm start\`
5. Render/Railway te dará una URL propia limpia (ej. \`https://leia-lectura.onrender.com\`) totalmente independiente de Google AI Studio.

### Opción B — Google Cloud Run público (botón Deploy)
Si publicas en Cloud Run directamente desde el proyecto (el proyecto ya incluye \`Dockerfile\`):
- Asegúrate de marcar **"Allow unauthenticated invocations" (Acceso público)**.
- Así la URL terminará en \`.run.app\` propia y NO pedirá iniciar sesión en Google AI Studio.

---

## Paso 2: Generar tu archivo .APK para Android (con tu URL pública)

1. Abre **PWABuilder**: https://www.pwabuilder.com/
2. Pega tu **URL pública independiente** (ej. \`https://leia-lectura.onrender.com\`).
3. Haz clic en **Start** -> **Package for stores** -> **Android** -> **Download Package**.
4. Dentro del ZIP descargado estará tu archivo **LEIA.apk** 100% independiente (al instalarlo en cualquier celular abrirá LEIA directo sin mostrar Google Studio).

### Alternativa con Capacitor (Android Studio)
\`\`\`bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
# Edita server.url en capacitor.config.json con tu URL pública
npx cap add android
npx cap open android
\`\`\`
Luego ve a **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
`;

  zip.file('capacitor.config.json', JSON.stringify(capacitorConfig, null, 2));
  zip.file('twa-manifest.json', JSON.stringify(twaManifest, null, 2));
  zip.file('INSTRUCCIONES_APK_E_INDEPENDENCIA.md', instructionsMd);

  try {
    const iconResp = await fetch('/pwa-512x512.png');
    if (iconResp.ok) {
      const iconBlob = await iconResp.blob();
      zip.file('icon-512x512.png', iconBlob);
    }
  } catch {
    // Non-fatal if icon fetch fails offline
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const blobUrl = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = 'leia-android-apk-kit.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}
