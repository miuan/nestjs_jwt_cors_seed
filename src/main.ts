import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import * as path from 'path';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as cors from 'cors';
import * as session from 'express-session';
import { ApplicationModule } from './app.module';
import * as flash from 'connect-flash';

import * as mongoose from 'mongoose';

const corsConfig = {
  origin: ['http://example.com','http://localhost:3001'], 
  credentials: true
}

const PORT = process.env.PORT || 3000;
const DB_NAME = process.env.DB_NAME || 'nestjs-jwt-cors-seed';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || '';
const DB_PASS = process.env.DB_PASS || '';

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule);
  
  
  
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cors(corsConfig));
  
  
  app.use(express.static(path.join(__dirname, 'assets')));
  
  await app.listen(PORT);

  console.log(`app listen on port ${PORT}`);
}

mongoose.connect(`mongodb://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}`);
bootstrap();

// const API_USER_ID = process.env.API_USER_ID || 'API_USER_ID';
// const API_SECRET = process.env.DB_NAAPI_SECRETME || 'API_SECRET';
// const TOKEN_STORAGE = process.env.TOKEN_STORAGE || '/tmp/';

// // SendPulse's Node.JS Library: https://github.com/sendpulse/sendpulse-rest-api-node.js
// var sendpulse = require("sendpulse");
// sendpulse.init(API_USER_ID,API_SECRET,TOKEN_STORAGE);

// var email = {
//   "html" : "<p>Your email content goes here</p>",
//   "text" : "Your email text version goes here",
//   "subject" : "Testing SendPulse API",
//   "from" : {
//     "name" : "Your Sender Name",
//     "email" : "milan.medlik@gmail.com"
//   },
//   "to" : [ { 
//     "name" : "Subscriber's name",
//     "email" : "milan.medlik@gmail.com" 
//   } ]
// };
// var answerGetter = function answerGetter(data){
//     console.log(data);
// }
// sendpulse.smtpSendMail(answerGetter,email);