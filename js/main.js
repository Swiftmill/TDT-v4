(() => {
  const GLYPH_CHARSET = "Δ◬◭◮◊◈◇◆⟡⟠⚚⚛⚡✶✧✦✴✷✸✹✺✻✼✽✾✿☽☾☿♆♇♈♉♊♋♌♍♎♏♐♑♒♓ℵℶℷℸᚠᚡᚢᚣᚤᚥᚦᚧᚨᚩᚪᚫᚬᚭᚮᚯᚰᚱᚲᚳᚴᚵᚶᚷᚹᚺᚻᚼᚽᚾᚿᛁᛃᛇᛉᛋᛏᛗᛝᛟᛞᛣᛥᛦᛨ᛫ᛯᛰ";
  const SCRAMBLE_INTERVAL = 1000;
  const states = new Map();

  const body = document.body;
  const glyphElements = Array.from(document.querySelectorAll('.glyph-text'));
  const initialElements = Array.from(document.querySelectorAll('.initial-glow'));
  const delayedGroup = document.getElementById('delayed-content');
  const videoElement = document.getElementById('background-video');
  const videoSource = videoElement ? videoElement.querySelector('source') : null;
  const flashOverlay = document.getElementById('flash-overlay');
  const logoTrigger = document.getElementById('logo-trigger');
  const titleTrigger = document.getElementById('triad-title');
  const logoImage = logoTrigger ? logoTrigger.querySelector('img') : null;
  const videoSources = ['assets/video1.txt', 'assets/video2.txt', 'assets/video3.txt'];
  let currentVideoIndex = 0;
  let switchInProgress = false;

  if (!body) {
    return;
  }

  body.classList.add('js-ready');

  if (logoTrigger && logoImage) {
    const markLogoMissing = () => logoTrigger.classList.add('logo-missing');
    const handleLogoLoad = () => {
      if (logoImage.naturalWidth > 0) {
        logoTrigger.classList.remove('logo-missing');
      }
    };

    logoImage.addEventListener('error', markLogoMissing);
    logoImage.addEventListener('load', handleLogoLoad);

    if (logoImage.complete) {
      if (logoImage.naturalWidth === 0) {
        markLogoMissing();
      } else {
        handleLogoLoad();
      }
    }
  }

  glyphElements.forEach((element) => {
    const original = element.dataset.text || element.textContent || '';
    const prepared = prepareText(original);
    const revealable = countRevealable(prepared);
    states.set(element, {
      original,
      prepared,
      revealable,
      revealing: false,
      revealed: false,
      frame: null,
      start: 0,
      duration: computeDuration(revealable),
    });
    element.textContent = generateGlyphString(prepared);
  });

  setTimeout(() => {
    initialElements.forEach((element) => element.classList.add('visible'));
  }, 500);

  if (delayedGroup) {
    setTimeout(() => delayedGroup.classList.add('visible'), 2000);
  }

  const scrambleInterval = window.setInterval(() => {
    glyphElements.forEach((element) => {
      const state = states.get(element);
      if (!state || state.revealing || state.revealed) {
        return;
      }
      element.textContent = generateGlyphString(state.prepared);
    });
  }, SCRAMBLE_INTERVAL);

  const startReveal = (element) => {
    const state = states.get(element);
    if (!state) {
      return;
    }

    if (state.revealing) {
      return;
    }

    state.revealing = true;
    state.revealed = false;
    state.start = performance.now();

    const step = (timestamp) => {
      if (!state.revealing) {
        return;
      }
      const progress = Math.min((timestamp - state.start) / state.duration, 1);
      renderProgressiveText(element, state, progress);
      if (progress < 1) {
        state.frame = requestAnimationFrame(step);
      } else {
        state.revealed = true;
        state.revealing = false;
        element.classList.add('is-revealed');
        element.textContent = state.prepared;
      }
    };

    state.frame = requestAnimationFrame(step);
  };

  const resetGlyph = (element) => {
    const state = states.get(element);
    if (!state) {
      return;
    }

    state.revealing = false;
    if (state.frame) {
      cancelAnimationFrame(state.frame);
      state.frame = null;
    }
    state.revealed = false;
    element.classList.remove('is-revealed');
    element.textContent = generateGlyphString(state.prepared);
  };

  glyphElements.forEach((element) => {
    element.addEventListener('pointerenter', () => startReveal(element));
    element.addEventListener('focus', () => startReveal(element));
    element.addEventListener('pointerleave', () => resetGlyph(element));
    element.addEventListener('blur', () => resetGlyph(element));
  });

  const cycleVideo = () => {
    if (!videoElement || !videoSource || switchInProgress) {
      return;
    }
    switchInProgress = true;
    currentVideoIndex = (currentVideoIndex + 1) % videoSources.length;
    const nextSource = videoSources[currentVideoIndex];

    triggerFlash();
    videoElement.classList.add('fade-out');

    const handleTransition = () => {
      videoElement.removeEventListener('transitionend', handleTransition);
      videoSource.setAttribute('src', nextSource);
      videoElement.load();
      const playPromise = videoElement.play();
      if (playPromise) {
        playPromise.catch(() => {});
      }
      requestAnimationFrame(() => {
        videoElement.classList.remove('fade-out');
        switchInProgress = false;
      });
    };

    videoElement.addEventListener('transitionend', handleTransition);
  };

  const triggerFlash = () => {
    if (!flashOverlay) {
      return;
    }
    flashOverlay.classList.add('active');
    window.setTimeout(() => flashOverlay.classList.remove('active'), 450);
  };

  const attachCycle = (element) => {
    if (!element) {
      return;
    }
    element.addEventListener('click', cycleVideo);
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        cycleVideo();
      }
    });
  };

  attachCycle(logoTrigger);
  attachCycle(titleTrigger);

  window.addEventListener('beforeunload', () => {
    window.clearInterval(scrambleInterval);
    states.forEach((state) => {
      if (state.frame) {
        cancelAnimationFrame(state.frame);
      }
    });
  });

  function prepareText(text) {
    return text;
  }

  function computeDuration(length) {
    const base = 700;
    const perCharacter = 45;
    return Math.max(base, length * perCharacter);
  }

  function generateGlyphString(text) {
    let result = '';
    for (const char of text) {
      if (char === '\n') {
        result += '\n';
      } else if (/\s/.test(char)) {
        result += char;
      } else {
        result += randomGlyph();
      }
    }
    return result;
  }

  function renderProgressiveText(element, state, progress) {
    const { prepared: text, revealable } = state;
    const revealCount = Math.floor(progress * revealable);
    let output = '';
    let revealedCharacters = 0;

    for (let i = 0; i < text.length; i += 1) {
      const current = text[i];
      if (current === '\n') {
        output += '\n';
        continue;
      }
      if (/\s/.test(current)) {
        output += current;
        continue;
      }

      if (revealedCharacters < revealCount) {
        output += current;
      } else {
        output += randomGlyph();
      }
      revealedCharacters += 1;
    }

    element.textContent = output;
  }

  function countRevealable(text) {
    return Array.from(text).filter((char) => !(char === '\n' || /\s/.test(char))).length;
  }

  function randomGlyph() {
    return GLYPH_CHARSET[Math.floor(Math.random() * GLYPH_CHARSET.length)];
  }
})();
