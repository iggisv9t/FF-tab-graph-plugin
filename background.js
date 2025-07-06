// Listen for extension icon click to open visualization.html in a tab
browser.action.onClicked.addListener(() => {
  browser.tabs.create({ url: browser.runtime.getURL('visualization.html') });
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_OPEN_TABS') {
    browser.tabs.query({}).then(tabs => {
      const urls = tabs.map(tab => tab.url);
      sendResponse({urls});
    });
    return true;
  }
  if (request.type === 'FOCUS_TAB' && request.url) {
    browser.tabs.query({url: request.url}).then(tabs => {
      if (tabs && tabs.length > 0) {
        browser.tabs.update(tabs[0].id, {active: true});
        browser.windows.update(tabs[0].windowId, {focused: true});
      }
      sendResponse({success: true});
    });
    return true;
  }
  if (request.type === 'OPEN_TAB' && request.url) {
    browser.tabs.create({url: request.url}).then(() => {
      sendResponse({success: true});
    });
    return true;
  }
  if (request.type === 'getHistory') {
    const days = request.days || 7;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    browser.history.search({
      text: '',
      startTime: startDate.getTime(),
      endTime: endDate.getTime(),
      maxResults: 1000
    }).then(async (results) => {
      // results is a list of history items (URLs), not visits!
      // For each, fetch visits with visitId/referringVisitId
      let allVisits = [];
      for (const item of results) {
        try {
          const visits = await browser.history.getVisits({ url: item.url });
          // Add url to each visit
          visits.forEach(v => v.url = item.url);
          allVisits = allVisits.concat(visits);
        } catch (e) {
          // skip if error
        }
      }

      // Build node map: url -> node, and visitId -> node
      const urlNodeMap = new Map();
      const visitIdNodeMap = new Map();
      const nodes = [];

      allVisits.forEach(visit => {
        let node = urlNodeMap.get(visit.url);
        if (!node) {
          node = {
            url: visit.url,
            visitIds: [],
            referringVisitIds: []
          };
          urlNodeMap.set(visit.url, node);
          nodes.push(node);
        }
        node.visitIds.push(visit.visitId);
        if (visit.referringVisitId) {
          node.referringVisitIds.push(visit.referringVisitId);
        }
        visitIdNodeMap.set(visit.visitId, node);
      });

      // Now build edges: for each node, for each referringVisitId, find node with that visitId
      const edges = [];
      nodes.forEach(targetNode => {
        targetNode.referringVisitIds.forEach(refId => {
          const sourceNode = visitIdNodeMap.get(refId);
          if (sourceNode) {
            edges.push({
              source: sourceNode.url,
              target: targetNode.url,
              visitId: refId
            });
          }
        });
      });

      // Remove referringVisitIds from output nodes for clarity
      nodes.forEach(node => { delete node.referringVisitIds; });

      const graphData = {
        nodes,
        edges,
        visits: allVisits
      };

      sendResponse(graphData);
      return true; // Keep the message channel open
    });
  }
  return true;
});
