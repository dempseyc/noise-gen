import "./CSSreset.scss";
import "./style.scss";
import "./UI.js";

import oscillators from "web-audio-oscillators";
import { UI } from "./UI.js";

const cl = console.log;
const aC = new AudioContext();
const speaker = aC.destination;

const NUM_SECS = 1;
const S_R = 44100;

const TRFM = {
  per1: (n) => 0.001 + n,
  negPer1: (n) => 0.501 - n,
  toHz: (n) => 10000 * (0.001 + n),
  negToHz: (n) => 10000 * (0.501 - n),
};

UI.main.volume.input.addEventListener("mousedown", () => startSound());

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

// i8 = eighthInterval;
// for pad 0, range is 0 to 2 * i8
// for pad 0.5, range is 0.5 * i8 to 2 * i8
// for pad 1, range is i8 to 2 * i8
// for pad 2, val = 2 * i8 (no random)
function slowRandom(params, scalers, options = {}) {
  const defaults = { f: 1, minVal: 0, maxVal: 1, val: 0, pad: 0 };
  for (let key in defaults) {
    if (options[key] === undefined) {
      options[key] = defaults[key];
    }
  }
  // do for all params
  params.forEach((param) => param.setTargetAtTime(options.val, 0, 0)); //initialize At
  this.on = false;
  this.i8 = options.f * 0.125; //secs
  this.start = () => {
    cl("start", this);
    this.on = true;
    this.reset(options.val, options.val, this.i8, this.i8);
  };
  this.reset = (prev, curr, prevInt, currInt) => {
    if (this.on) {
      setTimeout(() => {
        const time = aC.currentTime;
        // param.linearRampToValueAtTime(curr, currInt + time);
        params.forEach((param, i) =>
          param.exponentialRampToValueAtTime(
            scalers[i](curr) + 0.01,
            currInt + time
          )
        );
        const next =
          Math.random() * (options.maxVal - options.minVal) + options.minVal;
        const nextInt =
          Math.random() * (this.i8 * 2 - this.i8 * options.pad) +
          this.i8 * options.pad;
        this.reset(curr, next, currInt, nextInt);
      }, prevInt * 1000);
    }
  };
  this.stop = () => {
    this.on = false;
  };
  return this;
}

function blobRandom(params, scalers, options = {}) {
  const defaults = { f: 3, minVal: 0.001, maxVal: 1, val: 0, pad: 1.5 };
  for (let key in defaults) {
    if (options[key] === undefined) {
      options[key] = defaults[key];
    }
  }
  this.toggle = false;
  // do for all params
  params.forEach((param) => param.setTargetAtTime(options.val, 0, 0)); //initialize At
  this.on = false;
  this.i8 = options.f * 0.125; //secs
  this.start = () => {
    this.on = true;
    this.reset(options.val, options.val, this.i8, this.i8);
  };
  this.reset = (prevInt, currInt) => {
    const val = this.toggle ? options.maxVal : options.minVal;
    if (this.on) {
      setTimeout(() => {
        const time = aC.currentTime;
        params.forEach((param, i) =>
          param.setTargetAtTime(scalers[i](val), currInt + time, 0.02)
        );
        const nextInt =
          Math.random() * (this.i8 * 2 - this.i8 * options.pad) +
          this.i8 * options.pad;
          this.toggle = !this.toggle;
        this.reset(currInt, nextInt);
      }, prevInt * 1000);
    }
  };
  this.stop = () => {
    this.on = false;
  };
  return this;
}

const startList = [];

// ^^ end setup ^^

function makeOcean(numLayers = 1) {
  const layers = [];
  for (let i = 0; i < numLayers; i++) {
    const buffer = new AudioBuffer({
      length: NUM_SECS * S_R,
      sampleRate: S_R,
    });
    whiteNoise(buffer.getChannelData(0), 0.5);
    const noiseNode = new AudioBufferSourceNode(aC, {
      buffer: buffer,
      loop: true,
    });
    const filterLFO = new BiquadFilterNode(aC, {
      type: "bandpass",
      frequency: 60,
    });
    const lfo0 = new slowRandom([filterLFO.frequency], [TRFM.per1], {
      f: 15,
      minVal: 60,
      maxVal: 4000,
      pad: 0.5,
    });
    const guideLFO = new GainNode(aC);
    const lfo1 = new slowRandom([guideLFO.gain], [TRFM.per1], {
      f: 20,
      minVal: 0.2,
      maxVal: 0.8,
      pad: 1,
    });
    const outLFO = new GainNode(aC);
    const lfoBlob1 = new slowRandom([outLFO.gain], [TRFM.per1], {
      f: 10,
      minVal: 0.4,
      maxVal: 0.6,
      pad: 1,
    });
    noiseNode.connect(filterLFO).connect(guideLFO).connect(outLFO);
    startList.push(noiseNode, lfo0, lfo1, lfoBlob1);
    layers[i] = outLFO;
  }
  const merger = mergeAll(layers);
  return merger;
}

