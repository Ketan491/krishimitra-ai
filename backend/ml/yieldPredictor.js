const TRAINING_DATA = [
  [650, 40, 1.0, 14.2],
  [720, 55, 1.5, 17.8],
  [500, 30, 0.8, 10.5],
  [800, 60, 2.0, 20.1],
  [430, 25, 0.5, 8.4],
  [900, 70, 2.5, 23.6],
  [610, 45, 1.2, 15.0],
  [340, 20, 0.6, 6.8],
  [770, 58, 1.8, 19.4],
  [560, 38, 1.0, 13.1],
  [950, 75, 3.0, 25.9],
  [480, 28, 0.9, 9.7],
  [690, 50, 1.4, 16.9],
  [820, 62, 2.2, 21.3],
  [390, 22, 0.7, 7.5],
  [710, 48, 1.6, 17.2],
  [530, 35, 1.1, 12.4],
  [880, 68, 2.6, 22.8],
  [460, 27, 0.8, 9.1],
  [740, 52, 1.7, 18.0],
  [600, 42, 1.3, 14.6],
  [860, 65, 2.4, 22.0],
  [410, 24, 0.6, 7.9],
  [670, 46, 1.4, 16.3],
  [520, 33, 1.0, 12.0],
  [790, 59, 1.9, 19.8],
  [450, 26, 0.7, 8.8],
  [630, 44, 1.2, 15.4],
  [910, 72, 2.8, 24.5],
  [370, 21, 0.5, 7.1],
];

function normalize(matrix) {
  const cols = matrix[0].length;
  const mins = Array(cols).fill(Infinity);
  const maxs = Array(cols).fill(-Infinity);
  matrix.forEach((row) =>
    row.forEach((v, i) => {
      if (v < mins[i]) mins[i] = v;
      if (v > maxs[i]) maxs[i] = v;
    }),
  );
  const normalized = matrix.map((row) =>
    row.map((v, i) => (maxs[i] === mins[i] ? 0 : (v - mins[i]) / (maxs[i] - mins[i]))),
  );
  return { normalized, mins, maxs };
}

function trainLinearRegression(data, { epochs = 5000, learningRate = 0.1 } = {}) {
  const X = data.map((row) => row.slice(0, 3));
  const y = data.map((row) => row[3]);

  const { normalized: Xn, mins: xMins, maxs: xMaxs } = normalize(X);
  const yMin = Math.min(...y);
  const yMax = Math.max(...y);
  const yn = y.map((v) => (yMax === yMin ? 0 : (v - yMin) / (yMax - yMin)));

  let weights = [0, 0, 0];
  let bias = 0;
  const n = Xn.length;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const predictions = Xn.map((row) => row.reduce((sum, x, i) => sum + x * weights[i], bias));
    const errors = predictions.map((p, i) => p - yn[i]);

    const gradW = [0, 0, 0];
    let gradB = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 3; j++) gradW[j] += (errors[i] * Xn[i][j]) / n;
      gradB += errors[i] / n;
    }
    weights = weights.map((w, j) => w - learningRate * gradW[j]);
    bias -= learningRate * gradB;
  }

  const predictions = Xn.map((row) => row.reduce((sum, x, i) => sum + x * weights[i], bias));
  const yMean = yn.reduce((a, b) => a + b, 0) / n;
  const ssRes = predictions.reduce((s, p, i) => s + (yn[i] - p) ** 2, 0);
  const ssTot = yn.reduce((s, v) => s + (v - yMean) ** 2, 0);
  const rSquared = 1 - ssRes / ssTot;

  return { weights, bias, xMins, xMaxs, yMin, yMax, rSquared, trainingSize: n };
}

const model = trainLinearRegression(TRAINING_DATA);

function predictYield({ rainfall, fertilizer, landSize }) {
  const raw = [Number(rainfall), Number(fertilizer), Number(landSize)];
  const xn = raw.map((v, i) => {
    const { xMins, xMaxs } = model;
    return xMaxs[i] === xMins[i] ? 0 : (v - xMins[i]) / (xMaxs[i] - xMins[i]);
  });
  const predictedNorm = xn.reduce((sum, x, i) => sum + x * model.weights[i], model.bias);
  const predicted = predictedNorm * (model.yMax - model.yMin) + model.yMin;
  return Math.max(0, Math.round(predicted * 10) / 10);
}

const featureRanges = {};
['rainfall_mm', 'fertilizer_kg_per_acre', 'land_size_acres'].forEach((name, i) => {
  featureRanges[name] = [model.xMins[i], model.xMaxs[i]];
});

module.exports = {
  predictYield,
  modelInfo: {
    type: 'Multiple Linear Regression (trained from scratch via gradient descent)',
    features: ['rainfall_mm', 'fertilizer_kg_per_acre', 'land_size_acres'],
    featureRanges,
    target: 'yield_quintal_per_acre',
    unit: 'quintal per acre',
    trainingSize: model.trainingSize,
    rSquared: Math.round(model.rSquared * 1000) / 1000,
    note: 'Trained on a small synthetic dataset modeled on typical Maharashtra Kharif yield patterns — not real government field data. Swap TRAINING_DATA with a real agricultural dataset (e.g. from data.gov.in) for production use.',
  },
};
