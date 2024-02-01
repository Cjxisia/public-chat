const express = require("express");
const { response } = require("express");
const nunjucks = require("nunjucks"); // 랜더링 필수 패키지
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const naverroute = require("./naversearch");
const mysql = require("mysql"); // mysql 모듈 사용

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "ijj2848",
  database: "pubchat_db",
});

connection.connect();

// 테이블 생성 쿼리
const createTableQuery = `
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL
)
`;

// 테이블 생성 쿼리 실행
connection.query(createTableQuery, function (error) {
  if (error) {
    console.log("테이블 생성 중 오류 발생:", error);
  } else {
    console.log("테이블이 성공적으로 생성되었습니다.");
  }
});

app.set("view engine", "html");

nunjucks.configure("./views", {
  express: app,
});

app.use("/", express.static("./public"));

app.get("/", (req, res) => {
  // 메인 페이지
  res.render("main.html");
});

app.get("/login", (req, res) => {
  // 로그인 페이지
  res.render("main2.html");
});

app.use("/naverapi", naverroute);

let num = 0;
let people_cnt = 0;
let lid = 0;

io.on("connection", function (socket) {
  console.log("user connected : ", socket.id);

  people_cnt++; // 접속자 수 체크
  num++;

  const name = "guest" + num + ": "; // 비로그인 닉네임
  const lname = lid + ": "; // 로그인 닉네임

  const count = "접속자수: " + people_cnt + "명";
  io.emit("name count", count);

  socket.on("disconnect", function () {
    // 접속 해제
    people_cnt--; // 접속이 끊어졌을 때 접속자수 감소
    const count = "접속자수: " + people_cnt + "명";
    io.emit("name count", count);
    console.log("user disconnected : ", socket.id);
  });

  socket.on("send message", function (text) {
    // 비 로그인 메시지 전송
    const message = name + text;

    console.log(message);
    io.emit("receive message", message); // receive message 이벤트임을 클라이언트에게 message와 함께 전송
  });

  socket.on("login send message", function (text) {
    // 로그인 메세지 전송
    const message = lname + text;
    console.log(message);
    io.emit("receive message", message);
  });

  socket.on("login", function (id, pw) {
    // 로그인 처리
    const empty = "0"; // 공백
    const success = "1"; // 성공
    const wrong = "2"; // 틀림

    if (!(id || pw)) {
      console.log("아이디 혹은 패스워드가 공백입니다."); // 아이디가 공백일 시
      socket.emit("state", empty);
    } else {
      connection.query(
        "SELECT * FROM users WHERE id = ?",
        [id],
        function (error, results) {
          if (results.length <= 0) {
            // id가 존재하지 않을 시 입력한 내용으로 회원가입
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
              // id가 존재할 시 패스워드 확인
              "SELECT * FROM users WHERE id = ? AND password = ?",
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

http.listen(3000, function () {
  // 서버와 오픈
  console.log("server running~~ port : 3000");
});
