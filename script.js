// — Lecture du thème depuis l’URL —
const urlParams      = new URLSearchParams(window.location.search);
const themeParam     = urlParams.get('theme')    || '1';
const durationParam  = parseInt(urlParams.get('duration'), 10) || 30;
const ballsParam     = parseInt(urlParams.get('balls'), 10)    || 1;
const questionParam  = urlParams.get('question') || '';
const currentMode    = localStorage.getItem('mode') || 'free';
const addBallsParam  = urlParams.get('addBalls') === '1' && currentMode === 'premium2';
const cfg            = themeConfigs[themeParam];
const Y_OFFSET = 60;
const MAX_CANVAS_WIDTH = 480;
const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;

const isSubscribed = localStorage.getItem('isSubscribed') === 'true';
let videoCount = 0;
const adBanner = document.getElementById('adBanner');
const interstitialAd = document.getElementById('interstitialAd');
if (adBanner) {
  adBanner.classList.toggle('hidden', currentMode !== 'free');
}

// ffmpeg.wasm instance for post-recording transcoding
let ffmpeg;
let fetchFile;
function showInterstitialAd() {
  if (!interstitialAd) return;
  interstitialAd.classList.remove('hidden');
  setTimeout(() => {
    interstitialAd.classList.add('hidden');
  }, 3000);
}

function angleDiff(a, b) {
  return ((a - b + PI) % TWO_PI) - PI;
}

function applyThemeColors() {
  const root = document.body.style;
  root.setProperty('--color-yes-1', `#${cfg.yesColors[0]}`);
  root.setProperty('--color-yes-2', `#${cfg.yesColors[1]}`);
  root.setProperty('--color-no-1', `#${cfg.noColors[0]}`);
  root.setProperty('--color-no-2', `#${cfg.noColors[1]}`);
  root.setProperty('--color-tie-1', `#${cfg.tieColors[0]}`);
  root.setProperty('--color-tie-2', `#${cfg.tieColors[1]}`);
}

function updateBackgroundState() {
  document.body.classList.remove('state-yes', 'state-no', 'state-tie');
  if (yesCount > noCount)      document.body.classList.add('state-yes');
  else if (noCount > yesCount) document.body.classList.add('state-no');
  else                         document.body.classList.add('state-tie');
}

