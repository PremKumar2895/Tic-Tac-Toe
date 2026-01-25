import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { usePinballPhysics } from '../hooks/usePinballPhysics';

const PinballArena = forwardRef(({ activePlayer, onBasketHit, board, isLaunching, angle }, ref) => {
    const sceneRef = useRef(null);

    // Initialise Physics Hook
    const { launch } = usePinballPhysics({
        containerRef: sceneRef,
        width: 1024,
        height: 140, // Height of the footer area
        onBasketHit,
        isLeftPlayer: activePlayer === 'X'
    });

    useImperativeHandle(ref, () => ({
        launch: (angle, power) => {
            launch(angle, power);
        }
    }));

    // Determine if we should show the idle ball
    // Show if: We have an active player AND we are NOT currently launching/playing
    const showIdleBall = activePlayer && !isLaunching;
    const isLeft = activePlayer === 'X';

    // Dynamic Rotation Styles
    // Left Rack: Base is horizontal-ish? No, CSS has default.
    // We want 0 deg -> Horizontal (Flat). 
    // 90 deg -> Vertical (Up).
    // CSS for Left Rack: transform-origin: right bottom.
    // If Angle=10 (Flat), we want slight tilt.
    // If Angle=80 (Steep), we want high tilt.
    // Let's Map: -Angle deg.
    const leftRackStyle = {
        transform: `rotate(-${angle || 30}deg)`,
        transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    };

    const rightRackStyle = {
        transform: `rotate(${angle || 30}deg)`,
        transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    };

    return (
        <div className="alignment-footer">

            {/* Visual Racks - Moved here for alignment */}
            <div className="diagonal-racks-layer-internal">
                <div
                    className="diagonal-rack rack-left-internal"
                    style={isLeft ? leftRackStyle : undefined}
                >
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="rack-ball coral" />
                    ))}
                    {/* IDLE BALL for Player X (Left) */}
                    {showIdleBall && isLeft && <div className="waiting-ball coral-pulse" />}
                </div>
                <div
                    className="diagonal-rack rack-right-internal"
                    style={!isLeft ? rightRackStyle : undefined}
                >
                    {/* IDLE BALL for Player O (Right) */}
                    {showIdleBall && !isLeft && <div className="waiting-ball navy-pulse" />}
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="rack-ball navy" />
                    ))}
                </div>
            </div>

            <div className="gauge-bar">
                {/* Visual Background for Buckets */}
                <div className="buckets-visual-layer">
                    {/* Render visual slots matching physics bodies */}
                    {/* Physics has 9 buckets with 8 dividers between them */}
                    {board && board.map((cell, i) => (
                        <div key={i} className={`bucket-slot ${cell ? 'occupied' : 'open'}`}>
                            {/* The divider is physically between slots, handled by border or separate div */}

                            {cell && <span className={`bucket-mark ${cell === 'X' ? 'mark-x' : 'mark-o'}`}>{cell}</span>}
                            {!cell && <div className="target-dot" />}

                            <span className="bucket-id">{i + 1}</span>

                            {/* Visual Divider (Hill) */}
                            {/* We add it to the right of each slot except the last one */}
                            {i < 8 && <div className="bucket-hill-divider" />}
                        </div>
                    ))}
                </div>

                {/* Gauge Lines Overlay - Purely decorative now */}
                <div className="gauge-lines-overlay">
                    <div className="center-marker-line" />
                </div>
            </div>

            {/* The physics scene overlays the gauge bar */}
            <div ref={sceneRef} className="physics-overlay-layer" />
        </div>
    );
});

export default PinballArena;
