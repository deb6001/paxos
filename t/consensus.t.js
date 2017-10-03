require('proof')(17, prove)

function prove (okay) {
    var Paxos = require('..'), denizen

    var Network = require('./network')
    var network = new Network

    function dump (value) {
        console.log(require('util').inspect(value, { depth: null }))
    }

    network.bootstrap()

    okay(network.denizens[0].government, {
        majority: [ '0' ],
        minority: [],
        naturalized: [ '0' ],
        constituents: [],
        promise: '1/0',
        immigrated: { id: { '1/0': '0' }, promise: { '0': '1/0' } },
        properties: { '0': { location: '0' } }
    }, 'bootstrap')

    network.push()

    okay(network.denizens[0].immigrate(network.time, 1, '1', network.denizens[1].cookie, { location: '1' }).enqueued, 'immigrate')

    network.send()

    okay(network.denizens[1].government, {
        majority: [ '0' ],
        minority: [],
        naturalized: [ '0', '1' ],
        constituents: [ '1' ],
        promise: '2/0',
        immigrated: {
            id: { '1/0': '0', '2/0': '1' },
            promise: { '0': '1/0', '1': '2/0' }
        },
        properties: {
            '0': { location: '0' },
            '1': { location: '1' }
        }
    }, 'leader and constituent pair')

    network.populate(1)

    network.send()

    okay(network.denizens[2].government, {
        majority: [ '0', '1' ],
        minority: [ '2' ],
        naturalized: [ '0', '1', '2' ],
        constituents: [],
        promise: '4/0',
        immigrated: {
            id: { '1/0': '0', '2/0': '1', '3/0': '2' },
            promise: { '0': '1/0', '1': '2/0', '2': '3/0' }
        },
        properties: {
            '0': { location: '0' },
            '1': { location: '1' },
            '2': { location: '2' }
        }
    }, 'three member parliament')

    okay(!network.denizens[0].immigrate(network.time, 1, '1', network.denizens[1].cookie, { location: '1' }).enqueued, 'already immigrated')
    okay(!network.denizens[1].enqueue(network.time, 1, {}).enqueued, 'enqueue not leader')

    okay(!network.denizens[1].immigrate(network.time, 1, '4', 0, { location: '4' }).enqueued, 'immigrate not leader')

    network.populate(1)

    network.send()

    network.time++

    // Grab a ping and hold onto to it for a while. We're going to return it to
    // the sender failed after the government changes to test that it rejects
    // the delayed message.
    var ping = network.send('2', { ping: [ '3' ] })

    network.send(1, '0', [ '1' ])

    network.time += 3

// network.send(1, '0', [ '1' ])

    okay(!network.denizens[0].enqueue(network.time, 1, {}).enqueued, 'post collapsed')

    network.send('0', [ '1' ])

    okay(network.denizens[0].government, {
        majority: [ '0', '2' ],
        minority: [ '1' ],
        naturalized: [ '0', '1', '2', '3' ],
        constituents: [ '3' ],
        promise: '7/0',
        immigrated: {
            id: { '1/0': '0', '2/0': '1', '3/0': '2', '5/0': '3' },
            promise: { '0': '1/0', '1': '2/0', '2': '3/0', '3': '5/0' }
        },
        properties: {
            '0': { location: '0' },
            '1': { location: '1' },
            '2': { location: '2' },
            '3': { location: '3' }
        }
    }, 'recover from collapse')

    ping.ping[0].responses[3] = null
    network.response(ping.ping[0])

    network.time++

    network.send('0', '2', [ '1' ])

    network.time += 3

    network.send('0', '2', [ '1' ])

    network.time++

    network.send('0', '2', [ '1' ])

    network.time += 3

    network.send('0', '2', [ '1' ])

    okay(network.denizens[0].government, {
        promise: 'a/0',
        majority: [ '0', '2' ],
        minority: [ '3' ],
        naturalized: [ '0', '2', '3' ],
        constituents: [],
        immigrated: {
            id: { '1/0': '0', '3/0': '2', '5/0': '3' },
            promise: { '0': '1/0', '2': '3/0', '3': '5/0' }
        },
        properties: {
            '0': { location: '0' },
            '2': { location: '2' },
            '3': { location: '3' }
        }
    }, 'exile')

    var shifter = network.denizens[0].log.shifter()

    network.denizens[0].enqueue(network.time, 1, 1)
    network.denizens[0].enqueue(network.time, 1, 2)
    network.denizens[0].enqueue(network.time, 1, 3)

    network.send('1')

    network.populate(1)

    shifter.join(function (envelope) {
        return envelope.method == 'government'
    }, function (error, envelope) {
        if (error) throw error
        okay({
            promise: envelope.body.promise,
            map: envelope.body.map
        }, {
            promise: 'b/0',
            map: { 'a/2': 'b/1', 'a/3': 'b/2' }
        }, 'remap')
    })

    network.send()

    okay(network.denizens[2].log.head.body.body, 3, 'enqueued')
    okay(network.denizens[2].log.head.body.promise, 'b/2', 'remapped')

    okay(network.denizens[0].government, {
        promise: 'b/0',
        majority: [ '0', '2' ],
        minority: [ '3' ],
        naturalized: [ '0', '2', '3', '4' ],
        constituents: [ '4' ],
        immigrated: {
            id: { '1/0': '0', '3/0': '2', '5/0': '3', 'b/0': '4' },
            promise: { '0': '1/0', '2': '3/0', '3': '5/0', '4': 'b/0' }
        },
        properties: {
            '0': { location: '0' },
            '2': { location: '2' },
            '3': { location: '3' },
            '4': { location: '4' }
        }
    }, 'add fourth')

    // Propagate minimums to clear out the immigration entry for 4.
    network.tick(2)

    // Add some new citizens.
    network.populate(3)

    // Move our clock forward to get a differnt cookie.
    network.time++

    // This one is now unreachable because we rebooted and its history has been
    // propagated off.
    network.reboot(4)

    // This one will never join because it is already proposed and the cookie is
    // wrong.
    network.reboot(5)

    // This one will join, but with the new cookie.
    network.reboot(6)
    network.immigrate(6)

    network.send()

    network.time += 3

    network.send()

    network.time += 1

    network.send()

    network.time += 3

    network.send()

    okay(network.denizens[0].government, {
        promise: '13/0',
        majority: [ '0', '2', '3' ],
        minority: [ '6', '7' ],
        naturalized: [ '0', '2', '3', '6', '7' ],
        constituents: [],
        immigrated: {
            id: { '1/0': '0', '3/0': '2', '5/0': '3', 'd/0': '6', 'e/0': '7' },
            promise: { '0': '1/0', '2': '3/0', '3': '5/0', '6': 'd/0', '7': 'e/0' }
        },
        properties: {
            '0': { location: '0' },
            '2': { location: '2' },
            '3': { location: '3' },
            '6': { location: '6' },
            '7': { location: '7' }
        }
    }, 'reboot, exile and double immigrate')


    // Reject messages from a different republic.
    network.populate(1)

    network.send()

    network.reboot(8, 2)
    network.denizens[8].bootstrap(network.time, { location: '8' })

    network.send()

    network.time += 1

    network.send()

    network.time += 4

    network.send()

    // Here we are going to disappear for a moment, but come back before we're
    // unreachable. For the rest of the tests 5 should be present. This covers
    // the disappearance branches, specifically already disappeared but not yet
    // unreachable.
    network.time += 1

    network.send('3', [ '7' ])

    network.time += 1

    network.send('3', [ '7' ])

    network.time += 1

    network.send()

    network.time += 4

    network.send('3', [ '2' ], [ '3' ], [ '6' ])

    network.time += 4

    network.send('3', [ '2' ], [ '3' ], [ '6' ])

    network.time += 4

    network.send('3')

    okay(network.denizens[3].government, {
        promise: '19/0',
        majority: [ '3', '0', '2' ],
        minority: [ '6', '7' ],
        naturalized: [ '0', '2', '3', '6', '7' ],
        constituents: [],
        immigrated: {
            id: { '1/0': '0', '3/0': '2', '5/0': '3', 'd/0': '6', 'e/0': '7' },
            promise: { '0': '1/0', '2': '3/0', '3': '5/0', '6': 'd/0', '7': 'e/0' }
        },
        properties: {
            '0': { location: '0' },
            '2': { location: '2' },
            '3': { location: '3' },
            '6': { location: '6' },
            '7': { location: '7' }
        }
    }, 'usurper')

    // Test that a representative chooses the least minimum entry of its
    // constituents when it calculates is minimum entry.
    network.denizens[3].enqueue(network.time, 1, 4)

    network.send([ '7' ])

    network.denizens[3].enqueue(network.time, 1, 5)

    network.send([ '7' ])

    okay(network.denizens[3]._minimums, {
        '0': { version: '19/0', propagated: '14/0', reduced: '19/1' },
        '2': { version: '19/0', propagated: '14/0', reduced: '0/0' },
        '3': { version: '19/0', propagated: '0/0', reduced: '0/0' },
    }, 'minimum unreduced')

    network.send()

    network.denizens[7].inspect()

    network.time += 4

    // Set it up so that the proposers do not make proposals to one another
    // since that's how I've always sketched it out on paper.
    network.send('0', [ '2' ], [ '3' ])
    network.send('2', [ '0' ], [ '3' ])
    network.send(1, '3', [ '0' ], [ '2' ])

    network.time += 4

    var intercept = network.send('0', '2', {
        prepare: {
            request: { message: { method: 'prepare' }, synchronize: false }
        }
    })

    network.pluck(intercept.prepare, { from: '0' }).forEach(receive)
    network.pluck(intercept.prepare, { from: '2' }).forEach(receive)

    network.denizens[0].inspect()

    network.time += 4

    function receive (envelope) {
        network.request(envelope)
        network.response(envelope)
    }

    var intercept = network.send('0', '2', { six: [{ to: '6' }], seven: [{ to: '7' }] })

    network.pluck(intercept.six, { from: '0' }).forEach(receive)
    network.pluck(intercept.seven, { from: '2' }).forEach(receive)
    intercept.seven.forEach(receive)
    intercept.six.forEach(receive)

    network.send('3', {
        prepare: {
            request: { message: { method: 'prepare' }, synchronize: false }
        }
    }).prepare.forEach(receive)

    network.time += 4

    var accept = network.send('3', {
        accept: {
            request: { message: { method: 'accept' }, synchronize: false }
        }
    })

    network.pluck(accept.accept, { to: '7' }).forEach(receive)

    network.send('2')

    network.time += 4

    network.send('2', {
        accept: {
            request: { message: { method: 'accept' }, synchronize: false }
        }
    }).accept.forEach(receive)

    // var register = network.send('2', { sync: { message: { method: 'register' } } })
    console.log('------------------------')
    var register = network.send('2', {
        sync: {
            request: { message: { method: 'register' }, synchronize: false }
        }
    })

    network.pluck(register.sync, { to: '6' }).forEach(receive)
    dump(network.denizens[2].inspect())
    dump(network.denizens[6].inspect())
    dump(network.denizens[7].inspect())
    return
    network.pluck(register.sync, { to: '6' }).forEach(receive)

    dump(network.denizens[6].inspect())
    dump(network.denizens[7].inspect())

    return

    register.sync.forEach(receive)
    // dump(network.denizens[6].inspect())

    network.send('0', [ '6' ])

    network.time += 4

    network.send('0', [ '2' ])

    network.time += 4

    network.send('0', [ '6' ])

    network.time += 4

    var zero = network.send('0', { accept: { message: { method: 'accept' } } })

    // dump(zero)

    dump(network.pluck(sync.sync, { to: '6' }))
    return
    network.pluck(sync.sync, { to: '6' }).forEach(receive)
    dump(network.denizens[6].inspect())

    // dump(network.denizens[6].inspect())
    return

    accept.accept.forEach(receive)
}
