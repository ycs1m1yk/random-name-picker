import confetti from 'canvas-confetti';
import Slot from '@js/Slot';
import SoundEffects from '@js/SoundEffects';

// Initialize slot machine
(() => {
  const drawButton = document.getElementById('draw-button') as HTMLButtonElement | null;
  const fullscreenButton = document.getElementById('fullscreen-button') as HTMLButtonElement | null;
  const settingsButton = document.getElementById('settings-button') as HTMLButtonElement | null;
  const settingsWrapper = document.getElementById('settings') as HTMLDivElement | null;
  const settingsContent = document.getElementById('settings-panel') as HTMLDivElement | null;
  const settingsSaveButton = document.getElementById('settings-save') as HTMLButtonElement | null;
  const settingsCloseButton = document.getElementById('settings-close') as HTMLButtonElement | null;
  const sunburstSvg = document.getElementById('sunburst') as HTMLImageElement | null;
  const confettiCanvas = document.getElementById('confetti-canvas') as HTMLCanvasElement | null;
  const winnerList = document.getElementById('winner-list') as HTMLUListElement | null;
  const nameListUlist = document.getElementById('name-list') as HTMLUListElement | null;
  const spinCountInput = document.getElementById('spin-count') as HTMLInputElement | null;
  const spinSpeedInput = document.getElementById('spin-speed') as HTMLInputElement | null;
  const minusSpinCountButton = document.getElementById('minus-button') as HTMLButtonElement | null;
  const plusSpinCountButton = document.getElementById('plus-button') as HTMLButtonElement | null;
  const removeNameFromListCheckbox = document.getElementById('remove-from-list') as HTMLInputElement | null;
  const enableSoundCheckbox = document.getElementById('enable-sound') as HTMLInputElement | null;

  // Graceful exit if necessary elements are not found
  if (!(
    drawButton
    && fullscreenButton
    && settingsButton
    && settingsWrapper
    && settingsContent
    && settingsSaveButton
    && settingsCloseButton
    && sunburstSvg
    && confettiCanvas
    && winnerList
    && nameListUlist
    && spinCountInput
    && spinSpeedInput
    && minusSpinCountButton
    && plusSpinCountButton
    && removeNameFromListCheckbox
    && enableSoundCheckbox
  )) {
    console.error('One or more Element ID is invalid. This is possibly a bug.');
    return;
  }

  if (!(confettiCanvas instanceof HTMLCanvasElement)) {
    console.error('Confetti canvas is not an instance of Canvas. This is possibly a bug.');
    return;
  }

  const soundEffects = new SoundEffects();
  const MAX_REEL_ITEMS = 40;
  const CONFETTI_COLORS = ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'];
  let confettiAnimationId;

  /** Confeetti animation instance */
  const customConfetti = confetti.create(confettiCanvas, {
    resize: true,
    useWorker: true
  });

  /** Triggers cconfeetti animation until animation is canceled */
  const confettiAnimation = () => {
    const windowWidth = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth;
    const confettiScale = Math.max(0.5, Math.min(1, windowWidth / 1100));

    customConfetti({
      particleCount: 1,
      gravity: 0.8,
      spread: 90,
      origin: { y: 0.6 },
      colors: [CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]],
      scalar: confettiScale
    });

    confettiAnimationId = window.requestAnimationFrame(confettiAnimation);
  };

  /** winner string 을 받아서 ul#winner-list 에 추가하는 함수 */
  const addWinnerToList = (winner: string) => {
    const winnerListItem = document.createElement('li');
    winnerListItem.textContent = winner;
    winnerList.appendChild(winnerListItem);
  }


  /** Function to stop the winning animation */
  const stopWinningAnimation = () => {
    if (confettiAnimationId) {
      window.cancelAnimationFrame(confettiAnimationId);
    }
    sunburstSvg.style.display = 'none';
  };

  /**  Function to be trigger before spinning */
  const onSpinStart = () => {
    stopWinningAnimation();
    drawButton.disabled = true;
    settingsButton.disabled = true;
    soundEffects.spin((MAX_REEL_ITEMS - 1) / 10);
  };

  /**  Functions to be trigger after spinning */
  const onSpinEnd = async (winner: string) => {
    confettiAnimation();
    addWinnerToList(winner);
    sunburstSvg.style.display = 'block';
    await soundEffects.win();
    drawButton.disabled = false;
    settingsButton.disabled = false;
  };

  /** Slot instance */
  const slot = new Slot({
    reelContainerSelector: '#reel',
    maxReelItems: MAX_REEL_ITEMS,
    onSpinStart,
    onSpinEnd,
    onNameListChanged: stopWinningAnimation
  });

  /** To open the setting page */
  const onSettingsOpen = () => {
    removeNameFromListCheckbox.checked = slot.shouldRemoveWinnerFromNameList;
    enableSoundCheckbox.checked = !soundEffects.mute;
    settingsWrapper.style.display = 'block';
  };

  /** To close the setting page */
  const onSettingsClose = () => {
    settingsContent.scrollTop = 0;
    settingsWrapper.style.display = 'none';
  };

  // Click handler for "Draw" button
  drawButton.addEventListener('click', async () => {
    if (!slot.names.length) {
      onSettingsOpen();
      return;
    }

    // winner list clear
    winnerList.innerHTML = '';

    const slotQueue = Array.from({ length: slot.spinCount }, (_, i) => i + 1);
    for await (const i of slotQueue) {
      console.log(`Spinning ${i} of ${slot.spinCount}`);
      await slot.spin();
    }
  });

  // Hide fullscreen button when it is not supported
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - for older browsers support
  if (!(document.documentElement.requestFullscreen && document.exitFullscreen)) {
    fullscreenButton.remove();
  }

  // Click handler for "Fullscreen" button
  fullscreenButton.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      return;
    }

    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  });

  // Click handler for "Minus" button for spin count
  minusSpinCountButton.addEventListener('click', () => {
    spinCountInput.stepDown();
  });

  // Click handler for "Plus" button for spin count
  plusSpinCountButton.addEventListener('click', () => {
    spinCountInput.stepUp();
  });

  // Click handler for "Settings" button
  settingsButton.addEventListener('click', onSettingsOpen);

  // Click handler for "Save" button for setting page
  settingsSaveButton.addEventListener('click', () => {
    const checkedNameList = nameListUlist.querySelectorAll('input[type="checkbox"]:checked');
    const checkedNames = Array.from(checkedNameList).map((input: any) => input.value);
    nameListUlist.dataset.value = slot.names.length ? slot.names.join('\n') : checkedNames.join('\n');
    slot.names = nameListUlist.dataset.value.split(/\n/).filter((name) => Boolean(name.trim()));
    slot.spinCount = +spinCountInput.value;
    const spinSpeed = +spinSpeedInput.value; // 1...5
    const playBackRates = [0, 0.66, 1, 1.25, 1.75, 2.5];
    slot.reelSpeed = playBackRates[spinSpeed];
    slot.shouldRemoveWinnerFromNameList = removeNameFromListCheckbox.checked;
    soundEffects.mute = !enableSoundCheckbox.checked;
    soundEffects.rate = slot.reelSpeed;
    onSettingsClose();
  });

  // Click handler for "Discard and close" button for setting page
  settingsCloseButton.addEventListener('click', onSettingsClose);
})();
