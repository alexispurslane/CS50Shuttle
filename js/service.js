/**
 * service.js
 *
 * Computer Science 50
 * Problem Set 8
 *
 * Implements a shuttle service.
 */
// Stuff
Array.prototype.is = function (f, sec) {
  if (f(this)) {
    return this;
  } else {
    return sec;
  }
};

Array.prototype.count = function (f) {
  var count = 0;
  this.forEach(function (e) {
    count += f(e) ? 1 : 0;
  });
  return count;
};

Array.prototype.foreach = function () {
  if (arguments.length === 1) {
    return this.forEach(arguments[0]);
  } else {
    if (this.length === 0) {
      return arguments[1]();
    } else {
      return this.forEach(arguments[0]);
    }
  }
};
function omap(o, f) {
  var result = {};
  for (var k in o) {
    if (o.hasOwnProperty(k)) {
      var fr = f(o[k], k);
      if (fr.toString === '[object Object]') {
        result[fr.k] = fr.v;
      } else {
        result[k] = fr;
      }
    }
  }
  return result;
}
function oforeach() {
  var k,
      f,
      o,
      e;
  if (arguments.length === 1) {
    f = arguments[1];
    o = arguments[0];
    for (k in o) {
      if (o.hasOwnProperty(k)) {
        f(o[k], k);
      }
    }
  } else {
    f = arguments[1];
    e = arguments[2];
    o = arguments[0];
    if (o !== {}) {
      for (k in o) {
        if (o.hasOwnProperty(k)) {
          f(o[k], k);
        }
      }
    } else {
      e();
    }
  }
}
function ofilter(o, f) {
  var result = {};
  for (var k in o) {
    if (o.hasOwnProperty(k) && f(o[k], k)) {
      result[k] = o[k];
    }
  }
  return result;
}

// default height
var HEIGHT = 0.8;

// default latitude
var LATITUDE = 42.3745615030193;

// default longitude
var LONGITUDE = -71.11803936751632;

// default heading
var HEADING = 1.757197490907891;

// default number of seats
var SEATS = 10;

// default velocity
var VELOCITY = 50;

// global reference to shuttle's marker on 2D map
var bus = null;

// global referance to shuttle's symbol
var busSymbol = null;

// global reference to 3D Earth
var earth = null;

// global reference to 2D map
var map = null;

// global reference to shuttle
var shuttle = null;

// global list of all people to be shuttled
var people = [];

// load version 1 of the Google Earth API
google.load('earth', '1');

// load version 3 of the Google Maps API
google.load('maps', '3', {
  other_params: 'sensor=false'
});

// once the window has loaded
$(window)
.load(function () {

  // listen for keydown anywhere in body
  $(document.body)
  .keydown(function (event) {
    return keystroke(event, true);
  });

  // listen for keyup anywhere in body
  $(document.body)
  .keyup(function (event) {
    return keystroke(event, false);
  });

  // listen for click on Drop Off button
  $('#dropoff')
  .click(function (event) {
    dropoff();
  });

  // listen for click on Pick Up button
  $('#pickup')
  .click(function (event) {
    pickup();
  });

  // load application
  load();
});

// unload application
$(window)
.unload(function () {
  unload();
});

/**
 * Renders seating chart.
 */
function chart() {
  var html = '<ol start="0">';
  shuttle.seats.foreach(function  (seat) {
    if (seat === null) {
      html += '<li>Empty Seat</li>';
    } else {
      html += '<li>' + seat.person.name + ' to ' + seat.person.house + '</li>';
    }
  });
  html += '</ol>';
  $('#chart')
  .html(html);
}

/**
 * Drops up passengers if their stop is nearby.
 */
function dropoff() {
  var iss = [];
  oforeach(
    ofilter(HOUSES, function (house, k) {
      return shuttle.distance(house.lat, house.lng) <= 30;
    }), function (house, k) {

      shuttle.seats.filter(function (seat, i) {
        return seat !== null && seat.person.house === k && iss.push(i);
      }).foreach(function (seat, i) {
        $('#announcements').html('You have dropped off ' + seat.person.name + ' here.');
        var iInSeats = iss[i];
        shuttle.seats[iInSeats] = null;
      }, function () {
        $('#announcements').html('You have no passengers here that you can drop off here.');
      });

  }, function () {
    $('#announcements').html('There are no houses nearby.');
  });
  chart();
}

/**
 * Called if Google Earth fails to load.
 */
function failureCB(errorCode) {
  // report error unless plugin simply isn't installed
  if (errorCode != ERR_CREATE_PLUGIN) {
    alert(errorCode);
  }
}

/**
 * Handler for Earth's frameend event.
 */
function frameend() {
  shuttle.update();
}

/**
 * Called once Google Earth has loaded.
 */
function initCB(instance) {
  // retain reference to GEPlugin instance
  earth = instance;

  // specify the speed at which the camera moves
  earth.getOptions()
  .setFlyToSpeed(100);

  // show buildings
  earth.getLayerRoot()
  .enableLayerById(earth.LAYER_BUILDINGS, true);

  // disable terrain (so that Earth is flat)
  earth.getLayerRoot()
  .enableLayerById(earth.LAYER_TERRAIN, false);

  // prevent mouse navigation in the plugin
  earth.getOptions()
  .setMouseNavigationEnabled(false);

  // instantiate shuttle
  shuttle = new Shuttle({
    heading: HEADING,
    height: HEIGHT,
    latitude: LATITUDE,
    longitude: LONGITUDE,
    planet: earth,
    seats: SEATS,
    velocity: VELOCITY
  });
  busSymbol.rotation = shuttle.position.heading;

  // synchronize camera with Earth
  google.earth.addEventListener(earth, 'frameend', frameend);

  // synchronize map with Earth;
  google.earth.addEventListener(earth.getView(), 'viewchange', viewchange);

  // update shuttle's camera
  shuttle.updateCamera();

  // show Earth
  earth.getWindow()
  .setVisibility(true);

  // render seating chart
  chart();

  // populate Earth with passengers and houses
  populate();
}

