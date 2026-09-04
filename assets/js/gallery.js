/**
 * GALERÍA Y MASONRY GRID — MIGUEL ALZARI
 * Lógica de grilla masonry adaptada al catálogo editorial de diseño gráfico.
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
      // Cierre al cliquear en el fondo (backdrop)
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
    }, 200);
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
      const format = item.format || 'square';
      const formatClass = `format-${format}`;
      const itemIndex = String(index + 1).padStart(2, '0');

      let imagePath = item.image || '';
      if (imagePath.startsWith('/')) {
        imagePath = imagePath.substring(1);
      }
      const imgSrc = `${imagePath}?v=${timestamp}`;

      const div = document.createElement('div');
      div.className = `grid-item ${formatClass}`;
      div.dataset.index = index;
      div.style.animationDelay = `${index * 0.07}s`;

      div.innerHTML = `
        <div class="image-wrapper">
          <img src="${imgSrc}" alt="${escapeHtml(item.title)}" loading="lazy">
        </div>
        <div class="item-meta-bar">
          <span class="item-meta-title">${escapeHtml(item.title)}</span>
          <span class="item-meta-index">${itemIndex}</span>
        </div>
      `;

      div.addEventListener('click', () => {
        openModal(item, timestamp, itemIndex);
      });

      container.appendChild(div);

      // Redimensionamiento de fila masonry al cargar la imagen
      const imgNode = div.querySelector('img');
      if (imgNode) {
        if (imgNode.complete) {
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
  // Algoritmo de Grilla Masonry (Lógica idéntica a emebe-pagina)
  // --------------------------------------------------------------------------
  function resizeGridItem(item, img) {
    const rowHeight = 10;
    const rowGap = 28; // var(--grid-gap)
    const gridColWidth = item.getBoundingClientRect().width;

    const metaBar = item.querySelector('.item-meta-bar');
    const metaHeight = metaBar ? metaBar.offsetHeight : 44;

    let targetHeight;
    if (item.classList.contains('format-square')) {
      targetHeight = gridColWidth + metaHeight;
    } else {
      const naturalRatio = img.naturalWidth / img.naturalHeight;
      if (!naturalRatio || isNaN(naturalRatio)) return;
      targetHeight = (gridColWidth / naturalRatio) + metaHeight;
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

  // Recalcular al cambiar el tamaño de ventana con debounce
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeAllGridItems, 80);
  });

  // --------------------------------------------------------------------------
  // Apertura del Modal de Detalle
  // --------------------------------------------------------------------------
  function openModal(item, timestamp, itemIndex) {
    if (!modal) return;

    modalTitle.textContent = item.title;
    modalDesc.textContent = item.description || '';

    if (modalFormat) {
      modalFormat.textContent = `PROYECTO ${itemIndex || ''} &bull; FORMATO ${item.format ? item.format.toUpperCase() : 'ESTÁNDAR'}`;
    }

    let mainImgPath = item.image || '';
    if (mainImgPath.startsWith('/')) mainImgPath = mainImgPath.substring(1);

    let imagesHtml = `<img src="${mainImgPath}?v=${timestamp}" alt="${escapeHtml(item.title)}" class="main-modal-img">`;

    if (item.gallery && item.gallery.length > 0) {
      item.gallery.forEach(g => {
        if (g && g.image) {
          let gImgPath = g.image;
          if (gImgPath.startsWith('/')) gImgPath = gImgPath.substring(1);
          imagesHtml += `<img src="${gImgPath}?v=${timestamp}" alt="Detalle de ${escapeHtml(item.title)}" class="extra-modal-img">`;
        }
      });
    }

    modalImages.innerHTML = imagesHtml;
    modal.showModal();
  }

  // Sanitizador de texto
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
