import React from 'react';
import './GameLayout.css'; // We'll create this specific css

const GameLayout = ({ children }) => {
    // Children: [Arena(Physics), Board(UI), Header(Info)]
    return (
        <div className="game-layout-unified">
            <div className="layer physics-layer">
                {children[0]} {/* PinballArena */}
            </div>

            <div className="layer ui-layer-center">
                {children[1]} {/* TicTacToeBoard */}
            </div>

            <div className="layer ui-layer-top">
                {children[2]} {/* Status/Header */}
            </div>
        </div>
    );
};

export default GameLayout;
