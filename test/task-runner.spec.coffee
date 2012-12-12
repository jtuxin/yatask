describe 'task-runner', ->
  
  { runTasks } = require '../lib/task-runner'

  it 'runs a series of tasks', (done) ->
    passed  = 'pass'
    another = 1
    expect  = @expect

    runTasks(
      (run: -> passed);
      (run: do ->
        run = (done) -> done(null, another)
        run.isAsync = yes
        run
      ),
      (err, results) ->
        expect(err).to.equal(null)
        results[0].should.equal(passed)
        results[1].should.equal(another)
        done()
    )
    null

  null
