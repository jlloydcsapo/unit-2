var map;
var minValue;

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

function calculateMinValue(data){

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
    var minValue = Math.min(...allValues)
    console.log('Minimum value:' + minValue)
    return minValue;
}

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {

    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;
    
    //Flannery Apperance Compensation formula (adjusted)
    var radius = 1.0083 * Math.pow(attValue/minValue,0.75) * minRadius

    //if radius is 0, set to 3
    radius = radius == 0 ? 3 : radius;

    console.log('radius:' + radius)
    return radius;
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

function pointToLayer(feature, latlng, attributes) {

     //attributes to be used to determine proportional size
     var attr1 = attributes[0];
     var attr2 = attributes[1];
 
 
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
    calcAtttributes.push(feature.properties[attr1]);
    calcAtttributes.push(feature.properties[attr2]);
            
    //get attribute value to be used
    var attValue = calcPropAttrValue(calcAtttributes);
           
    //calculate radius
    radius = calcPropRadius(attValue);

    geojsonMarkerOptions.radius = calcPropRadius(attValue);

    //create circle marker layer
    layer = L.circleMarker(latlng, geojsonMarkerOptions);

    //build popup content string
    var popupContent = "<p><b> Marathon: </b> " + feature.properties['Marathon'] + "</p>";

    popupContent += "<p><b>" + attr1 + " :</b> " + feature.properties[attr1] + "</p>";
    popupContent += "<p><b>" + attr2 + " :</b> " + feature.properties[attr2] + "</p>";

   
     
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

            //build popup content string
            var popupContent = "<p><b> Marathon: </b> " + props.Marathon+ "</p>";

            popupContent += "<p><b>" + attributes[0] + " :</b> " + props[attributes[0]] + "</p>";
            popupContent += "<p><b>" + attributes[1] + " :</b> " + props[attributes[1] ] + "</p>";

            //update popup content            
            popup = layer.getPopup();            
            popup.setContent(popupContent).update();
        }
    });
};

function createSequenceControls(attributes){
    //create range input element (slider)
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend',slider);

    //set slider attributes
    document.querySelector(".range-slider").max = 12;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 2;

    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="reverse"></button>');
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="forward"></button>');

    document.querySelector('#reverse').insertAdjacentHTML('beforeend',"<img src='img/reverse-button.png'>");
    document.querySelector('#forward').insertAdjacentHTML('beforeend',"<img src='img/forward-button.png'>");

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
            minValue = calculateMinValue(json);

            //call function to create proportional symbols
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
        })
};

document.addEventListener('DOMContentLoaded', loadMap);