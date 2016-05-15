'use strict'

import winston from 'winston'
import fs from 'fs'
import config from 'config'

/**
 * Create a new logger based on a predefined configuration.
 * Reference to the logger can be acquired with the static method getInstance().
 * In the configuration file can be override the default configuration for this logger.
 */
export default class Logger {

    constructor () {
        //define logger default values and load specific configuration from the config file
        let consoleLevel = 'info'
        if (config.has('logger.console.level')) {
            consoleLevel = config.get('logger.console.level')
        }
        let enableFileLogging = false
        if (config.has('logger.file.enable')) {
            enableFileLogging = config.get('logger.file.enable')
        }
        let fileLevel = 'info'
        if (config.has('logger.file.level')) {
            fileLevel = config.get('logger.file.level')
        }
        let fileName = 'log.log'
        if (config.has('logger.file.fileName')) {
            fileName = config.get('logger.file.fileName')
        }
        //initialize winston console logger
        this._logger = new winston.Logger({
            transports: [
                new (winston.transports.Console)({
                    level: consoleLevel,
                    timestamp: true,
                    colorize: true,
                    prettyPrint: true
                })
            ]
        })
        //initialize winston file logger
        if (enableFileLogging) {
            const dir = './logs'
            //create log folder if non exists
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            this._logger.add(winston.transports.File, {
                filename: dir.concat('/').concat(fileName),
                level: fileLevel,
                maxsize: 1000000,
                maxFiles: 10,
                tailable: true
            })
        }
        return this._logger
    }

    /**
     * Provide the instance for the logger
     * @returns {Logger} The logger instance
     */
    static getInstance() {
        if (!this._logger) {
            this._logger = new Logger()
        }
        return this._logger
    }
}