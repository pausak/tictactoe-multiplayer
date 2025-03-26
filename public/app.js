// DOM Elements
const boardEl = document.getElementById("board");
const messageEl = document.getElementById("message");
const helpEl = document.getElementById("help");
const roomShareEl = document.getElementById("room-share");
const roomShareContainer = document.getElementById("room-share-container");
const toggleRoomShareLink = document.getElementById("toggle-room-share");
const roomLinkEl = document.getElementById("room-link");
const playAgainBtn = document.getElementById("play-again");
const acceptRematchBtn = document.getElementById("accept-rematch");

const btnLocal = document.getElementById("btn-local");
const btnAI = document.getElementById("btn-ai");
const btnRemote = document.getElementById("btn-remote");
const darkToggle = document.getElementById("dark-toggle");
const fullscreenToggle = document.getElementById("fullscreen-toggle");
const helpToggle = document.getElementById("help-toggle");

let board = Array(9).fill(null);
let currentPlayer = "X";
let mode = "ai";
let ws = null;
let playerSymbol = null;
let lastWinner = null;
let countdownInterval = null;
let currentRoomId = null;

function renderBoard() {
  boardEl.innerHTML = "";
  board.forEach((cell, i) => {
    const cellEl = document.createElement("div");
    cellEl.className = "cell";
    cellEl.textContent = cell || "";
    cellEl.onclick = () => handleClick(i);
    boardEl.appendChild(cellEl);
  });
}

function setMessage(text) {
  messageEl.textContent = text;
}

function triggerConfettiIfWinner(player) {
  if (
    typeof confetti === "function" &&
    (mode !== "remote" || playerSymbol === player)
  ) {
    confetti({
      spread: 90,
      particleCount: 100,
      origin: { y: 0.2 },
    });
  }
}

function handleClick(index) {
  if (board[index] || checkWinner()) return;

  if (mode === "remote") {
    if (!playerSymbol || playerSymbol !== currentPlayer) return;
    board[index] = playerSymbol;
    renderBoard();
    ws?.send(JSON.stringify({ type: "move", index, player: playerSymbol }));
    ws?.send(JSON.stringify({ type: "hide_room_info" }));
  } else {
    board[index] = currentPlayer;
    renderBoard();
  }

  const winner = checkWinner();
  if (winner) {
    lastWinner = winner;
    setMessage(`${winner} wins!`);
    triggerConfettiIfWinner(winner);
    showPlayAgain();
    return;
  }

  if (board.every((cell) => cell)) {
    lastWinner = null;
    setMessage("It's a draw!");
    showPlayAgain();
    return;
  }

  if (mode === "ai" && currentPlayer === "X") {
    currentPlayer = "O";
    setTimeout(makeAIMove, 200);
  } else {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
  }

  updateTurnMessage();
}

function makeAIMove() {
  const empty = board.map((v, i) => (v ? null : i)).filter((i) => i !== null);
  const move = empty[Math.floor(Math.random() * empty.length)];
  board[move] = "O";
  currentPlayer = "X";
  renderBoard();

  const winner = checkWinner();
  if (winner) {
    lastWinner = winner;
    setMessage(`${winner} wins!`);
    triggerConfettiIfWinner(winner);
    showPlayAgain();
    return;
  }
  updateTurnMessage();
}

function checkWinner() {
  const wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, b, c] of wins) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) return board[a];
  }
  return null;
}

function resetGame(newMode = "ai") {
  board = Array(9).fill(null);
  currentPlayer = "X";
  mode = newMode;

  if (newMode !== "remote") {
    playerSymbol = null;
  }

  renderBoard();
  helpEl.classList.add("hidden");
  roomShareEl.classList.add("hidden");
  playAgainBtn.classList.add("hidden");
  acceptRematchBtn.classList.add("hidden");

  if (mode === "remote") {
    roomShareContainer.classList.remove("hidden");
    toggleRoomShareLink.textContent = roomShareEl.classList.contains("hidden")
      ? "🔽 Show Room Info"
      : "🔼 Hide Room Info";
  } else {
    roomShareContainer.classList.add("hidden");
  }

  toggleRoomShareLink.textContent = "🔽 Show Room Info";
  setMessage("Game reset.");
  highlightActiveMode();

  if (mode === "ai" && currentPlayer === "O") makeAIMove();
}

function updateTurnMessage() {
  if (mode === "remote") {
    setMessage(
      `You are ${playerSymbol || "?"} — ${
        currentPlayer === playerSymbol ? "Your turn" : "Waiting for opponent..."
      }`
    );
  } else {
    setMessage(`Turn: ${currentPlayer}`);
  }
}

function showPlayAgain() {
  playAgainBtn.classList.remove("hidden");
}

function playAgain() {
  if (mode === "remote") {
    const winner = checkWinner();
    if (!winner && board.some((cell) => !cell)) {
      setMessage("Cannot reset multiplayer game mid-round.");
      return;
    }
    ws?.send(JSON.stringify({ type: "rematch_request" }));
    setMessage("Waiting for opponent to accept rematch...");
    playAgainBtn.classList.add("hidden");
    return;
  }

  if (mode === "ai") startAI();
  else if (mode === "local") startLocal();
}

function acceptRematch() {
  const starter = lastWinner || "X";
  ws?.send(JSON.stringify({ type: "rematch_accept", starter }));
  acceptRematchBtn.classList.add("hidden");
  startCountdownToReset(starter);
}

