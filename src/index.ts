import express from 'express';
import bodyParser from  'body-parser';
import crypto from 'crypto';
import cors from 'cors';
import http from 'http';
import {Server, Socket} from 'socket.io';
import process from 'node:process';
import jsonwebtoken, { JwtPayload } from 'jsonwebtoken';
import {PoolConfig, initDB, insertMessage, selectMessages, insertUser, getUsers} from './DbManager.js';
import { Sessions } from './types.js';


const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors : {
    origin : "*"
  }
});

const jwt = jsonwebtoken;
const secretSign = "jsonwebtokenSecret";

const socketManager = () =>{
  let socket : Socket|undefined ;
  return {
    set : (sct :  Socket|undefined ) => { socket = sct},
    get : () => socket
  }
};

const socket = socketManager();

io.on('connection', (inputSocket) => {
  console.log('user connected');
  socket.set(inputSocket);
  /*socket.get().on('disconnect', function () {
    console.log('user disconnected');
  });*/
});


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json() ); 
app.use(cors({origin : "*"}));


const port = 3000;
app.get('/', (req, res) => {
  console.log(req.params);
  res.status(200).send('Hello World!');
  return;
});



const session : Sessions= {};

app.post('/login', async (req, res) => {
    const {login , password} = req.body;
    if(!(login && password))
    return res.status(400).send({msg : "your request not contain login or password"});

    const users = await getUsers();
    const passwordHash = crypto.createHash('sha1').update(password).digest('hex');
    if(!users ){
      return res.status(401).send("unaurized"); ;
    }
    const fnd = await users.find( e  => passwordHash === e.password && login === e.login);
             
    if(!fnd) return res.status(401).send("unaurized");
    
    const experationDate = new Date();
    experationDate.setSeconds(experationDate.getSeconds()+300);
    const token = jwt.sign({login,experationDate},secretSign);
    //const hashPwd = crypto.createHash('sha1').update(login+password+experationDate).digest('hex');
    session[token] = {login:login, experationDate};
    console.log("user session : ", session);
    return res.status(200).send({token});
});

const checkAuthorization = (authorization :string | undefined) =>{
  if(!authorization) return false;
  const verif : JwtPayload  = jwt.verify(authorization, secretSign) as JwtPayload;
  console.log("payload verificatrion :", verif);
  const {login} = verif;
  if(Date.parse(verif.experationDate) < Date.now()) return false;
  return login;
};

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
  const objMsg = {login , date : Date.now(), content : msg};

  const sckt = socket.get();
  if(!sckt) {
    return res.status(500).send({connection : "connection problem on server side"}) ;
  }
  sckt.emit("message", objMsg);
  sckt.broadcast.emit("message", objMsg);
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
  const respMsgs = (await selectMessages()) || [] ;
  console.log('get messages msgs :', respMsgs.length);
  return res.status(200).send(respMsgs)
});

app.post('/inscription', async (req, res) => {
  const {first_name, last_name, login , password, email} = req.body;
  console.log(first_name, last_name, login , password, email);
  if(!(first_name && last_name && login && password && email))
  return res.status(400).send({msg : "your request are not completed"});
  const hashPwd = crypto.createHash('sha1').update(password).digest('hex');
  await insertUser(first_name, last_name, login , hashPwd, email);
  return res.status(200).send('user added !')
});

server.listen(port, async() => {
  await initDB();
  await PoolConfig.getPool();
  // init pool
  console.log(`Example app listening on port ${port}`)
});


const cleanPool =  async () =>  {
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

