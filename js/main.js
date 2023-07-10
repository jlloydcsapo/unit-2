var map;
var minValue;
var dataStats = {}; 

//create map and load data
function loadMap(){

    //create map instance
    map = L.map('map').setView([29.53,-36.607], 2);

    //add OSM base layer
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
		}).addTo(map);

    getData();
};

function calcStats(data){

    //create empty array to store all data values
    var allValues = [];

    //loop through each marathon
    for(var marathon of data.features){

        for(var year = 2015; year <= 2021; year+=1){

              var attributes = [];
              //get total time in second for each marathon for each year
              var attr1 = marathon.properties[String(year) +" - Men"]
              attributes.push(attr1);

              var attr2 = marathon.properties[String(year) +" - Women"];
              attributes.push(attr2);

              value = calcPropAttrValue(attributes);
        
              //add value to array only if non-zero
              if (value > 0) {
                allValues.push(value);
              }

        }
    }
    //get minimum value of our array
    minValue = Math.min(...allValues)

    //get min, max, mean stats for our array
    dataStats.min = 3
    dataStats.max = Math.max(...allValues);
    //calculate meanValue
    var sum = allValues.reduce(function(a, b){return a+b;});
    dataStats.mean = sum/ allValues.length;

    return minValue
};

function formatLegendText(time){
    var avgTime = time/2;
    var hours = Math.floor(avgTime/3600);
    var minutesInSec = avgTime % 3600;
    var minutes = Math.floor(minutesInSec/60);

    var formattedMinutes = minutes < 10 ? minutes.toString().padStart(2,'0') : minutes;

    var secs = Math.floor(minutesInSec % 60);

    var formattedSecs = secs < 10 ? secs.toString().padStart(2,'0') : secs;

    var text = hours + ':' + formattedMinutes + ':' + formattedSecs;   

    return text;
};

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {

    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;
    
    //Flannery Apperance Compensation formula (adjusted)

    var radius = 1.0083 * Math.pow(attValue/minValue,0.75) * minRadius

    //if radius is 0, set to 3
    radius = radius == 0 ? 3
     : radius;

    console.log('radius:' + radius)
    return radius*2;
};

//create proportional symbols
function createPropSymbols(data, attributes){

    L.geoJSON(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);

};

//calculate attribute value used for proportionality
function calcPropAttrValue(attr) {

    var times = [];

    //extract times from attributes
    times = extractMarathonTime(attr);

    //add extracted times together to obtain attribute value
    return times[0] + times[1];
};

//function to extract numberic time from attribute string
function extractMarathonTime(attr) {

    var timesInSeconds = [];
    var timeInSeconds;
    var time;
    var hours;
    var min;
    var sec;
    
    //for each element on the array, do the following...
    attr.forEach(element => {

        //if race was cancelled, default time to 0
        if ( element == 'cancelled') {
            timeInSeconds = 0;
            timesInSeconds.push(timeInSeconds);
        } else {
            //extract time from attribute string
            time = element.substring((element.length-8),(element.length-1));
            hours = Number(time.substring(0,1));
            min = Number(time.substring(2,4));
            sec = Number(time.substring(5,7));
          
            //convert time to seconds
            timeInSeconds = (hours * 3600) + (min * 60) + sec;   
            
            //add converted time to times array
            timesInSeconds.push(timeInSeconds);
        }    
    });

    return timesInSeconds;
};

function createPopupContent(properties, attributes){
    var popupContent = "<p><b> Marathon: </b> " + properties['Marathon'] + "</p>";

    popupContent += "<p><b>" + attributes[0] + " :</b> " + properties[attributes[0]] + "</p>";
    popupContent += "<p><b>" + attributes[1] + " :</b> " + properties[attributes[1]] + "</p>";

    return popupContent;
};

function pointToLayer(feature, latlng, attributes) {
 
     var geojsonMarkerOptions = {
         fillColor: "#826ab8",
         color: "#000",
         weight: 1,
         opacity: 1,
         fillOpacity: 0.8
     };
    
     console.log(feature.properties['Marathon']);
            
    //empty array to hold times passed into calcPropAttrValue
    var calcAtttributes = [];
    calcAtttributes.push(feature.properties[attributes[0]]);
    calcAtttributes.push(feature.properties[attributes[1]]);
            
    //get attribute value to be used
    var attValue = calcPropAttrValue(calcAtttributes);
           
    //calculate radius
    radius = calcPropRadius(attValue);

    geojsonMarkerOptions.radius = calcPropRadius(attValue);

    //create circle marker layer
    layer = L.circleMarker(latlng, geojsonMarkerOptions);

    //build popup content string
    var popupContent = createPopupContent(feature.properties, attributes);
     
    layer.bindPopup(popupContent, {
            offset: new L.Point(0,-geojsonMarkerOptions.radius) 
    });
          
    return layer;
};

