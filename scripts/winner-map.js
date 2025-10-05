// winner-map.js
// Generate victory territory map for Mode 2

const WinnerMap = (function() {
    'use strict';
    
    // Generate winner map by simulating elections across canvas grid
    function generateWinnerMap(onProgress) {
        const state = State.getState();
        const gridSize = CONFIG.WINNER_MAP_GRID_SIZE;
        
        const width = CONFIG.CANVAS_WIDTH;
        const height = CONFIG.CANVAS_HEIGHT;
        
        const cols = Math.ceil(width / gridSize);
        const rows = Math.ceil(height / gridSize);
        
        // Initialize 2D array to store winner at each grid point
        const winnerGrid = [];
        
        let processedCells = 0;
        const totalCells = cols * rows;
        
        // Generate Gaussian offsets ONCE for reuse across all cells
        const distribution = state.distributions[0];
        const offsets = Utils.generateGaussianOffsets(distribution.voterCount);
        
        // Generate winner map by simulating elections at each grid point
        for (let row = 0; row < rows; row++) {
            winnerGrid[row] = [];
            for (let col = 0; col < cols; col++) {
                const centerX = col * gridSize + gridSize / 2;
                const centerY = row * gridSize + gridSize / 2;
                
                // Simulate election at this point to determine winner
                // Pass pre-generated offsets for performance
                const winner = simulatePointWinner(centerX, centerY, offsets);
                winnerGrid[row][col] = winner;
                
                processedCells++;
                
                // Report progress every 100 cells
                if (onProgress && processedCells % 100 === 0) {
                    const progress = (processedCells / totalCells) * 100;
                    onProgress(progress);
                }
            }
        }
        
        const mapData = {
            grid: winnerGrid,
            gridSize: gridSize,
            cols: cols,
            rows: rows
        };
        
        // Cache the winner map
        State.updateState({ 
            winnerMap: mapData,
            winnerMapCache: mapData 
        });
        
        if (onProgress) {
            onProgress(100);
        }
        
        return mapData;
    }
    
    // Simulate election at a specific point
    // Accepts optional pre-generated offsets for performance
    function simulatePointWinner(x, y, offsets = null) {
        // Use Election module's simulateElectionAt function
        return Election.simulateElectionAt(x, y, offsets);
    }
    
    // Render winner map as colored rectangles/pixels
    function renderWinnerMap(ctx, mapData) {
        if (!mapData || !mapData.grid) {
            return;
        }
        
        const state = State.getState();
        const gridSize = mapData.gridSize;
        
        // Draw each cell
        for (let row = 0; row < mapData.rows; row++) {
            for (let col = 0; col < mapData.cols; col++) {
                const winnerId = mapData.grid[row][col];
                
                if (winnerId === null || winnerId === undefined) {
                    continue;
                }
                
                // Get winner's color
                const color = CONFIG.CANDIDATE_COLORS[winnerId];
                
                // Draw rectangle with slight transparency to see grid
                ctx.fillStyle = color + '80'; // Add alpha for transparency
                ctx.fillRect(
                    col * gridSize,
                    row * gridSize,
                    gridSize,
                    gridSize
                );
            }
        }
    }
    
    // Check if winner map needs regeneration
    function needsRegeneration() {
        const state = State.getState();
        
        // No cached map
        if (!state.winnerMapCache) {
            return true;
        }
        
        // TODO: Check if candidate positions have changed
        // For now, always regenerate when requested
        return false;
    }
    
    // Clear cached winner map
    function clearCache() {
        State.updateState({ 
            winnerMap: null,
            winnerMapCache: null 
        });
    }
    
    // Get winner at a specific canvas coordinate
    function getWinnerAt(x, y) {
        const state = State.getState();
        const mapData = state.winnerMap;
        
        if (!mapData || !mapData.grid) {
            return null;
        }
        
        const col = Math.floor(x / mapData.gridSize);
        const row = Math.floor(y / mapData.gridSize);
        
        if (row >= 0 && row < mapData.rows && col >= 0 && col < mapData.cols) {
            return mapData.grid[row][col];
        }
        
        return null;
    }
    
    // Public API
    return {
        generateWinnerMap,
        simulatePointWinner,
        renderWinnerMap,
        needsRegeneration,
        clearCache,
        getWinnerAt
    };
})();

// Make WinnerMap globally available
if (typeof window !== 'undefined') {
    window.WinnerMap = WinnerMap;
}