import * as THREE from 'three';

// OrbitControls implementation from Three.js
// This is a simplified version of OrbitControls
// For full implementation, use the official Three.js OrbitControls

class OrbitControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        this.enableDamping = true;
        this.dampingFactor = 0.05;
        this.screenSpacePanning = false;
        
        this.minDistance = 0;
        this.maxDistance = Infinity;
        
        this.mouse = new THREE.Vector2();
        this.lastMouse = new THREE.Vector2();
        
        this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.domElement.addEventListener('wheel', this.onMouseWheel.bind(this));
    }

    onMouseDown(event) {
        event.preventDefault();
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.lastMouse.copy(this.mouse);
    }

    onMouseMove(event) {
        if (event.buttons === 1) {
            const dx = this.mouse.x - this.lastMouse.x;
            const dy = this.mouse.y - this.lastMouse.y;
            
            // Rotate
            this.camera.rotation.y -= dx * 0.01;
            this.camera.rotation.x -= dy * 0.01;
            
            this.lastMouse.copy(this.mouse);
        }
    }

    onMouseUp() {
        // Reset mouse position
        this.mouse.set(0, 0);
        this.lastMouse.set(0, 0);
    }

    onMouseWheel(event) {
        event.preventDefault();
        
        const delta = event.deltaY * 0.01;
        const distance = this.camera.position.length();
        const newDistance = Math.max(this.minDistance, Math.min(this.maxDistance, distance - delta));
        
        this.camera.position.setLength(newDistance);
    }

    update() {
        if (this.enableDamping) {
            this.camera.rotation.x *= 1 - this.dampingFactor;
            this.camera.rotation.y *= 1 - this.dampingFactor;
        }
    }
}

export { OrbitControls };
