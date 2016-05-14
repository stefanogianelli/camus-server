'use strict'

import _ from 'lodash'
import Promise from 'bluebird'
import config from 'config'
import loader from 'require-all'

import Provider from '../provider/provider'
import ResponseParser from './responseParser'

/**
 * The Query Handler receives the list of services to be queried and call the most appropriate bridge to complete this task.
 * After a response is received, it handles the transformation in the 'semantic term' form.
 */
export default class {

    constructor () {
        //initialize components
        this._provider = Provider.getInstance()
        this._responseParser = new ResponseParser()
        //load bridges
        const bridgeFolder = __dirname.replace('components', '').concat('bridges')
        this._bridges = loader({
            dirname: bridgeFolder,
            filter: /(.+Bridge)\.js$/,
            map: name => name.replace('Bridge', '')
        })
    }

    /**
     * It receives a list of services, then translate the parameters (if needed) and prepare the bridges for service calls.
     * When all responses are returned they are translated in the internal format based on response mapping information in the service description.
     * @param {Array} services - The list of operation identifiers in ascending order of priority
     * @param {Object} decoratedCdt - The decorated CDT
     * @returns {Promise<Object>} It returns an object composed as follow:
     * {
     *  {Array} servicesStatus: the metadata about the service status (eg.: it provides information about pagination)
     *  {Array} results: the list of responses received by the services, already transformed in internal representation
     * }
     */
    executeQueries (services, decoratedCdt) {
        //if no service was selected, return an empty object
        if (_.isEmpty(services)) {
            return Promise.resolve()
        }
        return this._provider
            .getServicesByOperationIds(_.map(services, '_idOperation'))
            .map(service => {
                //add the ranking value
                service.service.rank = _(services).find(s => service._id.equals(s._idOperation)).rank
                //make call to the current service
                return this._callService(service, decoratedCdt, services)
            })
            .then(results => {
                //merge the results
                let output = {
                    servicesStatus: [],
                    results: []
                }
                _(results).forEach(item => {
                    if (!_.isUndefined(item.serviceStatus))
                        output.servicesStatus.push(item.serviceStatus)
                    if (!_.isUndefined(item.response) && !_.isEmpty(item.response))
                        output.results = _.concat(output.results, item.response)
                })
                return output
            })
    }

    /**
     * Call the correct service's bridge and transform the response to make it an array of items
     * @param {Object} descriptor - The service description
     * @param {Object} decoratedCdt - The decorated CDT
     * @param {Object} paginationStatus - The pagination information about all the services
     * @returns {Promise<Object>} It returns an object composed as follow:
     * {
     *  serviceStatus: {
     *      {idOperation} idOperation: the operation's identifier
     *      {Boolean} hasNextPage: true if the service can give back another page with other results
     *      {String|Number} nextPage: the token or number to request the next page
     *  }
     *  {Array} response: the transformed list of items received from the service
     * }
     * @private
     */
    _callService (descriptor, decoratedCdt, paginationStatus) {
        //get the pagination configuration for the current service
        const servicePaginationConfig = _(paginationStatus).find(s => descriptor._id.equals(s._idOperation))
        let startPage = undefined
        if (!_.isUndefined(servicePaginationConfig)) {
            if (servicePaginationConfig.hasNextPage)
                startPage = servicePaginationConfig.nextPage
        }
        //initialize the correct bridge
        let bridgeName = descriptor.service.bridgeName
        if (_(descriptor).has('bridgeName')) {
            bridgeName = descriptor.bridgeName
        }
        let bridge = _(this._bridges).get(bridgeName)
        if (_.isUndefined(bridge)) {
            console.log('Invalid bridge \''.concat(bridgeName).concat(' \''))
            return Promise.resolve([])
        } else {
            const bridgeInstance = new bridge.default()
            return bridgeInstance.executeQuery(descriptor, decoratedCdt, {startPage})
                .then(response => {
                    //transform the response
                    return [response, this._responseParser.mappingResponse(response.response, descriptor)]
                }).spread((response, mappedResponse) => {
                    //packaging a response with information about pagination status of the service
                    return {
                        serviceStatus: {
                            idOperation: descriptor._id,
                            hasNextPage: response.hasNextPage,
                            nextPage: response.nextPage
                        },
                        response: mappedResponse
                    }
                })
                .catch(e => {
                    console.log('[' + descriptor.service.name + '] ' + e)
                    return Promise.resolve([])
                })
        }
    }

}