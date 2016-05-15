'use strict'

import _ from 'lodash'
import Promise from 'bluebird'
import config from 'config'

import Provider from '../provider/provider'
import Logger from '../utils/Logger'

const logger = Logger.getInstance()

/**
 * This component choose the most appropriate primary operations to be queried to retrieve the data
 */
export default class PrimaryServiceSelection  {

    constructor () {
        //initialize provider
        this._provider = Provider.getInstance()
        //number of services to keep
        this._n = 3
        if (config.has('primaryService.n')) {
            this._n = config.get('primaryService.n')
        }
        //filter nodes weight
        this._filterWeight = 1
        if (config.has('primaryService.weight.filter')) {
            this._filterWeight = config.get('primaryService.weight.filter')
        }
        //ranking nodes weight
        this._rankingWeight = 4
        if (config.has('primaryService.weight.ranking')) {
            this._rankingWeight = config.get('primaryService.weight.ranking')
        }
    }

    /**
     * Search the services that best fit the current context
     * @param {Object} decoratedCdt - The decorated CDT
     * @returns {Promise<Array>} The ordered operations id with their ranking value
     */
    selectServices (decoratedCdt) {
        return new Promise(resolve => {
            Promise
                .join(
                    //search for services associated to the filter nodes
                    this._provider.filterPrimaryServices(decoratedCdt._id, decoratedCdt.filterNodes),
                    //search for services associated to the ranking nodes
                    this._provider.filterPrimaryServices(decoratedCdt._id, decoratedCdt.rankingNodes),
                    //search for specific associations
                    this._specificSearch(decoratedCdt._id, decoratedCdt.specificNodes)
                ,(filter, ranking, specific) => {
                    //merge the ranking and specific list (specific searches are considered ranking)
                    //discard the ranking nodes that haven't a correspondence in the filter nodes list
                    ranking = _(ranking)
                        .concat(specific)
                        .intersectionWith(filter, (s, i) =>  s._idOperation.equals(i._idOperation))
                        .value()
                    //add the weight values for each item
                    _(filter).forEach(i => {
                        i['weight'] = this._filterWeight
                    })
                    _(ranking).forEach(i => {
                        i['weight'] = this._rankingWeight
                    })
                    //calculate the ranking of the merged list
                    resolve(this._calculateRanking(_.concat(filter, ranking)))
                })
                .catch(e => {
                    logger.error('[%s] %s', this.constructor.name, e)
                    resolve([])
                })
        })
    }

    /**
     * This function dispatch the specific nodes to the correct search function.
     * It collects the results and return them to the main method.
     * @param {ObjectId} idCdt - The CDT identifier
     * @param {Array} nodes - The list of specific nodes
     * @returns {Promise<Array>} The list of associations found. Each association must be composed by an operation identifier and a ranking (starting from 1)
     * @private
     */
    _specificSearch (idCdt, nodes) {
        let promises = []
        //check if the node dimension have a specific search associated
        _(nodes).forEach(node => {
            switch (node.name) {
                case 'CityCoord':
                    //load specific coordinates search
                    promises.push(this._searchByCoordinates(idCdt, node))
                    break
            }
        })
        return Promise
            .all(promises)
            .then(results => {
                return _.flatten(results)
            })
            .catch(e => {
                logger.error('[%s] %s', this.constructor.name, e)
                return []
            })
    }

    /**
     * Compute the ranking of each operation found by the previous steps
     * @param {Array} services - The list of services, with own rank and weight
     * @returns {Array} The ranked list of Top-N services
     * @private
     */
    _calculateRanking (services) {
        logger.debug('[%s] Found %d association/s', this.constructor.name, services.length)
        let rankedList = []
        _(services).forEach(s => {
            //calculate the ranking of the current service
            let rank = s.weight
            //avoid infinity results
            if (s.ranking > 0) {
                rank = s.weight * (1 / s.ranking)
            }
            //check if the service is already in the list
            let index = _(rankedList).findIndex(i => i._idOperation.equals(s._idOperation))
            if (index === -1) {
                //if not exists creates the entry
                rankedList.push({
                    _idOperation: s._idOperation,
                    rank: rank
                })
            } else {
                //if exists update the rank
                rankedList[index].rank += rank
            }
        })
        logger.debug('[%s] Found %d service/s', this.constructor.name, rankedList.length)
        //sort the list by the rank in descending order and take only the first N services
        rankedList = _(rankedList)
            .orderBy('rank', 'desc')
            .take(this._n)
            .value()
        return rankedList
    }

    /**
     * Search associations by coordinates.
     * It also assigns a ranking starting from the nearest service
     * @param {ObjectId} idCdt - The CDT identifier
     * @param {Object} node - The node with the coordinates
     * @returns {Promise<Array>} The list of operation identifiers with ranking
     * @private
     */
    _searchByCoordinates (idCdt, node) {
        return this._provider
            .searchPrimaryByCoordinates(idCdt, node)
            .then(results => {
                logger.debug('[%s] Found %d service/s near the position', this.constructor.name, results.length)
                return results
            })
            .map((result, index) => {
                return {
                    _idOperation: result._idOperation,
                    ranking: index + 1
                }
            })
    }
}