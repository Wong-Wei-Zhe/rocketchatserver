var express = require("express");
var session = require("express-session");
const cors = require("cors");
var util = require("util");
var encoder = new util.TextEncoder("utf-8");
var app = express();
var bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
var axios = require("axios");
const { response } = require("express");
var MongoDBStore = require("connect-mongodb-session")(session);
var store = new MongoDBStore({
  uri: "mongodb://localhost:27017/connect_mongodb_session_test",
  collection: "mySessions",
  ttl: 86400000,
});
app.use(
  session({
    secret: "dfwoiefewwnecwencwnfhrgfgrfrty84fwir767",
    saveUninitialized: false,
    cookie: { maxAge: 86400000 },
    resave: false,
    //store: store,
  })
);
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const rocketAdmToken = "v6NXIvR02JMdnFkH_iGqj_IamFH8fM_v5Xbh5g5Bgou";
const rocketAdmId = "qZAXL5edmFjHgkXba";
const ROCKETCHAT_SERVER = "http://159.223.32.155/3005/";
const ROCKETCHAT_API = `${ROCKETCHAT_SERVER}api/v1/`;
const axiosConfig = {
  headers: {
    "X-Auth-Token": rocketAdmToken,
    "X-User-Id": rocketAdmId,
  },
};

app.use(cors());

// app.use((req, res, next) => {
//   let allowedOrigins = ["http://localhost:3001", "http://159.223.32.155:3005"];
//   let origin = req.headers.origin;
//   if (allowedOrigins.includes(origin)) {
//     res.header("Access-Control-Allow-Origin", origin);
//   }
//   //res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Credentials", "true");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Access-Control-Allow-Headers, Origin , Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers"
//   );

//   next();
// });

app.post("/getuser", function (req, res) {
  if (req.body.username) {
    axios
      .get(
        `${ROCKETCHAT_API}users.info?username=${req.body.username}`,
        axiosConfig
      )
      .then(function (response) {
        if (response.data.success === true) {
          res.send({ user: response.data.user, search_status: "success" });
        }
      })
      .catch(function (error) {
        res.status(404).send(error.response.data.error);
      });
  } else {
    res.status(400).send("Bad Request");
  }
});

app.post("/rocket_sso", function (req, res) {
  var userPayload = {
    username: req.body.username,
    email: req.body.email,
    pass: req.body.pass,
    name: req.body.displayname,
  };

  req.session.username = userPayload.username;
  req.session.email = userPayload.email;
  req.session.pass = userPayload.pass;
  req.session.displayname = userPayload.name;

  if (userPayload.username) {
    //Check if username exist
    axios
      .get(
        `${ROCKETCHAT_API}users.info?username=${userPayload.username}`,
        axiosConfig
      )
      .then(function (response) {
        //If found, login user
        if (response.data.success === true) {
          if (response.data.user.username) {
            axios
              .post(`${ROCKETCHAT_API}login`, {
                username: userPayload.username,
                password: userPayload.pass,
              })
              .then(function (response) {
                if (response.data.status === "success") {
                  req.session.userauthtoken = response.data.data.authToken;
                  req.session.save();
                  res.set("Content-Type", "application/json");
                  res
                    .status(200)
                    .send({ loginToken: response.data.data.authToken });
                  // res.send(`<script>
                  // window.parent.postMessage({
                  // 	event: 'login-with-token',
                  // 	loginToken: '${response.data.data.authToken}'
                  // }, 'http://localhost:3005'); // rocket.chat's URL
                  // </script>`);
                }
              });
          }
        }
      })
      .catch(function (error) {
        //if no user found, register
        axios
          .post(`${ROCKETCHAT_API}users.register`, {
            username: userPayload.username,
            email: userPayload.email,
            pass: userPayload.pass,
            name: userPayload.name,
          })
          .then(function (response) {
            if (response.data.success) {
              return axios.post(`${ROCKETCHAT_API}login`, {
                username: userPayload.username,
                password: userPayload.pass,
              });
            }
          })
          .then(function (response) {
            if (response.data.status === "success") {
              req.session.userauthtoken = response.data.data.authToken;
              req.session.save();
              res.set("Content-Type", "application/json");
              res
                .status(200)
                .send({ loginToken: response.data.data.authToken });
              //       res.set("Content-Type", "text/html");
              //       res.send(`<script>
              // window.parent.postMessage({
              // 	event: 'login-with-token',
              // 	loginToken: '${response.data.data.authToken}'
              // }, 'http://localhost:3005'); // rocket.chat's URL
              // </script>`);
            }
          })
          .catch(function (error) {
            res.sendStatus(401);
          });
      });
  }
});

app.post("/rocket_auth_get", function (req, res) {
  res.status(200).send({
    loginToken: req.session.userauthtoken,
  });
});

app.post("/rocket_iframe", function (req, res) {
  return res.send(`<script>
				window.parent.postMessage({
					event: 'login-with-token',
					loginToken: '${req.session.userauthtoken}'
				}, ${ROCKETCHAT_SERVER}); // rocket.chat's URL
				</script>`);
});

app.post("/rocket_check_channel", function (req, res) {
  console.log("WIP");
});

app.post("/rocket_create_channel", function (req, res) {
  console.log("WIP");
});

app.get("/testapi", function (req, res) {
  if (req.session.userdata) {
    res.send("not first time");
  } else {
    req.session.userdata = "hehe";
    res.send("first time");
  }
});

app.get("/testapiapi", function (req, res) {
  if (req.session.userdata) {
    res.send("not first time");
  } else {
    req.session.userdata = "hehe";
    res.send("first time");
  }
});

app.listen(3032, function () {
  console.log("Example app listening on port 3032!");
});
