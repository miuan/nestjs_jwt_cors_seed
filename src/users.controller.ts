import { Controller, Get, Post, Req, Res, Next, HttpStatus, Body, Headers   } from '@nestjs/common';
import { HttpException } from '@nestjs/core';

import 'dotenv/config';
import * as jwt from 'jsonwebtoken';
import * as randomtoken from 'random-token';

import  {UserAlreadyExistError, UserPasswordToSimpleError} from './lib/users.lib';
import {UsersService} from './users.service';

@Controller()
export class UsersController {

	public env = {
	       AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
	       AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
	       AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL
	}

	constructor(public usersService : UsersService){

	}

	@Post('/api/signup')
	public async signup(@Body() body, @Res() res, @Next() next) {
		try{
			const loginInfo = await this.usersService.signup(body.email, body.password);
			
			res.json(loginInfo);
		} catch (ex) {
			if(ex instanceof UserAlreadyExistError) {
				throw new HttpException(ex.message, HttpStatus.UNAUTHORIZED);
			}

			if(ex instanceof UserPasswordToSimpleError) {
				throw new HttpException(ex.message, HttpStatus.UNAUTHORIZED);
			}
		}

	}


	@Post('/api/login')
	public async login(@Body() body, @Res() res, @Next() next) {
		
		const loginInfo = await this.usersService.login(body.email, body.password);

		if(!loginInfo){
			throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
		}

		res.json(loginInfo);
	}


	@Get('/api/user')
	public async user(@Req() req, @Res() res){
		res.json(req.user);
	}

	@Post('/api/refreshtoken')
	public async newtoken(@Body() body, @Headers() headers, @Res() res){

		const authorization = headers['authorization'];
        const Bearer = 'Bearer ';

        // remove Bearer string or keep as is it
		const jwtToken = authorization.indexOf(Bearer) == 0 ? authorization.substr(Bearer.length) : authorization;
		try {
			const loginInfo = await this.usersService.tokenRefresh(jwtToken, body.refreshToken);
			res.json(loginInfo);
		} catch (ex){
			throw new HttpException(ex, HttpStatus.UNAUTHORIZED);
		}
		
		
	}

}
