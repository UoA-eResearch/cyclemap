$(function() {
  function get_query() {
    var url = location.href;
    var qs = url.substring(url.indexOf('#') + 1).split('&');
    for (var i = 0, result = {}; i < qs.length; i++) {
      qs[i] = qs[i].split('=');
      result[qs[i][0]] = decodeURIComponent(qs[i][1]);
    }
    return result;
  }

  var $_GET = get_query();
  
  // Timeline
  
  window.slider = document.getElementById('timeline');
  
  window.min = 0;
  window.max = 30;
  
  function createSlider() {
    noUiSlider.create(window.slider, {
      start: [ window.range.min, window.range.min+1 ],
      step: 1,
      connect: true,
      behaviour: 'tap-drag',
      range: window.range,
      pips: {
        mode: 'steps',
        density: 2
      },
      format: {
        to: function(value) {
          return parseInt(value);
        },
        from: function(value) {
          return parseInt(value);
        }
      }
    });

    //Test 1 start
    //Declaring the variables outside anonymous function for use by update function
    dayAvgTempList = [];
    monthAvgTemp = 0;

    $.get("data/july-2016-auckland-weather-data.csv", function (data) {
      data = $.csv.toObjects(data);

      

      //loop through the data
      for (day in data) {
        daySum = 0;
        //loop through the fields 1-9
        for (var prop in data[day]) {
          //making sure property is one of the hi's or lo's
          if (data[day].hasOwnProperty(prop) && prop != "day") {
            daySum += parseInt(data[day][prop]);
          }
        }
        //average the daySum
        daySum = daySum/8;
        monthAvgTemp += daySum;
        daySum = Math.round(daySum * 10) / 10;
        //push the daySum to a new array
        dayAvgTempList.push(daySum);
      }
      monthAvgTemp = Math.round((monthAvgTemp / data.length) * 10) / 10;
      console.log("month average temp: " + monthAvgTemp);
      console.log(dayAvgTempList);
           
    });  
    //Test 1 end
    
    window.slider.noUiSlider.on('update', function() {
      var values = this.get();
      window.min = values[0];
      window.max = values[1];
      renderData();

      var sliderValuesInner = window.max + ", July, 2016";

      //test 2 generating html based off slider temperatures and month temperature

      //icon string holder
      iconName = "";
      isAboveAvg = false;

      //if sliders same
      if (window.min == window.max){
        console.log("sliders same value");
        //if array value at index slider > month average
        if (dayAvgTempList[window.max] >= monthAvgTemp) {
          //set aboveavg to true
          isAboveAvg = true;
        }
        //else
        else {
          //set above avg to false
          isAboveAvg = false;
        }
      }
      //if sliders different
      else {
        console.log("sliders different")
        //declare sum holder
        rangeSum = 0;
        //loop from the min slider to max slider (inclusive). Offset -1
        for (i =  window.min -1; i <= window.max-1; i++) {
          //cumulative add to the rangeSum
          rangeSum += dayAvgTempList[i];
        }
        //divide Sum by the window.max - (window.min -1) to include the window.min slider
        rangeAvg = rangeSum / (window.max - (window.min -1));
        rangeAvg = Math.round(rangeAvg * 10) / 10;
        console.log("range average: " + rangeAvg);
        console.log("MONTH average: " + monthAvgTemp);
        //if range avg > monthly then icon = sun or aboveAvg = true;
        if (rangeAvg > monthAvgTemp) {
          isAboveAvg = true;
        }
        else {
          isAboveAvg = false;
        }
      }

      if (isAboveAvg) {
        iconName = "sun.svg"
      }
      else {
        iconName = "cloud-drizzle.svg"
      }

      //make the innerHTML string for icon
      weatherIconInner = "<img src=\"assets/icons/"+ iconName +"\"/>";
      //populate the HTML tag with the HTML string
      $('.weather-icon').html(weatherIconInner);

      //test 2 end...

      if (window.min != window.max){
        sliderValuesInner = window.min + " - " + sliderValuesInner;
      }
      var sliderValuesHtml = "<div id=\"sliderValues\">" + sliderValuesInner + "</div>";
      $('#sliderValues').html(sliderValuesHtml);
    });
    
  }
  $('.play').click(function() {
    if (!window.t) {
      window.t = setInterval(function () {
        if (window.range['max'] == window.max) {
          window.min = 0;
          window.max = window.min + 1; // go back to start
          clearInterval(window.t);
          window.t = false;
          $('.play i').text('play_arrow');
        }
        window.slider.noUiSlider.set([window.min+1, window.max+1]);
      }, 1000);
      $('.play i').text('pause');
    } else {
      clearInterval(window.t);
      window.t = false;
      $('.play i').text('play_arrow');
    }
  });

  window.lines = {}

  // Map

  window.map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -36.73522283585339, lng: 174.77256774902344},
    zoom: 11,
    disableDefaultUI: true,
    zoomControl: true
  });
  
  $.getJSON("cycleways.json", function(cw) {
    var nodes = {}
    console.log(cw);
    $.each(cw, function(name) {
      var osm = cw[name].osm;
      for (var nid in osm.node) {
        var n = osm.node[nid];
        nodes[n['@id']] = {'lat': parseFloat(n['@lat']), 'lng': parseFloat(n['@lon'])}
      }
      var path = [];
      for (var i in osm.way.nd) {
        var nr = osm.way.nd[i]['@ref'];
        path.push(nodes[nr]);
      }
      var infowindow = new google.maps.InfoWindow();
      var line = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2,
        map: map,
        position: path[0],
        infowindow: infowindow
      });
      line.addListener('click', function() {
        infowindow.open(map, line);
      });
      lines[name] = line;
    });
    $.get("data/july-2016-auckland-cycle-counter-data.csv", function(data) {
      data = $.csv.toObjects(data);
      var start = new Date(data[0].Date);
      var end = new Date(data[data.length - 1 ].Date);
      window.range = {min: start.getDate(), max: end.getDate()}
      createSlider();
      window.data = data;
      renderData();
    });
  });
  
  function renderData() {
    if (!window.data) return;
    console.log('rendering');
    var daySum = {}
    for (var l in lines) {
      daySum[l] = 0;
    }
    for (var i in window.data) {
      var e = window.data[i];
      var day = new Date(e['Date']).getDate();
      if (day >= window.min && day <= window.max) {
        for (var place in e) {
          if (place != 'Date') {
            var amt = parseInt(e[place]);
            if (isNaN(amt)) continue;
            daySum[place] += amt;
          }
        }
      }
    }
    for (var place in daySum) {
      var amt = daySum[place];
      lines[place].setOptions({strokeWeight: amt / 300});
      lines[place].infowindow.setContent(place + ': ' + amt);
    }
  }
});