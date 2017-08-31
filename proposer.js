var Monotonic = require('monotonic').asString

var Writer = require('./writer')

// TODO Convert from a government structure.
// TODO Really need to have the value for previous, which is the writer register.
function Proposer (paxos, promise) {
    this._paxos = paxos
    this.version = [ promise, this.collapsed = true ]
    this.promise = Monotonic.increment(promise, 0)
    this.proposals = []
    this.register = {
        body: {
            promise: paxos.log.head.body.promise,
            body: paxos.log.head.body.body,
            previous: paxos.log.head.body.previous
        },
        previous: null
    }
    this.proposal = null
}

Proposer.prototype.unshift = function (proposal) {
    this.proposal = proposal
}

Proposer.prototype.nudge = function (now) {
    this.prepare(now)
}

Proposer.prototype.prepare = function (now) {
    this._paxos._send({
        method: 'prepare',
        version: this.version,
        to: this.proposal.quorum,
        promise: this.promise
    })
}

function getPromise (object) {
    return object == null ? '0/0' : object.body.promise
}

// TODO Allow assembly to update promise?
Proposer.prototype.response = function (now, request, responses, promise) {
    switch (promise == null ? request.method : 'failed') {
    case 'failed':
        this.promise = Monotonic.increment(promise, 0)
        this._paxos._scheduleAssembly(now, true)
        break
    case 'prepare':
        for (var id in responses) {
            if (Monotonic.compare(getPromise(this.register), getPromise(responses[id].register)) < 0) {
                this.register = responses[id].register
            }
        }
        this.proposal.body.promise = request.promise
        this._paxos._send({
            method: 'accept',
            version: this.version,
            to: this.proposal.quorum,
            body: {
                promise: request.promise,
                body: this.proposal.body,
                previous: this.register.body.promise
            },
            previous: this.register
        })
        break
    case 'accept':
        this._paxos._commit(now, request)
        this._paxos.newGovernment(now, this.proposal.body.majority, {
            majority: this.proposal.body.majority,
            minority: this.proposal.body.minority
        })
        break
    }
}

Proposer.prototype.createWriter = function (promise) {
    return new Writer(this._paxos, promise)
}

module.exports = Proposer
