import {Test} from '@nestjs/testing';

import { UsersService } from './users.service';
import * as mongoose from 'mongoose';
import {Users} from './models/Users';
import {expect} from 'chai';

import {
    LoginInfo,
    generateHash,
    tokenVerify,
    validPassword, 
    UserAlreadyExistError, 
    UserPasswordToSimpleError
} from './lib/users.lib'

describe('UserService', () => {
    

    let usersService : UsersService;

    before((done)=>{
        
        mongoose.connect('mongodb://localhost/g4t-test', {useMongoClient: true}, (error)=> {
        mongoose.Promise = Promise;

        Users.remove({}, ()=> {

                var newUser            = new Users();

                // set the user's local credentials
                newUser.email    = 'ahoj1@seznam.cz';
                newUser.password = generateHash('b123456');
                newUser.save(() => done());
                
            });
        });
        
    });

    after((done)=>{
        Users.remove({}, ()=> {
            mongoose.connection.close();
            done();
        });
    })

    beforeEach(async () => {
        const module1 = await Test.createTestingModule({
            components: [
              UsersService
            ]
          }).compile();

        
        usersService = module1.get<UsersService>(UsersService);
    });


    describe('basic', () => {

        it('all users not contain password', async ()=>{
            let users = await usersService.getAllUsers();
    
            // DEBUG:        
            // console.log('users', users);
    
            expect(users).to.be.an('array');
            expect(users).to.have.lengthOf(1);
            expect(users[0].password).to.be.undefined;
            
        })
    
        it('find one user by email `ahoj1@seznam.cz`', async ()=>{
            
            const user = await usersService.getUserByEmail('ahoj1@seznam.cz');
    
            expect(user).to.be.an('object');
            expect(user).to.have.property('email');
            expect(user.email).to.be.equal('ahoj1@seznam.cz');
            
        })
    
    
        it('valid password `ahoj1@seznam.cz`', async ()=>{
            
            const user = await usersService.getUserByEmail('ahoj1@seznam.cz');
    
    
            expect(user).to.be.an('object');
            expect(user).to.have.property('email');
            expect(user.email).to.be.equal('ahoj1@seznam.cz');
    
            await new Promise((resolve, reject)=>{
                validPassword(user, 'b123456', (error, valid)=>{
                    expect(valid).to.be.true;
                    resolve();
                });
            }) 
        }) 
    
        it('invalid password `ahoj1@seznam.cz`', async () =>{
            const user = await usersService.getUserByEmail('ahoj1@seznam.cz');
    
            expect(user).to.be.an('object');
            expect(user).to.have.property('email');
            expect(user.email).to.be.equal('ahoj1@seznam.cz');
    
            await new Promise((resolve, reject) => {
                validPassword(user, 'blablabla', (error, valid)=>{
                    expect(valid).to.be.false;
                    resolve();
                });
            })
            
                
        })
    })
    

    describe('login', () => {

        it('user `ahoj1@seznam.cz` and retrieve token, refreshToken', async () => {
            const loginInfo = await usersService.login('ahoj1@seznam.cz', 'b123456');
        
            expect(loginInfo).to.be.a('object');
            expect(loginInfo).to.have.property('user');
            expect(loginInfo).to.have.property('token');
            expect(loginInfo).to.have.property('refreshToken');
        }) 
        
    
        it('user `ahoj1@seznam.cz` and check the retrieved tokens', async () => {
            const loginInfo = await usersService.login('ahoj1@seznam.cz', 'b123456');
    
            //console.log('tokenValid',loginInfo, loginInfo);
    
            //expect(err).to.be.null;
            expect(loginInfo).to.be.a('object');
            expect(loginInfo).to.have.property('user');
            expect(loginInfo).to.have.property('token');
            
            let verifyErrorEx = null;
            let decoded = null;
    
            try {
                decoded = tokenVerify(loginInfo.token);
            } catch(verifyError) {
                verifyErrorEx = verifyError;
            }
    
            expect(verifyErrorEx).to.be.null;
            expect(decoded).to.have.property('email');
            expect(decoded).to.have.property('id');
        }) 
    
        // it('login user `ahoj1@seznam.cz` and check the retrieved tokens', (done) => {
        //     usersService.login('ahoj1@seznam.cz', 'b123456', (err, user) => {
        //         usersService.tokenVerify(user.token, (err, decoded)=>{
                    
        //             console.log('tokenValid', err, decoded);
    
        //             expect(err).to.be.null;
        //             expect(decoded).to.be.a('object');
        //             expect(decoded).to.have.property('user');
                    
        //             done();
        //         })
        //     });
        // })  
    
        it('user `ahoj1@seznam.cz` and refresh the retrieved tokens', async () => {
            
            //
            // create token what will expire after one 1ms
            //
            const loginInfo = await usersService.login('ahoj1@seznam.cz', 'b123456', {jwt:{expiresIn:'1ms'}});
                
            expect(loginInfo).to.have.property('refreshToken');
            expect(loginInfo).to.have.property('token');
    
            await new Promise((resolve, reject)=>{
                // 
                // wait two milliseconds
                //
                setTimeout(async ()=>{
                    
                    let expired = null;
                    let decoded : LoginInfo = null;
    
                    try {
                        decoded = tokenVerify(loginInfo.token);
                    } catch (err) {
                        expired = err;
                    }
                    
                    //
                    // we should get tokenExpiredError
                    //
                    expect(expired).is.an('object');
                    expect(expired).have.a.property('name');
                    expect(expired.name).is.equal('TokenExpiredError');
    
                    // DEBUG
                    // console.log('#1')
    
    
                    let newTokens = null;
                    let newTokensException = null;
                    
                    try {
                        newTokens = await usersService.tokenRefresh(loginInfo.token, loginInfo.refreshToken);
                    } catch (ex) {
                        newTokensException = ex;
                    }
                        
                    
                    
                    //
                    // old token and new tokens, can't be the same
                    //
                    expect(newTokensException).to.be.null;
                    expect(loginInfo.token).not.to.be.equal(newTokens.token);
                    expect(loginInfo.refreshToken).not.to.be.equal(newTokens.refreshToken);
    
                    //
                    // test new tokens could be verified as OK
                    //
                    try {
                        expired = null;
                        decoded = null;
                        decoded = tokenVerify(newTokens.token);
                    } catch (err) {
                        expired = err;
                    }
    
                    //console.log('new decoded', decoded);
                    expect(expired).is.null;
                    expect(decoded).not.to.be.null;
                    expect(decoded).is.a('object');
                    expect(decoded).have.a.property('email');
                    expect(decoded).have.a.property('id');
                    
                    // DEBUG:
                    // console.log('#2')
    
                        
                    const newNewTokens = await usersService.tokenRefresh(newTokens.token, newTokens.refreshToken);
                            
                    //console.log('newNewTokens', err, newNewTokens);
                    expect(newNewTokens).not.to.be.null;
    
                    //
                    // we should get error, because old token is not used anymore
                    //
                    try {
                        const newNewTokens2 = await usersService.tokenRefresh(loginInfo.token, loginInfo.refreshToken);
                        
                        // this code should not be done
                        expect(true).to.be.false;
                        expect(newNewTokens2).to.be.undefined;
                    } catch(ex2) {
                        expect(ex2).not.to.be.null;
                        
                        // DEBUG:
                        // console.log('#3')
                    }
                    
                    //console.log('newNewTokens @2', err, newNewTokens2);
    
                    resolve();
    
                }, 2);
            })
                
    
    
                
                
            
        }) 
    })

    describe('signup', ()=>{
        it('new user and retrieve login info (tokens)', async () => {
            const loginInfo = await usersService.signup('karel@seznam.cz', 'Kare234');
    
            expect(loginInfo).to.have.property('refreshToken');
            expect(loginInfo).to.have.property('token');
    
        })
    
        it('new user with already taken email', async () => {
            try {
                const loginInfo = await usersService.signup('karel123@seznam.cz', 'Karel123');
                const loginInfo2 = await usersService.signup('karel123@seznam.cz', 'Karel123');
    
                // this should not be execute
                expect(false).to.be.true;
            } catch ( ex ){
                expect(ex instanceof UserAlreadyExistError).to.be.true;
            }
        })
    
        it('with short password should not be accepted', async () => {
            try {
                const loginInfo = await usersService.signup('karel1234@seznam.cz', 'ka');
                
                // this should not be execute
                expect(loginInfo).to.be.false;
            } catch ( ex ){
                expect(ex instanceof UserPasswordToSimpleError).to.be.true;
            }
        })
    
        it('with simple password should not be accepted', async () => {
            try {
                const loginInfo = await usersService.signup('karel1234@seznam.cz', 'simplepass');
                
                // this should not be execute
                expect(loginInfo).to.be.false;
            } catch ( ex ){
                expect(ex instanceof UserPasswordToSimpleError).to.be.true;
            }
        })

        it('password with special symbols ".#_!" should BE accepted', async () => {
            let loginInfo = null;
            let loginInfoException = null;
            
            try {
                loginInfo = await usersService.signup('karel12345@seznam.cz', 'Karel._#!123,@');
                
                
            } catch ( ex ){
                loginInfoException = ex;
            }

            expect(loginInfoException).to.be.null;
            expect(loginInfo).not.to.be.null;
            
        })
    })

    

});