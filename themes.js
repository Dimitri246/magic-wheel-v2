// themes.js

let basiqueState, bubblingAuraState, arcticChillState, galacticVoyageState;

const themeConfigs = {
  1: {
    name: 'Basique',
    yesColors: ['6EC6FF','4AA3DF'],
    noColors:  ['B39DDB','9575CD'],
    tieColors: ['CCCCCC','666666'],
    drawBackground(p = window) {
      if (!basiqueState) {
        initBasique(p, width, height);
      }
      drawBasique(p, p.millis ? p.millis() * 0.001 : millis() * 0.001);
    },
    ballStyle: {
      color: '#FFFFFF',
      halo: false
    }
  },

  2: {
    name: 'Bubble',
    yesColors: ['B6FF4D','4CC24A'],
    noColors:  ['FF4DFF','B13BB1'],
    tieColors: ['CCCCCC','666666'],
    drawBackground(p = window) {
      if (!bubblingAuraState) {
        initBubblingAura(p, width, height);
      }
      drawBubblingAura(p, p.millis ? p.millis() * 0.001 : millis() * 0.001);
    },
    ballStyle: {
      color: '#C8C8C8',
      halo: false
    }
  },

  3: {
  name: 'Coral Reef',
  yesColors: ['1DD6C3','006994'],
  noColors:  ['FF6F61','5C0017'],
  tieColors: ['A0E7E5','FFD166'],
  _init: false,
  initElements() {
    this.bubbles = Array.from({ length: 30 }, () => ({
      x: random(width),
      y: random(height),
      r: random(4, 10),
      speed: random(0.5, 1.2)
    }));
    this.fish = Array.from({ length: 8 }, () => ({
      x: random(width),
      y: random(height * 0.4),
      size: random(10, 18),
      speed: random(0.3, 0.6)
    }));
    this.backCorals = Array.from({ length: 6 }, () => ({
      x: random(width),
      y: height - random(40, 80),
      s: random(0.6, 1)
    }));
    this.foreCorals = Array.from({ length: 4 }, () => ({
      x: random(width),
      y: height - random(20, 40),
      s: random(1, 1.4)
    }));
  },
  drawBackground() {
    if (!this._init) {
      this.initElements();
      this._init = true;
    }

    for (let y = 0; y < height; y++) {
      const inter = y / height;
      const col = lerpColor(color('#1DD6C3'), color('#006994'), inter);
      stroke(col);
      line(0, y, width, y);
    }

    noStroke();
    for (let i = 0; i < height * 0.3; i++) {
      const alpha = map(i, 0, height * 0.3, 80, 0);
      fill(160, 231, 229, alpha);
      rect(0, i, width, 1);
    }

    push();
    blendMode(ADD);
    noStroke();
    fill(255, 255, 255, 40);
    for (let i = 0; i < 5; i++) {
      const x = (i * width / 5 + sin(frameCount * 0.002 + i) * 60) % width;
      quad(x - 60, 0, x + 60, 0, x + 120, height, x - 120, height);
    }
    pop();

    push();
    const backOffset = (frameCount * 0.1) % width;
    fill('#055f73');
    drawingContext.shadowColor = 'rgba(0,0,0,0.2)';
    drawingContext.shadowBlur = 10;
    for (const c of this.backCorals) {
      push();
      translate((c.x - backOffset + width) % width, c.y);
      drawCoralShape(c.s);
      pop();
    }
    pop();

    for (const f of this.fish) {
      f.x += f.speed;
      if (f.x > width + f.size * 2) f.x = -f.size * 2;
      drawFishShape(f.x, f.y, f.size);
    }

    for (const b of this.bubbles) {
      b.y -= b.speed;
      if (b.y < -b.r) {
        b.y = height + b.r;
        b.x = random(width);
      }
      fill(255, 255, 255, 80);
      ellipse(b.x, b.y, b.r);
    }

    push();
    const foreOffset = (frameCount * 0.3) % width;
    fill('#FF6F61');
    drawingContext.shadowColor = 'rgba(0,0,0,0.25)';
    drawingContext.shadowBlur = 15;
    for (const c of this.foreCorals) {
      push();
      translate((c.x - foreOffset + width) % width, c.y);
      drawCoralShape(c.s);
      pop();
    }
    pop();
  },
  ballStyle: { color: '#1DD6C3', halo: true }
},

 4: {
  name: 'Arctic Chill',
  yesColors: ['7AD1FF','2A85C9'],
  noColors:  ['FFB3C1','B23B6C'],
  tieColors: ['E3F6FF','A0DFF9'],
  drawBackground(p = window) {
    if (!arcticChillState) {
      initArcticChill(p, width, height);
    }
    drawArcticChill(p, p.millis ? p.millis() * 0.001 : millis() * 0.001);
  },
  ballStyle: { color: '#81D4FA', halo: false }
},

  
5: {
  name: 'Galactic Voyage',
  yesColors: ['2B2EFA','4B1F8A'],
  noColors:  ['FF4A3D','A3201B'],
  tieColors: ['7E57C2','5E35B1'],
  drawBackground(p = window) {
    if (!galacticVoyageState) {
      initGalacticVoyage(p, width, height);
    }
    drawGalacticVoyage(p, p.millis ? p.millis() * 0.001 : millis() * 0.001);
  },
  ballStyle: {
    color: '#FFFFFF',
    halo: true
  }
},
};

