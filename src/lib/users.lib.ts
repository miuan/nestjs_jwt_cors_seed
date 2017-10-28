import * as bcrypt from 'bcrypt-nodejs';

import * as jwt from 'jsonwebtoken';
import * as randomtoken from 'random-token';

import {Users, IUser} from '../models/Users'

export interface LoginInfo {
    token: string;
    refreshToken : string;
    user: IUser;
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


export const generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

export const getAllUsers = () : Promise<IUser> => {
    let p = new Promise<IUser>((resolve, reject)=>{
        Users.find({})
            .select(['-password','-refreshToken'])
            .exec((e,u)=>{
                resolve(u);
            })
    });

    
    return p;
}

export const getUserByEmail = async (email: string): Promise<IUser> => {
    
    const user = await Users.findOne({'email': email})
            .select(['-password', '-refreshToken', '-refreshTokenExpiresIn', '-refreshTokenCreatedIn'])
            .exec()

    return user;
}

/**
 * 
 * checking if password is valid
 * 
 * @param user 
 * @param password 
 * @param callback 
 */
export const validPassword = async (user: IUser, password: string) => {

    // find password for this user-object
    // and test if is valid
    const passwordForUser = await Users.findById(user.id)
            .select('password')
            .exec();
    
    const valid = bcrypt.compareSync(password, passwordForUser.password);  
    
    return valid;
};

/**
 * 
 * @param user 
 * @param options 
 */
export const generateTokenJWT = ({id, email}, options?) : string  => {
    if(!options){
        options = {
            /* expires in 24 hours */
            expiresIn: '24h'
        }
    }

    let tokenUser = {
        email: email,
        id: id
    }

    var tokenJWT = jwt.sign(tokenUser, process.env.JWT_TOKEN_SECRET || 'demosecret', options);

    return tokenJWT;
}

/**
 * 
 * @param options 
 */
export const generateRefreshToken = function(user: IUser, options?) {
    if(!options){
        options = {}
    }

    if(!options.expiresIn){
        /* expires in 14 days */
        options.expiresIn = 86400000 * 14
    }

    if(!options.length){
        /* lenght of refresh token default is 32 */
        options.length = 32
    }

    user.refreshToken = randomtoken(options.length);
    
    // TODO: refresh token expire
    user.refreshTokenCreatedIn = Date.now();
    user.refreshTokenExpiresIn = Date.now() + options.expiresIn;
}

export const validRefreshToken = function(user: IUser, refreshToken: string) {
    
    let valid = refreshToken == user.refreshToken;
    
    if(!valid){
        throw 'refreshToken is invalid'
    }

    let timenow = Date.now();
    
    valid = user.refreshTokenExpiresIn > timenow;

    if(!valid){
        throw 'refreshToken is expired'
    }

    return valid;
}

export const encryptRefreshToken = function(refreshToken){
    return bcrypt.hashSync(refreshToken, bcrypt.genSaltSync(8), null)
}

/**
 * 
 * @param email 
 * @param password 
 * @param options 
 */
export const login = async (email: string, password: string, options?: any) : Promise<LoginInfo> => {
    if(!options){
        options = {}
    }

    let valid = false;
    
    let user = await this.getUserByEmail(email);
    
    if(!user){
        // user not found
        return null;
    }


    valid = await validPassword(user, password);
            
    if(!valid) {
        throw 'invalid password';
    }

    let tokenJWT = generateTokenJWT(user, options.jwt);
    generateRefreshToken(user, options.refreshToken);

    await user.save();

    const loginInfo : LoginInfo = {user, token: tokenJWT, refreshToken: user.refreshToken};
    
    return loginInfo;
}

/**
 * 
 * @param email 
 * @param password 
 */
export const signup = async (email: String, password: String) : Promise<LoginInfo> => {
    
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
    // https://stackoverflow.com/questions/7844359/password-regex-with-min-6-chars-at-least-one-letter-and-one-number-and-may-cont?noredirect=1&lq=1
    //
    if(!password.match(/\d/)){
        throw new UserPasswordToSimpleError('password must contain at least one number');
    }

    if(!password.match(/[a-z]/)){
        throw new UserPasswordToSimpleError('password must contain at least one letter lower case');
    }

    if(!password.match(/[A-Z]/)){
        throw new UserPasswordToSimpleError('password must contain at least one letter upper case');
    }

    if(password.match(/[^a-zA-Z0-9\!\@\#\$\%\^\&\*\(\)\_\+\.\,\;\:]/)){
        throw new UserPasswordToSimpleError('password have not allowed character, supported characters:!@#$%*\_+.,;:');
    }


    const newUser = new Users();
    
    // set the user's local credentials
    newUser.email    = email;
    newUser.password = generateHash(password);
    
    await newUser.save();

    const loginInfo = await this.login(email, password);

    return loginInfo;
}

/**
 * 
 * @param token Authorization JWT token as string
 */
export const tokenVerify = (token) : LoginInfo => {
    if(!token) {
        throw 'token missing';
    }

    
    let decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET || 'demosecret') as LoginInfo;
    
    return decoded; 
}

/**
 * 
 * @param token 
 * @param refreshToken 
 * @param options 
 */
export const tokenRefresh = async (token: String, refreshToken: string, options?) : Promise<LoginInfo> => {
    
    if(!token) {
        throw 'token missing';
    }
   
    if(!options){
        options = {}
    }

    let decoded = jwt.decode(token, process.env.JWT_TOKEN_SECRET || 'demosecret');
    

    // find password for this user-object
    // and test if is valid
    const user = await Users.findById(decoded.id)
        .select(['email', 'refreshToken', 'refreshTokenExpiresIn', 'refreshTokenCreatedIn'])
        .exec();

    let refreshTokenValid = validRefreshToken(user, refreshToken);
    

    // create new refresh token
    if(refreshTokenValid){
        
        let tokenJWT = generateTokenJWT(user, options.jwt);
        
        //console.log(' user.generateRefreshToken #1', user.refreshToken, refreshToken)
        generateRefreshToken(user, options.refreshToken);
        //console.log(' user.generateRefreshToken #2', user.refreshToken, refreshToken)
        const savedUser = await user.save();
        //console.log(' user.generateRefreshToken #3', savedUser.refreshToken, refreshToken)
            
        return {user, token: tokenJWT, refreshToken: savedUser.refreshToken} as LoginInfo;
        
    } else {
        throw 'refresh token is already expired'
    }
}
    