import "./CSSreset.scss";
import "./style.scss";
import "./UI.js";

import oscillators from "web-audio-oscillators";
import { UI } from "./UI.js";
import { set } from "immutable";

const cl = console.log;
const aC = new AudioContext();
const speaker = aC.destination;
let started = false;

function float2P (float) {
  return Math.floor(100*float)*0.01;
}

const TRFM = {
  per1: (n) => 0.001 + n,
  negPer1: (n) => 1.001 - n,
  toHz: (n) => 10000 * (0.001 + n),
  negToHz: (n) => 10000 * (1.001 - n),
  per1tenth: (n) => 10 * (0.001 + n),
  negPer1tenth: (n) => 10 * (1.001 - n),
};

function setParam(param, value) {
  param.exponentialRampToValueAtTime(float2P(value), 0, 0);
}

const mainGain = new GainNode(aC, { gain: UI.main.volume.level });
UI.main.volume.setter = (level) => setParam(mainGain.gain, level);
const wallGain = new GainNode(aC, { gain: UI.main.wall.level });
UI.main.wall.setter = (level) => setParam(wallGain.gain, level);
const waveGain = new GainNode(aC, { gain: UI.main.wave.level });
UI.main.wave.setter = (level) => setParam(waveGain.gain, level);
const rainGain = new GainNode(aC, { gain: UI.main.rain.level });
UI.main.rain.setter = (level) => setParam(rainGain.gain, level);
const hushGain = new GainNode(aC, { gain: UI.main.hush.level });
UI.main.hush.setter = (level) => setParam(hushGain.gain, level);

// const hushGibberGain = new GainNode(aC);

function whiteNoise(arr, level) {
  for (let i = 0, l = arr.length; i < l; i++) {
    arr[i] = Math.random() * (level * 2) - level;
  }
  return arr;
}

function mergeAll(outs) {
  const merger = aC.createChannelMerger(1);
  for (let i = 0; i < outs.length; i++) {
    outs[i].connect(merger, 0, 0);
  }
  return merger;
}

function startSound(startList) {
  for (let i = 0; i < startList.length; i++) {
    startList[i].start();
  }
}

function noiseOsc (context) {
  const NUM_SECS = 4;
  const S_R = 44100;
  const buffer = new AudioBuffer({
    length: NUM_SECS * S_R,
    sampleRate: S_R,
  });
  whiteNoise(buffer.getChannelData(0), 1);
  const noiseNode = new AudioBufferSourceNode(context, {
    buffer: buffer,
    loop: true,
  });
  return noiseNode;
}

// for pad 0, range is 0 to 2 * i8
// for pad 0.5, range is 0.5 * i8 to 2 * i8
// for pad 1, range is i8 to 2 * i8
// for pad 2, val = 2 * i8 (no random)
function slowRandom(params, scalers, options = {}) {
  const defaults = { frequency: 0.5, minVal: 0, maxVal: 1, val: 0, pad: 0 };
  for (let key in defaults) {
    if (options[key] === undefined) {
      options[key] = defaults[key];
    }
  }
  params.forEach((param, i) => param.exponentialRampToValueAtTime(scalers[i](options.val), 0, 0)); //initialize At
  this.on = false;
  this.i2 = 1 / TRFM.per1tenth(parseFloat(options.frequency));
  this.setFrequency = (newF) => {
    cl(this);
    params.forEach((param) => param.cancelScheduledValues(0));
    this.i2 = 1 / TRFM.per1tenth(parseFloat(newF));
  };
  this.start = () => {
    this.on = true;
    this.reset(options.val, options.val, 0, this.i2);
  };
  this.reset = (prev, curr, prevInt, currInt) => {
    if (this.on) {
      setTimeout(() => {
        const time = aC.currentTime;
        // param.linearRampToValueAtTime(curr, currInt + time);
        params.forEach((param, i) =>
          param.exponentialRampToValueAtTime(
            scalers[i](curr),
            currInt + time
          )
        );
        const next =
          Math.random() * (options.maxVal - options.minVal) + options.minVal;
        const nextInt =
          Math.random() * (this.i2 * 2 - this.i2 * options.pad) +
          this.i2 * options.pad;
        this.reset(curr, next, currInt, nextInt);
      }, currInt * 1000);
    }
  };
  this.stop = () => {
    this.on = false;
  };
  return this;
}

function blobRandom(params, scalers, options = {}) {
  const defaults = { frequency: 0.3, minVal: 0, maxVal: 1, val: 0.002, pad: 1.5 };
  for (let key in defaults) {
    if (options[key] === undefined) {
      options[key] = defaults[key];
    }
  }
  this.toggle = false;
  params.forEach((param) => param.exponentialRampToValueAtTime(TRFM.per1(options.minVal), 0)); //initialize At
  this.on = false;
  this.i2 = 0.25 / TRFM.per1tenth(parseFloat(options.frequency));
  this.setFrequency = (newF) => {
    params.forEach((param) => param.cancelScheduledValues(0));
    this.i2 = 0.25 / TRFM.per1tenth(parseFloat(newF));
  };
  this.start = () => {
    this.on = true;
    this.reset(this.i2, this.i2);
  };
  this.reset = (prevInt, currInt) => {
    const val = parseFloat(this.toggle ? options.maxVal : options.minVal);
    if (this.on) {
      setTimeout(() => {
        const time = aC.currentTime;
        params.forEach((param, i) => {
          const newLevel = scalers[i](val);
          param.exponentialRampToValueAtTime(scalers[i](val), time+currInt);
      });
        const nextInt =
          Math.random() * (this.i2 * 2 - this.i2 * options.pad) +
          this.i2 * options.pad;
          this.toggle = !this.toggle;
        this.reset(currInt, nextInt);
      }, currInt * 1000);
    }
  };
  this.stop = () => {
    this.on = false;
  };
  return this;
}

