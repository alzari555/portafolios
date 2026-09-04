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

      const div = document.createElement('div');
      div.className = `grid-item ${formatClass}`;
      div.dataset.index = index;

      div.innerHTML = `
        <div class="image-wrapper ${imgCornerClass}">
          <img src="${initialImgSrc}" alt="${escapeHtml(item.title)}" loading="lazy">
          <div class="overlay">
            <h3>${escapeHtml(item.title)}</h3>
            <span>Ver detalles &rarr;</span>
          </div>
        </div>
      `;

      div.addEventListener('click', () => {
        openModal(item, timestamp, itemIndex);
      });

      container.appendChild(div);

      const imgNode = div.querySelector('img');

      // Si la imagen de portada es un PDF, extraemos la primera diapositiva como portada
      if (isPdfImage) {
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
      } else if (imgNode) {
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
  // Algoritmo de Grilla Masonry (Lógica exacta de emebe-pagina)
  // --------------------------------------------------------------------------
  function resizeGridItem(item, img) {
    const rowHeight = 10;
    const rowGap = 24; // 1.5rem = 24px
    const gridColWidth = item.getBoundingClientRect().width;

    let targetHeight;
    if (item.classList.contains('format-square')) {
      targetHeight = gridColWidth;
    } else {
      const naturalRatio = img.naturalWidth / img.naturalHeight;
      if (!naturalRatio || isNaN(naturalRatio)) return;
      targetHeight = gridColWidth / naturalRatio;
    }

    const rowSpan = Math.ceil((targetHeight + rowGap) / (rowHeight + rowGap));
    item.style.gridRowEnd = 'span ' + rowSpan;
  }

  function resizeAllGridItems() {
    const allItems = document.querySelectorAll('.grid-item');
    allItems.forEach(item => {
      const img = item.querySelector('img');
      if (img && img.complete) {
        resizeGridItem(item, img);
      }
    });
  }

  window.addEventListener('resize', resizeAllGridItems);

  // --------------------------------------------------------------------------
  // Apertura del Modal y Extracción de Diapositivas PDF
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

    // Contenedor de imágenes
    let imagesHtml = '';
    // Solo inyectar como imagen bitmap si NO es un archivo PDF
    if (rawImagePath && !isPdfImage) {
      imagesHtml += `<img src="${rawImagePath}?v=${timestamp}" alt="${escapeHtml(item.title)}" class="main-modal-img">`;
    }

    // Galería estática adicional
    if (item.gallery && item.gallery.length > 0) {
      item.gallery.forEach(g => {
        if (g && g.image) {
          const gImgPath = cleanPath(g.image);
          if (!gImgPath.toLowerCase().endsWith('.pdf')) {
            imagesHtml += `<img src="${gImgPath}?v=${timestamp}" alt="Detalle de ${escapeHtml(item.title)}" class="extra-modal-img">`;
          }
        }
      });
    }

    modalImages.innerHTML = imagesHtml;

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
