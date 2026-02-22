import { useEffect, useRef, useCallback } from 'react';
import Matter from 'matter-js';

const BALL_CATEGORY = 0x0001;
const WALL_CATEGORY = 0x0002;
const SENSOR_CATEGORY = 0x0004;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const usePinballPhysics = ({
    containerRef,
    width = 1024,
    height = 220,
    onBasketHit,
    onBallComplete,
    isLeftPlayer
}) => {
    const engineRef = useRef(null);
    const renderRef = useRef(null);
    const runnerRef = useRef(null);
    const activeBallRef = useRef(null);
    const callbackRef = useRef(onBasketHit);
    const completeCallbackRef = useRef(onBallComplete);
    const playerSideRef = useRef(isLeftPlayer);
    const scoredBallRef = useRef(new Set());

    useEffect(() => {
        callbackRef.current = onBasketHit;
    }, [onBasketHit]);

    useEffect(() => {
        completeCallbackRef.current = onBallComplete;
    }, [onBallComplete]);

    useEffect(() => {
        playerSideRef.current = isLeftPlayer;
    }, [isLeftPlayer]);

    const clearBall = useCallback(() => {
        if (!engineRef.current || !activeBallRef.current) return;
        Matter.Composite.remove(engineRef.current.world, activeBallRef.current);
        activeBallRef.current = null;
    }, []);

    useEffect(() => {
        if (!containerRef.current || width <= 0 || height <= 0) return;

        const { Engine, Render, Runner, World, Bodies, Composite, Events } = Matter;

        const engine = Engine.create({
            gravity: { x: 0, y: 1.08 },
            positionIterations: 8,
            velocityIterations: 6,
        });

        const render = Render.create({
            element: containerRef.current,
            engine,
            options: {
                width,
                height,
                background: 'transparent',
                wireframes: false,
                showAngleIndicator: false,
                pixelRatio: 1,
            }
        });

        engineRef.current = engine;
        renderRef.current = render;

        const gaugeHeight = 80;
        const baseY = height - gaugeHeight;
        const bucketWidth = width / 9;
        const basketY = baseY + gaugeHeight - 12;

        const floor = Bodies.rectangle(width / 2, height + 25, width + 120, 50, {
            isStatic: true,
            friction: 0.6,
            restitution: 0.1,
            collisionFilter: { category: WALL_CATEGORY },
            render: { visible: false },
        });

        const leftWall = Bodies.rectangle(-28, height / 2, 56, height * 2, {
            isStatic: true,
            collisionFilter: { category: WALL_CATEGORY },
            render: { visible: false },
        });

        const rightWall = Bodies.rectangle(width + 28, height / 2, 56, height * 2, {
            isStatic: true,
            collisionFilter: { category: WALL_CATEGORY },
            render: { visible: false },
        });

        const topBoundary = Bodies.rectangle(width / 2, -20, width + 80, 40, {
            isStatic: true,
            collisionFilter: { category: WALL_CATEGORY },
            render: { visible: false },
        });

        const bucketSeparators = [];
        for (let i = 1; i < 9; i += 1) {
            const x = i * bucketWidth;
            const separator = Bodies.trapezoid(x, baseY + gaugeHeight - 14, 14, 28, 0.38, {
                isStatic: true,
                chamfer: { radius: 2 },
                friction: 0.02,
                restitution: 0.68,
                collisionFilter: { category: WALL_CATEGORY },
                render: { visible: false }
            });
            bucketSeparators.push(separator);
        }

        const sensors = [];
        for (let i = 0; i < 9; i += 1) {
            const x = (i * bucketWidth) + (bucketWidth / 2);
            const sensor = Bodies.rectangle(x, basketY, bucketWidth - 12, 22, {
                isStatic: true,
                isSensor: true,
                label: `basket-${i}`,
                collisionFilter: { category: SENSOR_CATEGORY },
                render: { visible: false }
            });
            sensors.push(sensor);
        }

        Composite.add(engine.world, [floor, leftWall, rightWall, topBoundary, ...bucketSeparators, ...sensors]);

        const onCollisionStart = (event) => {
            event.pairs.forEach((pair) => {
                const { bodyA, bodyB } = pair;
                const ball = bodyA.label === 'ball' ? bodyA : (bodyB.label === 'ball' ? bodyB : null);
                const sensor = typeof bodyA.label === 'string' && bodyA.label.startsWith('basket-')
                    ? bodyA
                    : (typeof bodyB.label === 'string' && bodyB.label.startsWith('basket-') ? bodyB : null);

                if (!ball || !sensor || ball !== activeBallRef.current) return;
                if (scoredBallRef.current.has(ball.id)) return;

                scoredBallRef.current.add(ball.id);

                const bucketIndex = Number.parseInt(sensor.label.replace('basket-', ''), 10);
                callbackRef.current?.(bucketIndex);

                Composite.remove(engine.world, ball);
                activeBallRef.current = null;
            });
        };

        Events.on(engine, 'collisionStart', onCollisionStart);

        const onAfterUpdate = () => {
            const ball = activeBallRef.current;
            if (!ball) return;

            const outOfBounds = ball.position.y > height + 30 || ball.position.x < -30 || ball.position.x > width + 30;
            const almostRest = ball.position.y > baseY - 10 && Math.abs(ball.velocity.x) < 0.12 && Math.abs(ball.velocity.y) < 0.12;

            if (outOfBounds || almostRest) {
                Composite.remove(engine.world, ball);
                activeBallRef.current = null;
                completeCallbackRef.current?.();
            }
        };

        Events.on(engine, 'afterUpdate', onAfterUpdate);

        Render.run(render);
        const runner = Runner.create();
        runnerRef.current = runner;
        Runner.run(runner, engine);

        return () => {
            clearBall();
            scoredBallRef.current.clear();
            Events.off(engine, 'collisionStart', onCollisionStart);
            Events.off(engine, 'afterUpdate', onAfterUpdate);
            Render.stop(render);
            Runner.stop(runner);
            World.clear(engine.world, false);
            Engine.clear(engine);
            if (render.canvas) {
                render.canvas.remove();
            }
            if (render.textures) {
                render.textures = {};
            }
        };
    }, [clearBall, containerRef, height, width]);

    const launch = useCallback((angle, power) => {
        if (!engineRef.current) return;

        clearBall();

        const isLeft = playerSideRef.current;
        const dir = isLeft ? 1 : -1;

        const clampedAngle = clamp(angle, 10, 80);
        const clampedPower = clamp(power, 20, 100);
        const angleRad = (clampedAngle * Math.PI) / 180;

        const pivotY = height - 32;
        const pivotX = isLeft ? 0 : width;
        const rackLength = Math.min(160, width * 0.2);
        const ballRadius = 12;

        const tipX = isLeft
            ? pivotX + Math.cos(angleRad) * rackLength
            : pivotX - Math.cos(angleRad) * rackLength;
        const tipY = pivotY - Math.sin(angleRad) * rackLength;

        const spawnX = clamp(tipX + dir * 10, ballRadius + 4, width - ballRadius - 4);
        const spawnY = clamp(tipY - 8, ballRadius + 4, height - 90);

        const ball = Matter.Bodies.circle(spawnX, spawnY, ballRadius, {
            label: 'ball',
            restitution: 0.56,
            friction: 0.005,
            frictionAir: 0.012,
            density: 0.03,
            collisionFilter: {
                category: BALL_CATEGORY,
                mask: WALL_CATEGORY | SENSOR_CATEGORY,
            },
            render: {
                fillStyle: isLeft ? '#FF7676' : '#1D2B44',
                strokeStyle: '#FFFFFF',
                lineWidth: 2,
            }
        });

        activeBallRef.current = ball;
        scoredBallRef.current.delete(ball.id);
        Matter.Composite.add(engineRef.current.world, ball);

        const speed = 7.8 + (clampedPower - 20) * 0.065;
        const vx = Math.cos(angleRad) * speed * dir;
        const vy = -Math.sin(angleRad) * speed * 1.16;

        Matter.Body.setVelocity(ball, { x: vx, y: vy });
        Matter.Body.setAngularVelocity(ball, dir * 0.16);
    }, [clearBall, height, width]);

    return {
        launch,
        clearBall,
    };
};