function initBasique(p, w, h) {
  const count = p.int(p.random(4, 7));
  const circles = Array.from({ length: count }, () => ({
    x: p.random(w),
    y: p.random(h),
    r: p.random(Math.max(w, h) * 0.5, Math.max(w, h) * 1.2),
    alpha: p.random(30, 60)
  }));
  basiqueState = { w, h, circles };
}

function drawBasique(p, t) {
  const { w, h, circles } = basiqueState;
  const ctx = p.drawingContext;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#6EC6FF');
  grad.addColorStop(1, '#B39DDB');
  ctx.fillStyle = grad;
  p.noStroke();
  p.rect(0, 0, w, h);

  p.noStroke();
  for (const c of circles) {
    p.fill(255, c.alpha);
    p.ellipse(c.x, c.y, c.r, c.r);
  }
}

function initBubblingAura(p, w, h) {
  const count = p.int(p.random(10, 15));
  const bubbles = Array.from({ length: count }, () => ({
    x: p.random(w),
    y: p.random(h),
    r: p.random(40, 160),
    xAmp: p.random(20, 40),
    yAmp: p.random(20, 40),
    speed: p.random(0.2, 0.6),
    phase: p.random(p.TWO_PI),
    alpha: p.random(30, 60)
  }));
  bubblingAuraState = { w, h, bubbles };
}

function drawBubblingAura(p, t) {
  const { w, h, bubbles } = bubblingAuraState;
  const ctx = p.drawingContext;
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#B6FF4D');
  grad.addColorStop(1, '#FF4DFF');
  ctx.fillStyle = grad;
  p.noStroke();
  p.rect(0, 0, w, h);

  p.noStroke();
  for (const b of bubbles) {
    const x = b.x + p.cos(t * b.speed + b.phase) * b.xAmp;
    const y = b.y + p.sin(t * b.speed + b.phase) * b.yAmp;
    p.fill(255, b.alpha);
    p.ellipse(x, y, b.r, b.r);
  }
}

function initArcticChill(p, w, h) {
  function createLayer(col, base, amp, speed) {
    const step = 40;
    const pts = [];
    for (let x = -step; x <= w + step; x += step) {
      pts.push({ x, y: base - p.random(amp) });
    }
    return { color: p.color(col), pts, speed, phase: p.random(p.TWO_PI) };
  }
  const layers = [
    createLayer('#A8D8FF', h * 0.65, 60, 0.02),
    createLayer('#CCEFFF', h * 0.75, 40, 0.015),
    createLayer('#E5F8FF', h * 0.85, 20, 0.01)
  ];
  const flakes = Array.from({ length: 80 }, () => ({
    x: p.random(w),
    y: p.random(h),
    r: p.random(2, 4),
    speed: p.random(0.5, 1)
  }));
  arcticChillState = { w, h, layers, flakes };
}

