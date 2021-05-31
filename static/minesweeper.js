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

		this.elt.addEventListener("contextmenu", function(e) {
			e.preventDefault();
			this.toggleFlag();
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
			this.flagged = false;
			this.elt.classList.remove("flagged-square");
		} else {
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
	constructor(width, height, numMines, boardElement) {
		boardElement.innerHTML = "";
		this.width = width;
		this.height = height;
		this.isFirstMove = true;
		const area = width * height;

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
		}
	}
}

function shuffleArray(a) {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
}

function preloadImages() {
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
}

function main() {
	let boardElement = document.querySelector("#board");
	addEventListener("dragstart", e => e.preventDefault());
	preloadImages();
	let field = new Minefield(30, 16, 99, boardElement);
}
main();
