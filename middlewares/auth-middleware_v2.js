const jwt = require("jsonwebtoken");
const { User } = require("../models");
const SECRET_KEY = "Ludin_World";
module.exports = (req, res, next) => {
  const { authorization } = req.headers;
  const [authType, authToken] = (authorization || "").split(" ");

  if (!authToken || authType !== "Bearer") {
    res.status(401).send({
      errorMessage: "로그인 후 이용 가능한 기능입니다. req header에 authorization:  Bearer [띄어쓰기] 받으신 토큰값을 넣어주세요",
    });
    return;
  }

  try {
    const { userId } = jwt.verify(authToken, SECRET_KEY);
    User.findByPk(userId).then((user) => {
      res.locals.user = user;
      next();
    });
  } catch (err) {
    res.status(401).send({
      errorMessage: "로그인 후 이용 가능한 기능입니다.",
    });
  }
};