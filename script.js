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
let dragStartPosition = null;
let solved = false;
let imageAspectRatio = 1;
let activePointerId = null;
let activeDropPosition = null;

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
    tile.draggable = false;
    tile.dataset.position = String(positionIndex);
    tile.dataset.piece = String(pieceIndex);
    tile.style.backgroundImage = `url("${currentImageUrl}")`;
    tile.style.backgroundPosition = backgroundPositionFor(pieceIndex);

    if (solved) {
      tile.classList.add("done");
    }

    tile.addEventListener("pointerdown", (event) => handlePointerDown(event, positionIndex));

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

function setDropTargetPosition(positionIndex) {
  if (activeDropPosition !== null && activeDropPosition !== positionIndex) {
    const previousDropTile = tileByPosition(activeDropPosition);
    if (previousDropTile) {
      previousDropTile.classList.remove("drop-target");
    }
  }

  activeDropPosition = positionIndex;

  if (activeDropPosition !== null) {
    const nextDropTile = tileByPosition(activeDropPosition);
    if (nextDropTile) {
      nextDropTile.classList.add("drop-target");
    }
  }
}

function clearActiveDragState() {
  if (dragStartPosition !== null) {
    const draggedTile = tileByPosition(dragStartPosition);
    if (draggedTile) {
      draggedTile.classList.remove("dragging");
    }
  }

  setDropTargetPosition(null);
  dragStartPosition = null;
  activePointerId = null;

  document.removeEventListener("pointermove", handlePointerMove);
  document.removeEventListener("pointerup", handlePointerUp);
  document.removeEventListener("pointercancel", handlePointerCancel);
}

function updateDropTargetFromPoint(clientX, clientY) {
  if (dragStartPosition === null) {
    setDropTargetPosition(null);
    return;
  }

  const elementAtPoint = document.elementFromPoint(clientX, clientY);
  const hoveredTile = elementAtPoint ? elementAtPoint.closest(".tile") : null;

  if (!hoveredTile || !puzzleBoard.contains(hoveredTile)) {
    setDropTargetPosition(null);
    return;
  }

  const targetPosition = Number(hoveredTile.dataset.position);

  if (
    !Number.isInteger(targetPosition) ||
    targetPosition === dragStartPosition ||
    !areAdjacentPositions(dragStartPosition, targetPosition)
  ) {
    setDropTargetPosition(null);
    return;
  }

  setDropTargetPosition(targetPosition);
}

function handlePointerDown(event, positionIndex) {
  if (solved) {
    return;
  }

  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  dragStartPosition = positionIndex;
  activePointerId = event.pointerId;
  setDropTargetPosition(null);

  const draggedTile = tileByPosition(positionIndex);
  if (draggedTile) {
    draggedTile.classList.add("dragging");
    draggedTile.setPointerCapture(event.pointerId);
  }

  document.addEventListener("pointermove", handlePointerMove);
  document.addEventListener("pointerup", handlePointerUp);
  document.addEventListener("pointercancel", handlePointerCancel);
  event.preventDefault();
}

function handlePointerMove(event) {
  if (dragStartPosition === null || event.pointerId !== activePointerId) {
    return;
  }

  updateDropTargetFromPoint(event.clientX, event.clientY);
  event.preventDefault();
}

function handlePointerUp(event) {
  if (event.pointerId !== activePointerId) {
    return;
  }

  const sourcePosition = dragStartPosition;
  const targetPosition = activeDropPosition;

  clearActiveDragState();

  if (sourcePosition !== null && targetPosition !== null) {
    swapPieces(sourcePosition, targetPosition);
  }

  event.preventDefault();
}

function handlePointerCancel(event) {
  if (event.pointerId !== activePointerId) {
    return;
  }

  clearActiveDragState();
}

function startNewGame() {
  clearActiveDragState();
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

openEnvelopeButton.addEventListener("click", openLetter);

order = solvedOrder();
applyBoardGeometry();
renderBoard();
void initializeBoardVisuals();