/**
 * Handles keystrokes.
 */
function keystroke(event, state) {
  // ensure we have event
  if (!event) {
    event = window.event;
  }

  // left arrow
  if (event.keyCode === 37) {
    shuttle.states.turningLeftward = state;
    return false;
  }

  // up arrow
  else if (event.keyCode === 38) {
    shuttle.states.tiltingUpward = state;
    return false;
  }

  // right arrow
  else if (event.keyCode === 39) {
    shuttle.states.turningRightward = state;
    return false;
  }

  // down arrow
  else if (event.keyCode === 40) {
    shuttle.states.tiltingDownward = state;
    return false;
  }

  // A, a
  else if (event.keyCode === 65 || event.keyCode === 97) {
    shuttle.states.slidingLeftward = state;
    return false;
  }

  // D, d
  else if (event.keyCode === 68 || event.keyCode === 100) {
    shuttle.states.slidingRightward = state;
    return false;
  }

  // S, s
  else if (event.keyCode === 83 || event.keyCode === 115) {
    shuttle.states.movingBackward = state;
    return false;
  }

  // W, w
  else if (event.keyCode === 87 || event.keyCode === 119) {
    shuttle.states.movingForward = state;
    return false;
  }

  return true;
}

/**
 * Loads application.
 */
function load() {
  // embed 2D map in DOM
  var latlng = new google.maps.LatLng(LATITUDE, LONGITUDE);
  busSymbol = {
    path: FORWARD_CLOSED_ARROW,
    strokeColor: 'black',
    fillColor: 'green',
    rotation: 0
  };
  map = new google.maps.Map($('#map')
                            .get(0), {
                              center: latlng,
                              disableDefaultUI: true,
                              mapTypeId: google.maps.MapTypeId.ROADMAP,
                              scrollwheel: false,
                              zoom: 17,
                              zoomControl: true
                            });

                            // prepare shuttle's icon for map
                            bus = new google.maps.Marker({
                              icon: busSymbol,
                              map: map,
                              title: 'you are here'
                            });

                            // embed 3D Earth in DOM
                            google.earth.createInstance('earth', initCB, failureCB);
}

/**
 * Picks up nearby passengers.
 */
function pickup() {
  people.filter(function (person, i) {
    return shuttle.distance(person.mark.position.lat(), person.mark.position.lng()) <= 15;
  }).foreach(function (person, i) {
    var nextSeat = shuttle.seats.indexOf(null);
    if (nextSeat !== -1) {
      shuttle.seats[nextSeat] = person;
      $('#announcements').html(person.person.name + ' has been picked up!');

      var features = earth.getFeatures();
      features.removeChild(person.place);

      person.mark.setMap(null);
    } else {
      $('#announcements').html('You have no room!');
    }
  }, function () {
    $('#announcements').html('There is nobody around to pick up!');
  });
  chart();
}

/**
 * Populates Earth with passengers and houses.
 */
function populate() {
  // mark houses
  for (var house in HOUSES) {
    // plant house on map
    new google.maps.Marker({
      icon: 'https://google-maps-icons.googlecode.com/files/home.png',
      map: map,
      position: new google.maps.LatLng(HOUSES[house].lat, HOUSES[house].lng),
      title: house
    });
  }

  // get current URL, sans any filename
  var url = window.location.href.substring(0, (window.location.href.lastIndexOf('/')) + 1);

  // scatter passengers
  PASSENGERS.foreach(function (passenger, i) {
    // pick a random building
    var building = BUILDINGS[Math.floor(Math.random() * BUILDINGS.length)];

    // prepare placemark
    var placemark = earth.createPlacemark('');
    placemark.setName(passenger.name + ' to ' + passenger.house);

    // prepare icon
    var icon = earth.createIcon('');
    icon.setHref(url + '/img/' + passenger.username + '.jpg');

    // prepare style
    var style = earth.createStyle('');
    style.getIconStyle()
    .setIcon(icon);
    style.getIconStyle()
    .setScale(4.0);

    // prepare stylemap
    var styleMap = earth.createStyleMap('');
    styleMap.setNormalStyle(style);
    styleMap.setHighlightStyle(style);

    // associate stylemap with placemark
    placemark.setStyleSelector(styleMap);

    // prepare point
    var point = earth.createPoint('');
    point.setAltitudeMode(earth.ALTITUDE_RELATIVE_TO_GROUND);
    point.setLatitude(building.lat);
    point.setLongitude(building.lng);
    point.setAltitude(0.0);

    // associate placemark with point
    placemark.setGeometry(point);

    // add placemark to Earth
    earth.getFeatures()
    .appendChild(placemark);

    // add marker to map
    var marker = new google.maps.Marker({
      icon: 'https://maps.gstatic.com/intl/en_us/mapfiles/ms/micons/man.png',
      map: map,
      position: new google.maps.LatLng(building.lat, building.lng),
      title: passenger.name + ' at ' + building.name
    });
    people.push({place: placemark, mark: marker, point: point, person: passenger});
  });
}

/**
 * Handler for Earth's viewchange event.
 */
function viewchange() {
  // keep map centered on shuttle's marker
  var latlng = new google.maps.LatLng(shuttle.position.latitude, shuttle.position.longitude);
  map.setCenter(latlng);
  bus.setPosition(latlng);
}

/**
 * Unloads Earth.
 */
function unload() {
  google.earth.removeEventListener(earth.getView(), 'viewchange', viewchange);
  google.earth.removeEventListener(earth, 'frameend', frameend);
}
