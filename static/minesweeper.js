let boardElement = document.querySelector("#board");
let mineCountElement = document.querySelector("#remaining-mines");
let boardWidthInput = document.querySelector("#board-width");
let boardHeightInput = document.querySelector("#board-height");
let numMinesInput = document.querySelector("#num-mines");
let gameOver = false;

class Square {
	constructor(x, y, isMine) {
		this.x = x;
		this.y = y;
		this.isMine = isMine;
		this.flagged = false;
		this.revealed = false;
		this.onRevealCallback = null;
		this.elt = document.createElement("div");
		this.elt.squareObject = this;
		this.elt.classList.add("square");
		this.elt.classList.add("hidden-square");
		this.registerEltListeners();
	}

	registerEltListeners() {
		this.elt.addEventListener("click", function(e) {
			if (gameOver) {
				return;
			}

			if (e.ctrlKey) {
				this.toggleFlag();
			} else if (e.button == 0) {
				this.onRevealCallback();
			}
		}.bind(this));

		let onContextMenu = function(e) {
			e.preventDefault();
			this.toggleFlag();
		}.bind(this);

		this.elt.addEventListener("contextmenu", onContextMenu);

		this.elt.addEventListener("touchstart", function(e) {
			this.elt.removeEventListener("contextmenu", onContextMenu);

			let id;

			["touchend", "touchmove"].forEach(function(i) {
				addEventListener(i, function() {
					clearTimeout(id);
					this.elt.addEventListener("contextmenu", onContextMenu);
				}.bind(this), { once: true });
			}.bind(this));

			id = setTimeout(function() {
				if (!gameOver) {
					this.toggleFlag();
				}
			}.bind(this), 500);
		}.bind(this));

		this.elt.addEventListener("mousedown", function(e) {
			if (e.button != 0 || gameOver || this.flagged || this.revealed || e.ctrlKey) {
				return;
			}

			let lastTargetSquare = this;
			this.displayRevealedStyle();
			let mouseMoveHandler = function(e) {
				if (e.target == lastTargetSquare.elt) {
					return;
				}

				if (!lastTargetSquare.revealed) {
					lastTargetSquare.displayHiddenStyle();
				}

				if (typeof e.target.squareObject != "undefined") {
					lastTargetSquare = e.target.squareObject;
					if (!lastTargetSquare.revealed) {
						lastTargetSquare.displayRevealedStyle();
					}
				}
			};
			addEventListener("mousemove", mouseMoveHandler);
			addEventListener("mouseup", function(e) {
				removeEventListener("mousemove", mouseMoveHandler);
				if (typeof e.target.squareObject != "undefined") {
					e.target.click();
				}
			}, { once: true });
		}.bind(this));
	}

	toggleFlag() {
		if (this.revealed) {
			return;
		}

		if (this.flagged) {
			incMineCountDisplay(1);
			this.flagged = false;
			this.elt.classList.remove("flagged-square");
		} else {
			incMineCountDisplay(-1);
			this.flagged = true;
			this.elt.classList.add("flagged-square");
		}
	}

	displayNeighborCount(numMines) {
		this.elt.style.backgroundImage = `url("/${numMines}.svg")`;
	}

	displayRevealedStyle() {
		this.elt.classList.remove("hidden-square");
		this.elt.classList.add("revealed-square");
	}

	displayHiddenStyle() {
		this.elt.classList.remove("revealed-square");
		this.elt.classList.add("hidden-square");
	}
}

class Minefield {
	constructor(width, height, numMines) {
		gameOver = false;
		boardElement.innerHTML = "";
		boardWidthInput.value = width;
		boardHeightInput.value = height;
		numMinesInput.value = numMines;
		mineCountElement.innerText = numMines;
		mineCountElement.classList.remove("count-win");
		this.width = width;
		this.height = height;
		this.isFirstMove = true;
		const area = width * height;
		this.remainingNonMines = area - numMines;

		let allSquares = [];
		for (let i = 0; i < numMines; i++) {
			allSquares.push(new Square(0, 0, true));
		}
		for (let i = 0; i < area - numMines; i++) {
			allSquares.push(new Square(0, 0, false));
		}
		shuffleArray(allSquares);

		this.squares = [];
		for (let y = 0; y < height; y++) {
			let row = [];
			for (let x = 0; x < width; x++) {
				let square = allSquares.pop();
				square.x = x;
				square.y = y;
				row.push(square);
				boardElement.appendChild(square.elt);

				square.onRevealCallback = function() {
					this.revealSquare(square.x, square.y);
				}.bind(this);
			}
			boardElement.appendChild(document.createElement("br"));
			this.squares.push(row);
		}
	}

	getSquare(x, y) {
		return this.squares[y][x];
	}

	getSquareNeighbors(x, y) {
		return [
			[-1, -1], [0, -1], [1, -1],
			[-1, 0],           [1, 0],
			[-1, 1],  [0, 1],  [1, 1],
		]
		.map(function(i) {
			return [i[0] + x, i[1] + y];
		})
		.filter(function(i) {
			const x = i[0];
			const y = i[1];

			return x >= 0
			    && y >= 0
			    && x < this.width
			    && y < this.height;
		}.bind(this))
		.map(function(i) {
			const x = i[0];
			const y = i[1];
			return this.getSquare(x, y);
		}.bind(this));
	}

