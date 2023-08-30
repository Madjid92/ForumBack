import express from 'express';
import bodyParser from  'body-parser';
import crypto from 'crypto';
import cors from 'cors';
import http from 'http';
import {Server as Socket} from 'socket.io'
const app = express();

const server = http.createServer(app);
const io = new Socket(server, {
  cors : {
    origin : "*"
  }
});

const socketManager = () =>{
  let socket ;
  return {
    set : (sct) => { socket = sct},
    get : () => socket
  }

}

const socket = socketManager();

io.on('connection', (inputSocket) => {
  console.log('user connected');
  socket.set(inputSocket);
  /*socket.get().on('disconnect', function () {
    console.log('user disconnected');
  });*/
})


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json() ); 
app.use(cors({origin : "*"}));


const port = 3000


app.get('/', (req, res) => {
  console.log(req.params);
  res.status(200).send('Hello World!');
  return;
})


const users = [
    {login : "madjid" , password: "123"},
    {login : "amine", password :"125"}
]
const session = {};

const msgs = [];

app.post('/login', (req, res) => {
    const {login , password} = req.body;
    if(!(login && password)) 
      return res.status(400).send({msg : "your request not contain login or password"});
    const fnd = users.find( e  => password === e.password && login === e.login);
             
    if(!fnd) return res.status(401).send("unaurized");
    
    const experationDate = new Date();
    experationDate.setSeconds(experationDate.getSeconds()+30000)
    const hashPwd = crypto.createHash('sha1')
              .update(login+password+experationDate).digest('hex');
    session[hashPwd] = {login:login, experationDate};
    console.log(session);
    return res.status(200).send({hashPwd}); 
});

const checkAuthorization = (authorization) =>{
  if(!authorization) return false;
  const userData = session[authorization];
  if(!userData) return false;
  const { login, experationDate} = userData;
  if(experationDate < Date.now() ) return false;
  return login;
}

app.post('/messages/send', (req, res) => {
  console.log("Request on end point : /messages/send");
  const {authorization} = req.headers;
  console.debug(`authorization : ${authorization}`);
  const login = checkAuthorization(authorization);
  console.debug(`login : ${login}`);
  if(!login) return res.status(401).send("unauthorized");
  console.log("req.body :", req.body)
  const {msg} = req.body;
  console.debug(`msg : ${msg}`);
  if(!msg)  return res.status(400).send("no message");
  const objMsg = {login , date : Date.now(), content : msg}
  msgs.push(objMsg);
  socket.get().emit("message", objMsg);
  return res.status(204).send()
});

app.get('/messages', (req, res) => {
  const {authorization} = req.headers;
  const login = checkAuthorization(authorization);
  if(!login) return res.status(401).send("unauthorized");
  const {dateAfterTs} = req.query;
  const respMsgs = (dateAfterTs) ? msgs.filter(m => m.date > dateAfterTs) : msgs;
  return res.status(200).send(respMsgs)
});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
