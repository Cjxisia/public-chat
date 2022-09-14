const express = require("express");
const { response } = require("express");
const nunjucks = require("nunjucks"); //랜더링 필수 패키지
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const naverroute = require("./naversearch");
const mysql = require("mysql"); //mysql모듈 사용

const connection = mysql.createConnection({
  //mysql의 데이터베이스 연동
  host: "localhost",
  user: "root",
  password: "ijj2848",
  database: "pubchat_db",
});

connection.connect();

app.set("view engine", "html");

nunjucks.configure("./views", {
  express: app,
});

app.use("/", express.static("./public"));

app.get("/", (req, res) => {
  //메인 페이지
  res.render("main.html");
});

app.get("/login", (req, res) => {
  //로그인 페이지
  res.render("main2.html");
});

app.use("/naverapi", naverroute);

var num = 0;
var people_cnt = 0;
var lid = 0;

io.on("connection", function (socket) {
  //http와 node js가 가지고있는 핸들러를 socket으로 이관
  console.log("user connected : ", socket.id);

  people_cnt++; //접속자 수 체크

  num++;

  var name = "guest" + num + ": "; //비로그인 닉네임
  var lname = lid + ": "; //로그인 닉네임

  var count = "접속자수: " + people_cnt + "명";
  io.emit("name count", count);

  socket.on("disconnect", function () {
    //접속 해제
    people_cnt--; //접속이 끊어졌을 때 접속자수 감소
    count = "접속자수: " + people_cnt + "명";
    io.emit("name count", count);
    console.log("user disconnected : ", socket.id);
  });

  socket.on("send message", function (text) {
    //비 로그인 메시지 전송
    var message = name + text;

    console.log(message);
    io.emit("receive message", message); //receive message이벤트임을 클라이언트에게 message와 함께 전송
  });

  socket.on("login send message", function (text) {
    //로그인 메세지 전송
    var message = lname + text;
    console.log(message);
    io.emit("receive message", message);
  });

  socket.on("login", function (id, pw) {
    //로그인 처리
    var empty = "0"; //공백
    var success = "1"; //성공
    var wrong = "2"; //틀림

    if (!(id || pw)) {
      console.log("아이디혹은 패스워드가 공백입니다."); //아이디가 공백일 시
      socket.emit("state", empty);
    } else {
      connection.query(
        "select * from users where id = ?",
        [id],
        function (error, results) {
          if (results.length <= 0) {
            //id가 존재하지 않을시 입력한 내용으로 회원가입
            connection.query(
              "INSERT INTO users (id, password) VALUES (?, ?)",
              [id, pw],
              function (error) {
                if (error) {
                  console.log("mysql 오류입니다.");
                } else {
                  console.log("정상적으로 등록됐습니다.");
                }
              }
            );
          } else {
            connection.query(
              //id가 존재할시 패스워드 확인
              "select * from users where id = ? AND password = ?",
              [id, pw],
              function (error, results) {
                if (results.length <= 0) {
                  console.log("비밀번호가 틀렸습니다.");
                  socket.emit("state", wrong);
                } else {
                  console.log("로그인 완료!");
                  lid = id;
                  socket.emit("state", success);
                }
              }
            );
          }
        }
      );
    }
  });
});

http.listen(3000, function (req, res) {
  //서버와 오픈
  console.log("server running~~ port : 3000");
});
