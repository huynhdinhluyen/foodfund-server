import { DynamicModule, Module } from "@nestjs/common"
import { BullDatadogOptions, BullDatadogService } from "./bull-datadog.service"
import { BullModule } from "@nestjs/bull"

export interface BullDatadogAsyncOptions {
    imports?: any[]
    inject?: any[]
    useFactory: (...args: any[]) => Promise<BullDatadogOptions> | BullDatadogOptions
}

@Module({})
export class BullDatadogModule {
    static forRoot(options: BullDatadogOptions): DynamicModule {
        return {
            module: BullDatadogModule,
            providers: [
                {
                    provide: "BULL_DATADOG_OPTIONS",
                    useValue: options,
                },
                BullDatadogService,
            ],
            exports: [BullDatadogService],
        }
    }

    static forRootAsync(options: BullDatadogAsyncOptions): DynamicModule {
        return {
            module: BullDatadogModule,
            imports: options.imports || [],
            providers: [
                {
                    provide: "BULL_DATADOG_OPTIONS",
                    useFactory: options.useFactory,
                    inject: options.inject || [],
                },
                BullDatadogService,
            ],
            exports: [
                BullDatadogService,
                BullModule,
            ],
        }
    }
}