function formatTime(ms) {
  const totalCs = Math.ceil(ms / 10); // total centiseconds
  const s = Math.floor(totalCs / 100);
  const cs = totalCs % 100;
  return `${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}

function positionHudQuestion() {
  if (!hudQuestion || !questionParam) return;
  const h = 40;
  const cy = height / 2 + Y_OFFSET;
  const topCircle = cy - CIRCLE_RADIUS;
  const hudY = topCircle - h / 2 - 20;       // same y used in drawHud
  const top = hudY - h / 2 - hudQuestion.offsetHeight - 10;
  hudQuestion.style.top = `${top}px`;
}

function wrapQuestionText(text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (textWidth(testLine) <= maxWidth) {
      line = testLine;
      continue;
    }

    if (line) {
      lines.push(line);
      line = '';
    }

    let remaining = word;
    while (textWidth(remaining) > maxWidth) {
      let i = 1;
      while (i <= remaining.length && textWidth(remaining.slice(0, i)) <= maxWidth) {
        i++;
      }
      i--;
      lines.push(remaining.slice(0, i));
      remaining = remaining.slice(i);
    }
    line = remaining;
  }

  if (line) lines.push(line);
  return lines;
}

async function transcodeToShorts(blob, ext) {
  if (!ffmpeg) {
    ffmpeg = FFmpeg.createFFmpeg({ log: true });
    fetchFile = FFmpeg.fetchFile;
    await ffmpeg.load();
  }
  const inputName = `input.${ext}`;
  ffmpeg.FS('writeFile', inputName, await fetchFile(blob));
  await ffmpeg.run(
    '-fflags', '+genpts', '-r', '30', '-i', inputName,
    '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p',
    '-r', '30', '-vsync', 'cfr',
    '-c:v', 'libx264', '-profile:v', 'main', '-level:v', '4.0',
    '-x264-params', 'keyint=60:min-keyint=60:scenecut=0',
    '-g', '60', '-bf', '0', '-refs', '3',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-b:a', '192k',
    '-movflags', '+faststart', '-f', 'mp4', 'out.mp4'
  );
  const data = ffmpeg.FS('readFile', 'out.mp4');
  ffmpeg.FS('unlink', inputName);
  ffmpeg.FS('unlink', 'out.mp4');
  return new Blob([data.buffer], { type: 'video/mp4' });
}

  function drawHud(remaining) {
    const x = width / 2;
    const h = 40;
    const w = CIRCLE_RADIUS * 1.8; // slightly narrower than circle diameter
    document.body.style.setProperty('--hud-width', `${w}px`);
    const cy = height / 2 + Y_OFFSET;
    const topCircle = cy - CIRCLE_RADIUS;
    const y = topCircle - h / 2 - 20; // lift HUD away from the circle

    let c1, c2;
    if (yesCount > noCount) {
      c1 = `#${cfg.yesColors[0]}`;
      c2 = `#${cfg.yesColors[1]}`;
    } else if (noCount > yesCount) {
      c1 = `#${cfg.noColors[0]}`;
      c2 = `#${cfg.noColors[1]}`;
    } else {
      c1 = `#${cfg.tieColors[0]}`;
      c2 = `#${cfg.tieColors[1]}`;
    }

    const ctx = drawingContext;
    const gradient = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
    gradient.addColorStop(0, c1);
    gradient.addColorStop(1, c2);

    push();
    rectMode(CENTER);
    noStroke();
    ctx.fillStyle = gradient;
    rect(x, y, w, h, 12);

    noFill();
    stroke(c2);
    strokeWeight(2);
    rect(x, y, w, h, 12);

    fill(255);
    noStroke();
    textSize(18);

    const liveResult = `✅ ${yesCount} | ❌ ${noCount}`;
    textAlign(LEFT, CENTER);
    text(formatTime(remaining), x - w / 2 + 10, y);
    textAlign(CENTER, CENTER);
    text(liveResult, x, y);
    textAlign(RIGHT, CENTER);
    text(`⚽ ${1 + extraBalls.length}`, x + w / 2 - 10, y);

    // Render the user's question directly on the canvas so it is part of the
    // recorded video output and sits just above the results banner.
    if (questionParam) {
      push();
      textSize(20);
      textAlign(CENTER, TOP);
      fill(255);

      const questionWidth = w;
      const lines = wrapQuestionText(questionParam, questionWidth);
      const lineHeight = (textAscent() + textDescent()) * 0.9;
      const questionHeight = lines.length * lineHeight;
      const bottom = y - h / 2 - 10;
      const top = bottom - questionHeight;

      for (let i = 0; i < lines.length; i++) {
        text(lines[i], width / 2, top + i * lineHeight);
      }
      pop();
    }

    pop();

    // Position the cursor above the check or cross emojis (or center on tie)
    const liveWidth = textWidth(liveResult);
    const yesOffset = -liveWidth / 2 + textWidth("✅") / 2;
    const noOffset  =  liveWidth / 2 - textWidth("❌") / 2;

    let targetX;
    if (yesCount > noCount)      targetX = x + yesOffset;
    else if (noCount > yesCount) targetX = x + noOffset;
    else                         targetX = x;

    cursorPos = lerp(cursorPos || x, targetX, 0.1);
    cursorPos = Math.max(x + yesOffset, Math.min(x + noOffset, cursorPos));

    const cursorX = cursorPos;
    const cursorY = y - h / 2 - 5;
    push();
    const cursorGrad = ctx.createLinearGradient(cursorX - 8, cursorY, cursorX + 8, cursorY + 10);
    cursorGrad.addColorStop(0, c1);
    cursorGrad.addColorStop(1, c2);
    ctx.fillStyle = cursorGrad;
    noStroke();
    triangle(cursorX - 8, cursorY, cursorX + 8, cursorY, cursorX, cursorY + 10);
    stroke(255);
    strokeWeight(2);
    noFill();
    triangle(cursorX - 8, cursorY, cursorX + 8, cursorY, cursorX, cursorY + 10);
    pop();
  }

// — Variables globales —
let yesCount = 0,
    noCount  = 0,
    phrase   = "",
    running  = false,
    finished = false,
    startTime,
    ball,
    extraBalls = [],
    particles  = [],
    shake      = 0,
    cursorPos  = 0;

// Éléments du menu pause / overlay
let overlay, menuContent, goBtn, retryBtn, homeBtn, countdownEl,
    pauseScoreEl, menuMessageEl, upgradeBtn, addBallBtn, removeBallBtn;
// Écran de résultat
let resultOverlay, resultTitle, resultScore, resultRetryBtn, resultHomeBtn,
    resultQuestion, hudQuestion, downloadVideoBtn, shareVideoBtn,
    premiumPopup, premiumPopupText, premiumPlanBtn, premiumCloseBtn,
    ballLimitPopup, ballLimitCloseBtn;
let resultShown = false;
// Localisation courante
let t;

let pauseElapsed = 0;         // durée écoulée lors de la mise en pause
let hasStarted   = false;     // indique si une partie a déjà démarré
let launchCounter = 0;
let sndNeutral, sndPositive, sndNegative;
let confetti = [];
let confettiLaunched = false;
let endSequenceStartTime = 0;
let recorder;
let recordedChunks = [];
let recordedFile = null;
let recorderScheduled = false;    // pour ne planifier le stop qu’une fois
let recordingStopped = false;     // pour ne pas stopper deux fois
let premiumPopupScheduled = false;

