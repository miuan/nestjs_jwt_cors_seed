// load the things we need
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt-nodejs';

import * as jwt from 'jsonwebtoken';
import * as randomtoken from 'random-token';

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
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = async function(password: string, callback) {
        
    // password is in this user-object know
    if(this.password){
        let valid = bcrypt.compareSync(password, this.password);
        return callback(null, valid);
    }

    // find password for this user-object
    // and test if is valid
    Users.findById(this.id)
            .select('password')
            .exec((error, passwordForUser)=>{
                
                if(error){
                    return callback(error);
                }

                let valid = bcrypt.compareSync(password, passwordForUser.password);
                callback(null, valid);
            });
        
};


userSchema.methods.generateTokenJWT = function(options?) {
    if(!options){
        options = {
            /* expires in 24 hours */
            expiresIn: '24h'
        }
    }

    let tokenUser = {
        email: this.email,
        id: this.id
    }

    var tokenJWT = jwt.sign(tokenUser, process.env.JWT_TOKEN_SECRET || 'demosecret', options);

    return tokenJWT;
}


userSchema.methods.generateRefreshToken = function(options?) {
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

    this.refreshToken = randomtoken(options.length);
    
    // TODO: refresh token expire
    this.refreshTokenCreatedIn = Date.now();
    this.refreshTokenExpiresIn = Date.now() + options.expiresIn;
}

userSchema.methods.validRefreshToken = function(refreshToken: string, callback) {
    
    let valid = refreshToken == this.refreshToken;
    
    if(!valid){
        throw 'refreshToken is invalid'
    }

    let timenow = Date.now();
    
    valid = this.refreshTokenExpiresIn > timenow;

    if(!valid){
        throw 'refreshToken is expired'
    }

    return valid;
}

userSchema.methods.encryptRefreshToken = function(refreshToken){
    return bcrypt.hashSync(refreshToken, bcrypt.genSaltSync(8), null)
}

// create the model for users and expose it to our app
export let Users = mongoose.model('User', userSchema);