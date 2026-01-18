import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import Matter from 'matter-js';

const PinballArena = forwardRef(({ activePlayer, onBasketHit }, ref) => {
    const sceneRef = useRef(null);
    const engineRef = useRef(null);
    const renderRef = useRef(null);
    const onHitRef = useRef(onBasketHit);
    const activeBallRef = useRef(null); // Keep track of current ball

    useEffect(() => { onHitRef.current = onBasketHit; }, [onBasketHit]);

    const getDimensions = () => ({
        width: 1024,
        height: 140
    });

    useImperativeHandle(ref, () => ({
        launch: (angle, power) => {
            if (!engineRef.current) return;
            const { width, height } = getDimensions();

            // Cleanup any existing ball just in case (though App guard should prevent this)
            if (activeBallRef.current) {
                Matter.Composite.remove(engineRef.current.world, activeBallRef.current);
            }

            const isLeft = activePlayer === 'X';
            const spawnX = isLeft ? 60 : width - 60;
            const spawnY = height - 100;

            const ball = Matter.Bodies.circle(spawnX, spawnY, 11, {
                label: 'ball',
                restitution: 0.7,
                friction: 0.005,
                render: {
                    fillStyle: isLeft ? '#FF7676' : '#1D2B44',
                    strokeStyle: '#fff',
                    lineWidth: 2
                }
            });

            activeBallRef.current = ball;

            // Adjust angle: X (Left) fires right (positive), O (Right) fires left (negative)
            const baseDir = isLeft ? 1 : -1;
            const rad = (angle * (Math.PI / 180)) * -1; // Fire upwards
            const force = (power / 100) * 22;

            Matter.Body.setVelocity(ball, {
                x: Math.cos(rad) * force * baseDir,
                y: Math.sin(rad) * force
            });

            Matter.Composite.add(engineRef.current.world, ball);
        }
    }));

    useEffect(() => {
        const { Engine, Render, Runner, Bodies, Composite, Events } = Matter;
        const { width, height } = getDimensions();

        const engine = Engine.create();
        engineRef.current = engine;
        engine.gravity.y = 0.8;

        const render = Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width,
                height,
                wireframes: false,
                background: 'transparent',
                pixelRatio: 1 // Force 1:1 pixel ratio for layout locking
            }
        });
        renderRef.current = render;

        // Boundaries
        const wallOptions = { isStatic: true, render: { fillStyle: 'transparent' } };
        const walls = [
            Bodies.rectangle(width / 2, height + 10, width, 20, wallOptions),
            Bodies.rectangle(-10, height / 2, 20, height, wallOptions),
            Bodies.rectangle(width + 10, height / 2, 20, height, wallOptions),
        ];

        // Buckets
        const bWidth = width / 9;
        const bY = height - 35;
        const sensors = [];

        for (let i = 0; i < 9; i++) {
            const x = bWidth * i + bWidth / 2;

            sensors.push(Bodies.rectangle(x, bY, bWidth - 10, 40, {
                isStatic: true,
                isSensor: true,
                label: `basket-${i}`,
                render: { fillStyle: 'transparent' }
            }));

            if (i < 8) {
                walls.push(Bodies.rectangle(bWidth * (i + 1), height - 30, 2, 60, {
                    isStatic: true,
                    render: { fillStyle: '#DCCBA5' }
                }));
            }
        }

        Composite.add(engine.world, [...walls, ...sensors]);

        Events.on(engine, 'collisionStart', (event) => {
            event.pairs.forEach((pair) => {
                const { bodyA, bodyB } = pair;
                let ball = null, basket = null;

                if (bodyA.label === 'ball' && bodyB.label.startsWith('basket-')) {
                    ball = bodyA; basket = bodyB;
                } else if (bodyB.label === 'ball' && bodyA.label.startsWith('basket-')) {
                    ball = bodyB; basket = bodyA;
                }

                // Only process the active ball once
                if (ball && basket && ball === activeBallRef.current) {
                    const idx = parseInt(basket.label.split('-')[1]);
                    console.log(`[Physics] Ball resolved in bucket ${idx}`);
                    activeBallRef.current = null; // Important: Clear ref before state update to prevent re-trigger

                    if (onHitRef.current) {
                        onHitRef.current(idx);
                    }

                    // Immediate physical removal
                    setTimeout(() => {
                        if (engineRef.current) {
                            Matter.Composite.remove(engineRef.current.world, ball);
                        }
                    }, 0);
                }
            });
        });

        Render.run(render);
        const runner = Runner.create();
        Runner.run(runner, engine);

        return () => {
            Render.stop(render);
            Runner.stop(runner);
            if (render.canvas) render.canvas.remove();
            Engine.clear(engine);
        };
    }, []);

    return (
        <div className="alignment-footer">
            <div className="gauge-bar">
                {/* Visual Background for Buckets */}
                <div className="buckets-visual-layer">
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className="bucket-slot">
                            <span className="bucket-id">{i + 1}</span>
                        </div>
                    ))}
                </div>

                {/* Gauge Lines Overplay */}
                <div className="gauge-lines-overlay">
                    {[...Array(19)].map((_, i) => (
                        <div key={i} className={i === 9 ? 'center-marker' : 'gauge-line'}>
                            {i === 9 && <span className="center-label">CENTER</span>}
                        </div>
                    ))}
                </div>
            </div>

            {/* The physics scene overlays the gauge bar */}
            <div ref={sceneRef} className="physics-overlay-layer" />

            <div className="footer-labels">
                <span>MIN RANGE</span>
                <span className="italic">Physical Alignment Scale — Launch to Strike Grid</span>
                <span>MAX RANGE</span>
            </div>
        </div>
    );
});

export default PinballArena;