const CIRCLE_SPEED      = 0.0015,
      bonusOptions      = ['+10s','+1 ball','+2 balls'],
      bonusIcons        = ['⏱️','⚽','⚽⚽'],
      bonusStartDelay   = 5000;
      let CIRCLE_RADIUS;             // sera défini dans draw()
const RADIUS_FACTOR = 0.4;     // 40% du plus petit côté dispo

let YES_ANGLE, NO_ANGLE,
    bonusAngle = 0,
    bonusStartTime = 0,
    bonusApplied   = false,
    bonusSpinDuration = 0,
    bonusResult      = null,
    totalGameDuration = durationParam * 1000,
    speedFactor       = 1.5;

// — Initialisation p5.js —
function setup() {
  const baseWidth = Math.min(windowWidth, MAX_CANVAS_WIDTH);
  const scaleFactor = VIDEO_WIDTH / baseWidth;
  pixelDensity(scaleFactor);
  const baseHeight = VIDEO_HEIGHT / scaleFactor;
  canvas = createCanvas(baseWidth, baseHeight);
  angleMode(RADIANS);
  frameRate(60);

  //chevauchement des sons
  sndNeutral.setVolume(0.4);
  sndPositive.setVolume(0.7);
  sndNegative.setVolume(0.7);
  sndNeutral.playMode('sustain');
  sndPositive.playMode('sustain');
  sndNegative.playMode('sustain');


  YES_ANGLE = 0.2 * TWO_PI;
  NO_ANGLE  = 0.2 * TWO_PI;

  applyThemeColors();
  updateBackgroundState();

  // Récupération des éléments du menu overlay
  overlay     = document.getElementById('overlay');
  menuContent = document.getElementById('menuContent');
  goBtn       = document.getElementById('goBtn');
  retryBtn    = document.getElementById('retryBtn');
  homeBtn     = document.getElementById('homeBtn');
  countdownEl = document.getElementById('countdown');
  pauseScoreEl  = document.getElementById('pauseScore');
  menuMessageEl = document.querySelector('.menu-message');
  upgradeBtn  = document.getElementById('upgradeBtn');
  addBallBtn  = document.getElementById('addBallBtn');
  removeBallBtn = document.getElementById('removeBallBtn');

  // Éléments de l’écran de résultat
  resultOverlay   = document.getElementById('resultOverlay');
  resultTitle     = document.getElementById('resultTitle');
  resultScore     = document.getElementById('resultScore');
  resultRetryBtn  = document.getElementById('resultRetryBtn');
  resultHomeBtn   = document.getElementById('resultHomeBtn');
  resultQuestion  = document.getElementById('resultQuestion');
  hudQuestion     = null;
  downloadVideoBtn = document.getElementById('downloadVideoBtn');
  shareVideoBtn    = document.getElementById('shareVideoBtn');
  premiumPopup     = document.getElementById('premiumPopup');
  premiumPopupText = document.getElementById('premiumPopupText');
  premiumPlanBtn   = document.getElementById('premiumPlanBtn');
  premiumCloseBtn  = document.getElementById('premiumCloseBtn');
  ballLimitPopup   = document.getElementById('ballLimitPopup');
  ballLimitCloseBtn = document.getElementById('ballLimitCloseBtn');

  if (upgradeBtn) {
    if (currentMode === 'free') {
      upgradeBtn.classList.remove('hidden');
      upgradeBtn.addEventListener('click', () => {
        window.location.href = 'premium.html';
      });
    }
  }

  if (premiumCloseBtn) {
    premiumCloseBtn.addEventListener('click', () => {
      premiumPopup.classList.add('hidden');
    });
  }
  if (premiumPlanBtn) {
    premiumPlanBtn.addEventListener('click', () => {
      window.location.href = 'premium.html';
    });
  }
  if (shareVideoBtn) {
    shareVideoBtn.addEventListener('click', () => {
      if (recordedFile && navigator.canShare && navigator.canShare({ files: [recordedFile] })) {
        navigator.share({ files: [recordedFile], title: 'MagicWheel' }).catch(() => {});
      }
    });
  }
  if (ballLimitCloseBtn) {
    ballLimitCloseBtn.addEventListener('click', () => {
      ballLimitPopup.classList.add('hidden');
      showOverlay();
    });
  }

  if (addBallBtn) {
    addBallBtn.addEventListener('pointerdown', e => e.stopPropagation());
    addBallBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (running) {
        const totalBalls = 1 + extraBalls.length;
        if (totalBalls < 50) {
          extraBalls.push(new Ball(width/2, height/2, random(TWO_PI)));
          if (1 + extraBalls.length >= 50) {
            showBallLimitPopup();
          }
        } else {
          showBallLimitPopup();
        }
      }
    });
    if (!addBallsParam) {
      addBallBtn.classList.add('hidden');
    }
  }

  if (removeBallBtn) {
    removeBallBtn.addEventListener('pointerdown', e => e.stopPropagation());
    removeBallBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (running && extraBalls.length > 0) {
        extraBalls.pop();
      }
    });
    if (!addBallsParam) {
      removeBallBtn.classList.add('hidden');
    }
  }

  // Localisation
  const translations = {
    fr: {
      menuMessage: 'Appuie pendant que la roue tourne pour faire apparaitre ce menu',
      go: '⚡ Lancer',
      retry: 'Rejouer',
      home: 'Accueil',
      upgrade: 'Passer Premium',
      premiumPlan: 'Passer au plan',
        popupFree: 'Passe au plan Silver ou Gold pour profiter de toutes les fonctionnalités.',
        popupSilver: 'Passe au plan Gold : accès total aux thèmes, accès aux options avancées.',
        popupNoAds: 'Pas de publicités',
        popupRecordings: 'Enregistrements/jour',
        popupUnlimited: 'Illimité',
        popupTemplates: 'Accès aux templates',
      resultQuestion: 'Question',
      resultYes: '✅ OUI',
      resultNo: '❌ NON',
      resultTie: '🤔 ÉGALITÉ'
    },
    en: {
      menuMessage: 'Press while the wheel spins to open this menu',
      go: '⚡ Go',
      retry: 'Retry',
      home: 'Home',
      upgrade: 'Go Premium',
      premiumPlan: 'Upgrade plan',
        popupFree: 'Switch to Silver or Gold to unlock all features.',
        popupSilver: 'Go Gold for full theme access and advanced options.',
        popupNoAds: 'No ads',
        popupRecordings: 'Recordings/day',
        popupUnlimited: 'Unlimited',
        popupTemplates: 'Template access',
      resultQuestion: 'Question',
      resultYes: '✅ YES',
      resultNo: '❌ NO',
      resultTie: '🤔 TIE'
    }
  };
  const lang = localStorage.getItem('lang') || ((navigator.language || 'en').startsWith('fr') ? 'fr' : 'en');
  t = translations[lang];
  document.documentElement.lang = lang;
  if (menuMessageEl) menuMessageEl.textContent = t.menuMessage;
  goBtn.textContent = t.go;
  retryBtn.textContent = t.retry;
  homeBtn.textContent = t.home;
  resultRetryBtn.textContent = t.retry;
  resultHomeBtn.textContent = t.home;
  if (upgradeBtn) upgradeBtn.textContent = t.upgrade;
  if (premiumPlanBtn) premiumPlanBtn.textContent = t.premiumPlan;
  const popupNoAdsEl = document.getElementById('popupNoAds');
  const popupRecordingsEl = document.getElementById('popupRecordings');
  const popupTemplatesEl = document.getElementById('popupTemplates');
  const popupUnlimitedEls = [
    document.getElementById('popupUnlimited1'),
    document.getElementById('popupUnlimited2')
  ];
  if (popupNoAdsEl) popupNoAdsEl.textContent = t.popupNoAds;
  if (popupRecordingsEl) popupRecordingsEl.textContent = t.popupRecordings;
  if (popupTemplatesEl) popupTemplatesEl.textContent = t.popupTemplates;
  popupUnlimitedEls.forEach(el => { if (el) el.textContent = t.popupUnlimited; });
  if (resultQuestion) {
    if (questionParam) {
      resultQuestion.textContent = questionParam;
    } else {
      resultQuestion.classList.add('hidden');
    }
  }
  if (hudQuestion) {
    if (questionParam) {
      hudQuestion.textContent = questionParam;
    } else {
      hudQuestion.classList.add('hidden');
    }
  }
  goBtn.addEventListener('click', () => {
    if (!hasStarted || finished) {
      startCountdown(start);
    } else {
      overlay.style.display = 'none';
      menuContent.classList.remove('hidden');
      countdownEl.classList.add('hidden');
      if (hudQuestion && questionParam) {
        hudQuestion.classList.remove('hidden');
        positionHudQuestion();
      }
      resumeGame();
    }
  });
  retryBtn.addEventListener('click', () => startCountdown(start));
  homeBtn.addEventListener('click', () => { window.location.href = 'index.html'; });

  resultRetryBtn.addEventListener('click', () => {
    resultOverlay.classList.add('hidden');
    overlay.style.display = 'flex';
    startCountdown(start);
  });
  resultHomeBtn.addEventListener('click', () => { window.location.href = 'index.html'; });

  if (downloadVideoBtn) {
    downloadVideoBtn.addEventListener('click', (e) => {
      if (downloadVideoBtn.classList.contains('disabled')) {
        e.preventDefault();
        return;
      }
      if (currentMode === 'free') {
        const today = new Date().toDateString();
        const data = JSON.parse(localStorage.getItem('recordings') || '{}');
        if (data.date !== today) {
          data.date = today;
          data.count = 0;
        }
        if (data.count >= 3) {
          e.preventDefault();
          alert('Passe au compte supérieur !');
          window.location.href = 'premium.html';
          return;
        }
        data.count++;
        localStorage.setItem('recordings', JSON.stringify(data));
      }
    });
  }

  const stream = canvas.elt.captureStream(30);
  const audioDest = getAudioContext().createMediaStreamDestination();
  p5.soundOut.output.connect(audioDest);
  const combinedStream = new MediaStream([
    ...stream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks()
  ]);

  // Choix du format : MP4 si possible, sinon WebM
  const mp4Type = 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"';
  const mimeType = MediaRecorder.isTypeSupported(mp4Type)
                 ? mp4Type
                 : 'video/webm';

  recorder = new MediaRecorder(combinedStream, { mimeType });
  recorder.ondataavailable = e => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };
  recorder.onstop = async () => {
    const ext  = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
    const blob = new Blob(recordedChunks, { type: mimeType });
    try {
      const tBlob = await transcodeToShorts(blob, ext);
      const url = URL.createObjectURL(tBlob);
      recordedFile = new File([tBlob], 'jeu.mp4', { type: 'video/mp4' });

      if (downloadVideoBtn) {
        downloadVideoBtn.href = url;
        downloadVideoBtn.setAttribute('download', 'jeu.mp4');
        downloadVideoBtn.classList.remove('disabled');
      } else {
        createA(url, '📥 Télécharger la vidéo (.mp4)')
          .attribute('download', 'jeu.mp4')
          .position(20, 20);
      }

      if (shareVideoBtn && navigator.canShare && navigator.canShare({ files: [recordedFile] })) {
        shareVideoBtn.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Transcoding failed', err);
      const url = URL.createObjectURL(blob);
      recordedFile = new File([blob], `jeu.${ext}`, { type: mimeType });

      if (downloadVideoBtn) {
        downloadVideoBtn.href = url;
        downloadVideoBtn.setAttribute('download', `jeu.${ext}`);
        downloadVideoBtn.classList.remove('disabled');
      } else {
        createA(url, `📥 Télécharger la vidéo (.${ext})`)
          .attribute('download', `jeu.${ext}`)
          .position(20, 20);
      }

      if (shareVideoBtn && navigator.canShare && navigator.canShare({ files: [recordedFile] })) {
        shareVideoBtn.classList.remove('hidden');
      }
    }
  };

  // … le reste de votre setup() …


  // on crée la première balle
  ball = new Ball(width/2, height/2, random(TWO_PI));
}

