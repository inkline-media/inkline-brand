/**
 * Inkline Brand Portal — Interactive JavaScript
 * Single-page static site with vanilla JS modules.
 *
 * Modules:
 *   1. Navigation (sticky, scroll spy, mobile hamburger, smooth scroll)
 *   2. PDFViewer (two-page spread via PDF.js)
 *   3. LogoSection (color swap, format download, canvas toggle)
 *   4. ColorSection (click-to-copy hex)
 *   5. FontShowcase (live type tester + Font Package Builder)
 *   6. IconBrowser (search, filter, lazy-load, modal, download)
 *   7. PhotoGallery (lightbox with prev/next)
 *   8. Utilities (download, raster conversion, toast, debounce, clipboard)
 */

(function () {
  'use strict';

  /* ================================================================
   *  BRAND COLORS
   * ================================================================ */
  const BRAND_COLORS = {
    cerulean:  { hex: '#1399CC', name: 'Cerulean' },
    cobalt:    { hex: '#0057B8', name: 'Cobalt' },
    magenta:   { hex: '#E10098', name: 'Magenta' },
    bubblegum: { hex: '#FF66C9', name: 'Bubblegum' },
    shamrock:  { hex: '#34AE17', name: 'Shamrock' },
    lime:      { hex: '#C5E600', name: 'Lime' },
    black:     { hex: '#101010', name: 'Nearly Black' },
    white:     { hex: '#FFFFFF', name: 'White' },
    grey:      { hex: '#8E8E8E', name: 'Medium Grey' }
  };

  /* ================================================================
   *  8. UTILITY FUNCTIONS
   * ================================================================ */

  /**
   * Debounce — returns a wrapper that delays `fn` by `delay` ms.
   */
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * Show a small toast notification that auto-dismisses.
   */
  function showToast(message, duration = 2000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      Object.assign(container.style, {
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '10000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        pointerEvents: 'none'
      });
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
      background: '#101010',
      color: '#fff',
      padding: '0.75rem 1.5rem',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      opacity: '0',
      transition: 'opacity 0.3s ease',
      pointerEvents: 'auto'
    });
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
  }

  /**
   * Copy text to clipboard and show a toast.
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied ${text}`);
    } catch {
      showToast('Copy failed — please copy manually.');
    }
  }

  /**
   * Fetch a URL and trigger a file download.
   */
  async function downloadFile(url, filename) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('Download failed:', err);
      showToast('Download failed. Please try again.');
    }
  }

  /**
   * Convert an SVG string to a raster data-URL (PNG or JPEG).
   * @param {string}  svgString  — raw SVG markup
   * @param {number}  width      — output width in px
   * @param {number}  height     — output height in px
   * @param {'png'|'jpg'} format — output format
   * @param {string|null} bgColor — optional background fill (e.g. '#FFFFFF')
   * @returns {Promise<string>} data-URL
   */
  function svgToRaster(svgString, width, height, format = 'png', bgColor = null) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (bgColor) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
        resolve(canvas.toDataURL(mime, 0.92));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to rasterize SVG'));
      };
      img.src = url;
    });
  }

  /**
   * Trigger a download from a data-URL.
   */
  function downloadDataURL(dataURL, filename) {
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ================================================================
   *  1. NAVIGATION MODULE
   * ================================================================ */

  const Navigation = (() => {
    const SECTION_IDS = [
      'vision', 'values', 'mission',
      'logos', 'colors', 'typography', 'icons', 'imagery', 'brand-in-use'
    ];

    let navLinks = [];
    let sections = [];
    let mobileToggle = null;
    let navMenu = null;

    function init() {
      navLinks = Array.from(document.querySelectorAll('nav a[href^="#"]'));
      sections = SECTION_IDS
        .map(id => document.getElementById(id))
        .filter(Boolean);

      mobileToggle = document.querySelector('#nav-toggle, .nav-toggle, .hamburger, [data-nav-toggle]');
      navMenu = document.querySelector('#mobile-menu, #nav-menu, .nav-menu, .nav-links');

      // Smooth scroll
      navLinks.forEach(link => {
        link.addEventListener('click', e => {
          e.preventDefault();
          const targetId = link.getAttribute('href').slice(1);
          const target = document.getElementById(targetId);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
            // Close mobile menu if open
            if (navMenu) navMenu.classList.add('hidden');
            if (mobileToggle) mobileToggle.classList.remove('open', 'active');
          }
        });
      });

      // Mobile toggle
      if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
          navMenu.classList.toggle('hidden');
        });
      }

      // Scroll spy
      window.addEventListener('scroll', debounce(updateActiveLink, 50), { passive: true });
      updateActiveLink();

      // Mobile color palette tooltip
      const paletteBtn = document.getElementById('mobile-palette-btn');
      const paletteTip = document.getElementById('mobile-palette-tooltip');
      if (paletteBtn && paletteTip) {
        let paletteTimer = null;
        const closePalette = () => {
          paletteTip.classList.add('opacity-0', 'pointer-events-none');
          paletteTip.classList.remove('opacity-100', 'pointer-events-auto');
          clearTimeout(paletteTimer);
        };
        const openPalette = () => {
          paletteTip.classList.remove('opacity-0', 'pointer-events-none');
          paletteTip.classList.add('opacity-100', 'pointer-events-auto');
          clearTimeout(paletteTimer);
          paletteTimer = setTimeout(closePalette, 5000);
        };
        paletteBtn.addEventListener('click', e => {
          e.stopPropagation();
          const isOpen = paletteTip.classList.contains('opacity-100');
          isOpen ? closePalette() : openPalette();
        });
        paletteTip.querySelectorAll('[data-hex]').forEach(sw => {
          sw.addEventListener('click', e => {
            e.stopPropagation();
            copyToClipboard(sw.dataset.hex);
            closePalette();
          });
        });
        document.addEventListener('click', e => {
          if (!paletteTip.contains(e.target) && e.target !== paletteBtn) closePalette();
        });
      }

      // Back to top button — show once scrolled past the hero
      const backToTop = document.getElementById('back-to-top');
      if (backToTop) {
        window.addEventListener('scroll', () => {
          const show = window.scrollY > window.innerHeight;
          backToTop.classList.toggle('opacity-0', !show);
          backToTop.classList.toggle('pointer-events-none', !show);
          backToTop.classList.toggle('opacity-100', show);
        }, { passive: true });
      }
    }

    function updateActiveLink() {
      const scrollY = window.scrollY + 120; // offset for sticky nav
      let currentId = '';

      for (const section of sections) {
        if (section.offsetTop <= scrollY) {
          currentId = section.id;
        }
      }

      navLinks.forEach(link => {
        const href = link.getAttribute('href').slice(1);
        if (href === currentId) {
          link.classList.add('is-active');
        } else {
          link.classList.remove('is-active');
        }
      });
    }

    return { init };
  })();

  /* ================================================================
   *  2. PDF VIEWER MODULE
   * ================================================================ */

  const PDFViewer = (() => {
    const PDF_URL = 'brand-guide/inkline-brand-guide.pdf';
    const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
    const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let rendering = false;

    const canvas    = () => document.getElementById('pdf-canvas-left');
    const pageInfo  = () => document.getElementById('pdf-page-info');
    const prevBtn   = () => document.getElementById('pdf-prev');
    const nextBtn   = () => document.getElementById('pdf-next');

    async function renderPage() {
      if (rendering || !pdfDoc) return;
      rendering = true;

      const c = canvas();
      if (!c) { rendering = false; return; }

      try {
        const page = await pdfDoc.getPage(currentPage);
        const scale = 2 * (window.devicePixelRatio || 1);
        const viewport = page.getViewport({ scale });

        c.width = viewport.width;
        c.height = viewport.height;
        const cssWidth = viewport.width / scale;
        c.style.maxWidth = cssWidth + 'px';
        c.style.width = '100%';
        c.style.height = 'auto';

        const ctx = c.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.error('PDF render error:', err);
      }

      // Update page info
      const info = pageInfo();
      if (info) info.textContent = `Page ${currentPage} of ${totalPages}`;

      // Button states
      const prev = prevBtn();
      const next = nextBtn();
      if (prev) prev.disabled = currentPage <= 1;
      if (next) next.disabled = currentPage >= totalPages;

      rendering = false;
    }

    let initialized = false;
    const modalEl = () => document.getElementById('brand-book-modal');

    async function loadPDF() {
      if (initialized) return;
      initialized = true;

      const viewer = document.getElementById('pdf-viewer');
      if (!viewer) return;

      // Create single canvas, replacing the skeleton
      const container = document.getElementById('pdf-canvas-container');
      if (container) {
        container.innerHTML = '';
        const c = document.createElement('canvas');
        c.id = 'pdf-canvas-left';
        container.appendChild(c);
      }

      try {
        const pdfjsLib = await import(PDFJS_URL);
        pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;

        pdfDoc = await pdfjsLib.getDocument(PDF_URL).promise;
        totalPages = pdfDoc.numPages;

        currentPage = 1;
        await renderPage();

        // Controls
        const prev = prevBtn();
        const next = nextBtn();
        if (prev) {
          prev.addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; renderPage(); }
          });
        }
        if (next) {
          next.addEventListener('click', () => {
            if (currentPage < totalPages) { currentPage++; renderPage(); }
          });
        }

        // Re-render on resize (debounced)
        window.addEventListener('resize', debounce(() => {
          const m = modalEl();
          if (m && m.classList.contains('is-active')) renderPage();
        }, 300));
      } catch (err) {
        console.error('PDF.js failed to load:', err);
        if (viewer) {
          viewer.innerHTML =
            '<p style="text-align:center;padding:2rem;color:#8E8E8E;">Unable to load the brand guide PDF. Please try refreshing the page.</p>';
        }
      }
    }

    function openModal() {
      const m = modalEl();
      if (m) m.classList.add('is-active');
      loadPDF();
    }

    function closeModal() {
      const m = modalEl();
      if (m) m.classList.remove('is-active');
    }

    function init() {
      // Wire up open buttons
      const openBtn = document.getElementById('open-brand-book');
      const openBtnMobile = document.getElementById('open-brand-book-mobile');
      if (openBtn) openBtn.addEventListener('click', openModal);
      if (openBtnMobile) openBtnMobile.addEventListener('click', () => {
        // Close mobile menu first
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) mobileMenu.classList.add('hidden');
        openModal();
      });

      // Wire up close
      const closeBtn = document.getElementById('brand-book-close');
      if (closeBtn) closeBtn.addEventListener('click', closeModal);

      // Click outside to close
      const m = modalEl();
      if (m) {
        m.addEventListener('click', e => {
          if (e.target === m) closeModal();
        });
      }
    }

    return { init };
  })();

  /* ================================================================
   *  3. LOGO SECTION MODULE
   * ================================================================ */

  const LogoSection = (() => {
    let activeColor = 'cobalt';
    let activeFormat = 'svg';
    let canvasMode = false;
    let logoDarkBg = false;
    let appIconDarkBg = false;

    const LOGO_TYPES = ['horizontal', 'vertical', 'wordmark', 'logomark'];
    const LIGHT_COLORS = ['white']; // colours that need dark bg by default

    function applyLogoBg() {
      const grid = document.getElementById('logo-grid');
      if (!grid) return;
      grid.querySelectorAll(':scope > div').forEach(card => {
        card.classList.toggle('bg-nearly-black', logoDarkBg);
        card.classList.toggle('text-white', logoDarkBg);
        card.classList.toggle('bg-white', !logoDarkBg);
        card.classList.toggle('text-nearly-black', !logoDarkBg);
        // Invert download buttons
        card.querySelectorAll('.logo-download').forEach(btn => {
          btn.classList.toggle('bg-nearly-black', !logoDarkBg);
          btn.classList.toggle('text-white', !logoDarkBg);
          btn.classList.toggle('hover:bg-nearly-black/80', !logoDarkBg);
          btn.classList.toggle('bg-white', logoDarkBg);
          btn.classList.toggle('text-nearly-black', logoDarkBg);
          btn.classList.toggle('hover:bg-white/80', logoDarkBg);
        });
      });
      const cb = document.getElementById('logo-bg-toggle');
      if (cb) cb.checked = logoDarkBg;
    }

    function applyAppIconBg() {
      const grid = document.getElementById('app-icons-grid');
      if (!grid) return;
      grid.querySelectorAll(':scope > div').forEach(card => {
        card.classList.toggle('bg-nearly-black', appIconDarkBg);
        card.classList.toggle('text-white', appIconDarkBg);
        card.classList.toggle('bg-white', !appIconDarkBg);
        card.classList.toggle('text-nearly-black', !appIconDarkBg);
      });
      const cb = document.getElementById('app-icon-bg-toggle');
      if (cb) cb.checked = appIconDarkBg;
    }

    /**
     * Build the file path for a logo asset.
     */
    function logoPath(type, color, ext) {
      const suffix = canvasMode ? '-canvas' : '';
      return `logos/${type}/${color}/inkline-${type}-${color}${suffix}.${ext}`;
    }

    /**
     * Fetch and inject an SVG into a logo preview element.
     */
    async function loadLogoSVG(previewEl, type) {
      const url = logoPath(type, activeColor, 'svg');
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const svg = await res.text();
        previewEl.innerHTML = svg;
      } catch (err) {
        console.error(`Failed to load logo: ${url}`, err);
        previewEl.innerHTML = '<span style="color:#8E8E8E;">Logo not available</span>';
      }
    }

    /**
     * Refresh all 4 logo previews.
     */
    function refreshAll() {
      LOGO_TYPES.forEach(type => {
        const el = document.querySelector(`.logo-preview[data-type="${type}"]`);
        if (el) {
          loadLogoSVG(el, type);
        }
      });
      // Auto-switch bg based on selected colour
      logoDarkBg = LIGHT_COLORS.includes(activeColor);
      applyLogoBg();
    }

    /**
     * Render an SVG string to a canvas at a given width, preserving aspect ratio.
     * Returns a canvas element.
     */
    function svgToCanvas(svgText, width, bgColor) {
      return new Promise((resolve, reject) => {
        // Parse viewBox to get aspect ratio
        const match = svgText.match(/viewBox=["']([^"']+)["']/);
        let aspect = 1;
        if (match) {
          const parts = match[1].split(/[\s,]+/).map(Number);
          if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            aspect = parts[3] / parts[2];
          }
        }
        const height = Math.round(width * aspect);

        const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (bgColor) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, width, height);
          }
          ctx.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(url);
          resolve(canvas);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load SVG as image'));
        };
        img.src = url;
      });
    }

    /**
     * Handle download for a specific logo type.
     */
    async function handleDownload(type) {
      const base = `inkline-${type}-${activeColor}${canvasMode ? '-canvas' : ''}`;
      const sizeInput = document.getElementById('logo-size');
      const width = sizeInput ? parseInt(sizeInput.value, 10) || 1024 : 1024;

      if (activeFormat === 'svg') {
        downloadFile(logoPath(type, activeColor, 'svg'), `${base}.svg`);
      } else {
        // For PNG and JPG, render SVG at custom size
        try {
          const svgUrl = logoPath(type, activeColor, 'svg');
          const res = await fetch(svgUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const svgText = await res.text();
          const bgColor = activeFormat === 'jpg' ? '#FFFFFF' : null;
          const canvas = await svgToCanvas(svgText, width, bgColor);
          const mimeType = activeFormat === 'jpg' ? 'image/jpeg' : 'image/png';
          const quality = activeFormat === 'jpg' ? 0.92 : undefined;
          const dataURL = canvas.toDataURL(mimeType, quality);
          downloadDataURL(dataURL, `${base}-${width}px.${activeFormat}`);
        } catch (err) {
          console.error(`${activeFormat.toUpperCase()} export failed:`, err);
          showToast(`${activeFormat.toUpperCase()} export failed. Please try again.`);
        }
      }
    }

    let appIconColor = 'cobalt';

    // Platform file manifests (all files to include in zip)
    const PLATFORM_FILES = {
      master: { sizes: ['512', '1024'], ext: 'png' },
      favicon: { sizes: ['16', '32', '48', '192', '512'], ext: 'png', extras: ['ico', 'svg'] },
      apple: { sizes: ['120', '152', '167', '180', '1024'], ext: 'png' },
      android: { sizes: ['48', '72', '96', '144', '192', '512'], ext: 'png' },
      microsoft: { sizes: ['150', '270'], ext: 'png' }
    };

    /**
     * Refresh app icon previews based on selected app icon color.
     */
    function refreshAppIcons() {
      document.querySelectorAll('.app-icon-sizes[data-platform]').forEach(el => {
        el.querySelectorAll('img').forEach(img => {
          const oldSrc = img.getAttribute('src');
          const newSrc = oldSrc.replace(/inkline-icon-[a-z]+-/, `inkline-icon-${appIconColor}-`);
          img.src = newSrc;
        });
      });
      // Auto-switch bg based on selected colour
      appIconDarkBg = LIGHT_COLORS.includes(appIconColor);
      applyAppIconBg();
    }

    /**
     * Download a zip of all sizes for a platform using JSZip.
     */
    async function downloadAppIconZip(platform) {
      const config = PLATFORM_FILES[platform];
      if (!config) return;

      const btn = document.querySelector(`.app-icon-zip[data-platform="${platform}"]`);
      const origText = btn ? btn.textContent : '';
      if (btn) { btn.textContent = 'Preparing...'; btn.disabled = true; }

      try {
        // Lazy-load JSZip
        const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default;
        const zip = new JSZip();

        // Add PNG files
        for (const size of config.sizes) {
          const url = `logos/brand-icons/${platform}/inkline-icon-${appIconColor}-${size}.png`;
          const res = await fetch(url);
          if (res.ok) {
            const blob = await res.blob();
            zip.file(`inkline-icon-${appIconColor}-${size}.png`, blob);
          }
        }

        // Add extras (ico, svg for favicon)
        if (config.extras) {
          for (const ext of config.extras) {
            const url = `logos/brand-icons/${platform}/inkline-icon-${appIconColor}.${ext}`;
            const res = await fetch(url);
            if (res.ok) {
              const blob = await res.blob();
              zip.file(`inkline-icon-${appIconColor}.${ext}`, blob);
            }
          }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        downloadDataURL(url, `inkline-${platform}-icons-${appIconColor}.zip`);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('ZIP generation failed:', err);
        showToast('ZIP download failed. Please try again.');
      }

      if (btn) { btn.textContent = origText; btn.disabled = false; }
    }

    function init() {
      const controls = document.getElementById('logo-controls');
      if (!controls) return;

      const sizeGroup = document.getElementById('logo-size-group');

      // Color picker swatches
      const picker = document.getElementById('logo-color-picker');
      if (picker) {
        picker.addEventListener('click', e => {
          const swatch = e.target.closest('[data-color]');
          if (!swatch) return;
          activeColor = swatch.dataset.color;
          // Update active ring styling
          picker.querySelectorAll('[data-color]').forEach(s => {
            s.classList.remove('border-cerulean', 'border-cobalt', 'border-magenta', 'border-bubblegum', 'border-shamrock', 'border-lime', 'border-nearly-black', 'border-medium-grey', 'ring-2', 'ring-cerulean', 'ring-cobalt', 'ring-magenta', 'ring-bubblegum', 'ring-shamrock', 'ring-lime', 'ring-nearly-black', 'ring-offset-2', 'ring-1', 'ring-light-grey');
            s.classList.add('border-transparent');
            // Restore white swatch outline so it stays visible
            if (s.dataset.color === 'white') {
              s.classList.add('ring-1', 'ring-light-grey');
            }
          });
          swatch.classList.remove('border-transparent');
          swatch.classList.add('ring-2', 'ring-offset-2');
          if (swatch.dataset.color === 'white') {
            swatch.classList.remove('ring-1', 'ring-light-grey');
          }
          refreshAll();
        });
      }

      // Format selector — show/hide size input + update button labels
      const formatSelect = document.getElementById('logo-format');
      function updateDownloadLabels() {
        const label = `Download ${activeFormat.toUpperCase()}`;
        document.querySelectorAll('.logo-download[data-type]').forEach(btn => {
          btn.textContent = label;
        });
      }
      if (formatSelect) {
        formatSelect.addEventListener('change', () => {
          activeFormat = formatSelect.value;
          if (sizeGroup) {
            sizeGroup.style.display = activeFormat === 'svg' ? 'none' : '';
          }
          updateDownloadLabels();
        });
        // Initial state: hide size for SVG
        if (sizeGroup) sizeGroup.style.display = 'none';
      }
      updateDownloadLabels();

      // Canvas toggle
      const canvasToggle = document.getElementById('logo-canvas-toggle');
      if (canvasToggle) {
        canvasToggle.addEventListener('change', () => {
          canvasMode = canvasToggle.checked;
          refreshAll();
        });
      }

      // Download buttons (main logos)
      document.querySelectorAll('.logo-download[data-type], [data-logo-download]').forEach(btn => {
        const type = btn.dataset.type || btn.dataset.logoDownload;
        if (type) {
          btn.addEventListener('click', () => handleDownload(type));
        }
      });

      // Copy SVG URL buttons
      document.querySelectorAll('.logo-copy-url[data-type]').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          const relativePath = logoPath(type, activeColor, 'svg');
          const absoluteUrl = new URL(relativePath, window.location.href).href;
          navigator.clipboard.writeText(absoluteUrl).then(() => {
            showToast('SVG URL copied!');
          });
        });
      });

      // App icon color picker (separate from logo color picker)
      const appIconPicker = document.getElementById('app-icon-color-picker');
      if (appIconPicker) {
        appIconPicker.addEventListener('click', e => {
          const swatch = e.target.closest('[data-color]');
          if (!swatch) return;
          appIconColor = swatch.dataset.color;
          appIconPicker.querySelectorAll('[data-color]').forEach(s => {
            s.classList.remove('border-cerulean', 'border-cobalt', 'border-magenta', 'border-bubblegum', 'border-shamrock', 'border-lime', 'border-nearly-black', 'border-medium-grey', 'ring-2', 'ring-cerulean', 'ring-cobalt', 'ring-magenta', 'ring-bubblegum', 'ring-shamrock', 'ring-lime', 'ring-nearly-black', 'ring-offset-2', 'ring-1', 'ring-light-grey');
            s.classList.add('border-transparent');
            if (s.dataset.color === 'white') {
              s.classList.add('ring-1', 'ring-light-grey');
            }
          });
          swatch.classList.remove('border-transparent');
          swatch.classList.add('ring-2', 'ring-offset-2');
          if (swatch.dataset.color === 'white') {
            swatch.classList.remove('ring-1', 'ring-light-grey');
          }
          refreshAppIcons();
        });
      }

      // Logo background toggle
      const logoBgCb = document.getElementById('logo-bg-toggle');
      if (logoBgCb) {
        logoBgCb.addEventListener('change', () => {
          logoDarkBg = logoBgCb.checked;
          applyLogoBg();
        });
      }

      // App icon background toggle
      const appIconBgCb = document.getElementById('app-icon-bg-toggle');
      if (appIconBgCb) {
        appIconBgCb.addEventListener('change', () => {
          appIconDarkBg = appIconBgCb.checked;
          applyAppIconBg();
        });
      }

      // App icon ZIP download buttons
      document.querySelectorAll('.app-icon-zip').forEach(btn => {
        btn.addEventListener('click', () => {
          downloadAppIconZip(btn.dataset.platform);
        });
      });

      // Initial load
      refreshAll();
      refreshAppIcons();
    }

    return { init };
  })();

  /* ================================================================
   *  4. COLOR SECTION MODULE
   * ================================================================ */

  const ColorSection = (() => {
    function init() {
      const swatches = document.querySelectorAll('[data-hex]:not(#mobile-palette-tooltip [data-hex])');
      if (!swatches.length) return;

      swatches.forEach(swatch => {
        swatch.style.cursor = 'pointer';
        swatch.addEventListener('click', () => {
          const hex = swatch.dataset.hex;
          if (hex) copyToClipboard(hex);
        });
      });
    }

    return { init };
  })();

  /* ================================================================
   *  5. FONT SHOWCASE MODULE
   * ================================================================ */

  const FontShowcase = (() => {
    const WEIGHTS = [300, 400, 500, 600, 700];
    const WEIGHT_LABELS = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold' };
    const FONTS = [
      { id: 'font-inter-tight', family: 'Inter Tight', urlName: 'Inter+Tight' },
      { id: 'font-ibm-plex',    family: 'IBM Plex Serif', urlName: 'IBM+Plex+Serif' }
    ];

    const HEADING_TEXT = 'The quick brown fox jumps over the lazy dog';
    const LOREM_PARAGRAPHS = [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      'Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida.',
      'Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Donec sed odio dui. Cras mattis consectetur purus sit amet fermentum.',
      'Maecenas sed diam eget risus varius blandit sit amet non magna. Morbi leo risus, porta ac consectetur ac, vestibulum at eros. Etiam porta sem malesuada magna mollis euismod. Aenean lacinia bibendum nulla sed consectetur.',
      'Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Vestibulum id ligula porta felis euismod semper. Nullam quis risus eget urna mollis ornare vel eu leo.',
      'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Sed posuere consectetur est at lobortis. Donec ullamcorper nulla non metus auctor fringilla. Cras justo odio, dapibus ut facilisis in.',
      'Nulla vitae elit libero, a pharetra augue. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Aenean eu leo quam.',
      'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae. Suspendisse potenti. Aliquam erat volutpat. Sed fringilla mauris sit amet nibh. Donec sodales sagittis magna.',
      'Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus.'
    ];

    function initPanel(cfg) {
      const panel = document.getElementById(cfg.id);
      if (!panel) return;

      const specimen = panel.querySelector('.font-specimen, [contenteditable]');
      const sizeSlider = panel.querySelector('.font-size-slider');
      const sizeDisplay = panel.querySelector('.font-size-display');
      const lineHeightSlider = panel.querySelector('.line-height-slider');
      const lineHeightDisplay = panel.querySelector('.line-height-display');
      const baseFontInput = panel.querySelector('.base-font-size');
      const weightButtons = panel.querySelectorAll('[data-weight]');
      const styleButtons = panel.querySelectorAll('[data-style]');
      const cssOutput = panel.querySelector('.font-css-output');
      const cssCopyBtn = panel.querySelector('.font-css-copy');

      const fallback = cfg.family.includes('Serif') ? 'serif' : 'sans-serif';

      // Current state
      const state = { size: 32, weight: 400, style: 'normal', baseFontSize: 16, lineHeight: 1.3 };

      function emValue() {
        const v = state.size / state.baseFontSize;
        return parseFloat(v.toFixed(2));
      }

      function updateSpecimen() {
        if (!specimen) return;
        specimen.style.fontSize = emValue() + 'em';
        specimen.style.lineHeight = state.lineHeight + 'em';
      }

      function updateDisplays() {
        if (sizeDisplay) sizeDisplay.textContent = emValue() + 'em';
        if (lineHeightDisplay) lineHeightDisplay.textContent = state.lineHeight + 'em';
      }

      function updateCSSOutput() {
        if (!cssOutput) return;
        const lines = [
          `font-family: "${cfg.family}", ${fallback};`,
          `font-size: ${emValue()}em;`,
          `font-weight: ${state.weight};`,
          `line-height: ${state.lineHeight}em;`
        ];
        if (state.style === 'italic') lines.push(`font-style: italic;`);
        cssOutput.textContent = lines.join('\n');
      }

      if (specimen) {
        specimen.style.fontFamily = `"${cfg.family}", ${fallback}`;
        specimen.classList.remove('leading-relaxed');
      }

      // Size slider
      if (sizeSlider && specimen) {
        sizeSlider.addEventListener('input', () => {
          state.size = parseInt(sizeSlider.value, 10);
          updateSpecimen();
          updateDisplays();
          updateCSSOutput();
        });
      }

      // Line height slider
      if (lineHeightSlider) {
        lineHeightSlider.addEventListener('input', () => {
          state.lineHeight = parseFloat(parseFloat(lineHeightSlider.value).toFixed(1));
          updateSpecimen();
          updateDisplays();
          updateCSSOutput();
        });
      }

      // Base font size input
      if (baseFontInput) {
        baseFontInput.addEventListener('input', () => {
          const v = parseInt(baseFontInput.value, 10);
          if (v >= 8 && v <= 32) {
            state.baseFontSize = v;
            updateSpecimen();
            updateDisplays();
            updateCSSOutput();
          }
        });
      }

      // Weight buttons
      weightButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          state.weight = parseInt(btn.dataset.weight, 10) || 400;
          if (specimen) specimen.style.fontWeight = state.weight;
          weightButtons.forEach(b => b.classList.remove('active', 'bg-cerulean/5', 'border-cerulean', 'text-cerulean'));
          weightButtons.forEach(b => { b.classList.add('border-light-grey'); b.classList.remove('border-cerulean'); });
          btn.classList.add('border-cerulean', 'text-cerulean', 'bg-cerulean/5');
          btn.classList.remove('border-light-grey');
          updateCSSOutput();
        });
      });

      // Style toggle (Italic)
      styleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const isActive = btn.classList.contains('text-cerulean');
          if (isActive) {
            state.style = 'normal';
            if (specimen) specimen.style.fontStyle = 'normal';
            btn.classList.remove('border-cerulean', 'text-cerulean', 'bg-cerulean/5');
            btn.classList.add('border-light-grey');
          } else {
            state.style = 'italic';
            if (specimen) specimen.style.fontStyle = 'italic';
            btn.classList.add('border-cerulean', 'text-cerulean', 'bg-cerulean/5');
            btn.classList.remove('border-light-grey');
          }
          updateCSSOutput();
        });
      });

      // Preview text buttons (Heading / Paragraph)
      const previewBtns = panel.querySelectorAll('.preview-btn');
      const paraCountInput = panel.querySelector('.paragraph-count');
      const paraCountLabel = panel.querySelector('.paragraph-count-label');
      let userEdited = false;

      if (specimen) {
        specimen.addEventListener('input', () => { userEdited = true; });
      }

      function setPreviewText(type, count) {
        if (!specimen) return;
        userEdited = false;
        if (type === 'heading') {
          specimen.textContent = HEADING_TEXT;
        } else {
          const n = Math.max(1, Math.min(count || 1, LOREM_PARAGRAPHS.length));
          specimen.innerHTML = LOREM_PARAGRAPHS.slice(0, n)
            .map(p => '<p style="margin-bottom:0.75em">' + p + '</p>').join('');
        }
      }

      function activatePreviewBtn(btn) {
        previewBtns.forEach(b => {
          b.classList.remove('border-cerulean', 'text-cerulean', 'bg-cerulean/5');
          b.classList.add('border-light-grey');
        });
        btn.classList.add('border-cerulean', 'text-cerulean', 'bg-cerulean/5');
        btn.classList.remove('border-light-grey');
      }

      previewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.preview;
          activatePreviewBtn(btn);
          const showParaCount = type === 'paragraph';
          if (paraCountInput) paraCountInput.classList.toggle('hidden', !showParaCount);
          if (paraCountLabel) paraCountLabel.classList.toggle('hidden', !showParaCount);
          const count = paraCountInput ? parseInt(paraCountInput.value, 10) : 1;
          setPreviewText(type, count);
        });
      });

      if (paraCountInput) {
        paraCountInput.addEventListener('input', () => {
          const activeBtn = panel.querySelector('.preview-btn.text-cerulean');
          if (activeBtn && activeBtn.dataset.preview === 'paragraph') {
            setPreviewText('paragraph', parseInt(paraCountInput.value, 10));
          }
        });
      }

      // Copy CSS button
      if (cssCopyBtn && cssOutput) {
        cssCopyBtn.addEventListener('click', () => {
          copyToClipboard(cssOutput.textContent);
        });
      }

      // Initial render
      updateSpecimen();
      updateDisplays();
      updateCSSOutput();
    }

    /* ---- Font Package Builder ---- */
    function initPackageBuilder() {
      const builder = document.getElementById('font-package-builder');
      if (!builder) return;

      const checkboxes = builder.querySelectorAll('input[type="checkbox"]');
      const linkCodeEl = document.getElementById('link-code');
      const importCodeEl = document.getElementById('import-code');

      // Map display names to URL-safe names
      const FONT_URL_MAP = {
        'Inter Tight': 'Inter+Tight',
        'IBM Plex Serif': 'IBM+Plex+Serif',
        'Inter+Tight': 'Inter+Tight',
        'IBM+Plex+Serif': 'IBM+Plex+Serif'
      };

      function update() {
        // Collect checked weights/styles per font
        const selected = {
          'Inter+Tight': [],
          'IBM+Plex+Serif': []
        };

        checkboxes.forEach(cb => {
          if (!cb.checked) return;
          const font = cb.dataset.font; // e.g. 'Inter Tight' or 'IBM Plex Serif'
          const weight = cb.dataset.weight; // e.g. '400'
          const italic = cb.dataset.italic === 'true' || cb.dataset.italic === '1';
          const key = FONT_URL_MAP[font];
          if (key && selected[key]) {
            selected[key].push(`${italic ? '1' : '0'},${weight}`);
          }
        });

        // Build URL parts
        const familyParts = [];
        for (const [fontName, axes] of Object.entries(selected)) {
          if (axes.length === 0) continue;
          // Sort axes: by ital then weight
          axes.sort((a, b) => {
            const [ai, aw] = a.split(',').map(Number);
            const [bi, bw] = b.split(',').map(Number);
            return ai - bi || aw - bw;
          });
          familyParts.push(`family=${fontName}:ital,wght@${axes.join(';')}`);
        }

        if (familyParts.length === 0) {
          if (linkCodeEl) linkCodeEl.textContent = '<!-- Select fonts above -->';
          if (importCodeEl) importCodeEl.textContent = '/* Select fonts above */';
          return;
        }

        const url = `https://fonts.googleapis.com/css2?${familyParts.join('&')}&display=swap`;
        const linkTag = `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="${url}" rel="stylesheet">`;
        const importStatement = `@import url('${url}');`;

        if (linkCodeEl) linkCodeEl.textContent = linkTag;
        if (importCodeEl) importCodeEl.textContent = importStatement;
      }

      checkboxes.forEach(cb => cb.addEventListener('change', update));

      // Copy buttons
      builder.querySelectorAll('[data-copy]').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetId = btn.dataset.copy;
          const block = document.getElementById(targetId);
          if (block) copyToClipboard(block.textContent);
        });
      });

      update();
    }

    function init() {
      FONTS.forEach(initPanel);
      initPackageBuilder();
    }

    return { init };
  })();

  /* ================================================================
   *  6. ICON BROWSER MODULE
   * ================================================================ */

  const IconBrowser = (() => {
    const FUSE_URL = 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.mjs';
    const MANIFEST_URL = 'assets/js/icon-manifest.json';
    const ICONS_PER_PAGE = 72;

    let manifest = [];     // full icon list from JSON
    let filtered = [];     // after search/filter
    let displayed = 0;     // how many currently shown
    let fuse = null;       // Fuse.js instance
    let FuseConstructor = null; // Fuse.js class reference
    let svgCache = new Map();
    let observer = null;   // IntersectionObserver

    let activeFilter = 'all';

    // Modal state
    let modalIcon = null;
    let modalColor = BRAND_COLORS.cobalt.hex;
    let modalWidth = 64;
    let modalHeight = 64;
    let naturalRatio = 1;
    let expandedViewBox = null; // Stores expanded viewBox string if content extends beyond original

    /* ---- DOM references ---- */
    const grid      = () => document.getElementById('icon-grid');
    const loadMore  = () => document.getElementById('icon-load-more');
    const searchBox = () => document.getElementById('icon-search');
    const modal     = () => document.getElementById('icon-modal');

    /* ---- SVG fetching with cache ---- */
    async function fetchSVG(path) {
      if (svgCache.has(path)) return svgCache.get(path);
      try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        svgCache.set(path, text);
        return text;
      } catch (err) {
        console.error('SVG fetch failed:', path, err);
        return null;
      }
    }

    /* ---- IntersectionObserver for lazy loading ---- */
    function setupObserver() {
      if (observer) observer.disconnect();
      observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const cell = entry.target;
          const idx = parseInt(cell.dataset.idx, 10);
          if (isNaN(idx)) return;
          const icon = filtered[idx];
          if (!icon) return;
          observer.unobserve(cell);
          const svgContainer = cell.querySelector('.icon-svg');
          if (svgContainer && !svgContainer.innerHTML.trim()) {
            fetchSVG(icon.f).then(svg => {
              if (svg && svgContainer) svgContainer.innerHTML = svg;
            });
          }
        });
      }, { rootMargin: '200px' });
    }

    /* ---- Render icon cells ---- */
    function renderCells(startIdx, count) {
      const g = grid();
      if (!g) return;
      const end = Math.min(startIdx + count, filtered.length);

      const STYLE_ABBR = { solid: 'S', regular: 'R', light: 'L', thin: 'T', brands: 'B' };
      for (let i = startIdx; i < end; i++) {
        const icon = filtered[i];
        const cell = document.createElement('div');
        cell.className = 'icon-grid-cell';
        cell.dataset.idx = String(i);
        const badge = STYLE_ABBR[icon.c] || '';
        cell.innerHTML = `<div class="icon-svg"></div><span class="icon-name">${escapeHTML(icon.n)}</span><span class="icon-style-badge">${badge}</span>`;
        cell.addEventListener('click', () => openModal(i));
        g.appendChild(cell);
        observer.observe(cell);
      }

      displayed = end;

      // Toggle load-more button
      const btn = loadMore();
      if (btn) btn.classList.toggle('hidden', displayed >= filtered.length);
    }

    function resetGrid() {
      const g = grid();
      if (!g) return;
      g.innerHTML = '';
      displayed = 0;
      setupObserver();
      renderCells(0, ICONS_PER_PAGE);
    }

    /* ---- Search & filter ---- */
    function applyFilter() {
      if (activeFilter === 'all') {
        filtered = [...manifest];
      } else {
        filtered = manifest.filter(i => i.c === activeFilter);
      }
    }

    function applySearch(query) {
      applyFilter();
      if (query && FuseConstructor) {
        // Rebuild Fuse with filtered set
        const localFuse = new FuseConstructor(filtered, { keys: ['n', 't'], threshold: 0.3 });
        filtered = localFuse.search(query).map(r => r.item);
      }
      resetGrid();
    }

    const STYLE_PREFIX = { solid: 'fa-solid', regular: 'fa-regular', light: 'fa-light', thin: 'fa-thin', brands: 'fa-brands' };

    function buildUsageBlock(label, code) {
      return `<div class="flex items-center justify-between bg-nearly-black rounded-lg px-3 py-2 group">
        <code class="text-green-400 text-xs font-mono truncate mr-2">${escapeHTML(code)}</code>
        <button class="icon-usage-copy shrink-0 text-white/50 hover:text-white transition-colors" data-code="${escapeHTML(code)}" title="Copy code"><span class="sr-only">Copy</span><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
      </div>`;
    }

    /* ---- Modal ---- */
    function openModal(idx) {
      modalIcon = filtered[idx];
      if (!modalIcon) return;

      const m = modal();
      if (!m) return;
      m.classList.add('is-active');

      // Set name and FA class
      const nameEl = document.getElementById('icon-modal-name');
      if (nameEl) nameEl.textContent = modalIcon.n;
      const faClassEl = document.getElementById('icon-modal-fa-class');
      if (faClassEl) faClassEl.textContent = `(fa-${modalIcon.n})`;

      // Load SVG preview
      const preview = document.getElementById('icon-modal-preview');
      if (preview) {
        preview.style.color = modalColor;
        fetchSVG(modalIcon.f).then(svg => {
          if (svg && preview) {
            preview.innerHTML = svg;
            const svgEl = preview.querySelector('svg');
            if (svgEl) {
              // Ensure fill uses currentColor for recoloring
              if (!svgEl.getAttribute('fill')) svgEl.setAttribute('fill', 'currentColor');
              svgEl.setAttribute('overflow', 'hidden');
              // Strip explicit width/height so SVG renders at viewBox size initially
              svgEl.removeAttribute('width');
              svgEl.removeAttribute('height');
              // Parse original viewBox
              const vb = svgEl.getAttribute('viewBox');
              let vbW = 512, vbH = 512, vbX = 0, vbY = 0;
              if (vb) {
                const parts = vb.split(/[\s,]+/).map(Number);
                if (parts.length === 4 && parts[3] !== 0) {
                  vbX = parts[0]; vbY = parts[1]; vbW = parts[2]; vbH = parts[3];
                }
              }
              // Expand viewBox to include any paths that extend beyond it (common in FontAwesome)
              expandedViewBox = null;
              try {
                const bbox = svgEl.getBBox();
                const bx = bbox.x, by = bbox.y, bw = bbox.width, bh = bbox.height;
                const newX = Math.min(vbX, bx);
                const newY = Math.min(vbY, by);
                const newW = Math.max(vbX + vbW, bx + bw) - newX;
                const newH = Math.max(vbY + vbH, by + bh) - newY;
                if (newW !== vbW || newH !== vbH || newX !== vbX || newY !== vbY) {
                  expandedViewBox = `${newX} ${newY} ${newW} ${newH}`;
                  svgEl.setAttribute('viewBox', expandedViewBox);
                  vbX = newX; vbY = newY; vbW = newW; vbH = newH;
                }
              } catch(e) { /* getBBox may fail if not rendered yet */ }
              naturalRatio = vbW / vbH;
              // Fit SVG within preview box
              // h-48 = 192px, p-6 = 24px each side → 144px available height
              const maxW = (preview.offsetWidth || 400) - 48;
              const maxH = 144;
              const fitW = maxW;
              const fitH = fitW * (vbH / vbW);
              let finalW, finalH;
              if (fitH <= maxH) {
                finalW = fitW;
                finalH = fitH;
              } else {
                finalH = maxH;
                finalW = maxH * (vbW / vbH);
              }
              svgEl.setAttribute('width', Math.round(finalW));
              svgEl.setAttribute('height', Math.round(finalH));
            }
          }
        });
      }

      // Reset dimensions
      modalWidth = 64;
      modalHeight = 64;
      naturalRatio = 1;
      const slider = document.getElementById('icon-size-slider');
      const sizeInput = document.getElementById('icon-size-input');
      if (slider) slider.value = 64;
      if (sizeInput) sizeInput.value = 64;

      // Usage code blocks
      const usageContainer = document.getElementById('icon-usage-blocks');
      if (usageContainer) {
        const prefix = STYLE_PREFIX[modalIcon.c] || 'fa-solid';
        const htmlClass = `<i class="${prefix} fa-${modalIcon.n}"></i>`;
        const cssClass = `${prefix} fa-${modalIcon.n}`;
        let blocks = '';
        blocks += buildUsageBlock('HTML', htmlClass);
        blocks += buildUsageBlock('Class', cssClass);
        usageContainer.innerHTML = blocks;
        // Wire copy buttons
        usageContainer.querySelectorAll('.icon-usage-copy').forEach(btn => {
          btn.addEventListener('click', () => copyToClipboard(btn.dataset.code));
        });
      }
    }

    function closeModal() {
      const m = modal();
      if (m) m.classList.remove('is-active');
      modalIcon = null;
    }

    async function downloadIcon(format) {
      if (!modalIcon) return;
      const svgStr = await fetchSVG(modalIcon.f);
      if (!svgStr) { showToast('Failed to load icon.'); return; }

      const baseName = `${modalIcon.n}-${modalWidth}x${modalHeight}`;

      // Apply expanded viewBox if content extends beyond original viewBox
      let dlSvgStr = svgStr;
      if (expandedViewBox) {
        dlSvgStr = dlSvgStr.replace(/viewBox=["'][^"']+["']/, `viewBox="${expandedViewBox}"`);
      }

      if (format === 'svg') {
        let modified = dlSvgStr
          .replace(/<svg/, `<svg width="${modalWidth}" height="${modalHeight}"`)
          .replace(/fill="currentColor"/g, `fill="${modalColor}"`);
        const blob = new Blob([modified], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        downloadDataURL(url, `${baseName}.svg`);
        URL.revokeObjectURL(url);
      } else {
        let coloredSVG = dlSvgStr
          .replace(/fill="currentColor"/g, `fill="${modalColor}"`)
          .replace(/(<svg[^>]*?)(?:\s+width="[^"]*")?(?:\s+height="[^"]*")?/, `$1 width="${modalWidth}" height="${modalHeight}"`);
        if (!coloredSVG.includes('xmlns=')) {
          coloredSVG = coloredSVG.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        const bgColor = format === 'jpg' ? '#FFFFFF' : null;
        try {
          const dataURL = await svgToRaster(coloredSVG, modalWidth, modalHeight, format, bgColor);
          downloadDataURL(dataURL, `${baseName}.${format}`);
        } catch (err) {
          console.error('Rasterization failed:', err);
          showToast('Export failed. Please try again.');
        }
      }
    }

    function init() {
      const section = document.getElementById('icons-section') || document.getElementById('icons');
      if (!section) return;

      // Load manifest + Fuse.js in parallel
      Promise.all([
        fetch(MANIFEST_URL).then(r => r.json()),
        import(FUSE_URL).then(m => m.default || m)
      ]).then(([data, FuseClass]) => {
        manifest = data;
        filtered = [...manifest];
        FuseConstructor = FuseClass;
        fuse = new FuseConstructor(manifest, { keys: ['n', 't'], threshold: 0.3 });

        setupObserver();
        renderCells(0, ICONS_PER_PAGE);

        // Search
        const search = searchBox();
        if (search) {
          search.addEventListener('input', debounce(() => {
            applySearch(search.value.trim());
          }, 200));
        }

        // Filter tabs
        document.querySelectorAll('#icon-filter-tabs button[data-filter]').forEach(btn => {
          btn.addEventListener('click', () => {
            activeFilter = btn.dataset.filter;
            document.querySelectorAll('#icon-filter-tabs button').forEach(b => {
              b.classList.remove('bg-nearly-black', 'text-white');
              b.classList.add('text-medium-grey');
            });
            btn.classList.add('bg-nearly-black', 'text-white');
            btn.classList.remove('text-medium-grey');
            const query = searchBox()?.value.trim() || '';
            applySearch(query);
          });
        });

        // Load more
        const lm = loadMore();
        if (lm) {
          lm.addEventListener('click', () => {
            renderCells(displayed, ICONS_PER_PAGE);
          });
        }
      }).catch(err => {
        console.error('Icon browser init failed:', err);
      });

      /* ---- Modal event wiring ---- */

      // Close
      const m = modal();
      if (m) {
        m.querySelector('.modal-close')?.addEventListener('click', closeModal);
        m.addEventListener('click', e => {
          if (e.target === m) closeModal();
        });
      }

      // Title click-to-copy FA class
      const titleBtn = document.getElementById('icon-modal-title-btn');
      if (titleBtn) {
        titleBtn.addEventListener('click', () => {
          if (!modalIcon) return;
          copyToClipboard(`fa-${modalIcon.n}`);
        });
      }

      // Color swatches in modal
      const colorPicker = document.getElementById('icon-modal-colors');
      if (colorPicker) {
        colorPicker.addEventListener('click', e => {
          const swatch = e.target.closest('[data-color]');
          if (!swatch) return;
          modalColor = swatch.dataset.color;
          const preview = document.getElementById('icon-modal-preview');
          if (preview) preview.style.color = modalColor;
          // Update active ring styling
          colorPicker.querySelectorAll('[data-color]').forEach(s => {
            s.classList.remove('ring-2', 'ring-offset-2');
            s.classList.add('border-transparent');
          });
          swatch.classList.add('ring-2', 'ring-offset-2');
          swatch.classList.remove('border-transparent');
        });
      }

      // Size slider + input (bidirectional sync)
      const sizeSlider = document.getElementById('icon-size-slider');
      const sizeInput = document.getElementById('icon-size-input');
      function updateIconSize(val, updateInput) {
        val = Math.max(16, Math.min(1024, val || 64));
        modalWidth = val;
        modalHeight = naturalRatio ? Math.round(val / naturalRatio) : val;
        if (sizeSlider) sizeSlider.value = val;
        if (updateInput && sizeInput) sizeInput.value = val;
      }
      if (sizeSlider) {
        sizeSlider.addEventListener('input', () => {
          updateIconSize(parseInt(sizeSlider.value, 10), true);
        });
      }
      if (sizeInput) {
        // Update slider live as user types (no clamping yet)
        sizeInput.addEventListener('input', () => {
          const raw = parseInt(sizeInput.value, 10);
          if (!isNaN(raw) && raw > 0) {
            modalWidth = raw;
            modalHeight = naturalRatio ? Math.round(raw / naturalRatio) : raw;
            if (sizeSlider) sizeSlider.value = Math.max(16, Math.min(1024, raw));
          }
        });
        // Clamp to bounds when user leaves the field
        sizeInput.addEventListener('blur', () => {
          const raw = parseInt(sizeInput.value, 10);
          const clamped = Math.max(16, Math.min(1024, isNaN(raw) ? 64 : raw));
          updateIconSize(clamped, true);
        });
      }

      // Download buttons (SVG, PNG, JPG)
      const dlSvg = document.getElementById('icon-dl-svg');
      const dlPng = document.getElementById('icon-dl-png');
      const dlJpg = document.getElementById('icon-dl-jpg');
      if (dlSvg) dlSvg.addEventListener('click', () => downloadIcon('svg'));
      if (dlPng) dlPng.addEventListener('click', () => downloadIcon('png'));
      if (dlJpg) dlJpg.addEventListener('click', () => downloadIcon('jpg'));
    }

    return { init };
  })();

  /* ================================================================
   *  7. PHOTO GALLERY MODULE
   * ================================================================ */

  const PhotoGallery = (() => {
    let photos = [];       // array of { src, name }
    let currentIndex = 0;

    const lightbox      = () => document.getElementById('lightbox');
    const lightboxImg   = () => document.getElementById('lightbox-img');
    const lightboxName  = () => document.getElementById('lightbox-name');
    const lightboxDL    = () => document.getElementById('lightbox-download');

    /**
     * Turn a filename into a pretty display name.
     * e.g. 'blue-ceramic-tiles-grid-pattern.jpg' → 'Blue Ceramic Tiles Grid Pattern'
     */
    function prettifyFilename(filename) {
      return filename
        .replace(/\.[^.]+$/, '')               // remove extension
        .replace(/[-_]+/g, ' ')                 // dashes/underscores → spaces
        .replace(/\b\w/g, c => c.toUpperCase()); // title case
    }

    /**
     * Derive lightbox-sized path from original.
     * 'stock-photos/foo.jpg' → 'stock-photos/lightbox/foo.jpg'
     */
    function lightboxPath(originalSrc) {
      const parts = originalSrc.split('/');
      const filename = parts.pop();
      return parts.join('/') + '/lightbox/' + filename;
    }

    function openLightbox(index) {
      currentIndex = index;
      const photo = photos[currentIndex];
      if (!photo) return;

      const lb = lightbox();
      if (lb) lb.classList.add('is-active');

      const img = lightboxImg();
      if (img) { img.src = lightboxPath(photo.src); img.alt = photo.name; }

      const name = lightboxName();
      if (name) name.textContent = photo.name;

      // Download still links to original full-res
      const dl = lightboxDL();
      if (dl) { dl.href = photo.src; dl.download = photo.src.split('/').pop(); }
    }

    function closeLightbox() {
      const lb = lightbox();
      if (lb) lb.classList.remove('is-active');
      const img = lightboxImg();
      if (img) img.src = '';
    }

    function navigate(delta) {
      currentIndex = (currentIndex + delta + photos.length) % photos.length;
      openLightbox(currentIndex);
    }

    function init() {
      const cells = document.querySelectorAll('.photo-cell');
      if (!cells.length) return;

      photos = Array.from(cells).map(cell => {
        const src = cell.dataset.src || cell.querySelector('img')?.src || '';
        const filename = src.split('/').pop() || '';
        return { src, name: prettifyFilename(filename) };
      });

      // Click to open
      cells.forEach((cell, i) => {
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', () => openLightbox(i));
      });

      // Close button
      document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);

      // Prev / Next
      document.getElementById('lightbox-prev')?.addEventListener('click', () => navigate(-1));
      document.getElementById('lightbox-next')?.addEventListener('click', () => navigate(1));

      // Click outside image closes lightbox
      const lb = lightbox();
      if (lb) {
        lb.addEventListener('click', e => {
          if (e.target === lb) closeLightbox();
        });
      }
    }

    return { init };
  })();

  /* ================================================================
   *  KEYBOARD SUPPORT
   * ================================================================ */

  function initKeyboard() {
    document.addEventListener('keydown', e => {
      // Escape closes modals / lightbox
      if (e.key === 'Escape') {
        const lb = document.getElementById('lightbox');
        if (lb && lb.classList.contains('is-active')) {
          lb.classList.remove('is-active');
          const img = document.getElementById('lightbox-img');
          if (img) img.src = '';
          return;
        }
        const iconModal = document.getElementById('icon-modal');
        if (iconModal && iconModal.classList.contains('is-active')) {
          iconModal.classList.remove('is-active');
          return;
        }
        const brandBookModal = document.getElementById('brand-book-modal');
        if (brandBookModal && brandBookModal.classList.contains('is-active')) {
          brandBookModal.classList.remove('is-active');
          return;
        }
      }

      // Arrow keys navigate lightbox
      const lb = document.getElementById('lightbox');
      if (lb && lb.classList.contains('is-active')) {
        if (e.key === 'ArrowLeft') {
          document.getElementById('lightbox-prev')?.click();
        } else if (e.key === 'ArrowRight') {
          document.getElementById('lightbox-next')?.click();
        }
      }
    });
  }

  /* ================================================================
   *  HELPERS
   * ================================================================ */

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ================================================================
   *  BOOTSTRAP
   * ================================================================ */

  function init() {
    Navigation.init();
    PDFViewer.init();
    LogoSection.init();
    ColorSection.init();
    FontShowcase.init();
    IconBrowser.init();
    PhotoGallery.init();
    initKeyboard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
