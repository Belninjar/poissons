let mouseX = null;
let mouseY = null;

const backgroundImage2 = new Image();
backgroundImage2.src = 'bckgrnd2.png'; // Replace with the path to your image



class Fish {
    constructor(x, y, direction, speed) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.speed = speed;
        this.trail = [];
    }

    updatePosition(grid, gridSize, collisionRadius, alignmentRadius, attractionRadius, k, sharkRadius) {
        let repulsion = { x: 0, y: 0 };
        let alignment = { x: 0, y: 0 };
        let attraction = { x: 0, y: 0 };
        
        let neighbors = [];

        
        let cellX = Math.floor(this.x / gridSize);
        let cellY = Math.floor(this.y / gridSize);
        
        // Get neighbors from the current cell and adjacent cells
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                let neighborCellX = cellX + i;
                let neighborCellY = cellY + j;
                let cellKey = `${neighborCellX},${neighborCellY}`;
                if (grid[cellKey]) {
                    for (let otherFish of grid[cellKey]) {
                        if (otherFish === this) continue;

                        let dx = otherFish.x - this.x;
                        let dy = otherFish.y - this.y;
                        let distance = dx * dx + dy * dy;

                        neighbors.push({ fish: otherFish, distance: distance });
                    }
                }
            }
        }

        // Sort neighbors by distance
        neighbors.sort((a, b) => a.distance - b.distance);

        // Keep only the k closest neighbors
        neighbors = neighbors.slice(0, k);

        let numRepulsion = 0;
        let numAlignment = 0;
        let numAttraction = 0;

        for (let neighbor of neighbors) {
            let otherFish = neighbor.fish;
            let distance = neighbor.distance;

            if (distance < collisionRadius * collisionRadius && distance > 0) {
                // Repulsion force
                let dx = otherFish.x - this.x;
                let dy = otherFish.y - this.y;
                repulsion.x -= dx / distance;
                repulsion.y -= dy / distance;
                numRepulsion++;
            } else if (distance < alignmentRadius * alignmentRadius) {
                // Alignment force
                alignment.x += Math.cos(otherFish.direction);
                alignment.y += Math.sin(otherFish.direction);
                numAlignment++;
            } else if (distance < attractionRadius * attractionRadius) {
                // Attraction force
                let dx = otherFish.x - this.x;
                let dy = otherFish.y - this.y;
                attraction.x += dx / distance;
                attraction.y += dy / distance;
                numAttraction++;
            }
        }

        // Shark (mouse) repulsion logic
        if (mouseX !== null && mouseY !== null) {
            let dx = this.x - mouseX;
            let dy = this.y - mouseY;
            let distanceToShark = dx * dx + dy * dy;

            if (distanceToShark < sharkRadius * sharkRadius) {
                // Add repulsion from the shark (mouse)
                repulsion.x += dx / Math.sqrt(distanceToShark);
                repulsion.y += dy / Math.sqrt(distanceToShark);
                numRepulsion++;
            }
        }

        // Wall avoidance (additional force)
        const wallRepulsionStrength = 20;

        if (this.x < collisionRadius) repulsion.x += wallRepulsionStrength * (collisionRadius - this.x) / collisionRadius;
        if (this.x > canvas.width - collisionRadius) repulsion.x -= wallRepulsionStrength * (this.x - (canvas.width - collisionRadius)) / collisionRadius;
        if (this.y < collisionRadius) repulsion.y += wallRepulsionStrength * (collisionRadius - this.y) / collisionRadius;
        if (this.y > canvas.height - collisionRadius) repulsion.y -= wallRepulsionStrength * (this.y - (canvas.height - collisionRadius)) / collisionRadius;

        // Calculate the direction change based on the forces
        if (numRepulsion > 0) {
            repulsion.x /= numRepulsion;
            repulsion.y /= numRepulsion;
        }
        if (numAlignment > 0) {
            alignment.x /= numAlignment;
            alignment.y /= numAlignment;
        }
        if (numAttraction > 0) {
            attraction.x /= numAttraction;
            attraction.y /= numAttraction;
        }

        // Sum of forces to get the new direction
        let deltaX = repulsion.x + alignment.x + attraction.x;
        let deltaY = repulsion.y + alignment.y + attraction.y;

        this.direction = Math.atan2(deltaY, deltaX);

        // Apply wiggle (random direction change)
        this.direction += (Math.random() - 0.5) * wiggle;

        // Update position based on the new direction
        this.x += Math.cos(this.direction) * this.speed;
        this.y += Math.sin(this.direction) * this.speed;

        // Save the current position in the trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 7) {
            this.trail.shift(); // Limit the trail length
        }
    }

    draw(ctx) {
        // Draw the trail
        for (let i = 0; i < this.trail.length - 1; i++) {
            ctx.beginPath();
            ctx.moveTo(this.trail[i].x, this.trail[i].y);
            ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
            
            // Line width decreases towards the end of the trail
            ctx.lineWidth = (i + 1) / this.trail.length * 10;
            
            // Opacity decreases towards the end of the trail
            ctx.strokeStyle = `rgba(0, 0, 0, ${(i + 1) / this.trail.length})`;
            ctx.stroke();
        }

        // Draw the fish (as a simple circle)
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "black";
        ctx.fill();
    }
}

