function drawPolygon(event) {
  if (event) event.preventDefault();

  const inputs = document.querySelectorAll("input[type='number']");
  const sides = parseInt(inputs[0].value) || 3;
  const minAngle = parseInt(inputs[1].value) || 30;
  const maxAngle = parseInt(inputs[2].value) || 150;
  const commonDiff = parseInt(inputs[3].value) || 0;

  const canvas = document.getElementById("draw-area");
  const ctx = canvas.getContext("2d");
  canvas.width = 500;
  canvas.height = 500;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();

  const angles = generateAngles(sides, minAngle, maxAngle, commonDiff);
  const sideLengths = optimizeSideLengths(angles);
  const rawPoints = simulateWalkPoints(angles, sideLengths);
  const centeredPoints = centerPolygon(rawPoints, canvas.width, canvas.height);

  ctx.moveTo(centeredPoints[0].x, centeredPoints[0].y);
  for (let i = 1; i < centeredPoints.length; i++) {
    ctx.lineTo(centeredPoints[i].x, centeredPoints[i].y);
  }

  ctx.closePath();
  ctx.stroke();
}

// Function to generate angles within given constraints
function generateAngles(n, minAngle, maxAngle, commonDiff = 0) {
  let angles = [];
  let total = (n - 2) * 180;

  for (let i = 0; i < n; i++) {
    let angle = Math.min(
      maxAngle,
      Math.max(minAngle, minAngle + i * commonDiff)
    );
    angles.push(angle);
  }

  let currentSum = angles.reduce((a, b) => a + b, 0);
  let scale = total / currentSum;
  return angles.map((a) => a * scale);
}

function simulateWalkEndpoint(angles, lengths) {
  let x = 0,
    y = 0;
  let direction = 0;

  for (let i = 0; i < angles.length; i++) {
    x += lengths[i] * Math.cos(direction);
    y += lengths[i] * Math.sin(direction);
    direction += Math.PI - (angles[i] * Math.PI) / 180;
  }

  return { x, y };
}

function simulateWalkPoints(angles, lengths) {
  let x = 0,
    y = 0;
  let direction = 0;
  const points = [{ x, y }];

  for (let i = 0; i < angles.length; i++) {
    x += lengths[i] * Math.cos(direction);
    y += lengths[i] * Math.sin(direction);
    points.push({ x, y });
    direction += Math.PI - (angles[i] * Math.PI) / 180;
  }

  return points;
}

function centerPolygon(points, canvasWidth, canvasHeight) {
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (const pt of points) {
    minX = Math.min(minX, pt.x);
    maxX = Math.max(maxX, pt.x);
    minY = Math.min(minY, pt.y);
    maxY = Math.max(maxY, pt.y);
  }

  const polyCenterX = (minX + maxX) / 2;
  const polyCenterY = (minY + maxY) / 2;

  const canvasCenterX = canvasWidth / 2;
  const canvasCenterY = canvasHeight / 2;

  const dx = canvasCenterX - polyCenterX;
  const dy = canvasCenterY - polyCenterY;

  return points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy }));
}

function computeGradient(angles, lengths, epsilon = 0.01) {
  const gradients = [];

  const original = simulateWalkEndpoint(angles, lengths);
  const originalLoss = Math.hypot(original.x, original.y);

  for (let i = 0; i < lengths.length; i++) {
    const temp = [...lengths];
    temp[i] += epsilon;
    const newPos = simulateWalkEndpoint(angles, temp);
    const newLoss = Math.hypot(newPos.x, newPos.y);

    const grad = (newLoss - originalLoss) / epsilon;
    gradients.push(grad);
  }

  return gradients;
}

function optimizeSideLengths(angles, iterations = 1000, learningRate = 1) {
  let lengths = Array.from({ length: angles.length }, () => 80);

  for (let i = 0; i < iterations; i++) {
    const grad = computeGradient(angles, lengths);
    for (let j = 0; j < lengths.length; j++) {
      lengths[j] -= learningRate * grad[j];
    }

    const pos = simulateWalkEndpoint(angles, lengths);
    const loss = Math.hypot(pos.x, pos.y);
    if (loss < 1) {
      break;
    }
  }

  return lengths;
}
