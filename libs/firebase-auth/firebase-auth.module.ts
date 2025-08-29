import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { FirebaseAdminModule } from '../firebase-admin';
import { FirebaseAuthService } from './firebase-auth.service';
import { FirebaseAuthStrategy } from './strategies';
import { ConfigurableModuleClass } from './firebase-auth.module-definition';

@Module({
  imports: [
    PassportModule,
    FirebaseAdminModule,
  ],
  providers: [
    FirebaseAuthService,
    FirebaseAuthStrategy,
  ],
  exports: [
    FirebaseAuthService,
    FirebaseAuthStrategy,
  ],
})
export class FirebaseAuthModule extends ConfigurableModuleClass {}
