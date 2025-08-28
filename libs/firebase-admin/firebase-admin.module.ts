import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./firebase-admin.module-definition"
import { FirebaseAdminService } from "./firebase-admin.service"

// Define types locally
type NestProvider = any;
type NestExport = any;

@Module({})
export class FirebaseAdminModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        
        const providers: Array<NestProvider> = []
        const exports: Array<NestExport> = []

        const services = [
            FirebaseAdminService
        ]

        providers.push(...services)
        exports.push(...services)

        return {
            ...dynamicModule,
            providers,
            exports
        }
    }
}
