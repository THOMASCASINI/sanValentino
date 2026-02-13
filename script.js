const GRID_COLUMNS = 4;
const GRID_ROWS = 3;
const TILE_COUNT = GRID_COLUMNS * GRID_ROWS;
const DEFAULT_IMAGE_URL = "assets/touse.jpeg";

const openEnvelopeButton = document.getElementById("openEnvelope");
const coverSection = document.getElementById("coverSection");
const letterSection = document.getElementById("letterSection");
const winSection = document.getElementById("winSection");
const puzzleBoard = document.getElementById("puzzleBoard");

let currentImageUrl = DEFAULT_IMAGE_URL;
let order = [];
let selectedPosition = null;
let solved = false;
let imageAspectRatio = 1;
let isAnimating = false;

function solvedOrder() {
  return Array.from({ length: TILE_COUNT }, (_, index) => index);
}

function fisherYatesShuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function isSolved(nextOrder) {
  return nextOrder.every((pieceIndex, positionIndex) => pieceIndex === positionIndex);
}

function createShuffledOrder() {
  const nextOrder = solvedOrder();
  do {
    fisherYatesShuffle(nextOrder);
  } while (isSolved(nextOrder));
  return nextOrder;
}

function backgroundPositionFor(pieceIndex) {
  const col = pieceIndex % GRID_COLUMNS;
  const row = Math.floor(pieceIndex / GRID_COLUMNS);
  const colStep = GRID_COLUMNS > 1 ? 100 / (GRID_COLUMNS - 1) : 0;
  const rowStep = GRID_ROWS > 1 ? 100 / (GRID_ROWS - 1) : 0;
  return `${col * colStep}% ${row * rowStep}%`;
}

function applyBoardGeometry() {
  const tileRatio = (imageAspectRatio * GRID_ROWS) / GRID_COLUMNS;
  puzzleBoard.style.setProperty("--grid-columns", String(GRID_COLUMNS));
  puzzleBoard.style.setProperty("--grid-rows", String(GRID_ROWS));
  puzzleBoard.style.setProperty("--tile-ratio", String(tileRatio > 0 ? tileRatio : 1));
  puzzleBoard.setAttribute("aria-label", `Puzzle ${GRID_COLUMNS}x${GRID_ROWS}`);
}

function loadImageAspectRatio(imageUrl) {
  return new Promise((resolve) => {
    const image = new Image();

    image.addEventListener("load", () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        resolve(image.naturalWidth / image.naturalHeight);
        return;
      }
      resolve(1);
    });

    image.addEventListener("error", () => resolve(1));
    image.src = imageUrl;
  });
}

async function initializeBoardVisuals() {
  imageAspectRatio = await loadImageAspectRatio(currentImageUrl);
  applyBoardGeometry();
  renderBoard();
}

function renderBoard() {
  puzzleBoard.innerHTML = "";

  order.forEach((pieceIndex, positionIndex) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    tile.dataset.position = String(positionIndex);
    tile.dataset.piece = String(pieceIndex);
    tile.style.backgroundImage = `url("${currentImageUrl}")`;
    tile.style.backgroundPosition = backgroundPositionFor(pieceIndex);

    if (selectedPosition === positionIndex && !solved) {
      tile.classList.add("selected");
    }

    if (solved) {
      tile.classList.add("done");
    }

    tile.addEventListener("click", () => {
      void handleTileSelection(positionIndex);
    });

    puzzleBoard.appendChild(tile);
  });
}

function evaluateBoard() {
  solved = isSolved(order);

  if (solved) {
    document.body.classList.add("is-finished");
    letterSection.setAttribute("aria-hidden", "true");
    winSection.setAttribute("aria-hidden", "false");
  }
}

function swapPieces(firstPosition, secondPosition) {
  [order[firstPosition], order[secondPosition]] = [order[secondPosition], order[firstPosition]];
  evaluateBoard();
  renderBoard();
}

function areAdjacentPositions(firstPosition, secondPosition) {
  const firstRow = Math.floor(firstPosition / GRID_COLUMNS);
  const firstCol = firstPosition % GRID_COLUMNS;
  const secondRow = Math.floor(secondPosition / GRID_COLUMNS);
  const secondCol = secondPosition % GRID_COLUMNS;
  const manhattanDistance = Math.abs(firstRow - secondRow) + Math.abs(firstCol - secondCol);
  return manhattanDistance === 1;
}

