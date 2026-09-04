/**
 * GALERÍA Y MASONRY GRID — MIGUEL ALZARI
 * Lógica de grilla masonry con soporte para extracción automática de diapositivas PDF.
 * Detecta PDFs en el campo principal o en el campo pdf_file y extrae las diapositivas
 * como imágenes de alta resolución en tiempo real.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('gallery-container');
  const projectCountEl = document.getElementById('project-count');
  const modal = document.getElementById('project-modal');
  const closeBtn = document.getElementById('close-modal');
  const modalImages = document.getElementById('modal-images');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalFormat = document.getElementById('modal-format');

  if (!container) return;

  // --------------------------------------------------------------------------
  // Controladores de eventos del Modal
  // --------------------------------------------------------------------------
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      closeModal();
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      const rect = modal.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        closeModal();
      }
    });

    modal.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeModal();
    });
  }

  function closeModal() {
    if (!modal) return;
    modal.style.opacity = '0';
    modal.style.transform = 'scale(0.98)';
    setTimeout(() => {
      modal.close();
      modal.style.opacity = '';
      modal.style.transform = '';
      if (modalImages) modalImages.innerHTML = '';
    }, 200);
  }

  // --------------------------------------------------------------------------
  // Carga dinámica de PDF.js bajo demanda
  // --------------------------------------------------------------------------
  let pdfjsPromise = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfjsPromise) return pdfjsPromise;

    pdfjsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return pdfjsPromise;
  }

  // Helper para limpiar rutas
  function cleanPath(p) {
    if (!p) return '';
    return p.startsWith('/') ? p.substring(1) : p;
  }

  // Helper para parsear URLs o IDs de Vimeo
  function parseVimeo(urlOrId) {
    if (!urlOrId) return null;
    const str = String(urlOrId).trim();
    if (/^\d+$/.test(str)) {
      return { id: str, hash: '' };
    }
    const regExp = /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]+\/videos\/|video\/|)(\d+))(?:(?:\/|\?h=)([a-zA-Z0-9]+))?/;
    const match = str.match(regExp);
    if (match && match[1]) {
      return { id: match[1], hash: match[2] || '' };
    }
    const digitsMatch = str.match(/\b(\d{7,11})\b/);
    if (digitsMatch) {
      return { id: digitsMatch[1], hash: '' };
    }
    return null;
  }

  // Helper para parsear proporciones de recorte tipo "16:9", "1:1", "9:16", "4:5", "21:9", "4:3"
  function parseCropRatio(cropStr, fallbackRatio = 16 / 9) {
    if (!cropStr) return fallbackRatio;
    const parts = String(cropStr).trim().split(':');
    if (parts.length === 2) {
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (num && den) return num / den;
    }
    return fallbackRatio;
  }

  // --------------------------------------------------------------------------
  // Carga asíncrona de datos desde data/proyectos.json
  // --------------------------------------------------------------------------
  try {
    const timestamp = new Date().getTime();
    const response = await fetch(`data/proyectos.json?v=${timestamp}`, {
      cache: "no-store",
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!response.ok) throw new Error('No se pudo encontrar data/proyectos.json');

    const data = await response.json();
    const items = data.items || [];

    if (projectCountEl) {
      projectCountEl.textContent = `01 — ${String(items.length).padStart(2, '0')}`;
    }

    if (items.length === 0) {
      container.innerHTML = '<p style="grid-column: 1 / -1; padding: 4rem 0; text-align: right; color: var(--text-muted); font-size: 0.9rem;">Próximamente estaremos publicando más proyectos.</p>';
      return;
    }

    container.innerHTML = '';

    items.forEach((item, index) => {
      // Formatos válidos: square, portrait, landscape (exacto a emebe-pagina)
      const formatClass = `format-${item.format || 'square'}`;
      const shapeVal = item.image_shape || 'none';
      const imgCornerClass = shapeVal === 'none' ? '' : shapeVal;
      const itemIndex = String(index + 1).padStart(2, '0');

      const rawImagePath = cleanPath(item.image);
      const isPdfImage = rawImagePath && rawImagePath.toLowerCase().endsWith('.pdf');
      const initialImgSrc = isPdfImage ? '' : (rawImagePath ? `${rawImagePath}?v=${timestamp}` : '');

      const vimeoData = parseVimeo(item.vimeo_url);
      const hasVimeo = Boolean(vimeoData && vimeoData.id);
      const defaultCrop = item.format === 'square' ? '1:1' : (item.format === 'portrait' ? '9:16' : '16:9');
      const cropRatio = parseCropRatio(item.video_crop || defaultCrop);
      const sourceRatio = parseCropRatio(item.vimeo_source_aspect || '16:9');
      const videoAlign = item.video_align || 'center';

      let mediaHtml = '';
      if (hasVimeo) {
        const bgVimeoUrl = `https://player.vimeo.com/video/${vimeoData.id}?background=1&autoplay=1&loop=1&byline=0&title=0&muted=1&playsinline=1&autopause=0${vimeoData.hash ? `&h=${vimeoData.hash}` : ''}`;
        mediaHtml = `
          ${rawImagePath ? `<img src="${rawImagePath}?v=${timestamp}" alt="${escapeHtml(item.title)}" class="vimeo-fallback-poster" loading="lazy">` : ''}
          <div class="vimeo-wrapper">
            <iframe src="${bgVimeoUrl}"
                    frameborder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    tabindex="-1"
                    title="${escapeHtml(item.title)}"
                    data-source-ratio="${sourceRatio}"
                    data-crop-align="${videoAlign}">
            </iframe>
          </div>
        `;
      } else {
        mediaHtml = `<img src="${initialImgSrc}" alt="${escapeHtml(item.title)}" loading="lazy">`;
      }

      const div = document.createElement('div');
      div.className = `grid-item ${formatClass}`;
      div.dataset.index = index;
      if (hasVimeo) {
        div.dataset.hasVimeo = 'true';
        div.dataset.cropRatio = cropRatio;
        div.dataset.cropAlign = videoAlign;
        div.dataset.sourceRatio = sourceRatio;
      }

      div.innerHTML = `
        <div class="image-wrapper ${imgCornerClass}">
          ${mediaHtml}
          <div class="overlay">
            ${hasVimeo ? '<span class="overlay-badge">VIDEO</span>' : ''}
            <h3>${escapeHtml(item.title)}</h3>
            <span>${hasVimeo ? 'Reproducir video &rarr;' : 'Ver detalles &rarr;'}</span>
          </div>
        </div>
      `;

      div.addEventListener('click', () => {
        openModal(item, timestamp, itemIndex);
      });

      container.appendChild(div);

      if (hasVimeo) {
        resizeGridItem(div, null);
        const iframe = div.querySelector('.vimeo-wrapper iframe');
        if (iframe) {
          iframe.addEventListener('load', () => updateVimeoSizing(div));
        }
        setTimeout(() => updateVimeoSizing(div), 60);
      }

      const imgNode = div.querySelector('img:not(.vimeo-fallback-poster)');

      // Si la imagen de portada es un PDF, extraemos la primera diapositiva como portada
      if (isPdfImage && imgNode) {
        loadPdfJs().then(async pdfjs => {
          try {
            const loadingTask = pdfjs.getDocument(`${rawImagePath}?v=${timestamp}`);
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

            imgNode.src = canvas.toDataURL('image/webp', 0.9);
            imgNode.onload = () => resizeGridItem(div, imgNode);
            resizeGridItem(div, imgNode);
          } catch (e) {
            console.error('Error al extraer portada de PDF:', e);
          }
        });
      } else if (imgNode && !hasVimeo) {
        if (imgNode.complete && imgNode.naturalWidth > 0) {
          resizeGridItem(div, imgNode);
        } else {
          imgNode.addEventListener('load', () => {
            resizeGridItem(div, imgNode);
          });
        }
      }
    });

  } catch (error) {
    console.error('Error al cargar proyectos:', error);
    container.innerHTML = '<p style="grid-column: 1 / -1; padding: 4rem 0; text-align: right; color: var(--text-muted); font-size: 0.9rem;">No se pudieron cargar los proyectos en este momento.</p>';
  }

  // --------------------------------------------------------------------------
  // Algoritmo de Grilla Masonry & Recorte de Videos
  // --------------------------------------------------------------------------
  function resizeGridItem(item, img) {
    const rowHeight = 10;
    const rowGap = 24; // 1.5rem = 24px
    const gridColWidth = item.getBoundingClientRect().width;

    let targetHeight;
    if (item.classList.contains('format-square')) {
      targetHeight = gridColWidth;
    } else if (item.dataset.hasVimeo === 'true') {
      const cropRatio = parseFloat(item.dataset.cropRatio) || (16 / 9);
      targetHeight = gridColWidth / cropRatio;
    } else if (img) {
      const naturalRatio = img.naturalWidth / img.naturalHeight;
      if (!naturalRatio || isNaN(naturalRatio)) return;
      targetHeight = gridColWidth / naturalRatio;
    } else {
      targetHeight = gridColWidth * 0.75;
    }

    const rowSpan = Math.ceil((targetHeight + rowGap) / (rowHeight + rowGap));
    item.style.gridRowEnd = 'span ' + rowSpan;

    if (item.dataset.hasVimeo === 'true') {
      updateVimeoSizing(item);
    }
  }

  // Ajuste de escala y encuadre para object-fit cover en iframes de Vimeo
  function updateVimeoSizing(item) {
    const iframe = item.querySelector('.vimeo-wrapper iframe');
    const wrapper = item.querySelector('.image-wrapper');
    if (!iframe || !wrapper) return;

    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    if (!w || !h) return;

    const sourceRatio = parseFloat(iframe.dataset.sourceRatio) || (16 / 9);
    const containerRatio = w / h;
    const align = iframe.dataset.cropAlign || 'center';

    let finalW, finalH;
    if (containerRatio > sourceRatio) {
      finalW = w;
      finalH = w / sourceRatio;
    } else {
      finalH = h;
      finalW = h * sourceRatio;
    }

    iframe.style.width = `${Math.ceil(finalW)}px`;
    iframe.style.height = `${Math.ceil(finalH)}px`;

    if (align === 'top') {
      iframe.style.top = '0';
      iframe.style.bottom = 'auto';
      iframe.style.left = '50%';
      iframe.style.transform = 'translateX(-50%)';
    } else if (align === 'bottom') {
      iframe.style.top = 'auto';
      iframe.style.bottom = '0';
      iframe.style.left = '50%';
      iframe.style.transform = 'translateX(-50%)';
    } else {
      iframe.style.top = '50%';
      iframe.style.bottom = 'auto';
      iframe.style.left = '50%';
      iframe.style.transform = 'translate(-50%, -50%)';
    }
  }

  function resizeAllGridItems() {
    const allItems = document.querySelectorAll('.grid-item');
    allItems.forEach(item => {
      const img = item.querySelector('img:not(.vimeo-fallback-poster)');
      if (item.dataset.hasVimeo === 'true') {
        resizeGridItem(item, null);
      } else if (img && img.complete && img.naturalWidth > 0) {
        resizeGridItem(item, img);
      }
    });
  }

  window.addEventListener('resize', resizeAllGridItems);

  // --------------------------------------------------------------------------
  // Apertura del Modal y Extracción de Diapositivas PDF / Video
  // --------------------------------------------------------------------------
  async function openModal(item, timestamp, itemIndex) {
    if (!modal) return;

    modalTitle.textContent = item.title;
    modalDesc.textContent = item.description || '';

    if (modalFormat) {
      modalFormat.textContent = `PROYECTO ${itemIndex || ''} &bull; FORMATO ${item.format ? item.format.toUpperCase() : 'ESTÁNDAR'}`;
    }

    const rawImagePath = cleanPath(item.image);
    const isPdfImage = rawImagePath && rawImagePath.toLowerCase().endsWith('.pdf');
    const targetPdf = item.pdf_file ? cleanPath(item.pdf_file) : (isPdfImage ? rawImagePath : null);

    // Contenedor de imágenes y multimedia
    let imagesHtml = '';

    // Si tiene video de Vimeo, inyectamos el reproductor con audio en el modal
    const vimeoData = parseVimeo(item.vimeo_url);
    if (vimeoData && vimeoData.id) {
      imagesHtml += `
        <div class="modal-video-container">
          <iframe src="https://player.vimeo.com/video/${vimeoData.id}?autoplay=1&title=0&byline=0&portrait=0${vimeoData.hash ? `&h=${vimeoData.hash}` : ''}"
                  frameborder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowfullscreen>
          </iframe>
        </div>
      `;
    }

    // Imagen principal (si existe y no es PDF)
    if (rawImagePath && !isPdfImage) {
      const imgClass = (vimeoData && vimeoData.id) ? 'extra-modal-img' : 'main-modal-img';
      imagesHtml += `<img src="${rawImagePath}?v=${timestamp}" alt="${escapeHtml(item.title)}" class="${imgClass}">`;
    }

    // Galería adicional (sub-imágenes y sub-videos de Vimeo)
    if (item.gallery && item.gallery.length > 0) {
      item.gallery.forEach((g, gIdx) => {
        if (!g) return;
        const subVimeo = parseVimeo(g.vimeo_url);
        if (subVimeo && subVimeo.id) {
          const caption = g.title || g.caption || `Sub-video ${String(gIdx + 1).padStart(2, '0')}`;
          imagesHtml += `
            <div class="modal-sub-video-item">
              <span class="slide-caption">${escapeHtml(caption)}</span>
              <div class="modal-video-container">
                <iframe src="https://player.vimeo.com/video/${subVimeo.id}?autoplay=0&title=0&byline=0&portrait=0${subVimeo.hash ? `&h=${subVimeo.hash}` : ''}"
                        frameborder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowfullscreen>
                </iframe>
              </div>
            </div>
          `;
        } else if (g.image) {
          const gImgPath = cleanPath(g.image);
          if (!gImgPath.toLowerCase().endsWith('.pdf')) {
            const caption = g.title || g.caption;
            imagesHtml += `
              <div class="modal-sub-image-item">
                <img src="${gImgPath}?v=${timestamp}" alt="${escapeHtml(caption || item.title)}" class="extra-modal-img" loading="lazy">
                ${caption ? `<span class="slide-caption">${escapeHtml(caption)}</span>` : ''}
              </div>
            `;
          }
        }
      });
    }

    // Sub-videos de Vimeo adicionales dedicados (si se configuraron en la lista sub_videos)
    if (item.sub_videos && item.sub_videos.length > 0) {
      item.sub_videos.forEach((sv, svIdx) => {
        if (!sv) return;
        const subVimeo = parseVimeo(sv.vimeo_url);
        if (subVimeo && subVimeo.id) {
          const caption = sv.title || `Sub-video ${String(svIdx + 1).padStart(2, '0')}`;
          imagesHtml += `
            <div class="modal-sub-video-item">
              <span class="slide-caption">${escapeHtml(caption)}</span>
              <div class="modal-video-container">
                <iframe src="https://player.vimeo.com/video/${subVimeo.id}?autoplay=0&title=0&byline=0&portrait=0${subVimeo.hash ? `&h=${subVimeo.hash}` : ''}"
                        frameborder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowfullscreen>
                </iframe>
              </div>
            </div>
          `;
        }
      });
    }

    modalImages.innerHTML = imagesHtml;

    // Enlace a Vimeo en los metadatos del modal
    const modalSpecs = modal.querySelector('.modal-specs');
    if (modalSpecs) {
      const existingVimeoLink = modalSpecs.querySelector('.vimeo-download-link');
      if (existingVimeoLink) existingVimeoLink.remove();

      if (vimeoData && vimeoData.id) {
        const vimeoLink = document.createElement('a');
        vimeoLink.href = `https://vimeo.com/${vimeoData.id}`;
        vimeoLink.target = '_blank';
        vimeoLink.className = 'pdf-download-link vimeo-download-link';
        vimeoLink.innerHTML = '<span>Ver video en Vimeo</span> &nearr;';
        modalSpecs.appendChild(vimeoLink);
      }
    }

    // Si hay un PDF vinculado (sea en image o en pdf_file), extraer sus diapositivas
    if (targetPdf) {
      const pdfContainer = document.createElement('div');
      pdfContainer.className = 'pdf-slides-wrapper';
      pdfContainer.innerHTML = '<div class="pdf-loading">[ EXTRACIENDO DIAPOSITIVAS DEL DOCUMENTO PDF... ]</div>';
      modalImages.appendChild(pdfContainer);

      const modalSpecs = modal.querySelector('.modal-specs');
      if (modalSpecs) {
        const existingPdfLink = modalSpecs.querySelector('.pdf-download-link');
        if (existingPdfLink) existingPdfLink.remove();

        const pdfLink = document.createElement('a');
        pdfLink.href = `${targetPdf}?v=${timestamp}`;
        pdfLink.target = '_blank';
        pdfLink.className = 'pdf-download-link';
        pdfLink.innerHTML = '<span>Ver Documento PDF Completo</span> &nearr;';
        modalSpecs.appendChild(pdfLink);
      }

      modal.showModal();

      try {
        const pdfjs = await loadPdfJs();
        const loadingTask = pdfjs.getDocument(`${targetPdf}?v=${timestamp}`);
        const pdf = await loadingTask.promise;
        pdfContainer.innerHTML = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          // Escala 2.0 para nitidez Retina / 1920px
          const viewport = page.getViewport({ scale: 2.0 });

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: ctx, viewport }).promise;

          const slideCard = document.createElement('div');
          slideCard.className = 'slide-item';
          slideCard.innerHTML = `
            <img src="${canvas.toDataURL('image/webp', 0.92)}" alt="Diapositiva ${i} de ${pdf.numPages}" class="extra-modal-img">
            <span class="slide-caption">DIAPOSITIVA ${String(i).padStart(2, '0')} / ${String(pdf.numPages).padStart(2, '0')}</span>
          `;
          pdfContainer.appendChild(slideCard);
        }
      } catch (err) {
        console.error('Error al extraer diapositivas del PDF:', err);
        pdfContainer.innerHTML = '<div class="pdf-loading">[ NO SE PUDO CARGAR EL PDF O FORMATO NO COMPATIBLE ]</div>';
      }
    } else {
      const modalSpecs = modal.querySelector('.modal-specs');
      if (modalSpecs) {
        const existingPdfLink = modalSpecs.querySelector('.pdf-download-link');
        if (existingPdfLink) existingPdfLink.remove();
      }
      modal.showModal();
    }
  }

  // Sanitizador de texto
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
