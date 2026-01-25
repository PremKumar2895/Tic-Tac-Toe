import { useEffect, useRef } from 'react';
import Matter from 'matter-js';

const ENGINE_OPTIONS = {
    gravity: { x: 0, y: 1.2 }, // Slightly higher gravity for weight
    positionIterations: 10,
    velocityIterations: 10,
};

const RENDER_OPTIONS = {
    pixelRatio: window.devicePixelRatio || 1,
    background: 'transparent',
    wireframes: false,
    showAngleIndicator: false,
};

const BALL_CATEGORY = 0x0001;
const WALL_CATEGORY = 0x0002;
const SENSOR_CATEGORY = 0x0004;

export const usePinballPhysics = ({
    containerRef,
    width = 1024,
    height = 140,
    onBasketHit,
    isLeftPlayer
}) => {
    const engineRef = useRef(null);
    const renderRef = useRef(null);
    const runnerRef = useRef(null);
    const activeBallRef = useRef(null);
    const callbackRef = useRef(onBasketHit);

    // Keep callback fresh
    useEffect(() => {
        callbackRef.current = onBasketHit;
    }, [onBasketHit]);

    // Initialize Physics Engine
    useEffect(() => {
        if (!containerRef.current) return;

        // Module aliases
        const { Engine, Render, Runner, World, Bodies, Composite, Events, Body } = Matter;

        // 1. Setup Engine
        const engine = Engine.create(ENGINE_OPTIONS);
        engineRef.current = engine;

        // 2. Setup Render
        const render = Render.create({
            element: containerRef.current,
            engine: engine,
            options: {
                ...RENDER_OPTIONS,
                width,
                height,
            },
        });
        renderRef.current = render;

        // 3. Create Static World Bounds
        // Floor
        const floor = Bodies.rectangle(width / 2, height + 20, width, 40, {
            isStatic: true,
            friction: 0.5,
            collisionFilter: { category: WALL_CATEGORY },
            render: { visible: false }
        });

        // Walls
        const leftWall = Bodies.rectangle(-20, height / 2, 40, height * 2, {
            isStatic: true,
            collisionFilter: { category: WALL_CATEGORY },
            render: { visible: false }
        });
        const rightWall = Bodies.rectangle(width + 20, height / 2, 40, height * 2, {
            isStatic: true,
            collisionFilter: { category: WALL_CATEGORY },
            render: { visible: false }
        });

        // 4. Create "Hills" / Separation between buckets
        // To make the pinball "bounce" on the marked elements as requested, 
        // we need physical geometry instead of thin lines.
        // We will create triangular/rounded dividers between the 9 buckets.
        const bucketWidth = width / 9;
        const bucketSeparators = [];

        // We need 8 separators between the 9 buckets
        for (let i = 1; i < 9; i++) {
            const x = i * bucketWidth;
            // A small triangle/hill at the bottom
            const separatorHeight = 30;
            const separatorWidth = 12;

            // Create a chamfered rectangle or polygon for better bouncing
            const separator = Bodies.trapezoid(x, height - separatorHeight / 2, separatorWidth, separatorHeight, 0.4, {
                isStatic: true,
                render: {
                    fillStyle: '#DCCBA5',
                    opacity: 0.0, // We will draw this via CSS/HTML mostly, but physics needs to be there
                    visible: false // Hiding widely to rely on DOM visual overlay if desired, but user asked for bounce.
                    // I'll make it invisible physics body and let visual layer handle looks.
                },
                chamfer: { radius: 2 },
                friction: 0.0,
                restitution: 0.8, // Bouncy!
                collisionFilter: { category: WALL_CATEGORY }
            });
            bucketSeparators.push(separator);
        }

        // 5. Create Sensors (Buckets)
        // Placed strictly between the separators
        const sensors = [];
        for (let i = 0; i < 9; i++) {
            const x = (i * bucketWidth) + (bucketWidth / 2);
            const sensor = Bodies.rectangle(x, height - 10, bucketWidth - 10, 20, {
                isStatic: true,
                isSensor: true,
                label: `basket-${i}`,
                collisionFilter: { category: SENSOR_CATEGORY },
                render: {
                    visible: false,
                    fillStyle: 'rgba(255, 0, 0, 0.2)' // Debug
                }
            });
            sensors.push(sensor);
        }

        Composite.add(engine.world, [floor, leftWall, rightWall, ...bucketSeparators, ...sensors]);

        // 6. Collision Handling
        Events.on(engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            pairs.forEach((pair) => {
                const { bodyA, bodyB } = pair;

                // Identify ball and sensor
                let ball = null;
                let sensor = null;

                if (bodyA.label === 'ball') ball = bodyA;
                else if (bodyB.label === 'ball') ball = bodyB;

                if (bodyA.label.startsWith('basket-')) sensor = bodyA;
                else if (bodyB.label.startsWith('basket-')) sensor = bodyB;

                if (ball && sensor && ball === activeBallRef.current) {

                    const bucketIndex = parseInt(sensor.label.split('-')[1], 10);

                    // Trigger callback
                    if (callbackRef.current) {
                        callbackRef.current(bucketIndex);
                    }

                    // Remove ball after a tiny delay or immediately
                    activeBallRef.current = null;
                    setTimeout(() => {
                        Composite.remove(engine.world, ball);
                    }, 50);
                }
            });
        });

        // 7. Start Loop
        Render.run(render);
        const runner = Runner.create();
        runnerRef.current = runner;
        Runner.run(runner, engine);

        // Cleanup
        return () => {
            Render.stop(render);
            Runner.stop(runner);
            Engine.clear(engine);
            render.canvas.remove();
        };

    }, [width, height]); // Re-init on resize

    // Launch Function
    const launch = (angle, power) => {
        if (!engineRef.current) return;

        // Cleanup existing ball
        if (activeBallRef.current) {
            Matter.Composite.remove(engineRef.current.world, activeBallRef.current);
        }

        const isLeft = isLeftPlayer;
        const dir = isLeft ? 1 : -1;

        // 1. Calculate Spawn Position (FROM THE RACK)
        // Racks are visually at the bottom corners.
        // Pivot point is at x=0 (Left Wall) and x=width (Right Wall).
        // Rack Length is approx 180px in CSS.
        // We want to spawn at the "Mouth" of the rack.

        // We need to account for the rotation angle.
        // Angle is input in degrees (e.g. 10 to 80).
        // Visual Rotation is -Angle (Left) or Angle (Right).
        const launchAngleRad = (angle * Math.PI) / 180;

        // Spawn offset from pivot
        // When angle is 0 (Flat): Spawn is at x=Length, y=PivotY (approx)
        // When angle is 90 (Up): Spawn is at x=PivotX, y=PivotY - Length

        const rackLength = 160; // Slightly less than visual 180 to avoid clipping
        const pivotY = height - 20;

        let spawnX, spawnY;

        if (isLeftPlayer) {
            const pivotX = 0; // Left wall
            spawnX = pivotX + Math.cos(launchAngleRad) * rackLength;
            spawnY = pivotY - Math.sin(launchAngleRad) * rackLength;
        } else {
            const pivotX = width; // Right wall
            spawnX = pivotX - Math.cos(launchAngleRad) * rackLength;
            spawnY = pivotY - Math.sin(launchAngleRad) * rackLength;
        }

        // 2. Create Ball
        const ball = Matter.Bodies.circle(spawnX, spawnY, 12, {
            label: 'ball',
            restitution: 0.6,
            friction: 0.001,
            frictionAir: 0.005, // Moderate air resistance for parabola
            density: 0.04,
            collisionFilter: {
                category: BALL_CATEGORY,
                mask: WALL_CATEGORY | SENSOR_CATEGORY
            },
            render: {
                fillStyle: isLeftPlayer ? '#FF7676' : '#1D2B44',
                strokeStyle: '#fff',
                lineWidth: 2
            }
        });

        activeBallRef.current = ball;
        Matter.Composite.add(engineRef.current.world, ball);

        // 3. Apply Velocity (PROJECTILE LAUNCH)
        // Goal: Shoot UP and ACROSS.
        // Input Angle (0-90) controls steepness.
        // Power (0-100) controls distance/speed.

        // Angle Logic: 
        // 10 deg = Low Arc (Aim for Far side).
        // 80 deg = High Arc (Aim for Near side).
        // Standard projectile physics: 45 deg = Max Distance.

        // Power scaling
        // Need fairly high impulse to fight gravity (+1.2Y) and air friction.
        const speedMultiplier = 0.55;
        const launchSpeed = power * speedMultiplier;

        // Velocity Components
        // Launch is UP (-y) and ACROSS (dir * x)
        const vx = Math.cos(launchAngleRad) * launchSpeed * dir;
        const vy = -Math.sin(launchAngleRad) * launchSpeed * 1.5;

        // Apply Force
        Matter.Body.setVelocity(ball, { x: vx, y: vy });

        // Spin
        Matter.Body.setAngularVelocity(ball, dir * 0.2);
    };

    return {
        launch
    };
};
