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
  let x = 250,
    y = 450;
  let direction = 0;

  ctx.moveTo(x, y);
  for (let i = 0; i < sides; i++) {
    x += sideLengths[i] * Math.cos(direction);
    y += sideLengths[i] * Math.sin(direction);
    ctx.lineTo(x, y);
    direction += Math.PI - (angles[i] * Math.PI) / 180;
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

function simulateWalk(angles, lengths) {
  let x = 250,
    y = 250;
  let direction = 0;
  for (let i = 0; i < angles.length; i++) {
    x += lengths[i] * Math.cos(direction);
    y += lengths[i] * Math.sin(direction);
    direction += Math.PI - (angles[i] * Math.PI) / 180;
  }
  return { x, y };
}

function computeGradient(angles, lengths, epsilon = 0.01) {
  const gradients = [];

  const original = simulateWalk(angles, lengths);
  const x0 = 250,
    y0 = 250;
  const originalLoss = Math.hypot(original.x - x0, original.y - y0);

  for (let i = 0; i < lengths.length; i++) {
    const temp = [...lengths];
    temp[i] += epsilon;
    const newPos = simulateWalk(angles, temp);
    const newLoss = Math.hypot(newPos.x - x0, newPos.y - y0);

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

    const pos = simulateWalk(angles, lengths);
    const loss = Math.hypot(pos.x - 250, pos.y - 250);
    if (loss < 1) {
      break; // early stop
    }
  }

  return lengths;
}
