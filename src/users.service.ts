import { Component } from '@nestjs/common';
import { HttpException } from '@nestjs/core';
import * as mongoose from 'mongoose';
import {Users} from './models/Users';

import * as jwt from 'jsonwebtoken';
import * as randomtoken from 'random-token';

export interface LoginInfo {
    token: string;
    refreshToken : string;
    user: any;
}

export class UserAlreadyExistError extends Error {
    constructor(public message: string){
        super(message);
    }

    public getMessage() : string{
        return this.message;
    }
}

export class UserPasswordToSimpleError extends Error {
    constructor(public message: string){
        super(message);
    }

    public getMessage() : string{
        return this.message;
    }
}

@Component()
export class UsersService {
    private users = [
        { id: 1, name: "John Doe" },
        { id: 2, name: "Alice Caeiro" },
        { id: 3, name: "Who Knows" },
    ];

    getAllUsers() {
        let p = new Promise((resolve, reject)=>{
            Users.find({})
                .select(['-password','-refreshToken'])
                .exec((e,u)=>{
                    resolve(u);
                })
        });

        
        return p;
    }

    async getUserByEmail(email: string) {
        
        const user = await Users.findOne({'email': email})
                .select(['-password', '-refreshToken', '-refreshTokenExpiresIn', '-refreshTokenCreatedIn'])
                .exec()

        return user;
    }

    /**
     * 
     * @param email 
     * @param password 
     * @param options 
     */
    async login (email: string, password: string, options?: any) : Promise<LoginInfo> {
        
        if(!options){
            options = {}
        }

        let valid = false;
        
        const user = await this.getUserByEmail(email);

       
        
        if(!user){
            // user not found
            return null;
        }


        const loginInfo:LoginInfo = await new Promise<LoginInfo>((resolve, reject)=>{

            

            user.validPassword(password, async (error, valid)=>{
                
                if(!valid){
                    // invalid password for user
                    return reject('invalid password');
                }

                let tokenJWT = user.generateTokenJWT(options.jwt);
                user.generateRefreshToken(options.refreshToken);

                await user.save();

                const li : LoginInfo = {user, token: tokenJWT, refreshToken: user.refreshToken};

                resolve(li);
            
            });
        });
        
        return loginInfo;
    }

    /**
     * 
     * @param email 
     * @param password 
     */
    async signup(email, password) : Promise<LoginInfo> {

        const testIfExist = await this.getUserByEmail(email);

        if(testIfExist){
            // DEBUG:
            // console.log('testIfExists', testIfExist);

            throw new UserAlreadyExistError(`User with email '${email}' already exists`);
        }

        if(password.length < 5){
            throw new UserPasswordToSimpleError('password is too short');
        }
        
        //
        // https://stackoverflow.com/questions/14850553/javascript-regex-for-password-containing-at-least-8-characters-1-number-1-uppe
        //
        if(!password.match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{5,}$/)){
            throw new UserPasswordToSimpleError('password must contain upperCase lowerCase and at least one number');
        }


        const newUser = new Users();
        
        // set the user's local credentials
        newUser.email    = email;
        newUser.password = newUser.generateHash(password);
        
        await newUser.save();

        const loginInfo = await this.login(email, password);

        return loginInfo;
    }
    


    tokenVerify(token){
        if(!token) {
            throw 'token missing';
        }

        
        let decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET || 'demosecret');
        
        return decoded; 
    }

    /**
     * 
     * @param token 
     * @param refreshToken 
     * @param options 
     */
    async tokenRefresh(token, refreshToken, options?) : Promise<LoginInfo>{

        if(!token) {
            throw 'token missing';
        }

        
        if(!options){
            options = {}
        }

        let decoded = jwt.decode(token, process.env.JWT_TOKEN_SECRET || 'demosecret');
        
        try {
            // find password for this user-object
            // and test if is valid
            const user = await Users.findById(decoded.id)
                .select(['email', 'refreshToken', 'refreshTokenExpiresIn', 'refreshTokenCreatedIn'])
                .exec();

            let refreshTokenValid = user.validRefreshToken(refreshToken);
           
            // create new refresh token
            if(refreshTokenValid){
                
                let tokenJWT = user.generateTokenJWT(options.jwt);
                
                //console.log(' user.generateRefreshToken #1', user.refreshToken, refreshToken)
                user.generateRefreshToken(options.refreshToken);
                //console.log(' user.generateRefreshToken #2', user.refreshToken, refreshToken)
                const savedUser = await user.save();
                    //console.log(' user.generateRefreshToken #3', savedUser.refreshToken, refreshToken)
                 
                return {user, token: tokenJWT, refreshToken: savedUser.refreshToken};
                
            } else {
                throw 'refresh token is already expired'
            }
        } catch (ex) {
            throw ex;
        }
        

    }

    
    addUser(user) {
        this.users.push(user);
        return Promise.resolve();
    }
}