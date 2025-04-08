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

  const statusEl =
    document.getElementById("status-message") || createStatusEl();

  const { angles, valid } = generateAngles(
    sides,
    minAngle,
    maxAngle,
    commonDiff
  );
  if (!valid) {
    statusEl.textContent = `❌ Cannot generate valid angles with given inputs. Check if total angle sum equals ${
      (sides - 2) * 180
    }°.`;
    return;
  }

  const { lengths, success, loss } = optimizeSideLengths(angles);
  if (!success) {
    statusEl.textContent = `⚠️ Polygon could not be closed with given angles (closure error: ${loss.toFixed(
      2
    )}).`;
    return;
  } else {
    statusEl.textContent = "";
  }

  const rawPoints = simulateWalkPoints(angles, lengths);
  const centeredPoints = centerPolygon(rawPoints, canvas.width, canvas.height);

  ctx.moveTo(centeredPoints[0].x, centeredPoints[0].y);
  for (let i = 1; i < centeredPoints.length; i++) {
    ctx.lineTo(centeredPoints[i].x, centeredPoints[i].y);
  }

  ctx.closePath();
  ctx.stroke();
}

function createStatusEl() {
  const el = document.createElement("p");
  el.id = "status-message";
  el.style.color = "red";
  el.style.fontWeight = "bold";
  el.style.marginTop = "10px";
  document.getElementById("config").appendChild(el);
  return el;
}

// Function to generate angles within given constraints
function generateAngles(n, min, max, commonDiff = 0) {
  const totalSum = (n - 2) * 180;

  let angles = [];

  if (commonDiff === 0) {
    // Try to generate random angles between min and max
    let remaining = totalSum;
    for (let i = 0; i < n; i++) {
      const remainingSlots = n - i - 1;
      const minBound = Math.max(min, remaining - remainingSlots * max);
      const maxBound = Math.min(max, remaining - remainingSlots * min);
      if (minBound > maxBound) return { angles: [], valid: false };

      const angle =
        Math.floor(Math.random() * (maxBound - minBound + 1)) + minBound;
      angles.push(angle);
      remaining -= angle;
    }

    if (remaining !== 0) return { angles: [], valid: false };
    return { angles, valid: true };
  } else {
    // Arithmetic Progression
    // Let a = min, d = commonDiff
    // We want sum of AP: S = n/2 * [2a + (n-1)d] === totalSum

    const a = min;
    const d = commonDiff;
    const expectedSum = (n / 2) * (2 * a + (n - 1) * d);

    if (expectedSum !== totalSum) return { angles: [], valid: false };

    for (let i = 0; i < n; i++) {
      const angle = a + i * d;
      if (angle < min || angle > max) return { angles: [], valid: false };
      angles.push(angle);
    }

    return { angles, valid: true };
  }
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

function optimizeSideLengths(angles, iterations = 10000, learningRate = 0.1) {
  let lengths = Array.from({ length: angles.length }, () => 80);
  let loss = Infinity;

  for (let i = 0; i < iterations; i++) {
    const grad = computeGradient(angles, lengths);
    for (let j = 0; j < lengths.length; j++) {
      lengths[j] -= learningRate * grad[j];
    }

    const pos = simulateWalkEndpoint(angles, lengths);
    loss = Math.hypot(pos.x, pos.y);
    if (loss < 1) {
      return { lengths, success: true, loss };
    }
  }

  return { lengths, success: false, loss };
}