function preload() {
  // remplacez par vos chemins réels
  sndNeutral  = loadSound('assets/neutral.mp3');
  sndPositive = loadSound('assets/positive.mp3');
  sndNegative = loadSound('assets/negative.mp3');
}

// — Démarrage du round —
  function start() {
    if (!isSubscribed && launchCounter >= 3) {
      alert('Abonnez-vous pour continuer à jouer');
      return;
    }
    launchCounter++;
     if (getAudioContext().state !== 'running') {
      getAudioContext().resume();
    }
    hasStarted = true;
    retryBtn.classList.remove('hidden');
    pauseElapsed = 0;
    yesCount = noCount = 0;
    updateBackgroundState();
    startTime = millis();
  running   = true;
  finished  = false;
  resultOverlay.classList.add('hidden');
  resultShown = false;
  downloadVideoBtn.classList.add('hidden');
  downloadVideoBtn.classList.remove('disabled');
  downloadVideoBtn.removeAttribute('href');
  if (shareVideoBtn) shareVideoBtn.classList.add('hidden');
  if (premiumPopup) premiumPopup.classList.add('hidden');
  recordedChunks = [];
  recordedFile = null;
  recorderScheduled = false;
  recordingStopped = false;
  premiumPopupScheduled = false;
  if (recorder && recorder.state === 'inactive') {
    recorder.start();
  }
  confetti = [];
  confettiLaunched = false;
  endSequenceStartTime = 0;

  if (addBallsParam) {
    if (addBallBtn) addBallBtn.classList.remove('hidden');
    if (removeBallBtn) removeBallBtn.classList.remove('hidden');
  }

  ball = new Ball(width/2, height/2, random(TWO_PI));
  extraBalls = [];
  particles  = [];
  bonusApplied = false;
  for (let i = 1; i < ballsParam; i++) {
    extraBalls.push(
      new Ball(width/2, height/2, random(TWO_PI))
    );
}
  bonusStartTime = millis();

  // Choix aléatoire du bonus
  let idx = floor(random(bonusOptions.length));
  let seg = TWO_PI / bonusOptions.length;
  bonusAngle = 0;
  bonusSpinDuration = random(4500, 5100);
  let spins = 5;
  let startA = bonusAngle % TWO_PI;
  bonusAngle = startA + spins * TWO_PI + idx * seg;

  totalGameDuration = durationParam * 1000;
  speedFactor = 1.5;
}

