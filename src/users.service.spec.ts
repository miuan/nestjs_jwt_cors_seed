import {Test} from '@nestjs/testing';
import { UsersService, UserAlreadyExistError, UserPasswordToSimpleError } from './users.service';
import * as mongoose from 'mongoose';
import {Users} from './models/Users';
import {expect} from 'chai';

describe('UserService', () => {
    

    let usersService : UsersService;

    before((done)=>{
        
        mongoose.connect('mongodb://localhost/g4t-test', {useMongoClient: true}, (error)=> {
        
        console.log('we are here!');

        Users.remove({}, ()=> {

                var newUser            = new Users();

                // set the user's local credentials
                newUser.email    = 'ahoj1@seznam.cz';
                newUser.password = newUser.generateHash('b123456');
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

    it('all users not contain password', async ()=>{


        let users = await usersService.getAllUsers();

        
        console.log('users', users);

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
            user.validPassword('b123456', (error, valid)=>{
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
            user.validPassword('blablabla', (error, valid)=>{
                expect(valid).to.be.false;
                resolve();
            });
        })
        
            
    })

    it('login user `ahoj1@seznam.cz` and retrieve token, refreshToken', async () => {
        const loginInfo = await usersService.login('ahoj1@seznam.cz', 'b123456');
    
        expect(loginInfo).to.be.a('object');
        expect(loginInfo).to.have.property('user');
        expect(loginInfo).to.have.property('token');
        expect(loginInfo).to.have.property('refreshToken');
    }) 
    

    it('login user `ahoj1@seznam.cz` and check the retrieved tokens', async () => {
        const loginInfo = await usersService.login('ahoj1@seznam.cz', 'b123456');

        //console.log('tokenValid',loginInfo, decoded);

        //expect(err).to.be.null;
        expect(loginInfo).to.be.a('object');
        expect(loginInfo).to.have.property('user');
        expect(loginInfo).to.have.property('token');
        
        let verifyErrorEx = null;
        let decoded = null;

        try {
            decoded = usersService.tokenVerify(loginInfo.token);
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

    it('login user `ahoj1@seznam.cz` and refresh the retrieved tokens', async () => {
        
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
                let decoded = false;

                try {
                    decoded = usersService.tokenVerify(loginInfo.token);
                } catch (err) {
                    expired = err;
                }
                
                //
                // we should get tokenExpiredError
                //
                expect(expired).is.an('object');
                expect(expired).have.a.property('name');
                expect(expired.name).is.equal('TokenExpiredError');

                const newTokens = await usersService.tokenRefresh(loginInfo.token, loginInfo.refreshToken);
                    
                
                
                //
                // old token and new tokens, can't be the same
                //
                expect(loginInfo.token).not.to.be.equal(newTokens.token);
                expect(loginInfo.refreshToken).not.to.be.equal(newTokens.refreshToken);

                //
                // test new tokens could be verified as OK
                //
                try {
                    expired = null;
                    decoded = null;
                    decoded = usersService.tokenVerify(newTokens.token);
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
                // console.log('---ok 1')

                    
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
                    // console.log('---ok 2')
                }
                
                //console.log('newNewTokens @2', err, newNewTokens2);

                resolve();

            }, 2);
        })
            


            
            
        
    }) 

    it('signup new user and retrieve login info (tokens)', async () => {
        const loginInfo = await usersService.signup('karel@seznam.cz', 'Kare234');

        expect(loginInfo).to.have.property('refreshToken');
        expect(loginInfo).to.have.property('token');

    })

    it('signup new user with already taken email', async () => {
        try {
            const loginInfo = await usersService.signup('karel123@seznam.cz', 'Karel123');
            const loginInfo2 = await usersService.signup('karel123@seznam.cz', 'Karel123');

            // this should not be execute
            expect(false).to.be.true;
        } catch ( ex ){
            expect(ex instanceof UserAlreadyExistError).to.be.true;
        }
    })

    it('signup with short password should not be accepted', async () => {
        try {
            const loginInfo = await usersService.signup('karel1234@seznam.cz', 'ka');
            
            // this should not be execute
            expect(loginInfo).to.be.false;
        } catch ( ex ){
            expect(ex instanceof UserPasswordToSimpleError).to.be.true;
        }
    })

    it('signup with simple password should not be accepted', async () => {
        try {
            const loginInfo = await usersService.signup('karel1234@seznam.cz', 'simplepass');
            
            // this should not be execute
            expect(loginInfo).to.be.false;
        } catch ( ex ){
            expect(ex instanceof UserPasswordToSimpleError).to.be.true;
        }
    })

});