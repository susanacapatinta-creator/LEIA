import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Download,
  Share,
  WifiOff,
  CheckCircle2,
  X,
  ExternalLink,
  Package,
  Copy,
  Check,
  MoreVertical,
  QrCode,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { usePWAInstall, useOnlineStatus } from '../../hooks/usePWAInstall';
import { downloadAndroidApkKit } from '../../services/apkKitGenerator';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 rounded-xl border border-amber-500/40 bg-slate-900/95 backdrop-blur-md px-4 py-3 text-xs text-amber-200 shadow-2xl flex items-center space-x-3 animate-in fade-in"
    >
      <WifiOff className="h-4 w-4 text-amber-400 shrink-0" />
      <div>
        <p className="font-bold text-amber-300">Modo sin conexión activo</p>
        <p className="text-[11px] text-slate-300">
          Puedes leer tus libros guardados en IndexedDB; las consultas a la IA requieren internet.
        </p>
      </div>
    </div>
  );
};

export const MobileInstallBanner: React.FC = () => {
  const { canPromptInstall, isInstalled, isIOS, isMobile, isInIframe, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  if (isInstalled || dismissed) return null;
  if (!canPromptInstall && !(isMobile && !isInIframe)) return null;

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 rounded-2xl border border-cyan-500/40 bg-slate-900/95 backdrop-blur-md p-4 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in">
        <div className="flex items-center space-x-3 min-w-0">
          <img
            src="/pwa-192x192.png"
            alt="Icono de LEIA"
            referrerPolicy="no-referrer"
            className="h-10 w-10 rounded-xl border border-[#71899D]/40 shadow-md object-cover shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">Instalar LEIA en tu celular</p>
            <p className="text-[11px] text-slate-300 truncate">
              {canPromptInstall
                ? 'Descárgala directo como app sin Play Store'
                : isIOS
                ? 'Agrégala como app a tu pantalla de inicio'
                : 'Úsala a pantalla completa y con libros offline'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (canPromptInstall) {
                install();
              } else {
                setModalOpen(true);
              }
            }}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 px-3 py-2 text-xs font-bold text-white shadow cursor-pointer"
          >
            Instalar
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            aria-label="Ocultar aviso de instalación"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <MobileInstallModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

interface MobileInstallModalProps {
  open: boolean;
  onClose: () => void;
}

export const MobileInstallModal: React.FC<MobileInstallModalProps> = ({ open, onClose }) => {
  const { serverHealth } = useApp();
  const { canPromptInstall, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk' | 'deploy'>('pwa');
  const [downloadingKit, setDownloadingKit] = useState(false);
  const [kitDownloaded, setKitDownloaded] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const detectedUrl =
    serverHealth?.appUrl && !serverHealth.appUrl.includes('MY_APP_URL')
      ? serverHealth.appUrl.replace(/\/$/, '')
      : originUrl;

  const [customPublicUrl, setCustomPublicUrl] = useState('');
  const effectiveUrl = (customPublicUrl.trim() || detectedUrl).replace(/\/$/, '');
  const isStudioHosted =
    effectiveUrl.includes('ais-dev-') || effectiveUrl.includes('ais-pre-');

  useEffect(() => {
    if (!open || !effectiveUrl) return;
    QRCode.toDataURL(effectiveUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [open, effectiveUrl]);

  if (!open) return null;

  const pwabuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(effectiveUrl)}`;

  const handleInstallClick = async () => {
    await install();
  };

  const handleDownloadKit = async () => {
    setDownloadingKit(true);
    try {
      await downloadAndroidApkKit(effectiveUrl);
      setKitDownloaded(true);
      setTimeout(() => setKitDownloaded(false), 4000);
    } finally {
      setDownloadingKit(false);
    }
  };

  const handleCopyUrl = () => {
    if (!effectiveUrl) return;
    navigator.clipboard.writeText(effectiveUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleShareToPhone = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LEIA — App Educativa de Lectura',
          text: 'Abre este enlace en tu celular para instalar la app LEIA directamente:',
          url: effectiveUrl,
        });
      } catch {
        handleCopyUrl();
      }
    } else {
      handleCopyUrl();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-indigo-500/30 bg-slate-900 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <img
              src="/pwa-192x192.png"
              alt="Icono oficial de LEIA"
              referrerPolicy="no-referrer"
              className="h-12 w-12 rounded-xl border border-[#71899D]/40 shadow-lg object-cover shrink-0"
            />
            <div>
              <h3 className="text-base font-bold text-white">LEIA en Celular y Sin Google Studio</h3>
              <p className="text-xs text-slate-400">
                Instalación móvil directa, archivo .APK y publicación independiente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Studio preview domain warning */}
        {isStudioHosted && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 text-xs text-amber-100 space-y-1.5">
            <p className="font-bold text-amber-300 flex items-center space-x-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>¿Por qué les aparece Google AI Studio al abrir el enlace?</span>
            </p>
            <p className="text-[11px] text-amber-100/90 leading-relaxed">
              La dirección actual (<code className="text-amber-300">{originUrl}</code>) es la vista previa privada dentro de AI Studio. Para que nadie vea Google Studio al entrar o instalar el APK, publica LEIA en tu propio servidor (pestaña <strong>Sin Studio</strong>) y pega abajo esa URL pública.
            </p>
          </div>
        )}

        {/* Mode Switch Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('pwa')}
            className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pwa'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Instalar App
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apk')}
            className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'apk'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Archivo .APK
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('deploy')}
            className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'deploy'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sin Studio
          </button>
        </div>

        {/* Custom Independent URL input */}
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-slate-300">
            URL pública de tu app (opcional: pega aquí tu enlace publicado en Render / Cloud Run / dominio propio):
          </label>
          <input
            type="url"
            value={customPublicUrl}
            onChange={(e) => setCustomPublicUrl(e.target.value)}
            placeholder={detectedUrl}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-cyan-300 placeholder-slate-500 font-mono focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {activeTab === 'pwa' && (
          <div className="space-y-4">
            {isInstalled ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-xs text-emerald-200 flex items-center space-x-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold text-emerald-300">LEIA ya está instalada en este dispositivo</p>
                  <p className="text-slate-300 mt-0.5">
                    Puedes abrirla desde tu pantalla de inicio en pantalla completa como una aplicación nativa.
                  </p>
                </div>
              </div>
            ) : canPromptInstall ? (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-4 space-y-3">
                <p className="text-xs text-slate-200 leading-relaxed">
                  Tu navegador está listo para descargar e instalar <strong>LEIA</strong> directamente como aplicación en tu pantalla de inicio.
                </p>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Descargar e Instalar App LEIA Ahora</span>
                </button>
              </div>
            ) : isInIframe ? (
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-3 text-xs">
                <p className="font-bold text-white">
                  Abre el enlace fuera de este marco para instalar en 1 clic
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={effectiveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 px-4 py-2 text-xs font-bold text-white shadow"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Abrir LEIA en nueva pestaña</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleShareToPhone}
                    className="inline-flex items-center space-x-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 cursor-pointer"
                  >
                    <Share className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Copiar / Compartir</span>
                  </button>
                </div>
              </div>
            ) : isIOS ? (
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-2 text-xs text-slate-300">
                <p className="font-bold text-white">Instalar en iPhone / iPad (Safari):</p>
                <p className="flex items-center space-x-1.5">
                  <span>1. Toca</span>
                  <Share className="h-3.5 w-3.5 text-cyan-400 inline" />
                  <strong className="text-white">Compartir</strong>
                  <span>→ <strong>"Agregar a pantalla de inicio"</strong>.</span>
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-2 text-xs text-slate-300">
                <p className="font-bold text-white">Instalar en Android (Chrome):</p>
                <p className="flex items-center space-x-1.5">
                  <span>1. Toca el menú</span>
                  <MoreVertical className="h-3.5 w-3.5 text-cyan-400 inline" />
                  <span>→ <strong className="text-white">"Instalar aplicación"</strong>.</span>
                </p>
              </div>
            )}

            {/* QR Code card */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-col sm:flex-row items-center gap-4">
              {qrDataUrl ? (
                <div className="rounded-xl bg-white p-2 shrink-0 shadow">
                  <img src={qrDataUrl} alt="Código QR para abrir LEIA en celular" className="h-32 w-32" />
                </div>
              ) : (
                <div className="h-36 w-36 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                  <QrCode className="h-10 w-10 text-slate-600" />
                </div>
              )}

              <div className="space-y-2 text-xs min-w-0 flex-1">
                <p className="font-bold text-white flex items-center space-x-1.5">
                  <QrCode className="h-4 w-4 text-cyan-400" />
                  <span>Código QR directo al celular</span>
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Escanea este QR con tu teléfono. Si ya pegaste arriba tu URL publicada independiente, el QR abrirá LEIA sin pasar por Google Studio.
                </p>
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    readOnly
                    value={effectiveUrl}
                    className="flex-1 min-w-0 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[11px] text-cyan-300 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center space-x-1 cursor-pointer shrink-0"
                  >
                    {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedUrl ? 'Copiada' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'apk' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-2 text-xs text-slate-200">
              <p className="font-bold text-cyan-300 flex items-center space-x-1.5">
                <Package className="h-4 w-4" />
                <span>Generar archivo .APK instalable para Android</span>
              </p>
              <p className="text-slate-300 leading-relaxed">
                Importante: primero publica LEIA en una URL independiente (pestaña <strong>Sin Studio</strong>) y pégala arriba antes de generar tu <code>.apk</code> para que el APK nunca muestre Google Studio.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-white">
                  1. Compilar y Descargar .APK online con PWABuilder
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Usa tu URL pública para generar un archivo <strong>LEIA.apk</strong> firmado listo para Android.
                </p>
              </div>
              <a
                href={pwabuilderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg transition-all"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Generar .APK en PWABuilder</span>
              </a>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-white">
                  2. Descargar Kit Local (.zip con Capacitor, TWA y Guía)
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Incluye <code className="text-cyan-300">capacitor.config.json</code>, <code className="text-cyan-300">twa-manifest.json</code> y pasos completos de publicación independiente.
                </p>
              </div>
              <button
                type="button"
                disabled={downloadingKit}
                onClick={handleDownloadKit}
                className="w-full py-2.5 px-4 rounded-xl border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {kitDownloaded ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    <span>¡Kit descargado (leia-android-apk-kit.zip)!</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Descargar Kit Independiente + APK (.zip)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'deploy' && (
          <div className="space-y-3 text-xs text-slate-300">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
              <p className="font-bold text-emerald-300 flex items-center space-x-1.5">
                <Globe className="h-4 w-4" />
                <span>Cómo tener LEIA 100% independiente de Google AI Studio</span>
              </p>
              <p className="leading-relaxed">
                El proyecto ya está listo con su propio servidor Express, base de datos SQLite de cuentas, Dockerfile y PWA sin referencias a Google Studio. Para sacarlo de la vista previa:
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2.5">
              <p className="font-bold text-white">Opción 1: Publicar con el botón Deploy (Cloud Run público)</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                <li>Usa la opción de desplegar / publicar la app en Cloud Run.</li>
                <li>Activa el acceso público (sin requerir inicio de sesión de Google) y conserva tu <code>GEMINI_API_KEY</code> en variables del servidor.</li>
                <li>Obtendrás una URL pública limpia donde solo aparece LEIA y su registro propio de cuentas.</li>
              </ol>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2.5">
              <p className="font-bold text-white">Opción 2: Servidor propio (Render / Railway / VPS)</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                <li>Descarga el código fuente del proyecto (Exportar / Descargar ZIP o subir a GitHub).</li>
                <li>En Render o Railway crea un Web Service con <code className="text-cyan-300">npm install && npm run build</code> y <code className="text-cyan-300">npm start</code>.</li>
                <li>Agrega tu variable <code className="text-cyan-300">GEMINI_API_KEY</code> en el panel del servidor.</li>
                <li>Pega tu nueva URL arriba para descargar el APK o QR apuntando a tu servidor propio.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const PWAInstallButton: React.FC = () => {
  const { isInstalled } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        title="Instalar LEIA en celular o publicar sin Google Studio"
        className={`flex items-center space-x-1.5 rounded-xl border px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
          isInstalled
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
            : 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25'
        }`}
      >
        <Smartphone className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden md:inline">{isInstalled ? 'App Instalada' : 'Instalar App'}</span>
      </button>

      <MobileInstallModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
