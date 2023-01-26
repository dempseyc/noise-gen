import "./style.css";
//Float32Array(SIZE)
const cl = console.log;
const aA = new AudioContext();
const speaker = aA.destination;

const big = document.getElementById("big");
big.addEventListener("click", () => cl("click"));

function whiteNoise (arr) {
  for (let i = 0, l = arr.length; i < l; i++) {
    arr[i] = Math.random() * 2 - 1;
  }
  return arr;
}

const bandHZ = 30;

const bandpass = new BiquadFilterNode(aA, {
  type: "bandpass",
  frequency: bandHZ,
});