class GraphVisualizer {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.container = document.getElementById('graphContainer');
        this.container.appendChild(this.renderer.domElement);
        
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        
        this.isLayoutActive = true;
        this.nodes = new Map();
        this.edges = [];
        this.setupScene();
    }

    setupScene() {
        this.camera.position.z = 5;
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        // Add point light
        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(10, 10, 10);
        this.scene.add(pointLight);
    }

    async loadHistory(days) {
        const result = await browser.runtime.sendMessage({
            type: 'getHistory',
            days: days
        });
        
        this.clearGraph();
        this.createGraph(result);
        this.updateDebugTable(result);
    }

    createGraph(data) {
        // Create nodes
        data.nodes.forEach(node => {
            const geometry = new THREE.SphereGeometry(0.1, 32, 32);
            const material = new THREE.MeshPhongMaterial({
                color: 0x44aaff,
                emissive: 0x072534,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.x = Math.random() * 4 - 2;
            mesh.position.y = Math.random() * 4 - 2;
            mesh.position.z = Math.random() * 4 - 2;
            mesh.userData = {
                url: node.url,
                visitIds: Array.from(node.visitIds)
            };
            this.scene.add(mesh);
            this.nodes.set(node.url, mesh);
        });

        // Create edges
        data.edges.forEach(edge => {
            const points = [];
            const source = this.nodes.get(edge.source);
            const target = this.nodes.get(edge.target);
            if (source && target) {
                points.push(source.position.clone());
                points.push(target.position.clone());
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const material = new THREE.LineBasicMaterial({ color: 0x888888 });
                const line = new THREE.Line(geometry, material);
                this.scene.add(line);
                this.edges.push({
                    line,
                    source,
                    target,
                    visitId: edge.visitId
                });
            }
        });

        this.startForceLayout();
    }

    clearGraph() {
        // Remove all nodes and edges
        this.nodes.forEach(node => this.scene.remove(node));
        this.edges.forEach(edge => this.scene.remove(edge.line));
        this.nodes.clear();
        this.edges = [];
    }

    updateDebugTable(data) {
        const tbody = document.getElementById('edgesTableBody');
        tbody.innerHTML = '';
        
        data.edges.forEach(edge => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${edge.source}</td>
                <td>${edge.target}</td>
                <td>${edge.visitId}</td>
            `;
            tbody.appendChild(row);
        });
    }

    startForceLayout() {
        if (this.layoutAnimation) {
            cancelAnimationFrame(this.layoutAnimation);
        }
        
        this.layoutAnimation = requestAnimationFrame(() => this.forceLayout());
    }

    forceLayout() {
        if (!this.isLayoutActive) return;

        this.nodes.forEach(node => {
            const force = new THREE.Vector3(
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01
            );
            node.position.add(force);
        });

        // Update edge positions
        this.edges.forEach(edge => {
            const points = edge.line.geometry.attributes.position.array;
            points[0] = edge.source.position.x;
            points[1] = edge.source.position.y;
            points[2] = edge.source.position.z;
            points[3] = edge.target.position.x;
            points[4] = edge.target.position.y;
            points[5] = edge.target.position.z;
            edge.line.geometry.attributes.position.needsUpdate = true;
        });

        this.layoutAnimation = requestAnimationFrame(() => this.forceLayout());
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    setupEventListeners() {
        // Node hover handling
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        this.container.addEventListener('mousemove', (event) => {
            mouse.x = (event.clientX / this.container.clientWidth) * 2 - 1;
            mouse.y = -(event.clientY / this.container.clientHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, this.camera);
            const intersects = raycaster.intersectObjects(Array.from(this.nodes.values()));

            if (intersects.length > 0) {
                const intersected = intersects[0].object;
                intersected.material.emissive.setHex(0xff0000);
                
                // Highlight connected edges
                this.edges.forEach(edge => {
                    if (edge.source === intersected || edge.target === intersected) {
                        edge.line.material.color.setHex(0xff0000);
                    }
                });
            } else {
                // Reset colors
                this.nodes.forEach(node => node.material.emissive.setHex(0x072534));
                this.edges.forEach(edge => edge.line.material.color.setHex(0x888888));
            }
        });

        // Node click handling
        this.container.addEventListener('click', (event) => {
            mouse.x = (event.clientX / this.container.clientWidth) * 2 - 1;
            mouse.y = -(event.clientY / this.container.clientHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, this.camera);
            const intersects = raycaster.intersectObjects(Array.from(this.nodes.values()));

            if (intersects.length > 0) {
                const node = intersects[0].object;
                alert(`URL: ${node.userData.url}\nVisit IDs: ${node.userData.visitIds.join(', ')}`);
            }
        });
    }
}

// Initialize visualization
const visualizer = new GraphVisualizer();
visualizer.animate();
visualizer.setupEventListeners();

// Setup UI event handlers
document.getElementById('loadButton').addEventListener('click', () => {
    const days = parseInt(document.getElementById('daysInput').value);
    visualizer.loadHistory(days);
});

document.getElementById('toggleLayout').addEventListener('click', () => {
    visualizer.isLayoutActive = !visualizer.isLayoutActive;
    if (visualizer.isLayoutActive) {
        visualizer.startForceLayout();
    }
});
