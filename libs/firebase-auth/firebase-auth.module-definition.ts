import { ConfigurableModuleBuilder } from '@nestjs/common';
import { FirebaseAuthOptions } from './firebase-auth.types';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<FirebaseAuthOptions>()
    .setExtras({ isGlobal: false }, (definition, extras) => ({
      ...definition,
      global: extras.isGlobal,
    }))
    .build();
