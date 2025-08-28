import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { FirebaseAdminModule } from '@app/firebase-admin';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { FirebaseAuthStrategy } from '../strategies';

@Module({
  imports: [
    PassportModule,
    FirebaseAdminModule.register({ isGlobal: true })
  ],
  controllers: [AuthController],
  providers: [AuthService, FirebaseAuthStrategy],
  exports: [AuthService]
})
export class AuthModule {}
