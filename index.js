import express from 'express';
import bodyParser from  'body-parser';
import crypto from 'crypto';
import cors from 'cors';
import http from 'http';
import {Server as Socket} from 'socket.io';
import process from 'node:process';
import {PoolConfig, initDB, insertMessage, selectMessages, insertUser, getUsers} from './DbManager.js';


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


const port = 3000;
app.get('/', (req, res) => {
  console.log(req.params);
  res.status(200).send('Hello World!');
  return;
})

const users = await getUsers();
const session = {};

app.post('/login', async (req, res) => {
    const {login , password} = req.body;
    if(!(login && password))
    
    return res.status(400).send({msg : "your request not contain login or password"});
    const passwordHash = crypto.createHash('sha1').update(password).digest('hex');
    const fnd = await users.find( e  => passwordHash === e.password && login === e.login);
             
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

app.post('/messages/send', async (req, res) => {
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
  socket.get().emit("message", objMsg);
  socket.get().broadcast.emit("message", objMsg);
  const {content,date} = objMsg;
  await insertMessage(login,content, date);
  return res.status(204).send()
});

app.get('/messages', async (req, res) => {
  console.log('on get messages msgs ...');
  const {authorization} = req.headers;
  const login = checkAuthorization(authorization);
  console.log('on get messages msgs checkAuthorization', )
  if(!login) return res.status(401).send("unauthorized");
  console.log("authorizantion done ...");
  //const {dateAfterTs} = req.query;
  //const respMsgs = (dateAfterTs) ? msgs.filter(m => m.date > dateAfterTs) : msgs;
  const respMsgs = await selectMessages();
  console.log('get messages msgs :', respMsgs.length);
  return res.status(200).send(respMsgs)
});

app.post('/inscription', async (req, res) => {
  const {firstName, lastName, login , password, email} = req.body;
  if(!(firstName && lastName && login && password && email))
  return res.status(400).send({msg : "your request are not completed"});
  const hashPwd = crypto.createHash('sha1').update(password).digest('hex');
  //console.log(hashPwd);
  await insertUser(firstName, lastName, login , hashPwd, email);
  return res.status(200).send('user added !')
})

server.listen(port, async() => {
  await initDB();
  await PoolConfig.getPool();
  // init pool
  console.log(`Example app listening on port ${port}`)
});


const cleanPool =  async (code) =>  {
  console.log('clean DB Pool ...');
  await PoolConfig.endPool();
};

process.on('exit',cleanPool);
// catches ctrl+c event
process.on('SIGINT', cleanPool);
// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1',cleanPool);
process.on('SIGUSR2',cleanPool);;
// catches uncaught exceptions
process.on('uncaughtException',cleanPool);