// Met le jeu en pause et affiche le menu
function pauseGame() {
  pauseElapsed = millis() - startTime;
  running = false;
  if (recorder && recorder.state === 'recording') {
    recorder.pause();
  }
  if (pauseScoreEl) {
    pauseScoreEl.textContent = `✅ ${yesCount} | ❌ ${noCount}`;
  }
  if (addBallBtn) addBallBtn.classList.add('hidden');
  if (removeBallBtn) removeBallBtn.classList.add('hidden');
}

// Reprend la partie en ajustant le chrono
function resumeGame() {
  startTime = millis() - pauseElapsed;
  running = true;
  if (recorder && recorder.state === 'paused') {
    recorder.resume();
  }
  if (addBallsParam) {
    if (addBallBtn) addBallBtn.classList.remove('hidden');
    if (removeBallBtn) removeBallBtn.classList.remove('hidden');
  }
}

function showBallLimitPopup() {
  pauseGame();
  if (ballLimitPopup) ballLimitPopup.classList.remove('hidden');
}

// Affiche le menu overlay
function showOverlay() {
  overlay.style.display = 'flex';
  if (hudQuestion) {
    hudQuestion.classList.add('hidden');
  }
}

// Démarre un compte à rebours puis lance l'action donnée
function startCountdown(action) {
  menuContent.classList.add('hidden');
  countdownEl.classList.remove('hidden');
  let count = 3;
  countdownEl.textContent = count;
  const intv = setInterval(() => {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
    } else {
      clearInterval(intv);
      countdownEl.classList.add('hidden');
      menuContent.classList.remove('hidden');
      overlay.style.display = 'none';
      if (hudQuestion && questionParam) {
        hudQuestion.classList.remove('hidden');
        positionHudQuestion();
      }
      action();
    }
  }, 1000);
}

