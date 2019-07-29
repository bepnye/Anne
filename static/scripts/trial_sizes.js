// Setup svg using Bostock's margin convention

function generateBars(clusterData) {

	var margin = {top: 20, right: 160, bottom: 75, left: 70};

	var width = 960 - margin.left - margin.right,
			height = 500 - margin.top - margin.bottom;

	var svg = d3.select("body")
		.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");


  var dataset = [];
  $.each(clusterData, function (i, cluster) {
    var ss = 0;
    $.each(cluster, function (j, doc) {
      dataset.push({ x: i, y0: ss, y: doc.sample_size, pmid: doc.pmid })
      ss += doc.sample_size;
    });
  });

	// Set x, y and colors
	var x = d3.scale.ordinal()
		.domain(dataset.map(function(d) { return d.x; }))
		.rangeRoundBands([10, width-10], 0.02);

	var y = d3.scale.linear()
		.domain([0, d3.max(dataset, d => d.y0 + d.y)])
		.range([height, 0]);

	// Define and draw axes
	var yAxis = d3.svg.axis()
		.scale(y)
		.orient("left")

	var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom")
    .tickFormat(function(d, i) { return 'Intervention group ' + d; });

	svg.append("g")
		.attr("class", "y axis")
		.call(yAxis);

	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis)
    .selectAll("text")  
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-35)");


  var xSpace = 4;
  var ySpace = 1;
	svg.selectAll(".rect")
      .data(dataset)
		.enter()
      .append("rect")
      .style("fill", function(d) { return 'grey'; })
      .style("stroke", function(d) { return 'black'; })
      .on("click", function(d) { window.open("http://0.0.0.0:8081/browse/ben/"+d.pmid); })
      .attr("x", function(d) { return x(d.x) + xSpace/2; })
      .attr("y", function(d) { return y(d.y0 + d.y); })
      .attr("height", function(d) { return y(d.y0) - y(d.y0 + d.y) - ySpace; })
      .attr("width", x.rangeBand() - xSpace);

	// Prep the tooltip bits, initial display is hidden
	var tooltip = svg.append("g")
		.attr("class", "tooltip")
		.style("display", "none");
			
	tooltip.append("rect")
		.attr("width", 30)
		.attr("height", 20)
		.attr("fill", "white")
		.style("opacity", 0.5);

	tooltip.append("text")
		.attr("x", 15)
		.attr("dy", "1.2em")
		.style("text-anchor", "middle")
		.attr("font-size", "12px")
		.attr("font-weight", "bold");
}
