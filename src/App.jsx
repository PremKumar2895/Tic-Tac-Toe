import React, { useState, useRef, useEffect } from 'react';
import GameLayout from './components/GameLayout';
import PinballArena from './components/PinballArena';
import TicTacToeBoard from './components/TicTacToeBoard';
import './App.css';

const WIN_COMMINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

function PlayerControls({ player, activePlayer, angle, setAngle, power, setPower, onLaunch, winner, isLaunching }) {
    const isActive = player === activePlayer && !winner;
    const isPlayerO = player === 'O';
    const launchDisabled = !isActive || isLaunching;

    return (
        <div className={`art-panel ${isActive ? 'active-turn' : 'inactive-turn'}`}>
            <h2 className="player-title">Player {player}</h2>
            <span className="panel-sub">STRIKER CONTROLS</span>

            <div className="control-group">
                <div className="control-header">
                    <label>Angle</label>
                    <span className={`val-display ${isPlayerO ? 'navy' : 'coral'}`}>{angle}°</span>
                </div>
                <input
                    type="range"
                    min="10"
                    max="80"
                    value={angle}
                    className={`custom-slider ${isPlayerO ? 'navy-slider' : 'coral-slider'}`}
                    onChange={(e) => setAngle(Number(e.target.value))}
                    disabled={!isActive}
                />
            </div>

            <div className="control-group">
                <div className="control-header">
                    <label>Power</label>
                    <span className={`val-display ${isPlayerO ? 'navy' : 'coral'}`}>{power}%</span>
                </div>
                <input
                    type="range"
                    min="20"
                    max="100"
                    value={power}
                    className={`custom-slider ${isPlayerO ? 'navy-slider' : 'coral-slider'}`}
                    onChange={(e) => setPower(Number(e.target.value))}
                    disabled={!isActive}
                />
            </div>

            <button
                className={`launch-ball-btn ${isPlayerO ? 'bg-navy' : 'bg-coral'}`}
                onClick={onLaunch}
                disabled={launchDisabled}
            >
                {isActive ? (isLaunching ? 'BALL IN PLAY...' : 'LAUNCH BALL') : 'WAITING...'}
            </button>
        </div>
    );
}

function App() {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [turn, setTurn] = useState('X');
    const [winner, setWinner] = useState(null);
    const [isLaunching, setIsLaunching] = useState(false);

    const [angleX, setAngleX] = useState(45);
    const [powerX, setPowerX] = useState(65);
    const [angleO, setAngleO] = useState(45);
    const [powerO, setPowerO] = useState(65);

    const arenaRef = useRef(null);

    // Helper: Pure win detection
    const getWinner = (currentBoard) => {
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
        // Guard: Physics might fire multiple collisions, but App only resolves if launching
        if (winner || !isLaunching) return;

        // 1. Determine if the cell is occupied
        const isOccupied = board[index] !== null;

        // 2. Prepare next board state
        let nextBoard = board;
        if (!isOccupied) {
            nextBoard = [...board];
            nextBoard[index] = turn;
            setBoard(nextBoard);
        }

        // 3. Resolve Turn / Winner
        const detectedWinner = getWinner(nextBoard);
        if (detectedWinner) {
            setWinner(detectedWinner);
        } else {
            // Always switch turn if no winner, even if hit was on occupied cell
            setTurn(prev => (prev === 'X' ? 'O' : 'X'));
        }

        // 4. Unlock Launch
        setIsLaunching(false);
    };

    const resetGame = () => {
        setBoard(Array(9).fill(null));
        setTurn('X');
        setWinner(null);
        setIsLaunching(false);
        // Physics state will be cleared by PinballArena internally
    };

    // 5. Miss Timeout / Game Stuck Prevention
    useEffect(() => {
        let timeout;
        if (isLaunching) {
            timeout = setTimeout(() => {
                // Ball missed everything or flew out.
                // Reset launch state. 
                // Opt: Switch turn? Or let same player try again? 
                // "ball in play for long time" implies failure.
                // Let's reset to waiting state, but maybe keep turn?
                // For game flow, if you miss, you lose turn usually.
                setIsLaunching(false);
                setTurn(prev => (prev === 'X' ? 'O' : 'X'));
            }, 6000); // 6 seconds max flight time
        }
        return () => clearTimeout(timeout);
    }, [isLaunching]);

    const handleLaunch = () => {
        if (arenaRef.current && !isLaunching && !winner) {
            setIsLaunching(true);
            const currentAngle = turn === 'X' ? angleX : angleO;
            const currentPower = turn === 'X' ? powerX : powerO;
            arenaRef.current.launch(currentAngle, currentPower);
        }
    };

    return (
        <GameLayout turn={turn}>
            {/* 0: Header */}
            <header className="game-header">
                <h1 className="main-title">TIC-TAC-PINBALL</h1>
                <div className={`status-badge-container ${turn === 'O' ? 'status-o' : 'status-x'}`}>
                    <div className="status-pulse" />
                    <span className="status-text">
                        {winner ? (winner === 'DRAW' ? "DRAW!" : `${winner} WINS!`) : `PLAYER ${turn}'S TURN`}
                    </span>
                    {winner && (
                        <button className="new-game-btn" onClick={resetGame}>RESTART</button>
                    )}
                </div>
            </header>

            {/* 1: Left Controls */}
            <PlayerControls
                player="X"
                activePlayer={turn}
                angle={angleX}
                setAngle={setAngleX}
                power={powerX}
                setPower={setPowerX}
                onLaunch={handleLaunch}
                winner={winner}
                isLaunching={isLaunching}
            />

            {/* 2: Play Area */}
            <TicTacToeBoard board={board} />

            {/* 3: Right Controls */}
            <PlayerControls
                player="O"
                activePlayer={turn}
                angle={angleO}
                setAngle={setAngleO}
                power={powerO}
                setPower={setPowerO}
                onLaunch={handleLaunch}
                winner={winner}
                isLaunching={isLaunching}
            />

            {/* 4: Footer Arena */}
            <PinballArena
                ref={arenaRef}
                activePlayer={winner ? null : turn}
                onBasketHit={handleBasketHit}
                board={board}
                isLaunching={isLaunching}
                angle={turn === 'X' ? angleX : angleO}
            />
        </GameLayout>
    );
}

export default App;
