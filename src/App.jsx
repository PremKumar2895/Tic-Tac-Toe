import React, { useState, useRef, useEffect, useCallback } from 'react';
import GameLayout from './components/GameLayout';
import PinballArena from './components/PinballArena';
import TicTacToeBoard from './components/TicTacToeBoard';
import './App.css';

const WIN_COMBINATIONS = [
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
    const boardRef = useRef(board);
    const turnRef = useRef(turn);
    const winnerRef = useRef(winner);
    const isLaunchingRef = useRef(isLaunching);
    const shotResolvedRef = useRef(false);
    const launchTimeoutRef = useRef(null);

    const getWinner = useCallback((currentBoard) => {
        for (const combo of WIN_COMBINATIONS) {
            const [a, b, c] = combo;
            if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
                return currentBoard[a];
            }
        }

        if (!currentBoard.includes(null)) return 'DRAW';
        return null;
    }, []);

    useEffect(() => {
        boardRef.current = board;
    }, [board]);

    useEffect(() => {
        turnRef.current = turn;
    }, [turn]);

    useEffect(() => {
        winnerRef.current = winner;
    }, [winner]);

    useEffect(() => {
        isLaunchingRef.current = isLaunching;
    }, [isLaunching]);

    const clearLaunchTimeout = useCallback(() => {
        if (launchTimeoutRef.current) {
            clearTimeout(launchTimeoutRef.current);
            launchTimeoutRef.current = null;
        }
    }, []);

    const resolveShot = useCallback((bucketIndex = null) => {
        if (winnerRef.current || !isLaunchingRef.current || shotResolvedRef.current) return;

        shotResolvedRef.current = true;
        clearLaunchTimeout();

        const currentBoard = boardRef.current;
        const activeTurn = turnRef.current;
        const nextBoard = [...currentBoard];

        if (Number.isInteger(bucketIndex) && bucketIndex >= 0 && bucketIndex < 9 && nextBoard[bucketIndex] === null) {
            nextBoard[bucketIndex] = activeTurn;
        }

        const detectedWinner = getWinner(nextBoard);

        setBoard(nextBoard);

        if (detectedWinner) {
            setWinner(detectedWinner);
        } else {
            setTurn(activeTurn === 'X' ? 'O' : 'X');
        }

        setIsLaunching(false);
    }, [clearLaunchTimeout, getWinner]);

    const handleBasketHit = useCallback((index) => {
        resolveShot(index);
    }, [resolveShot]);

    const handleBallComplete = useCallback(() => {
        resolveShot(null);
    }, [resolveShot]);

    const resetGame = useCallback(() => {
        clearLaunchTimeout();
        shotResolvedRef.current = false;
        setBoard(Array(9).fill(null));
        setTurn('X');
        setWinner(null);
        setIsLaunching(false);
        arenaRef.current?.clearBall?.();
    }, [clearLaunchTimeout]);

    useEffect(() => {
        clearLaunchTimeout();
        if (!isLaunching) return;

        launchTimeoutRef.current = setTimeout(() => {
            resolveShot(null);
        }, 4500);

        return clearLaunchTimeout;
    }, [isLaunching, resolveShot, clearLaunchTimeout]);

    useEffect(() => () => {
        clearLaunchTimeout();
    }, [clearLaunchTimeout]);

    const handleLaunch = useCallback(() => {
        if (arenaRef.current && !isLaunching && !winner) {
            shotResolvedRef.current = false;
            setIsLaunching(true);
            const currentAngle = turn === 'X' ? angleX : angleO;
            const currentPower = turn === 'X' ? powerX : powerO;
            arenaRef.current.launch(currentAngle, currentPower);
        }
    }, [angleO, angleX, isLaunching, powerO, powerX, turn, winner]);

    return (
        <GameLayout turn={turn}>
            <header className="game-header">
                <h1 className="main-title">TIC-TAC-PINBALL</h1>
                <div className={`status-badge-container ${turn === 'O' ? 'status-o' : 'status-x'}`}>
                    <div className="status-pulse" />
                    <span className="status-text">
                        {winner ? (winner === 'DRAW' ? 'DRAW!' : `${winner} WINS!`) : `PLAYER ${turn}'S TURN`}
                    </span>
                    {winner && (
                        <button className="new-game-btn" onClick={resetGame}>RESTART</button>
                    )}
                </div>
            </header>

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

            <TicTacToeBoard board={board} />

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

            <PinballArena
                ref={arenaRef}
                activePlayer={winner ? null : turn}
                onBasketHit={handleBasketHit}
                onBallComplete={handleBallComplete}
                board={board}
                isLaunching={isLaunching}
                angle={turn === 'X' ? angleX : angleO}
            />
        </GameLayout>
    );
}

export default App;
