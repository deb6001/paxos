http://research.microsoft.com/pubs/64634/web-dsn-submission.pdf

http://stackoverflow.com/questions/5850487/questions-about-paxos-implementation/10151660#10151660

- stateLog format: round number as key, returns object with time, value, current leader

- figure out what to do after a round ends. Currently notifying all learners; should notify all nodes? use proposal ID + round number to distinguish? Not sure if all nodes need to know but telling them all *probably* won't hurt...?

- figure out how to implement a round system

- don't forget. Node processes not root - port 1024 & up