function showResultOverlay() {
  resultTitle.textContent =
    yesCount > noCount ? t.resultYes : noCount > yesCount ? t.resultNo : t.resultTie;
  resultScore.textContent = `✅ ${yesCount} | ❌ ${noCount}`;
  if (resultQuestion) {
    if (questionParam) {
      resultQuestion.textContent = questionParam;
      resultQuestion.classList.remove('hidden');
    } else {
      resultQuestion.classList.add('hidden');
    }
  }
  if (hudQuestion) {
    hudQuestion.classList.add('hidden');
  }
  resultOverlay.classList.remove('hidden');
  if (downloadVideoBtn) {
    downloadVideoBtn.classList.remove('hidden');
    downloadVideoBtn.classList.add('disabled');
  }
  if (currentMode === 'free') {
    videoCount++;
    if (videoCount % 2 === 0) {
      showInterstitialAd();
    }
  }
  if (!recorderScheduled) {
    recorderScheduled = true;
    setTimeout(() => {
      if (recorder && recorder.state === 'recording' && !recordingStopped) {
        recorder.stop();
        recordingStopped = true;
      }
    }, 4000);
  }
  if (!premiumPopupScheduled) {
    premiumPopupScheduled = true;
    setTimeout(() => {
      maybeShowPremiumPopup();
    }, 3000);
  }
}

function maybeShowPremiumPopup() {
  if (!premiumPopup) return;
  if (currentMode === 'free') {
    premiumPopupText.textContent = t.popupFree;
    premiumPopup.classList.remove('hidden');
  } else if (currentMode === 'premium1') {
    let count = parseInt(localStorage.getItem('silverPopupCount') || '0', 10) + 1;
    localStorage.setItem('silverPopupCount', count);
    if (count % 10 === 0) {
      premiumPopupText.textContent = t.popupSilver;
      premiumPopup.classList.remove('hidden');
    }
  }
}
function drawStylizedBackground() {
  if (cfg.drawBackground) {
    cfg.drawBackground();
  }
}


