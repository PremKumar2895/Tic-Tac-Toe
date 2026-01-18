import React from 'react';
import './GameLayout.css';

const GameLayout = ({ children, turn }) => {
    // Expected children: [Header, LeftControls, PlayArea, RightControls, Footer]
    const [header, leftControls, playArea, rightControls, footer] = children;

    return (
        <div className="game-layout-unified">
            {header}

            <main className="main-stage">
                <section className="side-content">
                    {leftControls}
                </section>

                <section className="center-game-area">
                    {playArea}
                </section>

                <section className="side-content">
                    {rightControls}
                </section>
            </main>

            {/* Ball Racks Decoration */}
            <div className="diagonal-racks-layer">
                <div className="diagonal-rack rack-left">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="rack-ball coral" />
                    ))}
                </div>
                <div className="diagonal-rack rack-right">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="rack-ball navy" />
                    ))}
                </div>
            </div>

            {footer}

            {/* Background blobs */}
            <div className="bg-blobs">
                <div className="blob blob-1" />
                <div className="blob blob-2" />
            </div>
        </div>
    );
};

export default GameLayout;
