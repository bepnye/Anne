var i = 0,
		duration = 300,
		root,
		treemap;

var margin = {top: 20, right: 20, bottom: 20, left: 20},
    width = 900 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

var treeSvg, treeData;

function drawTreeData() {

  treeSvg.selectAll('*').remove();
  
  d3.select("#orderRadio").style("visibility", "hidden")

  var height = 600;
  var width = 3000 - margin.left - margin.right;
  treeSvg.attr('width', width);
  treeSvg.attr('height', height);
	// declares a tree layout and assigns the size
	treemap = d3.tree().size([height, width]);

	// Assigns parent, children, height, depth
  console.log(treeData);
	root = d3.hierarchy(treeData, function(d) { return d.children; });
	root.x0 = height / 2;
	root.y0 = 0;

	// Collapse after the second level
	if(root.children){
	  root.children.forEach(collapse);
	}
  console.log(root);
	update(root);
}

// Collapse the node and all it's children
function collapse(d) {
  if(d.children) {
    d._children = d.children
    d._children.forEach(collapse)
    d.children = null
  }
}

function update(source) {
  console.log(root);

  // Assigns the x and y position for the nodes
  var treeData = treemap(root);

  // Compute the new tree layout.
  var nodes = treeData.descendants(),
      links = treeData.descendants().slice(1);

  // Normalize for fixed-depth.
  //nodes.forEach(function(d){ d.y = d.depth * 180 + 50});
  nodes.forEach(function(d){ d.y = 100 + d.depth*250; });

  // ****************** Nodes section ***************************

  // Update the nodes...
  var node = treeSvg.selectAll('g.node')
      .data(nodes, function(d) {return d.id || (d.id = ++i); });

  // Enter any new modes at the parent's previous position.
  var nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr("transform", function(d) {
        return "translate(" + source.y0 + "," + source.x0 + ")";
    })
    .on('click', click)
    .on('mouseenter', function(d) {
      //showDiseaseTooltip(d.data.uid, d3.event.pageX+15, d3.event.pageY-25);
    })
    .on('mouseout', function(d) {
      //hideDiseaseTooltip();
    });

  // Add Circle for the nodes
  nodeEnter.append('circle')
      .attr('class', 'node')
      .attr('r', 1e-6)
      .style("fill", function(d) {
          return d._children ? "lightsteelblue" : "lightsteelblue";
      })
      .style('stroke', function(d) {
          return d._children ? "black" : "#fff";
      });

  // Add labels for the nodes
  nodeEnter.append('text')
      .attr("dy", ".35em")
      .attr("x", function(d) {
          return d.children || d._children ? -13 : 13;
      })
      .attr("text-anchor", function(d) {
          return d.children || d._children ? "end" : "start";
      })
      .text(function(d) { return d.data.name; });

  // UPDATE
  var nodeUpdate = nodeEnter.merge(node);

  // Transition to the proper position for the node
  nodeUpdate.transition()
    .duration(duration)
    .attr("transform", function(d) { 
        return "translate(" + d.y + "," + d.x + ")";
     });

  // Update the node attributes and style
  nodeUpdate.select('circle.node')
    .attr('r', 10)
    .style("fill", function(d) {
        return d._children ? "lightsteelblue" : "lightsteelblue";
    })
    .style('stroke', function(d) {
        return d._children ? "black" : "grey";
    })
    .attr('cursor', 'pointer');


  // Remove any exiting nodes
  var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) {
          return "translate(" + source.y + "," + source.x + ")";
      })
      .remove();

  // On exit reduce the node circles size to 0
  nodeExit.select('circle')
    .attr('r', 1e-6);

  // On exit reduce the opacity of text labels
  nodeExit.select('text')
    .style('fill-opacity', 1e-6);

  // ****************** links section ***************************

  // Update the links...
  var link = treeSvg.selectAll('path.link')
      .data(links, function(d) { return d.id; });

  // Enter any new links at the parent's previous position.
  var linkEnter = link.enter().insert('path', "g")
      .attr("class", "link")
      .attr('d', function(d){
        var o = {x: source.x0, y: source.y0}
        return diagonal(o, o)
      });

  // UPDATE
  var linkUpdate = linkEnter.merge(link);

  // Transition back to the parent element position
  linkUpdate.transition()
      .duration(duration)
      .attr('d', function(d){ return diagonal(d, d.parent) });

  // Remove any exiting links
  var linkExit = link.exit().transition()
      .duration(duration)
      .attr('d', function(d) {
        var o = {x: source.x, y: source.y}
        return diagonal(o, o)
      })
      .remove();

  // Store the old positions for transition.
  nodes.forEach(function(d){
    d.x0 = d.x;
    d.y0 = d.y;
  });

  // Creates a curved (diagonal) path from parent to the child nodes
  function diagonal(s, d) {

    path = `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`

    return path
  }

  // Toggle children on click.
  function click(d) {
    if (d3.event.shiftKey) {
      rootMesh = d.data.uid;
      addMeshFilter(d.data.uid, true);
    } else if (d3.event.altKey) {
      addMeshFilter(d.data.uid, false);
    } else {
      if (d.children) {
          d._children = d.children;
          d.children = null;
        } else {
          d.children = d._children;
          d._children = null;
        }
      update(d);
    }
  }

  function doubleclick(d) {
  }
}
