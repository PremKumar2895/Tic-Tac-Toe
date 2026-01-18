import React from 'react';

const TicTacToeBoard = ({ board }) => {
    return (
        <div className="art-board-wrapper">
            {/* Corner Bumpers */}
            <div className="bumper" style={{ top: '-6px', left: '-6px' }} />
            <div className="bumper" style={{ top: '-6px', right: '-6px' }} />
            <div className="bumper" style={{ bottom: '-6px', left: '-6px' }} />
            <div className="bumper" style={{ bottom: '-6px', right: '-6px' }} />

            <div className="tic-tac-toe-board">
                {board.map((cell, index) => (
                    <div key={index} className="grid-cell">
                        {cell && (
                            <span className={`cell-symbol ${cell.toLowerCase()}`}>
                                {cell}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TicTacToeBoard;
