import { DynamicModule, Module } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigurableModuleClass, OPTIONS_TYPE } from './jwt.module-definition';
import { JwtService } from './jwt.service';
import { JwtStrategy } from './strategies';

// Define NestImport type locally
type NestImport = any;

@Module({})
export class JwtModule extends ConfigurableModuleClass {
  public static register(options: typeof OPTIONS_TYPE = {}): DynamicModule {
    const imports: Array<NestImport> = [];

    //check if the global module is used
    if (!options.useGlobalImports) {
      // DateModule can be imported later if needed
      // imports.push(DateModule.register());
    }

    const dynamicModule = super.register(options);

    return {
      global: options.isGlobal,
      ...dynamicModule,
      imports: [PassportModule, ...imports],
      providers: [
        ...(dynamicModule.providers || []),
        JwtStrategy,
        NestJwtService,
        JwtService,
      ],
      exports: [JwtService],
    };
  }
}
