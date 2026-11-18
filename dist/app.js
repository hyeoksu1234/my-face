const byId = id => document.getElementById(id);
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
const pointerPreference = matchMedia("(hover: hover) and (pointer: fine)");

function enableScrollReveal() {
  if (motionPreference.matches || !("IntersectionObserver" in window)) return;
  const sections = [...document.querySelectorAll(".reveal")];
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.08 });
  document.documentElement.classList.add("motion-enhanced");
  sections.forEach(section => observer.observe(section));
}

function setUpTilt(figure) {
  const angle = figure.querySelector(".screen-angle");
  let nextFrame = 0;
  function reset() {
    cancelAnimationFrame(nextFrame);
    angle.style.removeProperty("--rx");
    angle.style.removeProperty("--ry");
  }
  figure.addEventListener("pointermove", event => {
    if (!pointerPreference.matches || motionPreference.matches) return;
    cancelAnimationFrame(nextFrame);
    nextFrame = requestAnimationFrame(() => {
      const bounds = figure.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      angle.style.setProperty("--rx", `${-y * 4}deg`);
      angle.style.setProperty("--ry", `${x * 5}deg`);
    });
  });
  figure.addEventListener("pointerleave", reset);
  motionPreference.addEventListener("change", reset);
}

async function data(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

async function loadMotion() {
  const frames = new Image();
  frames.src = "./assets/unlock-frames.webp";
  const [timing] = await Promise.all([data("./assets/unlock-timing.json"), frames.decode()]);
  const { frameTicks, ticksPerSecond, scanLoopStartTick, checkFrame, endTick, tile, columns } = timing;
  const duration = endTick / ticksPerSecond;
  const scanStart = scanLoopStartTick / ticksPerSecond;
  const checkStart = frameTicks[checkFrame] / ticksPerSecond;

  function phaseAt(seconds) {
    if (seconds >= checkStart) return { id: "unlocked", label: "잠금 해제됨" };
    if (seconds >= scanStart) return { id: "checking", label: "얼굴 확인 중" };
    return { id: "locked", label: "잠금 상태" };
  }

  function frameIndex(tick) {
    let low = 0;
    let high = frameTicks.length;
    while (low + 1 < high) {
      const index = (low + high) >> 1;
      if (frameTicks[index] <= tick) low = index;
      else high = index;
    }
    return low;
  }

  function renderer(canvas) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas could not be initialized");
    let previous = -1;
    return seconds => {
      const index = frameIndex(seconds * ticksPerSecond);
      if (index === previous) return;
      previous = index;
      const x = index % columns * tile;
      const y = Math.floor(index / columns) * tile;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(frames, x, y, tile, tile, 0, 0, canvas.width, canvas.height);
      canvas.dataset.ready = "";
    };
  }

  function player(draw, playbackDuration = duration) {
    let handle = 0;
    function stop() { cancelAnimationFrame(handle); }
    function play(onComplete) {
      stop();
      if (motionPreference.matches) {
        draw(playbackDuration);
        onComplete?.();
        return;
      }
      draw(0);
      const start = performance.now();
      function tick(now) {
        const elapsed = Math.min(playbackDuration, (now - start) / 1000);
        draw(elapsed);
        if (elapsed < playbackDuration) handle = requestAnimationFrame(tick);
        else onComplete?.();
      }
      handle = requestAnimationFrame(tick);
    }
    return { play, stop };
  }

  const hero = byId("hero-demo");
  const heroText = byId("panel-text");
  const heroStatus = byId("hero-status");
  const heroButton = byId("play-hero");
  const heroFrame = renderer(byId("hero-mark"));
  // Hold the moving ring briefly so the state reads clearly on the mock screen.
  const checkingHold = 1.14;
  const preCheck = frameTicks[checkFrame - 1] / ticksPerSecond;
  const heroPlayer = player(seconds => {
    const waiting = seconds - checkStart;
    let sourceTime = seconds;
    if (waiting >= 0 && waiting < checkingHold) {
      const sweep = (1 - Math.cos(2 * Math.PI * waiting / checkingHold)) / 2;
      sourceTime = preCheck - (preCheck - scanStart) * sweep;
    } else if (waiting >= checkingHold) {
      sourceTime -= checkingHold;
    }
    const phase = phaseAt(sourceTime);
    heroFrame(sourceTime);
    hero.dataset.phase = phase.id;
    if (heroText.textContent !== phase.label) heroText.textContent = phase.label;
  }, duration + checkingHold);
  heroFrame(0);
  heroButton.hidden = false;
  heroButton.addEventListener("click", () => {
    heroStatus.textContent = "잠금 해제 데모 재생 중";
    heroPlayer.play(() => { heroStatus.textContent = "데모 잠금 해제 완료"; });
  });
  setUpTilt(hero);

  // Play once when the visitor can see the whole opening. The replay button
  // allows a deliberate replay and works without any pointer movement.
  if (!motionPreference.matches && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      heroPlayer.play();
    }, { threshold: 0.6 });
    observer.observe(hero);
    heroButton.addEventListener("click", () => observer.disconnect(), { once: true });
  }

  const range = byId("motion-time");
  const phaseLabel = byId("studio-phase");
  const timeLabel = byId("time-readout");
  const studyButton = byId("play-study");
  const steps = [...document.querySelectorAll(".step")];
  const studioFrame = renderer(byId("study-mark"));
  range.max = String(duration);
  function drawStudy(seconds) {
    const phase = phaseAt(seconds);
    studioFrame(seconds);
    if (phaseLabel.textContent !== phase.label) phaseLabel.textContent = phase.label;
    const formatted = seconds.toFixed(2);
    range.value = formatted;
    range.setAttribute("aria-valuetext", `${formatted}초, ${phase.label}`);
    timeLabel.value = `${formatted} / ${duration.toFixed(2)}초`;
    steps.forEach(candidate => {
      const selected = phaseAt(Number(candidate.dataset.time)).id === phase.id;
      if (candidate.getAttribute("aria-pressed") !== String(selected)) {
        candidate.setAttribute("aria-pressed", String(selected));
      }
    });
  }
  const studyPlayer = player(drawStudy);
  for (const element of [...steps, range, studyButton]) element.disabled = false;
  for (const step of steps) {
    step.addEventListener("click", () => {
      studyPlayer.stop();
      drawStudy(Number(step.dataset.time));
    });
  }
  studyButton.addEventListener("click", () => studyPlayer.play());
  range.addEventListener("input", () => {
    studyPlayer.stop();
    drawStudy(Number(range.value));
  });
  drawStudy(0);

  motionPreference.addEventListener("change", event => {
    if (event.matches) {
      heroPlayer.stop();
      studyPlayer.stop();
    }
  });
}

async function loadRelease() {
  const release = await data("./release.json");
  if (release.version) byId("release-version").textContent = `v${release.version} · macOS 26+`;
  if (!release.downloadUrl) return;
  const download = new URL(release.downloadUrl, location.href);
  if (download.protocol !== "https:" || download.hostname !== "github.com") return;
  byId("release-download").href = download.href;
  byId("release-action").textContent = "Mac용 ZIP 다운로드";
  byId("release-state").textContent = "다운로드 가능";
  byId("release-note").textContent = "ZIP 파일을 받은 뒤 설치 안내를 따라 진행하세요.";
  if (/^[0-9a-f]{64}$/i.test(release.sha256 || "")) {
    byId("hash").textContent = `SHA-256: ${release.sha256}`;
    byId("checksum").hidden = false;
  }
}

enableScrollReveal();
loadMotion().catch(() => {
  document.documentElement.classList.add("motion-unavailable");
  byId("studio-phase").textContent = "모션을 불러오지 못했어요";
});
loadRelease().catch(() => {
  // The server-rendered release link is usable even when the JSON is unavailable.
});
