export const UI = {
  main: {
    volume: {
      level: 0.0,
      input: document.querySelector("#volume"),
      indicator: document.querySelector("#volume-indicator"),
      setter: ()=>{},
    },
    wall: {
      // level: 0.5, // default
      level: 0.0,
      input: document.querySelector("#wall"),
      indicator: document.querySelector("#wall-indicator"),
      setter: ()=>{},
    },
    wave: {
      level: 0.0,
      input: document.querySelector("#wave"),
      indicator: document.querySelector("#wave-indicator"),
      setter: ()=>{},
    },
    rain: {
      level: 0.5,
      input: document.querySelector("#rain"),
      indicator: document.querySelector("#rain-indicator"),
      setter: ()=>{},
    },
    hush: {
      level: 0.0,
      input: document.querySelector("#hush"),
      indicator: document.querySelector("#hush-indicator"),
      setter: ()=>{},
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
          indicator: document.querySelector("#filter-indicator"),
          setter: ()=>{},
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
          indicator: document.querySelector("#speed-indicator"),
          setter: ()=>{},
        }
      }
    },
    rainSound: {
      touch: document.querySelector("#rain-sound"),
      component: document.querySelector("#rain-details"),
      UI: {
        amount: {
          level: 0.2,
          input: document.querySelector("#rain-amount"),
          indicator: document.querySelector("#amount-indicator"),
          setter: ()=>{},
        }
      }
    },
    hushSound: {
      touch: document.querySelector("#hush-sound"),
      component: document.querySelector("#hush-details"),
      UI: {
        gibber: {
          level: 0,
          input: document.querySelector("#hush-gibber"),
          indicator: document.querySelector("#gibber-indicator"),
          setter: ()=>{},
        }
      }
    },
  }
}

for (let sound in UI.main) {
  const soundUI = UI.main[sound];
  // console.log(soundUI.input);
  soundUI.input.value = soundUI.level;
  soundUI.indicator.style.setProperty("--"+sound+"Indicator", (Math.floor(soundUI.level*100)) * 0.01 );
  soundUI.input.addEventListener("input", (e) => {
    const level = e.target.value;
    soundUI.level = level;
    soundUI.setter(level);
    soundUI.indicator.style.setProperty("--"+sound+"Indicator", Math.floor(level*100) * 0.01 );
  });
}

for (let sound in UI.details) {
  for (let param in UI.details[sound].UI) {
    const paramUI = UI.details[sound].UI[param];
    // console.log(paramUI);
    paramUI.input.value = paramUI.level;
    paramUI.indicator.style.setProperty("--"+param+"Indicator", (Math.floor(paramUI.level*100)) * 0.01 );
    paramUI.input.addEventListener("input", (e) => {
      const level = e.target.value;
      paramUI.level = level;
      paramUI.setter(level);
      paramUI.indicator.style.setProperty("--"+param+"Indicator", Math.floor(level*100) * 0.01 );
    });
  }
}
