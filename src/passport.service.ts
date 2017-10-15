import * as Auth0Strategy from 'passport-auth0';
import * as Facebook from 'passport-facebook';
import * as Local from 'passport-local';

import {Users} from './models/Users';

import 'dotenv/config';

import * as jwt from 'jsonwebtoken';
import * as randomtoken from 'random-token';
import * as crypto from 'crypto';


export class PassportService {
	constructor(private passport){
				// This will configure Passport to use Auth0
		const strategy = new Auth0Strategy({
				domain:       process.env.AUTH0_DOMAIN,
				clientID:     process.env.AUTH0_CLIENT_ID,
				clientSecret: process.env.AUTH0_CLIENT_SECRET,
				callbackURL:  process.env.AUTH0_CALLBACK_URL
			}, (accessToken, refreshToken, extraParams, profile, done) => {
				// accessToken is the token to call Auth0 API (not needed in the most cases)
				// extraParams.id_token has the JSON Web Token
				// profile has all the information from the user
				return done(null, profile);
			}
		);
		

		const facebook = new Facebook.Strategy({
				clientID: '119850728186333',
				clientSecret: 'c70bd9db2b7bf2cfef2782287f13956c',
				callbackURL: 'https://127.0.0.1:'+process.env.PORT+'/facebook-token'
			  }, (accessToken, refreshToken, profile, done) => {
				  return done(null, profile);
		});


		const localStrategySetting = {
			usernameField : 'email',
			passwordField : 'password',
			passReqToCallback : true
		}

		const localSignup = new Local.Strategy(localStrategySetting, (req, email, password, done)=>{
			
			process.nextTick(()=>{
				this.localSignup(req, email, password, done);
			});
		});

		// const localLogin = new Local.Strategy(localStrategySetting, (req, email, password, done)=>{
			
		// 	process.nextTick(()=>{
		// 		this.localLogin(req, email, password, done);
		// 	});
		// });

		


		passport.use(strategy);
		passport.use(facebook);
		passport.use('local-signup', localSignup);
		passport.use('local-login', localLogin);

		// you can use this section to keep a smaller payload
		passport.serializeUser((user, done) => {
			console.log('passport.serializeUser', user)
			done(null, user);
		})

		passport.deserializeUser((user, done) => {
			console.log('passport.deserializeUser', user)
			done(null, user);
		})
	}

	localSignup(req, email, password, done){
		
		if(password.length < 5){
			return done(null, false, 'password to short');
		}

		Users.findOne({'local.email': email}, (mongoErr, user)=>{
			if(mongoErr){
				done(mongoErr);
			}

			
			// check to see if theres already a user with that email
			if (user) {
				return done(null, false, 'email already taken');
			} else {

				// if there is no user with that email
				// create the user
				var newUser            = new Users();

				// set the user's local credentials
				newUser.local.email    = email;
				newUser.local.password = newUser.generateHash(password);

				// save the user
				newUser.save(function(err) {
					if (err)
						throw err;
					return done(null, newUser);
				});
			}
			
		})

		
	}

	/**
	 * 
	 * @param req 
	 * @param email 
	 * @param password 
	 * @param options 
	 * @param done 
	 */
	localLogin(req, email, password, options, done){
		

		Users.findOne({'local.email': email}, (mongoErr, user)=>{
			if(mongoErr){
				done(mongoErr);
			}

			let valid = user.validPassword(password);

			if(valid){

				user.refreshToken = randomtoken(24);
				user.save(()=>{
					let encryptedRefreshToken = user.encryptRefreshToken(user.refreshToken);
					console.log(user.refreshToken, encryptedRefreshToken);
					user.refreshToken = encryptedRefreshToken;
					user.local.password = undefined;
					return done(null, user);
				})
				
			} else {
				done(null, false);
			}

			
		});

		
	}
}
