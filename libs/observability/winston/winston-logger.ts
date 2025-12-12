import * as winston from "winston"
import { envConfig, isProduction } from "@libs/env"

const { combine, timestamp, json, errors } = winston.format

export function createWinstonLogger(serviceName: string): winston.Logger {
    const env = envConfig()

    return winston.createLogger({
        level: process.env.LOG_LEVEL || "info",
        format: combine(
            errors({ stack: true }),
            timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
            json(),
        ),
        defaultMeta: {
            service: serviceName,
            env: env.datadog.env || env.nodeEnv || "development",
            version: env.datadog.version || "1.0.0",
        },
        transports: [
            new winston.transports.Console({
                // In production, output pure JSON for Datadog
                // In development, could use colorize for readability
                format: isProduction()
                    ? json()
                    : combine(
                        winston.format.colorize(),
                        winston.format.simple(),
                    ),
            }),
        ],
    })
}
