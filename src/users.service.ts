import { Component } from '@nestjs/common';
import { HttpException } from '@nestjs/core';
import * as mongoose from 'mongoose';
import {Users} from './models/Users';

import * as jwt from 'jsonwebtoken';
import * as randomtoken from 'random-token';

import {
    getAllUsers, 
    getUserByEmail, 
    login, 
    LoginInfo, 
    signup,
    tokenVerify,
    tokenRefresh
} from './lib/users.lib'



/**
 * wrapper over the User lib
 * for NestJS service 
 */
@Component()
export class UsersService {
    private users = [
        { id: 1, name: "John Doe" },
        { id: 2, name: "Alice Caeiro" },
        { id: 3, name: "Who Knows" },
    ];

    getAllUsers() {
        return getAllUsers();
    }

    async getUserByEmail(email: string) {
        return getUserByEmail(email);
    }

    /**
     * 
     * @param email 
     * @param password 
     * @param options 
     */
    async login (email: string, password: string, options?: any) : Promise<LoginInfo> {
        
        return login(email, password, options);
    }

    /**
     * 
     * @param email 
     * @param password 
     */
    async signup(email : String, password : String) : Promise<LoginInfo> {
        return signup(email, password);       
    }
    


    tokenVerify(token){
        return tokenVerify(token);
    }

    /**
     * 
     * @param token 
     * @param refreshToken 
     * @param options 
     */
    async tokenRefresh(token, refreshToken, options?) : Promise<LoginInfo>{
        return tokenRefresh(token, refreshToken, options);
    }

    
    addUser(user) {
        this.users.push(user);
        return Promise.resolve();
    }
}