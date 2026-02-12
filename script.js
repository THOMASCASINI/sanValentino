const GRID_SIZE = 3;
const TILE_COUNT = GRID_SIZE * GRID_SIZE;
const DEFAULT_IMAGE_URL = "assets/foto-temporanea.svg";

const openEnvelopeButton = document.getElementById("openEnvelope");
const coverSection = document.getElementById("coverSection");
const letterSection = document.getElementById("letterSection");
const winSection = document.getElementById("winSection");
const puzzleBoard = document.getElementById("puzzleBoard");

let currentImageUrl = DEFAULT_IMAGE_URL;
let order = [];
let dragStartPosition = null;
let solved = false;

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
  const col = pieceIndex % GRID_SIZE;
  const row = Math.floor(pieceIndex / GRID_SIZE);
  const step = 100 / (GRID_SIZE - 1);
  return `${col * step}% ${row * step}%`;
}

function renderBoard() {
  puzzleBoard.innerHTML = "";

  order.forEach((pieceIndex, positionIndex) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    tile.draggable = !solved;
    tile.dataset.position = String(positionIndex);
    tile.dataset.piece = String(pieceIndex);
    tile.style.backgroundImage = `url("${currentImageUrl}")`;
    tile.style.backgroundPosition = backgroundPositionFor(pieceIndex);

    if (solved) {
      tile.classList.add("done");
    }

    tile.addEventListener("dragstart", (event) => handleDragStart(event, positionIndex));
    tile.addEventListener("dragover", (event) => event.preventDefault());
    tile.addEventListener("drop", (event) => handleDrop(event, positionIndex));
    tile.addEventListener("dragend", handleDragEnd);

    puzzleBoard.appendChild(tile);
  });
}

function evaluateBoard() {
  console.log("Ordine attuale:", order);

  const wrongPositions = order
    .map((pieceIndex, positionIndex) => {
      if (pieceIndex !== positionIndex) {
        return {
          posizione: positionIndex,
          pezzoAttuale: pieceIndex,
          pezzoCorretto: positionIndex
        };
      }
      return null;
    })
    .filter(Boolean);

  if (wrongPositions.length > 0) {
    console.log("❌ Posizioni sbagliate:", wrongPositions);
  } else {
    console.log("✅ Puzzle risolto correttamente");
  }

  solved = isSolved(order);
  console.log("isSolved:", solved);

  if (solved) {
    console.log("🎉 ENTRA NEL BLOCCO VITTORIA");
    document.body.classList.add("is-finished");
    letterSection.setAttribute("aria-hidden", "true");
    winSection.setAttribute("aria-hidden", "false");
    return;
  }
}

function swapPieces(firstPosition, secondPosition) {
  [order[firstPosition], order[secondPosition]] = [order[secondPosition], order[firstPosition]];
  evaluateBoard();
  renderBoard();
}

function handleDragStart(event, positionIndex) {
  if (solved) {
    return;
  }

  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(positionIndex));
  dragStartPosition = positionIndex;
}

function handleDrop(event, targetPosition) {
  event.preventDefault();

  if (solved || dragStartPosition === null) {
    dragStartPosition = null;
    return;
  }

  if (dragStartPosition === targetPosition) {
    dragStartPosition = null;
    return;
  }

  swapPieces(dragStartPosition, targetPosition);
  dragStartPosition = null;
}

function handleDragEnd() {
  dragStartPosition = null;
}

function startNewGame() {
  order = createShuffledOrder();
  dragStartPosition = null;
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
renderBoard();
