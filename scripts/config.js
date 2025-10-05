// config.js
// Central configuration and constants for the election visualizer

const CONFIG = {
    // Canvas dimensions
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 600,
    
    // Grid system
    GRID_SPACING: 30, // 1/20th of canvas size
    GRID_LINE_COLOR: '#dddddd',
    GRID_LINE_WIDTH: 1,
    CENTER_AXIS_COLOR: '#333333',
    CENTER_AXIS_WIDTH: 2,
    
    // Candidate colors (maximum 6 candidates)
    CANDIDATE_COLORS: [
        '#FF0000', // Red
        '#0000FF', // Blue
        '#00FF00', // Green
        '#FFFF00', // Yellow
        '#00FFFF', // Cyan
        '#FF00FF'  // Magenta
    ],
    
    // Candidate names (by color)
    CANDIDATE_NAMES: ['Red', 'Blue', 'Green', 'Yellow', 'Cyan', 'Magenta'],
    
    // Candidate rendering
    CANDIDATE_RADIUS: 8,
    CANDIDATE_BORDER_WIDTH: 2,
    CANDIDATE_BORDER_COLOR: '#000000',
    CANDIDATE_ELIMINATED_BORDER_COLOR: '#888888',
    CANDIDATE_ELIMINATED_OPACITY: 0.3,
    CANDIDATE_DRAG_HALO_RADIUS: 12,
    CANDIDATE_DRAG_HALO_COLOR: 'rgba(255, 255, 255, 0.5)',
    CANDIDATE_SPREAD_RADIUS: 150, // For default geometric arrangement
    
    // Voter rendering
    VOTER_RADIUS: 1.5,
    VOTER_DEFAULT_COLOR: '#000000',
    VOTER_BORDER_WIDTH: 0.3,
    VOTER_GREY_COLOR: '#888888', // For nullified votes
    
    // Color blending
    COLOR_BLEND_SATURATION_BOOST: 1.4,
    
    // Distribution center markers
    DISTRIBUTION_CENTER_RADIUS: 10,
    DISTRIBUTION_CENTER_FILL: '#000000',
    DISTRIBUTION_CENTER_BORDER_COLOR: '#ffffff',
    DISTRIBUTION_CENTER_BORDER_WIDTH: 2,
    DISTRIBUTION_CENTER_LABEL_FONT: 'bold 12px Arial',
    DISTRIBUTION_CENTER_LABEL_COLOR: '#ffffff',
    DISTRIBUTION_DRAG_HALO_RADIUS: 14,
    DISTRIBUTION_DRAG_HALO_COLOR: 'rgba(255, 255, 255, 0.5)',
    
    // Approval voting visualization
    APPROVAL_CIRCLE_WIDTH: 2,
    APPROVAL_CIRCLE_OPACITY: 1.0,
    
    // STAR/Score voting visualization
    SCORE_RING_WIDTH: 1,
    SCORE_RING_OPACITY: 0.3,
    SCORE_NUM_RINGS: 5, // 5 rings for scores 1-5
    
    // Default parameter values
    DEFAULT_CANDIDATES: 2,
    DEFAULT_DISTRIBUTIONS: 1,
    DEFAULT_VOTER_COUNT: 1000,
    DEFAULT_SPREAD_RADIUS: 300, // User-facing radius parameter
    DEFAULT_APPROVAL_RADIUS: 150,
    DEFAULT_STAR_MAX_DISTANCE: 300,
    DEFAULT_SCORE_MAX_DISTANCE: 300,
    DEFAULT_MODE: 'multiple-elections', // 'one-election' or 'multiple-elections'
    DEFAULT_VOTING_METHOD: 'plurality',
    DEFAULT_APPROVAL_STRATEGY: 'strategic', // 'strategic' or 'honest'
    DEFAULT_DISPLAY_SCORE_RANGES: true,
    DEFAULT_DISPLAY_STAR_RANGES: true,
    
    // Parameter ranges
    MIN_CANDIDATES: 2,
    MAX_CANDIDATES: 6,
    MIN_DISTRIBUTIONS: 1,
    MAX_DISTRIBUTIONS: 6,
    MIN_VOTERS: 100,
    MAX_VOTERS: 3000,
    VOTER_STEP: 100,
    MIN_SPREAD_RADIUS: 50,
    MAX_SPREAD_RADIUS: 500,
    SPREAD_RADIUS_STEP: 10,
    MIN_APPROVAL_RADIUS: 50,
    MAX_APPROVAL_RADIUS: 300,
    MIN_MAX_DISTANCE: 100,
    MAX_MAX_DISTANCE: 600,
    MAX_DISTANCE_STEP: 10,
    
    // Default candidate positions (geometric arrangement)
    // These are offsets from center, actual positions calculated at runtime
    getCandidateDefaultPositions(count) {
        const centerX = this.CANVAS_WIDTH / 2;
        const centerY = this.CANVAS_HEIGHT / 2;
        const radius = this.CANDIDATE_SPREAD_RADIUS;
        
        const positions = [
            { x: centerX + radius, y: centerY }, // Right
            { x: centerX - radius, y: centerY }, // Left
            { x: centerX - radius / 2, y: centerY - radius * 0.86 }, // Upper-left
            { x: centerX + radius / 2, y: centerY + radius * 0.86 }, // Lower-right
            { x: centerX - radius / 2, y: centerY + radius * 0.86 }, // Lower-left
            { x: centerX + radius / 2, y: centerY - radius * 0.86 }  // Upper-right
        ];
        
        return positions.slice(0, count);
    },
    
    // Default distribution center positions
    getDistributionDefaultPositions(count) {
        const centerX = this.CANVAS_WIDTH / 2;
        const centerY = this.CANVAS_HEIGHT / 2;
        const offset = 80;
        
        const positions = [
            { x: centerX, y: centerY },           // Center
            { x: centerX - offset, y: centerY - offset }, // Upper-left
            { x: centerX + offset, y: centerY - offset }, // Upper-right
            { x: centerX - offset, y: centerY + offset }, // Lower-left
            { x: centerX + offset, y: centerY + offset }, // Lower-right
            { x: centerX, y: centerY - 120 }      // Top center
        ];
        
        return positions.slice(0, count);
    },
    
    // Hit detection thresholds
    CANDIDATE_HIT_RADIUS: 12,
    DISTRIBUTION_HIT_RADIUS: 14,
    
    // Canvas margins
    CANVAS_MARGIN: 2, // Minimum margin from edge for clamping positions
    
    // Gaussian distribution
    SIGMA_DIVISOR: 3, // spreadRadius / 3 = standard deviation (99.7% within radius)
    
    // Winner map generation
    WINNER_MAP_GRID_SIZE: 10, // Grid resolution in pixels
    
    // LocalStorage key
    STORAGE_KEY: 'electionVisualizerData'
};

// Make CONFIG globally available
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}