function updatePropSymbols(attributes){
    map.eachLayer(function(layer){
    
        if (layer.feature && layer.feature.properties[attributes[0]]
                && layer.feature.properties[attributes[1]]){
            //access feature properties
            var props = layer.feature.properties;
            
            //empty array to hold times passed into calcPropAttrValue
            var calcAtttributes = [];
            calcAtttributes.push(props[attributes[0]]);
            calcAtttributes.push(props[attributes[1]]);
            
            //get attribute value to be used
            var attValue = calcPropAttrValue(calcAtttributes);
           
            //calculate radius
            var radius = calcPropRadius(attValue);
            
            layer.setRadius(radius);
            
            if (radius == 6) {
                layer.setStyle({fillColor: 'red'});
            } else {
                layer.setStyle({fillColor: "#826ab8" })
            };
            

            //build popup content string
            var popupContent = createPopupContent(props, attributes);

            //update popup content            
            popup = layer.getPopup();            
            popup.setContent(popupContent).update();
         
        }
        
    });

    updateLegend(attributes);
    
};

function createSequenceControls(attributes){
    var SequenceControl = L.Control.extend({
            options: {
                position: 'bottomleft'
            },

            onAdd: function() {
                //create control container div 
                var container = L.DomUtil.create('div', 'sequence-control-container');
                
                //add slider
                container.insertAdjacentHTML('beforeend', '<input class="range-slider" type = "range">')
                
                //add skip buttons
                container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse"><img src="img/reverse-button.png"></button>'); 
                container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward"><img src="img/forward-button.png"></button>');
                
                //disable any mouse event listeners for the container
                L.DomEvent.disableClickPropagation(container);

                return container
            }
        });

    map.addControl(new SequenceControl());


    //set slider attributes
    document.querySelector(".range-slider").max = 12;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 2;


    //click listener for buttons
    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
            var index = document.querySelector('.range-slider').value;

            //increment or decrement depending on button clicked
            if (step.id == 'forward'){
                console.log('forward');
                index = +index + 2;
                //if past the last attribute, wrap around to first attribute
                index = index > 12 ? 0 : index;
                console.log(index);

            } else if (step.id == 'reverse'){
                console.log('reverse');
                index = index - 2;
                //if past the first attribute, wrap around to last attribute
                index = index < 0 ? 12 : index;
                console.log(index);
            };

            //update slider
            document.querySelector('.range-slider').value = index;

            //empty array to hold both attributes needed to update prop symbols
            updatePropAttributes = [];

            updatePropAttributes.push(attributes[index]);
            updatePropAttributes.push(attributes[index + 1]);
            console.log(updatePropAttributes)
            updatePropSymbols(updatePropAttributes);
        });
    });

    //input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function(){            
        var index = this.value
        console.log(index)
        
        updatePropAttributes = [];

        updatePropAttributes.push(attributes[index]);
        updatePropAttributes.push(attributes[index + 1]);
            
        updatePropSymbols(updatePropAttributes);
    });

};

//create circle markers for legend
function createCircleSVG(){
    var svg = '<svg id="attribute-legend" width="200px" height="130px">';
            
    //array of circle names to base loop on
     var circles = ["max", "mean", "min"];

    for (var i=0; i<circles.length; i++){

        var textY = i * 20 + 10;            
    
        var text = formatLegendText(dataStats[circles[i]]);
        
        //scale proportionally for visual cues
        var radius = calcPropRadius(dataStats[circles[i]]) * 2;  
        console.log(radius)
        var cy =55 - radius;  
        
       //text string
       if (circles[i] == "min") {
        //circle string  
       svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + 12 + '"cy="' + 43 + '" fill="#d60f12" fill-opacity="0.8" stroke="#000000" cx="30"/>';
       svg += '<text font-family="Verdana, sans-serif" font-size="12px" id="' + circles[i] + '-text" x="65" y="' + textY + '"> Cancelled </text>';  
       }  else {
        console.log('circle raidus: ' + radius);
        svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#d19aea" fill-opacity="0.8" stroke="#000000" cx="30"/>';  
        svg += '<text font-family="Verdana, sans-serif" font-size="12px" id="' + circles[i] + '-text" x="65" y="' + textY + '">' + text  + '</text>';
       };      
 
    };
     

    //close svg string
    svg += "</svg>";

    return svg
};

//create legend
function createLegend() {
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function () {
            var container = L.DomUtil.create('div', 'legend-control-container');
           
            var legendContent = "<h2><b>Avg Marathon Times - 2015 </b> </h2>";

            //add legend content
            container.innerHTML = legendContent;

            var svg = createCircleSVG()

            //add attribute legend svg to container
            container.insertAdjacentHTML('beforeend',svg);
            
            return container;
        }
    });

    map.addControl(new LegendControl());
};

//update legend
function updateLegend(attributes) {
    var legend =  document.querySelector(".legend-control-container")
    var year = attributes[0].substring(0,4);

    var legendContent = "<h2><b>Avg Marathon Times - " + year + "</b></h2>";
    
    legend.innerHTML = legendContent

    var svg = createCircleSVG()

    //add attribute legend svg to container
    legend.insertAdjacentHTML('beforeend',svg);
};

function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("-") > -1){
            attributes.push(attribute);
        };
    };

    //check result
    console.log(attributes);

    return attributes;
};

function getData(){
    //load geoJSON data
    fetch("data/marathonWinners.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
             //create an attributes array
            var attributes = processData(json);
            //calculate minimum data value
            minValue = calcStats(json);

            //call function to create proportional symbols
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
            createLegend(attributes)
        })
};

document.addEventListener('DOMContentLoaded', loadMap);