function startCountdownToReset(starter) {
  let count = 3;
  setMessage(`Starting new game in ${count}...`);
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    count--;
    if (count === 0) {
      clearInterval(countdownInterval);
      resetGame("remote");
      currentPlayer = starter;
      renderBoard();
      updateTurnMessage();
    } else {
      setMessage(`Starting new game in ${count}...`);
    }
  }, 1000);
}

function startAI() {
  if (mode === "remote" && !confirm("This will end your remote game. Continue?")) return;
  resetGame("ai");
  setMessage("Turn: X (You)");
}

function startLocal() {
  if (mode === "remote" && !confirm("This will end your remote game. Continue?")) return;
  resetGame("local");
  setMessage("Turn: X");
}

function startRemote() {
  if (mode === "remote" && !confirm("Start a new remote game and link?")) return;
  resetGame("remote");
  const roomId = Math.random().toString(36).substring(2, 12);
  currentRoomId = roomId;
  const roomUrl = `${location.origin}/?room=${roomId}`;
  roomShareContainer.classList.remove("hidden");
  roomShareEl.classList.remove("hidden");
  roomLinkEl.value = roomUrl;
  toggleRoomShareLink.textContent = "🔼 Hide Room Info";
  setMessage("Waiting for opponent to join...");
  window.history.replaceState({}, "", `?room=${roomId}`);
  joinRemoteRoom(roomId);
}

function copyRoomLink() {
  navigator.clipboard.writeText(roomLinkEl.value);
  setMessage("Room link copied to clipboard!");
}

function shareRoomLink() {
  const url = roomLinkEl.value;
  if (navigator.share) {
    navigator
      .share({
        title: "Play Tic-Tac-Toe with me!",
        text: "Join my game:",
        url,
      })
      .catch(() => {});
  } else {
    copyRoomLink();
  }
}

function toggleHelp() {
  helpEl.classList.toggle("hidden");
}

function highlightActiveMode() {
  [btnLocal, btnAI, btnRemote].forEach((btn) => btn.classList.remove("selected-mode"));
  if (mode === "local") btnLocal.classList.add("selected-mode");
  if (mode === "ai") btnAI.classList.add("selected-mode");
  if (mode === "remote") btnRemote.classList.add("selected-mode");
}

function joinRemoteRoom(roomId) {
  const wsUrl = `${location.origin.replace("http", "ws")}/?room=${roomId}`;
  ws = new WebSocket(wsUrl);
  mode = "remote";
  renderBoard();

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join" }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "assign") {
      playerSymbol = msg.symbol;
      updateTurnMessage();
      highlightActiveMode();
    }

    if (msg.type === "move") {
      board[msg.index] = msg.player;
      currentPlayer = msg.player === "X" ? "O" : "X";
      renderBoard();
      updateTurnMessage();

      const winner = checkWinner();
      if (winner) {
        lastWinner = winner;
        setMessage(`${winner} wins!`);
        triggerConfettiIfWinner(winner);
        showPlayAgain();
      } else if (board.every((cell) => cell)) {
        lastWinner = null;
        setMessage("It's a draw!");
        showPlayAgain();
      }

      roomShareEl.classList.add("hidden");
      toggleRoomShareLink.textContent = "🔽 Show Room Info";
    }

    if (msg.type === "rematch_request") {
      playAgainBtn.classList.add("hidden");
      acceptRematchBtn.classList.remove("hidden");
      setMessage("Opponent wants to play again — Accept?");
    }

    if (msg.type === "rematch_accept") {
      const starter = msg.starter || "X";
      startCountdownToReset(starter);
    }

    if (msg.type === "hide_room_info") {
      roomShareEl.classList.add("hidden");
      toggleRoomShareLink.textContent = "🔽 Show Room Info";
    }

    if (msg.type === "force_reset") {
      resetGame("remote");
      currentPlayer = msg.starter || "X";
      renderBoard();
      updateTurnMessage();
      setMessage(
        `You are ${playerSymbol} — ${
          currentPlayer === playerSymbol ? "Your turn" : "Waiting for opponent..."}`
      );
    }
  };
}

// Event Listeners
btnAI.onclick = startAI;
btnLocal.onclick = startLocal;
btnRemote.onclick = startRemote;
playAgainBtn.onclick = playAgain;
acceptRematchBtn.onclick = acceptRematch;
toggleRoomShareLink.onclick = (e) => {
  e.preventDefault();
  roomShareEl.classList.toggle("hidden");
  toggleRoomShareLink.textContent = roomShareEl.classList.contains("hidden")
    ? "🔽 Show Room Info"
    : "🔼 Hide Room Info";
};
darkToggle.onclick = () => {
  const dark = document.body.classList.toggle("dark-mode");
  localStorage.setItem("dark", dark);
  darkToggle.textContent = dark ? "🌞" : "🌙";
};
fullscreenToggle.onclick = () => {
  document.documentElement.requestFullscreen().catch(() => {});
};
helpToggle.onclick = toggleHelp;

window.addEventListener("beforeunload", (e) => {
  if (mode === "remote") {
    e.preventDefault();
    e.returnValue = "";
  }
});

window.addEventListener("DOMContentLoaded", () => {
  renderBoard();
  highlightActiveMode();

  if (localStorage.getItem("dark") === "true") {
    document.body.classList.add("dark-mode");
    darkToggle.textContent = "🌞";
  }

  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room");
  if (roomId) {
    currentRoomId = roomId;
    roomShareContainer.classList.remove("hidden");
    roomLinkEl.value = window.location.href;
    roomShareEl.classList.remove("hidden");
    toggleRoomShareLink.textContent = "🔼 Hide Room Info";
    joinRemoteRoom(roomId);
  } else {
    startAI();
  }
});