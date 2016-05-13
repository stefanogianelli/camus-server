'use strict'

import _ from 'lodash'

/**
 * Interface for every bridge implementation.
 * Each bridge must implements the method 'executeQuery' that handles the necessary logic to invoke the service.
 * This method receive as input these parameters:
 * - descriptor: the service's descriptor
 * - decoratedCdt: the decorated CDT
 * - startPage: identifier use for query a specific page
 */
export default class {

    constructor () {
        if (_.isUndefined(this.executeQuery) || !_.isFunction(this.executeQuery)) {
            throw new TypeError('A bridge must implements executeQuery() method. See documentation for more details')
        }
    }

}