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
export const validPassword = (user: IUser, password: string, callback) => {
        
    // password is in this user-object know
    if(this.password){
        let valid = bcrypt.compareSync(password, this.password);
        return callback(null, valid);
    }

    // find password for this user-object
    // and test if is valid
    Users.findById(user.id)
            .select('password')
            .exec((error, passwordForUser)=>{
                
                if(error){
                    return callback(error);
                }

                let valid = bcrypt.compareSync(password, passwordForUser.password);
                callback(null, valid);
            });
        
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
    
    const user = await this.getUserByEmail(email);
    
    if(!user){
        // user not found
        return null;
    }


    const loginInfo:LoginInfo = await new Promise<LoginInfo>((resolve, reject)=>{

        validPassword(user, password, async (error, valid)=>{
            
            if(!valid){
                // invalid password for user
                return reject('invalid password');
            }

            let tokenJWT = generateTokenJWT(user, options.jwt);
            generateRefreshToken(user, options.refreshToken);

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
    //
    if(!password.match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{5,}$/)){
        throw new UserPasswordToSimpleError('password must contain upperCase lowerCase and at least one number');
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
    