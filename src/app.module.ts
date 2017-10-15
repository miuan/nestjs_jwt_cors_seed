import { Module, MiddlewaresConsumer, RequestMethod } from '@nestjs/common';
import { JWTLoggedIn } from './jwt.middleware';
import { UsersController } from './users.controller';
import { UsersService } from './users.service'
@Module({
	controllers: [ UsersController ],
	components: [ UsersService ]
})

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
