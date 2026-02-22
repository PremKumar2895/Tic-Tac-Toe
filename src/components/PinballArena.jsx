import React, { useRef, useImperativeHandle, forwardRef, useMemo, useState, useEffect } from 'react';
import { usePinballPhysics } from '../hooks/usePinballPhysics';

const PinballArena = forwardRef(({ activePlayer, onBasketHit, onBallComplete, board, isLaunching, angle }, ref) => {
    const sceneRef = useRef(null);
    const gaugeRef = useRef(null);
    const [sceneSize, setSceneSize] = useState({ width: 1024, height: 220 });

    useEffect(() => {
        const target = gaugeRef.current;
        if (!target) return;

        const updateSize = () => {
            const rect = target.getBoundingClientRect();
            const width = Math.max(320, Math.round(rect.width));
            setSceneSize({
                width,
                height: 220
            });
        };

        updateSize();

        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(target);

        return () => resizeObserver.disconnect();
    }, []);

    const isLeft = activePlayer === 'X';
    const showIdleBall = activePlayer && !isLaunching;

    const leftRackStyle = useMemo(() => ({
        transform: `rotate(${angle || 30}deg)`,
        transition: 'transform 220ms ease-out'
    }), [angle]);

    const rightRackStyle = useMemo(() => ({
        transform: `rotate(-${angle || 30}deg)`,
        transition: 'transform 220ms ease-out'
    }), [angle]);

    const { launch, clearBall } = usePinballPhysics({
        containerRef: sceneRef,
        width: sceneSize.width,
        height: sceneSize.height,
        onBasketHit,
        onBallComplete,
        isLeftPlayer: activePlayer === 'X',
    });

    useImperativeHandle(ref, () => ({
        launch: (launchAngle, power) => {
            launch(launchAngle, power);
        },
        clearBall
    }), [clearBall, launch]);

    return (
        <div className="alignment-footer">
            <div className="diagonal-racks-layer-internal">
                <div
                    className="diagonal-rack rack-left-internal"
                    style={isLeft ? leftRackStyle : undefined}
                >
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="rack-ball coral" />
                    ))}
                    {showIdleBall && isLeft && <div className="waiting-ball coral-pulse" />}
                </div>

                <div
                    className="diagonal-rack rack-right-internal"
                    style={!isLeft ? rightRackStyle : undefined}
                >
                    {showIdleBall && !isLeft && <div className="waiting-ball navy-pulse" />}
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="rack-ball navy" />
                    ))}
                </div>
            </div>

            <div ref={gaugeRef} className="launch-lane">
                <div className="gauge-bar">
                    <div className="buckets-visual-layer">
                        {board && board.map((cell, i) => (
                            <div key={i} className={`bucket-slot ${cell ? 'occupied' : 'open'}`}>
                                {cell && <span className={`bucket-mark ${cell === 'X' ? 'mark-x' : 'mark-o'}`}>{cell}</span>}
                                {!cell && <div className="target-dot" />}
                                <span className="bucket-id">{i + 1}</span>
                                {i < 8 && <div className="bucket-hill-divider" />}
                            </div>
                        ))}
                    </div>
                    <div className="gauge-lines-overlay">
                        <div className="center-marker-line" />
                    </div>
                </div>

                <div
                    ref={sceneRef}
                    className="physics-overlay-layer"
                    style={{ height: `${sceneSize.height}px` }}
                />
            </div>
        </div>
    );
});

export default PinballArena;
