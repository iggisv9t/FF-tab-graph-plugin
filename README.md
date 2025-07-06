# Firefox History Graph Extension

Visualize your Firefox browsing history as an interactive 2D force-directed graph. Each node represents a visited URL, and edges represent navigation between pages. The extension supports rich interaction, including highlighting open tabs and opening/focusing tabs directly from the graph.

# DISCLAIMER

This thing were vibecoded. I've tried to check the code, assist the way thing shoud work, but I'm not a js developer, so I'm not sure if it's optimal or secure. Use at your own risk.

## Features

- **2D Force-Directed Graph**: Browsing history visualized using D3.js.
- **Interactive Controls**: Start/stop layout, zoom, drag, and highlight nodes/edges.
- **Open Tab Highlighting**: Nodes corresponding to currently open tabs are visually highlighted.
- **Tab Interaction**: Click a highlighted (open tab) node to focus that tab, or click any other node to open its URL in a new tab.
- **Customizable Time Window**: Choose how many days of history to visualize.

## Installation

1. **Clone or download this repository.**
2. **Open Firefox and go to `about:debugging#/runtime/this-firefox`.**
3. Click `Load Temporary Add-on...` and select any file in this directory (e.g., `manifest.json`).

## Usage

- Click the extension icon in your toolbar. This opens the visualization in a new tab.
- Use the controls to select the time window and (optionally) start/stop the force layout.
- Hover over nodes to see full URLs.
- Nodes highlighted in yellow/gold are open in a current tab. Click to switch to that tab. Clicking any other node opens the URL in a new tab.

## Permissions

- `history`, `tabs`, `activeTab`, `storage` — Required for reading browsing history, detecting open tabs, and interacting with tabs.

## File Overview

- `manifest.json` — Extension manifest (MV3, Firefox compatible)
- `background.js` — Handles history fetching, tab queries, and tab focusing/opening
- `visualization.html` — UI for the graph and controls
- `visualization.js` — D3.js visualization logic and interactive features
- `d3.v7.min.js` — Local copy of D3.js (required for CSP compliance)

## Development Notes

- All scripts are loaded locally due to Firefox extension CSP.
- The extension does not use any remote resources.
- Unused legacy files (popup.html, popup.js, orbitcontrols.js) have been removed.

## Roadmap / Ideas

- Add search/filter for nodes
- Export graph as image or data
- Improve performance for large histories
- Add more visual cues or analytics

## License

Still thinking about it, but feel free to contribute