function makeWhisper(numLayers = 1) {
  const layers = [];
  for (let i = 0; i < numLayers; i++) {
    const buffer = new AudioBuffer({
      length: NUM_SECS * S_R,
      sampleRate: S_R,
    });
    whiteNoise(buffer.getChannelData(0), 0.5);
    const noiseNode = new AudioBufferSourceNode(aC, {
      buffer: buffer,
      loop: true,
    });
    const filterLFO = new BiquadFilterNode(aC, {
      type: "bandpass",
      frequency: 8000,
      Q: 0.7,
    });
    const lfo0 = new slowRandom([filterLFO.frequency], [TRFM.toHz], {
      f: 0.5,
      minVal: -0.4, //clamps
      maxVal: 0.8,
      pad: 1,
    });
    const guideLFO = new GainNode(aC);
    const lfo1 = new slowRandom([guideLFO.gain], [TRFM.per1], {
      f: 0.5,
      minVal: 0,
      maxVal: 0.8,
      pad: 0.5,
    });
    const outLFO = new GainNode(aC);
    const lfoBlob1 = new slowRandom([outLFO.gain], [TRFM.per1], {
      f: 0.5,
      minVal: 0,
      maxVal: 0.8,
      pad: 0.5,
    });
    noiseNode.connect(filterLFO).connect(guideLFO).connect(outLFO);
    startList.push(noiseNode, lfo0, lfo1, lfoBlob1);
    layers[i] = outLFO;
  }
  const merger = mergeAll(layers);
  return merger;
}

function makeGibber(numLayers = 1) {
  const layers = [];
  for (let i = 0; i < numLayers; i++) {
    // formant osc
    const aahF = Math.random() * (250 - 150) + 150;
    const aahNode1 = oscillators.aah(aC);
    aahNode1.frequency.value = aahF;
    const aahNode2 = oscillators.ooh(aC);
    aahNode2.frequency.value = aahF * 0.5;
    const aahNode3 = oscillators.eeh(aC);
    aahNode3.frequency.value = aahF * 2;
    const aahMerge = mergeAll([aahNode1, aahNode2, aahNode3]);
    const aahGain = new GainNode(aC);
    aahMerge.connect(aahGain);
    // noise osc
    const buffer = new AudioBuffer({
      length: NUM_SECS * S_R,
      sampleRate: S_R,
    });
    whiteNoise(buffer.getChannelData(0), 0.5);
    const noiseNode = new AudioBufferSourceNode(aC, {
      buffer: buffer,
      loop: true,
    });
    const noiseGain = new GainNode(aC);
    noiseNode.connect(noiseGain);
    const voxMerge = mergeAll([aahGain, noiseGain]);

    const lfoBlob1 = new blobRandom(
      [aahGain.gain, noiseGain.gain],
      [TRFM.per1, TRFM.negPer1],
      {
        f: 8,
        minVal: 0.2,
        maxVal: 0.8,
        pad: 0.5,
      }
    );

    const lfoBlob2 = new blobRandom(
      [aahGain.gain, noiseGain.gain],
      [TRFM.per1, TRFM.per1],
      {
        f: 12,
        minVal: 0.0,
        maxVal: 0.8,
        pad: 0.5,
      }
    );

    const lfoDetune = new slowRandom([aahNode1.detune, aahNode2.detune, aahNode3.detune],[TRFM.per1,TRFM.per1,TRFM.per1], {
      f: 9,
      minVal: -100,
      maxVal: 200,
      pad: 0,
    })

    const lfo0filter = new BiquadFilterNode(aC, {
      type: "bandpass",
      frequency: 8000,
      Q: 2,
      // gain: 2,
    });
    const lfo0 = new slowRandom([lfo0filter.frequency], [TRFM.toHz], {
      f: 3,
      minVal: 0.001,
      maxVal: 0.7,
      pad: 0.5,
    });
    const lfo1gain = new GainNode(aC);
    const lfo1 = new blobRandom([lfo1gain.gain], [TRFM.per1], {
      f: 1,
      minVal: 0,
      maxVal: 0.6,
      pad: 0,
    });

    voxMerge
     .connect(lfo0filter)
     .connect(lfo1gain);
    startList.push(
      aahNode1,
      aahNode2,
      aahNode3,
      noiseNode,
      lfo0,
      lfo1,
      lfoBlob1,
      lfoBlob2,
      lfoDetune
    );
    layers[i] = lfo1gain;
  }
  const merger = mergeAll(layers);
  return merger;
}

const aah = makeGibber(8);
aah.connect(speaker);

// const whisper = makeWhisper(1);
// whisper.connect(speaker);

// const ocean = makeOcean(2);
// ocean.connect(speaker);

function startSound() {
  for (let i = 0; i < startList.length; i++) {
    startList[i].start();
  }
}
