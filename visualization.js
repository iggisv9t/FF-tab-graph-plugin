let simulation = null;
let isLayoutRunning = true;

function showError(msg) {
    let errDiv = document.getElementById('extErrorMsg');
    if (!errDiv) {
        errDiv = document.createElement('div');
        errDiv.id = 'extErrorMsg';
        errDiv.style.color = 'white';
        errDiv.style.background = 'red';
        errDiv.style.padding = '10px';
        errDiv.style.margin = '10px';
        errDiv.style.fontWeight = 'bold';
        document.body.insertBefore(errDiv, document.body.firstChild);
    }
    errDiv.textContent = msg;
}

async function fetchHistory(days) {
    if (!window.browser || !browser.runtime || !browser.runtime.sendMessage) {
        showError('Extension messaging not available: browser.runtime is missing.');
        console.error('Extension messaging not available: browser.runtime is missing.');
        return {nodes: [], edges: [], visits: []};
    }
    try {
        console.log('Sending getHistory message to background', days);
        const result = await browser.runtime.sendMessage({ type: 'getHistory', days });
        console.log('Received response from background', result);
        return result;
    } catch (e) {
        showError('Extension messaging failed: ' + e);
        console.error('Extension messaging failed:', e);
        return {nodes: [], edges: [], visits: []};
    }
}

function updateVisitsTable(visits) {
    const tbody = document.getElementById('visitsTableBody');
    tbody.innerHTML = '';
    visits.slice(-10).reverse().forEach(visit => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${visit.visitId}</td><td>${visit.url}</td><td>${visit.visitTime ? new Date(visit.visitTime).toLocaleString() : ''}</td><td>${visit.referringVisitId || ''}</td>`;
        tbody.appendChild(row);
    });
}

async function drawGraph(data) {
    const width = window.innerWidth;
    const height = window.innerHeight - document.getElementById('controls').offsetHeight;
    const svg = d3.select('#graph')
        .attr('width', width)
        .attr('height', height)
        .style('background', '#fff');
    svg.selectAll('*').remove();

    // Prepare nodes and links
    const nodes = data.nodes.map(d => Object.assign({}, d));
    const links = data.edges.map(d => Object.assign({}, d));

    // Get open tab URLs
    let openTabUrls = [];
    try {
        const resp = await browser.runtime.sendMessage({ type: 'GET_OPEN_TABS' });
        openTabUrls = resp.urls || [];
    } catch (e) {
        // ignore
    }
    // Normalize URLs for comparison (strip trailing /)
    const openTabSet = new Set(openTabUrls.map(u => u && u.replace(/\/$/, '')));

    // Simulation
    simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.url).distance(80))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width/2, height/2));

    // Edges
    const link = svg.append('g')
        .attr('stroke', '#aaa')
        .attr('stroke-width', 1.5)
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('class', 'edge');

    // Nodes
    const node = svg.append('g')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .selectAll('circle')
        .data(nodes)
        .enter().append('circle')
        .attr('r', 10)
        .attr('fill', d => openTabSet.has((d.url || '').replace(/\/$/, '')) ? '#f4e542' : '#44aaff')
        .attr('stroke', d => openTabSet.has((d.url || '').replace(/\/$/, '')) ? '#d1a800' : '#fff')
        .attr('stroke-width', d => openTabSet.has((d.url || '').replace(/\/$/, '')) ? 3 : 1.5)
        .call(drag(simulation));

    // Tooltip
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('background', '#fff')
        .style('border', '1px solid #ccc')
        .style('padding', '4px 8px')
        .style('border-radius', '4px')
        .style('display', 'none');

    node.on('mouseover', function(event, d) {
        d3.select(this).attr('fill', '#ff6600');
        link.filter(l => l.source.url === d.url || l.target.url === d.url)
            .attr('stroke', '#ff6600')
            .attr('stroke-width', 3);
        node.filter(n => links.some(l => (l.source.url === d.url && l.target.url === n.url) || (l.target.url === d.url && l.source.url === n.url)))
            .attr('fill', '#ffd580');
        tooltip.style('display', 'block').html(`<strong>${d.url}</strong>`);
    })
    .on('mousemove', function(event) {
        tooltip.style('left', (event.pageX + 10) + 'px')
               .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function(event, d) {
        d3.select(this).attr('fill', openTabSet.has((d.url || '').replace(/\/$/, '')) ? '#f4e542' : '#44aaff');
        link.attr('stroke', '#aaa').attr('stroke-width', 1.5);
        node.attr('fill', n => openTabSet.has((n.url || '').replace(/\/$/, '')) ? '#f4e542' : '#44aaff');
        tooltip.style('display', 'none');
    });

    // Drag
    function drag(simulation) {
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }

    // Zoom
    svg.call(d3.zoom()
        .scaleExtent([0.1, 5])
        .on('zoom', (event) => {
            svg.selectAll('g').attr('transform', event.transform);
        }));

    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
    });
}

function updateDebugTable(edges) {
    const tbody = document.getElementById('edgesTableBody');
    tbody.innerHTML = '';
    edges.forEach(edge => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${edge.source.url || edge.source}</td><td>${edge.target.url || edge.target}</td><td>${edge.visitId}</td>`;
        tbody.appendChild(row);
    });
}

document.getElementById('loadButton').addEventListener('click', async () => {
    const days = parseInt(document.getElementById('daysInput').value);
    const data = await fetchHistory(days);
    drawGraph(data);
    updateDebugTable(data.edges);
    if (data.visits) updateVisitsTable(data.visits);
});

function updateLayoutIndicator() {
    const dot = document.getElementById('layoutDot');
    const status = document.getElementById('layoutStatusText');
    if (isLayoutRunning) {
        dot.style.background = '#28c940';
        status.textContent = 'Layout Active';
    } else {
        dot.style.background = '#bbb';
        status.textContent = 'Layout Disabled';
    }
}

document.getElementById('toggleLayout').addEventListener('click', () => {
    if (!simulation) return;
    isLayoutRunning = !isLayoutRunning;
    updateLayoutIndicator();
    if (isLayoutRunning) {
        simulation.alpha(0.5).restart();
    } else {
        simulation.stop();
    }
});

window.addEventListener('resize', () => {
    if (simulation) {
        drawGraph(simulation.nodes());
    }
});

// Load initial graph on page load
document.addEventListener('DOMContentLoaded', async () => {
    updateLayoutIndicator();
    const days = parseInt(document.getElementById('daysInput').value);
    const data = await fetchHistory(days);
    drawGraph(data);
    updateDebugTable(data.edges);
    if (data.visits) updateVisitsTable(data.visits);
});
