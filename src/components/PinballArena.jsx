import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

const PinballArena = ({ activePlayer, onBasketHit }) => {
    const sceneRef = useRef(null);
    const engineRef = useRef(null);
    const renderRef = useRef(null);

    // Controls
    const [angle, setAngle] = useState(45);
    const [power, setPower] = useState(20);

    // Responsive dimensions helper
    const getDimensions = () => {
        // Basic max width to keep play area reasonable
        const width = window.innerWidth > 800 ? 800 : window.innerWidth;
        const height = 600;
        return { width, height };
    };

    useEffect(() => {
        // Matter.js aliases
        const Engine = Matter.Engine;
        const Render = Matter.Render;
        const Runner = Matter.Runner;
        const Bodies = Matter.Bodies;
        const Composite = Matter.Composite;
        const Events = Matter.Events;

        const { width, height } = getDimensions();

        // Create engine
        const engine = Engine.create();
        engineRef.current = engine;
        engine.gravity.y = 0.8; // Reduced gravity for better gameplay

        // Create renderer
        const render = Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width,
                height,
                wireframes: false,
                background: 'transparent',
                pixelRatio: window.devicePixelRatio || 1
            },
        });
        renderRef.current = render;

        // --- BOUNDARIES ---
        const walls = [
            Bodies.rectangle(width / 2, height + 10, width, 20, {
                isStatic: true,
                render: { fillStyle: '#444' }
            }), // Floor
            Bodies.rectangle(-10, height / 2, 20, height, { isStatic: true }), // Left Wall
            Bodies.rectangle(width + 10, height / 2, 20, height, { isStatic: true }), // Right Wall

            // Top Funnels
            Bodies.rectangle(width * 0.1, 100, 260, 20, {
                isStatic: true,
                angle: Math.PI / 5,
                render: { fillStyle: '#555' }
            }),
            Bodies.rectangle(width * 0.9, 100, 260, 20, {
                isStatic: true,
                angle: -Math.PI / 5,
                render: { fillStyle: '#555' }
            })
        ];

        // --- PEGS ---
        const pegs = [];
        const rows = 9;
        const cols = 11;
        const startY = 160;
        const pegSpacing = 45;
        const centerX = width / 2;

        for (let row = 0; row < rows; row++) {
            const rowWidth = cols * pegSpacing;
            const startX = centerX - rowWidth / 2;

            for (let col = 0; col < cols; col++) {
                const xOffset = (row % 2 === 0) ? 0 : pegSpacing / 2;
                const x = startX + col * pegSpacing + xOffset;
                const y = startY + row * pegSpacing;

                // Define center exclusion zone (approx 240x240 for the Board)
                const inCenterBox = (x > centerX - 130 && x < centerX + 130) && (y > startY && y < startY + 260);

                if (!inCenterBox && x > 40 && x < width - 40) {
                    pegs.push(Bodies.circle(x, y, 5, {
                        isStatic: true,
                        label: 'peg',
                        render: { fillStyle: '#888' },
                        restitution: 0.6
                    }));
                }
            }
        }

        // --- BASKETS ---
        const baskets = [];
        // Ensure we fit 9 baskets within available width
        // Subtract margins (e.g., 40px)
        const availableWidth = width - 40;
        const basketWidth = availableWidth / 9;

        for (let i = 0; i < 9; i++) {
            const x = 20 + basketWidth * i + basketWidth / 2;
            const basket = Bodies.rectangle(x, height - 10, basketWidth - 2, 20, {
                isStatic: true,
                isSensor: true,
                label: `basket-${i}`,
                render: {
                    fillStyle: 'rgba(255, 255, 255, 0.05)',
                    strokeStyle: '#333',
                    lineWidth: 1
                }
            });
            baskets.push(basket);

            // Dividers
            if (i > 0) {
                walls.push(Bodies.rectangle(20 + basketWidth * i, height - 20, 2, 40, {
                    isStatic: true,
                    render: { fillStyle: '#666' }
                }));
            }
        }

        Composite.add(engine.world, [...walls, ...pegs, ...baskets]);

        // --- RUN ---
        Render.run(render);
        const runner = Runner.create();
        Runner.run(runner, engine);

        // Cleanup
        return () => {
            Render.stop(render);
            Runner.stop(runner);
            if (render.canvas) render.canvas.remove();
            Engine.clear(engine);
        };
    }, []);

    // Window Resize Handler
    useEffect(() => {
        const handleResize = () => {
            const { width, height } = getDimensions();
            if (renderRef.current) {
                renderRef.current.canvas.width = width;
                renderRef.current.canvas.height = height;
                // Note: Physics bodies don't auto-resize, simplified for now.
                // Ideally we'd remove & re-add bodies or scale coordinate system.
                // For a prototype, reload might be needed or accept fixed world.
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Collision Logic with Ref
    const onHitRef = useRef(onBasketHit);
    useEffect(() => { onHitRef.current = onBasketHit; }, [onBasketHit]);

    useEffect(() => {
        if (!engineRef.current) return;

        const eventHelper = (event) => {
            event.pairs.forEach((pair) => {
                const { bodyA, bodyB } = pair;
                const labelA = bodyA.label || '';
                const labelB = bodyB.label || '';

                let hitBasketIndex = null;
                if (labelA.startsWith('basket-') && bodyB.label === 'ball') {
                    hitBasketIndex = parseInt(labelA.split('-')[1]);
                    Matter.Composite.remove(engineRef.current.world, bodyB);
                } else if (labelB.startsWith('basket-') && bodyA.label === 'ball') {
                    hitBasketIndex = parseInt(labelB.split('-')[1]);
                    Matter.Composite.remove(engineRef.current.world, bodyA);
                }

                if (hitBasketIndex !== null && !isNaN(hitBasketIndex)) {
                    if (onHitRef.current) onHitRef.current(hitBasketIndex);
                }
            });
        }

        Matter.Events.on(engineRef.current, 'collisionStart', eventHelper);
        return () => {
            if (engineRef.current) Matter.Events.off(engineRef.current, 'collisionStart', eventHelper);
        }
    }, [engineRef.current]);

    // LAUNCHER
    const handleLaunch = () => {
        if (!engineRef.current) return;

        const { width } = getDimensions();
        const isLeft = activePlayer === 'X';

        // Spawning Points
        const spawnX = isLeft ? 60 : width - 60;
        const spawnY = 60;

        const ball = Matter.Bodies.circle(spawnX, spawnY, 10, {
            label: 'ball',
            restitution: 0.9, // Bounciness
            friction: 0.005,
            frictionAir: 0.001,
            render: {
                fillStyle: isLeft ? '#ff0055' : '#00ccff',
                strokeStyle: '#fff',
                lineWidth: 1
            }
        });

        // Launch Force Vector
        const rad = angle * (Math.PI / 180);
        let vx, vy;

        if (isLeft) {
            // X: 0 deg = Shoot Right. 90 = Shoot Down.
            vx = Math.cos(rad) * (power / 100 * 25); // Scaling power roughly
            vy = Math.sin(rad) * (power / 100 * 25);
        } else {
            // O: Mirrored launch logic
            // If 180 = Left, 90 = Down.
            // We can use the same angle processing if user inputs 'Aim Direction'
            // Let's assume input 0-90 is consistent "Away from wall, Downwards"
            // So for Right side, 0 would be Left? 

            // Let's stick to simple: Input angle is strictly visual 0-180.
            // X: 0-90. O: 90-180.
            vx = Math.cos(rad) * (power / 100 * 25);
            vy = Math.sin(rad) * (power / 100 * 25);
        }

        // Prevent crazy speeds
        // vx/vy should be roughly 5-15 range
        Matter.Body.setVelocity(ball, { x: vx * 10, y: vy * 10 }); // Scaling
        Matter.Composite.add(engineRef.current.world, ball);
    };

    return (
        <div className="pinball-arena">
            <div ref={sceneRef} className="scene-layer" />

            {/* Control Overlay */}
            <div className={`controls-overlay control-${activePlayer === 'X' ? 'left' : 'right'}`}>
                <div className="control-panel">
                    <h3>Player {activePlayer} Launch</h3>
                    <div className="input-group">
                        <label>Angle: {angle}°</label>
                        <input
                            type="range"
                            min={activePlayer === 'X' ? 0 : 90}
                            max={activePlayer === 'X' ? 90 : 180}
                            value={angle}
                            onChange={(e) => setAngle(Number(e.target.value))}
                        />
                    </div>
                    <div className="input-group">
                        <label>Power: {power}%</label>
                        <input
                            type="range"
                            min="10"
                            max="100"
                            value={power}
                            onChange={(e) => setPower(Number(e.target.value))}
                        />
                    </div>
                    <button
                        className="fire-btn"
                        onClick={handleLaunch}
                        disabled={!activePlayer}
                    >
                        LAUNCH BALL
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PinballArena;
