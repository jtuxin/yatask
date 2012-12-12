describe 'task', ->

  [ {EventEmitter}, path, Task ] = [
    require 'events'
    require 'path'
    require '../lib/Task'
  ]

  beforeEach ->
    @mockTask = new Task
    @mockTask.constructor = name: 'MockTask'
    null

  it 'is an instanceof an EventEmitter', ->
    @mockTask.should.be.an.instanceof(EventEmitter)
    null

  it 'synchronously wraps a run method in events', (done) ->
    run = (bound, passed) ->
      bound.should.equal('bound')
      passed.should.equal('passed')
      run.beforeRunCalled.should.be.true
      run.called = yes
    
    run.beforeRunCalled = no
    run.called = no

    @mockTask.run = Task.run(run, 'bound')
    @mockTask.run.isAsync.should.be.false
    @mockTask
      .once('before_mocktask', ->
        run.beforeRunCalled = yes
      )
      .once('after_mocktask', ->
        run.called.should.be.true
        done()
      )
      .run('passed')
    null
  
  it 'asynchronously wraps a run method in events', (done) ->
    run = (bound, passed, fin) ->
      bound.should.equal('bound')
      passed.should.equal('passed')
      run.beforeRunCalled.should.be.true
      run.called = yes
      fin()
    
    run.beforeRunCalled = no
    run.called = no

    @mockTask.run  = Task.run(yes, run, 'bound')
    @mockTask.run.isAsync.should.be.true

    @mockTask
      .once('before_mocktask', ->
        run.beforeRunCalled = yes
      )
      .once('after_mocktask', ->
         run.called.should.be.true
         done()
      )
      .run('passed')
    null

  it 'chains defaults object to its parents defaults object', ->
    @mockTask.defaults = {}
    @expect(@mockTask.defaults.__proto__).to.equal(null)

    derived = Object.create(@mockTask)
    derived.defaults = {}
    @expect(derived.defaults.__proto__).to.equal(@mockTask.defaults)
    null

  it 'generates a config from an override and defaults object', ->
    @mockTask.defaults  = field: 'default'
    @mockTask.overrides = mocktask: field: 'overridden'

    @mockTask.config.field.should.equal('overridden')
    @mockTask.config.__proto__.field.should.equal('default')
    null

  it 'generates an event with bindings', ->
    expect  = @expect
    bound   = 'hello'
    called  = no

    @mockTask.binding = bound
    @mockTask.createEvent('with_#{binding}', `function binding() {
      expect(this.binding).to.equal(bound)
      return this.binding;
    }`)
    
    @mockTask.event_once_with_binding(-> called = yes)
    @mockTask.event_with_binding()

    called.should.equal(yes)
    null

  null
