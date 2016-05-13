'use strict'

import assert from 'assert'

import Bridge from '../src/bridges/bridgeInterface'

describe('Component: Bridge', () => {

    describe('#constructor()', () => {
        it('check if valid bridge class is identified', () => {
            try {
                const b = new ValidBridge()
            } catch (e) {
                assert.equal(e, '')
            }
        })
        it('check if invalid bridge class is identified', () => {
            try {
                const b = new InvalidBridge()
            } catch (e) {
                assert.equal(e.message, 'A bridge must implements executeQuery() method. See documentation for more details')
            }
        })
    })

})

class ValidBridge extends Bridge {

    executeQuery () {}

}

class InvalidBridge extends Bridge {

    pippo () {}

}