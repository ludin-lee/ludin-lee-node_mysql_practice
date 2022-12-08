/////////////////////Express & Router 설정//////////////////////
const express = require("express");
const app = express();
const router = express.Router();
app.use(express.json(),);
const port = 5000
/////////////////////SHA-512 단방향 암호 설정//////////////////////
const crypto = require('crypto');
const SHA512 = crypto.createHash('sha512');
const SECRET_KEY = "Ludin_World";

const cookieParser = require('cookie-parser');
app.use(express.urlencoded({ extended: false }),cookieParser(),router);
const {User, Sequelize} = require("./models");

const {Posts} = require("./models");
const {Comments} = require("./models");
const {Likes} = require("./models");
// const {sequelize} = require("./models");
// sequelize.sync({ force: false })   
// .then(() => {console.log('DB연결 성공');})   
// .catch((err) => {console.error(err);})


//회원가입 API
router.post("/signup",async(req,res)=>{
    try{
        const {nickname,password,confirm} = req.body;
        if(password!==confirm){  //패스워드 일치하지 않을 경우
            res.status(412).send({message : "패스워드가 확인란과 일치하지 않습니다"});
            return;
        }

        const existsUsers = await User.findAll({ where:{nickname}})
        if (existsUsers.length) { //닉네임이 중복일 경우
            res.status(412).send({message : "이미 사용중인 닉네임입니다."})
            return;
        }   

        if(password.includes(nickname)){  //패스워드에 닉네임이 포함된 경우
            res.status(412).send({message : "패스워드에 닉네임이 포함되어 있습니다."})
            return;
        }
        if(nickname ===''){
            res.status(412).send({message : "ID형식이 올바르지 않습니다."})
            return;
        }

        if(password ===''){
            res.status(412).send({message : "패스워드 형식이 올바르지 않습니다."})
            return;
        }
        
        
        await User.create({nickname,password})
        res.status(201).send({message : `${nickname}님 회원가입 완료.`});
    }catch(err){
        res.status(400).send({message: "요청한 데이터 형식이 올바르지 않습니다."})
    }
})

//로그인 API
const jwt = require("jsonwebtoken");
router.post("/login", async(req,res)=>{
    try{
        const {nickname,password} = req.body;
        const user = await User.findOne({ attributes: ['userId', 'nickname','password'],where: {nickname}});
        
        
        if(!user|| password !==user.password){  //유저가 없거나 패스워드가 틀렸을 경우
            res.status(412).send({message:"닉네임 또는 패스워드를 확인해주세요"})
            return;
        }
        const existUserId = user.dataValues.userId
        const token = jwt.sign({userId:existUserId},SECRET_KEY, {expiresIn: '60m'})
        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + 60); // 만료 시간을 60분으로 설정합니다.
      
        res.cookie('token',`Bearer ${token}`, {expires: expires});
        // res.cookie( 'token', token, {expires: expires}); // version2 
        return res.status(200).json({token})
        
    }catch(err){
        console.log(err)
        res.status(400).send({message:"로그인에 실패하였습니다.관리자에게 문의해주세요"})
    }
})

//게시글 작성 API  
const authMiddleWare  = require("./middlewares/auth-middleware");   //프론트엔드에서 헤더에 authorization 을 넣어주면 v2로 바꿔주자
const posts = require("./models/posts");
const { json } = require("sequelize");
router.post("/posts", authMiddleWare,async(req,res)=>{
    try{
        const { userId } = res.locals.user; //로그인한 사람의 userId 빼오기
        const { nickname } = res.locals.user;
        const {title,content} = req.body;       

        if(JSON.stringify(req.body)==='{}'){   //body가 전달되지 않았을 경우 
            res.status(412).send({message : "데이터 형식이 올바르지 않습니다."});
        }else if(title.length > 20||title.length===0){     //255까지 되지만 그냥 락 걸어둠,,,
            res.status(412).send({message : "게시글 제목의 형식이 일치하지 않습니다.(1글자 이상 20글자 이하만 가능)"});
        }else if(content.length>255||content===0){
            res.status(412).send({message : "게시글 내용의 형식이 일치하지 않습니다.(1글자 255글자 이하만 가능)"});
        }else{
            await Posts.create({userId,nickname,title,content})
            res.status(201).send({message : `${nickname}님 게시글 등록완료.`});
        }
    }catch(err){
        console.log(err)
        res.status(400).send({message : "게시글 작성에 실패했습니다. 관리자 문의에게 문의해주세요"});
    }
})