	// moves all mines from in and around the given coordinates
	protectSquare(x, y) {
		let minesToMove = [];
		let invalidMoveTargets = [];
		invalidMoveTargets.push([x, y]);
		let square = this.getSquare(x, y);

		if (square.isMine) {
			minesToMove.push(square);
		}

		for (let neighbor of this.getSquareNeighbors(x, y)) {
			if (neighbor.isMine) {
				minesToMove.push(neighbor);
			}
			invalidMoveTargets.push([neighbor.x, neighbor.y]);
		}

		let moveTargets = this.squares
			.flat()
			.filter(function(s) {
				if (s.isMine) {
					return false;
				}
				for (const [tX, tY] of invalidMoveTargets) {
					if (s.x == tX && s.y == tY) {
						return false;
					}
				}
				return true;
			});
		shuffleArray(moveTargets);

		for (let mine of minesToMove) {
			if (moveTargets.length > 0) {
				let moveTo = moveTargets.pop();
				moveTo.isMine = true;
				mine.isMine = false;
			} else {
				// minefield is too dense to fully protect square
				break;
			}
		}
	}

	revealSquare(x, y) {
		if (this.isFirstMove) {
			this.protectSquare(x, y);
			this.isFirstMove = false;
		}

		let square = this.getSquare(x, y);

		if (square.revealed || square.flagged) {
			return;
		}

		square.revealed = true;
		square.displayRevealedStyle();

		if (square.isMine) {
			square.elt.classList.add("boom-mine");
			for (let square of this.squares.flat()) {
				if (square.isMine) {
					square.elt.style.backgroundImage = `url("/mine.svg")`;
				}
			}
			gameOver = true;
		} else {
			const neighbors = this.getSquareNeighbors(x, y);
			let surroundingMines = neighbors.filter(i => i.isMine);
			if (surroundingMines.length == 0) {
				for (let neighbor of neighbors) {
					this.revealSquare(neighbor.x, neighbor.y);
				}
			} else {
				square.displayNeighborCount(surroundingMines.length);
			}
			this.remainingNonMines -= 1;
			if (this.remainingNonMines == 0) {
				winFeedback();
				gameOver = true;
			}
		}
	}
}

function shuffleArray(a) {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
}

let winAudio = new Audio("/win.ogg");
function winFeedback() {
	winAudio.pause();
	winAudio.currentTime = 0;
	winAudio.play();
	setMineCountDisplay(0);
	mineCountElement.classList.add("count-win");
}

function incMineCountDisplay(inc) {
	let num = Number(mineCountElement.innerText);
	let newNum = num + inc;
	if (newNum < 0) {
		newNum = 0;
	}
	setMineCountDisplay(newNum);
}

function setMineCountDisplay(num) {
	let width = mineCountElement.innerText.length;
	mineCountElement.innerText = String(num).padStart(width, "0");
}

function preloadMedia() {
	const images = [
		"1.svg",
		"2.svg",
		"3.svg",
		"4.svg",
		"5.svg",
		"6.svg",
		"7.svg",
		"8.svg",
		"flag.svg",
		"mine.svg",
	];
	for (const i of images) {
		document.createElement("img").src = i;
	}
	new Audio("/win.ogg");
}

function idealMineCount(area) {
	if (area == 30 * 16) {
		return 99;
	} else if (area == 9 * 9) {
		return 10;
	} else if (area == 16 * 16) {
		return 40;
	} else {
		return Math.round(area / 4);
	}
}

function main() {
	addEventListener("dragstart", e => e.preventDefault());
	preloadMedia();

	document.querySelectorAll(".num-input").forEach(function(i) {
		i.addEventListener("input", function() {
			i.value = i.value.replace(/[^0-9]/g, "");
		});

		i.addEventListener("focus", function() {
			i.classList.remove("bad-input");
		});

		i.numValue = function() {
			return Number(i.value);
		};
	});

	document.querySelector("#auto-mines").addEventListener("click", function() {
		let width = boardWidthInput.numValue();
		let height = boardHeightInput.numValue();
		numMinesInput.value = idealMineCount(width * height);
		numMinesInput.classList.remove("bad-input");
	});

	let field = new Minefield(30, 16, 99);

	document.querySelector("#new-game").addEventListener("click", function() {
		let width = boardWidthInput.numValue();
		let height = boardHeightInput.numValue();
		let numMines = numMinesInput.numValue();
		const area = width * height;

		if (width == 0) {
			boardWidthInput.classList.add("bad-input");
		} else if (height == 0) {
			boardHeightInput.classList.add("bad-input");
		} else if (numMines > area) {
			numMinesInput.classList.add("bad-input");
		} else {
			field = new Minefield(width, height, numMines);
		}
	});
}
main();
