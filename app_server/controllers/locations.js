const request = require('request');
const apiOptions = {
  server: 'http://localhost:3000'
};
if (process.env.NODE_ENV === 'production') {
  apiOptions.server = 'https://boiling-wave-93301.herokuapp.com';
}

const formatDistance = (distance) => {
  let thisDistance = 0;
  /* let unit = 'm';
  if (distance > 1000) {
    thisDistance = parseFloat(distance / 1000).toFixed(1);
    unit = 'km';
  } else {
    thisDistance = Math.floor(distance);
  } */
  let unit = 'miles';
  thisDistance = parseFloat(distance / 1000).toFixed(1);
  thisDistance = thisDistance/1.6;
  return thisDistance + unit;
};

const showError = (req, res, status) => {
  let title = '';
  let content = '';

  if (status === 404) {
    title = '404, page not found';
    content = 'Oh dear, Looks like we can\'t find this page. Sorry';
  } else {
    title = `${status}, something's gone wrong`;
    content = 'Something, somewhere, has gone just a little bit wrong.';
  }
  res.status(status);
  res.render('generic-text', {
    title,
    content
  });
};

const renderHomepage = (req, res, responseBody) => {
  let message = null;
  if (!(responseBody instanceof Array)) {
    message = 'API lookup error';
    responseBody = [];
  } else {
    if (!responseBody.length) {
      message = 'No places found nearby';
    }
  }
  res.render('locations-list',
    {
      title: 'Meal Loc8r - Free meal finder',
      pageHeader: {
        title: 'Meal Loc8r',
        strapLine: 'Find places giving out free meals near you!'
      },
      sidebar: "Meal Loc8r helps you find free meals during the coronavirus pandemic. Many thanks to these great organizations doing their part during these tough times.",
      locations: responseBody,
      message
    }
  );
};

const homelist = (req, res) => {
  const path = '/api/locations';
  
  var IPinfo = require("node-ipinfo");
  //var token = "7f5bc19fbab4c6";
  var token = "";
  var iplng = '';
  var iplat = '';

  var ipAddr = req.headers["x-forwarded-for"];
  if (ipAddr){
    var list = ipAddr.split(",");
    ipAddr = list[list.length-1];
  } else {
    ipAddr = req.connection.remoteAddress;
  }

  var ipinfo = new IPinfo(token);

  console.log("ipaddress:" + ipAddr);

  ipinfo.lookupIp(ipAddr).then((response) => {
    console.log(response);
    var loc = response.loc.split(',');
    var coords = {
        latitude: loc[0],
        longitude: loc[1]
    };
    
    iplng = coords.longitude;
    iplat = coords.latitude;

    console.log(iplng);
    console.log(iplat);

    var requestOptions = {
      url: `${apiOptions.server}${path}`,
      method: 'GET',
      json: {},
      qs: {
        lng: iplng,
        lat: iplat,
        maxDistance: 20
      }
    };
  
    request(
      requestOptions,
      (err, {statusCode}, body) => {
        let data = [];
        if (statusCode === 200 && body.length) {
          data = body.map( (item) => {
            item.distance = formatDistance(item.distance);
            return item;
          });
        }
        renderHomepage(req, res, data);
      }
    );

  });
};

const renderDetailPage = (req, res, location) => {
  res.render('location-info',
    {
      title: location.name,
       pageHeader: {
        title: location.name,
      },
      sidebar: {
        context: 'is on Meal Loc8r because they are one of the many organizations providing free meals during this coronovirus pandemic.',
        callToAction: 'If you would like to pitch in and get your organization listed - please reach out to Shawn@yoodle.com.'
      },
      location
    }
  );
};

const getLocationInfo = (req, res, callback) => {
  const path = `/api/locations/${req.params.locationid}`;
  const requestOptions = {
    url: `${apiOptions.server}${path}`,
    method: 'GET',
    json: {}
  };
  request(
    requestOptions,
    (err, {statusCode}, body) => {
      const data = body;
      if (statusCode === 200) {
        data.coords = {
          lng: body.coords[0],
          lat: body.coords[1]
        }
        callback(req, res, data);
      } else {
        showError(req, res, statusCode);
      }
    }
  );
};

const locationInfo = (req, res) => {
  getLocationInfo(req, res,
    (req, res, responseData) => renderDetailPage(req, res, responseData)
  );
};

const renderReviewForm = (req, res, {name}) => {
  res.render('location-review-form',
    {
      title: `Review ${name} on Loc8r` ,
      pageHeader: { title: `Review ${name}` },
      error: req.query.err
    }
  );
};

const addReview = (req, res) => {
  getLocationInfo(req, res,
    (req, res, responseData) => renderReviewForm(req, res, responseData)
  );
};

const doAddReview = (req, res) => {
  const locationid = req.params.locationid;
  const path = `/api/locations/${locationid}/reviews`;
  const postdata = {
    author: req.body.name,
    rating: parseInt(req.body.rating, 10),
    reviewText: req.body.review
  };
  const requestOptions = {
    url: `${apiOptions.server}${path}`,
    method: 'POST',
    json: postdata
  };
  if (!postdata.author || !postdata.rating || !postdata.reviewText) {
    res.redirect(`/location/${locationid}/review/new?err=val`);
  } else {
    request(
      requestOptions,
      (err, {statusCode}, {name}) => {
        if (statusCode === 201) {
          res.redirect(`/location/${locationid}`);
        } else if (statusCode === 400 && name && name === 'ValidationError') {
          res.redirect(`/location/${locationid}/review/new?err=val`);
        } else {
          showError(req, res, statusCode);
        }
      }
    );
  }
};

module.exports = {
  homelist,
  locationInfo,
  addReview,
  doAddReview
};