//게시글 조회 API
router.get("/posts",authMiddleWare,async(req,res)=>{  
    try{
        const allposts = await Posts.findAll({})
        res.json({ data: allposts});
    }catch(err){
        console.log(err)
        res.status(400).send({message : "게시글 조회에 실패했습니다. 관리자 문의에게 문의해주세요"});
    }
})

//게시글 좋아요
router.put("/posts/:postId/like",authMiddleWare,async(req,res)=>{
    try{
        const {postId} = req.params
        const existPost = await Posts.findOne({where:{postId}})
        const { userId } = res.locals.user;
        const alreadyLike = await Likes.findOne({where:{postId,userId}})
     
        if(!existPost){
            res.status(404).send({message : "게시글이 존재하지 않습니다."});
        }else if(alreadyLike!==null){
            await Likes.destroy({where:{postId,userId}})
            await Posts.decrement({likes:1},{where:{postId}})
            res.status(201).send({message : "게시글에 좋아요를 취소하였습니다."})
        }else{
            await Likes.create({postId,userId})
            await Posts.increment({likes:1},{where:{postId}})
            res.status(201).send({message : "게시글에 좋아요를 등록하였습니다."})
        }
    }catch(err){
        console.log(err)
        res.status(400).send({message : "좋아요에 실패했습니다. 관리자 문의에게 문의해주세요"});
    }

    
})
//좋아요 게시글 조회
router.get("/posts/like",async(req,res)=>{
    try{
        const { userId } = res.locals.user;
        const alllikes = await Likes.findAll({where:{userId}})
        const likesNum = [];
        for(i in alllikes){
            likesNum.push(alllikes[i].postId)
        }
        const likeposts = await Posts.findAll({where:{postId:likesNum}})
        res.json({ data: likeposts});
    }catch(err){
              console.log(err)
        res.status(400).send({message : "게시글 조회에 실패했습니다. 관리자 문의에게 문의해주세요"});
    }
})

//게시글 상세 조회 API
router.get("/posts/:postId",async(req,res)=>{
    try{
        const {postId} = req.params;
        const postDetail = await Posts.findOne({ attributes: ['postId','userId', 'nickname','title','content','createdAt','updatedAt','likes'],where:{postId}})
        const comments = await Comments.findAll({ attributes: ['commentId','postId','userId','comment','createdAt','updatedAt'],where:{postId}})

        res.json({ data: postDetail,comments});
    }catch(err){
        console.log(err)
        res.status(400).send({message : "게시글 조회에 실패했습니다. 관리자 문의에게 문의해주세요"});
    }
})
//게시글 수정
router.put("/posts/:postId",async(req,res)=>{
    try{
        const {postId} = req.params;
        const {title,content} = req.body; 
        const { userId } = res.locals.user;
        
        const userCheck = await Posts.findOne({ attributes: ['postId','userId'],where:{postId}}) //유저 체크용

        if(JSON.stringify(req.body)==='{}'){   //body가 전달되지 않았을 경우 
            res.status(412).send({message : "데이터 형식이 올바르지 않습니다."});
        }else if(title.length > 20||title.length===0){     //255까지 되지만 그냥 락 걸어둠,,,
            res.status(412).send({message : "게시글 제목의 형식이 일치하지 않습니다.(1글자 이상 20글자 이하만 가능)"});
        }else if(content.length>255||content===0){
            res.status(412).send({message : "게시글 내용의 형식이 일치하지 않습니다.(1글자 255글자 이하만 가능)"});
        }else if(userId !==userCheck.userId){   //내가 쓴 게시글이 아닌 경우
            res.status(401).send({message : "게시글이 정상적으로 수정되지 않았습니다."});
        }else{
        await Posts.update({title,content},{where:{postId}})
        res.status(201).send({message : `${postId}번 게시글 수정완료.`});
        }
    }catch(err){
        console.log(err)
        res.status(400).send({message : "게시글 수정에 실패했습니다. 관리자 문의에게 문의해주세요"});
    }
})
//게시글 삭제
router.delete("/posts/:postId", authMiddleWare,async(req,res)=>{
    try{
        const {postId} = req.params;
        const { userId } = res.locals.user;
        const postCheck = await Posts.findOne({ attributes: ['postId','userId'],where:{postId}}) // 유저 체크 및 글 존재여부 체크용
        
        if(postCheck===null){
            res.status(404).send({message : "게시글이 존재하지 않습니다."});
        }else if(userId !==postCheck.userId){   //내가 쓴 게시글이 아닌 경우
            res.status(401).send({message : "게시글이 정상적으로 수정되지 않았습니다."});
        }else{
            await Posts.destroy({where:{postId}})
            res.status(200).send({message : `${postId}번 게시글 삭제완료.`});
        }
    }catch(err){
        console.log(err)
        res.status(400).send({message : "게시글 삭제에 실패했습니다. 관리자 문의에게 문의해주세요"});
    }
})

