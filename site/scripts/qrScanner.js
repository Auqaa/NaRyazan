(function attachRyazanQrScanner(global) {
  const ZXingBrowser = global.ZXingBrowser;
  const IGNORABLE_ERROR_NAMES = ['notfoundexception', 'checksumexception', 'formatexception'];

  const readResultText = (result) => {
    if (!result) return '';
    if (typeof result.getText === 'function') return String(result.getText() || '');
    return String(result.text || '');
  };

  const canUseMediaDevices = () =>
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices) &&
    typeof navigator.mediaDevices.getUserMedia === 'function';

  const stopVideoElement = (videoEl) => {
    if (!videoEl) return;

    const stream = videoEl.srcObject;
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (error) {
          console.warn('Failed to stop camera track', error);
        }
      });
    }

    videoEl.pause?.();
    videoEl.srcObject = null;
    videoEl.removeAttribute('src');
    videoEl.load?.();
  };

  class StaticQrScanner {
    constructor(videoEl) {
      this.videoEl = videoEl;
      this.reader = null;
      this.controls = null;
      this.imageReader = null;
      this.lastDecodedText = '';
      this.lastDecodedAt = 0;
    }

    async start(options = {}) {
      if (!ZXingBrowser || !ZXingBrowser.BrowserQRCodeReader) {
        throw new Error('scanner-unavailable');
      }
      if (!global.isSecureContext) {
        throw new Error('insecure-context');
      }
      if (!canUseMediaDevices()) {
        throw new Error('camera-unsupported');
      }

      await this.stop();

      const facingMode = options.facingMode === 'user' ? 'user' : 'environment';
      const onDecode = typeof options.onDecode === 'function' ? options.onDecode : () => {};
      const onError = typeof options.onError === 'function' ? options.onError : () => {};

      this.reader = new ZXingBrowser.BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 250,
        delayBetweenScanSuccess: 1200,
        tryPlayVideoTimeout: 4000
      });

      this.controls = await this.reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: facingMode === 'environment' ? { ideal: 'environment' } : 'user'
          }
        },
        this.videoEl,
        (result, error) => {
          if (result) {
            const text = readResultText(result).trim();
            if (!text) return;

            const now = Date.now();
            if (text === this.lastDecodedText && now - this.lastDecodedAt < 1600) {
              return;
            }

            this.lastDecodedText = text;
            this.lastDecodedAt = now;
            onDecode(text);
            return;
          }

          if (!error) return;

          const errorName = String(error.name || '').toLowerCase();
          if (IGNORABLE_ERROR_NAMES.includes(errorName)) return;
          onError(error);
        }
      );

      return this.controls;
    }

    async stop() {
      try {
        this.controls?.stop?.();
      } catch (error) {
        console.warn('Failed to stop QR controls', error);
      }

      try {
        this.reader?.reset?.();
      } catch (error) {
        console.warn('Failed to reset QR reader', error);
      }

      this.controls = null;
      this.reader = null;
      this.lastDecodedText = '';
      this.lastDecodedAt = 0;
      stopVideoElement(this.videoEl);
    }

    async scanFile(file) {
      if (!ZXingBrowser || !ZXingBrowser.BrowserQRCodeReader) {
        throw new Error('scanner-unavailable');
      }
      if (!file) {
        throw new Error('file-required');
      }

      if (!this.imageReader) {
        this.imageReader = new ZXingBrowser.BrowserQRCodeReader();
      }

      const objectUrl = URL.createObjectURL(file);

      try {
        const result = await this.imageReader.decodeFromImageUrl(objectUrl);
        return readResultText(result).trim();
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }
  }

  global.RyazanQrScanner = {
    create(videoEl) {
      return new StaticQrScanner(videoEl);
    },
    getCapabilities() {
      return {
        decoderAvailable: Boolean(ZXingBrowser && ZXingBrowser.BrowserQRCodeReader),
        secureContext: Boolean(global.isSecureContext),
        mediaDevices: canUseMediaDevices(),
        liveCamera: Boolean(
          ZXingBrowser &&
            ZXingBrowser.BrowserQRCodeReader &&
            global.isSecureContext &&
            canUseMediaDevices()
        )
      };
    }
  };
})(window);
