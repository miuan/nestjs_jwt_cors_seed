import { Module, MiddlewaresConsumer, RequestMethod } from '@nestjs/common';
import { EnsureLoggedIn } from './app.middleware';
import { AppController } from './users.controller';
import { UsersService } from './users.service'
@Module({
	controllers: [ AppController ],
	components: [ UsersService ]
})

export class ApplicationModule {

  configure(consumer: MiddlewaresConsumer) {
		consumer
		.apply(EnsureLoggedIn)
		.forRoutes({
	        path: 'user',
	        method: RequestMethod.ALL
		})
	}
}
