export const UI = {
  main: {
    volume: {
      level: 0.0,
      input: document.querySelector("#volume")
    },
    wall: {
      level: 0.5,
      input: document.querySelector("#wall")
    },
    wave: {
      level: 0.5,
      input: document.querySelector("#wave")
    },
    rain: {
      level: 0.0,
      input: document.querySelector("#rain")
    },
    hush: {
      level: 0.0,
      input: document.querySelector("#hush")
    },
  },
  details: {
    wallSound: {
      touch: document.querySelector("#wall-sound"),
      component: document.querySelector("#wall-details"),
      UI: {
        filter: {
          level: 0.9,
          input: document.querySelector("#wall-filter"),
        }
      }
    },
    waveSound: {
      touch: document.querySelector("#wave-sound"),
      component: document.querySelector("#wave-details"),
      UI: {
        speed: {
          level: 0.3,
          input: document.querySelector("#wave-speed"),
        }
      }
    },
    rainSound: {
      touch: document.querySelector("#rain-sound"),
      component: document.querySelector("#rain-details"),
      UI: {
        amount: {
          level: 0.5,
          input: document.querySelector("#rain-amount"),
        }
      }
    },
    hushSound: {
      touch: document.querySelector("#hush-sound"),
      component: document.querySelector("#hush-details"),
      UI: {
        gibber: {
          level: 0.0,
          input: document.querySelector("#hush-gibber"),
        }
      }
    },
  }
}

for (let sound in UI.main) {
  const soundUI = UI.main[sound];
  // console.log(soundUI.input);
  soundUI.input.value = soundUI.level;
  soundUI.input.addEventListener("input", (e) => soundUI.level = parseInt(e.target.value, 10));
}

for (let sound in UI.details) {
  for (let param in UI.details[sound].UI) {
    const paramUI = UI.details[sound].UI[param];
    // console.log(paramUI);
    paramUI.input.value = paramUI.level;
    paramUI.input.addEventListener("input", (e) => paramUI.level = parseInt(e.target.value, 10));
  }
}