// — Boucle principale —
function draw() {
  // ─── 1) Paramètres dynamiques ───
  CIRCLE_RADIUS = min(width, height - 2*Y_OFFSET) * 0.4;
  const cx          = width  / 2;
  const cy          = height / 2 + Y_OFFSET;
  const now         = millis();
  const elapsed     = running ? now - startTime : pauseElapsed;
  const remaining   = Math.max(0, totalGameDuration - elapsed);

  // ─── 2) Effet shake global ───
  push();
  if (shake > 0) {
    translate(random(-shake, shake), random(-shake, shake));
    shake -= 0.5;
  }

    // ─── 3) Fond stylisé ───
    push();
      drawStylizedBackground();
    pop();

    // ─── 4) Accélération si on tourne ───
    if (running && speedFactor < 2.5) speedFactor += 0.0002;

    // ─── 5) Calcul de la rotation ───
    const rotation = running
      ? ((now - startTime) * CIRCLE_SPEED) % TWO_PI
      : 0;

    if (hasStarted && running) {
      const remaining = totalGameDuration - (now - startTime);
      if (remaining <= 0) {
        running = false;
        finished = true;
        if (addBallBtn) addBallBtn.classList.add('hidden');
        if (removeBallBtn) removeBallBtn.classList.add('hidden');
      }
    }

    // ─── 7) Roue principale ───
    push();
      translate(cx, cy);
      rotate(rotation);

      stroke(255, 80); strokeWeight(1); noFill();
      ellipse(0, 0, (CIRCLE_RADIUS + sin(frameCount*0.05)*4)*2 + 10);

      stroke(255); strokeWeight(6); noFill();
      ellipse(0, 0, CIRCLE_RADIUS*2);

      strokeWeight(14);
      // Oui
      stroke(0, 255, 0);
      arc(0, 0, CIRCLE_RADIUS*2, CIRCLE_RADIUS*2, -YES_ANGLE/2, YES_ANGLE/2);
      // Non
      stroke(255, 0, 0);
      arc(0, 0, CIRCLE_RADIUS*2, CIRCLE_RADIUS*2, PI-NO_ANGLE/2, PI+NO_ANGLE/2);
    pop();

    // ─── 8) Balles & collisions ───
    if (running) {
      ball.update(rotation);
      ball.show();
      extraBalls.forEach(b => { b.update(rotation); b.show(); });
      extraBalls.forEach((b, i) => {
        for (let j = i+1; j < extraBalls.length; j++) {
          b.checkCollision(extraBalls[j]);
        }
        ball.checkCollision(b);
      });
    } else if (finished) {
      drawEndSequence();
    }

    // ─── 9) Particules ───
  updateParticles();

  pop(); // fin du push() shake

  if (!finished) {
    drawHud(remaining);
  }

  if (running && currentMode === 'free') {
    push();
    textAlign(RIGHT, BOTTOM);
    textSize(16);
    fill(255, 255, 255, 120);
    text('@MagicWheel', width - 10, height - 10);
    pop();
  }

  }


// — Classe Ball complète —
class Ball {
  constructor(x, y, ang) {
    this.x = x; this.y = y;
    this.vx = cos(ang) * 8;
    this.vy = sin(ang) * 8;
    this.r = 15;
    this.color = color(cfg.ballStyle.color);
    this.bounceTimer = 0;
    this.trail = [];
    
  }
update(circleAngle) {
  // 1️⃣ Gravité & déplacement
  this.vy += 0.18 * speedFactor;
  this.x  += this.vx * speedFactor;
  this.y  += this.vy * speedFactor;

  // 2️⃣ Collision avec la jante circulaire
let centerX = width/2;
let centerY = height/2 + Y_OFFSET;

let dx   = this.x - centerX;
let dy   = this.y - centerY;
  let dist = sqrt(dx*dx + dy*dy);

  if (dist > CIRCLE_RADIUS - this.r) {
    // ─── a) calcul de l’angle & de la normale ───
    let angleToCenter = atan2(dy, dx);
    let nx = dx / dist;
    let ny = dy / dist;

    // ─── b) réflexion vectorielle ───
    let dot = this.vx * nx + this.vy * ny;
    this.vx -= 2 * dot * nx;
    this.vy -= 2 * dot * ny;

    // ─── c) repositionnement juste à l’intérieur ───
this.x = centerX + nx * (CIRCLE_RADIUS - this.r - 1);
this.y = centerY + ny * (CIRCLE_RADIUS - this.r - 1);

    // ─── d) détection de la zone d’impact ───
    let rel   = (angleToCenter - circleAngle + TWO_PI) % TWO_PI;
    let inYes = Math.abs(angleDiff(rel, 0))  <= YES_ANGLE/2;
    let inNo  = Math.abs(angleDiff(rel, PI)) <= NO_ANGLE/2;

    // ─── e) son + comptage + visuel ───
      if (inNo) {
        sndNegative.play();               // 🚫 buzzer négatif
        noCount++;
        updateBackgroundState();
        spawnConfetti(this.x, this.y, color(255,0,0));
        this.flash(color(255,0,0));
      }
      else if (inYes) {
        sndPositive.play();               // 🎉 ding positif
        yesCount++;
        updateBackgroundState();
        spawnConfetti(this.x, this.y, color(0,255,0));
        this.flash(color(0,255,0));
      }
    else {
      sndNeutral.play();                // 🔊 son neutre
    }

    shake = 6;
    this.bounceTimer = 8;

    // ─── f) traînée ───
    this.trail.push({ x:this.x, y:this.y, a:100, c:this.color });
    if (this.trail.length > 25) this.trail.shift();
  }

  // 3️⃣ Couleur & timer flash
  this.updateColor();
  if (this.bounceTimer > 0) this.bounceTimer--;
}

  show() {
  // 1) halo autour de la balle si demandé
  if (cfg.ballStyle.halo) {
    push();
      noFill();
      stroke(this.color);
      strokeWeight(4);
      ellipse(this.x, this.y, this.r*2 + 10);
    pop();
  }

  // 2) bille principale
  push();
    noStroke();
    fill(this.color);
    ellipse(this.x, this.y, this.r * 2);
  pop();

  // 3) l'éventuel flash/confetti après rebond reste inchangé
  if (this.bounceTimer > 0) {
    fill(255, 100);
    ellipse(this.x, this.y, this.r * 3);
  }
}

