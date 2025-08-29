import { Module } from '@nestjs/common';
import { FirebaseAuthModule } from '../../../../libs/firebase-auth';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    FirebaseAuthModule.register({ isGlobal: true })
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule {}
