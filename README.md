# Anhilation Area

A multiplayer 2D shooter game built for mobile devices and optimized for Termux. Survive endless waves of intelligent enemies, upgrade your vehicle, and dominate the arena.

## Features

- **Multiplayer**: Real-time combat with other players.
- **Mobile Optimized**: Smooth joystick controls and touch interface.
- **5 Vehicle Classes**:
  - **Speedie**: High speed, low health.
  - **Normal**: Balanced stats.
  - **Medium**: Tougher armor.
  - **Heavy**: Tank-like health, slow speed.
  - **Bomber**: High damage output.
- **Intelligent AI**: Enemies flank, ambush, and attack in groups.
- **Waves System**: Difficulty increases with every wave.
- **Large World**: Explore a massive map with obstacles.
- **Minimap**: Keep track of enemies and allies.

## Installation & Usage

### Prerequisites
- Node.js (v14 or higher)

### Setup

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd anhilation-area
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the server:
    ```bash
    npm start
    ```

4.  Open your browser and navigate to:
    `http://localhost:3000`

## Running on Android (Termux)

1.  Install Termux from F-Droid or Google Play Store.
2.  Update packages and install Node.js:
    ```bash
    pkg update && pkg upgrade
    pkg install nodejs git
    ```
3.  Clone the repository (or copy files to your device):
    ```bash
    git clone <repository-url>
    cd anhilation-area
    ```
4.  Install dependencies:
    ```bash
    npm install
    ```
5.  Start the server:
    ```bash
    npm start
    ```
6.  Open Chrome or your preferred mobile browser and go to `http://localhost:3000`.

## How to Play

1.  **Select Vehicle**: Choose one of the 5 available vehicles based on your playstyle.
2.  **Move**: Use the virtual joystick on the left side of the screen.
3.  **Shoot**: Press the red "SHOOT" button on the right.
4.  **Survive**: Eliminate enemies to clear waves. Watch your HP and use obstacles for cover.
