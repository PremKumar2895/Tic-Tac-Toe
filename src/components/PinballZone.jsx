import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

const PinballZone = ({ player, onBasketHit, isActive, side }) => {
    const sceneRef = useRef(null);
    const engineRef = useRef(null);
    const renderRef = useRef(null);

    // Launch controls
    const [angle, setAngle] = useState(side === 'left' ? 45 : 135);
    const [power, setPower] = useState(15);

    useEffect(() => {
        // 1. Setup Matter.js Engine and World
        const Engine = Matter.Engine;
        const Render = Matter.Render;
        const Runner = Matter.Runner;
        const Bodies = Matter.Bodies;
        const Composite = Matter.Composite;
        const Events = Matter.Events;

        // Create engine
        const engine = Engine.create();
        engineRef.current = engine;

        // Reduce gravity scale slightly for better playability if needed
        engine.gravity.y = 0.8;

        // Create renderer
        const width = 300;
        const height = 500;

        const render = Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width,
                height,
                wireframes: false,
                background: '#1a1a1a',
            },
        });
        renderRef.current = render;

        // 2. Create Static Bodies (Walls, Pegs, Baskets)
        const walls = [
            Bodies.rectangle(width / 2, height + 10, width, 20, { isStatic: true, render: { fillStyle: '#333' } }), // Ground
            Bodies.rectangle(-10, height / 2, 20, height, { isStatic: true }), // Left Wall
            Bodies.rectangle(width + 10, height / 2, 20, height, { isStatic: true }), // Right Wall
            // Funnel walls
            Bodies.rectangle(width / 4, 100, 10, 150, {
                isStatic: true,
                angle: Math.PI / 8,
                render: { fillStyle: '#444' }
            }),
            Bodies.rectangle(width * 3 / 4, 100, 10, 150, {
                isStatic: true,
                angle: -Math.PI / 8,
                render: { fillStyle: '#444' }
            })
        ];

        // Pegs (Plinko style)
        const pegs = [];
        const rows = 6;
        const cols = 7;
        const startY = 180;
        const spacingX = width / (cols + 1);
        const spacingY = 40;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Offset every other row
                const xOffset = (row % 2 === 0) ? 0 : spacingX / 2;
                const x = spacingX * (col + 1) + xOffset - (spacingX / 2); // Center logic adjustment
                const y = startY + row * spacingY;

                // Only add if within bounds
                if (x > 30 && x < width - 30) {
                    pegs.push(Bodies.circle(x, y, 4, {
                        isStatic: true,
                        render: { fillStyle: '#aaa' },
                        restitution: 0.8
                    }));
                }
            }
        }

        // Baskets (Sensors)
        const baskets = [];
        const basketCount = 3; // 3 baskets per side logic? No, request says 1-9 baskets.
        // Wait, the prompt says "Each pinball section contains... 9 baskets labeled 1 to 9". 
        // This is tight. 9 baskets across 300px? That's ~33px per basket. Doable.

        const basketWidth = width / 9;
        for (let i = 0; i < 9; i++) {
            const x = basketWidth * i + basketWidth / 2;
            const basketSensor = Bodies.rectangle(x, height - 15, basketWidth - 2, 10, {
                isStatic: true,
                isSensor: true,
                label: `basket-${i + 1}`,
                render: {
                    fillStyle: 'transparent',
                    strokeStyle: '#555',
                    lineWidth: 1
                }
            });
            baskets.push(basketSensor);

            // Visual dividers for baskets
            if (i > 0) {
                walls.push(Bodies.rectangle(basketWidth * i, height - 20, 2, 40, { isStatic: true, render: { fillStyle: '#555' } }));
            }
        }

        Composite.add(engine.world, [...walls, ...pegs, ...baskets]);

        // 3. Collision Events
        Events.on(engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            pairs.forEach((pair) => {
                const { bodyA, bodyB } = pair;
                const labelA = bodyA.label;
                const labelB = bodyB.label;

                // Check for basket collision
                let hitBasket = null;
                if (labelA.startsWith('basket-') && bodyB.label === 'ball') hitBasket = labelA;
                if (labelB.startsWith('basket-') && bodyA.label === 'ball') hitBasket = labelB;

                if (hitBasket) {
                    const basketIndex = parseInt(hitBasket.split('-')[1]) - 1; // 0-indexed
                    if (onBasketHit) onBasketHit(basketIndex);

                    // Remove the ball
                    const ball = labelA === 'ball' ? bodyA : bodyB;
                    Composite.remove(engine.world, ball);
                }
            });
        });

        // 4. Run loop
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
    }, [onBasketHit]); // Re-init if callback changes? Ideally should use a ref for callback to avoid re-init.

    // Callback ref to avoid re-running effect
    const onHitRef = useRef(onBasketHit);
    useEffect(() => { onHitRef.current = onBasketHit; }, [onBasketHit]);

    // Launch function
    const handleLaunch = () => {
        if (!isActive || !engineRef.current) return;

        const Bodies = Matter.Bodies;
        const Composite = Matter.Composite;
        const Body = Matter.Body;

        const width = 300;
        // Launch position depends on side?
        // Side 'left' launches from bottom-left or simply top-left funnel? 
        // Physics usually: launcher at bottom-right shooting up? 
        // Or prompt says "ball falls through pegs". So we spawn at top.
        // "Launch angle and power" -> shoot from a cannon at the top.

        const spawnX = side === 'left' ? 30 : width - 30;
        const spawnY = 50;

        const ball = Bodies.circle(spawnX, spawnY, 8, {
            label: 'ball',
            restitution: 0.6,
            render: {
                fillStyle: player === 'X' ? '#ff0055' : '#00ccff'
            }
        });

        // Calculate velocity vector from angle/power
        // Angle 0 = Right, 90 = Down, -90 = Up.
        // User inputs angle in degrees.
        const rad = angle * (Math.PI / 180);
        const velocityX = Math.cos(rad) * (power / 2); // Scaling
        const velocityY = Math.sin(rad) * (power / 2);

        Body.setVelocity(ball, { x: velocityX, y: velocityY });

        Composite.add(engineRef.current.world, ball);
    };

    return (
        <div className="pinball-zone">
            <div ref={sceneRef} className="scene" />
            <div className="controls">
                <label>
                    Angle:
                    <input
                        type="range"
                        min="0" max="180"
                        value={angle}
                        onChange={(e) => setAngle(Number(e.target.value))}
                        disabled={!isActive}
                    />
                </label>
                <label>
                    Power:
                    <input
                        type="range"
                        min="5" max="30"
                        value={power}
                        onChange={(e) => setPower(Number(e.target.value))}
                        disabled={!isActive}
                    />
                </label>
                <button onClick={handleLaunch} disabled={!isActive}>
                    FIRE ({player})
                </button>
            </div>
        </div>
    );
};

export default PinballZone;
