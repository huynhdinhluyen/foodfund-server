import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AwsCognitoService } from './aws-cognito.service';
import { CognitoAuthStrategy } from './strategies/cognito-auth.strategy';
import { ConfigurableModuleClass } from './aws-cognito.module-definition';

@Module({
  imports: [PassportModule],
  providers: [AwsCognitoService, CognitoAuthStrategy],
  exports: [AwsCognitoService, CognitoAuthStrategy],
})
export class AwsCognitoModule extends ConfigurableModuleClass {}