function grainRandom(params, scalers, options = {}) {
  const defaults = { frequency: 1.0, minVal: 0.1, maxVal: 1, val: 0.5, pad: 0 };
  const grainLength = 0.01; // 20ms / 0.002s
  for (let key in defaults) {
    if (options[key] === undefined) {
      options[key] = defaults[key];
    }
  }
  params.forEach((param, i) => param.exponentialRampToValueAtTime(scalers[i](parseFloat(options.val)), 0, 0)); //initialize At
  this.i2 = 0.25 / TRFM.per1tenth(parseFloat(options.frequency));
  this.setFrequency = (newF) => {
    params.forEach((param) => param.cancelScheduledValues(0));
    this.i2 = 0.25 / TRFM.per1tenth(parseFloat(newF));
  };
  this.start = () => {
    cl("grain start");
    this.on = true;
    this.reset(options.val, options.val, 0, this.i2);
  };
  this.reset = (prev, curr, prevInt, currInt) => {
    if (this.on) {
      setTimeout(() => {
        const time = aC.currentTime;
        params.forEach((param, i) => {
          param.cancelScheduledValues(0);
          param.linearRampToValueAtTime(scalers[i](curr), time + 0.003); //immediate
          param.linearRampToValueAtTime(
            0.0001, //zero-ish
            grainLength + time + 0.003, // add latency
          );
        });
        const next =
          Math.random() * (options.maxVal - options.minVal) + options.minVal;
        const nextInt =
          Math.random() * (this.i2 * 2 - this.i2 * options.pad) +
          this.i2 * options.pad;
        this.reset(curr, next, currInt, nextInt);
      }, (currInt + grainLength + 0.005) * 1000);
    }
  };
  this.stop = () => {
    this.on = false;
  };
  return this;
}

// ^^ end sound setup ^^
// vv sound designs vv
function makeWall(numLayers = 1) {
  const layers = [];
  const startList = [];
  for (let i = 0; i < numLayers; i++) {
    const noiseNode = noiseOsc(aC);
    startList.push(noiseNode);
    const wallFilter = new BiquadFilterNode(aC, {
      type: "lowpass",
      frequency: 8000,
      Q: 0.2,
    });
    UI.details.wallSound.UI.filter.setter = (level) => {
      setParam(wallFilter.frequency, TRFM.toHz(parseFloat(level)));
    };
    noiseNode.connect(wallFilter)
    layers[i] = wallFilter;
  }
  const merger = mergeAll(layers);
  return [merger.connect(wallGain), startList];
}

function makeWave(numLayers = 1) {
  const layers = [];
  const startList = [];
  for (let i = 0; i < numLayers; i++) {
    const noiseNode = noiseOsc(aC);
    startList.push(noiseNode);
    const filterLFO = new BiquadFilterNode(aC, {
      type: "bandpass",
      frequency: 60,
    });
    let waveSpeed = UI.details.waveSound.UI.speed.level;
    const lfo0 = new slowRandom([filterLFO.frequency], [TRFM.toHz], {
      frequency: waveSpeed,
      minVal: 0.006,
      maxVal: 0.4,
      pad: 1.9,
    });
    startList.push(lfo0);
    const guideLFO = new GainNode(aC);
    const lfo1 = new slowRandom([guideLFO.gain], [TRFM.per1], {
      frequency: waveSpeed * 0.5,
      minVal: 0.2,
      maxVal: 0.8,
      pad: 1,
    });
    startList.push(lfo1);
    const outLFO = new GainNode(aC);
    const lfo2 = new slowRandom([outLFO.gain], [TRFM.per1], {
      frequency: waveSpeed * 0.2,
      minVal: 0.4,
      maxVal: 0.6,
      pad: 1,
    });
    startList.push(lfo2);
    UI.details.waveSound.UI.speed.setter = (level) => {
      lfo0.setFrequency(level);
      lfo1.setFrequency(level * 0.5);
      lfo2.setFrequency(level * 0.2);
    }
    noiseNode.connect(filterLFO).connect(guideLFO).connect(outLFO);
    layers[i] = outLFO;
  }
  const merger = mergeAll(layers);
  return [merger.connect(waveGain), startList];
}

