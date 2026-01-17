import React, { useState } from 'react';
import GameLayout from './components/GameLayout';
import PinballArena from './components/PinballArena';
import TicTacToeBoard from './components/TicTacToeBoard';
import './App.css';

const WIN_COMMINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

function App() {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [turn, setTurn] = useState('X');
    const [winner, setWinner] = useState(null);

    const checkWinner = (currentBoard) => {
        for (let combo of WIN_COMMINATIONS) {
            const [a, b, c] = combo;
            if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
                return currentBoard[a];
            }
        }
        if (!currentBoard.includes(null)) return 'DRAW';
        return null;
    };

    const handleBasketHit = (index) => {
        if (winner) return;

        // Safety check for index
        if (index < 0 || index > 8) return;

        setBoard(prev => {
            // If occupied, turn is foreited (or logic can validly just switch turn)
            const occupied = prev[index] !== null;
            if (occupied) {
                // Optional: Shake effect or sound?
                setTurn(t => t === 'X' ? 'O' : 'X');
                return prev;
            }

            const newBoard = [...prev];
            newBoard[index] = turn;

            const result = checkWinner(newBoard);
            if (result) {
                setWinner(result);
            } else {
                setTurn(t => t === 'X' ? 'O' : 'X');
            }
            return newBoard;
        });
    };

    const resetGame = () => {
        setBoard(Array(9).fill(null));
        setTurn('X');
        setWinner(null);
    };

    return (
        <GameLayout>
            {/* Layer 1: Physics Arena */}
            <PinballArena
                activePlayer={winner ? null : turn}
                onBasketHit={handleBasketHit}
            />

            {/* Layer 2: Tic-Tac-Toe Board */}
            <div style={{ opacity: 0.9 }}>
                <TicTacToeBoard board={board} />
            </div>

            {/* Layer 3: HUD / Controls */}
            <header className="game-hud">
                <h1 className="neon-text">TIC-TAC-PINBALL</h1>

                <div className="status-bar">
                    {winner ? (
                        <div className="winner-display">
                            <span className="blink">{winner === 'DRAW' ? 'DRAW!' : `${winner} WINS!`}</span>
                            <button className="restart-btn" onClick={resetGame}>RESTART</button>
                        </div>
                    ) : (
                        <div className={`turn-badge ${turn === 'X' ? 'badge-x' : 'badge-o'}`}>
                            PLAYER {turn}'S TURN
                        </div>
                    )}
                </div>
            </header>
        </GameLayout>
    );
}

export default App;
