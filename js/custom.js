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
    
    window.slider.noUiSlider.on('update', function() {
      var values = this.get();
      window.min = values[0];
      window.max = values[1];
      renderData();

      $('#sliderValues').html("<div id=\"sliderValues\">"+ window.max + "-July-2016</div>");
    });
    
  }
  $('.play').click(function() {
    if (!window.t) {
      window.t = setInterval(function() {
        if (window.range['max'] == window.max) {
          window.max = window.min // go back to start
        }
        window.slider.noUiSlider.set([null, window.max+1]);
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
    var sum = {}
    for (var l in lines) {
      sum[l] = 0;
    }
    for (var i in window.data) {
      var e = window.data[i];
      var day = new Date(e['Date']).getDate();
      if (day >= window.min && day <= window.max) {
        for (var place in e) {
          if (place != 'Date') {
            var amt = parseInt(e[place]);
            if (isNaN(amt)) continue;
            sum[place] += amt;
          }
        }
      }
    }
    for (var place in sum) {
      var amt = sum[place];
      lines[place].setOptions({strokeWeight: amt / 1000});
      lines[place].infowindow.setContent(place + ': ' + amt);
    }
  }
});