function makeRain(numLayers = 1) {
  const layers = [];
  const startList = [];
  for (let i = 0; i < numLayers; i++) {
    const noiseNode = noiseOsc(aC);
    startList.push(noiseNode);
    const filterLFO = new BiquadFilterNode(aC, {
      type: "lowpass",
      frequency: 60,
      Q: 0.1,
    });
    const gainLFO = new GainNode(aC);
    let rainAmount = UI.details.rainSound.UI.amount.level;
    const lfo = new grainRandom([filterLFO.frequency, gainLFO.gain], [TRFM.toHz, TRFM.per1], {
      frequency: rainAmount,
      minVal: 0.4,
      maxVal: 2,
      pad: 0,
    });
    startList.push(lfo);
    const layerGain = new GainNode(aC, { gain: parseFloat((1/((i+1)*4))+0.001) } )
    noiseNode
     .connect(filterLFO)
     .connect(gainLFO)
     .connect(layerGain);
    layers[i] = layerGain;
  }
  UI.details.rainSound.UI.amount.setter = (level) => {
    startList.forEach((lfo, i) => {
      if (lfo.hasOwnProperty("setFrequency")) {
        lfo.setFrequency(level);
      }
    })
  }
  const merger = mergeAll(layers);
  return [merger.connect(rainGain), startList];
}

function makeHush(numLayers = 1) {
  const layers = [];
  const startList = [];
  const gibberGains = [];
  for (let i = 0; i < numLayers; i++) {
    // formant osc
    const aahF = Math.random() * (250 - 150) + 150;
    const aahNode1 = oscillators.aah(aC);
    aahNode1.frequency.value = aahF;
    const aahNode2 = oscillators.ooh(aC);
    aahNode2.frequency.value = aahF * 0.5;
    const aahNode3 = oscillators.eeh(aC);
    aahNode3.frequency.value = aahF * 2;
    startList.push(aahNode1, aahNode2, aahNode3);
    const aahMerge = mergeAll([aahNode1, aahNode2, aahNode3]);
    const aahGain = new GainNode(aC);
    const hushGibberGain = new GainNode(aC, {gain: parseFloat(UI.details.hushSound.UI.gibber.level)});
    aahMerge.connect(aahGain).connect(hushGibberGain);
    gibberGains.push(hushGibberGain.gain);
    const noiseNode = noiseOsc(aC);
    startList.push(noiseNode);
    const noiseGain = new GainNode(aC, {gain: 0.7});
    noiseNode.connect(noiseGain);
    const voxMerge = mergeAll([hushGibberGain, noiseGain]);

    // vowel / consonant
    const lfoBlob1 = new blobRandom(
      [aahGain.gain, noiseGain.gain],
      [TRFM.per1, TRFM.negPer1],
      {
        frequency: 0.2,
        minVal: 0,
        maxVal: 1,
        pad: 0.5,
      }
    );
    startList.push(lfoBlob1);

    // words
    const lfoBlob2 = new slowRandom(
      [aahGain.gain, noiseGain.gain],
      [TRFM.per1, TRFM.per1],
      {
        frequency: 0.6,
        minVal: 0,
        maxVal: 2,
        pad: 0.5,
      }
    );
    startList.push(lfoBlob2);

    const lfoDetune = new slowRandom([aahNode1.detune, aahNode2.detune, aahNode3.detune],[TRFM.per1,TRFM.per1,TRFM.per1], {
      frequency: 0.2,
      minVal: -100,
      maxVal: 200,
      pad: 0,
    })
    startList.push(lfoDetune);

    // shape
    const lfo0filter = new BiquadFilterNode(aC, {
      type: "bandpass",
      frequency: 8000,
      Q: 2,
    });
    const lfo0 = new slowRandom([lfo0filter.frequency], [TRFM.toHz], {
      frequency: 0.4,
      minVal: 0.1,
      maxVal: 0.9,
      pad: 0.2,
    });
    startList.push(lfo0);

    // phrase
    const lfo1gain = new GainNode(aC);
    const lfo1 = new slowRandom([lfo1gain.gain], [TRFM.per1], {
      frequency: 0.1,
      minVal: 0.3,
      maxVal: 0.7,
      val: 0.5,
      pad: 1.5,
    });
    startList.push(lfo1);

    voxMerge
     .connect(lfo0filter)
     .connect(lfo1gain);
    
    layers[i] = lfo1gain;
  }
  // expose gain in all levels and setParam on each
  UI.details.hushSound.UI.gibber.setter = (level) => {
    gibberGains.forEach(gainParam => {
      setParam(gainParam, parseFloat(level));
    })
  };

  const merger = mergeAll(layers);
  return [merger.connect(hushGain), startList];
}

const [wallNode, wallStartList] = makeWall(1);
const [waveNode, waveStartList] = makeWave(2);
const [rainNode, rainStartList] = makeRain(4);
const [hushNode, hushStartList] = makeHush(4);

const mix = mergeAll([
  wallNode, 
  waveNode,
  rainNode, 
  hushNode,
]);

mix.connect(mainGain).connect(speaker);

UI.main.volume.input.addEventListener("mousedown", () => {
  if (!started) {
    startSound(wallStartList);
    startSound(waveStartList);
    startSound(rainStartList);
    startSound(hushStartList);
    started = true;
  }
});