function tileByPosition(positionIndex) {
  return puzzleBoard.querySelector(`.tile[data-position="${positionIndex}"]`);
}

function markInvalidTile(positionIndex) {
  const tile = tileByPosition(positionIndex);
  if (!tile) {
    return;
  }

  tile.classList.remove("invalid");
  void tile.offsetWidth;
  tile.classList.add("invalid");

  window.setTimeout(() => {
    tile.classList.remove("invalid");
  }, 240);
}

async function animateTileSwap(firstPosition, secondPosition) {
  const firstTile = tileByPosition(firstPosition);
  const secondTile = tileByPosition(secondPosition);

  if (!firstTile || !secondTile || typeof firstTile.animate !== "function" || typeof secondTile.animate !== "function") {
    return;
  }

  const firstRect = firstTile.getBoundingClientRect();
  const secondRect = secondTile.getBoundingClientRect();
  const deltaX = secondRect.left - firstRect.left;
  const deltaY = secondRect.top - firstRect.top;
  const duration = 230;
  const easing = "cubic-bezier(0.22, 1, 0.36, 1)";

  const firstAnimation = firstTile.animate(
    [
      { transform: "translate(0px, 0px)", zIndex: "2" },
      { transform: `translate(${deltaX}px, ${deltaY}px)`, zIndex: "2" }
    ],
    { duration, easing, fill: "forwards" }
  );

  const secondAnimation = secondTile.animate(
    [
      { transform: "translate(0px, 0px)", zIndex: "2" },
      { transform: `translate(${-deltaX}px, ${-deltaY}px)`, zIndex: "2" }
    ],
    { duration, easing, fill: "forwards" }
  );

  await Promise.allSettled([firstAnimation.finished, secondAnimation.finished]);
}

async function animateAndSwap(firstPosition, secondPosition) {
  isAnimating = true;
  puzzleBoard.classList.add("is-animating");

  try {
    await animateTileSwap(firstPosition, secondPosition);
    swapPieces(firstPosition, secondPosition);
  } finally {
    isAnimating = false;
    puzzleBoard.classList.remove("is-animating");
  }
}

async function handleTileSelection(nextPosition) {
  if (solved || isAnimating) {
    return;
  }

  if (selectedPosition === null) {
    selectedPosition = nextPosition;
    renderBoard();
    return;
  }

  if (selectedPosition === nextPosition) {
    selectedPosition = null;
    renderBoard();
    return;
  }

  const firstPosition = selectedPosition;
  selectedPosition = null;

  if (!areAdjacentPositions(firstPosition, nextPosition)) {
    selectedPosition = nextPosition;
    renderBoard();
    markInvalidTile(firstPosition);
    markInvalidTile(nextPosition);
    return;
  }

  await animateAndSwap(firstPosition, nextPosition);
}

function startNewGame() {
  selectedPosition = null;
  isAnimating = false;
  puzzleBoard.classList.remove("is-animating");
  order = createShuffledOrder();
  solved = false;
  document.body.classList.remove("is-finished");
  letterSection.setAttribute("aria-hidden", "false");
  winSection.setAttribute("aria-hidden", "true");
  renderBoard();
}

function openLetter() {
  if (document.body.classList.contains("is-opening") || document.body.classList.contains("is-letter-open")) {
    return;
  }

  document.body.classList.add("is-opening");
  openEnvelopeButton.disabled = true;

  window.setTimeout(() => {
    document.body.classList.add("is-letter-open");
    coverSection.setAttribute("aria-hidden", "true");
    letterSection.setAttribute("aria-hidden", "false");
    startNewGame();
  }, 900);
}

function blockPageZoom() {
  let lastTouchEnd = 0;
  const preventDefault = (event) => event.preventDefault();

  document.addEventListener("gesturestart", preventDefault, { passive: false });
  document.addEventListener("gesturechange", preventDefault, { passive: false });
  document.addEventListener("gestureend", preventDefault, { passive: false });

  document.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    },
    { passive: false }
  );

  document.addEventListener(
    "touchend",
    (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );
}

openEnvelopeButton.addEventListener("click", openLetter);
blockPageZoom();

order = solvedOrder();
applyBoardGeometry();
renderBoard();
void initializeBoardVisuals();
