// load the things we need
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt-nodejs';

import * as jwt from 'jsonwebtoken';
import * as randomtoken from 'random-token';

/**
 *  user entity in mongo DB
 */
export interface IUser{
    id           : String
    email        : String
    password     : String
    refreshToken: String
    refreshTokenExpiresIn: Number
    refreshTokenCreatedIn: Number
}

// define the schema for our user model
const userSchema = mongoose.Schema({
    
    email        : String,
    password     : String,

    facebook         : {
        id           : String,
        token        : String,
        email        : String,
        name         : String
    },
    twitter          : {
        id           : String,
        token        : String,
        displayName  : String,
        username     : String
    },
    google           : {
        id           : String,
        token        : String,
        email        : String,
        name         : String
    },
    refreshToken: String,
    refreshTokenExpiresIn: Number,
    refreshTokenCreated: Number

});

// methods ======================
// generating a hash


// create the model for users and expose it to our app
export let Users = mongoose.model<IUser>('User', userSchema);