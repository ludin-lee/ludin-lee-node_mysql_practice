const jwt = require("jsonwebtoken");
const { User } = require("../models");
const SECRET_KEY = "Ludin_World";

module.exports = (req, res, next) => {
  const  cookie  = req.cookies['token'];

  
  const [authType, authToken] = (cookie || "").split(" ");
  // console.log(authToken,authType)
  if (!authToken || authType !== "Bearer") {
    res.status(401).send({
      errorMessage: "로그인 후 이용 가능한 기능입니다.",
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