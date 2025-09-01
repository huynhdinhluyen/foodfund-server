import { Module } from '@nestjs/common';
import { AwsCognitoModule } from '../../../../libs/aws-cognito';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [AwsCognitoModule.register({ isGlobal: true })],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
