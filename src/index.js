import "./style.css";

import oscillators from "web-audio-oscillators";

const cl = console.log;
const aC = new AudioContext();
const speaker = aC.destination;

const NUM_TRACKS = 2;
const NUM_SECS = 1;
const S_R = 44100;

const big = document.getElementById("big");
big.addEventListener("click", () => startSound());

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
function slowRandom (params, scalers, options = {}) {
  const defaults = { f: 1, minVal: 0, maxVal: 1, val: 0, pad: 0 };
  for (let key in defaults) {
    if (options[key] === undefined) {
      options[key] = defaults[key];
    }
  }
  // do for all params
  params.forEach( param => param.setTargetAtTime(options.val, 0, 0) ); //initialize At
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
        params.forEach( (param, i) => param.exponentialRampToValueAtTime(scalers[i](curr)+0.01, currInt + time) );
        const next =
          Math.random() * (options.maxVal - options.minVal) + options.minVal;
        const nextInt = Math.random() * (this.i8 * 2 - this.i8 * options.pad) + this.i8 * options.pad;
        this.reset(curr, next, currInt, nextInt);
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

function makeOcean(numLayers=1) {
  const layers = [];
  for (let i = 0; i < numLayers; i++) {
    const buffer = new AudioBuffer({
      length: NUM_SECS * S_R,
      sampleRate: S_R,
    });
    whiteNoise(buffer.getChannelData(0), 0.5);
    const noiseNode = new AudioBufferSourceNode(aC, { buffer: buffer, loop: true });
    const filterLFO = new BiquadFilterNode(aC, {
      type: "bandpass",
      frequency: 60,
    });
    const lfo0 = new slowRandom([filterLFO.frequency],[n=>n], {
      f: 15,
      minVal: 60,
      maxVal: 4000,
      pad: 0.5
    })
    const guideLFO = new GainNode(aC);
    const lfo1 = new slowRandom([guideLFO.gain],[n=>n], {
      f: 20,
      minVal: 0.2,
      maxVal: 0.8,
      pad: 1,
    });
    const outLFO = new GainNode(aC);
    const lfo2 = new slowRandom([outLFO.gain],[n=>n], {
      f: 10,
      minVal: 0.4,
      maxVal: 0.6,
      pad: 1,
    });
    noiseNode.connect(filterLFO).connect(guideLFO).connect(outLFO);
    startList.push(noiseNode, lfo0, lfo1, lfo2);
    layers[i] = outLFO;
  }
  const merger = mergeAll(layers);
  return merger;
}

function makeWhisper(numLayers=1) {
  const layers = [];
  for (let i = 0; i < numLayers; i++) {
    const buffer = new AudioBuffer({
      length: NUM_SECS * S_R,
      sampleRate: S_R,
    });
    whiteNoise(buffer.getChannelData(0), 0.5);
    const noiseNode = new AudioBufferSourceNode(aC, { buffer: buffer, loop: true });
    const filterLFO = new BiquadFilterNode(aC, {
      type: "bandpass",
      frequency: 8000,
      Q: 0.7,
    });
    const lfo0 = new slowRandom([filterLFO.frequency],[n=>n], {
      f: 0.5,
      minVal: -4000,
      maxVal: 8000,
      pad: 1,
    })
    const guideLFO = new GainNode(aC);
    const lfo1 = new slowRandom([guideLFO.gain],[n=>n], {
      f: 0.5,
      minVal: 0,
      maxVal: 0.8,
      pad: 0.5,
    });
    const outLFO = new GainNode(aC);
    const lfo2 = new slowRandom([outLFO.gain],[n=>n], {
      f: 0.5,
      minVal: 0,
      maxVal: 0.8,
      pad: 0.5,
    });
    noiseNode.connect(filterLFO).connect(guideLFO).connect(outLFO);
    startList.push(noiseNode, lfo0, lfo1, lfo2);
    layers[i] = outLFO;
  }
  const merger = mergeAll(layers);
  return merger;
}

function makeGibber(numLayers=1) {
  const layers = [];
  for (let i = 0; i < numLayers; i++) {
    const buffer = new AudioBuffer({
      length: NUM_SECS * S_R,
      sampleRate: S_R,
    });
    whiteNoise(buffer.getChannelData(0), 0.5);
    const noiseNode = new AudioBufferSourceNode(aC, { buffer: buffer, loop: true });
    const aahNode = oscillators.aah(aC);
    aahNode.frequency.value = Math.random() * (300 - 100) + 100;
    const voxLFO = new GainNode(aC);
    const lfoTone = new slowRandom([aahNode.detune],[n=>n], {
      f: 3,
      minVal: -150,
      maxVal: 150,
      pad: 1.5,
    })
    const voiceComp = aC.createChannelMerger(1);
    noiseNode.connect(voiceComp, 0, 0);
    aahNode.connect(voxLFO).connect(voiceComp, 0, 0);
    const filterLFO = new BiquadFilterNode(aC, {
      type: "bandpass",
      frequency: 8000,
      Q: 1,
    });
    const lfo0 = new slowRandom([filterLFO.frequency, voxLFO.gain],[n=>n*100, n=>0.5+(n*-0.02)], {
      f: 0.5,
      minVal: 1,
      maxVal: 100,
      pad: 1,
    })
    const guideLFO = new GainNode(aC);
    const lfo1 = new slowRandom([guideLFO.gain],[n=>n], {
      f: 0.5,
      minVal: 0,
      maxVal: 0.5,
      pad: 0.5,
    });
    const outLFO = new GainNode(aC);
    const lfo2 = new slowRandom([outLFO.gain],[n=>n], {
      f: 0.5,
      minVal: 0,
      maxVal: 0.5,
      pad: 0.5,
    });
    voiceComp.connect(filterLFO).connect(guideLFO).connect(outLFO);
    startList.push(aahNode, noiseNode, lfoTone, lfo0, lfo1, lfo2);
    layers[i] = outLFO;
  }
  const merger = mergeAll(layers);
  return merger;
}

const aah = makeGibber(2);
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
