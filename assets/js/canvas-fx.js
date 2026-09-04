/**
 * CANVAS FX — RETÍCULA ÁUREA FRACTAL & RETÍCULA EDITORIAL 3D
 * Estética de diseño gráfico puro: proporción áurea implícita, dibujo técnico, marcas de registro.
 * Adaptación móvil responsiva y separación amplia respecto al texto central.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const heroSection = document.querySelector('.hero-section');
  const heroContainer = document.querySelector('.hero-container');

  let width = 0;
  let height = 0;
  let dpr = 1;
  let animationFrameId = null;

  // Estado del cursor con amortiguación elástica
  const mouse = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    active: false
  };

  // Scroll y desvanecimiento hacia la galería
  let scrollY = 0;
  let targetScrollY = 0;
  let globalFade = 1;

  // Proporción áurea
  const PHI = 1.618033988749895;

  // --------------------------------------------------------------------------
  // Ajuste de resolución y Retina / High-DPI
  // --------------------------------------------------------------------------
  function resize() {
    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    ctx.scale(dpr, dpr);

    if (!mouse.active) {
      mouse.x = width * 0.5;
      mouse.y = height * 0.5;
      mouse.targetX = width * 0.5;
      mouse.targetY = height * 0.5;
    }

    initGridPoints();
  }

  // --------------------------------------------------------------------------
  // 1. Matriz de Puntos de Cota Tipográfica (Cursor)
  // --------------------------------------------------------------------------
  let gridPoints = [];

  function initGridPoints() {
    gridPoints = [];
    // Espaciado adaptativo según resolución
    const gridStep = width < 768 ? 90 : 120;
    const cols = Math.ceil(width / gridStep) + 2;
    const rows = Math.ceil(height / gridStep) + 2;

    const startX = (width - (cols - 1) * gridStep) * 0.5;
    const startY = (height - (rows - 1) * gridStep) * 0.5;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        gridPoints.push({
          homeX: startX + c * gridStep,
          homeY: startY + r * gridStep,
          x: startX + c * gridStep,
          y: startY + r * gridStep,
          z: 0
        });
      }
    }
  }

  function drawEditorialCursorGrid() {
    if (gridPoints.length === 0) return;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.3 * globalFade})`;

    let closestPoint = null;
    let minDistance = Infinity;

    for (let i = 0; i < gridPoints.length; i++) {
      const p = gridPoints[i];
      const dx = mouse.x - p.homeX;
      const dy = mouse.y - p.homeY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = p;
      }

      // Deformación háptica al pasar el cursor o dedo
      const radius = width < 768 ? 130 : 180;
      if (dist < radius && dist > 0.1) {
        const factor = (1 - dist / radius);
        const push = factor * factor * (width < 768 ? 9 : 14);
        p.x = p.homeX - (dx / dist) * push;
        p.y = p.homeY - (dy / dist) * push;
        p.z = factor * 20;
      } else {
        p.x += (p.homeX - p.x) * 0.1;
        p.y += (p.homeY - p.y) * 0.1;
        p.z += (0 - p.z) * 0.1;
      }

      const dotSize = 0.85 + (p.z * 0.02);
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cruz de registro tipográfica (+)
    if (mouse.active) {
      const crossSize = 6;
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = `rgba(0, 0, 0, ${0.4 * globalFade})`;

      ctx.beginPath();
      ctx.moveTo(mouse.x - crossSize, mouse.y);
      ctx.lineTo(mouse.x + crossSize, mouse.y);
      ctx.moveTo(mouse.x, mouse.y - crossSize);
      ctx.lineTo(mouse.x, mouse.y + crossSize);
      ctx.stroke();

      if (closestPoint && minDistance < 130) {
        const lineAlpha = (1 - minDistance / 130) * 0.22 * globalFade;
        ctx.lineWidth = 0.45;
        ctx.strokeStyle = `rgba(0, 0, 0, ${lineAlpha})`;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y);
        ctx.lineTo(closestPoint.x, closestPoint.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 2. Retícula Áurea Fractal (Totalmente Implícita, Cero Textos "Módulo Áureo")
  // Separación garantizada del texto central y adaptación completa a móviles.
  // --------------------------------------------------------------------------
  function drawGoldenRatioFractal(originX, originY, scale, time, scroll) {
    if (scale <= 15) return;

    ctx.save();
    ctx.translate(originX, originY);

    // Rotación sutil y fluida con el scroll
    const rot = scroll * 0.0022;
    ctx.rotate(rot);

    // Respiración áurea
    const morph = 1 + 0.06 * Math.sin(scroll * 0.0035 + time * 0.35);

    let w = scale * morph;
    let h = (scale / PHI) * morph;

    // Centrar figura
    let x = -w * 0.55;
    let y = -h * 0.5;

    // Marcas de corte editorial (Crop marks) sin textos
    const crop = 10;
    ctx.lineWidth = 0.45;
    ctx.strokeStyle = `rgba(0, 0, 0, ${0.35 * globalFade})`;

    const corners = [
      { x: x, y: y, dx: 1, dy: 1 },
      { x: x + w, y: y, dx: -1, dy: 1 },
      { x: x + w, y: y + h, dx: -1, dy: -1 },
      { x: x, y: y + h, dx: 1, dy: -1 }
    ];

    corners.forEach(c => {
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - c.dy * crop);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(c.x - c.dx * crop, c.y);
      ctx.stroke();
    });

    // Subdivisión fractal áurea (7 niveles de iteración)
    let curX = x;
    let curY = y;
    let curW = w;
    let curH = h;
    let dir = 0;

    const spiralPoints = [];
    const MAX_DEPTH = 7;

    for (let depth = 0; depth < MAX_DEPTH; depth++) {
      let squareSize;
      let nextX = curX, nextY = curY, nextW = curW, nextH = curH;
      let arcCx, arcCy, arcStartAngle, arcEndAngle;

      if (dir === 0) {
        squareSize = curH;
        nextX = curX + squareSize;
        nextW = curW - squareSize;
        arcCx = curX + squareSize;
        arcCy = curY + squareSize;
        arcStartAngle = Math.PI;
        arcEndAngle = Math.PI * 1.5;
      } else if (dir === 1) {
        squareSize = curW;
        nextY = curY + squareSize;
        nextH = curH - squareSize;
        arcCx = curX;
        arcCy = curY + squareSize;
        arcStartAngle = Math.PI * 1.5;
        arcEndAngle = Math.PI * 2;
      } else if (dir === 2) {
        squareSize = curH;
        nextW = curW - squareSize;
        arcCx = curX;
        arcCy = curY;
        arcStartAngle = 0;
        arcEndAngle = Math.PI * 0.5;
      } else {
        squareSize = curW;
        nextH = curH - squareSize;
        arcCx = curX + squareSize;
        arcCy = curY;
        arcStartAngle = Math.PI * 0.5;
        arcEndAngle = Math.PI;
      }

      if (squareSize <= 1) break;

      // Cuadrados de corte
      const lineAlpha = (1 - depth * 0.1) * 0.55 * globalFade;
      ctx.lineWidth = depth === 0 ? 0.75 : (depth < 3 ? 0.55 : 0.4);
      ctx.strokeStyle = `rgba(0, 0, 0, ${Math.max(0.12, lineAlpha)})`;

      if (dir === 0) {
        ctx.strokeRect(curX, curY, squareSize, squareSize);
      } else if (dir === 1) {
        ctx.strokeRect(curX, curY, squareSize, squareSize);
      } else if (dir === 2) {
        ctx.strokeRect(curX + nextW, curY, squareSize, squareSize);
      } else {
        ctx.strokeRect(curX, curY + nextH, squareSize, squareSize);
      }

      // Diagonal armónica
      ctx.lineWidth = 0.35;
      ctx.strokeStyle = `rgba(0, 0, 0, ${0.15 * globalFade})`;
      ctx.beginPath();
      ctx.moveTo(curX, curY);
      ctx.lineTo(curX + curW, curY + curH);
      ctx.stroke();

      // Arco de la espiral
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = `rgba(0, 0, 0, ${0.7 * globalFade})`;
      ctx.beginPath();
      ctx.arc(arcCx, arcCy, squareSize, arcStartAngle, arcEndAngle);
      ctx.stroke();

      spiralPoints.push({ x: arcCx, y: arcCy, depth });

      curX = nextX;
      curY = nextY;
      curW = nextW;
      curH = nextH;
      dir = (dir + 1) % 4;
    }

    // Puntos de foco áureo
    spiralPoints.forEach(pt => {
      const radius = pt.depth === 0 ? 2.0 : (pt.depth < 3 ? 1.5 : 1.0);
      ctx.fillStyle = `rgba(0, 0, 0, ${0.8 * globalFade})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // Bucle principal de animación (RAF)
  // --------------------------------------------------------------------------
  let time = 0;

  function render() {
    time += 0.01;

    scrollY += (targetScrollY - scrollY) * 0.12;
    const heroHeight = window.innerHeight;
    const fadeDistance = heroHeight * 0.85;

    globalFade = Math.max(0, 1 - (scrollY / fadeDistance));

    if (heroSection) {
      const heroOpacity = Math.max(0, 1 - (scrollY / (heroHeight * 0.65)));
      heroSection.style.opacity = heroOpacity;
      heroSection.style.transform = `translateY(${-scrollY * 0.16}px)`;
      heroSection.style.pointerEvents = heroOpacity < 0.1 ? 'none' : 'auto';
    }

    ctx.clearRect(0, 0, width, height);

    if (globalFade <= 0.005) {
      animationFrameId = requestAnimationFrame(render);
      return;
    }

    mouse.x += (mouse.targetX - mouse.x) * 0.08;
    mouse.y += (mouse.targetY - mouse.y) * 0.08;

    // 1. Trama de cota con el cursor
    drawEditorialCursorGrid();

    // 2. Cálculo dinámico de posición y escala del fractal áureo
    // Garantiza que NUNCA se superponga con el texto
    let fractalX, fractalY, fractalScale;

    // Obtener los límites reales del contenedor de texto si está disponible
    const containerRect = heroContainer ? heroContainer.getBoundingClientRect() : null;
    const textRight = containerRect ? containerRect.right : (width * 0.5 + 245);

    if (width >= 1080) {
      // Pantallas Desktop / Laptops: amplio espacio a la derecha del texto
      const availableRight = width - textRight;
      fractalScale = Math.min(availableRight * 0.44, height * 0.24, 180);
      // Margen generoso entre el borde derecho del texto y el fractal
      fractalX = textRight + (availableRight * 0.52);
      fractalY = height * 0.5;
    } else if (width >= 768) {
      // Tablets intermedias: escala moderada y desplazado hacia la derecha o esquina
      const availableRight = width - textRight;
      if (availableRight > 180) {
        fractalScale = Math.min(availableRight * 0.42, 130);
        fractalX = textRight + (availableRight * 0.55);
        fractalY = height * 0.5;
      } else {
        // Si el espacio lateral es estrecho, se ubica en el cuadrante inferior derecho
        fractalScale = 110;
        fractalX = width * 0.78;
        fractalY = height * 0.76;
      }
    } else {
      // Dispositivos Móviles: se sitúa limpiamente abajo en el tercio inferior libre
      fractalScale = Math.min(width * 0.32, 105);
      fractalX = width * 0.5;
      fractalY = Math.min(height * 0.82, height - 80);
    }

    drawGoldenRatioFractal(fractalX, fractalY, fractalScale, time, scrollY);

    animationFrameId = requestAnimationFrame(render);
  }

  // --------------------------------------------------------------------------
  // Eventos de usuario (Mouse y Touch)
  // --------------------------------------------------------------------------
  window.addEventListener('pointermove', e => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
    mouse.active = true;
  });

  window.addEventListener('touchmove', e => {
    if (e.touches && e.touches[0]) {
      mouse.targetX = e.touches[0].clientX;
      mouse.targetY = e.touches[0].clientY;
      mouse.active = true;
    }
  }, { passive: true });

  window.addEventListener('scroll', () => {
    targetScrollY = window.scrollY || window.pageYOffset;
  }, { passive: true });

  window.addEventListener('resize', () => {
    resize();
  });

  // Inicialización
  resize();
  targetScrollY = window.scrollY || 0;
  scrollY = targetScrollY;
  render();

})();
