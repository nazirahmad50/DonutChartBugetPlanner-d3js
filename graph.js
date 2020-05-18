const dims = {height:300, width: 300, r:150};
const cent = {x:(dims.width / 2 + 5), y:(dims.height / 2 + 5)};

const svg = d3.select(".canvas").append("svg")
    .attr("width", dims.width + 150) // extra space for the legend
    .attr("height", dims.width + 150)

const graph = svg.append("g")
    .attr("transform", `translate(${cent.x},${cent.y})`);

 // generate angles of pie
const pie = d3.pie()
    .sort(null) // dont sort the data into any kind of order
    .value(d => d.cost);

    // generate path based on the pie angles
const arcPath = d3.arc()
    .outerRadius(dims.r)
    .innerRadius(dims.r / 2);

// ordinal scale
const color = d3.scaleOrdinal(d3["schemeSet3"]);

// legends
const legendGroup = svg.append("g")
    .attr("transform", `translate(${dims.width + 40},${10})`)

const legend = d3.legendColor()
    .shape("circle")
    .scale(color)
    .shapePadding(10);

// tooltip
const tip = d3.tip()
    .attr("class", "tip card")
    .html(d => {
        let content = `<div class="name">${d.data.name}</div>`;
        content += `<div class="cost">${d.data.cost}</div>`;
        content += `<div class="delete">Click slice to delete</div>`;
        return content;
    });

graph.call(tip);

const update = (data) =>{

    // update color scale domain
    color.domain(data.map(d => d.name))

    // call the legend as the 'color' ordina lscale depends on 'data'
    legendGroup.call(legend);
    legendGroup.selectAll("text").attr("fill", "white")

    const paths = graph.selectAll("path")
        .data(pie(data));

    paths // will automatically pass the data to this function
        .transition().duration(750)
            .attrTween("d", arcTweenUpdate);

    paths.exit()
    .transition().duration(750)
        .attrTween("d", arcTweenExit)
        .remove();

    paths.enter()
        .append("path")
        .attr("class", "arc")
        .attr("stroke", "#fff")
        .attr("stroke-width", 3)
        .attr("fill", d => color(d.data.name))
        .each(function(d){this._current = d})
        .transition().duration(750)
            .attrTween("d", arcTweenEnter); // will automatically pass the data to this function

    // add events
    graph.selectAll("path")
        .on("mouseover", (d,i,n) =>{
            tip.show(d,n[i]) // 'n[i]' is the same as this keyword
            handleMouseOver(d,i,n)
        })
        .on("mouseout", (d,i,n) =>{
            tip.hide();
            handleMouseOut(d,i,n);
        })
        .on("click", handleClick)

};  

var data = [];

db.collection("expenses").onSnapshot(res =>{

    res.docChanges().forEach(change =>{

        const doc = {...change.doc.data(), id:change.doc.id};

        switch (change.type) {
            case "added":
                data.push(doc)
                break;
            case "modified":
                const index = data.findIndex(item => item.id !== doc.id)
                data[index] = doc;
                break;
            case "removed":
                data = data.filter(item => item.id !== doc.id);
                break;
        
            default:
                break;
        }
    });
    
    update(data);
})

const arcTweenEnter = (d) =>{

    var i = d3.interpolate(d.endAngle, d.startAngle);
    return function(t){ // t is time ticker between 0 and 1
        d.startAngle = i(t);
        return arcPath(d);
    }

};

const arcTweenExit = (d) =>{

    var i = d3.interpolate(d.startAngle, d.endAngle);
    return function(t){
        d.startAngle = i(t);
        return arcPath(d);
    }

};

function arcTweenUpdate(d) {

    // interpolate between the two objects
    // the first param is postion 0 and the second param is position 1
    var i = d3.interpolate(this._current, d);

    // update the current prop with new updated data
    this._current = i(1); // calls the second param of 'i' which is 'd'

    return function(t){  // t is time ticker between 0 and 1

        return arcPath(i(t));
    }

};


// event handlers
const handleMouseOver = (d,i,n) =>{

    d3.select(n[i])
      .transition("changeSliceFill").duration(300)
        .attr("fill", "white")
}

const handleMouseOut = (d,i,n) =>{

    d3.select(n[i])
      .transition("changeSliceFill").duration(300)
        .attr("fill", color(d.data.name))

}

// delete pie slice based on click
const handleClick = (d) =>{

    // get references to a particular document based on id and delete it
    db.collection("expenses").doc(d.data.id).delete();

}