import { ConfigurableModuleBuilder } from '@nestjs/common';
import { CognitoAuthOptions } from './aws-cognito.types';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<CognitoAuthOptions>()
    .setClassMethodName('register')
    .setFactoryMethodName('createCognitoAuthOptions')
    .build();
