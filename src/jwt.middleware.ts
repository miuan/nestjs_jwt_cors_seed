import { Middleware, NestMiddleware, HttpStatus } from '@nestjs/common';
import { HttpException, } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';

@Middleware()
export class JWTLoggedIn implements NestMiddleware {
    constructor() {}
    resolve() {
      return(req, res, next) => {

        console.log(req.headers);

        // https://kamilmysliwiec.gitbooks.io/nest/content/quick-start/middlewares.html
        const authorization = req.headers['authorization'];
        const Bearer = 'Bearer ';

        // remove Bearer string or keep as is it
        const jwtToken = authorization.indexOf(Bearer) == 0 ? authorization.substr(Bearer.length) : authorization;

        // DEBUG:
        // console.log(authorization);
        // console.log(jwtToken);

        try {
          const verified = jwt.verify(jwtToken, process.env.JWT_TOKEN_SECRET || 'demosecret');
          req.user = verified;
        } catch (ex) {
          
          throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
        
        next();
      }
    }
}