const canvas = document.getElementById("simulationCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth - 250;  // Adjust the canvas width to account for the control panel
canvas.height = window.innerHeight;

let fishArray = [];
let numFish = 200;
let speed = 5;
let wiggle = 0.1;
let k = 5;
let collisionRadius = 30;
let alignmentRadius = 100;
let attractionRadius = 150;
let gridSize = attractionRadius; // Grid size based on the largest interaction radius
let isPaused = false;

function initializeFish() {
    fishArray = [];
    for (let i = 0; i < numFish; i++) {
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        let direction = Math.random() * Math.PI * 2;
        fishArray.push(new Fish(x, y, direction, speed));
    }
}

function createGrid() {
    let grid = {};
    for (let fish of fishArray) {
        let cellX = Math.floor(fish.x / gridSize);
        let cellY = Math.floor(fish.y / gridSize);
        let cellKey = `${cellX},${cellY}`;
        if (!grid[cellKey]) {
            grid[cellKey] = [];
        }
        grid[cellKey].push(fish);
    }
    return grid;
}

function updateFish() {
    let grid = createGrid();
    for (let fish of fishArray) {
        fish.updatePosition(grid, gridSize, collisionRadius, alignmentRadius, attractionRadius, k, sharkRadius);
    }
}
let sharkTrail = [];
const sharkTrailLength = 10; // You can adjust the length as needed

function drawShark(ctx) {
    // Draw the shark's trail
    for (let i = 0; i < sharkTrail.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(sharkTrail[i].x, sharkTrail[i].y);
        ctx.lineTo(sharkTrail[i + 1].x, sharkTrail[i + 1].y);
        
        // Line width decreases as the index increases (towards the end of the trail)
        ctx.lineWidth = (i + 1) / sharkTrail.length * 25;
        
        // Opacity decreases towards the end of the trail
        ctx.strokeStyle = `rgba(255, 0, 0, ${(sharkTrail.length - i) / sharkTrail.length})`;
        
        ctx.stroke();
    }

    // Draw the shark (mouse) as a slightly larger fish with a red color
    if (mouseX !== null && mouseY !== null) {
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 12, 0, Math.PI * 2); // Slightly larger than the fish
        ctx.fillStyle = "red";
        ctx.fill();
        // No stroke, similar to fish
    }
}



function drawFish() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw the background image

    for (let fish of fishArray) {
        fish.draw(ctx);
    }
    
    drawShark(ctx); // Draw the shark (mouse) after all the fish

    // Reset global alpha to 1 (fully opaque) for subsequent drawings
    ctx.globalAlpha = 0.6;
    if (backgroundImage2.complete) { // Ensure the image has loaded
        ctx.drawImage(backgroundImage2, 0, 0, canvas.width, canvas.height);
    }
    ctx.globalAlpha = 1;
}

function animate() {
    if (!isPaused) {
        updateFish();
        drawFish();
    }
    requestAnimationFrame(animate);
}

document.getElementById("numFish").addEventListener("input", (e) => {
    numFish = e.target.value;
    document.getElementById("numFishValue").textContent = numFish;
    initializeFish();
});

document.getElementById("speed").addEventListener("input", (e) => {
    speed = e.target.value;
    document.getElementById("speedValue").textContent = speed;
});

document.getElementById("wiggle").addEventListener("input", (e) => {
    wiggle = parseFloat(e.target.value);
    document.getElementById("wiggleValue").textContent = wiggle;
});

document.getElementById("k").addEventListener("input", (e) => {
    k = e.target.value;
    document.getElementById("kValue").textContent = k;
});

document.getElementById("collisionRadius").addEventListener("input", (e) => {
    collisionRadius = e.target.value;
    document.getElementById("collisionRadiusValue").textContent = collisionRadius;
});

document.getElementById("alignmentRadius").addEventListener("input", (e) => {
    alignmentRadius = e.target.value;
    document.getElementById("alignmentRadiusValue").textContent = alignmentRadius;
});

document.getElementById("attractionRadius").addEventListener("input", (e) => {
    attractionRadius = e.target.value;
    document.getElementById("attractionRadiusValue").textContent = attractionRadius;
    gridSize = attractionRadius; // Update grid size when attraction radius changes
});

document.getElementById("pauseButton").addEventListener("click", () => {
    isPaused = !isPaused;
    document.getElementById("pauseButton").textContent = isPaused ? "Reprendre" : "Pause";
});

document.getElementById("resetButton").addEventListener("click", () => {
    initializeFish();
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    // Add the new position to the shark's trail
    sharkTrail.push({ x: mouseX, y: mouseY });

    // Limit the trail length
    if (sharkTrail.length > sharkTrailLength) {
        sharkTrail.shift(); // Remove the oldest point if the trail is too long
    }
});

// Reset mouse position and trail when it leaves the canvas
canvas.addEventListener('mouseleave', () => {
    mouseX = null;
    mouseY = null;
    sharkTrail = []; // Clear the trail when the mouse leaves the canvas
});


let sharkRadius = 100;

document.getElementById("sharkRadius").addEventListener("input", (e) => {
    sharkRadius = parseInt(e.target.value);
    document.getElementById("sharkRadiusValue").textContent = sharkRadius;
});



initializeFish();
animate();
