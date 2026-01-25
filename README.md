# Tic-Tac-Pinball

A physics-based twist on the classic Tic-Tac-Toe game. Players must launch pinballs from a rotating rack to land in the grid buckets.

## How to Play
1.  **Aim**: Use the Angle Slider (10° - 80°) to rotate the cannon.
    *   **Low Angle (10°)**: Shoots flat and far.
    *   **High Angle (80°)**: Shoots steep and near.
2.  **Power**: Adjust the Power Slider to control the launch force.
3.  **Launch**: Click the "Launch Ball" button. The ball will fire from the rack.
4.  **Capture**: The ball must bounce and settle into a slot to capture that square.
5.  **Win**: Get 3 symbols in a row (vertical, horizontal, or diagonal).

## Features
-   **Dynamic Physics**: Powered by Matter.js.
-   **Rotating Racks**: Launchers visually track your aiming angle.
-   **Turn Timeout**: If a shot misses or flies out of bounds, the turn passes automatically after 6 seconds.
-   **Idle Ball**: Visual indicator for whose turn it is.
