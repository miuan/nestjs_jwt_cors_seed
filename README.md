
# Seed NestJS + JWT + CORS 
This is the seed project you need to use if you're going to create regular [NestJS Framework](http://nestjs.com) web application with JWT authorization.

JWT also containing refresh tokens for refresh 

# This version works only with Mongosee (MongoDB)

I will try in next versions make Mongosee as mandatory.

## Enviroment options

- DB_NAME default is '`nestjs-jwt-cors-seed`'
- DB_HOST default is '`localhost`'
- DB_USER default is empty
- DB_PASS default is empty

# Running the example
In order to run the example you need to have npm and NodeJS installed.

Now, run `npm install` to install the dependencies.

## Enviroment options

- PORT default is '`3000`'
- JWT_TOKEN_SECRET default is '`demosecret`'

Just run `npm start` and try calling [http://localhost:3000/](http://localhost:3000/)

# API

## sign up (/api/signup)

body have to contain `email` and `password`

```cURL
curl -X POST \
  http://localhost:3000/api/signup \
  -H 'content-type: application/json' \
  -d '{
"email":"milan.medlik@gmail.com",
"password":"NestjsJwtSeed1"
}'
```

response contain created `user`, than JWT `token` for authorization and `refreshToken` when token is expire, to generate new one 

```json
{
    "user": {
        "refreshTokenExpiresIn": 1509279300147,
        "refreshToken": "71b3cjyyohyat03ush46rwszd66gzgf5",
        "_id": "59e351431a0d712ccccccf8b",
        "email": "milan.medlik@gmail.com",
        "__v": 0
    },
    "token": "eyJhbGciOiJIUzI1...",
    "refreshToken": "71b3cjyyohyat03ush46rwszd66gzgf5"
}
```


## login (/api/login)

body is similar to signup so have to contain `email` and `password`

```cURL
curl -X POST \
  http://localhost:3000/api/login \
  -H 'content-type: application/json' \
  -d '{
"email":"milan.medlik@gmail.com",
"password":"NestjsJwtSeed1"
}'
```

response contain created `user`, than JWT `token` for authorization and `refreshToken` when token is expire, to generate new one 

```json
{
    "user": {
        "refreshTokenExpiresIn": 1509279300147,
        "refreshToken": "71b3cjyyohyat03ush46rwszd66gzgf5",
        "_id": "59e351431a0d712ccccccf8b",
        "email": "milan.medlik@gmail.com",
        "__v": 0
    },
    "token": "eyJhbGciOiJIUzI1N...",
    "refreshToken": "71b3cjyyohyat03ush46rwszd66gzgf5"
}
```

## user info (/api/user) 

this is a example of secured enpoint, you have to add `authorization` header to headers
with `authorization: Bearer eyJhbGciOiJ...` the token is the token what you did recaived from
`/api/login` or `/api/signup`



```cURL
curl -X GET \
  http://localhost:3000/api/user \
  -H 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im1pbGFuLm1lZGxpazRAZ21haWwuY29tIiwiaWQiOiI1OWUzNTk1NzBlNDA5ODNkZDA3ZTEwYmUiLCJpYXQiOjE1MDgwNzE3NjcsImV4cCI6MTUwODE1ODE2N30.l_zZTjPfJV4ZCc977PIQGRsiUPUDZ36o8axiBY2jLqQ'
```

```json
{
    "email": "milan.medlik@gmail.com",
    "id": "59e359570e40983dd07e10be",
    "iat": 1508071767,
    "exp": 1508158167
}
```
### To add more endpoints to on JWT secure

You can find in `app.module.ts` there is configuring middlewares and controllers

```TypeScript
export class ApplicationModule {

  configure(consumer: MiddlewaresConsumer) {
		consumer
			.apply(JWTLoggedIn)
			.forRoutes({
				path: '/api/user',
				method: RequestMethod.ALL
			})
		
		// consumer
			// .apply(JWTLoggedIn)
			// .forRoutes({
			// 	path: '/api/your-briliant-api/*',
			// 	method: RequestMethod.ALL
			// })
	}
}

```


# Runing test

- `npm test`
- `npm run test:watch`


