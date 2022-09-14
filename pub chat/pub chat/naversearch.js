const express = require("express");
//const mysql = require('./index');
const router = express.Router();
const app = express();

var client_id = "1X0_0qUDXgUF0rzUaf1o";
var client_secret = "b9TEFftCp_";

let data;
const jsonParser = express.json();
const urlencodedParser = express.urlencoded({ extended: false });

app.set("/views", __dirname + "/views");
app.set("view engine", "ejs");

router.get("/", function (req, res) {
  res.sendfile(__dirname + "/naver_api_index.html");
});

router.post("/", urlencodedParser, async (req, res) => {
  data = req.body.data;
  var api_url =
    "https://openapi.naver.com/v1/search/webkr?query=" +
    encodeURI(data) +
    "&display=100"; // json 결과
  console.log(data);
  //   var api_url = 'https://openapi.naver.com/v1/search/blog.xml?query=' + encodeURI(req.query.query); // xml 결과
  var request = require("request");
  var options = {
    url: api_url,
    headers: {
      "X-Naver-Client-Id": client_id,
      "X-Naver-Client-Secret": client_secret,
    },
  };
  request.get(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      let newsItems = JSON.parse(body).items; //items - title, link, description, pubDate
      const newsArray = [];
      for (let i = 0; i < newsItems.length; i++) {
        let newsItem = {};
        newsItem.title = newsItems[i].title.replace(/(<([^>]+)>)|&quot;/gi, ""); //나머지 아이템들 생략
        newsItem.link = newsItems[i].link.replace(/(<([^>]+)>)|&quot;/gi, "");
        newsItem.description = newsItems[i].description.replace(
          /(<([^>]+)>)|&quot;/gi,
          ""
        );
        newsArray.push(newsItem);
      }
      //    res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
      //    res.end(body);
      //res.json(newsArray);
      var context = { result: newsArray };
      app.render("webList.ejs", context, function (err, html) {
        if (err) {
          console.error("뷰 렌더링 중 오류 발생 : " + err.stack);
          res.writeHead("200", { "Content-Type": "text/html;charset=utf8" });
          res.write("<h2>뷰 렌더링 중 오류 발생</h2>");
          res.write("<p>" + err.stack + "</p>");
          res.end();
          return;
        }
        res.end(html);
      });
    } else {
      res.status(response.statusCode).end();
      console.log("error = " + response.statusCode);
    }
  });
});

app.use(
  express.json({
    limit: "50mb",
  })
);

module.exports = router;