  checkCollision(o) {
    // simple échange de vitesses si chevauchement
    let dx = this.x - o.x, dy = this.y - o.y;
    let distSq = dx*dx + dy*dy;
    let minDist = this.r + o.r;
    if (distSq < minDist*minDist && distSq > 0) {
      let dist = sqrt(distSq);
      let overlap = 0.5 * (minDist - dist);
      let nx = dx / dist, ny = dy / dist;
      this.x += nx * overlap;  this.y += ny * overlap;
      o.x   -= nx * overlap;  o.y   -= ny * overlap;
      // échange
      [this.vx, o.vx] = [o.vx, this.vx];
      [this.vy, o.vy] = [o.vy, this.vy];
    }
  }
  updateColor() {
    if (yesCount > noCount)      this.color = color(0,255,0);
    else if (noCount > yesCount) this.color = color(255,0,0);
    else                          this.color = color(cfg.ballStyle.color);
  }
  flash(c) {
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: this.x, y: this.y,
        vx: cos(TWO_PI*i/8)*2,
        vy: sin(TWO_PI*i/8)*2,
        r: 5, c: c, life: 20
      });
    }
  }
}

// — Confetti & particules —
function spawnConfetti(x, y, col) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x, y,
      vx: random(-2,2),
      vy: random(-3,-0.5),
      r: random(3,6),
      c: col,
      life: 60
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    fill(p.c); noStroke();
    ellipse(p.x, p.y, p.r);
    p.x += p.vx; p.y += p.vy; p.vy += 0.1;
    if (--p.life <= 0) particles.splice(i, 1);
  }
}

// — Reste de vos fonctions : drawBonusWheel(), drawStylizedBackground(), showFinalResult(), easeOutCubic() —
// — Affiche le résultat final quand running === false et finished === true —
function initConfetti() {
  confetti = [];
  for (let i = 0; i < 200; i++) {
    confetti.push({
      x: random(width),
      y: random(-height, 0),
      r: random(4, 10),
      c: color(random(255), random(255), random(255)),
      vx: random(-1, 1),
      vy: random(1, 3),
      rot: random(TWO_PI),
      rotSpeed: random(-0.1, 0.1),
    });
  }
}

function drawEndSequence() {
  // ─────────── Confettis ───────────
  if (!confettiLaunched) {
    initConfetti();
    confettiLaunched = true;
  }
  // Overlay + confettis (inchangé)
  noStroke();
  fill(0,0,0,150);
  rect(0,0,width,height);
  for (let i = confetti.length - 1; i >= 0; i--) {
    let p = confetti[i];
    p.x += p.vx; p.y += p.vy; p.rot += p.rotSpeed;
    push();
      translate(p.x, p.y);
      rotate(p.rot);
      noStroke();
      fill(p.c);
      rect(0,0,p.r,p.r*2);
    pop();
    if (p.y > height) confetti.splice(i,1);
  }

  textAlign(CENTER, TOP);
  fill(255);
  const resText = yesCount > noCount ? t.resultYes : noCount > yesCount ? t.resultNo : t.resultTie;

  const boxW = width * 0.8;
  let questionLines = [];
  let questionHeight = 0;
  let qLineHeight = 0;
  if (questionParam) {
    textSize(24);
    const qMaxWidth = boxW - 40;
    questionLines = wrapQuestionText(questionParam, qMaxWidth);
    qLineHeight = (textAscent() + textDescent()) * 0.9;
    questionHeight = questionLines.length * qLineHeight + 10;
  }
  const boxH = 100 + questionHeight;
  const boxX = (width - boxW) / 2;
  const boxY = height / 2 - boxH / 2;

  stroke(255,204,0);
  strokeWeight(4);
  fill(0,0,0,180);
  rect(boxX, boxY, boxW, boxH, 16);
  noStroke();
  fill(255);

  let y = boxY + 20;
  if (questionLines.length) {
    textSize(24);
    for (const line of questionLines) {
      text(line, width / 2, y);
      y += qLineHeight;
    }
    y += 10;
  }
  textSize(32);
  text(resText, width / 2, y);
  y += 40;
  textSize(24);
  text(`✅ ${yesCount} | ❌ ${noCount}`, width / 2, y);

  if (!resultShown) {
    showResultOverlay();
    resultShown = true;
  }
}

// Affiche le menu pause lorsqu’on appuie pendant le jeu
function mousePressed(e) {
  if (running && overlay.style.display === 'none' && e.target !== addBallBtn && e.target !== removeBallBtn) {
    pauseGame();
    showOverlay();
  }
}

function touchStarted(e) {
  mousePressed(e);
}


function windowResized() {
  const baseWidth = Math.min(windowWidth, MAX_CANVAS_WIDTH);
  const scaleFactor = VIDEO_WIDTH / baseWidth;
  pixelDensity(scaleFactor);
  const baseHeight = VIDEO_HEIGHT / scaleFactor;
  resizeCanvas(baseWidth, baseHeight);
  positionHudQuestion();
}