//댓글 생성
router.post("/comments/:postId", authMiddleWare,async(req,res)=>{
    try{
        const {comment} = req.body;
        const {postId} =req.params
        const { userId } = res.locals.user;
        const { nickname } = res.locals.user;
        const existPosts = await Posts.findOne({ where:{postId}})  //postId 값과 일치하는 글 

        if(existPosts===null){        //해당 글이 없는 경우
            res.status(404).send({message : "없는 게시글입니다. 다시 확인해주세요"});
        }else if(JSON.stringify(req.body)==='{}'){
            res.status(412).send({message : "데이터 형식이 올바르지 않습니다."});
        }else{
            await Comments.create({postId,userId,comment,nickname:nickname})
            res.status(201).send({message : `${postId}번째 글에  ${nickname}님 댓글 등록완료.`});
        }
    }catch(err){
        console.log(err)
        res.status(400).send({message : "댓글 등록에 실패했습니다. 관리자 문의에게 문의해주세요"});
    }
})
//댓글 목록 조회
router.get("/comments/:postId", authMiddleWare,async(req,res)=>{
    try{
    const {postId} =req.params
    const allcomments = await Comments.findAll({ attributes: ['commentId','userId','nickname','comment','createdAt','updatedAt'],where:{postId}})
    res.json({ data: allcomments});
    }catch(err){
        console.log(err)
        res.status(400).send({message : "댓글 조회에 실패했습니다. 관리자 문의에게 문의해주세요"});
    }
})
//댓글 수정
router.put("/comments/:commentId", authMiddleWare,async(req,res)=>{
    try{
        const {commentId} = req.params;
        const {comment} = req.body; 
        const { userId } = res.locals.user;
        const userCheck = await Comments.findOne({ attributes: ['commentId','userId'],where:{commentId}})

        if(JSON.stringify(req.body)==='{}'){   //body가 전달되지 않았을 경우 
            res.status(412).send({message : "데이터 형식이 올바르지 않습니다."});
        }else if(userCheck===null){
            res.status(404).send({message : "댓글이 존재하지 않습니다."});
        }else if(comment.length > 50) {
            res.status(412).send({message : "댓글의 형식이 일치하지 않습니다.(1글자 이상 50글자 이하만 가능)"});
        }else if(userId !==userCheck.userId){   //내가 쓴 게시글이 아닌 경우
            res.status(401).send({message : "게시글이 정상적으로 수정되지 않았습니다."});
        }else{
                await Comments.update({comment},{where:{commentId}})
                res.status(201).send({message : `${commentId}번 게시글 수정완료.`});
        }
    }catch(err){
        console.log(err)
        res.status(400).send({message : "댓글 수정에 실패했습니다. 관리자 문의에게 문의해주세요"});
    }
})
//댓글 삭제
router.delete("/comments/:commentId", authMiddleWare,async(req,res)=>{
    const {commentId} = req.params;
    const { userId } = res.locals.user;
    const commentCheck = await Comments.findOne({ attributes: ['commentId','userId'],where:{commentId}})

    if(commentCheck===null){
        res.status(404).send({message : "댓글이 존재하지 않습니다."});
    }else if(userId !==commentCheck.userId){   //내가 쓴 게시글이 아닌 경우
        res.status(401).send({message : "게시글이 정상적으로 수정되지 않았습니다."});
    }else{
        await Comments.destroy({where:{commentId}})
        res.status(200).send({message : `${commentId}번 댓글 삭제완료.`});
    }
})

//////////////////////////////////////////////////////////////////////
app.listen(port, () => {
    console.log(`Server On : 127.0.0.1:${port}`);
  });