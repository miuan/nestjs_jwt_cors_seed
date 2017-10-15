import { Controller, Get, Post, Req, Res, Next, HttpStatus, Body,   } from '@nestjs/common';
import { HttpException } from '@nestjs/core';

import 'dotenv/config';
import * as jwt from 'jsonwebtoken';
import * as randomtoken from 'random-token';

import {UsersService} from './users.service'

@Controller()
export class AppController {

	public env = {
	       AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
	       AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
	       AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL
	}

	constructor(public usersService : UsersService){

	}



	@Post('/api/login')
	public async login(@Body() body, @Res() res, @Next() next) {
		
		const loginInfo = await this.usersService.login(body.email, body.password);

		if(!loginInfo){
			throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
		}

		res.json(loginInfo);
	}

}
