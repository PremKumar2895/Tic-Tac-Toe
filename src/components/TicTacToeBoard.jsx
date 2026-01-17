import React from 'react';

const TicTacToeBoard = ({ board }) => {
    return (
        <div className="tic-tac-toe-board">
            {board.map((cell, index) => (
                <div key={index} className={`cell ${cell ? 'occupied' : ''} ${cell === 'X' ? 'x-cell' : 'o-cell'}`}>
                    {cell}
                    <div className="cell-number">{index + 1}</div>
                </div>
            ))}
        </div>
    );
};

export default TicTacToeBoard;