function drawArcticChill(p, t) {
  const { w, h, layers, flakes } = arcticChillState;
  const ctx = p.drawingContext;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#7AD1FF');
  grad.addColorStop(1, '#E3F6FF');
  ctx.fillStyle = grad;
  p.noStroke();
  p.rect(0, 0, w, h);

  for (const layer of layers) {
    p.push();
    const ox = p.sin(t * layer.speed + layer.phase) * 20;
    p.translate(ox, 0);
    p.fill(layer.color);
    p.beginShape();
    p.vertex(-40, h);
    for (const pt of layer.pts) p.vertex(pt.x, pt.y);
    p.vertex(w + 40, h);
    p.endShape(p.CLOSE);
    p.pop();
  }

  p.noStroke();
  p.fill(255, 200);
  for (const fl of flakes) {
    fl.y += fl.speed;
    if (fl.y > h) {
      fl.y = -fl.r;
      fl.x = p.random(w);
    }
    p.ellipse(fl.x, fl.y, fl.r, fl.r);
  }
}

function initGalacticVoyage(p, w, h) {
  const stars1 = Array.from({ length: 60 }, () => ({
    x: p.random(w),
    y: p.random(h),
    size: p.random(1, 2),
    speed: p.random(0.05, 0.15)
  }));
  const stars2 = Array.from({ length: 40 }, () => ({
    x: p.random(w),
    y: p.random(h),
    size: p.random(1, 3),
    speed: p.random(0.15, 0.3)
  }));
  galacticVoyageState = { w, h, stars1, stars2, shooting: [] };
}

function drawGalacticVoyage(p, t) {
  const { w, h, stars1, stars2, shooting } = galacticVoyageState;
  const ctx = p.drawingContext;
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#2B2EFA');
  grad.addColorStop(0.5, '#4B1F8A');
  grad.addColorStop(1, '#FF4A3D');
  ctx.fillStyle = grad;
  p.noStroke();
  p.rect(0, 0, w, h);

  const drawStars = (arr) => {
    for (const s of arr) {
      s.x -= s.speed;
      if (s.x < 0) s.x = w;
      p.fill(255);
      p.noStroke();
      p.ellipse(s.x, s.y, s.size, s.size);
    }
  };
  drawStars(stars1);
  drawStars(stars2);

  if (p.random() < 0.005) {
    shooting.push({
      x: p.random(w),
      y: p.random(h * 0.5),
      vx: p.random(-8, -4),
      vy: p.random(1, 3),
      life: 0
    });
  }
  for (let i = shooting.length - 1; i >= 0; i--) {
    const s = shooting[i];
    s.x += s.vx;
    s.y += s.vy;
    s.life++;
    p.stroke(255, 200);
    p.line(s.x, s.y, s.x - s.vx * 2, s.y - s.vy * 2);
    if (s.x < -50 || s.y > h + 50 || s.life > 60) shooting.splice(i, 1);
  }

  const vignette = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vignette;
  p.rect(0, 0, w, h);
}

function drawCoralShape(scaleFactor = 1) {
  push();
  scale(scaleFactor);
  noStroke();
  beginShape();
  curveVertex(-15, 0);
  curveVertex(-15, -30);
  curveVertex(-5, -60);
  curveVertex(0, -40);
  curveVertex(10, -70);
  curveVertex(20, -40);
  curveVertex(30, -60);
  curveVertex(25, -20);
  curveVertex(35, -10);
  curveVertex(20, 0);
  endShape(CLOSE);
  pop();
}

function drawFishShape(x, y, size) {
  push();
  noStroke();
  fill('#FFD166');
  ellipse(x, y, size * 1.5, size);
  triangle(
    x - size * 0.75, y,
    x - size * 1.5, y - size * 0.5,
    x - size * 1.5, y + size * 0.5
  );
  fill(0);
  ellipse(x + size * 0.4, y, size * 0.1);
  pop();
}

