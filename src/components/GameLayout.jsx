import React from 'react';
import './GameLayout.css';

const GameLayout = ({ children }) => {
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

            {footer}

            <div className="bg-blobs">
                <div className="blob blob-1" />
                <div className="blob blob-2" />
            </div>
        </div>
    );
};

export default GameLayout;
