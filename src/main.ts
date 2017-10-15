import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import * as path from 'path';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as cors from 'cors';
import * as session from 'express-session';
import * as passport from 'passport';
import { ApplicationModule } from './app.module';
import { PassportService } from './passport.service';
import * as flash from 'connect-flash';

import * as mongoose from 'mongoose';

const corsConfig = {
  origin: ['http://example.com','http://localhost:3001'], 
  credentials: true
}

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule);
  
  
  
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cors(corsConfig));
  
  
  app.use(express.static(path.join(__dirname, 'assets')));
  
  await app.listen(PORT);

  console.log(`app listen on port ${PORT}`);
}

mongoose.connect('mongodb://localhost/g4t');
bootstrap();
